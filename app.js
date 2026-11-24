(() => {
'use strict';

const $ = id => document.getElementById(id);
const primaryAudio = $('audio');
const listEl = $('list');
const feedEl = $('feed');
const storiesEl = $('stories');
const sheetEl = $('sheet');
const sheetBackdrop = $('sheetBackdrop');
const sheetListEl = $('sheetList');
const seekClassic = $('seek');

const REACTS = [['fire', '🔥'], ['tree', '🎄'], ['snow', '❄️']];
let tracks = [], cur = -1, visibleIdx = 0;
let currentSkin = 'classic'; // По умолчанию открывается первая версия
let classicCards = [], slides = [], storyBtns = [], sheetItems = [];
let userStarted = false, repeatOne = false, hasSwiped = false;
let programmaticScroll = false, scrollLockTimer = null;

/* ===== Реакции: хранилище (Yandex Cloud + localStorage кэш) ===== */
const Store = {
  mine: () => JSON.parse(localStorage.getItem('ny_mine') || '{}'),
  counts: () => JSON.parse(localStorage.getItem('ny_counts') || '{}'),
  client() {
    let c = localStorage.getItem('ny_client');
    if (!c) {
      c = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
      localStorage.setItem('ny_client', c);
    }
    return c;
  },
  async loadCounts() {
    if (window.API_URL) try {
      const r = await (await fetch(window.API_URL + '?client=' + this.client())).json();
      localStorage.setItem('ny_mine', JSON.stringify(r.mine || {}));
      localStorage.setItem('ny_counts', JSON.stringify(r.counts || {}));
    } catch (e) { /* офлайн — берём кэш */ }
    return this.counts();
  },
  async sendReaction(id, type) {
    if (window.API_URL) try {
      const r = await (await fetch(window.API_URL, {
        method: 'POST',
        body: JSON.stringify({ id, type, client: this.client() })
      })).json();
      if (r.counts) {
        const mine = this.mine(), counts = this.counts();
        if (r.mine) mine[id] = r.mine; else delete mine[id];
        counts[id] = r.counts;
        localStorage.setItem('ny_mine', JSON.stringify(mine));
        localStorage.setItem('ny_counts', JSON.stringify(counts));
        return { mine: r.mine, counts: r.counts };
      }
    } catch (e) { /* сервер недоступен — локальный режим */ }
    const mine = this.mine(), counts = this.counts();
    const c = counts[id] = counts[id] || {};
    if (mine[id]) c[mine[id]] = Math.max(0, (c[mine[id]] || 1) - 1);
    if (mine[id] === type) delete mine[id];
    else { mine[id] = type; c[type] = (c[type] || 0) + 1; }
    localStorage.setItem('ny_mine', JSON.stringify(mine));
    localStorage.setItem('ny_counts', JSON.stringify(counts));
    return { mine: mine[id], counts: c };
  }
};

const fmt = s => isFinite(s) && s >= 0 ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
const pad2 = n => String(n).padStart(2, '0');

/* ===== Аудио-движок: 3 деки + Web Audio кроссфейд + AnalyserNode ===== */
const CROSSFADE_SEC = 1.0;
const PAUSE_FADE_SEC = 0.4;
const SOFT_START_SEC = 0.4;
const FADE_STEPS = 12;

let audioCtx = null, masterGain = null, analyser = null, freqData = null;
let useWebAudio = true, activeIdx = 0, switchGen = 0, seeking = false;

function makeDeck(el) {
  el.preload = 'none';
  el.playsInline = true;
  return {
    el, source: null, gain: null,
    ramp: { t0: 0, dur: 0, from: 1, to: 1, curve: 'linear' },
    fadeTimer: null, fadeRaf: null, onStart: null,
    fadingOut: false, pausing: false, pendingStart: false
  };
}

function createExtraAudio() {
  const el = document.createElement('audio');
  el.preload = 'none';
  el.setAttribute('playsinline', '');
  if (primaryAudio && primaryAudio.parentNode) primaryAudio.parentNode.insertBefore(el, primaryAudio.nextSibling);
  return el;
}

const decks = [makeDeck(primaryAudio), makeDeck(createExtraAudio()), makeDeck(createExtraAudio())];
const activeDeck = () => decks[activeIdx];
const nowSec = () => (useWebAudio && audioCtx ? audioCtx.currentTime : performance.now() / 1000);

function evalRamp(r, t) {
  if (!r || r.dur <= 0 || t >= r.t0 + r.dur) return r ? r.to : 1;
  if (t <= r.t0) return r.from;
  const p = (t - r.t0) / r.dur;
  if (r.curve === 'in') return r.from + (r.to - r.from) * Math.sin(p * Math.PI * 0.5);
  if (r.curve === 'out') return r.to + (r.from - r.to) * Math.cos(p * Math.PI * 0.5);
  return r.from + (r.to - r.from) * p;
}

function getDeckGain(d) {
  return Math.max(0, Math.min(1, evalRamp(d.ramp, nowSec())));
}

function ensureAudioCtx() {
  if (!useWebAudio) return;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { useWebAudio = false; return; }
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      masterGain.connect(analyser);
      analyser.connect(audioCtx.destination);
      decks.forEach(d => {
        d.source = audioCtx.createMediaElementSource(d.el);
        d.gain = audioCtx.createGain();
        d.source.connect(d.gain);
        d.gain.connect(masterGain);
        d.el.volume = 1;
      });
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  } catch (e) {
    useWebAudio = false;
  }
}

function clearDeckTimers(d) {
  if (d.fadeTimer) { clearTimeout(d.fadeTimer); d.fadeTimer = null; }
  if (d.fadeRaf) { cancelAnimationFrame(d.fadeRaf); d.fadeRaf = null; }
}

function clearStartListeners(d) {
  if (d.onStart) {
    d.el.removeEventListener('playing', d.onStart);
    d.el.removeEventListener('timeupdate', d.onStart);
    d.onStart = null;
  }
}

function setDeckGainImmediate(d, val) {
  val = Math.max(0, Math.min(1, val));
  clearDeckTimers(d);
  const t = nowSec();
  d.ramp = { t0: t, dur: 0, from: val, to: val, curve: 'linear' };
  if (useWebAudio && audioCtx && d.gain) {
    d.gain.gain.cancelScheduledValues(t);
    d.gain.gain.setValueAtTime(val, t);
  } else {
    d.el.volume = val;
  }
}

function fadeDeck(d, target, dur, curve, onDone) {
  target = Math.max(0, Math.min(1, target));
  clearDeckTimers(d);
  if (useWebAudio && audioCtx && d.gain) {
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const t0 = audioCtx.currentTime;
    const from = getDeckGain(d);
    d.gain.gain.cancelScheduledValues(t0);
    d.gain.gain.setValueAtTime(from, t0);
    d.ramp = { t0, dur, from, to: target, curve };
    if (dur > 0) {
      for (let s = 1; s <= FADE_STEPS; s++) {
        const ts = t0 + (dur * s) / FADE_STEPS;
        d.gain.gain.linearRampToValueAtTime(evalRamp(d.ramp, ts), ts);
      }
    } else {
      d.gain.gain.setValueAtTime(target, t0);
    }
    if (onDone) d.fadeTimer = setTimeout(() => { d.fadeTimer = null; onDone(); }, Math.ceil(dur * 1000) + 40);
  } else {
    const t0 = performance.now() / 1000;
    const from = getDeckGain(d);
    d.ramp = { t0, dur, from, to: target, curve };
    if (dur <= 0) { d.el.volume = target; if (onDone) onDone(); return; }
    const step = () => {
      const now = performance.now() / 1000;
      const v = Math.max(0, Math.min(1, evalRamp(d.ramp, now)));
      d.el.volume = v;
      if (now < t0 + dur) d.fadeRaf = requestAnimationFrame(step);
      else { d.fadeRaf = null; d.el.volume = target; if (onDone) onDone(); }
    };
    d.fadeRaf = requestAnimationFrame(step);
  }
}

function fadeOutAndPause(d, dur, asPause = false) {
  clearStartListeners(d);
  d.pendingStart = false;
  d.fadingOut = true;
  d.pausing = asPause;
  if (d.el.paused || d.el.ended) {
    d.fadingOut = false; d.pausing = false;
    setDeckGainImmediate(d, 0);
    return;
  }
  fadeDeck(d, 0, dur, 'out', () => {
    d.el.pause();
    d.fadingOut = false; d.pausing = false;
  });
}

function pickDeckForSwitch(outgoing) {
  const idle = decks.find(d => !outgoing.includes(d));
  if (idle) return idle;
  let best = decks[0], bestGain = Infinity;
  for (const d of decks) {
    if (d === activeDeck()) continue;
    const g = getDeckGain(d);
    if (g < bestGain) { bestGain = g; best = d; }
  }
  clearStartListeners(best);
  clearDeckTimers(best);
  setDeckGainImmediate(best, 0);
  best.el.pause();
  best.fadingOut = false; best.pausing = false; best.pendingStart = false;
  return best;
}

function setAllProgress(idx, val, tCurStr, tDurStr) {
  const v = Math.max(0, Math.min(1000, Number(val) || 0));
  const pct = (v / 10).toFixed(2) + '%';
  // Классический плеер
  seekClassic.value = v;
  seekClassic.style.setProperty('--p', pct);
  if (tCurStr !== undefined) $('tCur').textContent = tCurStr;
  if (tDurStr !== undefined) $('tDur').textContent = tDurStr;
  // Скин NewYearGram
  const s = slides[idx];
  if (s) {
    s.scrub.value = v;
    s.scrub.style.setProperty('--p', pct);
    if (tCurStr !== undefined) s.tCur.textContent = tCurStr;
    if (tDurStr !== undefined) s.tDur.textContent = tDurStr;
  }
}

function play(i) {
  if (i < 0 || i >= tracks.length) return;
  if (i === cur) { toggle(); return; }
  userStarted = true;
  ensureAudioCtx();
  const gen = ++switchGen;

  decks.forEach(d => {
    if (d.pendingStart) {
      clearStartListeners(d);
      clearDeckTimers(d);
      d.pendingStart = false; d.fadingOut = false; d.pausing = false;
      setDeckGainImmediate(d, 0);
      d.el.pause();
    }
  });

  const outgoing = decks.filter(d => !d.el.paused && !d.el.ended);
  const doCrossfade = outgoing.some(d => !d.pausing);
  const nextDeck = outgoing.length > 0 ? pickDeckForSwitch(outgoing) : activeDeck();
  activeIdx = decks.indexOf(nextDeck);

  if (cur >= 0 && slides[cur]) {
    slides[cur].scrub.value = 0;
    slides[cur].scrub.style.setProperty('--p', '0%');
    slides[cur].tCur.textContent = '0:00';
  }
  cur = i;
  const t = tracks[i];

  clearStartListeners(nextDeck);
  clearDeckTimers(nextDeck);
  nextDeck.fadingOut = false;
  nextDeck.pausing = false;
  nextDeck.pendingStart = true;
  setDeckGainImmediate(nextDeck, 0);

  let started = false;
  const onStarted = () => {
    if (started) return;
    started = true;
    clearStartListeners(nextDeck);
    nextDeck.pendingStart = false;
    if (gen !== switchGen || nextDeck.pausing || nextDeck.el.paused) return;

    const stillAudible = outgoing.filter(d => d !== nextDeck && !d.el.paused && !d.el.ended);
    if (doCrossfade && stillAudible.length > 0) {
      stillAudible.forEach(d => { if (!d.fadingOut) fadeOutAndPause(d, CROSSFADE_SEC, false); });
      fadeDeck(nextDeck, 1, CROSSFADE_SEC, 'in');
    } else {
      fadeDeck(nextDeck, 1, SOFT_START_SEC, 'in');
    }
    sync();
  };

  nextDeck.onStart = onStarted;
  nextDeck.el.addEventListener('playing', onStarted);
  nextDeck.el.addEventListener('timeupdate', onStarted);
  nextDeck.el.src = t.file;

  const p = nextDeck.el.play();
  if (p && p.then) {
    p.then(() => {
      if (gen === switchGen && !nextDeck.el.paused && nextDeck.el.readyState >= 3) onStarted();
    }).catch(err => {
      if (err && err.name === 'AbortError') return;
      clearStartListeners(nextDeck);
      nextDeck.pendingStart = false;
      if (gen === switchGen) {
        outgoing.forEach(d => { if (d !== nextDeck && !d.fadingOut) fadeOutAndPause(d, 0.3, false); });
        sync();
      }
    });
  }

  $('player').hidden = false;
  $('pTitle').textContent = t.title;
  $('pArtist').textContent = t.artist;
  $('pCover').textContent = t.emoji;
  setAllProgress(i, 0, '0:00', '0:00');
  sync();

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: 'NewYearGram · Новогодний вайб' });
  }
}

