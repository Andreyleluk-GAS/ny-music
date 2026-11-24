/* ===== Художественные новогодние SVG-иллюстрации для АудиоГрам ===== */
(() => {
'use strict';

const THEMES = {
  tree: {
    bg: 'radial-gradient(120% 90% at 50% 18%, #164b43 0%, #0a2629 52%, #06121b 100%)',
    accent: '#ffd166',
    accent2: '#4ade80'
  },
  blizzard: {
    bg: 'radial-gradient(120% 90% at 50% 15%, #1d4e78 0%, #0f2544 52%, #071124 100%)',
    accent: '#8be9ff',
    accent2: '#e0f7ff'
  },
  gift: {
    bg: 'radial-gradient(120% 90% at 50% 20%, #6b1d35 0%, #341022 52%, #130812 100%)',
    accent: '#ffd166',
    accent2: '#ff6b8b'
  },
  sleigh: {
    bg: 'radial-gradient(120% 90% at 50% 18%, #26346e 0%, #131a3d 54%, #080b1f 100%)',
    accent: '#ffe08a',
    accent2: '#7cc4ff'
  },
  star: {
    bg: 'radial-gradient(120% 90% at 50% 22%, #593916 0%, #271a14 52%, #0d0b14 100%)',
    accent: '#ffe28a',
    accent2: '#f59e0b'
  },
  globe: {
    bg: 'radial-gradient(120% 90% at 50% 18%, #1a4754 0%, #0e2536 52%, #07111d 100%)',
    accent: '#7ce8ff',
    accent2: '#ffd166'
  },
  snowman: {
    bg: 'radial-gradient(120% 90% at 50% 18%, #214063 0%, #10203a 52%, #081020 100%)',
    accent: '#ffb74d',
    accent2: '#9be7ff'
  },
  bells: {
    bg: 'radial-gradient(120% 90% at 50% 18%, #4d222a 0%, #231822 52%, #0c0e17 100%)',
    accent: '#ffd166',
    accent2: '#ff5c77'
  },
  fireworks: {
    bg: 'radial-gradient(120% 90% at 50% 16%, #2b215c 0%, #151436 52%, #080a1c 100%)',
    accent: '#ffd166',
    accent2: '#c084fc'
  }
};

const EMOJI_MAP = {
  '🎄': 'tree',
  '❄️': 'blizzard',
  '🌨️': 'blizzard',
  '🎁': 'gift',
  '🎊': 'gift',
  '🛷': 'sleigh',
  '🦌': 'sleigh',
  '🌟': 'star',
  '⛸️': 'star',
  '✨': 'globe',
  '🧣': 'globe',
  '☃️': 'snowman',
  '🎅': 'bells',
  '🔔': 'bells',
  '🎉': 'fireworks',
  '🎇': 'fireworks'
};

const ORDER = ['tree', 'blizzard', 'gift', 'sleigh', 'star', 'globe', 'snowman', 'bells', 'fireworks'];

function pickKey(track, index) {
  if (track && track.emoji && EMOJI_MAP[track.emoji]) return EMOJI_MAP[track.emoji];
  return ORDER[index % ORDER.length];
}

function stars(p) {
  return `
    <g class="art-twinkle" fill="#fff7d6">
      <circle cx="54" cy="58" r="1.8" opacity=".85"/>
      <circle cx="96" cy="36" r="1.3" opacity=".6"/>
      <circle cx="272" cy="48" r="2.1" opacity=".9"/>
      <circle cx="312" cy="84" r="1.4" opacity=".65"/>
      <circle cx="42" cy="128" r="1.3" opacity=".55"/>
      <circle cx="322" cy="152" r="1.8" opacity=".75"/>
      <path d="M292 66 l2.2 6.2 6.2 2.2 -6.2 2.2 -2.2 6.2 -2.2 -6.2 -6.2 -2.2 6.2 -2.2z" fill="#ffe599" opacity=".9"/>
      <path d="M68 88 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6z" fill="#bfefff" opacity=".85"/>
    </g>
    <defs>
      <radialGradient id="${p}halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffe599" stop-opacity=".42"/>
        <stop offset="55%" stop-color="#ffd166" stop-opacity=".12"/>
        <stop offset="100%" stop-color="#ffd166" stop-opacity="0"/>
      </radialGradient>
    </defs>`;
}

const SCENES = {
  tree(p) {
    return `${stars(p)}
    <defs>
      <linearGradient id="${p}t1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38b682"/>
        <stop offset="100%" stop-color="#0d4a3c"/>
      </linearGradient>
      <linearGradient id="${p}t2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#29946b"/>
        <stop offset="100%" stop-color="#09362e"/>
      </linearGradient>
      <linearGradient id="${p}snow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e8f7ff"/>
        <stop offset="100%" stop-color="#96c3dc"/>
      </linearGradient>
      <radialGradient id="${p}st" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff8d6"/>
        <stop offset="50%" stop-color="#ffd166"/>
        <stop offset="100%" stop-color="#d98a1c"/>
      </radialGradient>
    </defs>
    <circle cx="180" cy="168" r="130" fill="url(#${p}halo)"/>
    <path d="M0 306 Q90 278 180 296 T360 290 L360 360 L0 360 Z" fill="url(#${p}snow)" opacity=".2"/>
    <path d="M0 322 Q115 296 225 312 T360 306 L360 360 L0 360 Z" fill="url(#${p}snow)" opacity=".34"/>
    <g opacity=".35" fill="#0d3b38">
      <polygon points="58,298 78,236 98,298"/>
      <polygon points="268,302 292,226 316,302"/>
    </g>
    <rect x="167" y="276" width="26" height="36" rx="5" fill="#6b3e26"/>
    <polygon points="180,152 84,284 276,284" fill="url(#${p}t2)"/>
    <polygon points="180,110 100,228 260,228" fill="url(#${p}t1)"/>
    <polygon points="180,72 122,166 238,166" fill="url(#${p}t1)"/>
    <path d="M134 150 Q180 174 224 148" fill="none" stroke="#ffd166" stroke-width="3" stroke-linecap="round" opacity=".9"/>
    <path d="M112 206 Q180 238 248 202" fill="none" stroke="#ffd166" stroke-width="3.2" stroke-linecap="round" opacity=".9"/>
    <path d="M95 262 Q180 292 265 258" fill="none" stroke="#ffd166" stroke-width="3.4" stroke-linecap="round" opacity=".9"/>
    <g class="art-pulse">
      <circle cx="152" cy="154" r="6.5" fill="#ff5470"/>
      <circle cx="204" cy="160" r="5.5" fill="#7ce8ff"/>
      <circle cx="136" cy="212" r="7" fill="#ffd166"/>
      <circle cx="182" cy="222" r="7.5" fill="#ff5470"/>
      <circle cx="226" cy="208" r="6.5" fill="#7ce8ff"/>
      <circle cx="122" cy="264" r="7.5" fill="#7ce8ff"/>
      <circle cx="166" cy="272" r="7" fill="#ffd166"/>
      <circle cx="212" cy="270" r="8" fill="#ff5470"/>
      <circle cx="244" cy="260" r="6" fill="#ffd166"/>
    </g>
    <g class="art-float">
      <circle cx="180" cy="64" r="24" fill="url(#${p}halo)"/>
      <polygon points="180,44 185,58 200,58 188,67 192,81 180,72 168,81 172,67 160,58 175,58" fill="url(#${p}st)"/>
    </g>`;
  },

  blizzard(p) {
    return `${stars(p)}
    <defs>
      <linearGradient id="${p}ice" gradientUnits="userSpaceOnUse" x1="80" y1="80" x2="280" y2="280">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="#8be9ff"/>
        <stop offset="100%" stop-color="#3898d8"/>
      </linearGradient>
      <radialGradient id="${p}moon" cx="45%" cy="45%" r="55%">
        <stop offset="0%" stop-color="#e8f9ff" stop-opacity=".45"/>
        <stop offset="100%" stop-color="#3898d8" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="180" cy="176" r="126" fill="url(#${p}moon)"/>
    <path d="M26 232 C100 182 210 264 334 190" fill="none" stroke="rgba(165,235,255,.22)" stroke-width="10" stroke-linecap="round"/>
    <path d="M18 148 C110 100 220 176 342 118" fill="none" stroke="rgba(165,235,255,.16)" stroke-width="7" stroke-linecap="round"/>
    <g class="art-spin" transform-origin="180 176" stroke="url(#${p}ice)" stroke-linecap="round" fill="none">
      ${[0, 60, 120, 180, 240, 300].map(a => `
      <g transform="rotate(${a} 180 176)">
        <line x1="180" y1="176" x2="180" y2="74" stroke-width="5"/>
        <polyline points="164,104 180,120 196,104" stroke-width="4"/>
        <polyline points="158,130 180,148 202,130" stroke-width="3.6"/>
        <circle cx="180" cy="72" r="5" fill="#e6fbff" stroke="none"/>
      </g>`).join('')}
      <polygon points="180,152 201,164 201,188 180,200 159,188 159,164" fill="rgba(224,248,255,.28)" stroke-width="3.2"/>
      <circle cx="180" cy="176" r="10" fill="#ffffff" stroke="none"/>
    </g>`;
  },

  gift(p) {
    return `${stars(p)}
    <defs>
      <linearGradient id="${p}box" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f43f5e"/>
        <stop offset="100%" stop-color="#9f1239"/>
      </linearGradient>
      <linearGradient id="${p}lid" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fb7185"/>
        <stop offset="100%" stop-color="#be123c"/>
      </linearGradient>
      <linearGradient id="${p}rib" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff4c4"/>
        <stop offset="50%" stop-color="#ffd166"/>
        <stop offset="100%" stop-color="#d98a1c"/>
      </linearGradient>
    </defs>
    <circle cx="180" cy="182" r="128" fill="url(#${p}halo)"/>
    <ellipse cx="180" cy="296" rx="92" ry="14" fill="rgba(0,0,0,.35)"/>
    <g class="art-float">
      <rect x="96" y="164" width="168" height="124" rx="16" fill="url(#${p}box)"/>
      <rect x="164" y="164" width="32" height="124" fill="url(#${p}rib)"/>
      <rect x="96" y="212" width="168" height="26" fill="url(#${p}rib)" opacity=".92"/>
      <rect x="86" y="132" width="188" height="42" rx="12" fill="url(#${p}lid)"/>
      <rect x="164" y="132" width="32" height="42" fill="url(#${p}rib)"/>
      <path d="M180 134 C146 84 96 98 118 130 C132 146 164 138 180 134 Z" fill="url(#${p}rib)"/>
      <path d="M180 134 C214 84 264 98 242 130 C228 146 196 138 180 134 Z" fill="url(#${p}rib)"/>
      <circle cx="180" cy="132" r="13" fill="#fff3c4"/>
    </g>
    <g class="art-pulse" fill="#ffe599">
      <circle cx="72" cy="136" r="5" opacity=".7"/>
      <circle cx="292" cy="152" r="6" opacity=".6"/>
      <circle cx="272" cy="96" r="4" opacity=".8"/>
      <circle cx="96" cy="92" r="3.5" opacity=".75"/>
    </g>`;
  },

  sleigh(p) {
    return `${stars(p)}
    <defs>
      <radialGradient id="${p}fm" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#fffce6"/>
        <stop offset="65%" stop-color="#ffe299"/>
        <stop offset="100%" stop-color="#e3a94b"/>
      </radialGradient>
      <linearGradient id="${p}sl" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff5470"/>
        <stop offset="100%" stop-color="#a61734"/>
      </linearGradient>
    </defs>
    <circle cx="218" cy="126" r="64" fill="url(#${p}fm)" opacity=".95"/>
    <circle cx="218" cy="126" r="96" fill="url(#${p}halo)"/>
    <path d="M0 290 Q95 256 185 278 T360 270 L360 360 L0 360 Z" fill="#182952"/>
    <path d="M0 308 Q115 280 230 298 T360 292 L360 360 L0 360 Z" fill="#cfe9ff" opacity=".22"/>
    <g fill="#0e1733">
      <rect x="46" y="250" width="42" height="36" rx="2"/>
      <polygon points="40,252 67,228 94,252"/>
      <rect x="258" y="246" width="48" height="40" rx="2"/>
      <polygon points="252,248 282,222 312,248"/>
    </g>
    <g fill="#ffd166">
      <rect x="56" y="260" width="9" height="10" rx="1.5"/>
      <rect x="70" y="260" width="9" height="10" rx="1.5"/>
      <rect x="270" y="256" width="10" height="11" rx="1.5"/>
      <rect x="286" y="256" width="10" height="11" rx="1.5"/>
    </g>
    <g class="art-float" transform="translate(-8,-6) rotate(-7 180 180)">
      <path d="M98 206 C130 218 226 218 262 198 C272 192 276 180 264 176" fill="none" stroke="#ffd166" stroke-width="5.5" stroke-linecap="round"/>
      <line x1="138" y1="210" x2="144" y2="188" stroke="#ffd166" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="216" y1="208" x2="210" y2="186" stroke="#ffd166" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M114 148 C118 188 142 194 188 194 L232 194 C248 194 256 178 242 162 C226 164 214 172 196 172 L152 172 C136 172 128 156 124 142 Z" fill="url(#${p}sl)"/>
      <path d="M118 148 L152 170 L240 168" fill="none" stroke="#ffe599" stroke-width="3.2" stroke-linecap="round"/>
      <rect x="148" y="138" width="28" height="28" rx="5" fill="#34d399"/>
      <rect x="160" y="138" width="5" height="28" fill="#ffd166"/>
      <rect x="178" y="144" width="24" height="22" rx="4" fill="#60a5fa"/>
      <rect x="188" y="144" width="4" height="22" fill="#ffe599"/>
    </g>`;
  },

  star(p) {
    return `${stars(p)}
    <defs>
      <radialGradient id="${p}vin" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#2a2433"/>
        <stop offset="68%" stop-color="#14111b"/>
        <stop offset="100%" stop-color="#09070e"/>
      </radialGradient>
      <linearGradient id="${p}gld" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff6cc"/>
        <stop offset="50%" stop-color="#f7cf76"/>
        <stop offset="100%" stop-color="#c9801d"/>
      </linearGradient>
    </defs>
    <circle cx="180" cy="176" r="134" fill="url(#${p}halo)"/>
    <g class="art-spin" transform-origin="180 176">
      <circle cx="180" cy="176" r="106" fill="url(#${p}vin)" stroke="url(#${p}gld)" stroke-width="3"/>
      <circle cx="180" cy="176" r="88" fill="none" stroke="rgba(255,224,148,.16)" stroke-width="1.2"/>
      <circle cx="180" cy="176" r="72" fill="none" stroke="rgba(255,224,148,.14)" stroke-width="1.2"/>
      <circle cx="180" cy="176" r="56" fill="none" stroke="rgba(255,224,148,.16)" stroke-width="1.2"/>
      <path d="M108 118 A92 92 0 0 1 206 88" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="12" stroke-linecap="round"/>
      <circle cx="180" cy="176" r="44" fill="url(#${p}gld)"/>
      <path d="M180 138 L188 164 L214 176 L188 188 L180 214 L172 188 L146 176 L172 164 Z" fill="#1b1420"/>
      <circle cx="180" cy="176" r="7" fill="#fff6cc"/>
    </g>`;
  },

  globe(p) {
    return `${stars(p)}
    <defs>
      <radialGradient id="${p}glass" cx="35%" cy="28%" r="70%">
        <stop offset="0%" stop-color="#b8f1ff" stop-opacity=".42"/>
        <stop offset="55%" stop-color="#28688c" stop-opacity=".22"/>
        <stop offset="100%" stop-color="#0b2038" stop-opacity=".62"/>
      </radialGradient>
      <linearGradient id="${p}base" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#7c2d12"/>
        <stop offset="50%" stop-color="#b45309"/>
        <stop offset="100%" stop-color="#581c0c"/>
      </linearGradient>
    </defs>
    <circle cx="180" cy="162" r="126" fill="url(#${p}halo)"/>
    <circle cx="180" cy="158" r="104" fill="url(#${p}glass)" stroke="rgba(190,242,255,.45)" stroke-width="2.5"/>
    <path d="M96 206 Q180 184 264 206 A104 104 0 0 1 96 206 Z" fill="#e6f6ff" opacity=".9"/>
    <g>
      <polygon points="122,202 138,154 154,202" fill="#166552"/>
      <polygon points="214,202 228,162 242,202" fill="#166552"/>
      <rect x="152" y="164" width="56" height="40" rx="3" fill="#7c3e26"/>
      <polygon points="144,166 180,136 216,166" fill="#e0f2fe"/>
      <rect x="162" y="176" width="13" height="13" rx="2" fill="#ffd166"/>
      <rect x="184" y="176" width="13" height="13" rx="2" fill="#ffd166"/>
    </g>
    <path d="M112 114 A78 78 0 0 1 168 74" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="7" stroke-linecap="round"/>
    <g class="art-pulse" fill="#ffffff">
      <circle cx="136" cy="112" r="2.6" opacity=".85"/>
      <circle cx="192" cy="102" r="2.2" opacity=".8"/>
      <circle cx="222" cy="134" r="2.8" opacity=".85"/>
      <circle cx="152" cy="130" r="2" opacity=".7"/>
    </g>
    <path d="M108 250 L252 250 L264 294 C264 302 254 306 244 306 L116 306 C106 306 96 302 96 294 Z" fill="url(#${p}base)"/>
    <rect x="104" y="246" width="152" height="12" rx="6" fill="#ffd166"/>
    <rect x="148" y="272" width="64" height="16" rx="8" fill="#ffd166" opacity=".85"/>`;
  },

  snowman(p) {
    return `${stars(p)}
    <defs>
      <radialGradient id="${p}sb" cx="38%" cy="32%" r="68%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="70%" stop-color="#d8eefc"/>
        <stop offset="100%" stop-color="#8ab7d6"/>
      </radialGradient>
      <radialGradient id="${p}lan" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff8cc"/>
        <stop offset="50%" stop-color="#ffb74d" stop-opacity=".6"/>
        <stop offset="100%" stop-color="#ffb74d" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <path d="M0 302 Q180 272 360 302 L360 360 L0 360 Z" fill="#d8eefc" opacity=".28"/>
    <circle cx="264" cy="212" r="46" fill="url(#${p}lan)" class="art-pulse"/>
    <line x1="128" y1="190" x2="84" y2="164" stroke="#6b4226" stroke-width="5" stroke-linecap="round"/>
    <line x1="232" y1="190" x2="266" y2="178" stroke="#6b4226" stroke-width="5" stroke-linecap="round"/>
    <g>
      <line x1="264" y1="178" x2="264" y2="196" stroke="#ffd166" stroke-width="2.5"/>
      <rect x="252" y="196" width="24" height="30" rx="5" fill="#fff2b2" stroke="#d98a1c" stroke-width="3"/>
    </g>
    <circle cx="180" cy="252" r="56" fill="url(#${p}sb)"/>
    <circle cx="180" cy="176" r="40" fill="url(#${p}sb)"/>
    <circle cx="180" cy="116" r="29" fill="url(#${p}sb)"/>
    <path d="M150 138 Q180 150 210 138 L214 152 Q180 164 146 152 Z" fill="#e11d48"/>
    <path d="M192 146 L208 188 L192 192 L180 150 Z" fill="#be123c"/>
    <circle cx="170" cy="111" r="3.4" fill="#1e293b"/>
    <circle cx="190" cy="111" r="3.4" fill="#1e293b"/>
    <polygon points="180,116 206,121 180,125" fill="#fb923c"/>
    <circle cx="180" cy="176" r="4" fill="#1e293b"/>
    <circle cx="180" cy="196" r="4" fill="#1e293b"/>
    <rect x="148" y="84" width="64" height="9" rx="4.5" fill="#1e293b"/>
    <rect x="158" y="54" width="44" height="34" rx="5" fill="#0f172a"/>
    <rect x="158" y="76" width="44" height="8" fill="#e11d48"/>`;
  },

  bells(p) {
    return `${stars(p)}
    <defs>
      <linearGradient id="${p}bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff4bf"/>
        <stop offset="48%" stop-color="#f7c852"/>
        <stop offset="100%" stop-color="#b87314"/>
      </linearGradient>
      <linearGradient id="${p}bow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff5c77"/>
        <stop offset="100%" stop-color="#9f1239"/>
      </linearGradient>
    </defs>
    <circle cx="180" cy="176" r="128" fill="url(#${p}halo)"/>
    <g class="art-float">
      <g transform="rotate(-18 148 164)">
        <path d="M148 118 C118 118 106 164 96 210 L200 210 C190 164 178 118 148 118 Z" fill="url(#${p}bg)"/>
        <ellipse cx="148" cy="210" rx="52" ry="12" fill="#9a5c0d"/>
        <circle cx="148" cy="218" r="11" fill="#ffe599"/>
      </g>
      <g transform="rotate(18 212 164)">
        <path d="M212 118 C182 118 170 164 160 210 L264 210 C254 164 242 118 212 118 Z" fill="url(#${p}bg)"/>
        <ellipse cx="212" cy="210" rx="52" ry="12" fill="#9a5c0d"/>
        <circle cx="212" cy="218" r="11" fill="#ffe599"/>
      </g>
      <path d="M114 114 Q146 84 180 112 Q214 84 246 114 Q212 132 180 118 Q148 132 114 114 Z" fill="#15803d"/>
      <path d="M180 112 C142 66 102 88 122 122 C138 140 166 124 180 112 Z" fill="url(#${p}bow)"/>
      <path d="M180 112 C218 66 258 88 238 122 C222 140 194 124 180 112 Z" fill="url(#${p}bow)"/>
      <circle cx="180" cy="112" r="13" fill="#ff5c77"/>
      <circle cx="164" cy="126" r="6" fill="#ff3b5c"/>
      <circle cx="196" cy="126" r="6" fill="#ff3b5c"/>
    </g>`;
  },

  fireworks(p) {
    const burstRays = (cx, cy, r, col, n) => {
      let s = '';
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const x1 = cx + Math.cos(ang) * (r * 0.28);
        const y1 = cy + Math.sin(ang) * (r * 0.28);
        const x2 = cx + Math.cos(ang) * r;
        const y2 = cy + Math.sin(ang) * r;
        s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/>`;
        s += `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="2.8" fill="#fff7d6"/>`;
      }
      return s;
    };
    return `${stars(p)}
    <circle cx="180" cy="140" r="120" fill="url(#${p}halo)"/>
    <g class="art-pulse">
      ${burstRays(180, 128, 62, '#ffd166', 14)}
      ${burstRays(96, 176, 40, '#ff5c8a', 10)}
      ${burstRays(268, 166, 44, '#7ce8ff', 10)}
    </g>
    <g fill="#0c1026">
      <rect x="26" y="254" width="38" height="72"/>
      <rect x="70" y="232" width="44" height="94"/>
      <rect x="122" y="248" width="34" height="78"/>
      <rect x="162" y="206" width="36" height="120"/>
      <polygon points="158,208 180,180 202,208"/>
      <rect x="206" y="240" width="46" height="86"/>
      <rect x="260" y="256" width="38" height="70"/>
      <rect x="304" y="244" width="34" height="82"/>
    </g>
    <g fill="#ffd166" opacity=".88">
      <circle cx="180" cy="226" r="8"/>
      <rect x="82" y="246" width="7" height="8" rx="1"/>
      <rect x="96" y="246" width="7" height="8" rx="1"/>
      <rect x="82" y="262" width="7" height="8" rx="1"/>
      <rect x="218" y="254" width="8" height="8" rx="1"/>
      <rect x="234" y="254" width="8" height="8" rx="1"/>
      <rect x="38" y="268" width="7" height="8" rx="1"/>
    </g>
    <path d="M0 308 Q180 290 360 308 L360 360 L0 360 Z" fill="#dbeafe" opacity=".18"/>`;
  }
};

window.AudioGramArt = {
  getScene(track, index) {
    const key = pickKey(track, index);
    const theme = THEMES[key] || THEMES.tree;
    const prefix = `ag${index}_`;
    const body = (SCENES[key] || SCENES.tree)(prefix);
    return {
      key,
      bg: theme.bg,
      accent: theme.accent,
      accent2: theme.accent2,
      svg: `<svg class="art-svg" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`
    };
  }
};
})();
