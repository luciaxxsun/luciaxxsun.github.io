/* =========================================================
   星光谷 · 渲染
   ========================================================= */

const PROP_RECT = {
  [O_TREE]:  [0, 0, 16, 32],
  [O_PINE]:  [17, 0, 16, 32],
  [O_ROCK]:  [34, 0, 16, 16],
  [O_BUSH]:  [51, 0, 16, 16],
  [O_FLOWER]:[68, 0, 16, 16],
  [O_SIGN]:  [85, 0, 16, 16],
  [O_CRATE]: [102, 0, 16, 16]
};

const CAM = { x: 0, y: 0, scale: 4 };
let SOIL_DRY = null, SOIL_WET = null;

const Render = {
  init() {
    this.canvas = document.getElementById('cv');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    MAP.buildings.forEach(b => { b.sprite = sprBldSprite(b); });
    SOIL_DRY = makeSoil(false);
    SOIL_WET = makeSoil(true);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = Math.floor(this.W * dpr);
    this.canvas.height = Math.floor(this.H * dpr);
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    CAM.scale = clamp(Math.floor(Math.min(this.W / (17 * TS), this.H / (11 * TS))), 2, 6);
  },

  updateCamera() {
    const vw = this.W / CAM.scale, vh = this.H / CAM.scale;
    let tx = G.player.x - vw / 2, ty = G.player.y - vh / 2;
    tx = clamp(tx, 0, Math.max(0, MAP_W * TS - vw));
    ty = clamp(ty, 0, Math.max(0, MAP_H * TS - vh));
    CAM.x = lerp(CAM.x, tx, 0.18);
    CAM.y = lerp(CAM.y, ty, 0.18);
    if (Math.abs(CAM.x - tx) < 0.05) CAM.x = tx;
    if (Math.abs(CAM.y - ty) < 0.05) CAM.y = ty;
  },

  draw(now) {
    const g = this.ctx, s = CAM.scale;
    this.updateCamera();
    const camX = Math.round(CAM.x * s) / s, camY = Math.round(CAM.y * s) / s;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#0b1220';
    g.fillRect(0, 0, this.W, this.H);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    g.setTransform(dpr * s, 0, 0, dpr * s, -camX * dpr * s, -camY * dpr * s);
    g.imageSmoothingEnabled = false;

    /* 地面 */
    g.drawImage(MAP.groundCanvas, 0, 0);

    const x0 = Math.max(0, Math.floor(camX / TS) - 1), y0 = Math.max(0, Math.floor(camY / TS) - 1);
    const x1 = Math.min(MAP_W - 1, Math.ceil((camX + this.W / s) / TS) + 1);
    const y1 = Math.min(MAP_H - 1, Math.ceil((camY + this.H / s) / TS) + 1);

    /* 耕地 */
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = idx(x, y);
      if (!MAP.soil[i]) continue;
      g.drawImage(MAP.soil[i] === 2 ? SOIL_WET : SOIL_DRY, x * TS, y * TS);
    }

    /* 水面闪光 */
    const t = now / 1000;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (MAP.ground[idx(x, y)] !== G_WATER) continue;
      const h = hash2(x * 7 + Math.floor(t * 1.6), y * 13);
      if (h > 0.93) {
        g.fillStyle = 'rgba(220,245,255,.55)';
        g.fillRect(x * TS + 3 + Math.floor(h * 8), y * TS + 4 + Math.floor(h * 7), 3, 1);
      }
    }

    /* 作物 */
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = MAP.crop[idx(x, y)];
      if (c) drawCrop(g, x, y, c, now);
    }

    /* 按 y 排序绘制 */
    const list = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const o = MAP.obj[idx(x, y)];
      if (o !== O_NONE) list.push({ y: y * TS + TS, x: x * TS, type: 'obj', o: o, tx: x, ty: y });
    }
    for (const b of MAP.buildings) list.push({ y: (b.y + b.h) * TS, by: b.y * TS, x: b.x * TS, type: 'bld', b: b });
    for (const n of G.npcs) list.push({ y: n.y, x: n.x, type: 'npc', n: n });
    list.push({ y: G.player.y, x: G.player.x, type: 'player' });
    list.sort((a, b) => a.y - b.y);

    for (const it of list) {
      if (it.type === 'obj') this.drawObj(g, it.tx, it.ty, it.o, now);
      else if (it.type === 'bld') g.drawImage(it.b.sprite, it.x, it.by);
      else if (it.type === 'npc') this.drawChar(g, it.n.x, it.n.y, it.n.sprite, it.n.dir, it.n.moving, now, it.n.talkT > 0);
      else this.drawChar(g, G.player.x, G.player.y, IMG.hero, G.player.dir, G.player.moving, now, false);
    }

    /* 鱼漂 */
    if (G.fish.state !== 'idle' && G.fish.tx !== null) this.drawFishing(g, now);

    /* 粒子 / 飘字 */
    for (const p of G.parts) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.text) {
        g.globalAlpha = a;
        g.font = '7px "Microsoft YaHei",sans-serif';
        g.fillStyle = p.col;
        g.fillText(p.text, p.x - 4, p.y);
        g.globalAlpha = 1;
      } else {
        g.globalAlpha = a;
        g.fillStyle = p.col;
        g.fillRect(p.x | 0, p.y | 0, p.size || 2, p.size || 2);
        g.globalAlpha = 1;
      }
    }

    /* 目标格高亮 */
    if (G.hover && !G.paused) {
      g.strokeStyle = 'rgba(255,240,190,.55)';
      g.lineWidth = 1;
      g.strokeRect(G.hover.x * TS + 0.5, G.hover.y * TS + 0.5, TS - 1, TS - 1);
    }

    /* 天色 */
    g.setTransform(1, 0, 0, 1, 0, 0);
    this.drawSky(g);
    if (G.weather === 'rain') this.drawRain(g, now);
  },

  drawSky(g) {
    const m = G.minutes;
    let a = 0, col = '10,20,60';
    if (m < 7 * 60 + 30) { a = 0.30; col = '60,70,140'; }
    else if (m < 9 * 60) { a = lerp(0.18, 0, (m - 7.5 * 60) / 90); col = '255,180,120'; }
    else if (m < 16 * 60) { a = 0; }
    else if (m < 18 * 60) { a = lerp(0, 0.14, (m - 16 * 60) / 120); col = '255,150,80'; }
    else if (m < 20 * 60) { a = lerp(0.14, 0.38, (m - 18 * 60) / 120); col = '20,30,80'; }
    else { a = 0.46; col = '8,16,55'; }
    if (G.weather === 'rain') { a = Math.max(a, 0.16); col = '40,50,80'; }
    /* 季节色调 */
    const st = [0, 0.05, 0.10, 0.16][G.season];
    if (st > 0 && a < st) { a = st; col = ['0,0,0', '255,200,80', '255,130,40', '170,205,255'][G.season]; }
    if (a > 0.004) { g.fillStyle = `rgba(${col},${a})`; g.fillRect(0, 0, this.W, this.H); }
  },

  drawRain(g, now) {
    g.strokeStyle = 'rgba(180,210,255,.45)';
    g.lineWidth = 1;
    g.beginPath();
    const n = 90;
    for (let i = 0; i < n; i++) {
      const seed = hash2(i, 7);
      const x = ((seed * this.W + now * 0.08 * (1 + seed)) % this.W);
      const y = ((seed * 1.7 * this.H + now * 0.55) % (this.H + 40)) - 20;
      g.moveTo(x, y); g.lineTo(x - 2, y + 9);
    }
    g.stroke();
  },

  drawObj(g, x, y, o, now) {
    const r = PROP_RECT[o];
    if (!r) return;
    const px = x * TS, py = y * TS + TS - r[3];
    if (o !== O_FLOWER) {
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.beginPath();
      g.ellipse(x * TS + 8, y * TS + 14, 6, 2.5, 0, 0, 6.284);
      g.fill();
    }
    g.drawImage(IMG.props, r[0], r[1], r[2], r[3], px, py, r[2], r[3]);
    if (o === O_ROCK) {
      const hp = MAP.rockHp[idx(x, y)];
      if (hp === 1) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(px + 4, py + 6, 1, 5); g.fillRect(px + 8, py + 8, 4, 1); }
    }
    if (o === O_FLOWER) {
      const sw = Math.sin(now / 700 + x) * 0.6;
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.fillRect(px + 7 + sw, py + 5, 1, 1);
    }
  },

  drawChar(g, x, y, img, dir, moving, now, talking) {
    const f = charFrame(dir, moving, now);
    const sx = (f % 6) * 16, sy = Math.floor(f / 6) * 16;
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.beginPath(); g.ellipse(x, y - 1, 5, 2, 0, 0, 6.284); g.fill();
    g.drawImage(img, sx, sy, 16, 16, Math.round(x - 8), Math.round(y - 16), 16, 16);
    if (talking) {
      g.fillStyle = '#fff';
      g.fillRect(Math.round(x - 1), Math.round(y - 22 - Math.abs(Math.sin(now / 220)) * 2), 2, 2);
      g.fillRect(Math.round(x - 4), Math.round(y - 22 - Math.abs(Math.sin(now / 220)) * 2), 1, 1);
      g.fillRect(Math.round(x + 3), Math.round(y - 22 - Math.abs(Math.sin(now / 220)) * 2), 1, 1);
    }
  },

  drawFishing(g, now) {
    const f = G.fish;
    const bx = f.tx * TS + 8, by = f.ty * TS + 8;
    const px = G.player.x, py = G.player.y - 10;
    g.strokeStyle = 'rgba(240,240,220,.75)';
    g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(px, py); g.lineTo(bx, by); g.stroke();
    if (f.state === 'wait') {
      const bob = Math.sin(now / 260) * 0.8;
      g.fillStyle = '#e05a3a'; g.fillRect(bx - 1, by + bob, 3, 3);
      g.fillStyle = '#fff'; g.fillRect(bx, by + 1 + bob, 1, 1);
    } else if (f.state === 'bite') {
      g.fillStyle = '#ffe14d';
      g.font = 'bold 9px "Microsoft YaHei",sans-serif';
      g.fillText('!', bx - 2, by - 4 + Math.sin(now / 90) * 1.5);
    }
  }
};

