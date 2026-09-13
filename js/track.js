/* 彩虹拉力队 - 赛道生成器（奶油沙漠 · 第 1 章 M0 版）
 *
 * 实体字段约定：
 *   kind: 'ob' 障碍 | 'coin' 齿轮币 | 'can' 阳光罐头 | 'gear' 七彩齿轮 | 'cp' 检查点
 *   x: 世界横坐标（底边中心）  y: 底边纵坐标  z: 离地高度（0 = 地面）
 *   t: 障碍子类型  w/h: 碰撞盒
 */
window.RR = window.RR || {};

(function () {
  const D = RR.DATA, ROAD = D.ROAD;

  function lcg(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function placeY(rng, h) { return ROAD.top + 12 + rng() * (ROAD.bottom - ROAD.top - h - 24); }

  // 洗牌袋：保证每种模式按权重均匀出现，不依赖随机运气
  function makeBag(names, rng) {
    let bag = [];
    return function () {
      if (!bag.length) {
        bag = names.slice();
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          const t = bag[i]; bag[i] = bag[j]; bag[j] = t;
        }
      }
      return bag.pop();
    };
  }

  // ---- 币串工具 ----
  function coinLine(ents, x0, n, y) {
    for (let i = 0; i < n; i++) ents.push({ kind: 'coin', x: x0 + i * 54, y: y, z: 0 });
    return x0 + n * 54;
  }
  function coinArc(ents, x0, peak, n) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      ents.push({ kind: 'coin', x: x0 + i * 56, y: ROAD.bottom - 40, z: Math.sin(t * Math.PI) * peak });
    }
    return x0 + n * 56;
  }

  // ---- 关卡模式：每个模式占一段横坐标，返回消耗宽度 ----
  const PATTERNS = {
    // 路锥 + 跳跃币弧
    coinArc(e, x, rng) {
      e.push({ kind: 'ob', t: 'cone', x: x + 260, y: placeY(rng, 58), w: 46, h: 58 });
      coinArc(e, x + 40, 175, 7);
      return 560;
    },
    // 三只路锥上下交错，配合引导币
    coneLine(e, x, rng) {
      const ys = [ROAD.top + 60, ROAD.bottom - 90, ROAD.top + 140];
      for (let i = 0; i < 3; i++) e.push({ kind: 'ob', t: 'cone', x: x + i * 360, y: ys[i % 3], w: 46, h: 58 });
      coinLine(e, x + 80, 3, ys[1] - 40);
      coinLine(e, x + 460, 3, ys[0] - 40);
      return 1200;
    },
    // 轮胎堆：跳过
    tireStack(e, x, rng) {
      e.push({ kind: 'ob', t: 'tires', x: x + 240, y: placeY(rng, 52), w: 110, h: 52 });
      coinArc(e, x + 90, 140, 5);
      return 540;
    },
    // 齿轮闸门：开口上下摆动
    gateHop(e, x, rng) {
      const gateH = 172;
      const cy = ROAD.top + 20 + rng() * (ROAD.bottom - ROAD.top - gateH - 40);
      e.push({ kind: 'ob', t: 'gate', x: x + 300, y: 0, w: 76, h: 0, gateH, cy, amp: 38, phase: rng() * 6.28 });
      coinLine(e, x + 90, 2, cy + gateH / 2);
      return 620;
    },
    // 雾雾吐吐机：雾区挡视线，内有石头
    fogZone(e, x, rng) {
      e.push({ kind: 'ob', t: 'fog', x: x + 480, y: ROAD.top, w: 120, h: 0, len: 950 });
      e.push({ kind: 'ob', t: 'rock', x: x + 760, y: placeY(rng, 70), w: 90, h: 70 });
      coinLine(e, x + 380, 4, ROAD.bottom - 46);
      return 1400;
    },
    // 灰灰喵：跳过头顶即治愈
    catNap(e, x, rng) {
      for (let i = 0; i < 2; i++) {
        const y = placeY(rng, 44);
        e.push({ kind: 'ob', t: 'cat', x: x + 240 + i * 340, y, w: 64, h: 44, healed: false });
        coinArc(e, x + 120 + i * 340, 130, 3);
      }
      return 940;
    },
    // 灰灰球球：滚来的刺猬，必须跳
    roller(e, x, rng) {
      e.push({ kind: 'ob', t: 'hedgehog', x: x + 520, y: placeY(rng, 48), w: 60, h: 48, vx: -135, active: false, spin: 0 });
      coinArc(e, x + 60, 190, 6);
      return 1000;
    },
    // 岩石/仙人球交错
    rockMix(e, x, rng) {
      e.push({ kind: 'ob', t: 'rock', x: x + 260, y: ROAD.top + 70, w: 90, h: 70 });
      e.push({ kind: 'ob', t: 'cactus', x: x + 660, y: ROAD.bottom - 88, w: 54, h: 86 });
      e.push({ kind: 'ob', t: 'rock', x: x + 1060, y: ROAD.top + 90, w: 90, h: 70 });
      coinLine(e, x + 120, 3, ROAD.bottom - 60);
      coinLine(e, x + 520, 3, ROAD.top + 70);
      coinLine(e, x + 920, 3, ROAD.bottom - 60);
      return 1320;
    },
    // 木箱一排：可撞碎（爽点）或跳过
    crateRow(e, x, rng) {
      const y = placeY(rng, 64);
      for (let i = 0; i < 5; i++) e.push({ kind: 'ob', t: 'crate', x: x + 240 + i * 70, y, w: 64, h: 64 });
      coinArc(e, x + 80, 155, 5);
      return 840;
    },
    // 倒杆：必须跳过
    poleHop(e, x, rng) {
      e.push({ kind: 'ob', t: 'pole', x: x + 300, y: placeY(rng, 104), w: 180, h: 104 });
      coinArc(e, x + 60, 180, 6);
      return 720;
    },
    // 阳光罐头高塔：叠轮胎顶上放罐头（每关固定 3 座）
    canTower(e, x, rng) {
      const y = ROAD.bottom - 20;
      e.push({ kind: 'ob', t: 'tower', x: x + 240, y, w: 110, h: 118 });
      e.push({ kind: 'can', x: x + 240, y: y - 56, z: 195 });
      coinArc(e, x + 40, 210, 5);
      return 520;
    },
  };

  // 生成整条赛道
  function gen(diffKey, seed) {
    const diff = D.DIFFS[diffKey];
    const rng = lcg(seed || Date.now());
    const ents = [];

    // 三座罐头塔固定节奏插入（位置避开模式游标，防止重叠）
    const towerXs = [8200, 22500, 36200];
    // 模式游标
    let x = 2300;
    let last = '';
    let first = true;   // 开局第一个模式固定为简单的跳跃教学
    // 雾区/闸门/木箱是特色玩法，加权一份
    const names = ['coinArc', 'coneLine', 'tireStack', 'gateHop', 'fogZone', 'catNap', 'roller', 'rockMix', 'crateRow', 'poleHop', 'fogZone', 'gateHop', 'crateRow'];
    const nextPat = makeBag(names, rng);
    while (x < D.TRACK_LEN - 3200) {
      if (towerXs.length && x > towerXs[0] - 900) {
        const tx = Math.max(towerXs.shift(), x + 340);
        PATTERNS.canTower(ents, tx - 240, rng);
        x = tx + 300 + diff.gap;
        continue;
      }
      let p = first ? 'coinArc' : nextPat();
      first = false;
      if (p === last) p = nextPat();                 // 避免相邻重复
      const w = PATTERNS[p](ents, x, rng);
      x += w + diff.gap + rng() * 220;
      last = p;
    }

    // 终点前七彩齿轮高挑战（明确的高跳奖励）
    coinArc(ents, D.FINISH_X - 2200, 215, 7);
    ents.push({ kind: 'gear', x: D.FINISH_X - 1830, y: ROAD.bottom - 40, z: 215 });

    // 检查点
    for (const cx of D.CHECKPOINTS) ents.push({ kind: 'cp', x: cx, done: false });

    ents.sort((a, b) => a.x - b.x);

    let totalCoins = 0;
    for (const e of ents) if (e.kind === 'coin') totalCoins++;

    return {
      ents,
      totalCoins,
      totalCans: 3,
      finishX: D.FINISH_X,
    };
  }

  RR.track = { gen };
})();
