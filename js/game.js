/* =========================================================
   星光谷 · 主逻辑
   ========================================================= */

const IMG = {};
const ASSETS = {
  hero:   'assets/sprites/hero.png',
  mei:    'assets/sprites/npc_mei.png',
  zhang:  'assets/sprites/npc_zhang.png',
  mu:     'assets/sprites/npc_mu.png',
  props:  'assets/sprites/props.png',
  icons:  'assets/sprites/icons.png',
  water:  'assets/tiles/water_over_grass.png',
  grass_dirt: 'assets/tiles/ground_grass_dirt.png',
  stone:  'assets/tiles/stone_over_grass.png',
  carrot: 'assets/items/carrot.png',
  berry:  'assets/items/berry.png',
  corn:   'assets/items/corn.png',
  pumpkin:'assets/items/pumpkin.png',
  wheat:  'assets/items/wheat.png'
};

const SFX_FILES = {
  coin:   ['assets/sfx/coin_1.wav', 'assets/sfx/coin_2.wav', 'assets/sfx/coin_3.wav'],
  hoe:    ['assets/sfx/hoe_1.wav', 'assets/sfx/hoe_2.wav', 'assets/sfx/hoe_3.wav'],
  harvest:['assets/sfx/harvest_1.wav', 'assets/sfx/harvest_2.wav', 'assets/sfx/harvest_3.wav'],
  click:  ['assets/sfx/ui_click_1.wav', 'assets/sfx/ui_click_2.wav'],
  splash: ['assets/sfx/splash_1.wav', 'assets/sfx/splash_2.wav']
};

const G = {
  started: false, paused: true,
  season: 0, day: 1, minutes: 6 * 60,
  gold: 150, energy: 100, maxEnergy: 100,
  tool: 0, weather: 'sun',
  bag: {},
  player: { x: 9 * 16 + 8, y: 8 * 16 + 12, dir: 'down', moving: false, speed: 58 },
  npcs: [], parts: [], hearts: {}, talked: {}, gifted: {},
  hover: { x: 9, y: 8 },
  fish: { state: 'idle', t: 0, tx: null, ty: null, dur: 0 },
  actCd: 0, stepT: 0, milestone: 0, saveT: 0,
  muted: false, musicOn: false, frame: 0
};

/* ---------------- 音效 ---------------- */
const SFX = {};
function loadAudio() {
  for (const k in SFX_FILES) SFX[k] = SFX_FILES[k].map(src => { const a = new Audio(src); a.preload = 'auto'; a.volume = 0.35; return a; });
}
function sfx(name, vol) {
  if (G.muted || !SFX[name]) return;
  const pool = SFX[name];
  const a = pool[Math.floor(Math.random() * pool.length)];
  try { a.currentTime = 0; a.volume = vol === undefined ? 0.35 : vol; a.play().catch(() => {}); } catch (e) {}
}
let musicEl = null, musicNight = false;
function startMusic() {
  if (G.musicOn) return;
  G.musicOn = true;
  musicEl = new Audio('assets/music/valley_day.mp3');
  musicEl.loop = true; musicEl.volume = 0.22;
  musicEl.play().catch(() => {});
}
function swapMusic() {
  if (!musicEl) return;
  const night = G.minutes >= 19 * 60 || G.minutes < 6 * 60 + 30;
  if (night === musicNight) return;
  musicNight = night;
  musicEl.pause();
  musicEl = new Audio(night ? 'assets/music/valley_night.mp3' : 'assets/music/valley_day.mp3');
  musicEl.loop = true; musicEl.volume = 0.22;
  musicEl.play().catch(() => {});
}

/* ---------------- 图标 ---------------- */
const ICON_CACHE = {};
const CROP_PNG = { carrot: 'carrot', berry: 'berry', corn: 'corn', pumpkin: 'pumpkin', wheat: 'wheat' };
function iconFor(id) {
  if (ICON_CACHE[id]) return ICON_CACHE[id];
  let c = null;
  const crop = CROPS[id];
  if (crop) {
    const key = String(crop.icon).split(':')[0];
    if (CROP_PNG[key] && IMG[CROP_PNG[key]]) c = IMG[CROP_PNG[key]];
    else if (String(crop.icon).startsWith('ball:')) c = sprGood('ball', String(crop.icon).slice(5));
    else c = sprGood('ball', '#c8a05a');
  } else if (id && id.endsWith('_seed')) {
    c = sprGood('sack');
  } else if (id === 'wood') c = sprGood('plank');
  else if (id === 'stone') c = sprGood('ball', '#9aa0a6');
  else if (id === 'copper') c = sprGood('jar', '#cf8a4a');
  else if (id === 'fish') c = sprGood('fish', '#6aa8d8');
  else if (id === 'carp') c = sprGood('fish', '#8a9a6a');
  else if (id === 'koi') c = sprGood('fish', '#e0603a');
  else if (id === 'bread') c = sprGood('loaf', '#d8a05a');
  if (!c) c = sprGood('ball', '#cccccc');
  ICON_CACHE[id] = c;
  return c;
}
function iconURL(id) {
  const c = iconFor(id);
  if (!c) return '';
  if (c.tagName === 'IMG') return c.src;
  return c.toDataURL();
}