function pauseAll() {
  switchGen++;
  decks.forEach(d => {
    if (d.pendingStart) {
      clearStartListeners(d);
      clearDeckTimers(d);
      d.pendingStart = false; d.fadingOut = false; d.pausing = false;
      setDeckGainImmediate(d, 0);
      d.el.pause();
    } else if (!d.el.paused && !d.el.ended) {
      fadeOutAndPause(d, PAUSE_FADE_SEC, d === activeDeck());
    }
  });
  sync();
}

function resumeActive() {
  if (cur < 0) { play(currentSkin === 'gram' ? visibleIdx : 0); return; }
  userStarted = true;
  ensureAudioCtx();
  const d = activeDeck();
  clearDeckTimers(d);
  d.fadingOut = false;
  d.pausing = false;
  if (d.el.paused || d.el.ended) {
    setDeckGainImmediate(d, 0);
    const gen = ++switchGen;
    d.pendingStart = true;
    let started = false;
    const onStarted = () => {
      if (started) return;
      started = true;
      clearStartListeners(d);
      d.pendingStart = false;
      if (gen !== switchGen || d.pausing || d.el.paused) return;
      fadeDeck(d, 1, PAUSE_FADE_SEC, 'in');
      sync();
    };
    clearStartListeners(d);
    d.onStart = onStarted;
    d.el.addEventListener('playing', onStarted);
    d.el.addEventListener('timeupdate', onStarted);
    const p = d.el.play();
    if (p && p.then) {
      p.then(() => { if (gen === switchGen && !d.el.paused && d.el.readyState >= 3) onStarted(); })
       .catch(() => { clearStartListeners(d); d.pendingStart = false; sync(); });
    }
  } else {
    fadeDeck(d, 1, PAUSE_FADE_SEC, 'in');
  }
  sync();
}

