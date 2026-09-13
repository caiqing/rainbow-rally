/* 彩虹拉力队 - 音频系统：WebAudio 全合成，无外部素材 */
window.RR = window.RR || {};

(function () {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let engine = null;          // 引擎持续音 {osc, f, g}
  let muted = false;
  let bgmTimer = null, bgmStep = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
    return true;
  }

  function tone(o) {
    if (!ensure()) return;
    const t0 = ctx.currentTime + (o.when || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.t || 'sine';
    osc.frequency.setValueAtTime(Math.max(1, o.f), t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + o.d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.v || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    osc.connect(g); g.connect(o.dest || sfxGain);
    osc.start(t0); osc.stop(t0 + o.d + 0.06);
  }

  function noise(d, v, when, hp) {
    if (!ensure()) return;
    const t0 = ctx.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * d));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = v;
    const f = ctx.createBiquadFilter();
    f.type = hp ? 'highpass' : 'lowpass';
    f.frequency.value = hp ? 5000 : 1200;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t0);
  }

  const SFX = {
    click()      { tone({ f: 660, f2: 880, t: 'triangle', d: 0.07, v: 0.14 }); },
    jump()       { tone({ f: 300, f2: 640, t: 'triangle', d: 0.16, v: 0.16 }); },
    land()       { noise(0.05, 0.1); tone({ f: 130, f2: 70, t: 'sine', d: 0.08, v: 0.18 }); },
    coin()       { tone({ f: 988, d: 0.05, v: 0.11, t: 'square' }); tone({ f: 1319, d: 0.09, v: 0.11, t: 'square', when: 0.05 }); },
    can()        { [660, 880, 1175].forEach((f, i) => tone({ f, d: 0.07, v: 0.13, t: 'triangle', when: i * 0.06 })); },
    gear()       { [523, 659, 784, 1047].forEach((f, i) => tone({ f, d: 0.1, v: 0.14, t: 'triangle', when: i * 0.07 })); },
    hit()        { noise(0.18, 0.28); tone({ f: 220, f2: 70, t: 'sawtooth', d: 0.22, v: 0.22 }); },
    heal()       { [784, 988, 1319, 1568].forEach((f, i) => tone({ f, d: 0.09, v: 0.12, t: 'sine', when: i * 0.05 })); },
    boost()      { tone({ f: 200, f2: 920, t: 'sawtooth', d: 0.3, v: 0.11 }); noise(0.25, 0.07); },
    checkpoint() { tone({ f: 784, d: 0.1, v: 0.15, t: 'triangle' }); tone({ f: 1175, d: 0.16, v: 0.15, t: 'triangle', when: 0.1 }); },
    sleep()      { tone({ f: 520, f2: 170, t: 'sine', d: 0.55, v: 0.18 }); },
    win()        { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ f, d: 0.14, v: 0.16, t: 'triangle', when: i * 0.12 })); },
  };

  // 引擎持续音：频率随速度比变化
  function engineStart() {
    if (!ensure() || engine) return;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 60;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
    const g = ctx.createGain(); g.gain.value = 0;
    osc.connect(f); f.connect(g); g.connect(sfxGain);
    osc.start();
    engine = { osc, f, g };
  }
  function engineSet(ratio, on) {
    if (!engine || !ctx) return;
    const t = ctx.currentTime;
    engine.g.gain.setTargetAtTime(on ? 0.045 : 0, t, 0.1);
    engine.osc.frequency.setTargetAtTime(55 + 95 * ratio, t, 0.08);
    engine.f.frequency.setTargetAtTime(280 + 900 * ratio, t, 0.08);
  }
  function engineStop() { engineSet(0, false); }

  // BGM：C-G-Am-F 琶音 + 轻打击，柔和垫底
  const CHORDS = [
    [262, 330, 392, 523],
    [196, 247, 294, 392],
    [220, 262, 330, 440],
    [175, 220, 262, 349],
  ];
  function bgmTick() {
    if (!ctx || muted) return;
    const bar = Math.floor(bgmStep / 4) % 4, sub = bgmStep % 4;
    const ch = CHORDS[bar];
    tone({ f: ch[sub], d: 0.22, v: 0.045, t: 'triangle', dest: musicGain });
    if (sub === 0) tone({ f: ch[0] / 2, d: 0.42, v: 0.07, t: 'sine', dest: musicGain });
    if (sub === 2) noise(0.03, 0.018, 0, true);
    bgmStep++;
  }
  function bgmStart() {
    if (!ensure() || bgmTimer) return;
    bgmTimer = setInterval(bgmTick, 250);
  }
  function bgmStop() { if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; } }

  function setMuted(m) {
    muted = m;
    if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
  }

  RR.audio = {
    ensure, sfx: (n) => { if (SFX[n]) SFX[n](); },
    engineStart, engineSet, engineStop,
    bgmStart, bgmStop, setMuted, isMuted: () => muted,
  };
})();