/* ---------------- 背包 ---------------- */
function addItem(id, n) {
  G.bag[id] = (G.bag[id] || 0) + (n || 1);
  UI.bagDirty = true;
}
function countItem(id) { return G.bag[id] || 0; }
function takeItem(id, n) {
  const have = countItem(id);
  if (have < n) return false;
  if (have === n) delete G.bag[id]; else G.bag[id] = have - n;
  UI.bagDirty = true;
  return true;
}
function seasonSeedId() {
  for (const k in CROPS) if (CROPS[k].season === G.season && countItem(k + '_seed') > 0) return k;
  return null;
}

/* ---------------- 世界实体 ---------------- */
function spawnNpcs() {
  G.npcs = NPCS.map((def, i) => ({
    id: def.id, name: def.name, def: def, sprite: IMG[def.img],
    x: def.spawn[0] * 16 + 8, y: def.spawn[1] * 16 + 14,
    dir: 'down', moving: false, wanderT: 0.6 + i, dirT: 0, talkT: 0, vx: 0, vy: 0
  }));
}

function nearestNpc(maxDist) {
  let best = null, bd = maxDist;
  for (const n of G.npcs) {
    const d = Math.hypot(n.x - G.player.x, n.y - G.player.y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

/* ---------------- 输入 ---------------- */
const KEYS = {};
function bindInput() {
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
    if (G.introOpen) return;
    KEYS[k] = true;
    if (k === ' ') { if (!e.repeat) act(); }
    else if (k === 'e') { if (!e.repeat) interact(); }
    else if (k === 'tab') { if (!e.repeat) UI.toggleBag(); }
    else if (k === 'escape') { if (!e.repeat) UI.escape(); }
    else if (k >= '1' && k <= '5') { G.tool = parseInt(k) - 1; UI.refreshToolbar(); sfx('click', 0.2); }
    else if (k === 'm') { G.muted = !G.muted; if (musicEl) musicEl.volume = G.muted ? 0 : 0.22; UI.toast(G.muted ? '静音了' : '开声音'); }
    startMusic();
  });
  window.addEventListener('keyup', e => { KEYS[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; });
}

function moveInput() {
  let dx = 0, dy = 0;
  if (KEYS['a'] || KEYS['arrowleft']) dx -= 1;
  if (KEYS['d'] || KEYS['arrowright']) dx += 1;
  if (KEYS['w'] || KEYS['arrowup']) dy -= 1;
  if (KEYS['s'] || KEYS['arrowdown']) dy += 1;
  return { dx, dy };
}

/* ---------------- 移动与碰撞 ---------------- */
function solidAt(px, py) {
  const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
  if (!inMap(tx, ty)) return true;
  if (MAP.ground[idx(tx, ty)] === G_WATER) return true;
  const o = MAP.obj[idx(tx, ty)];
  if (o === O_TREE || o === O_PINE || o === O_ROCK || o === O_BUSH || o === O_SIGN || o === O_CRATE) {
    return true;
  }
  if (buildingAt(tx, ty)) return true;
  return false;
}
function canStand(px, py) {
  const w = 4, h = 3;
  return !solidAt(px - w, py - h) && !solidAt(px + w, py - h) && !solidAt(px - w, py) && !solidAt(px + w, py);
}
function moveEntity(e, dx, dy, dt) {
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  const sp = e.speed || 58;
  const nx = e.x + dx * sp * dt, ny = e.y + dy * sp * dt;
  let moved = false;
  if (canStand(nx, e.y)) { e.x = nx; moved = true; }
  if (canStand(e.x, ny)) { e.y = ny; moved = true; }
  return moved;
}

/* ---------------- 主要动作 ---------------- */
function facingTile() {
  const p = G.player;
  let tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
  if (p.dir === 'up') ty--; else if (p.dir === 'down') ty++;
  else if (p.dir === 'left') tx--; else tx++;
  return { x: clamp(tx, 0, MAP_W - 1), y: clamp(ty, 0, MAP_H - 1) };
}

function spendEnergy(n) {
  if (G.energy < n) { UI.toast('太累了，回家睡一觉吧'); return false; }
  G.energy -= n;
  UI.hudDirty = true;
  return true;
}

function act() {
  if (G.paused || G.actCd > 0) return;
  G.actCd = 0.22;
  const f = facingTile();
  const i = idx(f.x, f.y);

  /* 钓鱼中 */
  if (G.fish.state === 'bite') { catchFish(); return; }
  if (G.fish.state === 'wait' || G.fish.state === 'cast') { cancelFish(); return; }

  /* 收成优先 */
  const c = MAP.crop[i];
  if (c && c.g >= CROPS[c.id].days) { harvest(f.x, f.y); return; }

  const tool = TOOLS[G.tool].id;

  if (tool === 'hoe') {
    if (c) { UI.toast('这里已经种东西了'); return; }
    if (tillable(f.x, f.y)) {
      if (!spendEnergy(2)) return;
      MAP.soil[i] = 1;
      sfx('hoe', 0.3);
      puff(f.x * 16 + 8, f.y * 16 + 12, '#8a5f3a', 5);
      return;
    }
    if (MAP.soil[i] >= 1) {
      const seed = seasonSeedId();
      if (!seed) { UI.toast('没有当季种子，去杂货店买吧'); return; }
      if (!spendEnergy(1)) return;
      takeItem(seed + '_seed', 1);
      MAP.crop[i] = { id: seed, g: 0, watered: MAP.soil[i] === 2 };
      sfx('hoe', 0.22);
      puff(f.x * 16 + 8, f.y * 16 + 12, '#5aa84a', 4);
      UI.toast('种下了 ' + CROPS[seed].n, true);
      return;
    }
    UI.toast('这里不能翻地，去农场吧');
    return;
  }

  if (tool === 'can') {
    if (MAP.soil[i] >= 1) {
      if (MAP.soil[i] === 2) { UI.toast('已经浇过水了'); return; }
      if (!spendEnergy(1)) return;
      MAP.soil[i] = 2;
      if (MAP.crop[i]) MAP.crop[i].watered = true;
      sfx('splash', 0.16);
      puff(f.x * 16 + 8, f.y * 16 + 12, '#7fc8e8', 5);
      return;
    }
    const g = MAP.ground[i];
    if (g === G_WATER) { UI.toast('水壶灌满了'); sfx('splash', 0.2); return; }
    UI.toast('这里没有地可以浇');
    return;
  }

  if (tool === 'axe') {
    const o = MAP.obj[i];
    if (o === O_TREE || o === O_PINE) {
      if (!spendEnergy(3)) return;
      MAP.rockHp[i] = (MAP.rockHp[i] || 3) - 1;
      sfx('hoe', 0.35);
      puff(f.x * 16 + 8, f.y * 16 + 6, '#8a6238', 5);
      if (MAP.rockHp[i] <= 0) {
        MAP.obj[i] = O_NONE; MAP.rockHp[i] = 0;
        const n = 2 + Math.floor(Math.random() * 2);
        addItem('wood', n);
        floatText(f.x * 16 + 8, f.y * 16, '+' + n + ' 木材', '#e8c88a');
        sfx('harvest', 0.3);
      } else {
        UI.toast('再砍一刀');
      }
      return;
    }
    UI.toast('这里没有树');
    return;
  }

  if (tool === 'pick') {
    const o = MAP.obj[i];
    if (o === O_ROCK) {
      if (!spendEnergy(2)) return;
      MAP.rockHp[i] = (MAP.rockHp[i] || 2) - 1;
      sfx('hoe', 0.4);
      puff(f.x * 16 + 8, f.y * 16 + 6, '#b0b0b0', 6);
      if (MAP.rockHp[i] <= 0) {
        MAP.obj[i] = O_NONE; MAP.rockHp[i] = 0;
        if (Math.random() < 0.28) { addItem('copper', 1); floatText(f.x * 16 + 8, f.y * 16, '+1 铜矿', '#e8a86a'); }
        else { const n = 1 + Math.floor(Math.random() * 2); addItem('stone', n); floatText(f.x * 16 + 8, f.y * 16, '+' + n + ' 石头', '#d0d0d0'); }
        sfx('harvest', 0.3);
      }
      return;
    }
    UI.toast('这里没有石头');
    return;
  }

  if (tool === 'rod') {
    const g = MAP.ground[i];
    if (g !== G_WATER) { UI.toast('站在池塘边才能钓'); return; }
    if (!spendEnergy(3)) return;
    G.fish = { state: 'cast', t: 0, tx: f.x, ty: f.y, dur: 0.5 };
    sfx('splash', 0.18);
    return;
  }
}

function harvest(x, y) {
  const i = idx(x, y);
  const c = MAP.crop[i];
  if (!c) return;
  const def = CROPS[c.id];
  addItem(c.id, 1);
  G.statsHarvest = (G.statsHarvest || 0) + 1;
  floatText(x * 16 + 8, y * 16, '+1 ' + def.n, '#ffe9a8');
  sfx('harvest', 0.32);
  if (def.regrow) { c.g = Math.max(0, def.days - def.regrow); MAP.soil[i] = 1; }
  else { MAP.crop[i] = null; MAP.soil[i] = 1; }
}

function catchFish() {
  G.fish.state = 'idle'; G.fish.tx = null;
  const r = Math.random();
  const id = r < 0.55 ? 'fish' : r < 0.88 ? 'carp' : 'koi';
  addItem(id, 1);
  floatText(G.player.x, G.player.y - 12, '钓到 ' + ITEMS[id].n + '！', '#bfe8ff');
  sfx('coin', 0.35);
  UI.toast('钓到一条' + ITEMS[id].n, true);
  G.statsCaught = (G.statsCaught || 0) + 1;
}
function cancelFish() { G.fish.state = 'idle'; G.fish.tx = null; }

function interact() {
  if (G.paused && !UI.dialogOpen) return;
  if (UI.dialogOpen) { UI.closeDialog(); return; }
  const n = nearestNpc(30);
  if (n) { UI.openDialog(n); return; }
  /* 门 */
  for (const b of MAP.buildings) {
    if (!b.door) continue;
    const dx = b.door[0] * 16 + 8 - G.player.x, dy = b.door[1] * 16 + 14 - G.player.y;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 26) {
      if (b.id === 'house') { UI.openSleep(); return; }
      if (b.id === 'shop') { UI.openShop(); return; }
    }
  }
  const f = facingTile();
  const o = MAP.obj[idx(f.x, f.y)];
  if (o === O_SIGN) { UI.toast('「星光谷」—— 欢迎来到这里'); return; }
  if (o === O_CRATE) { UI.toast('一个旧木箱，空的'); return; }
  UI.toast('这里没什么可做的');
}

/* ---------------- 粒子 ---------------- */
function puff(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    G.parts.push({
      x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 24, vy: -12 - Math.random() * 18,
      life: 0.45, max: 0.45, col: col, size: Math.random() < 0.5 ? 1 : 2
    });
  }
}
function floatText(x, y, text, col) {
  G.parts.push({ x: x, y: y - 4, vx: 0, vy: -14, life: 1.1, max: 1.1, col: col, text: text });
}

