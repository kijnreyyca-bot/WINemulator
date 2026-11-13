/* WINemulator — tiny WebAudio synth (no audio files) */
(function () {
  'use strict';
  let ctx = null, master = null, noiseBuf = null, armedStartup = false, armedAt = 0;

  function supported() { return !!(window.AudioContext || window.webkitAudioContext); }

  function ensure() {
    if (!supported()) return false;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.7);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function level() {
    if (Win.store.get('sound') === false) return 0;
    return Math.max(0, Math.min(1, Win.store.get('volume'))) * 0.5;
  }

  function note(freq, delay, dur, type, gain, endFreq) {
    if (!ensure() || level() <= 0) return;
    const t = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + dur);
    const peak = Math.max(0.0001, (gain == null ? 0.12 : gain) * level());
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise(delay, dur, gain, cutoff) {
    if (!ensure() || level() <= 0) return;
    const t = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff || 1200, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0001, (gain || 0.18) * level()), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  }

  const presets = {
    startup: function () {
      [392, 523.25, 659.25, 783.99].forEach(function (f, i) { note(f, i * 0.14, 0.55, 'triangle', 0.14); });
      note(1046.5, 0.56, 0.9, 'sine', 0.1);
      note(523.25, 0.56, 1.0, 'triangle', 0.05);
      note(783.99, 0.56, 1.0, 'triangle', 0.04);
    },
    shutdown: function () {
      [659.25, 523.25, 392, 261.63].forEach(function (f, i) { note(f, i * 0.16, 0.5, 'triangle', 0.12); });
      noise(0.7, 0.35, 0.03, 600);
    },
    logoff: function () { note(523.25, 0, 0.18, 'sine', 0.1); note(392, 0.14, 0.3, 'sine', 0.09); },
    click: function () { note(1500, 0, 0.025, 'square', 0.035); },
    menu: function () { note(1050, 0, 0.02, 'square', 0.025); },
    open: function () { note(660, 0, 0.07, 'triangle', 0.07); note(990, 0.06, 0.1, 'triangle', 0.06); },
    close: function () { note(620, 0, 0.08, 'triangle', 0.06, 380); },
    minimize: function () { note(500, 0, 0.09, 'sine', 0.05, 280); },
    restore: function () { note(320, 0, 0.09, 'sine', 0.05, 560); },
    error: function () { note(220, 0, 0.16, 'square', 0.09); note(180, 0.2, 0.24, 'square', 0.09); },
    ding: function () { note(880, 0, 0.3, 'sine', 0.12); note(1320, 0.01, 0.22, 'sine', 0.04); },
    notify: function () { note(1046.5, 0, 0.12, 'sine', 0.08); note(1318.5, 0.1, 0.2, 'sine', 0.07); },
    flag: function () { note(1244, 0, 0.03, 'square', 0.03); },
    explode: function () { noise(0, 0.5, 0.35, 1600); note(70, 0, 0.4, 'sawtooth', 0.08, 40); },
    win: function () { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { note(f, i * 0.09, 0.4, 'triangle', 0.12); }); },
    boot: function () { note(1000, 0, 0.14, 'square', 0.06); },
    type: function () { note(1900, 0, 0.012, 'square', 0.012); },
    save: function () { note(740, 0, 0.07, 'sine', 0.06); note(1100, 0.06, 0.12, 'sine', 0.05); }
  };

  Win.sound = {
    play: function (name) {
      const fn = presets[name];
      if (!fn) return;
      try { fn(); } catch (e) {}
    },
    unlock: function () {
      const ok = ensure();
      if (!ok) return;
      if (armedStartup && Date.now() - armedAt < 120000) {
        armedStartup = false;
        Win.sound.play('startup');
      }
    },
    armStartup: function () { armedStartup = true; armedAt = Date.now(); },
    setVolume: function () { if (ctx && master) master.gain.value = 1; },
    get context() { return ctx; }
  };
})();
