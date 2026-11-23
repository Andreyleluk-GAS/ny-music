(() => {
'use strict';
const $ = id => document.getElementById(id);
const audio = $('audio'), list = $('list');
const REACTS = [['fire', '🔥'], ['tree', '🎄'], ['snow', '❄️']];
let tracks = [], cur = -1;

/* ===== Реакции: хранилище =====
 * Сейчас всё в localStorage. Чтобы подключить сервер, замените тела
 * loadCounts() и sendReaction() на fetch() к вашему API:
 *   GET  /api/reactions            -> { "t1": {fire:3,tree:1,snow:0}, ... }
 *   POST /api/reactions {id,type}  -> обновлённые счётчики
 */
const Store = {
  mine: () => JSON.parse(localStorage.getItem('ny_mine') || '{}'),      // {trackId: type}
  counts: () => JSON.parse(localStorage.getItem('ny_counts') || '{}'),
  async loadCounts() { return this.counts(); },
  async sendReaction(id, type) {
    const mine = this.mine(), counts = this.counts();
    const c = counts[id] = counts[id] || {};
    if (mine[id]) c[mine[id]] = Math.max(0, (c[mine[id]] || 1) - 1); // смена выбора
    if (mine[id] === type) delete mine[id];                           // повторный клик — снять
    else { mine[id] = type; c[type] = (c[type] || 0) + 1; }
    localStorage.setItem('ny_mine', JSON.stringify(mine));
    localStorage.setItem('ny_counts', JSON.stringify(counts));
    return { mine: mine[id], counts: c };
  }
};

const fmt = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';

async function init() {
  initLights(); initSnow();
  try {
    tracks = await (await fetch('tracks.json')).json();
  } catch (e) {
    $('err').hidden = false; $('err').textContent = 'Не удалось загрузить tracks.json'; return;
  }
  const counts = await Store.loadCounts(), mine = Store.mine();
  tracks.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = 'card'; li.id = 'c' + i;
    const row = document.createElement('button');
    row.className = 'row';
    row.innerHTML = `<span class="cover">${t.emoji}</span><span class="meta"><div class="title"></div><div class="artist"></div></span><span class="eq"><i></i><i></i><i></i></span>`;
    row.querySelector('.title').textContent = t.title;
    row.querySelector('.artist').textContent = t.artist;
    row.onclick = () => play(i);
    const rs = document.createElement('div'); rs.className = 'reacts';
    REACTS.forEach(([k, e]) => {
      const b = document.createElement('button');
      b.className = 'react' + (mine[t.id] === k ? ' on' : '');
      b.dataset.k = k;
      b.textContent = `${e} ${(counts[t.id] || {})[k] || 0}`;
      b.onclick = async ev => {
        const r = await Store.sendReaction(t.id, k);
        rs.querySelectorAll('.react').forEach((x, n) => {
          x.classList.toggle('on', r.mine === x.dataset.k);
          x.textContent = `${REACTS[n][1]} ${r.counts[x.dataset.k] || 0}`;
        });
        if (r.mine === k) burst(e, ev.clientX, ev.clientY);
      };
      rs.appendChild(b);
    });
    li.append(row, rs); list.appendChild(li);
  });
}

function burst(emoji, x, y) {
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('span');
    s.className = 'fly'; s.textContent = emoji;
    s.style.left = x + 'px'; s.style.top = y + 'px';
    s.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
    s.style.animationDelay = (Math.random() * .15) + 's';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1300);
  }
}

function play(i) {
  if (i === cur) { toggle(); return; }
  cur = i; const t = tracks[i];
  audio.src = t.file;
  audio.play().catch(() => {});
  $('player').hidden = false;
  $('pTitle').textContent = t.title; $('pArtist').textContent = t.artist; $('pCover').textContent = t.emoji;
  document.querySelectorAll('.card').forEach((c, n) => c.classList.toggle('active', n === i));
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: 'Новогодний вайб' });
  }
}
const toggle = () => audio.paused ? audio.play().catch(() => {}) : audio.pause();
const next = () => play((cur + 1) % tracks.length);
const prev = () => audio.currentTime > 3 ? (audio.currentTime = 0) : play((cur - 1 + tracks.length) % tracks.length);
const shuffle = () => { if (tracks.length < 2) return play(0); let n; do { n = Math.floor(Math.random() * tracks.length); } while (n === cur); play(n); };

$('play').onclick = () => cur < 0 ? play(0) : toggle();
$('next').onclick = next; $('prev').onclick = prev; $('shuffle').onclick = shuffle;
audio.addEventListener('play', sync); audio.addEventListener('pause', sync);
audio.addEventListener('ended', next);
audio.addEventListener('error', () => { if (cur >= 0) { $('pArtist').textContent = '⚠ файл не найден: ' + tracks[cur].file; } });
function sync() {
  $('play').textContent = audio.paused ? '▶' : '⏸';
  const c = document.querySelector('.card.active');
  document.querySelectorAll('.card').forEach(x => x.classList.remove('playing'));
  if (c && !audio.paused) c.classList.add('playing');
}
let seeking = false;
audio.addEventListener('timeupdate', () => {
  $('tCur').textContent = fmt(audio.currentTime); $('tDur').textContent = fmt(audio.duration);
  if (!seeking && audio.duration) $('seek').value = audio.currentTime / audio.duration * 1000;
});
const seek = $('seek');
seek.addEventListener('input', () => { seeking = true; });
seek.addEventListener('change', () => { if (audio.duration) audio.currentTime = seek.value / 1000 * audio.duration; seeking = false; });
if ('mediaSession' in navigator) {
  const m = navigator.mediaSession;
  m.setActionHandler('play', () => audio.play());
  m.setActionHandler('pause', () => audio.pause());
  m.setActionHandler('previoustrack', prev);
  m.setActionHandler('nexttrack', next);
}

function initLights() {
  const ul = $('lights'), colors = ['#ff4d6d', '#ffd166', '#4dffb8', '#6fb7ff', '#c77dff'];
  const n = Math.floor(window.innerWidth / 28);
  for (let i = 0; i < n; i++) {
    const li = document.createElement('li');
    li.style.color = colors[i % colors.length];
    li.style.animationDelay = (i % 5) * .3 + 's';
    ul.appendChild(li);
  }
}

function initSnow() {
  const cv = $('snow'), ctx = cv.getContext('2d');
  let on = localStorage.getItem('ny_snow') !== 'off', flakes = [], raf;
  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
  resize(); addEventListener('resize', resize);
  const N = innerWidth < 500 ? 40 : 80;
  for (let i = 0; i < N; i++) flakes.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 2 + 1, v: Math.random() + .5, d: Math.random() * Math.PI * 2 });
  function frame() {
    ctx.clearRect(0, 0, cv.width, cv.height); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath();
    for (const f of flakes) {
      f.y += f.v; f.d += .01; f.x += Math.sin(f.d) * .4;
      if (f.y > cv.height) { f.y = -5; f.x = Math.random() * cv.width; }
      ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, f.r, 0, 6.283);
    }
    ctx.fill(); raf = requestAnimationFrame(frame);
  }
  const set = v => {
    on = v; localStorage.setItem('ny_snow', v ? 'on' : 'off');
    cancelAnimationFrame(raf); ctx.clearRect(0, 0, cv.width, cv.height);
    $('snowBtn').style.opacity = v ? 1 : .4;
    if (v && !matchMedia('(prefers-reduced-motion: reduce)').matches) frame();
  };
  $('snowBtn').onclick = () => set(!on);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else if (on) { cancelAnimationFrame(raf); frame(); } });
  set(on);
}

init();
})();