/* ---------------- 时间 / 一天结束 ---------------- */
function advanceDay() {
  const wasSeason = G.season;
  G.day++;
  if (G.day > DAYS_PER_SEASON) { G.day = 1; G.season = (G.season + 1) % 4; }

  /* 作物生长 */
  for (let i = 0; i < MAP.ground.length; i++) {
    const c = MAP.crop[i];
    if (c) {
      const fresh = c.watered || G.weather === 'rain';
      if (fresh && c.g < CROPS[c.id].days) c.g++;
      c.watered = false;
    }
    if (MAP.soil[i] === 2) MAP.soil[i] = 1;
  }

  /* 换季：不适应当季的全部枯死 */
  if (G.season !== wasSeason) {
    let dead = 0;
    for (let i = 0; i < MAP.crop.length; i++) {
      const c = MAP.crop[i];
      if (c && CROPS[c.id].season !== G.season) { MAP.crop[i] = null; MAP.soil[i] = 0; dead++; }
    }
    UI.toast('季节变了：' + SEASONS[G.season] + (dead ? `（${dead} 株作物枯了）` : ''), true);
    buildGround();
  }

  /* 天气 */
  G.weather = Math.random() < 0.24 ? 'rain' : 'sun';
  if (G.weather === 'rain') {
    for (let i = 0; i < MAP.soil.length; i++) if (MAP.soil[i] === 1) MAP.soil[i] = 2;
    for (const c of MAP.crop) if (c) c.watered = true;
  }

  /* 石头重生 */
  const r = rng(G.day * 977 + G.season * 31 + 5);
  for (let k = 0; k < 10; k++) {
    const x = 30 + Math.floor(r() * 14), y = 4 + Math.floor(r() * 9);
    if (groundAt(x, y) !== G_STONE) continue;
    if (objAt(x, y) !== O_NONE || buildingAt(x, y) || x === 32 || x === 33) continue;
    if (r() < 0.35) { setObj(x, y, O_ROCK); MAP.rockHp[idx(x, y)] = 2; }
  }

  G.minutes = 6 * 60;
  G.energy = G.maxEnergy;
  G.player.x = 9 * 16 + 8; G.player.y = 8 * 16 + 12;
  G.player.dir = 'down';
  cancelFish();
  G.talked = {}; G.gifted = {};
  UI.hudDirty = true;
  UI.bagDirty = true;
  saveGame();
  UI.toast(SEASONS[G.season] + ' ' + G.day + '日 · ' + (G.weather === 'rain' ? '下雨' : '晴天'), true);
}