const isActivePlaying = () => {
  const d = activeDeck();
  return !!(d && !d.el.paused && !d.pausing);
};
const toggle = () => isActivePlaying() ? pauseAll() : resumeActive();

function scrollToSlide(i, instant = false) {
  const s = slides[i];
  if (!s) return;
  programmaticScroll = true;
  clearTimeout(scrollLockTimer);
  s.el.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
  visibleIdx = i;
  highlightStory(i);
  scrollLockTimer = setTimeout(() => { programmaticScroll = false; }, 560);
}

function goToTrack(i, shouldPlay = true) {
  if (!tracks.length) return;
  const idx = (i + tracks.length) % tracks.length;
  if (currentSkin === 'gram') scrollToSlide(idx);
  if (shouldPlay) play(idx);
}

const nextTrack = () => goToTrack((cur < 0 ? visibleIdx : cur) + 1, true);
const prevTrack = () => {
  if (cur >= 0 && activeDeck().el.currentTime > 3) {
    activeDeck().el.currentTime = 0;
    setAllProgress(cur, 0, '0:00');
    return;
  }
  goToTrack((cur < 0 ? visibleIdx : cur) - 1, true);
};
const shuffleTrack = () => {
  if (tracks.length < 2) return goToTrack(0, true);
  let n;
  const base = cur >= 0 ? cur : visibleIdx;
  do { n = Math.floor(Math.random() * tracks.length); } while (n === base);
  goToTrack(n, true);
};