function makeSoil(wet) {
  const c = CV(16, 16), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(IMG.grass_dirt, 16, 4 * 16, 16, 16, 0, 0, 16, 16); // 泥土满铺
  g.fillStyle = wet ? 'rgba(40,28,18,.55)' : 'rgba(60,38,22,.30)';
  g.fillRect(0, 0, 16, 16);
  for (let y = 3; y < 16; y += 5) {
    g.fillStyle = wet ? 'rgba(20,14,10,.55)' : 'rgba(50,30,16,.55)';
    g.fillRect(1, y, 14, 2);
    g.fillStyle = wet ? 'rgba(90,120,140,.14)' : 'rgba(150,110,70,.30)';
    g.fillRect(1, y - 1, 14, 1);
  }
  if (wet) {
    g.fillStyle = 'rgba(150,200,255,.20)';
    g.fillRect(3, 1, 2, 1); g.fillRect(10, 9, 2, 1); g.fillRect(6, 13, 2, 1);
  }
  return c;
}

function charFrame(dir, moving, now) {
  const base = { down: 0, left: 6, right: 12, up: 18 }[dir] || 0;
  if (moving) return base + 2 + (Math.floor(now / 120) % 4);
  return base + (Math.floor(now / 520) % 2);
}

function drawCrop(g, x, y, c, now) {
  const def = CROPS[c.id];
  if (!def) return;
  const t = c.g / def.days;
  const px = x * TS, py = y * TS;
  if (c.g >= def.days) {
    const icon = iconFor(c.id);
    if (icon) g.drawImage(icon, px, py + 1);
    const s = Math.sin(now / 300 + x + y) * 0.5;
    g.fillStyle = 'rgba(255,255,190,.85)';
    g.fillRect(px + 12 + s, py + 1, 1, 1);
    g.fillRect(px + 14 - s, py + 4, 1, 1);
    return;
  }
  const stage = Math.min(2, Math.floor(t * 3));
  g.fillStyle = '#3f7a2a';
  if (stage === 0) {
    g.fillRect(px + 7, py + 10, 2, 3);
    g.clearRect(0, 0, 0, 0);
  } else if (stage === 1) {
    g.fillRect(px + 7, py + 7, 2, 6);
    g.fillStyle = '#5aa84a';
    g.fillRect(px + 4, py + 7, 3, 2);
    g.fillRect(px + 9, py + 8, 3, 2);
  } else {
    g.fillRect(px + 7, py + 5, 2, 8);
    g.fillStyle = '#5aa84a';
    g.fillRect(px + 3, py + 4, 5, 4);
    g.fillRect(px + 8, py + 3, 6, 5);
    g.fillStyle = '#7ac85a';
    g.fillRect(px + 4, py + 4, 3, 2);
    g.fillRect(px + 9, py + 3, 4, 2);
  }
}
