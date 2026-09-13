/* 彩虹拉力队 - 全局数据与存档（M0 原型） */
window.RR = window.RR || {};

RR.DATA = {
  VIEW: { W: 1280, H: 720 },
  // 路面带（车与障碍活动的纵向范围）
  ROAD: { top: 340, bottom: 692 },
  CAR: {
    x: 330,          // 车在屏幕上的固定横坐标
    w: 148, h: 86,
    ySpeed: 540,     // 上下移动速度
    jumpV: 820,      // 起跳速度（向上为正）
    g: 2600,         // 重力
    holdG: 1500,     // 按住跳跃时的低重力（滞空更久）
    maxZ: 300,
  },
  BOOST: { max: 100, drain: 34, regen: 6.5, perCan: 34, mult: 1.55 },
  HEARTS: 3,
  TRACK_LEN: 46000,
  CHECKPOINTS: [15300, 30600],
  FINISH_X: 45500,   // 小站位置
  DIFFS: {
    family: { key: 'family', name: '亲子护航', emoji: '🍼', speed: 340, gap: 920, shieldAll: true, coinMult: 1, desc: '护盾常开 · 障碍稀疏，适合陪玩' },
    normal: { key: 'normal', name: '标准速度', emoji: '🌈', speed: 430, gap: 640, shieldAll: false, coinMult: 1, desc: '难度适中，推荐先玩这个' },
    expert: { key: 'expert', name: '专家冲刺', emoji: '⚡', speed: 545, gap: 470, shieldAll: false, coinMult: 1.5, desc: '障碍密集 · 齿轮币 +50%' },
  },
};

// 本地存档（localStorage，键前缀 rr_）
RR.STORAGE = {
  get(k, d) {
    try {
      const v = localStorage.getItem('rr_' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('rr_' + k, JSON.stringify(v)); } catch (e) { /* 隐私模式等场景下静默降级 */ }
  },
};