/* ---------------- 存档 ---------------- */
const SAVE_KEY = 'starlight_valley_v1';
function saveGame() {
  if (!G.started) return;
  try {
    const ground = Array.from(MAP.ground).join('');
    const obj = Array.from(MAP.obj).join('');
    const soil = Array.from(MAP.soil).join('');
    const rockHp = MAP.rockHp.join(',');
    const crops = [];
    MAP.crop.forEach((c, i) => { if (c) crops.push([i, c.id, c.g]); });
    const data = {
      v: 1, season: G.season, day: G.day, minutes: G.minutes, gold: G.gold,
      energy: G.energy, weather: G.weather, bag: G.bag, hearts: G.hearts,
      px: G.player.x, py: G.player.y, tool: G.tool,
      ground, obj, soil, rockHp, crops
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { console.warn('save failed', e); }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    G.season = d.season; G.day = d.day; G.minutes = d.minutes; G.gold = d.gold;
    G.energy = d.energy; G.weather = d.weather || 'sun'; G.bag = d.bag || {};
    G.hearts = d.hearts || {}; G.tool = d.tool || 0;
    if (d.ground) MAP.ground = Uint8Array.from(d.ground.split('').map(Number));
    if (d.obj) MAP.obj = Uint8Array.from(d.obj.split('').map(Number));
    if (d.soil) MAP.soil = Uint8Array.from(d.soil.split('').map(Number));
    if (d.rockHp) MAP.rockHp = d.rockHp.split(',').map(Number);
    MAP.crop.fill(null);
    (d.crops || []).forEach(([i, id, g]) => { MAP.crop[i] = { id: id, g: g, watered: false }; });
    G.player.x = d.px; G.player.y = d.py;
    return true;
  } catch (e) { console.warn('load failed', e); return false; }
}

/* ---------------- 主循环 ---------------- */
let lastT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0);
  lastT = now;
  G.frame++;

  if (G.started && !G.paused) update(dt, now);
  if (G.started) Render.draw(now);
  UI.tick(now, dt);
}

