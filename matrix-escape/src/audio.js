/**
 * Tiny WebAudio synth for game SFX — no assets, a few oscillator/noise
 * envelopes. Everything is defensive: without an AudioContext (old browser,
 * tests, or before the first user gesture) every call is a silent no-op.
 */

var ctx = null;
var master = null;
var noiseBuf = null;
var enabled = true;
var slowMoMusic = null;

/** Create/resume the context. Must be called from a user gesture. */
function initAudio() {
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.25;
      master.connect(ctx.destination);
      var len = ctx.sampleRate * 0.5;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
  } catch {
    ctx = null;
  }
}

function setAudioEnabled(on) {
  enabled = !!on;
  if (!on) stopSlowMoMusic();
}

/** Freeze/unfreeze all sound with the game's pause state. Suspending the
 * context silences in-flight and scheduled sounds and resumes them in place. */
function setAudioPaused(paused) {
  if (!ctx) return;
  try {
    if (paused) ctx.suspend();
    else if (enabled) ctx.resume();
  } catch {
    /* ok */
  }
}

function ready() {
  return enabled && ctx && ctx.state === "running";
}

/** One oscillator blip: type, start/end frequency, duration, peak gain. */
function blip(type, f0, f1, dur, peak, delay) {
  if (!ready()) return;
  var t = ctx.currentTime + (delay || 0);
  var o = ctx.createOscillator();
  var g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Filtered noise burst for percussive sounds. */
function thump(filterFreq, dur, peak, delay) {
  if (!ready()) return;
  var t = ctx.currentTime + (delay || 0);
  var src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  var f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = filterFreq;
  var g = ctx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function shoot() {
  thump(3200, 0.09, 0.7);
  blip("square", 900, 120, 0.08, 0.25);
}

function machineGunShot() {
  thump(2600, 0.06, 0.5);
  blip("square", 700, 150, 0.05, 0.18);
}

function pickup() {
  blip("sine", 620, 1240, 0.12, 0.3);
  blip("sine", 930, 1860, 0.16, 0.22, 0.07);
}

function doorOpen() {
  thump(300, 0.5, 0.5);
  blip("sine", 90, 45, 0.5, 0.35);
}

function punch() {
  thump(700, 0.12, 0.8);
  blip("sine", 160, 60, 0.1, 0.4);
}

function playerHit() {
  thump(500, 0.2, 0.6);
  blip("sawtooth", 220, 70, 0.18, 0.25);
}

function agentDown() {
  blip("sawtooth", 420, 40, 0.35, 0.3);
  thump(900, 0.25, 0.4, 0.05);
}

/**
 * Matrix Time music: a driving ~150 BPM D-minor groove — 16th-note arpeggio,
 * eighth-note bass pulse, off-beat hat ticks over a detuned pad — scheduled
 * for the full 7s window and faded out early on stop.
 */
var SLOWMO_STEP = 0.15; // 16th note at ~100 BPM double-time feel
var SLOWMO_LEN = 7.4;

function startSlowMoMusic() {
  if (!ready() || slowMoMusic) return;
  var t0 = ctx.currentTime;
  var out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.exponentialRampToValueAtTime(1, t0 + 0.2);
  var lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2600;
  out.connect(lp);
  lp.connect(master);

  var sources = [];
  function tone(type, freq, at, dur, peak) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(peak, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(g);
    g.connect(out);
    o.start(at);
    o.stop(at + dur + 0.02);
    sources.push(o);
  }

  // Pad: D3 / F3 / A3 triangles, slightly detuned pairs for width
  var padFreqs = [146.83, 174.61, 220.0];
  for (var i = 0; i < padFreqs.length; i++) {
    for (var d = -1; d <= 1; d += 2) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = padFreqs[i];
      o.detune.value = d * 5;
      g.gain.value = 0.035;
      o.connect(g);
      g.connect(out);
      o.start(t0);
      o.stop(t0 + SLOWMO_LEN);
      sources.push(o);
    }
  }

  var steps = Math.floor((SLOWMO_LEN - 0.4) / SLOWMO_STEP);
  // Arpeggio: two-octave D-minor up/down run, one pluck per 16th
  var arp = [293.66, 349.23, 440.0, 587.33, 698.46, 587.33, 440.0, 349.23];
  // Bass: eighth-note pulse walking D2-D2-F2-A2
  var bass = [73.42, 73.42, 87.31, 110.0];
  for (var n = 0; n < steps; n++) {
    var at = t0 + 0.1 + n * SLOWMO_STEP;
    tone("sine", arp[n % arp.length], at, 0.14, 0.11);
    if (n % 2 === 0) tone("sine", bass[(n / 2) % bass.length], at, 0.26, 0.16);
    // Off-beat hat: a tiny high blip between bass pulses for drive
    if (n % 2 === 1) tone("square", 5200, at, 0.03, 0.02);
  }
  slowMoMusic = { out: out, sources: sources };
}

function stopSlowMoMusic() {
  if (!slowMoMusic || !ctx) return;
  var m = slowMoMusic;
  slowMoMusic = null;
  try {
    var t = ctx.currentTime;
    m.out.gain.cancelScheduledValues(t);
    m.out.gain.setValueAtTime(Math.max(m.out.gain.value, 0.0001), t);
    m.out.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    for (var i = 0; i < m.sources.length; i++) m.sources[i].stop(t + 0.4);
  } catch {
    /* already stopped */
  }
}

function winSting() {
  blip("sine", 440, 880, 0.3, 0.3);
  blip("sine", 660, 1320, 0.35, 0.25, 0.15);
  blip("sine", 880, 1760, 0.5, 0.2, 0.3);
}

function caughtSting() {
  blip("sawtooth", 300, 60, 0.6, 0.35);
  thump(400, 0.6, 0.5, 0.05);
}

export {
  initAudio,
  setAudioEnabled,
  setAudioPaused,
  shoot,
  machineGunShot,
  pickup,
  doorOpen,
  punch,
  playerHit,
  agentDown,
  startSlowMoMusic,
  stopSlowMoMusic,
  winSting,
  caughtSting
};
