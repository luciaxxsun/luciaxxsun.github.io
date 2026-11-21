/* =========================================================
   星光谷 · 世界（地图生成 / 碰撞 / 地面预渲染）
   ========================================================= */

const TS = 16, MAP_W = 56, MAP_H = 38;
const G_GRASS = 0, G_DIRT = 1, G_WATER = 2, G_STONE = 3;
const O_NONE = 0, O_TREE = 1, O_PINE = 2, O_ROCK = 3, O_BUSH = 4, O_FLOWER = 5, O_SIGN = 6, O_CRATE = 7;

const FARM = { x0: 4, y0: 8, x1: 24, y1: 29 };
const POND = { cx: 37, cy: 26, rx: 6, ry: 4 };

const MAP = {
  ground: new Uint8Array(MAP_W * MAP_H),
  soil: new Uint8Array(MAP_W * MAP_H),     // 0 无 1 已翻 2 已浇水
  crop: new Array(MAP_W * MAP_H).fill(null),
  obj: new Uint8Array(MAP_W * MAP_H),
  rockHp: new Array(MAP_W * MAP_H).fill(0),
  buildings: [],
  groundCanvas: null,
  seed: 20261116
};

function idx(x, y) { return y * MAP_W + x; }
function inMap(x, y) { return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H; }
function groundAt(x, y) { return inMap(x, y) ? MAP.ground[idx(x, y)] : G_GRASS; }
function objAt(x, y) { return inMap(x, y) ? MAP.obj[idx(x, y)] : O_TREE; }

function walkableTile(x, y) {
  if (!inMap(x, y)) return false;
  if (MAP.ground[idx(x, y)] === G_WATER) return false;
  const o = MAP.obj[idx(x, y)];
  if (o === O_TREE || o === O_PINE || o === O_ROCK || o === O_BUSH || o === O_SIGN || o === O_CRATE) return false;
  if (buildingAt(x, y)) return false;
  return true;
}
function buildingAt(x, y) {
  for (const b of MAP.buildings) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b;
  return null;
}
function inFarm(x, y) { return x >= FARM.x0 && x <= FARM.x1 && y >= FARM.y0 && y <= FARM.y1; }
function tillable(x, y) {
  return inMap(x, y) && inFarm(x, y) && MAP.ground[idx(x, y)] === G_GRASS &&
    MAP.obj[idx(x, y)] === O_NONE && MAP.soil[idx(x, y)] === 0 && !buildingAt(x, y);
}
function setGroundRect(x0, y0, x1, y1, g) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inMap(x, y)) MAP.ground[idx(x, y)] = g;
}
function setObj(x, y, o) { if (inMap(x, y)) MAP.obj[idx(x, y)] = o; }

