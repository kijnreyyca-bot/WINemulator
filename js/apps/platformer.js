/* WINemulator — Platformer (original mini-game) */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  Win.apps.platformer = {
    name: 'Platformer', title: 'Platformer', icon: 'game',
    width: 760, height: 520, minWidth: 480, minHeight: 360,
    mount: function (body, ctx) {
      body.classList.add('app-platformer');
      body.innerHTML =
        '<div class="pf-hud">' +
        '<span class="pf-stat">Score: <b class="pf-score">0</b></span>' +
        '<span class="pf-stat">Lives: <b class="pf-lives">3</b></span>' +
        '<span class="pf-stat">Level: <b class="pf-level">1</b></span>' +
        '<button class="btn pf-restart" type="button">Restart</button>' +
        '</div>' +
        '<div class="pf-wrap"><canvas class="pf-canvas" width="720" height="420" tabindex="0" aria-label="Platformer game"></canvas></div>' +
        '<div class="pf-help">Arrow keys / WASD to move, Space to jump. Collect coins, avoid enemies, reach the flag.</div>';

      const canvas = body.querySelector('.pf-canvas');
      const c = canvas.getContext('2d');
      const scoreEl = body.querySelector('.pf-score');
      const livesEl = body.querySelector('.pf-lives');
      const levelEl = body.querySelector('.pf-level');
      let score = 0, lives = 3, level = 1, running = true, raf = 0;
      const keys = {};

      const player = { x: 60, y: 300, w: 28, h: 34, vx: 0, vy: 0, onGround: false };

      function makeLevel(n) {
        const platforms = [
          { x: 0, y: 390, w: 720, h: 30 },
          { x: 120, y: 320, w: 120, h: 16 },
          { x: 280, y: 260, w: 100, h: 16 },
          { x: 420, y: 300, w: 110, h: 16 },
          { x: 560, y: 230, w: 120, h: 16 },
          { x: 60, y: 230, w: 80, h: 16 }
        ];
        const coins = [
          { x: 150, y: 290, r: 8, taken: false },
          { x: 310, y: 230, r: 8, taken: false },
          { x: 450, y: 270, r: 8, taken: false },
          { x: 590, y: 200, r: 8, taken: false },
          { x: 90, y: 200, r: 8, taken: false }
        ];
        const enemies = [
          { x: 300, y: 374, w: 26, h: 26, vx: 1.2, minX: 280, maxX: 380 },
          { x: 500, y: 374, w: 26, h: 26, vx: -1.0, minX: 470, maxX: 560 }
        ];
        const goal = { x: 650, y: 190, w: 30, h: 40 };
        return { platforms, coins, enemies, goal };
      }

      let L = makeLevel(level);

      function resetPlayer() { player.x = 60; player.y = 300; player.vx = 0; player.vy = 0; }

      function restart() {
        score = 0; lives = 3; level = 1; L = makeLevel(level);
        resetPlayer(); running = true; updateHud();
      }

      function updateHud() {
        scoreEl.textContent = score;
        livesEl.textContent = lives;
        levelEl.textContent = level;
      }

      function update() {
        if (!running) return;
        const left = keys['ArrowLeft'] || keys['a'] || keys['A'];
        const right = keys['ArrowRight'] || keys['d'] || keys['D'];
        if (left) player.vx = -4;
        else if (right) player.vx = 4;
        else player.vx *= 0.7;
        if ((keys[' '] || keys['ArrowUp'] || keys['w'] || keys['W']) && player.onGround) {
          player.vy = -11; player.onGround = false; keys[' '] = false;
        }
        player.vy += 0.6;
        player.x += player.vx;
        player.y += player.vy;
        if (player.x < 0) player.x = 0;
        if (player.x + player.w > 720) player.x = 720 - player.w;

        player.onGround = false;
        L.platforms.forEach(function (p) {
          if (player.x + player.w > p.x && player.x < p.x + p.w &&
              player.y + player.h > p.y && player.y + player.h < p.y + p.h + 12 && player.vy >= 0) {
            player.y = p.y - player.h;
            player.vy = 0;
            player.onGround = true;
          }
        });
        if (player.y > 420) {
          lives--; updateHud();
          if (lives <= 0) { running = false; }
          else resetPlayer();
        }

        L.coins.forEach(function (coin) {
          if (coin.taken) return;
          const dx = (player.x + player.w / 2) - coin.x;
          const dy = (player.y + player.h / 2) - coin.y;
          if (Math.hypot(dx, dy) < 20) { coin.taken = true; score += 10; updateHud(); }
        });

        L.enemies.forEach(function (e) {
          e.x += e.vx;
          if (e.x < e.minX || e.x + e.w > e.maxX) e.vx *= -1;
          if (player.x + player.w > e.x && player.x < e.x + e.w &&
              player.y + player.h > e.y && player.y < e.y + e.h) {
            lives--; updateHud();
            if (lives <= 0) running = false;
            else resetPlayer();
          }
        });

        const g = L.goal;
        if (player.x + player.w > g.x && player.x < g.x + g.w &&
            player.y + player.h > g.y && player.y < g.y + g.h) {
          level++; score += 50; L = makeLevel(level); resetPlayer(); updateHud();
        }
      }

      function draw() {
        c.fillStyle = '#87ceeb'; c.fillRect(0, 0, 720, 420);
        // hills
        c.fillStyle = '#5fa832'; c.beginPath(); c.ellipse(120, 400, 180, 60, 0, Math.PI, 2 * Math.PI); c.fill();
        c.fillStyle = '#4f9a2a'; c.beginPath(); c.ellipse(560, 410, 220, 70, 0, Math.PI, 2 * Math.PI); c.fill();
        L.platforms.forEach(function (p) {
          c.fillStyle = '#8b5a2b'; c.fillRect(p.x, p.y, p.w, p.h);
          c.fillStyle = '#5ebc4a'; c.fillRect(p.x, p.y, p.w, 4);
        });
        L.coins.forEach(function (coin) {
          if (coin.taken) return;
          c.fillStyle = '#ffd700'; c.beginPath(); c.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#b8860b'; c.stroke();
        });
        L.enemies.forEach(function (e) {
          c.fillStyle = '#d63a1b'; c.fillRect(e.x, e.y, e.w, e.h);
          c.fillStyle = '#fff'; c.fillRect(e.x + 4, e.y + 6, 6, 6); c.fillRect(e.x + e.w - 10, e.y + 6, 6, 6);
        });
        const g = L.goal;
        c.fillStyle = '#f4c542'; c.fillRect(g.x, g.y, g.w, 6);
        c.fillStyle = '#8b5a2b'; c.fillRect(g.x + g.w / 2 - 2, g.y + 6, 4, g.h - 6);
        // flag
        c.fillStyle = '#e33'; c.beginPath(); c.moveTo(g.x + g.w / 2 + 2, g.y + 8); c.lineTo(g.x + g.w / 2 + 22, g.y + 16); c.lineTo(g.x + g.w / 2 + 2, g.y + 24); c.closePath(); c.fill();
        // player
        c.fillStyle = '#2f6fd0'; c.fillRect(player.x, player.y, player.w, player.h);
        c.fillStyle = '#f0d0a0'; c.fillRect(player.x + 4, player.y + 4, player.w - 8, 12);
        c.fillStyle = '#fff'; c.fillRect(player.x + 6, player.y + 7, 4, 4); c.fillRect(player.x + player.w - 10, player.y + 7, 4, 4);
        if (!running) {
          c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, 0, 720, 420);
          c.fillStyle = '#fff'; c.font = 'bold 32px sans-serif'; c.textAlign = 'center';
          c.fillText('Game Over', 360, 200);
          c.font = '16px sans-serif'; c.fillText('Press Restart to play again', 360, 235);
        }
      }

      function loop() { update(); draw(); if (running) raf = requestAnimationFrame(loop); }
      raf = requestAnimationFrame(loop);

      function onKey(ev) {
        if (ev.key === ' ') ev.preventDefault();
        if (ev.type === 'keydown') keys[ev.key] = true;
        else keys[ev.key] = false;
      }
      canvas.addEventListener('keydown', onKey);
      canvas.addEventListener('keyup', onKey);
      body.addEventListener('keydown', onKey);
      body.querySelector('.pf-restart').addEventListener('click', function () { restart(); if (!raf) raf = requestAnimationFrame(loop); });

      canvas.focus();
      updateHud();

      return {
        onClose: function () { running = false; if (raf) cancelAnimationFrame(raf); return true; },
        destroy: function () { running = false; if (raf) cancelAnimationFrame(raf); }
      };
    }
  };
})();
