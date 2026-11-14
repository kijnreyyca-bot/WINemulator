/* WINemulator — Road Rush (a Forza-like driving game with semi-realistic physics) */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  /* ------------------------------ track ------------------------------ */
  const ROAD_HALF = 4.2;
  const TRACK = [
    {x:0,z:0},{x:0,z:25},{x:8,z:38},{x:22,z:42},{x:38,z:36},
    {x:46,z:22},{x:44,z:6},{x:34,z:-6},{x:20,z:-10},{x:8,z:-6},
    {x:0,z:0}
  ];

  /* ------------------------------ car model ------------------------------ */
  const CAR = {
    wheelbase: 2.6,
    maxSpeed: 46,        // m/s
    maxReverse: 12,
    accel: 14,           // m/s^2
    brake: 22,
    engineBrake: 4,
    maxSteer: 0.55,      // rad
    steerRate: 4.5,
    steerReturn: 6,
    grip: 0.85,
    driftGrip: 0.35,
    offTrackDrag: 0.85,
    mass: 1200
  };

  const KEY = {};
  let audioCtx = null, engineOsc = null, engineGain = null;

  function startAudio() {
    try {
      if (audioCtx) return;
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = audioCtx.createOscillator();
      engineGain = audioCtx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain.gain.value = 0.04;
      engineOsc.connect(engineGain).connect(audioCtx.destination);
      engineOsc.start();
    } catch (e) {}
  }
  function stopAudio() {
    try { if (engineOsc) engineOsc.stop(); } catch (e) {}
    engineOsc = null; engineGain = null; audioCtx = null;
  }
  function updateAudio(speed) {
    if (!engineOsc) return;
    const rpm = 0.35 + Math.abs(speed) / CAR.maxSpeed * 0.65;
    engineOsc.frequency.value = 55 + rpm * 110;
    engineGain.gain.value = 0.03 + Math.abs(speed) / CAR.maxSpeed * 0.06;
  }

  function resetCar(state) {
    state.x = 0; state.z = 2; state.yaw = 0; state.speed = 0;
    state.steer = 0; state.vx = 0; state.vz = 0;
    state.offTrack = false; state.drift = 0;
    state.lapStart = performance.now(); state.lastLap = 0; state.bestLap = 0;
    state.lapCount = 0; state.crossed = false;
  }

  function distToTrack(x, z) {
    let best = 1e9;
    for (let i = 0; i < TRACK.length - 1; i++) {
      const a = TRACK[i], b = TRACK[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len2 = dx * dx + dz * dz;
      let t = ((x - a.x) * dx + (z - a.z) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + dx * t, pz = a.z + dz * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < best) best = d;
    }
    return best;
  }

  function updateCar(s, dt) {
    const throttle = (KEY['w'] || KEY['ArrowUp']) ? 1 : 0;
    const brake = (KEY['s'] || KEY['ArrowDown']) ? 1 : 0;
    const steerIn = ((KEY['a'] || KEY['ArrowLeft']) ? 1 : 0) + ((KEY['d'] || KEY['ArrowRight']) ? -1 : 0);
    const handbrake = !!KEY[' '];

    s.offTrack = distToTrack(s.x, s.z) > ROAD_HALF + 1.6;

    // longitudinal
    let accel = 0;
    if (throttle) accel += CAR.accel;
    if (brake) accel -= CAR.brake;
    if (!throttle && !brake) accel -= Math.sign(s.speed) * CAR.engineBrake;
    if (s.offTrack) accel *= 0.55;
    s.speed += accel * dt;
    // clamp
    if (s.speed > CAR.maxSpeed) s.speed = CAR.maxSpeed;
    if (s.speed < -CAR.maxReverse) s.speed = -CAR.maxReverse;
    if (Math.abs(s.speed) < 0.05 && !throttle && !brake) s.speed = 0;

    // steering target
    const speedFactor = Math.min(1, Math.abs(s.speed) / 6);
    const steerScale = 1 - Math.min(0.55, Math.abs(s.speed) / CAR.maxSpeed * 0.55);
    let targetSteer = steerIn * CAR.maxSteer * steerScale;
    if (handbrake) targetSteer *= 1.35;
    const rate = steerIn !== 0 ? CAR.steerRate : CAR.steerReturn;
    s.steer += (targetSteer - s.steer) * Math.min(1, rate * dt);

    // drift
    const slip = Math.abs(s.steer) * Math.abs(s.speed);
    if (slip > 6 && Math.abs(s.speed) > 12) {
      s.drift = Math.min(1, s.drift + dt * 2);
    } else {
      s.drift = Math.max(0, s.drift - dt * 3);
    }

    // yaw rate (bicycle model) + drift oversteer
    let yawRate = (s.speed / CAR.wheelbase) * Math.tan(s.steer);
    if (s.drift > 0.2 && steerIn !== 0) {
      yawRate += steerIn * s.drift * 1.6 * Math.abs(s.speed) / CAR.wheelbase;
    }
    if (handbrake) yawRate *= 1.5;
    s.yaw += yawRate * dt;

    // grip: reduce speed slightly when drifting
    if (s.drift > 0.3) s.speed *= (1 - s.drift * 0.04 * dt * 60 * 0.5);

    // off-track drag
    if (s.offTrack) s.speed *= (1 - CAR.offTrackDrag * dt);

    // position
    s.x += Math.sin(s.yaw) * s.speed * dt;
    s.z += Math.cos(s.yaw) * s.speed * dt;

    // lap detection (cross start line going forward)
    const nearStart = Math.hypot(s.x - 0, s.z - 0) < 6 && s.z > 0 && s.z < 12;
    const movingFwd = Math.cos(s.yaw) > 0.3 && s.speed > 5;
    if (nearStart && movingFwd && !s.crossed && (performance.now() - s.lapStart) > 4000) {
      s.crossed = true;
      const now = performance.now();
      const lap = (now - s.lapStart) / 1000;
      s.lastLap = lap;
      if (!s.bestLap || lap < s.bestLap) s.bestLap = lap;
      s.lapCount++;
      s.lapStart = now;
    }
    if (!nearStart) s.crossed = false;

    updateAudio(s.speed);
  }

  /* ------------------------------ rendering ------------------------------ */
  function project(cam, wx, wy, wz, canvas) {
    const dx = wx - cam.x, dy = wy - cam.y, dz = wz - cam.z;
    const cx = dx * cam.rx + dy * cam.ry + dz * cam.rz;
    const cy = dx * cam.ux + dy * cam.uy + dz * cam.uz;
    let cz = dx * cam.fx + dy * cam.fy + dz * cam.fz;
    if (cz < 0.3) cz = 0.3; // keep geometry behind the camera visible
    const f = canvas.height * 0.9;
    return { x: cx / cz * f + canvas.width / 2, y: -cy / cz * f + canvas.height / 2, z: cz, scale: f / cz };
  }

  function draw(ctx2, canvas, s) {
    const w = canvas.width, h = canvas.height;
    // sky
    const grad = ctx2.createLinearGradient(0, 0, 0, h * 0.5);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#3b82f6');
    grad.addColorStop(1, '#93c5fd');
    ctx2.fillStyle = grad;
    ctx2.fillRect(0, 0, w, h * 0.5);
    // ground base gradient
    const ggrad = ctx2.createLinearGradient(0, h * 0.45, 0, h);
    ggrad.addColorStop(0, '#1f5f1f');
    ggrad.addColorStop(0.4, '#2d7a2d');
    ggrad.addColorStop(1, '#1a4a1a');
    ctx2.fillStyle = ggrad;
    ctx2.fillRect(0, h * 0.5, w, h * 0.5);
    // grass tufts
    ctx2.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 60; i++) {
      const gx = (i * 97 + 13) % w;
      const gy = h * 0.48 + (i * 53 % (h * 0.5));
      ctx2.fillRect(gx, gy, 2, 3);
    }
    ctx2.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 40; i++) {
      const gx = (i * 137 + 7) % w;
      const gy = h * 0.5 + (i * 89 % (h * 0.45));
      ctx2.fillRect(gx, gy, 1, 2);
    }

    // camera
    const carFwd = { x: Math.sin(s.yaw), z: Math.cos(s.yaw) };
    const camPos = { x: s.x - carFwd.x * 13, y: 5.2, z: s.z - carFwd.z * 13 };
    const look = { x: s.x - camPos.x, y: 0 - camPos.y, z: s.z - camPos.z };
    const lookLen = Math.hypot(look.x, look.y, look.z);
    const fx = look.x / lookLen, fy = look.y / lookLen, fz = look.z / lookLen;
    // right = cross(f, upWorld)
    const ux = 0, uy = 1, uz = 0;
    let rx = fy * uz - fz * uy;
    let ry = fz * ux - fx * uz;
    let rz = fx * uy - fy * ux;
    const rlen = Math.hypot(rx, ry, rz) || 1;
    rx /= rlen; ry /= rlen; rz /= rlen;
    // up = cross(right, forward)
    const ux2 = ry * fz - rz * fy;
    const uy2 = rz * fx - rx * fz;
    const uz2 = rx * fy - ry * fx;
    const cam = { x: camPos.x, y: camPos.y, z: camPos.z,
      fx: fx, fy: fy, fz: fz,
      rx: rx, ry: ry, rz: rz,
      ux: ux2, uy: uy2, uz: uz2 };

    // track segments
    for (let i = 0; i < TRACK.length - 1; i++) {
      const a = TRACK[i], b = TRACK[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len, nz = dx / len;
      // cull segments far behind the camera
      const midCz = (a.x + b.x) / 2 - cam.x, midCzz = (a.z + b.z) / 2 - cam.z;
      const depth = midCz * cam.fx + midCzz * cam.fz;
      if (depth < -12) continue;
      const pts = [
        { x: a.x + nx * ROAD_HALF, y: 0, z: a.z + nz * ROAD_HALF },
        { x: a.x - nx * ROAD_HALF, y: 0, z: a.z - nz * ROAD_HALF },
        { x: b.x - nx * ROAD_HALF, y: 0, z: b.z - nz * ROAD_HALF },
        { x: b.x + nx * ROAD_HALF, y: 0, z: b.z + nz * ROAD_HALF }
      ];
      const proj = pts.map(p => project(cam, p.x, p.y, p.z, canvas));
      // road
      ctx2.fillStyle = (i % 2 === 0) ? '#4b5563' : '#374151';
      ctx2.beginPath();
      ctx2.moveTo(proj[0].x, proj[0].y);
      ctx2.lineTo(proj[1].x, proj[1].y);
      ctx2.lineTo(proj[2].x, proj[2].y);
      ctx2.lineTo(proj[3].x, proj[3].y);
      ctx2.closePath();
      ctx2.fill();
      // center line dash (approx)
      if (i % 2 === 0) {
        const m0 = project(cam, (a.x + b.x) / 2, 0.02, (a.z + b.z) / 2, canvas);
        if (m0) {
          ctx2.fillStyle = '#fbbf24';
          ctx2.fillRect(m0.x - 1, m0.y - 1, 2, 2);
        }
      }
      // barriers
      ctx2.strokeStyle = (i % 3 === 0) ? '#dc2626' : '#f9fafb';
      ctx2.lineWidth = Math.max(1, proj[0].scale * 0.15);
      ctx2.beginPath();
      ctx2.moveTo(proj[0].x, proj[0].y);
      ctx2.lineTo(proj[3].x, proj[3].y);
      ctx2.stroke();
      ctx2.strokeStyle = (i % 3 === 0) ? '#f9fafb' : '#dc2626';
      ctx2.beginPath();
      ctx2.moveTo(proj[1].x, proj[1].y);
      ctx2.lineTo(proj[2].x, proj[2].y);
      ctx2.stroke();
    }

    // car
    const hw = 1, hl = 2.2;
    const cos = Math.cos(s.yaw), sin = Math.sin(s.yaw);
    const corners = [
      { x: s.x + sin * hl + cos * hw, z: s.z + cos * hl - sin * hw },
      { x: s.x + sin * hl - cos * hw, z: s.z + cos * hl + sin * hw },
      { x: s.x - sin * hl - cos * hw, z: s.z - cos * hl + sin * hw },
      { x: s.x - sin * hl + cos * hw, z: s.z - cos * hl - sin * hw }
    ];
    const cproj = corners.map(c => project(cam, c.x, 0.4, c.z, canvas));
    if (cproj.every(p => p)) {
      ctx2.fillStyle = s.drift > 0.3 ? '#f97316' : '#dc2626';
      ctx2.beginPath();
      ctx2.moveTo(cproj[0].x, cproj[0].y);
      for (let i = 1; i < cproj.length; i++) ctx2.lineTo(cproj[i].x, cproj[i].y);
      ctx2.closePath();
      ctx2.fill();
      ctx2.strokeStyle = '#111';
      ctx2.lineWidth = 1;
      ctx2.stroke();
      // windshield
      const w0 = project(cam, s.x + sin * 0.6 + cos * 0.9, 0.55, s.z + cos * 0.6 - sin * 0.9, canvas);
      const w1 = project(cam, s.x + sin * 0.6 - cos * 0.9, 0.55, s.z + cos * 0.6 + sin * 0.9, canvas);
      const w2 = project(cam, s.x + sin * 1.6 - cos * 0.9, 0.55, s.z + cos * 1.6 + sin * 0.9, canvas);
      const w3 = project(cam, s.x + sin * 1.6 + cos * 0.9, 0.55, s.z + cos * 1.6 - sin * 0.9, canvas);
      if (w0 && w1 && w2 && w3) {
        ctx2.fillStyle = '#93c5fd';
        ctx2.beginPath();
        ctx2.moveTo(w0.x, w0.y); ctx2.lineTo(w1.x, w1.y);
        ctx2.lineTo(w2.x, w2.y); ctx2.lineTo(w3.x, w3.y);
        ctx2.closePath(); ctx2.fill();
      }
    }

    // drift smoke
    if (s.drift > 0.35) {
      ctx2.fillStyle = 'rgba(200,200,200,0.35)';
      ctx2.beginPath();
      ctx2.arc(w / 2, h * 0.72, 18 + s.drift * 30, 0, Math.PI * 2);
      ctx2.fill();
    }

    // HUD
    ctx2.fillStyle = 'rgba(0,0,0,0.55)';
    ctx2.fillRect(10, 10, 200, 78);
    ctx2.fillStyle = '#fff';
    ctx2.font = 'bold 13px Tahoma, sans-serif';
    ctx2.fillText('ROAD RUSH', 18, 28);
    ctx2.font = '11px Tahoma, sans-serif';
    const kmh = Math.round(Math.abs(s.speed) * 3.6);
    ctx2.fillText('Speed: ' + kmh + ' km/h', 18, 46);
    const gear = s.speed < 0 ? 'R' : (kmh < 30 ? '1' : kmh < 60 ? '2' : kmh < 95 ? '3' : kmh < 130 ? '4' : '5');
    ctx2.fillText('Gear: ' + gear, 18, 62);
    ctx2.fillText('Lap: ' + s.lapCount, 18, 78);
    if (s.lastLap) ctx2.fillText('Last: ' + s.lastLap.toFixed(2) + 's', 110, 46);
    if (s.bestLap) ctx2.fillText('Best: ' + s.bestLap.toFixed(2) + 's', 110, 62);
    if (s.offTrack) {
      ctx2.fillStyle = '#fbbf24';
      ctx2.font = 'bold 14px Tahoma, sans-serif';
      ctx2.fillText('OFF TRACK', w / 2 - 40, h * 0.12);
    }
    if (s.drift > 0.3) {
      ctx2.fillStyle = '#f97316';
      ctx2.font = 'bold 13px Tahoma, sans-serif';
      ctx2.fillText('DRIFT!', w / 2 - 30, h * 0.18);
    }

    // controls hint
    ctx2.fillStyle = 'rgba(255,255,255,0.5)';
    ctx2.font = '10px Tahoma, sans-serif';
    ctx2.fillText('W/S or arrows: throttle/brake   A/D: steer   Space: handbrake   R: reset   P: pause', 10, h - 8);
  }

  Win.apps.drive = {
    name: 'Road Rush', title: 'Road Rush', icon: 'car',
    width: 920, height: 660, minWidth: 640, minHeight: 460,
    mount: function (body, ctx) {
      body.classList.add('app-drive');
      body.innerHTML =
        '<canvas class="drive-canvas" tabindex="0"></canvas>' +
        '<div class="drive-overlay" hidden></div>';
      const canvas = body.querySelector('.drive-canvas');
      const overlay = body.querySelector('.drive-overlay');
      const cctx = canvas.getContext('2d');

      const state = {};
      resetCar(state);
      let running = true, paused = false, raf = 0, last = performance.now();

      function resize() {
        const r = body.getBoundingClientRect();
        canvas.width = Math.max(320, Math.floor(r.width));
        canvas.height = Math.max(240, Math.floor(r.height));
      }
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(body);

      function loop(now) {
        if (!running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!paused) updateCar(state, dt);
        draw(cctx, canvas, state);
        if (paused) {
          cctx.fillStyle = 'rgba(0,0,0,0.5)';
          cctx.fillRect(0, 0, canvas.width, canvas.height);
          cctx.fillStyle = '#fff';
          cctx.font = 'bold 28px Tahoma, sans-serif';
          cctx.textAlign = 'center';
          cctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
          cctx.textAlign = 'left';
        }
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);

      function onKey(e, down) {
        const k = e.key;
        if (k === 'p' || k === 'P') { if (down) paused = !paused; e.preventDefault(); return; }
        if (k === 'r' || k === 'R') { if (down) resetCar(state); e.preventDefault(); return; }
        if (['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].indexOf(k) > -1) {
          KEY[k] = down;
          e.preventDefault();
        }
      }
      const kd = function (e) { onKey(e, true); };
      const ku = function (e) { onKey(e, false); };
      window.addEventListener('keydown', kd);
      window.addEventListener('keyup', ku);
      canvas.addEventListener('pointerdown', function () { canvas.focus(); startAudio(); });

      ctx.setTitle('Road Rush');
      if (Win.isXP) ctx.setIcon('car');

      return {
        destroy: function () {
          running = false;
          cancelAnimationFrame(raf);
          ro.disconnect();
          window.removeEventListener('keydown', kd);
          window.removeEventListener('keyup', ku);
          Object.keys(KEY).forEach(function (k) { KEY[k] = false; });
          stopAudio();
        }
      };
    }
  };
})();