/* ---------------- 地图生成 ---------------- */
function genWorld() {
  const r = rng(MAP.seed);
  MAP.ground.fill(G_GRASS);
  MAP.soil.fill(0);
  MAP.crop.fill(null);
  MAP.obj.fill(O_NONE);
  MAP.rockHp.fill(0);

  /* 野地：池塘 */
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const nx = (x - POND.cx) / POND.rx, ny = (y - POND.cy) / POND.ry;
    if (nx * nx + ny * ny <= 1) MAP.ground[idx(x, y)] = G_WATER;
  }

  /* 石场 */
  setGroundRect(29, 3, 44, 13, G_STONE);

  /* 道路 */
  setGroundRect(3, 17, 51, 18, G_DIRT);   // 主路
  setGroundRect(8, 7, 9, 17, G_DIRT);     // 家门口 → 主路
  setGroundRect(46, 9, 47, 17, G_DIRT);   // 商店 → 主路
  setGroundRect(32, 13, 33, 17, G_DIRT);  // 石场 → 主路
  setGroundRect(37, 18, 38, 22, G_DIRT);  // 主路 → 池塘

  /* 建筑 */
  MAP.buildings = [
    { id: 'house', x: 7, y: 4, w: 4, h: 3, tpl: 'gable', wall: '#efe2c4', roof: '#b8442f', roofH: 0.42, chimney: 1, smoke: 1, door: [8, 7], label: '家' },
    { id: 'shop', x: 45, y: 6, w: 5, h: 3, tpl: 'gable', wall: '#f0e0c0', roof: '#3f7f9a', sign: 1, awning: 1, door: [47, 9], label: '杂货店' },
    { id: 'mill', x: 51, y: 21, w: 2, h: 2, tpl: 'windmill', wall: '#e6d6ae', roof: '#8a5a34' },
    { id: 'well', x: 26, y: 14, w: 1, h: 1, tpl: 'fountain' },
    { id: 'bench', x: 27, y: 20, w: 2, h: 2, tpl: 'open', roof: '#7a9a5a', bench: 1 }
  ];

  /* 边界树林（挡住出界） */
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) {
      setObj(x, y, r() < 0.35 ? O_PINE : O_TREE);
    }
  }

  /* 农场里预留要清理的树和石头 */
  const farmTrees = [[5, 11], [12, 10], [21, 12], [6, 23], [22, 25]];
  const farmRocks = [[16, 15], [19, 20], [14, 24], [10, 27], [20, 8], [7, 16]];
  farmTrees.forEach(([x, y]) => { setObj(x, y, O_TREE); setObj(x, y - 1, O_TREE); });
  farmRocks.forEach(([x, y]) => { setObj(x, y, O_ROCK); MAP.rockHp[idx(x, y)] = 2; });

  /* 石场石头 */
  for (let i = 0; i < 16; i++) {
    const x = 30 + Math.floor(r() * 14), y = 4 + Math.floor(r() * 9);
    if (MAP.ground[idx(x, y)] !== G_STONE) continue;
    if (objAt(x, y) !== O_NONE || buildingAt(x, y)) continue;
    if (x === 32 || x === 33) continue;             // 别堵路
    setObj(x, y, O_ROCK); MAP.rockHp[idx(x, y)] = 2;
  }

  /* 野外的树 / 灌木 / 花 */
  const free = (x, y) => inMap(x, y) && MAP.ground[idx(x, y)] === G_GRASS &&
    MAP.obj[idx(x, y)] === O_NONE && !buildingAt(x, y) &&
    !(x >= 3 && x <= 51 && y >= 16 && y <= 19) &&           // 主路留白
    !(x >= 25 && x <= 30 && y >= 12 && y <= 22) &&          // 井/长椅区
    !(x >= 41 && x <= 49 && y >= 9 && y <= 15) &&           // 商店门口
    !inFarm(x, y);

  let trees = 0, tries = 0;
  while (trees < 34 && tries++ < 900) {
    const x = 3 + Math.floor(r() * (MAP_W - 6)), y = 3 + Math.floor(r() * (MAP_H - 6));
    if (!free(x, y)) continue;
    setObj(x, y, r() < 0.45 ? O_PINE : O_TREE);
    if (r() < 0.4) setObj(x, y - 1, r() < 0.45 ? O_PINE : O_TREE);
    trees++;
  }
  for (let i = 0; i < 16; i++) {
    const x = 3 + Math.floor(r() * (MAP_W - 6)), y = 3 + Math.floor(r() * (MAP_H - 6));
    if (free(x, y)) setObj(x, y, O_BUSH);
  }
  for (let i = 0; i < 46; i++) {
    const x = 3 + Math.floor(r() * (MAP_W - 6)), y = 3 + Math.floor(r() * (MAP_H - 6));
    if (free(x, y)) setObj(x, y, O_FLOWER);
  }
  /* 农场门口的木箱 + 招牌 */
  setObj(6, 20, O_SIGN);
  setObj(11, 19, O_CRATE);

  MAP.buildings.forEach(b => { b.sprite = sprBldSprite(b); });
  MAP.groundCanvas = null;
}

/* ---------------- 地面预渲染 ---------------- */
const WANG = [[0,0,0,0],[0,0,0,1],[0,0,1,0],[0,0,1,1],[0,1,0,0],[0,1,0,1],[0,1,1,0],[0,1,1,1],
              [1,0,0,0],[1,0,0,1],[1,0,1,0],[1,0,1,1],[1,1,0,0],[1,1,0,1],[1,1,1,0],[1,1,1,1]];

function drawTerrainLayer(g, img, terrain, seasonTint) {
  const same = (x, y) => groundAt(x, y) === terrain;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (!same(x, y)) continue;
    const tl = same(x - 1, y) && same(x, y - 1) && same(x - 1, y - 1) ? 1 : 0;
    const tr = same(x + 1, y) && same(x, y - 1) && same(x + 1, y - 1) ? 1 : 0;
    const bl = same(x - 1, y) && same(x, y + 1) && same(x - 1, y + 1) ? 1 : 0;
    const br = same(x + 1, y) && same(x, y + 1) && same(x + 1, y + 1) ? 1 : 0;
    let sx, sy;
    if (tl && tr && bl && br) {
      sx = Math.floor(hash2(x, y) * 4) * TS; sy = 4 * TS;
    } else {
      const n = tl * 8 + tr * 4 + bl * 2 + br;
      sx = (n % 4) * TS; sy = Math.floor(n / 4) * TS;
    }
    g.drawImage(img, sx, sy, TS, TS, x * TS, y * TS, TS, TS);
  }
}

function buildGround() {
  const c = CV(MAP_W * TS, MAP_H * TS);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  /* 1. 全图草地：用"下层=草"的那张图第 5 行做满铺 */
  const grassImg = IMG.grass_dirt;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    g.drawImage(grassImg, Math.floor(hash2(x, y) * 4) * TS, 5 * TS, TS, TS, x * TS, y * TS, TS, TS);
  }
  /* 2. 土路 / 石场 / 水面 */
  drawTerrainLayer(g, IMG.grass_dirt, G_DIRT);
  drawTerrainLayer(g, IMG.stone, G_STONE);
  drawTerrainLayer(g, IMG.water, G_WATER);
  MAP.groundCanvas = c;
}
