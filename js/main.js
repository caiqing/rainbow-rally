/* 彩虹拉力队 - 入口：画布适配 / 输入 / 主循环 / 状态机 */
window.RR = window.RR || {};

(function () {
  const D = RR.DATA;
  let canvas, ctx;
  let game = null;
  let state = 'menu';          // menu | play | pause | result
  let lastTs = 0;

  const input = { up: false, down: false, jumpHeld: false, jumpQueued: false, boostHeld: false, touchY: null };

  function resize() {
    const scale = Math.min(window.innerWidth / D.VIEW.W, window.innerHeight / D.VIEW.H);
    const cw = Math.round(D.VIEW.W * scale), ch = Math.round(D.VIEW.H * scale);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(canvas.width / D.VIEW.W, 0, 0, canvas.height / D.VIEW.H, 0, 0);
  }

  function playing() { return state === 'play'; }

  function startGame(diffKey) {
    // 开发调试参数：?autostart=1&seek=15000&freeze=1&diff=expert&seed=123
    const q = new URLSearchParams(location.search);
    game.start(diffKey, onEnd, q.get('seed') ? +q.get('seed') : null);
    game.uiToast = (m) => RR.ui.toast(m);
    if (q.get('seek')) game.camX = Math.max(0, +q.get('seek') - 330);
    if (q.get('freeze')) game.frozen = true;
    state = 'play';
    RR.ui.showHUD();
  }

  function onEnd(s) {
    state = 'result';
    const bank = RR.STORAGE.get('bank', 0) + s.earned;
    RR.STORAGE.set('bank', bank);
    const best = RR.STORAGE.get('best', 0);
    const isNewBest = s.coins > best;
    if (isNewBest) RR.STORAGE.set('best', s.coins);
    RR.ui.showResult(s, bank, best, isNewBest);
  }

  function toMenu() {
    state = 'menu';
    game.startDemo();
    RR.audio.engineStop();
    RR.ui.showMenu(RR.STORAGE.get('bank', 0), RR.STORAGE.get('best', 0));
  }

  function togglePause(p) {
    if (state === 'play' && p) { state = 'pause'; RR.ui.showPause(); RR.audio.engineStop(); }
    else if (state === 'pause' && !p) { state = 'play'; RR.ui.hidePause(); }
  }

  function bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      RR.audio.ensure(); RR.audio.bgmStart();
      switch (e.code) {
        case 'ArrowUp': case 'KeyW': input.up = true; input.touchY = null; break;
        case 'ArrowDown': case 'KeyS': input.down = true; input.touchY = null; break;
        case 'Space': case 'KeyJ': input.jumpHeld = true; input.jumpQueued = true; e.preventDefault(); break;
        case 'ShiftLeft': case 'ShiftRight': case 'KeyL': input.boostHeld = true; break;
        case 'KeyP': case 'Escape': togglePause(state === 'play'); break;
        case 'KeyM': {
          const m = !RR.audio.isMuted();
          RR.audio.setMuted(m); RR.STORAGE.set('muted', m);
          document.getElementById('btnMute').textContent = m ? '🔇' : '🔊';
          break;
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowUp': case 'KeyW': input.up = false; break;
        case 'ArrowDown': case 'KeyS': input.down = false; break;
        case 'Space': case 'KeyJ': input.jumpHeld = false; break;
        case 'ShiftLeft': case 'ShiftRight': case 'KeyL': input.boostHeld = false; break;
      }
    });
    window.addEventListener('pointerdown', () => { RR.audio.ensure(); RR.audio.bgmStart(); }, { once: false });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state === 'play') togglePause(true);
    });
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    if (state === 'pause') { return; }
    if (state === 'menu' || state === 'result') game.update(dt);
    else {
      game.input.up = input.up;
      game.input.down = input.down;
      game.input.jumpHeld = input.jumpHeld;
      game.input.jumpQueued = game.input.jumpQueued || input.jumpQueued;
      game.input.boostHeld = input.boostHeld;
      game.input.touchY = input.touchY;
      input.jumpQueued = false;
      game.update(dt);
      if (state === 'play') RR.ui.updateHUD(game);
    }
    game.render(ctx);
  }

  function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    game = new RR.Game();
    RR.ui.init({ startGame, toMenu, togglePause, playing, input });
    resize();
    window.addEventListener('resize', resize);
    bindKeys();
    // 恢复静音偏好
    RR.audio.setMuted(RR.STORAGE.get('muted', false));
    const q = new URLSearchParams(location.search);
    if (q.get('resultdemo')) {
      // 开发调试：直接渲染一张结算面板看样式
      RR.audio.setMuted(true);
      state = 'result';
      game.startDemo();
      RR.ui.showResult({ star: 'S', coins: 120, totalCoins: 146, cans: 3, hearts: 3, earned: 270, gotGear: true, msg: '完美拉力！小站超级点亮！' }, 270, 120, true);
      requestAnimationFrame(loop);
      return;
    }
    if (q.get('autostart')) {
      RR.audio.setMuted(true);
      startGame(q.get('diff') || 'normal');
    } else {
      toMenu();
    }
    requestAnimationFrame(loop);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
