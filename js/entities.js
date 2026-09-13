/* 彩虹拉力队 - 程序化绘制（Canvas 2D，零素材）
 * 美术基调：糖果废土 —— 暖灰奶油的褪色世界 + 糖果色点缀，全圆角、粗描边、大眼睛。
 */
window.RR = window.RR || {};

(function () {
  const D = RR.DATA, ROAD = D.ROAD;
  const INK = '#5B4A3F';        // 统一深暖棕描边
  const RAINBOW = ['#FF7B7B', '#FFA94D', '#FFE066', '#7FD8A4', '#7EC8E3', '#9B8CE3', '#F2A6D8'];

  // ---- 通用路径工具 ----
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.closePath(); }
  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.closePath(); }

  // 确定性伪随机（用于沙点等静态纹理）
  function hash(n) { n = (n * 2654435761) % 4294967296; return n / 4294967296; }

  // ---- 天空与远景 ----
  function drawSky(c, cam, t) {
    const g = c.createLinearGradient(0, 0, 0, ROAD.top);
    g.addColorStop(0, '#FFF3D6'); g.addColorStop(1, '#FFE0B0');
    c.fillStyle = g; c.fillRect(0, 0, D.VIEW.W, ROAD.top + 8);
    // 太阳
    c.fillStyle = 'rgba(255,224,138,0.35)'; circle(c, 1120, 110, 74); c.fill();
    c.fillStyle = '#FFE08A'; circle(c, 1120, 110, 46); c.fill();
    c.strokeStyle = INK; c.lineWidth = 3; circle(c, 1120, 110, 46); c.stroke();
    // 云
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 3; i++) {
      const span = D.VIEW.W + 500;
      const cx = ((i * 730 - cam * 0.08) % span + span) % span - 250;
      const cy = 90 + (i % 2) * 70 + Math.sin(t * 0.4 + i) * 6;
      puffCloud(c, cx, cy, 1 + (i % 2) * 0.3);
    }
  }
  function puffCloud(c, x, y, s) {
    c.beginPath();
    c.arc(x, y, 26 * s, 0, 7); c.arc(x + 30 * s, y - 12 * s, 20 * s, 0, 7);
    c.arc(x + 58 * s, y, 24 * s, 0, 7); c.rect(x - 20 * s, y, 100 * s, 22 * s);
    c.fill();
  }

  function hills(c, cam, par, base, amp, wl, color) {
    const off = cam * par;
    c.fillStyle = color;
    c.beginPath(); c.moveTo(0, D.VIEW.H);
    for (let sx = 0; sx <= D.VIEW.W + 16; sx += 16) {
      const wx = sx + off;
      const y = base - (Math.sin(wx / wl) * 0.6 + Math.sin(wx / (wl * 0.37) + 2) * 0.4) * amp;
      c.lineTo(sx, y);
    }
    c.lineTo(D.VIEW.W, D.VIEW.H); c.closePath(); c.fill();
  }

  // 中景：可爱废墟剪影（摩天轮 / 齿轮风车 / 弹簧塔）
  function drawMid(c, cam, t) {
    hills(c, cam, 0.15, ROAD.top - 4, 60, 340, '#E9D6CB');
    const par = 0.35, iv = 2600, off = cam * par;
    const i0 = Math.floor((off - 400) / iv);
    const baseY = ROAD.top + 12;
    c.save();
    for (let k = 0; k < 4; k++) {
      const i = i0 + k;
      const sx = i * iv - off + 400;
      const kind = ((i % 3) + 3) % 3;
      c.fillStyle = '#D2BAC0'; c.strokeStyle = '#C0A5AF'; c.lineWidth = 4;
      if (kind === 0) ferrisWheel(c, sx, baseY, t);
      else if (kind === 1) windmill(c, sx, baseY, t);
      else springTower(c, sx, baseY);
    }
    c.restore();
    hills(c, cam, 0.24, ROAD.top + 6, 44, 260, '#DFC8C6');
  }
  function ferrisWheel(c, x, baseY, t) {
    const r = 88, cy = baseY - r - 40;
    c.lineWidth = 5; c.strokeStyle = '#C0A5AF';
    c.beginPath(); c.moveTo(x - 46, baseY); c.lineTo(x, cy); c.lineTo(x + 46, baseY); c.stroke();
    c.fillStyle = '#D2BAC0';
    circle(c, x, cy, r); c.lineWidth = 7; c.strokeStyle = '#C9AFB7'; c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = t * 0.15 + i * Math.PI / 4;
      c.beginPath(); c.moveTo(x, cy); c.lineTo(x + Math.cos(a) * r, cy + Math.sin(a) * r); c.lineWidth = 3.5; c.stroke();
      circle(c, x + Math.cos(a) * (r + 12), cy + Math.sin(a) * (r + 12), 10); c.fillStyle = '#D2BAC0'; c.fill();
    }
  }
  function windmill(c, x, baseY, t) {
    c.fillStyle = '#D2BAC0';
    c.beginPath(); c.moveTo(x - 30, baseY); c.lineTo(x - 14, baseY - 130); c.lineTo(x + 14, baseY - 130); c.lineTo(x + 30, baseY); c.closePath(); c.fill();
    const hy = baseY - 138;
    circle(c, x, hy, 12); c.fill();
    c.strokeStyle = '#C0A5AF'; c.lineWidth = 7; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = t * 0.5 + i * (Math.PI * 2 / 3);
      c.beginPath(); c.moveTo(x, hy); c.lineTo(x + Math.cos(a) * 62, hy + Math.sin(a) * 62); c.stroke();
    }
    c.lineCap = 'butt';
  }
  function springTower(c, x, baseY) {
    c.fillStyle = '#D2BAC0';
    c.fillRect(x - 7, baseY - 120, 14, 120);
    for (let i = 0; i < 4; i++) {
      c.fillRect(x - 14, baseY - 116 + i * 30, 28, 6);
    }
    circle(c, x, baseY - 140, 22); c.fill();
  }

  // 近景装饰（路后方）：仙人掌 / 枯树 / 石堆
  function drawNear(c, cam) {
    const par = 0.72, iv = 880, off = cam * par;
    const i0 = Math.floor((off - 200) / iv);
    for (let k = 0; k < 4; k++) {
      const i = i0 + k;
      const sx = i * iv - off + hash(i * 7 + 1) * 400;
      const kind = ((i % 3) + 3) % 3;
      const y = ROAD.top + 4 + hash(i * 13 + 5) * 10;
      if (kind === 0) miniCactus(c, sx, y, 0.9 + hash(i * 3) * 0.5);
      else if (kind === 1) deadTree(c, sx, y, 0.9 + hash(i * 5) * 0.4);
      else rockPile(c, sx, y, 0.8 + hash(i * 11) * 0.5);
    }
  }
  function miniCactus(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#8FCF9F'; c.strokeStyle = INK; c.lineWidth = 3;
    rr(c, -11, -86, 22, 90, 11); c.fill(); c.stroke();
    rr(c, -34, -62, 20, 12, 6); c.fill(); rr(c, -34, -62, 12, 34, 6); c.fill(); c.stroke();
    rr(c, 14, -74, 20, 12, 6); c.fill(); rr(c, 22, -74, 12, 30, 6); c.fill(); c.stroke();
    c.fillStyle = '#F2A6D8'; circle(c, 0, -88, 7); c.fill(); c.stroke();
    c.restore();
  }
  function deadTree(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#C8A47E'; c.strokeStyle = INK; c.lineWidth = 3;
    rr(c, -7, -80, 14, 84, 6); c.fill(); c.stroke();
    rr(c, -34, -66, 30, 10, 5); c.fill(); c.stroke();
    rr(c, 6, -80, 30, 10, 5); c.fill(); c.stroke();
    c.restore();
  }
  function rockPile(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#CBBFB2'; c.strokeStyle = INK; c.lineWidth = 3;
    ell(c, -18, -14, 22, 16); c.fill(); c.stroke();
    ell(c, 12, -10, 16, 12); c.fill(); c.stroke();
    ell(c, -2, -30, 14, 11); c.fill(); c.stroke();
    c.restore();
  }

  // ---- 路面 ----
  function drawRoad(c, cam) {
    const top = ROAD.top, bh = ROAD.bottom - ROAD.top;
    // 路带
    c.fillStyle = '#E3CDAA'; c.fillRect(0, top, D.VIEW.W, bh);
    // 路带上下亮/暗边
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, top, D.VIEW.W, 5);
    c.fillStyle = 'rgba(120,90,60,0.12)'; c.fillRect(0, ROAD.bottom - 6, D.VIEW.W, 6);
    // 路肩红白条
    for (let k = 0; k * 64 < D.VIEW.W + 64; k++) {
      const sx = k * 64 - (cam % 64);
      c.fillStyle = (k + Math.floor(cam / 64)) % 2 ? '#FF8A8A' : '#FFF6E8';
      c.fillRect(sx, top - 14, 64, 14);
      c.fillRect(sx, ROAD.bottom, 64, 14);
    }
    // 车道虚线
    c.fillStyle = 'rgba(255,246,232,0.85)';
    for (const ly of [top + bh / 3, top + bh * 2 / 3]) {
      for (let k = -1; k * 96 < D.VIEW.W + 96; k++) {
        c.fillRect(k * 96 - (cam % 96), ly - 3, 48, 6);
      }
    }
    // 沙点纹理（确定性）
    c.fillStyle = 'rgba(150,115,80,0.16)';
    const i0 = Math.floor(cam / 40);
    for (let k = 0; k < 46; k++) {
      const seed = i0 + k;
      const sx = seed * 40 - cam + hash(seed) * 40;
      const sy = top + 14 + hash(seed * 3 + 7) * (bh - 28);
      c.fillRect(sx, sy, 5, 4);
    }
    // 前景快速掠过层（速度感）
    const par = 1.18, iv = 640, off = cam * par;
    const j0 = Math.floor((off - 200) / iv);
    for (let k = 0; k < 4; k++) {
      const i = j0 + k;
      const sx = i * iv - off + hash(i * 17 + 3) * 300;
      if (((i % 2) + 2) % 2 === 0) bushSil(c, sx, ROAD.bottom + 16, 1 + hash(i * 23) * 0.6);
      else stoneSil(c, sx, D.VIEW.H - 6, 1 + hash(i * 29) * 0.5);
    }
  }
  function bushSil(c, x, y, s) {
    c.fillStyle = '#CBB89A';
    circle(c, x, y, 26 * s); c.fill();
    circle(c, x - 20 * s, y + 4, 18 * s); c.fill();
    circle(c, x + 20 * s, y + 4, 18 * s); c.fill();
    c.fillRect(x - 36 * s, y, 72 * s, 40 * s);
  }
  function stoneSil(c, x, y, s) {
    c.fillStyle = '#C4B096';
    ell(c, x, y + 8, 30 * s, 18 * s); c.fill();
  }

  // ---- 障碍 ----
  function drawOb(c, e, cam, t) {
    const sx = e.x - cam;
    if (sx < -300 || sx > D.VIEW.W + 300) return;
    c.save();
    c.translate(sx, e.y);
    switch (e.t) {
      case 'cone': drawCone(c); break;
      case 'tires': drawTires(c); break;
      case 'crate': drawCrate(c); break;
      case 'pole': drawPole(c, e); break;
      case 'rock': drawRock(c, e); break;
      case 'cactus': drawBigCactus(c); break;
      case 'hedgehog': drawHedgehog(c, e); break;
      case 'cat': drawCat(c, e); break;
      case 'gate': drawGate(c, e, t); break;
      case 'tower': drawTower(c, e); break;
      case 'fog': drawFogMachine(c, e, t); break;
    }
    c.restore();
  }
  function shadow(c, w) {
    c.fillStyle = 'rgba(90,60,40,0.18)';
    ell(c, 0, 4, w, 8); c.fill();
  }
  function drawCone(c) {
    shadow(c, 30);
    c.fillStyle = '#FF8C42'; c.strokeStyle = INK; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, -58); c.lineTo(20, -8); c.lineTo(-20, -8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#FFF6E8'; c.fillRect(-11, -38, 22, 10);
    rr(c, -26, -10, 52, 10, 5); c.fillStyle = '#FF8C42'; c.fill(); c.stroke();
  }
  function tire(c, x, y, r) {
    c.fillStyle = '#4A4A55'; c.strokeStyle = INK; c.lineWidth = 3;
    circle(c, x, y, r); c.fill(); c.stroke();
    c.fillStyle = '#6A6A78'; circle(c, x, y, r * 0.55); c.fill();
    c.fillStyle = '#E8E0D0'; circle(c, x, y, r * 0.26); c.fill();
  }
  function drawTires(c) {
    shadow(c, 52);
    tire(c, -22, -22, 24); tire(c, 22, -22, 24); tire(c, 0, -52, 24);
    // 顶上那只微微摇
    c.save(); c.translate(0, -52); c.rotate(Math.sin(Date.now() / 300) * 0.08);
    c.restore();
  }
  function drawCrate(c) {
    shadow(c, 30);
    c.fillStyle = '#D9A05B'; c.strokeStyle = INK; c.lineWidth = 3;
    rr(c, -30, -62, 60, 60, 8); c.fill(); c.stroke();
    c.strokeStyle = '#B47F41'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-30, -42); c.lineTo(30, -42); c.moveTo(-30, -22); c.lineTo(30, -22); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 3;
    c.fillStyle = '#F2D8AC'; circle(c, 0, -32, 9); c.fill(); c.stroke();
    circle(c, 0, -32, 3.5);
  }
  function drawPole(c, e) {
    shadow(c, 80);
    c.fillStyle = '#B98B62'; c.strokeStyle = INK; c.lineWidth = 3;
    rr(c, -e.w / 2, -e.h - 8, e.w, 26, 12); c.fill(); c.stroke();
    c.save(); c.translate(-20, -16); c.rotate(0.6);
    rr(c, -8, -64, 16, 64, 7); c.fillStyle = '#A87B55'; c.fill(); c.stroke();
    c.restore();
    c.fillStyle = '#8FCF9F';
    circle(c, -e.w / 2 + 14, -e.h - 14, 7); c.fill(); c.stroke();
    circle(c, e.w / 2 - 14, -e.h - 14, 7); c.fill(); c.stroke();
  }
  function drawRock(c, e) {
    shadow(c, 42);
    c.fillStyle = '#BDB2A4'; c.strokeStyle = INK; c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-44, 0); c.quadraticCurveTo(-46, -46, -16, -62);
    c.quadraticCurveTo(14, -76, 36, -50); c.quadraticCurveTo(48, -28, 42, 0);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.4)';
    ell(c, -14, -50, 12, 7); c.fill();
    // 睡着的石头：闭眼微笑
    c.strokeStyle = INK; c.lineWidth = 2.5;
    c.beginPath(); c.arc(8, -34, 5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.beginPath(); c.moveTo(-2, -36); c.lineTo(4, -36); c.stroke();
  }
  function drawBigCactus(c) {
    shadow(c, 26);
    c.fillStyle = '#7FC492'; c.strokeStyle = INK; c.lineWidth = 3;
    rr(c, -13, -84, 26, 86, 13); c.fill(); c.stroke();
    rr(c, -40, -60, 16, 10, 5); c.fill(); c.stroke();
    rr(c, -40, -60, 10, 34, 5); c.fill(); c.stroke();
    rr(c, 24, -70, 16, 10, 5); c.fill(); c.stroke();
    rr(c, 30, -70, 10, 28, 5); c.fill(); c.stroke();
    c.fillStyle = '#F2A6D8'; circle(c, 0, -88, 8); c.fill(); c.stroke();
    // 眼睛
    c.fillStyle = INK; circle(c, -4, -56, 2.5); c.fill(); circle(c, 6, -56, 2.5); c.fill();
  }
  function drawHedgehog(c, e) {
    shadow(c, 30);
    c.save(); c.rotate(e.spin || 0);
    c.fillStyle = '#A8763E'; c.strokeStyle = INK; c.lineWidth = 3;
    circle(c, 0, -24, 24); c.fill();
    c.fillStyle = '#8A5B2B';
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      const ax = Math.cos(a) * 24, ay = -24 + Math.sin(a) * 24;
      const bx = Math.cos(a + 0.3) * 24, by = -24 + Math.sin(a + 0.3) * 24;
      const tx = Math.cos(a + 0.15) * 34, ty = -24 + Math.sin(a + 0.15) * 34;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(tx, ty); c.lineTo(bx, by); c.closePath(); c.fill();
    }
    c.restore();
    c.strokeStyle = INK; c.lineWidth = 2.5;
    c.beginPath(); c.arc(-6, -26, 4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.beginPath(); c.arc(8, -26, 4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  }
  function drawCat(c, e) {
    shadow(c, 30);
    const grey = !e.healed;
    const body = grey ? '#A9A9B4' : '#FFE8CC';
    const spot = grey ? '#8E8E9A' : '#FFB25A';
    c.strokeStyle = INK; c.lineWidth = 3;
    // 尾巴
    c.strokeStyle = grey ? '#8E8E9A' : '#F09A44'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(24, -12); c.quadraticCurveTo(40, -18, 36, -36); c.stroke();
    c.lineCap = 'butt';
    // 身体
    c.fillStyle = body; c.strokeStyle = INK; c.lineWidth = 3;
    ell(c, 0, -18, 30, 20); c.fill(); c.stroke();
    // 头
    circle(c, -10, -34, 17); c.fill(); c.stroke();
    // 耳朵
    c.beginPath(); c.moveTo(-24, -44); c.lineTo(-21, -58); c.lineTo(-12, -48); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-2, -48); c.lineTo(2, -60); c.lineTo(9, -48); c.closePath(); c.fill(); c.stroke();
    // 花斑
    c.fillStyle = spot; ell(c, 8, -16, 9, 6); c.fill();
    // 表情
    if (grey) {
      c.fillStyle = '#5FC9E8'; circle(c, -16, -36, 4); c.fill(); circle(c, -5, -36, 4); c.fill();
      c.fillStyle = INK; circle(c, -16, -36, 2); c.fill(); circle(c, -5, -36, 2); c.fill();
      // 泪滴
      c.fillStyle = '#7EC8E3';
      ell(c, -19, -28, 2.5, 4); c.fill();
      c.strokeStyle = INK; c.lineWidth = 2;
      c.beginPath(); c.arc(-10, -28, 3, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke();
    } else {
      c.strokeStyle = INK; c.lineWidth = 2.5;
      c.beginPath(); c.arc(-16, -36, 4, 1.1 * Math.PI, 1.9 * Math.PI); c.stroke();
      c.beginPath(); c.arc(-5, -36, 4, 1.1 * Math.PI, 1.9 * Math.PI); c.stroke();
      c.fillStyle = '#FF7B7B';
      const hb = Date.now() / 200;
      drawHeart(c, -14, -58 + Math.sin(hb) * 3, 6);
    }
  }
  function drawHeart(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s / 10, s / 10);
    c.beginPath();
    c.moveTo(0, 3);
    c.bezierCurveTo(-10, -6, -6, -14, 0, -8);
    c.bezierCurveTo(6, -14, 10, -6, 0, 3);
    c.fill();
    c.restore();
  }
  function drawGate(c, e, t) {
    const openY = e._openY != null ? e._openY : e.cy;
    const top = ROAD.top - e.y, bot = ROAD.bottom - e.y;
    c.fillStyle = '#F2E3C8'; c.strokeStyle = INK; c.lineWidth = 3;
    // 上柱与下柱（贴齐路带）
    rr(c, -e.w / 2, top - 12, e.w, openY - top + 12, 10); c.fill(); c.stroke();
    rr(c, -e.w / 2, openY + e.gateH, e.w, bot - openY - e.gateH + 12, 10); c.fill(); c.stroke();
    // 柱身分节
    c.strokeStyle = 'rgba(91,74,63,0.35)'; c.lineWidth = 2;
    for (const gy of [top + 30, top + 70]) {
      if (gy < openY - 10) { c.beginPath(); c.moveTo(-e.w / 2 + 6, gy); c.lineTo(e.w / 2 - 6, gy); c.stroke(); }
    }
    for (const gy of [bot - 30, bot - 70]) {
      if (gy > openY + e.gateH + 10) { c.beginPath(); c.moveTo(-e.w / 2 + 6, gy); c.lineTo(e.w / 2 - 6, gy); c.stroke(); }
    }
    // 齿轮梁
    c.strokeStyle = INK; c.lineWidth = 3;
    c.fillStyle = '#FFC94D';
    circle(c, 0, openY - 14, 15); c.fill(); c.stroke();
    circle(c, 0, openY + e.gateH + 14, 15); c.fill(); c.stroke();
    // 开口警示条
    c.fillStyle = '#FF8A8A';
    for (let k = 0; k < 3; k++) c.fillRect(-e.w / 2 + 6, openY + 10 + k * 18, e.w - 12, 8);
  }
  function drawTower(c, e) {
    shadow(c, 52);
    tire(c, 0, -24, 30); tire(c, -4, -72, 28); tire(c, 3, -116, 26);
    c.strokeStyle = INK; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, -140); c.lineTo(0, -178); c.stroke();
    c.fillStyle = '#FF7B7B';
    c.beginPath(); c.moveTo(0, -178); c.lineTo(30, -168); c.lineTo(0, -158); c.closePath(); c.fill(); c.stroke();
  }
  function drawFogMachine(c, e, t) {
    c.fillStyle = '#9A9AA5'; c.strokeStyle = INK; c.lineWidth = 3;
    rr(c, -26, -50, 52, 42, 10); c.fill(); c.stroke();
    rr(c, -10, -70, 20, 22, 6); c.fill(); c.stroke();
    // 顶部冒泡
    const p = (t * 2) % 1;
    c.fillStyle = 'rgba(170,170,180,0.6)';
    circle(c, 0, -74 - p * 26, 6 + p * 8); c.fill();
    // 眼睛（无辜的小机器）
    c.fillStyle = '#FFF'; circle(c, -8, -30, 5); c.fill(); circle(c, 8, -30, 5); c.fill();
    c.fillStyle = INK; circle(c, -8, -30, 2.2); c.fill(); circle(c, 8, -30, 2.2); c.fill();
  }
  // 雾罩层（画在车之后）
  function drawFogOverlay(c, e, cam, t) {
    const sx = e.x - cam;
    if (sx < -e.len - 200 || sx > D.VIEW.W + 300) return;
    const g = c.createLinearGradient(sx, 0, sx + e.len, 0);
    g.addColorStop(0, 'rgba(176,176,188,0)');
    g.addColorStop(0.25, 'rgba(176,176,188,0.52)');
    g.addColorStop(0.75, 'rgba(176,176,188,0.52)');
    g.addColorStop(1, 'rgba(176,176,188,0)');
    c.fillStyle = g;
    c.fillRect(sx, ROAD.top - 20, e.len, ROAD.bottom - ROAD.top + 40);
  }

  // ---- 收集物 ----
  function drawCoin(c, e, cam, t) {
    const sx = e.x - cam;
    if (sx < -60 || sx > D.VIEW.W + 60) return;
    const sy = e.y - 24 - e.z + Math.sin(t * 3 + e.x * 0.01) * 3;
    const w = Math.abs(Math.cos(t * 3.4 + e.x * 0.013));
    c.save(); c.translate(sx, sy); c.scale(0.35 + w * 0.65, 1);
    c.fillStyle = '#FFC94D'; c.strokeStyle = INK; c.lineWidth = 3;
    circle(c, 0, 0, 15); c.fill(); c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      circle(c, Math.cos(a) * 15, Math.sin(a) * 15, 4.5); c.fill();
    }
    c.fillStyle = '#FFF6E8'; circle(c, 0, 0, 6); c.fill(); c.stroke();
    c.restore();
  }
  function drawCan(c, e, cam, t) {
    const sx = e.x - cam;
    if (sx < -60 || sx > D.VIEW.W + 60) return;
    const sy = e.y - 22 - e.z + Math.sin(t * 2.6 + e.x * 0.02) * 5;
    c.save(); c.translate(sx, sy);
    // 光晕
    c.fillStyle = 'rgba(255,220,120,0.35)'; circle(c, 0, 0, 26); c.fill();
    c.fillStyle = '#FFA94D'; c.strokeStyle = INK; c.lineWidth = 3;
    rr(c, -13, -18, 26, 36, 7); c.fill(); c.stroke();
    c.fillStyle = '#D9DEE8'; c.fillRect(-13, -18, 26, 6); c.strokeRect(-13, -18, 26, 6);
    // 太阳标
    c.fillStyle = '#FFE066'; circle(c, 0, 4, 7); c.fill();
    c.strokeStyle = '#FFE066'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * 9, 4 + Math.sin(a) * 9); c.lineTo(Math.cos(a) * 12, 4 + Math.sin(a) * 12); c.stroke();
    }
    c.restore();
  }
  function drawGear(c, e, cam, t) {
    const sx = e.x - cam;
    if (sx < -80 || sx > D.VIEW.W + 80) return;
    const sy = e.y - 26 - e.z + Math.sin(t * 2.2) * 4;
    c.save(); c.translate(sx, sy); c.rotate(t * 0.9);
    c.fillStyle = 'rgba(255,220,120,0.4)'; circle(c, 0, 0, 36); c.fill();
    c.strokeStyle = INK; c.lineWidth = 3;
    const R = 22;
    for (let i = 0; i < 6; i++) {
      c.fillStyle = RAINBOW[i];
      c.beginPath(); c.moveTo(0, 0);
      c.arc(0, 0, R + 8, i / 6 * Math.PI * 2 - Math.PI / 2, (i + 1) / 6 * Math.PI * 2 - Math.PI / 2);
      c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = '#FFC94D'; circle(c, 0, 0, R); c.fill(); c.stroke();
    c.fillStyle = '#FFF6E8'; circle(c, 0, 0, 8); c.fill(); c.stroke();
    c.restore();
  }
  function drawCpFlag(c, e, cam) {
    const sx = e.x - cam;
    if (sx < -60 || sx > D.VIEW.W + 60) return;
    c.save(); c.translate(sx, ROAD.bottom);
    c.strokeStyle = INK; c.lineWidth = 4;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -110); c.stroke();
    c.fillStyle = e.done ? '#FF7B7B' : '#C4B8AC';
    c.beginPath(); c.moveTo(0, -110); c.lineTo(52, -96); c.lineTo(0, -82); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.8)'; circle(c, 0, -112, 5); c.fill(); c.stroke();
    c.restore();
  }

  // ---- 终点小站 ----
  function drawStation(c, cam, lit, t) {
    const sx = D.FINISH_X - cam + 260;
    if (sx < -500 || sx > D.VIEW.W + 600) return;
    c.save(); c.translate(sx, ROAD.bottom);
    // 彩虹拱（点亮前是灰色）
    const cols = lit ? RAINBOW : ['#C9C2BB', '#CFC8C0', '#C9C2BB', '#CFC8C0', '#C9C2BB', '#CFC8C0', '#C9C2BB'];
    for (let i = 0; i < 7; i++) {
      c.strokeStyle = cols[i]; c.lineWidth = 12;
      c.beginPath(); c.arc(0, -30, 150 - i * 13, Math.PI, Math.PI * 2); c.stroke();
    }
    // 站房
    c.fillStyle = '#FFF3DC'; c.strokeStyle = INK; c.lineWidth = 3.5;
    rr(c, -110, -150, 220, 150, 14); c.fill(); c.stroke();
    // 遮阳棚
    c.fillStyle = '#FF8A8A';
    for (let k = 0; k < 6; k++) {
      if (k % 2) { c.fillStyle = '#FFF6E8'; } else { c.fillStyle = '#FF8A8A'; }
      rr(c, -118 + k * 40, -172, 40, 22, 6); c.fill(); c.stroke();
    }
    // 招牌
    c.fillStyle = '#FFE066'; rr(c, -70, -140, 140, 40, 10); c.fill(); c.stroke();
    c.fillStyle = INK; c.font = 'bold 24px "PingFang SC","Microsoft YaHei",sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('彩虹小站', 0, -119);
    // 窗（点亮后发光）
    if (lit) {
      c.fillStyle = 'rgba(255,224,138,0.6)'; rr(c, -84, -88, 66, 60, 10); c.fill();
    }
    c.fillStyle = lit ? '#FFE066' : '#BFD4DC';
    rr(c, -80, -92, 60, 56, 10); c.fill(); c.stroke();
    rr(c, 20, -92, 60, 56, 10); c.fill(); c.stroke();
    // 大齿轮标志
    c.save(); c.translate(0, -30); c.rotate(t * 0.4);
    c.fillStyle = '#FFC94D';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      circle(c, Math.cos(a) * 26, Math.sin(a) * 26, 7); c.fill();
    }
    c.strokeStyle = INK; circle(c, 0, 0, 26); c.fill(); c.stroke();
    c.fillStyle = '#FFF6E8'; circle(c, 0, 0, 11); c.fill(); c.stroke();
    c.restore();
    // 加油泵
    c.fillStyle = '#7FD8A4'; rr(c, 130, -86, 34, 86, 8); c.fill(); c.stroke();
    c.fillStyle = '#FFF6E8'; rr(c, 136, -74, 22, 26, 5); c.fill(); c.stroke();
    // 气球
    for (let k = 0; k < 2; k++) {
      const bx = -150 - k * 22, by = -190 - k * 18 + Math.sin(t * 1.5 + k * 2) * 5;
      c.strokeStyle = INK; c.lineWidth = 2;
      c.beginPath(); c.moveTo(bx, by + 16); c.lineTo(bx + 8, -120); c.stroke();
      c.fillStyle = RAINBOW[k * 3];
      ell(c, bx, by, 13, 16); c.fill(); c.stroke();
    }
    c.restore();
  }

  // ---- 玩家车（西瓜红 Q 版，原点 = 车底中心）----
  function drawCar(c, car, opts) {
    const t = opts.t;
    c.save();
    c.translate(0, -car.z);
    // 地面阴影
    c.fillStyle = 'rgba(90,60,40,' + (0.22 * Math.max(0.25, 1 - car.z / 300)) + ')';
    ell(c, 0, car.z + 4, 74 - car.z * 0.1, 10 - car.z * 0.012); c.fill();
    const tilt = Math.max(-0.16, Math.min(0.24, -car.vz / 2600));
    c.rotate(tilt);
    if (car.blink) c.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 14));
    // 氮气尾焰
    if (car.boostOn) {
      for (let i = 0; i < 3; i++) {
        const fl = 26 + Math.random() * 22 - i * 8;
        c.fillStyle = ['rgba(255,150,60,0.85)', 'rgba(255,210,90,0.9)', 'rgba(255,250,220,0.95)'][i];
        ell(c, -80 - fl / 2, -38 + (Math.random() - 0.5) * 6, fl, 12 - i * 3); c.fill();
      }
    }
    // 尾旗
    c.strokeStyle = INK; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-64, -62); c.lineTo(-76, -104); c.stroke();
    c.fillStyle = '#FFE066';
    c.beginPath(); c.moveTo(-76, -104); c.lineTo(-52, -97); c.lineTo(-76, -88); c.closePath(); c.fill(); c.stroke();
    // 轮子
    const spin = (opts.dist || 0) * 0.045;
    wheel(c, -46, -26, 25, spin);
    wheel(c, 46, -26, 25, spin);
    // 车身
    c.fillStyle = '#FF6B6B'; c.strokeStyle = INK; c.lineWidth = 3.5;
    rr(c, -74, -66, 148, 48, 16); c.fill(); c.stroke();
    // 保险杠
    c.fillStyle = '#FFE0B0';
    rr(c, -80, -34, 12, 18, 5); c.fill(); c.stroke();
    rr(c, 68, -34, 12, 18, 5); c.fill(); c.stroke();
    // 舱体
    c.fillStyle = '#E85555';
    rr(c, -48, -92, 96, 32, 14); c.fill(); c.stroke();
    // 车窗 + 司机
    c.fillStyle = '#BDE8FF';
    rr(c, -38, -87, 76, 24, 10); c.fill(); c.stroke();
    // 司机（阳阳）
    c.save();
    c.beginPath(); rr(c, -38, -87, 76, 24, 10); c.clip();
    c.fillStyle = '#FFD9B0'; circle(c, -4, -70, 10); c.fill();
    c.fillStyle = '#FF5252'; c.beginPath(); c.arc(-4, -72, 11, Math.PI, Math.PI * 2); c.fill();
    c.fillStyle = '#FFF'; c.fillRect(-15, -76, 22, 5);
    c.fillStyle = INK; circle(c, -8, -68, 1.8); c.fill(); circle(c, 0, -68, 1.8); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1.6;
    c.beginPath(); c.arc(-4, -66, 4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.restore();
    // 车头灯
    c.fillStyle = '#FFE066'; circle(c, 64, -50, 6); c.fill(); c.stroke();
    // 车门线
    c.strokeStyle = 'rgba(91,74,63,0.4)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-6, -66); c.lineTo(-6, -30); c.stroke();
    // 睡觉表情（Zzz 由粒子负责）
    if (opts.sleeping) {
      c.fillStyle = 'rgba(255,246,232,0.85)';
      rr(c, -20, -140, 40, 26, 8); c.fill(); c.stroke();
      c.fillStyle = INK; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('Zzz', 0, -127);
    }
    // 亲子难度护盾泡泡
    if (opts.shield) {
      c.strokeStyle = 'rgba(126,200,227,0.9)'; c.lineWidth = 3;
      circle(c, 0, -50, 96 + Math.sin(t * 3) * 4); c.stroke();
      c.fillStyle = 'rgba(126,200,227,0.12)'; circle(c, 0, -50, 96 + Math.sin(t * 3) * 4); c.fill();
    }
    c.restore();
  }
  function wheel(c, x, y, r, spin) {
    c.save(); c.translate(x, y);
    c.fillStyle = '#3B3B45'; c.strokeStyle = INK; c.lineWidth = 3.5;
    circle(c, 0, 0, r); c.fill(); c.stroke();
    c.fillStyle = '#FFE9C7';
    circle(c, 0, 0, r * 0.52); c.fill(); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) {
      const a = spin + i / 5 * Math.PI * 2;
      c.beginPath(); c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48);
      c.stroke();
    }
    c.restore();
  }

  RR.draw = {
    drawSky, drawMid, drawNear, drawRoad,
    drawOb, drawFogOverlay,
    drawCoin, drawCan, drawGear, drawCpFlag, drawStation,
    drawCar,
  };
})();
