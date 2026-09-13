/* 彩虹拉力队 - DOM 界面：菜单 / HUD / 结算 / 暂停 / 触屏 */
window.RR = window.RR || {};

(function () {
  const $ = (id) => document.getElementById(id);
  let mainRef = null;

  const el = {};

  function init(main) {
    mainRef = main;
    ['menu', 'hud', 'result', 'pause', 'touch', 'toast', 'rotate',
     'btnStart', 'btnPause', 'btnJump', 'btnBoost', 'btnResume', 'btnRetry', 'btnQuit',
     'btnAgain', 'btnMenu', 'diffRow', 'menuBest', 'btnMute',
     'hearts', 'coins', 'cans', 'energy', 'progress', 'resTitle', 'resStar', 'resStats', 'resMsg',
    ].forEach((id) => { el[id] = $(id); });

    // 难度选择
    const savedDiff = RR.STORAGE.get('diff', 'normal');
    document.querySelectorAll('#diffRow .diff-btn').forEach((b) => {
      b.classList.toggle('on', b.dataset.k === savedDiff);
      b.addEventListener('click', () => {
        document.querySelectorAll('#diffRow .diff-btn').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        RR.STORAGE.set('diff', b.dataset.k);
        RR.audio.sfx('click');
      });
    });

    $('btnStart').addEventListener('click', () => {
      RR.audio.ensure(); RR.audio.bgmStart(); RR.audio.sfx('click');
      const k = RR.STORAGE.get('diff', 'normal');
      mainRef.startGame(k);
    });

    el.btnPause.addEventListener('click', () => mainRef.togglePause(true));
    el.btnResume.addEventListener('click', () => mainRef.togglePause(false));
    el.btnRetry.addEventListener('click', () => { RR.audio.sfx('click'); mainRef.startGame(RR.STORAGE.get('diff', 'normal')); });
    el.btnQuit.addEventListener('click', () => { RR.audio.sfx('click'); mainRef.toMenu(); });
    el.btnAgain.addEventListener('click', () => { RR.audio.sfx('click'); mainRef.startGame(RR.STORAGE.get('diff', 'normal')); });
    el.btnMenu.addEventListener('click', () => { RR.audio.sfx('click'); mainRef.toMenu(); });
    el.btnMute.addEventListener('click', () => {
      const m = !RR.audio.isMuted();
      RR.audio.setMuted(m);
      RR.STORAGE.set('muted', m);
      el.btnMute.textContent = m ? '🔇' : '🔊';
    });
    if (RR.audio.isMuted() || RR.STORAGE.get('muted', false)) {
      RR.audio.setMuted(RR.STORAGE.get('muted', false));
      el.btnMute.textContent = RR.audio.isMuted() ? '🔇' : '🔊';
    }

    // 触屏按钮
    const hold = (node, on, off) => {
      node.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); on(); });
      node.addEventListener('pointerup', (e) => { e.stopPropagation(); off(); });
      node.addEventListener('pointerleave', () => off());
      node.addEventListener('pointercancel', () => off());
    };
    hold(el.btnJump, () => { mainRef.input.jumpHeld = true; mainRef.input.jumpQueued = true; }, () => { mainRef.input.jumpHeld = false; });
    hold(el.btnBoost, () => { mainRef.input.boostHeld = true; }, () => { mainRef.input.boostHeld = false; });

    // 触屏拖动移动（画布区域）
    const canvasWrap = document.getElementById('stage');
    canvasWrap.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') return;
      if (!mainRef.playing()) return;
      const r = canvasWrap.getBoundingClientRect();
      const ly = (e.clientY - r.top) / r.height * RR.DATA.VIEW.H;
      mainRef.input.touchY = ly;
    });
    canvasWrap.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      const r = canvasWrap.getBoundingClientRect();
      mainRef.input.touchY = (e.clientY - r.top) / r.height * RR.DATA.VIEW.H;
    });
    canvasWrap.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse') return;
      mainRef.input.touchY = null;
    });
  }

  function showMenu(bank, best) {
    el.menu.classList.remove('hidden');
    el.hud.classList.add('hidden');
    el.result.classList.add('hidden');
    el.pause.classList.add('hidden');
    el.touch.classList.add('hidden');
    el.menuBest.innerHTML =
      '🌈 累计彩虹币 <b>' + bank + '</b>　🏆 单局最高 <b>' + best + '</b>';
  }

  function showHUD() {
    el.menu.classList.add('hidden');
    el.result.classList.add('hidden');
    el.pause.classList.add('hidden');
    el.hud.classList.remove('hidden');
    if ('ontouchstart' in window) el.touch.classList.remove('hidden');
  }

  function showPause() { el.pause.classList.remove('hidden'); }
  function hidePause() { el.pause.classList.add('hidden'); }

  function updateHUD(g) {
    let h = '';
    for (let i = 0; i < RR.DATA.HEARTS; i++) {
      h += '<span class="heart' + (i < g.hearts ? ' full' : '') + '"></span>';
    }
    el.hearts.innerHTML = h;
    el.coins.textContent = '🪙 ' + g.coins;
    let cn = '';
    for (let i = 0; i < 3; i++) cn += '<span class="can' + (i < g.cans ? ' full' : '') + '"></span>';
    el.cans.innerHTML = cn;
    el.energy.style.width = (g.energy / RR.DATA.BOOST.max * 100) + '%';
    el.progress.style.width = Math.min(100, (g.camX + RR.DATA.CAR.x) / g.track.finishX * 100) + '%';
  }

  function showResult(s, bank, best, isNewBest) {
    el.menu.classList.add('hidden');
    el.hud.classList.add('hidden');
    el.touch.classList.add('hidden');
    el.pause.classList.add('hidden');
    el.result.classList.remove('hidden');
    el.resStar.textContent = s.star;
    el.resStar.className = 'star-' + s.star;
    el.resTitle.textContent = '小站点亮！';
    el.resMsg.textContent = s.msg;
    el.resStats.innerHTML =
      '<div>🪙 齿轮币 <b>' + s.coins + '</b> / ' + s.totalCoins + '</div>' +
      '<div>☀️ 阳光罐头 <b>' + s.cans + '</b> / 3</div>' +
      '<div>💖 剩余心心 <b>' + s.hearts + '</b></div>' +
      (s.gotGear ? '<div class="gear-line">✨ 拿到了七彩齿轮！</div>' : '') +
      '<div class="earn">本局获得 <b>+' + s.earned + '</b> 彩虹币' + (isNewBest ? '　🎉 新纪录！' : '') + '</div>' +
      '<div class="bank-line">彩虹币累计：<b>' + bank + '</b></div>';
  }

  let toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.remove('hidden');
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove('show');
      setTimeout(() => el.toast.classList.add('hidden'), 300);
    }, 1800);
  }

  RR.ui = { init, showMenu, showHUD, showPause, hidePause, updateHUD, showResult, toast };
})();