function toggleRepeat() {
  repeatOne = !repeatOne;
  const rClassic = $('repeat');
  if (rClassic) {
    rClassic.classList.toggle('on', repeatOne);
    rClassic.setAttribute('aria-pressed', String(repeatOne));
  }
  slides.forEach(s => {
    s.repBtn.classList.toggle('on', repeatOne);
    s.repBtn.setAttribute('aria-pressed', String(repeatOne));
  });
}

function highlightStory(idx) {
  storyBtns.forEach((b, n) => {
    b.classList.toggle('current', n === idx);
    b.classList.toggle('playing', n === cur && isActivePlaying());
  });
  if (currentSkin === 'gram' && storyBtns[idx]) {
    storyBtns[idx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  sheetItems.forEach((b, n) => b.classList.toggle('active', n === (cur >= 0 ? cur : idx)));
}

function sync() {
  const playing = isActivePlaying();
  // Классический скин
  $('player').classList.toggle('is-playing', playing);
  const st = $('pState');
  if (st) st.textContent = playing ? 'Играет' : 'Пауза';
  classicCards.forEach((c, n) => {
    c.classList.toggle('active', n === cur);
    c.classList.toggle('playing', n === cur && playing);
  });
  // Скин NewYearGram
  slides.forEach((s, n) => {
    const isThis = n === cur && playing;
    s.el.classList.toggle('playing', isThis);
    s.statusText.textContent = isThis ? 'В эфире' : (n === cur ? 'На паузе' : 'Нажми · Слушать');
  });
  highlightStory(cur >= 0 ? cur : visibleIdx);
}

/* ===== Переключение скина по кнопке «снежинка» ===== */
function setSkin(skin) {
  currentSkin = skin;
  const isGram = skin === 'gram';
  document.body.classList.toggle('skin-classic', !isGram);
  document.body.classList.toggle('skin-gram', isGram);
  $('viewClassic').hidden = isGram;
  $('viewGram').hidden = !isGram;
  closeSheet();

  if (isGram) {
    buildGramLights();
    const target = cur >= 0 ? cur : visibleIdx;
    requestAnimationFrame(() => {
      scrollToSlide(target, true);
      refreshMarquees();
    });
  } else {
    buildClassicLights();
  }
  sync();
}

/* ===== Бегущая строка по кругу для длинных названий в NewYearGram ===== */
function applyMarquee(titleEl, rawText) {
  titleEl.classList.remove('marquee');
  titleEl.textContent = rawText;
  if (!titleEl.clientWidth) return;
  if (titleEl.scrollWidth > titleEl.clientWidth + 2) {
    const dur = Math.max(7, Math.min(20, (titleEl.scrollWidth + 48) / 38));
    titleEl.classList.add('marquee');
    titleEl.innerHTML = `<span class="marquee-track" style="--mdur:${dur.toFixed(1)}s"><span class="marquee-seg"></span><span class="marquee-seg" aria-hidden="true"></span></span>`;
    titleEl.querySelectorAll('.marquee-seg').forEach(seg => { seg.textContent = rawText; });
  }
}

function refreshMarquees() {
  if (currentSkin !== 'gram') return;
  slides.forEach((s, i) => applyMarquee(s.titleEl, tracks[i].title));
}

/* ===== События аудио-дек ===== */
decks.forEach(d => {
  d.el.addEventListener('play', () => { if (d === activeDeck()) sync(); });
  d.el.addEventListener('pause', () => { if (d === activeDeck()) sync(); });
  d.el.addEventListener('ended', () => {
    if (d !== activeDeck()) return;
    if (repeatOne) {
      d.el.currentTime = 0;
      setAllProgress(cur, 0, '0:00');
      setDeckGainImmediate(d, 0);
      d.el.play().then(() => fadeDeck(d, 1, SOFT_START_SEC, 'in')).catch(() => {});
      sync();
    } else {
      nextTrack();
    }
  });
  d.el.addEventListener('loadedmetadata', () => {
    if (d === activeDeck() && cur >= 0) setAllProgress(cur, seekClassic.value, undefined, fmt(d.el.duration));
  });
  d.el.addEventListener('timeupdate', () => {
    if (d !== activeDeck() || cur < 0) return;
    const dur = d.el.duration;
    const val = (!seeking && dur) ? (d.el.currentTime / dur * 1000) : seekClassic.value;
    setAllProgress(cur, val, fmt(d.el.currentTime), fmt(dur));
  });
  d.el.addEventListener('error', () => {
    if (d !== activeDeck() || cur < 0) return;
    clearStartListeners(d);
    d.pendingStart = false;
    decks.forEach(other => { if (other !== d && !other.el.paused && !other.fadingOut) fadeOutAndPause(other, 0.3, false); });
    const msg = '⚠ файл не найден: ' + tracks[cur].file;
    $('pArtist').textContent = msg;
    if (slides[cur]) slides[cur].artistEl.textContent = msg;
    sync();
  });
});

if ('mediaSession' in navigator) {
  const m = navigator.mediaSession;
  m.setActionHandler('play', resumeActive);
  m.setActionHandler('pause', pauseAll);
  m.setActionHandler('previoustrack', prevTrack);
  m.setActionHandler('nexttrack', nextTrack);
}

/* ===== Реакции и синхронизация между обоими скинами ===== */
function burst(emoji, x, y) {
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('span');
    s.className = 'fly';
    s.textContent = emoji;
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.setProperty('--dx', (Math.random() * 110 - 55) + 'px');
    s.style.animationDelay = (Math.random() * 0.14) + 's';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
}

function updateTrackReacts(idx, mineVal, countsObj) {
  // Классическая карточка
  const card = classicCards[idx];
  if (card) {
    card.querySelectorAll('.react').forEach((x, n) => {
      x.classList.toggle('on', mineVal === x.dataset.k);
      x.textContent = `${REACTS[n][1]} ${(countsObj && countsObj[x.dataset.k]) || 0}`;
    });
  }
  // Слайд NewYearGram
  const s = slides[idx];
  if (s) {
    s.reactBtns.forEach(btn => {
      const k = btn.dataset.k;
      btn.classList.toggle('on', mineVal === k);
      btn.querySelector('.rail-cnt').textContent = (countsObj && countsObj[k]) || 0;
    });
  }
}

async function handleReact(idx, key, emoji, ev) {
  const t = tracks[idx];
  const r = await Store.sendReaction(t.id, key);
  updateTrackReacts(idx, r.mine, r.counts);
  if (r.mine === key && ev) burst(emoji, ev.clientX, ev.clientY);
}

/* ===== Живой визуализатор звуковой волны (NewYearGram) ===== */
let wavePhase = 0;
function startWaveLoop() {
  const BARS = 34;
  function draw() {
    if (!document.hidden && currentSkin === 'gram' && slides.length) {
      wavePhase += 0.055;
      const playing = isActivePlaying();
      const targetIdx = cur >= 0 ? cur : visibleIdx;
      const s = slides[targetIdx];
      if (s && s.waveCv) {
        const cv = s.waveCv;
        const rect = cv.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(120, Math.round(rect.width * dpr));
        const h = Math.max(36, Math.round(rect.height * dpr));
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        let hasLiveData = false;
        if (playing && analyser && freqData) {
          analyser.getByteFrequencyData(freqData);
          for (let i = 0; i < 20; i++) { if (freqData[i] > 4) { hasLiveData = true; break; } }
        }

        const gap = w / BARS;
        const barW = Math.max(2 * dpr, gap * 0.54);
        const cy = h / 2;
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, s.accent);
        grad.addColorStop(0.5, '#fff4cc');
        grad.addColorStop(1, s.accent2);
        ctx.fillStyle = grad;

        for (let i = 0; i < BARS; i++) {
          const norm = i / (BARS - 1);
          const env = Math.sin(norm * Math.PI);
          let amp = 0.14;
          if (playing) {
            if (hasLiveData) {
              const bin = Math.floor(Math.abs(norm - 0.5) * 2 * 26) + 1;
              const raw = (freqData[bin] || 0) / 255;
              amp = Math.max(0.16, Math.pow(raw, 0.85) * (0.55 + env * 0.45));
            } else {
              amp = (0.24 + 0.48 * Math.abs(Math.sin(wavePhase * 1.4 + i * 0.45))) * (0.4 + env * 0.6);
            }
          } else {
            amp = (0.12 + 0.1 * Math.sin(wavePhase * 0.6 + i * 0.38)) * (0.45 + env * 0.55);
          }
          const bh = Math.max(4 * dpr, amp * (h * 0.9));
          const x = i * gap + (gap - barW) / 2;
          const y = cy - bh / 2;
          const r = barW / 2;
          ctx.globalAlpha = playing ? (0.45 + amp * 0.55) : 0.38;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(x, y, barW, bh, r) : ctx.rect(x, y, barW, bh);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

/* ===== Построение слайда NewYearGram ===== */
function buildSlide(t, i, total, counts, mine) {
  const scene = window.AudioGramArt.getScene(t, i);
  const sec = document.createElement('section');
  sec.className = 'slide';
  sec.dataset.idx = i;

  const card = document.createElement('article');
  card.className = 'gram-card';
  card.style.background = scene.bg;
  card.innerHTML = `
    <div class="art-stage">${scene.svg}</div>
    <div class="card-scrim"></div>
    <div class="card-top">
      <span class="track-chip"><span class="live-dot"></span><span class="st-lbl">Нажми · Слушать</span></span>
      <span class="track-num">${pad2(i + 1)} / ${pad2(total)}</span>
    </div>
    <div class="tap-badge" aria-hidden="true">
      <svg class="ic-play" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8.2 5.2a1.4 1.4 0 0 1 2.13-1.19l9.7 5.8a1.4 1.4 0 0 1 0 2.4l-9.7 5.8A1.4 1.4 0 0 1 8.2 16.8V5.2z"/></svg>
      <svg class="ic-pause" viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><rect x="6" y="4.5" width="4.4" height="15" rx="2"/><rect x="13.6" y="4.5" width="4.4" height="15" rx="2"/></svg>
    </div>
    <div class="dbl-pop" aria-hidden="true">🔥</div>
    <div class="rail"></div>
    <div class="card-bottom">
      <div class="wave-wrap"><canvas class="wave-cv"></canvas></div>
      <div class="track-meta">
        <div class="track-title"></div>
        <div class="track-artist"></div>
      </div>
      <div class="scrub-row">
        <span class="t-lbl t-cur">0:00</span>
        <input type="range" class="scrub" min="0" max="1000" value="0" aria-label="Перемотка трека">
        <span class="t-lbl t-dur">0:00</span>
      </div>
      <div class="ctrl-row">
        <button class="c-btn c-prev" aria-label="Предыдущий трек">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="4" y="5" width="2.6" height="14" rx="1.3"/><path d="M19.5 6.4a1.2 1.2 0 0 0-1.85-1.01L8.9 11a1.2 1.2 0 0 0 0 2.02l8.75 5.6A1.2 1.2 0 0 0 19.5 17.6V6.4z"/></svg>
        </button>
        <button class="c-btn c-play" aria-label="Воспроизвести или пауза">
          <svg class="ic-play" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8.2 5.2a1.4 1.4 0 0 1 2.13-1.19l9.7 5.8a1.4 1.4 0 0 1 0 2.4l-9.7 5.8A1.4 1.4 0 0 1 8.2 16.8V5.2z"/></svg>
          <svg class="ic-pause" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="4.5" width="4.4" height="15" rx="2"/><rect x="13.6" y="4.5" width="4.4" height="15" rx="2"/></svg>
        </button>
        <button class="c-btn c-next" aria-label="Следующий трек">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="17.4" y="5" width="2.6" height="14" rx="1.3"/><path d="M4.5 6.4a1.2 1.2 0 0 1 1.85-1.01L15.1 11a1.2 1.2 0 0 1 0 2.02l-8.75 5.6A1.2 1.2 0 0 1 4.5 17.6V6.4z"/></svg>
        </button>
      </div>
    </div>
    ${i === 0 ? '<div class="swipe-hint" id="swipeHint">↑ Свайп вверх — следующий трек</div>' : ''}
  `;

  const titleEl = card.querySelector('.track-title');
  const artistEl = card.querySelector('.track-artist');
  titleEl.textContent = t.title;
  artistEl.textContent = t.artist;

  const rail = card.querySelector('.rail');
  const reactBtns = [];
  REACTS.forEach(([k, e]) => {
    const b = document.createElement('button');
    b.className = 'rail-btn' + (mine[t.id] === k ? ' on' : '');
    b.dataset.k = k;
    b.setAttribute('aria-label', `Реакция ${e}`);
    b.innerHTML = `<span class="rail-circle">${e}</span><span class="rail-cnt">${(counts[t.id] || {})[k] || 0}</span>`;
    b.onclick = ev => handleReact(i, k, e, ev);
    rail.appendChild(b);
    reactBtns.push(b);
  });

  const shufBtn = document.createElement('button');
  shufBtn.className = 'rail-btn mini';
  shufBtn.setAttribute('aria-label', 'Случайный трек');
  shufBtn.innerHTML = `<span class="rail-circle"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg></span>`;
  shufBtn.onclick = shuffleTrack;
  rail.appendChild(shufBtn);

  const repBtn = document.createElement('button');
  repBtn.className = 'rail-btn mini';
  repBtn.setAttribute('aria-label', 'Повтор трека');
  repBtn.innerHTML = `<span class="rail-circle" style="position:relative"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg><span class="rep-badge">1</span></span>`;
  repBtn.onclick = toggleRepeat;
  rail.appendChild(repBtn);

  const artStage = card.querySelector('.art-stage');
  const tapBadge = card.querySelector('.tap-badge');
  const dblPop = card.querySelector('.dbl-pop');
  let lastTap = 0, tapTimer = null;

  const flashBadge = () => {
    tapBadge.classList.remove('flash');
    void tapBadge.offsetWidth;
    tapBadge.classList.add('flash');
    setTimeout(() => tapBadge.classList.remove('flash'), 420);
  };

  artStage.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTap < 240) {
      clearTimeout(tapTimer);
      lastTap = 0;
      dblPop.classList.remove('go');
      void dblPop.offsetWidth;
      dblPop.classList.add('go');
      if (Store.mine()[t.id] !== 'fire') handleReact(i, 'fire', '🔥');
    } else {
      lastTap = now;
      tapTimer = setTimeout(() => {
        lastTap = 0;
        if (i !== cur) play(i);
        else toggle();
        flashBadge();
      }, 210);
    }
  });

  const scrub = card.querySelector('.scrub');
  const tCur = card.querySelector('.t-cur');
  const tDur = card.querySelector('.t-dur');
  scrub.addEventListener('input', () => {
    seeking = true;
    const v = Number(scrub.value) || 0;
    scrub.style.setProperty('--p', (v / 10).toFixed(2) + '%');
    if (i === cur && activeDeck().el.duration) tCur.textContent = fmt(v / 1000 * activeDeck().el.duration);
  });
  scrub.addEventListener('change', () => {
    if (i === cur && activeDeck().el.duration) activeDeck().el.currentTime = (Number(scrub.value) || 0) / 1000 * activeDeck().el.duration;
    else if (i !== cur) play(i);
    seeking = false;
  });

  card.querySelector('.c-prev').onclick = prevTrack;
  card.querySelector('.c-next').onclick = nextTrack;
  card.querySelector('.c-play').onclick = () => (i === cur ? toggle() : play(i));

  sec.appendChild(card);
  feedEl.appendChild(sec);

  return {
    el: sec, titleEl, artistEl,
    statusText: card.querySelector('.st-lbl'),
    waveCv: card.querySelector('.wave-cv'),
    scrub, tCur, tDur, reactBtns, repBtn,
    accent: scene.accent, accent2: scene.accent2
  };
}

function openSheet() { sheetBackdrop.hidden = false; sheetEl.hidden = false; }
function closeSheet() { sheetBackdrop.hidden = true; sheetEl.hidden = true; }

/* ===== Гирлянды и постоянный снег ===== */
function buildClassicLights() {
  const ul = $('lightsClassic');
  if (!ul) return;
  const colors = ['#ffd166', '#ff4d6d', '#34d399', '#7ce8ff', '#ffad42'];
  ul.innerHTML = '';
  const n = Math.max(10, Math.min(34, Math.floor(window.innerWidth / 34)));
  for (let i = 0; i < n; i++) {
    const li = document.createElement('li');
    const u = (i + 0.5) / n;
    const drop = 10 + Math.abs(Math.sin(u * Math.PI * 4)) * 15;
    li.style.color = colors[i % colors.length];
    li.style.setProperty('--drop', drop.toFixed(1) + 'px');
    li.style.setProperty('--dly', ((i % 6) * 0.35).toFixed(2) + 's');
    li.style.setProperty('--spd', (1.9 + (i % 4) * 0.35).toFixed(2) + 's');
    ul.appendChild(li);
  }
}

function buildGramLights() {
  const ul = $('lightsGram');
  if (!ul) return;
  const colors = ['#ffd166', '#ff4d6d', '#34d399', '#7ce8ff', '#ffad42'];
  ul.innerHTML = '';
  const w = ($('app') && $('app').clientWidth) || window.innerWidth;
  const n = Math.max(11, Math.min(20, Math.floor(w / 26)));
  for (let i = 0; i < n; i++) {
    const li = document.createElement('li');
    li.style.color = colors[i % colors.length];
    li.style.setProperty('--dly', ((i % 5) * 0.35).toFixed(2) + 's');
    li.style.setProperty('--spd', (1.9 + (i % 4) * 0.35).toFixed(2) + 's');
    ul.appendChild(li);
  }
}

function initSnowAlways() {
  const cv = $('snow'), ctx = cv.getContext('2d');
  let flakes = [], raf;
  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
  resize();
  addEventListener('resize', resize);
  const N = innerWidth < 520 ? 44 : 88;
  for (let i = 0; i < N; i++) {
    const gold = i % 9 === 0;
    flakes.push({
      x: Math.random() * cv.width,
      y: Math.random() * cv.height,
      r: gold ? Math.random() * 1.7 + 0.8 : Math.random() * 2.2 + 0.6,
      v: Math.random() * 0.78 + 0.28,
      d: Math.random() * Math.PI * 2,
      a: gold ? 0.52 : Math.random() * 0.5 + 0.22,
      gold
    });
  }
  function frame() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const f of flakes) {
      f.y += f.v; f.d += 0.012; f.x += Math.sin(f.d) * 0.42;
      if (f.y > cv.height + 6) { f.y = -6; f.x = Math.random() * cv.width; }
      ctx.beginPath();
      ctx.fillStyle = f.gold ? `rgba(255,220,135,${f.a})` : `rgba(235,246,255,${f.a})`;
      ctx.arc(f.x, f.y, f.r, 0, 6.283);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { cancelAnimationFrame(raf); frame(); }
  });
  frame();
}

/* ===== Инициализация ===== */
async function init() {
  buildClassicLights();
  initSnowAlways();
  addEventListener('resize', () => {
    if (currentSkin === 'classic') buildClassicLights();
    else { buildGramLights(); refreshMarquees(); }
  });

  // Кнопки-снежинки переключают скин
  $('skinBtnClassic').onclick = () => setSkin('gram');
  $('skinBtnGram').onclick = () => setSkin('classic');

  // Кнопки классического плеера
  $('play').onclick = () => cur < 0 ? play(0) : toggle();
  $('next').onclick = nextTrack;
  $('prev').onclick = prevTrack;
  $('shuffle').onclick = shuffleTrack;
  $('repeat').onclick = toggleRepeat;

  seekClassic.addEventListener('input', () => {
    seeking = true;
    const v = Number(seekClassic.value) || 0;
    seekClassic.style.setProperty('--p', (v / 10).toFixed(2) + '%');
    if (cur >= 0 && activeDeck().el.duration) $('tCur').textContent = fmt(v / 1000 * activeDeck().el.duration);
  });
  seekClassic.addEventListener('change', () => {
    if (cur >= 0 && activeDeck().el.duration) activeDeck().el.currentTime = (Number(seekClassic.value) || 0) / 1000 * activeDeck().el.duration;
    seeking = false;
  });

  // Плейлист-шторка NewYearGram
  $('listBtn').onclick = openSheet;
  $('sheetClose').onclick = closeSheet;
  sheetBackdrop.onclick = closeSheet;

  try {
    tracks = await (await fetch('tracks.json')).json();
  } catch (e) {
    $('err').hidden = false;
    $('err').textContent = 'Не удалось загрузить tracks.json';
    return;
  }

  const n = tracks.length, m10 = n % 10, m100 = n % 100;
  const word = (m10 === 1 && m100 !== 11) ? 'трек' : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) ? 'трека' : 'треков';
  const countStr = `${n} ${word}`;
  $('trackCountClassic').textContent = countStr;
  $('trackCountGram').textContent = countStr;

  const counts = await Store.loadCounts(), mine = Store.mine();

  tracks.forEach((t, i) => {
    // 1. Классическая карточка
    const li = document.createElement('li');
    li.className = 'card';
    li.id = 'c' + i;
    const row = document.createElement('button');
    row.className = 'row';
    row.innerHTML = `<span class="cover">${t.emoji}</span><span class="meta"><div class="title"></div><div class="artist"></div></span><span class="eq"><i></i><i></i><i></i></span>`;
    row.querySelector('.title').textContent = t.title;
    row.querySelector('.artist').textContent = t.artist;
    row.onclick = () => play(i);
    const rs = document.createElement('div');
    rs.className = 'reacts';
    REACTS.forEach(([k, e]) => {
      const b = document.createElement('button');
      b.className = 'react' + (mine[t.id] === k ? ' on' : '');
      b.dataset.k = k;
      b.textContent = `${e} ${(counts[t.id] || {})[k] || 0}`;
      b.onclick = ev => handleReact(i, k, e, ev);
      rs.appendChild(b);
    });
    li.append(row, rs);
    listEl.appendChild(li);
    classicCards.push(li);

    // 2. Story ring (NewYearGram)
    const sb = document.createElement('button');
    sb.className = 'story' + (i === 0 ? ' current' : '');
    sb.innerHTML = `<span class="story-ring"><span class="story-avatar">${t.emoji}</span></span><span class="story-label"></span>`;
    sb.querySelector('.story-label').textContent = t.title.split(/\s+/)[0];
    sb.title = `${t.title} — ${t.artist}`;
    sb.onclick = () => goToTrack(i, true);
    storiesEl.appendChild(sb);
    storyBtns.push(sb);

    // 3. Слайд NewYearGram
    slides.push(buildSlide(t, i, tracks.length, counts, mine));

    // 4. Элемент шторки плейлиста
    const sli = document.createElement('li');
    const srow = document.createElement('button');
    srow.className = 'sheet-item' + (i === 0 ? ' active' : '');
    srow.innerHTML = `<span class="si-ico">${t.emoji}</span><span class="si-meta"><div class="si-title"></div><div class="si-artist"></div></span><span class="si-num">${pad2(i + 1)}</span>`;
    srow.querySelector('.si-title').textContent = t.title;
    srow.querySelector('.si-artist').textContent = t.artist;
    srow.onclick = () => { closeSheet(); goToTrack(i, true); };
    sli.appendChild(srow);
    sheetListEl.appendChild(sli);
    sheetItems.push(srow);
  });

  // Отслеживание свайпов в NewYearGram
  const io = new IntersectionObserver(entries => {
    if (currentSkin !== 'gram') return;
    for (const ent of entries) {
      if (!ent.isIntersecting || ent.intersectionRatio < 0.6) continue;
      const idx = Number(ent.target.dataset.idx);
      if (idx === visibleIdx) continue;
      visibleIdx = idx;
      if (!hasSwiped && idx > 0) {
        hasSwiped = true;
        const hint = $('swipeHint');
        if (hint) hint.remove();
      }
      highlightStory(idx);
      if (!programmaticScroll && userStarted && isActivePlaying() && idx !== cur) {
        play(idx);
      }
    }
  }, { root: feedEl, threshold: [0.65] });
  slides.forEach(s => io.observe(s.el));

  // Клавиатура на ПК
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && !sheetEl.hidden) { closeSheet(); return; }
    if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'BUTTON')) return;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') { ev.preventDefault(); nextTrack(); }
    else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') { ev.preventDefault(); prevTrack(); }
    else if (ev.key === ' ') { ev.preventDefault(); cur < 0 ? play(currentSkin === 'gram' ? visibleIdx : 0) : toggle(); }
  });

  startWaveLoop();
  startLiveCounts();
}

let busy = false;
async function refreshCounts() {
  if (busy || !window.API_URL || document.hidden) return;
  busy = true;
  try {
    const counts = await Store.loadCounts(), mine = Store.mine();
    tracks.forEach((t, i) => updateTrackReacts(i, mine[t.id], counts[t.id]));
  } finally { busy = false; }
}
function startLiveCounts() {
  if (!window.API_URL) return;
  setInterval(refreshCounts, 10000);
  document.addEventListener('visibilitychange', refreshCounts);
}

init();
})();