function update(dt, now) {
  G.actCd = Math.max(0, G.actCd - dt);

  /* 时间流逝 */
  G.minutes += dt * (1 / 0.55);
  if (G.minutes >= 24 * 60) { G.minutes = 24 * 60 - 1; UI.forceSleep(); }
  if (Math.floor(G.minutes) % 10 === 0) UI.hudDirty = true;

  /* 音乐切换 */
  swapMusic();

  /* 玩家移动 */
  const inp = moveInput();
  G.player.moving = false;
  if (inp.dx || inp.dy) {
    if (G.fish.state !== 'idle') cancelFish();
    if (inp.dy < 0) G.player.dir = 'up';
    else if (inp.dy > 0) G.player.dir = 'down';
    else if (inp.dx < 0) G.player.dir = 'left';
    else if (inp.dx > 0) G.player.dir = 'right';
    const moved = moveEntity(G.player, inp.dx, inp.dy, dt);
    G.player.moving = moved;
    if (moved) {
      G.stepT += dt;
      if (G.stepT > 0.34) { G.stepT = 0; puff(G.player.x, G.player.y, 'rgba(220,220,200,.35)', 1); }
    }
  }

  /* NPC 闲逛 */
  for (const n of G.npcs) {
    n.talkT = Math.max(0, n.talkT - dt);
    n.wanderT -= dt;
    if (n.wanderT <= 0 && !UI.dialogWith) {
      n.wanderT = 1.6 + Math.random() * 3.4;
      n.dirT = 0.5 + Math.random() * 1.2;
      const dirs = ['down', 'left', 'right', 'up'];
      n.dir = dirs[Math.floor(Math.random() * 4)];
      n.moving = Math.random() < 0.75;
    }
    if (n.dirT > 0) {
      n.dirT -= dt;
      const a = n.def.area;
      const spd = 16;
      let dx = 0, dy = 0;
      if (n.dir === 'left') dx = -1; else if (n.dir === 'right') dx = 1;
      else if (n.dir === 'up') dy = -1; else dy = 1;
      const nx = n.x + dx * spd * dt, ny = n.y + dy * spd * dt;
      const okX = nx > a[0] * 16 && nx < a[1] * 16;
      const okY = ny > a[2] * 16 && ny < a[3] * 16;
      let mv = false;
      if (okX && canStand(nx, n.y)) { n.x = nx; mv = true; }
      if (okY && canStand(n.x, ny)) { n.y = ny; mv = true; }
      n.moving = mv;
    } else n.moving = false;
  }

  /* 钓鱼计时 */
  if (G.fish.state === 'cast') {
    G.fish.t += dt;
    if (G.fish.t > G.fish.dur) { G.fish.state = 'wait'; G.fish.t = 0; G.fish.dur = 1.2 + Math.random() * 2.6; }
  } else if (G.fish.state === 'wait') {
    G.fish.t += dt;
    if (G.fish.t > G.fish.dur) { G.fish.state = 'bite'; G.fish.t = 0; G.fish.dur = 1.0; sfx('splash', 0.3); }
  } else if (G.fish.state === 'bite') {
    G.fish.t += dt;
    if (G.fish.t > G.fish.dur) { cancelFish(); UI.toast('鱼跑了……'); }
  }

  /* 粒子 */
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.text ? 0 : 26 * dt);
    p.life -= dt;
    if (p.life <= 0) G.parts.splice(i, 1);
  }

  /* 目标格 */
  G.hover = facingTile();

  /* 自动存档 */
  G.saveT += dt;
  if (G.saveT > 30) { G.saveT = 0; saveGame(); }
}

