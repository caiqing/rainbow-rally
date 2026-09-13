/* 彩虹拉力队 - 游戏核心：状态机 / 车物理 / 碰撞 / 粒子 / 结算
 * 状态：demo（菜单背景）→ play → sleep（无 Game Over，检查点复活）→ finish
 */
window.RR = window.RR || {};

(function () {
  const D = RR.DATA, ROAD = D.ROAD, CAR = D.CAR;

  class Game {
    constructor() {
      this.state = 'idle';
      this.camX = 0;
      this.t = 0;
      this.input = { up: false, down: false, jumpHeld: false, jumpQueued: false, boostHeld: false, touchY: null };
      this.parts = [];       // 粒子
      this.shake = 0;
      this.flash = 0;
      this.onEnd = null;     // 结算回调
    }

    // ---- 菜单背景演示 ----
    startDemo() {
      this.state = 'demo';
      this.camX = 0;
      this.car = { y: (ROAD.top + ROAD.bottom) / 2, z: 0, vz: 0, blink: false, boostOn: false };
      this.parts = [];
    }

    // ---- 正式开局 ----
    start(diffKey, onEnd, seed) {
      const diff = D.DIFFS[diffKey] || D.DIFFS.normal;
      this.diff = diff;
      this.track = RR.track.gen(diffKey, seed);
      this.ents = this.track.ents;
      this.onEnd = onEnd;
      this.cpX = 0;
      this._resetCar(true);
      this.coins = 0;
      this.cans = 0;
      this.gotGear = false;
      this.state = 'play';
      this.shake = 0; this.flash = 0;
      this.parts = [];
      RR.audio.engineStart();
    }

    _resetCar(full) {
      this.car = {
        y: (ROAD.top + ROAD.bottom) / 2, z: 0, vz: 0,
        blink: false, boostOn: false,
      };
      this.camX = full ? 0 : this.cpX - CAR.x;
      this.hearts = D.HEARTS;
      this.energy = D.BOOST.max * 0.6;
      this.invulnT = full ? 1.5 : 3;
      this.slowT = 0;
      this.sleepT = 0;
      this.finT = 0;
      this.ended = false;
      this.lit = false;
      this.jumpHold = false;
    }

    // ---------- 更新 ----------
    update(dt) {
      this.t += dt;
      this.updateParticles(dt);
      if (this.shake > 0) this.shake -= dt;
      if (this.flash > 0) this.flash -= dt;

      if (this.state === 'demo') {
        this.camX += 150 * dt;
        const c = this.car;
        c.y = (ROAD.top + ROAD.bottom) / 2 + Math.sin(this.t * 0.7) * 66;
        // 演示车偶尔小跳
        if (c.z === 0 && Math.sin(this.t * 0.9) > 0.985) { c.vz = 620; }
        if (c.z > 0 || c.vz > 0) {
          c.vz -= CAR.g * dt; c.z += c.vz * dt;
          if (c.z <= 0) { c.z = 0; c.vz = 0; }
        }
        return;
      }

      if (this.state === 'sleep') {
        this.sleepT -= dt;
        if (this.sleepT <= 0) this._respawn();
        return;
      }

      if (this.state === 'finish') {
        this.finT += dt;
        RR.audio.engineSet(0.2, true);
        // 点亮小站：烟花 + 缓停
        const carWX = this.camX + CAR.x;
        if (carWX < this.track.finishX + 340) this.camX += this.speed * Math.max(0.15, 1 - this.finT) * dt;
        if (!this.lit && this.finT > 0.25) {
          this.lit = true;
          RR.audio.sfx('win');
        }
        if (this.finT > 0.3 && this.finT < 2.0 && Math.random() < dt * 6) {
          const fx = 640 + (Math.random() - 0.5) * 500;
          const fy = 180 + Math.random() * 180;
          this._firework(fx, fy);
        }
        if (this.finT > 2.3 && !this.ended) {
          this.ended = true;
          RR.audio.engineStop();
          if (this.onEnd) this.onEnd(this.summary());
        }
        return;
      }

      if (this.state !== 'play') return;

      // 调试冻结（?freeze=1）：画面静止但动画时钟继续
      if (this.frozen) { this.speed = 0; return; }

      const inp = this.input, car = this.car, diff = this.diff;

      // 速度 / 氮气
      const wantBoost = inp.boostHeld && this.energy > 1;
      if (wantBoost) {
        this.energy = Math.max(0, this.energy - D.BOOST.drain * dt);
        if (!this.boostOn) { this.boostOn = true; RR.audio.sfx('boost'); }
      } else {
        this.boostOn = false;
        this.energy = Math.min(D.BOOST.max, this.energy + D.BOOST.regen * dt);
      }
      car.boostOn = this.boostOn;
      let sp = diff.speed * (this.boostOn ? D.BOOST.mult : 1);
      if (this.slowT > 0) { this.slowT -= dt; sp *= 0.55; }
      this.speed = sp;
      this.camX += sp * dt;
      RR.audio.engineSet(this.boostOn ? 1 : 0.55 + 0.45 * (sp / (diff.speed * D.BOOST.mult)), true);

      // 纵向移动
      if (inp.touchY != null) {
        car.y += (inp.touchY - car.y) * Math.min(1, dt * 12);
      } else {
        let vy = 0;
        if (inp.up) vy -= 1;
        if (inp.down) vy += 1;
        car.y += vy * CAR.ySpeed * dt;
      }
      car.y = Math.max(ROAD.top + CAR.h * 0.35, Math.min(ROAD.bottom - 6, car.y));

      // 跳跃（z 轴）
      if (inp.jumpQueued && car.z <= 0) {
        car.vz = CAR.jumpV;
        this.jumpHold = true;
        RR.audio.sfx('jump');
      }
      inp.jumpQueued = false;
      if (car.z > 0 || car.vz > 0) {
        const g = (this.jumpHold && inp.jumpHeld && car.vz > 0) ? CAR.holdG : CAR.g;
        if (!inp.jumpHeld) this.jumpHold = false;
        car.vz -= g * dt;
        car.z += car.vz * dt;
        if (car.z >= CAR.maxZ) { car.z = CAR.maxZ; car.vz = Math.min(0, car.vz); }
        if (car.z <= 0) {
          car.z = 0; car.vz = 0;
          RR.audio.sfx('land');
          this._dust(car.y);
        }
      }

      if (this.invulnT > 0) { this.invulnT -= dt; car.blink = true; }
      else car.blink = false;

      this._updateEnts(dt);
      this._collide();

      // 检查点
      const carWX = this.camX + CAR.x;
      for (const e of this.ents) {
        if (e.kind === 'cp' && !e.done && carWX > e.x) {
          e.done = true;
          this.cpX = Math.max(this.cpX, e.x);
          RR.audio.sfx('checkpoint');
          this._floatText(e.x, ROAD.top + 60, '检查点！', '#7EC8E3');
        }
      }

      // 终点
      if (carWX >= this.track.finishX) {
        this.state = 'finish';
        this.finT = 0;
      }
    }

    // 动态实体：刺猬球滚来、闸门开口摆动（每帧更新，供渲染与碰撞共用）
    _updateEnts(dt) {
      const carWX = this.camX + CAR.x;
      for (const e of this.ents) {
        if (e.dead || e.kind !== 'ob') continue;
        if (e.t === 'hedgehog') {
          if (!e.active && carWX + 1700 > e.x) e.active = true;
          if (e.active) { e.x += e.vx * dt; e.spin = (e.spin || 0) - dt * 9; }
        } else if (e.t === 'gate') {
          e._openY = e.cy + Math.sin(this.t * 1.05 + e.phase) * e.amp;
        }
      }
    }

    _collide() {
      const car = this.car;
      const carWX = this.camX + CAR.x;
      const cl = carWX + 8, cr = carWX + CAR.w - 8;         // 车横向范围
      const cb = car.y, ct = car.y - CAR.h + 10;            // 车纵向范围
      const cy = car.y - CAR.h / 2;                          // 车中心 y

      for (const e of this.ents) {
        if (e.dead) continue;
        if (e.x < carWX - 400 || e.x > carWX + 500) continue;

        if (e.kind === 'coin') {
          if (Math.abs(carWX + CAR.w / 2 - e.x) < 44 &&
              Math.abs(cy - (e.y - 24)) < 52 &&
              Math.abs(car.z - (e.z || 0)) < 58) {
            e.dead = true;
            this.coins++;
            RR.audio.sfx('coin');
            this._spark(e.x, e.y - 24 - e.z, '#FFC94D', 5);
          }
          continue;
        }
        if (e.kind === 'can') {
          if (Math.abs(carWX + CAR.w / 2 - e.x) < 46 &&
              Math.abs(cy - (e.y - 20)) < 60 &&
              Math.abs(car.z - (e.z || 0)) < 90) {
            e.dead = true;
            this.cans++;
            this.energy = Math.min(D.BOOST.max, this.energy + D.BOOST.perCan);
            RR.audio.sfx('can');
            this._spark(e.x, e.y - 20, '#FFA94D', 8);
            this._floatText(e.x, e.y - 60, '阳光 +', '#FFA94D');
          }
          continue;
        }
        if (e.kind === 'gear') {
          if (Math.abs(carWX + CAR.w / 2 - e.x) < 52 &&
              Math.abs(cy - (e.y - 26)) < 66 &&
              Math.abs(car.z - (e.z || 0)) < 80) {
            e.dead = true;
            this.gotGear = true;
            RR.audio.sfx('gear');
            this._spark(e.x, e.y - 26 - e.z, '#FF7B7B', 14);
            this._floatText(e.x, e.y - 80, '七彩齿轮！', '#9B8CE3');
          }
          continue;
        }
        if (e.kind !== 'ob') continue;

        // 闸门：开口判定（中心点 + 宽容），_openY 已在 _updateEnts 中更新
        if (e.t === 'gate') {
          if (cr > e.x - e.w / 2 && cl < e.x + e.w / 2) {
            const openTop = e._openY != null ? e._openY : e.cy;
            const openBot = openTop + e.gateH;
            if (cy < openTop + 14 || cy > openBot - 14) this._damage(e.x, e.y);
          }
          continue;
        }
        // 雾：无碰撞
        if (e.t === 'fog') continue;

        // 普通障碍 AABB + 跳跃高度
        if (cr > e.x - e.w / 2 && cl < e.x + e.w / 2 &&
            cb > e.y - e.h && ct < e.y && car.z < e.h - 8) {
          if (e.t === 'cat') {
            // 软碰撞：减速但不掉心
            this.slowT = Math.max(this.slowT, 1.0);
            e.jumpT = 0.35;
            this._spark(e.x, e.y - 30, '#C9C2BB', 5);
            RR.audio.sfx('land');
          } else if (e.t === 'crate') {
            // 撞碎：爽点 + 小奖励
            e.dead = true;
            this.slowT = Math.max(this.slowT, 0.45);
            this.coins += 3;
            RR.audio.sfx('hit');
            this._wood(e.x, e.y - 32);
            this._floatText(e.x, e.y - 70, '+3', '#FFC94D');
            this.shake = 0.12;
          } else {
            this._damage(e.x, e.y);
          }
        }
        // 跳过灰灰喵头顶 = 治愈
        if (e.t === 'cat' && !e.healed &&
            cr > e.x - 34 && cl < e.x + 34 && car.z > e.h + 26) {
          e.healed = true;
          this.coins += 3;
          RR.audio.sfx('heal');
          this._hearts(e.x, e.y - 60);
          this._floatText(e.x, e.y - 66, '喵喵得救啦 +3', '#FF7B7B');
        }
      }
    }

    _damage(wx, wy) {
      if (this.invulnT > 0) return;
      RR.audio.sfx('hit');
      this.shake = 0.25;
      this.flash = 0.18;
      this._spark(wx, wy - 40, '#FFE066', 10);
      if (this.diff.shieldAll) {
        this.invulnT = 1.2;
        this.slowT = Math.max(this.slowT, 1.2);
        return;
      }
      this.hearts--;
      this.invulnT = 2;
      this.slowT = 2;
      if (this.hearts <= 0) {
        this.state = 'sleep';
        this.sleepT = 2.6;
        this.car.blink = false;
        RR.audio.sfx('sleep');
        RR.audio.engineStop();
        this._toast('车车累了，睡一小会儿…');
      }
    }

    _respawn() {
      this._resetCar(false);
      this.energy = D.BOOST.max * 0.6;
      this.state = 'play';
      RR.audio.engineStart();
      this._toast('满血复活，继续出发！');
      // 复活点附近清出一条安全通道
      for (const e of this.ents) {
        if (e.kind === 'ob' && !e.dead && e.x > this.cpX + 200 && e.x < this.camX + CAR.x + 1100 && e.t !== 'fog') {
          if (e.t !== 'gate') e.dead = true;
        }
      }
    }

    _toast(msg) { if (this.uiToast) this.uiToast(msg); }

    // ---------- 粒子 ----------
    _spark(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
        this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.5 + Math.random() * 0.3, age: 0, color, size: 3 + Math.random() * 3, grav: 300 });
      }
    }
    _dust(y) {
      for (let i = 0; i < 6; i++) {
        this.parts.push({ x: this.camX + CAR.x + 20 + Math.random() * 80, y: y - 4, vx: -80 - Math.random() * 80, vy: -30 - Math.random() * 50, life: 0.4, age: 0, color: 'rgba(210,180,140,0.8)', size: 4 + Math.random() * 4, grav: 60 });
      }
    }
    _wood(x, y) {
      for (let i = 0; i < 8; i++) {
        this.parts.push({ x, y, vx: (Math.random() - 0.5) * 300, vy: -120 - Math.random() * 160, life: 0.6, age: 0, color: '#D9A05B', size: 4 + Math.random() * 5, grav: 700, rect: true });
      }
    }
    _hearts(x, y) {
      for (let i = 0; i < 4; i++) {
        this.parts.push({ x: x + (Math.random() - 0.5) * 40, y, vx: (Math.random() - 0.5) * 40, vy: -70 - Math.random() * 40, life: 0.9, age: 0, color: '#FF7B7B', size: 8 + Math.random() * 4, grav: -30, heart: true });
      }
    }
    _firework(x, y) {
      const color = RR.draw && ['#FF7B7B', '#FFE066', '#7FD8A4', '#7EC8E3', '#9B8CE3'][Math.floor(Math.random() * 5)];
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2, s = 90 + Math.random() * 220;
        this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.8 + Math.random() * 0.4, age: 0, color, size: 2.5 + Math.random() * 3, grav: 160, firework: true });
      }
    }
    _floatText(x, y, txt, color) {
      this.parts.push({ x, y, vx: 0, vy: -55, life: 1.1, age: 0, color, txt, grav: 0 });
    }

    updateParticles(dt) {
      const ps = this.parts;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.age += dt;
        if (p.age >= p.life) { ps.splice(i, 1); continue; }
        p.vy += (p.grav || 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    // ---------- 渲染 ----------
    render(c) {
      const d = RR.draw;
      const shakeX = this.shake > 0 ? (Math.random() - 0.5) * 10 * this.shake * 4 : 0;
      const shakeY = this.shake > 0 ? (Math.random() - 0.5) * 8 * this.shake * 4 : 0;
      c.save();
      c.translate(shakeX, shakeY);

      d.drawSky(c, this.camX, this.t);
      d.drawMid(c, this.camX, this.t);
      d.drawNear(c, this.camX);
      d.drawRoad(c, this.camX);
      d.drawStation(c, this.camX, this.lit, this.t);

      // 实体
      for (const e of this.ents) {
        if (e.dead) continue;
        if (e.x < this.camX - 400 || e.x > this.camX + D.VIEW.W + 700) continue;
        if (e.kind === 'ob') d.drawOb(c, e, this.camX, this.t);
        else if (e.kind === 'coin') d.drawCoin(c, e, this.camX, this.t);
        else if (e.kind === 'can') d.drawCan(c, e, this.camX, this.t);
        else if (e.kind === 'gear') d.drawGear(c, e, this.camX, this.t);
        else if (e.kind === 'cp') d.drawCpFlag(c, e, this.camX);
      }

      // 车
      {
        const car = this.car;
        c.save();
        c.translate(CAR.x, car.y);
        d.drawCar(c, {
          z: car.z, vz: car.vz, blink: car.blink, boostOn: car.boostOn,
        }, {
          t: this.t, dist: this.camX,
          sleeping: this.state === 'sleep',
          shield: this.diff && this.diff.shieldAll && this.state === 'play',
        });
        c.restore();
      }

      // 雾罩（盖住车，制造"看不清"）
      for (const e of this.ents) {
        if (e.kind === 'ob' && e.t === 'fog') d.drawFogOverlay(c, e, this.camX, this.t);
      }

      // 粒子
      for (const p of this.parts) {
        const sx = p.x - this.camX;
        if (sx < -50 || sx > D.VIEW.W + 50) continue;
        const a = 1 - p.age / p.life;
        c.globalAlpha = Math.max(0, a);
        if (p.txt) {
          c.fillStyle = p.color;
          c.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif';
          c.textAlign = 'center';
          c.fillText(p.txt, sx, p.y);
        } else if (p.heart) {
          c.fillStyle = p.color;
          c.save(); c.translate(sx, p.y);
          c.beginPath();
          c.moveTo(0, 3);
          c.bezierCurveTo(-10, -6, -6, -14, 0, -8);
          c.bezierCurveTo(6, -14, 10, -6, 0, 3);
          c.fill();
          c.restore();
        } else {
          c.fillStyle = p.color;
          if (p.rect) c.fillRect(sx - p.size / 2, p.y - p.size / 2, p.size, p.size);
          else { c.beginPath(); c.arc(sx, p.y, p.size * a + 1, 0, 7); c.fill(); }
        }
      }
      c.globalAlpha = 1;

      // 睡觉暗角提示
      if (this.state === 'sleep') {
        c.fillStyle = 'rgba(91,74,63,0.25)';
        c.fillRect(0, 0, D.VIEW.W, D.VIEW.H);
      }
      // 受击白闪
      if (this.flash > 0) {
        c.fillStyle = 'rgba(255,255,255,' + (this.flash * 1.4) + ')';
        c.fillRect(0, 0, D.VIEW.W, D.VIEW.H);
      }
      // 柔和暗角
      const vg = c.createRadialGradient(640, 360, 420, 640, 360, 780);
      vg.addColorStop(0, 'rgba(90,60,40,0)');
      vg.addColorStop(1, 'rgba(90,60,40,0.14)');
      c.fillStyle = vg; c.fillRect(0, 0, D.VIEW.W, D.VIEW.H);

      c.restore();
    }

    // ---------- 结算 ----------
    summary() {
      const pct = this.track.totalCoins ? this.coins / this.track.totalCoins : 0;
      let star = 'B';
      if (pct >= 0.8 && this.cans >= 3 && this.hearts >= 2) star = 'S';
      else if (pct >= 0.5 && this.hearts >= 1) star = 'A';
      const bonus = star === 'S' ? 150 : star === 'A' ? 80 : 40;
      const earned = Math.round((this.coins + bonus) * (this.diff.coinMult || 1));
      return {
        star, coins: this.coins, totalCoins: this.track.totalCoins,
        cans: this.cans, hearts: this.hearts, earned,
        gotGear: this.gotGear,
        msg: star === 'S' ? '完美拉力！小站超级点亮！' : star === 'A' ? '干得漂亮，继续收集吧！' : '到达小站！再跑一次收集更多吧',
      };
    }
  }

  RR.Game = Game;
})();
