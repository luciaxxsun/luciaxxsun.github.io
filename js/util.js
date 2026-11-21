/* 基础工具 —— 星光谷 */
function CV(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function R(g, x, y, w, h, col) {
  g.fillStyle = col;
  g.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0));
}
function PX(g, x, y, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); }
function rng(seed) {
  var s = (seed >>> 0) || 1;
  return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967295; };
}
function hash2(x, y) {
  var h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function pickR(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }
