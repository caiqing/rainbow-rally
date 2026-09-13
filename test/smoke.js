/* 冒烟测试：在 Node 中驱动 Game 类完整跑通一局
 * 用法：node test/smoke.js
 */
'use strict';
const path = require('path');
const fs = require('fs');

// ---- 浏览器环境 mock ----
global.window = {};
global.RR = {};
function magicCtx() {
  const f = function () { return p; };
  const p = new Proxy(f, {
    get: (t, k) => {
      if (k === Symbol.toPrimitive) return () => 0;
      return p;
    },
    apply: () => p,
    set: () => true,
  });
  return p;
}
global.document = { addEventListener: () => {}, getElementById: () => null };
for (const f of ['data.js', 'audio.js', 'track.js', 'entities.js', 'game.js']) {
  require(path.join(__dirname, '..', 'js', f));
}
const RR = global.RR;

let failed = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failed++;
}

// 简单 AI：躲障碍、抓时机跳跃（AI 代驾的雏形，也用于可达性验证）
function smartInput(g) {
  const D = RR.DATA, CAR = D.CAR;
  const inp = g.input;
  inp.boostHeld = false;
  const carWX = g.camX + CAR.x;
  let dodge = 0, jump = false;
  for (const e of g.ents) {
    if (e.dead || e.kind !== 'ob') continue;
    const dx = e.x - (carWX + CAR.w);
    if (dx < -60 || dx > 640) continue;
    if (e.t === 'fog') continue;
    if (e.t === 'gate') {
      const openY = e._openY != null ? e._openY : e.cy;
      dodge = openY + e.gateH / 2 > g.car.y ? 1 : -1;
      continue;
    }
    const yOverlap = !(g.car.y - CAR.h > e.y - 4 || g.car.y < e.y - e.h + 4);
    if (['cone', 'tires', 'pole', 'hedgehog', 'tower'].includes(e.t)) {
      if (yOverlap && dx < 300 && dx > 40 && g.car.z <= 0) jump = true;
    } else if (e.t === 'cat') {
      if (yOverlap && dx < 300 && dx > 60 && g.car.z <= 0) jump = true; // 顺便治愈
    } else if (e.t === 'crate') {
      // 直接撞碎，不需要操作
    } else if (yOverlap) {
      dodge = g.car.y > e.y - e.h / 2 ? -1 : 1; // rock/cactus 绕行
    }
  }
  inp.jumpQueued = jump && g.car.z <= 0;
  inp.jumpHeld = jump;
  inp.up = dodge < 0;
  inp.down = dodge > 0;
  inp.touchY = null;
}

// ---- 用例 1：标准难度乱玩一局，验证撞击/睡觉/复活链路 ----
{
  const g = new RR.Game();
  g.start('normal', () => {}, 42);
  let sawSleep = false, hits = 0, lastHearts = RR.DATA.HEARTS;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 100; i++) {
    g.input.jumpQueued = Math.random() < 0.06;
    g.input.jumpHeld = Math.random() < 0.1;
    g.input.up = Math.random() < 0.3;
    g.input.down = Math.random() < 0.3;
    g.input.boostHeld = Math.random() < 0.2;
    g.update(dt);
    if (g.hearts < lastHearts) { hits++; lastHearts = g.hearts; }
    if (g.state === 'sleep') sawSleep = true;
  }
  check('发生过撞击', hits > 0);
  check('心心用完后进入过睡觉状态', sawSleep);
  check('睡觉后恢复 play 状态', g.state === 'play');
}

// ---- 用例 1b：简单 AI 驾驶，验证关卡可在合理时间内通关 ----
{
  const g = new RR.Game();
  let ended = null;
  g.start('normal', (s) => { ended = s; }, 42);
  const dt = 1 / 60;
  let sleeps = 0, wasSleeping = false;
  for (let i = 0; i < 60 * 260 && !ended; i++) {
    smartInput(g);
    const wasSleep = g.state === 'sleep';
    g.update(dt);
    if (g.state === 'sleep' && !wasSleeping) sleeps++;
    wasSleeping = g.state === 'sleep';
  }
  check('AI 玩家最终到达终点并结算（睡觉 ' + sleeps + ' 次）', !!ended);
  if (ended) {
    check('结算含合法星级', ['S', 'A', 'B'].includes(ended.star));
    check('结算齿轮币非负', ended.coins >= 0 && ended.coins <= ended.totalCoins);
    check('结算奖励为正数', ended.earned > 0);
    console.log('      结算样例:', JSON.stringify(ended));
  }
}

// ---- 用例 2：亲子难度护盾常开，撞击不掉心 ----
{
  const g = new RR.Game();
  g.start('family', () => {}, 42);
  let minHearts = RR.DATA.HEARTS;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 60; i++) {
    g.input.up = Math.random() < 0.5;
    g.input.down = Math.random() < 0.5;
    g.update(dt);
    minHearts = Math.min(minHearts, g.hearts);
    if (g.state === 'finish') break;
  }
  check('亲子难度撞击不掉心（护盾常开）', minHearts === RR.DATA.HEARTS);
}

// ---- 用例 3：赛道生成器——多难度多种子全类型覆盖 ----
{
  const types = new Set();
  for (const diff of ['family', 'normal', 'expert']) {
    for (const seed of [1, 42, 20260913]) {
      const t = RR.track.gen(diff, seed);
      check(`生成 ${diff}/seed=${seed} 实体>100 且有终点`, t.ents.length > 100 && t.finishX > 40000);
      for (const e of t.ents) types.add(e.kind === 'ob' ? e.t : e.kind);
      check(`生成 ${diff}/seed=${seed} 含 3 罐头 2 检查点 1 齿轮`,
        t.ents.filter((e) => e.kind === 'can').length === 3 &&
        t.ents.filter((e) => e.kind === 'cp').length === 2 &&
        t.ents.filter((e) => e.kind === 'gear').length === 1);
    }
  }
  const need = ['cone', 'tires', 'crate', 'pole', 'rock', 'cactus', 'hedgehog', 'cat', 'gate', 'fog', 'tower', 'coin', 'can', 'gear', 'cp'];
  const missing = need.filter((k) => !types.has(k));
  check('全部障碍/收集物类型均出现过: ' + (missing.join(',') || '无缺失'), missing.length === 0);
}

console.log(failed === 0 ? '\n全部通过 ✅' : `\n${failed} 项失败 ❌`);
process.exit(failed === 0 ? 0 : 1);