/* ---------------- 启动 ---------------- */
function loadImages(cb) {
  const keys = Object.keys(ASSETS);
  let n = 0, bad = [];
  keys.forEach(k => {
    const im = new Image();
    im.onload = () => { if (++n === keys.length) cb(bad); };
    im.onerror = () => { bad.push(k); if (++n === keys.length) cb(bad); };
    im.src = ASSETS[k];
    IMG[k] = im;
  });
}

function boot() {
  loadImages(bad => {
    if (bad.length) console.warn('缺素材:', bad);
    genWorld();
    buildGround();
    loadAudio();
    spawnNpcs();
    Render.init();
    bindInput();
    UI.init();
    G.introOpen = true;
    UI.showIntro(hasSave());
    const ld = document.getElementById('loading');
    if (ld) ld.style.display = 'none';

    const q = new URLSearchParams(location.search);
    if (q.has('dev')) {
      /* 开发用：?dev=1&t=480&gold=999&seeds=1 */
      G.introOpen = false;
      if (q.get('load') === '1' && hasSave()) { loadGame(); buildGround(); spawnNpcs(); }
      else newGame();
      UI.startGame();
      if (q.get('t')) G.minutes = parseInt(q.get('t'));
      if (q.get('gold')) G.gold = parseInt(q.get('gold'));
      if (q.get('seeds') === '1') for (const k in CROPS) if (CROPS[k].season === G.season) addItem(k + '_seed', 9);
      UI.hudDirty = true; UI.bagDirty = true; UI.refreshHearts();
    }
    requestAnimationFrame(loop);
  });
}

function newGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  genWorld();
  buildGround();
  spawnNpcs();
  G.season = 0; G.day = 1; G.gold = 150; G.energy = G.maxEnergy; G.minutes = 6 * 60;
  G.weather = 'sun'; G.bag = {}; G.hearts = {}; G.talked = {}; G.gifted = {};
  G.milestone = 0; G.parts = []; G.rewardPaid = {};
  G.player.x = 9 * 16 + 8; G.player.y = 8 * 16 + 12; G.player.dir = 'down';
  MAP.crop.fill(null); MAP.soil.fill(0);
}

window.addEventListener('DOMContentLoaded', boot);
