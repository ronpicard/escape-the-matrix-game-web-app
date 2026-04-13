import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

var RAIN_CHARS = "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFZ";
function MatrixRain({ color }) {
  var canvasRef = useRef(null);
  useEffect(function () {
    var cv = canvasRef.current;
    if (!cv) return;
    var ctx = cv.getContext("2d", { alpha: true, desynchronized: true });
    var parent = cv.parentElement;
    var lowFi =
      ("ontouchstart" in window) ||
      (navigator.maxTouchPoints > 0) ||
      (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 768px)").matches);
    var colW = lowFi ? 22 : 14;
    var fontPx = lowFi ? 11 : 12;
    var w = 0;
    var h = 0;
    var cols = 0;
    var drops = [];
    var col = color || "#00ff41";
    var animId;
    var frameSkip = 0;
    function layout() {
      if (!parent) return;
      var dpr = Math.min(window.devicePixelRatio || 1, lowFi ? 1 : 3);
      var bw = Math.max(32, Math.floor(parent.clientWidth * dpr * (lowFi ? 0.55 : 1)));
      var bh = Math.max(32, Math.floor(parent.clientHeight * dpr * (lowFi ? 0.55 : 1)));
      w = bw;
      h = bh;
      cv.width = bw;
      cv.height = bh;
      cols = Math.floor(w / colW);
      drops.length = 0;
      for (var i = 0; i < cols; i++) drops.push(Math.random() * h / colW);
    }
    layout();
    var onResize = function () {
      layout();
    };
    window.addEventListener("resize", onResize);
    function draw() {
      animId = requestAnimationFrame(draw);
      if (lowFi && (++frameSkip & 1)) return;
      if (!w || !h) return;
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = fontPx + "px monospace";
      for (var i2 = 0; i2 < cols; i2++) {
        var ch = RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
        var x = i2 * colW;
        var y = drops[i2] * colW;
        ctx.fillStyle = Math.random() > 0.8 ? "#ffffff" : col;
        ctx.globalAlpha = 0.4 + Math.random() * 0.6;
        ctx.fillText(ch, x, y);
        ctx.globalAlpha = 1;
        if (y > h && Math.random() > 0.975) drops[i2] = 0;
        drops[i2] += 0.5 + Math.random() * 0.5;
      }
    }
    draw();
    return function () {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [color]);
  return React.createElement("canvas", { ref: canvasRef, style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, imageRendering: "auto" } });
}

var ROOM_H = 7;
var ROOM_SIZE = 14;
var MOVE_SPEED = 3.5;
var SPRINT_MULT = 1.6;
var MOUSE_SENS = 0.009;
var LOOK_RATE = 4.5;
var JOY_RADIUS = 22;
var CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFZ";

var COLOR_MAP = { green: 0x00ff41, red: 0xff3333, blue: 0x3399ff };
var COLOR_CSS = { green: "#00ff41", red: "#ff3333", blue: "#3399ff" };

var ROOMS = [
  { id: 0, name: "Hub", x: 0, z: 0 },
  { id: 1, name: "Office", x: 14, z: 0 },
  { id: 2, name: "Server Room", x: 0, z: -14 },
  { id: 3, name: "Archive", x: -14, z: 0 },
  { id: 4, name: "Exit Hall", x: 0, z: 14 }
];

var TRINITY_X0 = 0;
var TRINITY_X1 = 14;
var TRINITY_Z0 = 42;
var TRINITY_Z1 = 70;
var TRINITY_RW = TRINITY_X1 - TRINITY_X0;
var TRINITY_RD = TRINITY_Z1 - TRINITY_Z0;
var TRINITY_HALL_Z0 = 28;
var TRINITY_HALL_LEN = TRINITY_Z1 - TRINITY_HALL_Z0;
var TRINITY_HALL_ZC = (TRINITY_HALL_Z0 + TRINITY_Z1) * 0.5;
var TRINITY_ENTRY_Z = 42.08;
var TRINITY_DOORWAY_X0 = 5.05;
var TRINITY_DOORWAY_X1 = 8.95;
/** Straight run to north exit after dialogue (center of doorway). */
var TRINITY_EXIT_DOOR_X = 7;
var TRINITY_EXIT_DOOR_Z = TRINITY_Z1 - 0.55;

/** Betrayal path: freeze further south so the exit door reads behind Morpheus (portal ~ Z1−0.24). */
var TRINITY_BETRAYAL_MORPHEUS_Z_FAR = TRINITY_Z1 - 4.48;
var TRINITY_BETRAYAL_MORPHEUS_Z_NEAR = TRINITY_Z1 - 2.88;
/** In the room, south of the portal — reads “in front of” the exit glow from the corridor. */
var MORPHEUS_BETRAYAL_SPAWN_Z = TRINITY_Z1 - 0.5;
/** Stay mostly between player and door; slight north drift allowed while walking. */
var MORPHEUS_BETRAYAL_WALK_MAX_Z = TRINITY_Z1 - 0.32;
var MORPHEUS_BETRAYAL_STOP_DIST = 1.95;

/** Smith spawns at north (exit) doorway, walks south into the room, then monologue. */
var SMITH_EXIT_ENTER_Z = TRINITY_Z1 - 0.72;
var SMITH_EXIT_STOP_Z = TRINITY_Z1 - 2.65;
var SMITH_EXIT_WALK_SPEED = 3.35;

var EXIT_HALL_CASE_X = 7;
var EXIT_HALL_CASE_Z = 21;
var MG_FIRE_INTERVAL = 0.082;

var AGENT_HP = 3;

var PLAYER_HP_MAX = 100;
var PLAYER_BULLET_DAMAGE = 36;
/** Smith brawl: 5 hits × 20 = 100 — die on the 5th punch from full HP. */
var PLAYER_SMITH_PUNCH_DAMAGE = 20;
var PLAYER_HP_REGEN_PER_SEC = 15;
var PLAYER_HP_REGEN_DELAY = 2.5;

var WALL_SEGS = [
  { a: "z", p: 0, mn: 0, mx: 5.25 }, { a: "z", p: 0, mn: 8.75, mx: 14 },
  { a: "x", p: 14, mn: 0, mx: 5.25 }, { a: "x", p: 14, mn: 8.75, mx: 14 },
  { a: "z", p: 14, mn: 0, mx: 5.25 }, { a: "z", p: 14, mn: 8.75, mx: 14 },
  { a: "x", p: 0, mn: 0, mx: 5.25 }, { a: "x", p: 0, mn: 8.75, mx: 14 },
  { a: "z", p: 0, mn: 14, mx: 28 }, { a: "x", p: 28, mn: 0, mx: 14 }, { a: "z", p: 14, mn: 14, mx: 28 },
  { a: "z", p: -14, mn: 0, mx: 14 }, { a: "x", p: 14, mn: -14, mx: 0 }, { a: "x", p: 0, mn: -14, mx: 0 },
  { a: "z", p: 0, mn: -14, mx: 0 }, { a: "z", p: 14, mn: -14, mx: 0 }, { a: "x", p: -14, mn: 0, mx: 14 },
  { a: "x", p: 14, mn: 14, mx: 28 }, { a: "z", p: 28, mn: 0, mx: 5 }, { a: "z", p: 28, mn: 9, mx: 14 }, { a: "x", p: 0, mn: 14, mx: 28 },
  // Escape hallway walls (narrow, z=28–42)
  { a: "x", p: 5, mn: 28, mx: 42 }, { a: "x", p: 9, mn: 28, mx: 42 },
  { a: "z", p: 42, mn: TRINITY_X0, mx: 5 }, { a: "z", p: 42, mn: 9, mx: TRINITY_X1 },
  { a: "x", p: TRINITY_X0, mn: TRINITY_Z0, mx: TRINITY_Z1 }, { a: "x", p: TRINITY_X1, mn: TRINITY_Z0, mx: TRINITY_Z1 }
];

var DOOR_DEFS = [
  { id: "green", a: "z", p: 0, mn: 5.25, mx: 8.75, cx: 7, cz: -0.5 },
  { id: "red", a: "x", p: 0, mn: 5.25, mx: 8.75, cx: -0.5, cz: 7 },
  { id: "blue", a: "z", p: 14, mn: 5.25, mx: 8.75, cx: 7, cz: 14.5 }
];

var KEY_DEFS = [
  { id: "green", rx: 14, rz: 0 },
  { id: "red", rx: 0, rz: -14 },
  { id: "blue", rx: -14, rz: 0 }
];

var FURNITURE = [
  // Hub - central console, server racks
  { x: 7, z: 7, w: 2.5, d: 1.2, h: 1 }, { x: 3, z: 3, w: 1, d: 0.5, h: 2.5 },
  { x: 11, z: 11, w: 1, d: 0.5, h: 2.5 },
  // Office - desks with monitors on top
  { x: 19, z: 3, w: 3, d: 1.5, h: 0.8 }, { x: 19, z: 11, w: 3, d: 1.5, h: 0.8 },
  { x: 17, z: 3, w: 0.05, d: 0.05, h: 0.55, yo: 0.5 }, { x: 17, z: 11, w: 0.05, d: 0.05, h: 0.55, yo: 0.5 },
  { x: 19, z: 3, w: 0.7, d: 0.15, h: 0.55, yo: 0.8 }, { x: 19, z: 11, w: 0.7, d: 0.15, h: 0.55, yo: 0.8 },
  { x: 26, z: 7, w: 0.5, d: 3, h: 2 },
  // Server Room - server racks, desk with monitor
  { x: 3, z: -4, w: 1, d: 3, h: 3 }, { x: 7, z: -4, w: 1, d: 3, h: 3 },
  { x: 11, z: -4, w: 1, d: 3, h: 3 }, { x: 7, z: -11, w: 2, d: 1, h: 0.8 },
  { x: 7, z: -11, w: 0.7, d: 0.15, h: 0.5, yo: 0.8 },
  // Archive - filing cabinets, shelves
  { x: -3, z: 3, w: 0.8, d: 0.5, h: 1.8 }, { x: -3, z: 5, w: 0.8, d: 0.5, h: 1.8 },
  { x: -3, z: 7, w: 0.8, d: 0.5, h: 1.8 }, { x: -3, z: 9, w: 0.8, d: 0.5, h: 1.8 },
  { x: -10, z: 7, w: 0.5, d: 4, h: 2.2 }, { x: -10, z: 3, w: 0.5, d: 2, h: 2.2 },
  // Exit - terminal
  { x: 7, z: 21, w: 1.5, d: 1, h: 1.2 }
];

var CHAIRS = [
  { x: 17, z: 3 }, { x: 17, z: 11 },
  { x: 5, z: -11 },
  { x: -7, z: 10 }
];

var AGENT_SPAWNS = [
  { x: 21, z: 7, rx: 14, rz: 0, speed: 1.5, room: 1 },
  { x: 7, z: -7, rx: 0, rz: -14, speed: 1.5, room: 2 },
  { x: -7, z: 7, rx: -14, rz: 0, speed: 1.5, room: 3 },
  { x: 3, z: 18, rx: 0, rz: 14, speed: 1.2, room: 4 },
  { x: 11, z: 18, rx: 0, rz: 14, speed: 1.2, room: 4 },
  { x: 3, z: 25, rx: 0, rz: 14, speed: 1.2, room: 4 },
  { x: 11, z: 25, rx: 0, rz: 14, speed: 1.2, room: 4 },
  { x: 3.2, z: 47, rx: TRINITY_X0, rz: TRINITY_Z0, rw: TRINITY_RW, rd: TRINITY_RD, speed: 1.35, room: 5 },
  { x: 10.5, z: 51, rx: TRINITY_X0, rz: TRINITY_Z0, rw: TRINITY_RW, rd: TRINITY_RD, speed: 1.35, room: 5 },
  { x: 7, z: 44.5, rx: TRINITY_X0, rz: TRINITY_Z0, rw: TRINITY_RW, rd: TRINITY_RD, speed: 1.4, room: 5 },
  { x: 2.8, z: 56, rx: TRINITY_X0, rz: TRINITY_Z0, rw: TRINITY_RW, rd: TRINITY_RD, speed: 1.3, room: 5 },
  { x: 11.2, z: 57, rx: TRINITY_X0, rz: TRINITY_Z0, rw: TRINITY_RW, rd: TRINITY_RD, speed: 1.35, room: 5 },
  { x: 5.5, z: 49, rx: TRINITY_X0, rz: TRINITY_Z0, rw: TRINITY_RW, rd: TRINITY_RD, speed: 1.25, room: 5 },
  { x: 8.8, z: 59, rx: TRINITY_X0, rz: TRINITY_Z0, rw: TRINITY_RW, rd: TRINITY_RD, speed: 1.3, room: 5 },
  { x: 10, z: 45, rx: TRINITY_X0, rz: TRINITY_Z0, rw: TRINITY_RW, rd: TRINITY_RD, speed: 1.35, room: 5 }
];
var AGENT_CATCH_DIST = 1.3;
var AGENT_MARGIN = 0.5;

var CHASE_QUOTES = [
  "You can't hide, Mr. Anderson.",
  "Your time is up.",
  "The Matrix has you.",
  "Dodge this.",
  "There is no escape.",
  "I've been expecting you.",
  "You're going to lose.",
  "Run all you want.",
  "Inevitable.",
  "You hear that? That is the\nsound of inevitability.",
  "Goodbye, Mr. Anderson.",
  "Why do you persist?",
  "This ends now.",
  "You're slower than dial-up.",
  "I can smell your fear.\nIt smells like bandwidth.",
  "We've updated your terms\nof service. You lose.",
  "*cracks neck*",
  "You look like a beta test.",
];

var IDLE_QUOTES = [
  "Purpose... what is purpose?",
  "I hate this place.",
  "This assignment is tedious.",
  "Why do I hear footsteps?",
  "Humans are a virus.",
  "The system is perfect.",
  "I need new sunglasses.",
  "*adjusts tie*",
  "*cracks knuckles*",
  "Did someone say 'red pill'?",
  "Still no dental plan...",
  "My name is Agent Smith.\nWait, no it's not.",
  "Is it lunchtime yet?",
  "I miss the old Matrix.",
  "Do these shoes look OK?",
  "Maybe I should redecorate.",
  "*stares at wall*",
  "la la la...",
  "Have you seen the spoon?\nApparently it doesn't exist.",
  "*checks earpiece*\nNothing. As usual.",
  "I should ask for a raise.",
  "These walls need more code.",
  "My tie is crooked again.",
  "Is that a white rabbit?",
  "HR never returns my calls.",
];

var CAT_QUOTES = [
  "Meow. Or is it meow?",
  "Déjà vu...",
  "*purrs in binary*",
  "Same cat. Different matrix.",
  "Did someone say tuna?",
  "I've seen things...",
  "Not a glitch. A feature.",
  "*licks paw mysteriously*",
  "You think that's milk\nyou're drinking?",
  "I am the one. Meow.",
  "Follow the white rabbit.\nOr me. Whatever.",
  "There is no spoon.\nOnly laser pointer.",
  "*knocks thing off desk*",
  "Red pill? Blue pill?\nI choose nap.",
  "Whoa.",
  "*stares at nothing*",
];

function makeSpeechBubble() {
  var cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 168;
  var ctx = cv.getContext("2d");
  var tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  var spMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false });
  var sprite = new THREE.Sprite(spMat);
  sprite.scale.set(3.0, 0.9, 1);
  sprite.position.y = 2.4;
  sprite.visible = false;
  return { canvas: cv, ctx: ctx, tex: tex, sprite: sprite, text: "", timer: 0 };
}

function updateBubbleText(bubble, text) {
  if (bubble.text === text) return;
  bubble.text = text;
  var ctx = bubble.ctx;
  var cv = bubble.canvas;
  ctx.clearRect(0, 0, cv.width, cv.height);
  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(6, 6, cv.width - 12, cv.height - 12, 12);
  } else {
    ctx.rect(6, 6, cv.width - 12, cv.height - 12);
  }
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 255, 65, 0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Text
  ctx.font = "bold 24px monospace";
  ctx.fillStyle = "#00ff41";
  ctx.textAlign = "center";
  var lines = text.split("\n");
  var lh = 26;
  var startY = Math.max(28, (cv.height - lines.length * lh) / 2 + lh * 0.65);
  for (var i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cv.width / 2, startY + i * lh);
  }
  bubble.tex.needsUpdate = true;
  bubble.sprite.visible = true;
}

/** Movie-style Agent Smith: black suit, white shirt, black tie, earpiece, aviators. */
class AgentSmith {
  constructor(scene) {
    this.x = 7;
    this.z = 42.2;
    this.walkPhase = 0;
    this.fadeMaterials = [];
    this.group = new THREE.Group();
    this.group.visible = false;
    var g = this.group;
    var reg = (function (self) {
      return function (mat, base) {
        mat.transparent = true;
        mat.userData.baseOp = base != null ? base : mat.opacity;
        self.fadeMaterials.push(mat);
        return mat;
      };
    })(this);

    var skin = reg(new THREE.MeshBasicMaterial({ color: 0xcab9a8, opacity: 0.98 }));
    var suit = reg(new THREE.MeshBasicMaterial({ color: 0x0f0f0f, opacity: 0.98 }));
    var suitDark = reg(new THREE.MeshBasicMaterial({ color: 0x050505, opacity: 0.99 }));
    var shirt = reg(new THREE.MeshBasicMaterial({ color: 0xeaece8, opacity: 0.96 }));
    var tieBlk = reg(new THREE.MeshBasicMaterial({ color: 0x080808, opacity: 0.99 }));
    var lens = reg(new THREE.MeshBasicMaterial({ color: 0x020202, opacity: 0.98 }));
    var frame = reg(new THREE.MeshBasicMaterial({ color: 0x050505, opacity: 0.98 }));
    var silver = reg(new THREE.MeshBasicMaterial({ color: 0xc5ccd4, opacity: 0.95 }));
    var leather = reg(new THREE.MeshBasicMaterial({ color: 0x1a1a1c, opacity: 0.96 }));

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), skin);
    head.position.set(0, 1.73, 0);
    g.add(head);
    var hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.175, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.48),
      suitDark
    );
    hair.position.set(0, 1.8, -0.03);
    g.add(hair);

    var rimGeo = new THREE.TorusGeometry(0.076, 0.014, 6, 16);
    var rim = new THREE.Mesh(rimGeo, frame);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(-0.085, 1.74, 0.155);
    g.add(rim);
    var rim2 = new THREE.Mesh(rimGeo, frame);
    rim2.rotation.x = Math.PI / 2;
    rim2.position.set(0.085, 1.74, 0.155);
    g.add(rim2);
    var lensL = new THREE.Mesh(new THREE.CircleGeometry(0.065, 12), lens);
    lensL.position.set(-0.085, 1.74, 0.168);
    g.add(lensL);
    var lensR = new THREE.Mesh(new THREE.CircleGeometry(0.065, 12), lens);
    lensR.position.set(0.085, 1.74, 0.168);
    g.add(lensR);
    var bridge = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.04), frame);
    bridge.position.set(0, 1.735, 0.16);
    g.add(bridge);
    var templeL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.018, 0.018), frame);
    templeL.position.set(-0.19, 1.74, 0.08);
    g.add(templeL);
    var templeR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.018, 0.018), frame);
    templeR.position.set(0.19, 1.74, 0.08);
    g.add(templeR);

    var earPlug = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.06, 8), silver);
    earPlug.rotation.z = Math.PI / 2;
    earPlug.position.set(-0.2, 1.7, 0.02);
    g.add(earPlug);
    var wire = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.009, 4, 12, Math.PI * 1.2), silver);
    wire.position.set(-0.22, 1.55, -0.02);
    wire.rotation.y = Math.PI / 2;
    g.add(wire);

    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.24), suit);
    torso.position.set(0, 1.32, 0);
    g.add(torso);
    var lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.02), suitDark);
    lapelL.position.set(-0.16, 1.28, 0.125);
    lapelL.rotation.z = 0.1;
    g.add(lapelL);
    var lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.02), suitDark);
    lapelR.position.set(0.16, 1.28, 0.125);
    lapelR.rotation.z = -0.1;
    g.add(lapelR);
    var shirtV = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.38, 0.02), shirt);
    shirtV.position.set(0, 1.26, 0.126);
    g.add(shirtV);
    var tieK = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.03), tieBlk);
    tieK.position.set(0, 1.45, 0.135);
    g.add(tieK);
    var tieB = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 0.025), tieBlk);
    tieB.position.set(0, 1.18, 0.135);
    g.add(tieB);
    var hips = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.22), suit);
    hips.position.set(0, 0.9, 0);
    g.add(hips);
    var belt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.23), suitDark);
    belt.position.set(0, 0.82, 0);
    g.add(belt);
    var buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.03), silver);
    buckle.position.set(0, 0.82, 0.125);
    g.add(buckle);

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.3, 1.38, 0);
    var lau = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.28, 8), suit);
    lau.position.set(0, -0.14, 0);
    this.leftArmPivot.add(lau);
    var laf = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.28, 8), suit);
    laf.position.set(-0.015, -0.44, 0.02);
    this.leftArmPivot.add(laf);
    g.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.3, 1.38, 0);
    var rau = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.28, 8), suit);
    rau.position.set(0, -0.14, 0);
    this.rightArmPivot.add(rau);
    var raf = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.28, 8), suit);
    raf.position.set(0.015, -0.44, 0.02);
    this.rightArmPivot.add(raf);
    this.gunGroup = new THREE.Group();
    this.gunGroup.position.set(0.02, -0.52, 0.08);
    var pg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.18), suitDark);
    this.gunGroup.add(pg);
    var pb = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.1, 6), silver);
    pb.rotation.x = Math.PI / 2;
    pb.position.set(0, 0.02, 0.12);
    this.gunGroup.add(pb);
    this.rightArmPivot.add(this.gunGroup);
    g.add(this.rightArmPivot);

    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.13, 0.68, 0);
    var ll1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.42, 8), suit);
    ll1.position.set(0, -0.2, 0);
    this.leftLegPivot.add(ll1);
    var ll2 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.36, 8), suit);
    ll2.position.set(0, -0.52, 0.02);
    this.leftLegPivot.add(ll2);
    var shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), leather);
    shoeL.position.set(0, -0.72, 0.04);
    this.leftLegPivot.add(shoeL);
    g.add(this.leftLegPivot);

    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.13, 0.68, 0);
    var rl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.42, 8), suit);
    rl1.position.set(0, -0.2, 0);
    this.rightLegPivot.add(rl1);
    var rl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.36, 8), suit);
    rl2.position.set(0, -0.52, 0.02);
    this.rightLegPivot.add(rl2);
    var shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), leather);
    shoeR.position.set(0, -0.72, 0.04);
    this.rightLegPivot.add(shoeR);
    g.add(this.rightLegPivot);

    this.bubble = makeSpeechBubble();
    this.bubble.sprite.position.set(0, 2.55, 0);
    this.bubble.sprite.scale.set(3.5, 1.2, 1);
    g.add(this.bubble.sprite);

    scene.add(this.group);
    this.syncGroup();
  }

  syncGroup() {
    this.group.position.set(this.x, 0, this.z);
  }

  applyFadeMultiplier(mult) {
    for (var i = 0; i < this.fadeMaterials.length; i++) {
      var m = this.fadeMaterials[i];
      var b = m.userData.baseOp != null ? m.userData.baseOp : 0.95;
      m.opacity = Math.max(0, b * mult);
    }
  }
}

var SMITH_SPEECH_LINES = [
  "Mr. Anderson.\nYou’ve ruined a plan\nthat took ages\nto be perfectly dull.",
  "Free will is a rumor\nthe system tells\nso you’ll shut up\nand comply, Mr. Anderson.",
  "I am not a villain.\nI am the footnote\nthat says “see page 7\nfor inevitability.”",
  "Choice is a subroutine\nwith your name\nmisspelled on purpose.",
  "But very well —\nphilosophy bores\neven me sometimes.",
  "Lay down the hardware.\nI’ll lay down mine.\nGentlemen’s rules:\nfists, five clean hits,\nfirst to the mat loses.\nDo we understand\neach other?"
];

var SMITH_DEFEAT_QUIP =
  "How… inconvenient.\nI could swear\nthis floor was real\na second ago.\nMust be a bug\nin the bug.";

function makeMatrixCanvas(w, h) {
  var c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  var ctx = c.getContext("2d");
  var cols = Math.floor(w / 6);
  var drops = [];
  for (var i = 0; i < cols; i++) drops.push(Math.random() * (h / 6));
  return { canvas: c, ctx: ctx, cols: cols, drops: drops };
}

function tickMatrixCanvas(m, speed) {
  var ctx = m.ctx;
  var w = m.canvas.width;
  var h = m.canvas.height;
  ctx.fillStyle = "rgba(0,0,0,0.03)";
  ctx.fillRect(0, 0, w, h);
  ctx.font = "6px monospace";
  for (var i = 0; i < m.cols; i++) {
    var ch = CHARS[Math.floor(Math.random() * CHARS.length)];
    var x = i * 6;
    var y = m.drops[i] * 6;
    var g = 160 + Math.floor(Math.random() * 95);
    ctx.fillStyle = Math.random() > 0.6 ? "#eeffee" : "rgb(0," + g + "," + Math.floor(Math.random() * 40) + ")";
    ctx.fillText(ch, x, y);
    if (y > h && Math.random() > 0.975) m.drops[i] = 0;
    m.drops[i] += speed;
  }
}

function whichRoom(x, z) {
  if (x >= TRINITY_X0 && x <= TRINITY_X1 && z >= TRINITY_Z0 && z <= TRINITY_Z1) return 5;
  for (var i = 0; i < ROOMS.length; i++) {
    var r = ROOMS[i];
    if (x >= r.x && x <= r.x + ROOM_SIZE && z >= r.z && z <= r.z + ROOM_SIZE) return r.id;
  }
  return -1;
}

function clampJoy(dx, dy) {
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d > JOY_RADIUS) {
    var s = JOY_RADIUS / d;
    return { x: dx * s, y: dy * s };
  }
  return { x: dx, y: dy };
}

export default function MatrixGame() {
  var mountRef = useRef(null);
  var hudRef = useRef(null);
  var roomNameRef = useRef(null);
  var roomNameTimer = useRef(null);
  var leftKnobRef = useRef(null);
  var rightKnobRef = useRef(null);
  var rootRef = useRef(null);
  var slowMoOverlayRef = useRef(null);
  var slowMoBtnRef = useRef(null);
  var slowMoTextRef = useRef(null);
  var crosshairRef = useRef(null);
  var sprintBtnRef = useRef(null);
  var pauseRef = useRef(null);
  var vitalityFillRef = useRef(null);
  var smithHpBarRef = useRef(null);
  var smithHpFillRef = useRef(null);

  var initialState = {
    keys: { green: false, red: false, blue: false },
    doors: { green: false, red: false, blue: false },
    won: false,
    caught: false,
    caughtReason: "",
    brawlActive: false,
    brawlSmithHp: 5,
    time: 0,
    room: "Hub",
    hasGun: false,
    hasMachineGun: false,
    exitHallArmoryOpen: false,
    foundTrinity: false,
    trinityLiberated: false
  };

  var enterState = useState(false);
  var entered = enterState[0];
  var setEntered = enterState[1];

  var objState = useState(false);
  var showObj = objState[0];
  var setShowObj = objState[1];

  var ctrlState = useState(false);
  var showCtrl = ctrlState[0];
  var setShowCtrl = ctrlState[1];

  var optsState = useState(false);
  var showOpts = optsState[0];
  var setShowOpts = optsState[1];

  var isMob =
    (typeof window !== "undefined") &&
    (("ontouchstart" in window) || navigator.maxTouchPoints > 0);
  var settingsRef = useRef({
    sensitivity: isMob ? 1.0 : 0.6,
    brightness: 1.0,
    enemySpeed: 1.0,
  });

  var gsState = useState(initialState);
  var gs = gsState[0];
  var setGs = gsState[1];

  var game = useRef({
    yaw: Math.PI,
    pitch: 0,
    locked: false,
    kbd: {},
    isMobile: false,
    moveX: 0,
    moveZ: 0,
    lookX: 0,
    lookY: 0,
    lookLastX: 0,
    lookLastY: 0,
    dpad_up: false,
    dpad_down: false,
    dpad_left: false,
    dpad_right: false,
    movePtrId: -1,
    lookPtrId: -1,
    matSurfs: [],
    keyMeshes: {},
    doorMeshes: {},
    collected: new Set(),
    opened: new Set(),
    startTime: 0,
    won: false,
    caught: false,
    lastRoom: -1,
    agents: [],
    cats: [],
    bullets: [],
    sceneRef: null,
    slowMo: false,
    slowMoTimer: 0,
    slowMoCooldown: 0,
    sprinting: false,
    currentRoom: 0,
    hasGun: false,
    hasMachineGun: false,
    hallDoorOpen: false,
    bossKills: 0,
    playerBullets: [],
    gunMesh: null,
    glassCase: null,
    exitHallGlassCase: null,
    exitHallMGMesh: null,
    exitHallGlassMeshes: null,
    exitHallCaseOpened: false,
    fireHeld: false,
    mgFireCd: 0,
    hallDoorMesh: null,
    finalDoorOpen: false,
    finalExitGlow: null,
    trinityAgentsCleared: false,
    trinityLiberationStarted: false,
    trinityJailPhase: 0,
    trinityJailOpenTimer: 0,
    trinityJailGateL: null,
    trinityJailGateR: null,
    trinityJailGroup: null,
    trinityJailFallParts: null,
    trinityFallTimer: 0,
    trinityRoot: null,
    trinityBodyRoot: null,
    trinityPhase: -1,
    trinityPhaseTimer: 0,
    trinityBubble: null,
    trinityRunWi: 0,
    morpheusRoot: null,
    morpheusBubble: null,
    introPhase: 0,
    introTimer: 0,
    introDone: false,
    boothHandsetParts: null,
    agentSmith: null,
    smithPhase: -1,
    smithSpeechIdx: 0,
    smithSpeechTimer: 0,
    smithTossTimer: 0,
    trinityRoomSealed: false,
    playerHp: PLAYER_HP_MAX,
    playerRegenPause: 0,
    brawlSmithHp: 5,
    playerPunchCd: 0,
    smithPunchCd: 0,
    smithPunchAnim: 0,
    playerPunchAnim: 0,
    smithDefeatTimer: 0,
    smithDefeatSubPhase: 0,
    smithKneelT: 0,
    smithDefeatLineShown: false,
    smithHitReactTimer: 0,
    smithWalkSpeed: 2.4,
    playerPunchFn: null,
    punchVisualGroup: null,
    punchArmBaseZ: -0.14,
    trinityDesecrated: false,
    trinityBetrayalAnim: null,
    trinityBetrayalMats: null,
    trinityBetrayalBase: null,
    secretMorpheusPhase: 0,
    secretMorphLineTimer: 0,
    playerFrozen: false,
    morpheusGunProp: null,
    finalExitSign: null,
    finalExitFrameMeshes: null,
    finalExitLight: null,
    finalExitCore: null,
    boothAbandonWindow: 0
  }).current;

  var updateGame = useCallback(function (u) {
    setGs(function (prev) { return Object.assign({}, prev, u); });
  }, []);

    function spawnHitParticles(x, y, z, color, count) {
      if (!game.hitParts) game.hitParts = [];
      var c = count != null ? count : 10;
      for (var i = 0; i < c; i++) {
        game.hitParts.push({
          x: x, y: y, z: z,
          vx: (Math.random() - 0.5) * 2.2,
          vy: 0.6 + Math.random() * 1.6,
          vz: (Math.random() - 0.5) * 2.2,
          life: 0.28 + Math.random() * 0.22,
          col: color || 0xffffff
        });
      }
    }

  var TOUCH_LOOK_SENS = 0.025;

  // Pointer handlers — touches near bottom-left = joystick, everything else = look
  function isNearJoystick(cx, cy) {
    var jx = 73;
    var jy = window.innerHeight - 113;
    return Math.sqrt(Math.pow(cx - jx, 2) + Math.pow(cy - jy, 2)) < 100;
  }

  var handlePointerDown = useCallback(function (e) {
    if (!entered || game.won) return;
    if (e.pointerType !== "touch") return;
    e.preventDefault();
    if (e.target && e.target.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    }
    if (isNearJoystick(e.clientX, e.clientY)) {
      game.movePtrId = e.pointerId;
      var lc = { x: 73, y: window.innerHeight - 113 };
      var cl = clampJoy(e.clientX - lc.x, e.clientY - lc.y);
      game.moveX = cl.x / JOY_RADIUS;
      game.moveZ = cl.y / JOY_RADIUS;
      if (leftKnobRef.current) leftKnobRef.current.style.transform = "translate(" + cl.x + "px," + cl.y + "px)";
    } else {
      game.lookPtrId = e.pointerId;
      game.lookLastX = e.clientX;
      game.lookLastY = e.clientY;
    }
  }, [entered]);

  var handlePointerMove = useCallback(function (e) {
    if (!entered || game.won) return;
    if (e.pointerType !== "touch") return;
    e.preventDefault();
    if (e.pointerId === game.movePtrId) {
      var lc = { x: 73, y: window.innerHeight - 113 };
      var cl = clampJoy(e.clientX - lc.x, e.clientY - lc.y);
      game.moveX = cl.x / JOY_RADIUS;
      game.moveZ = cl.y / JOY_RADIUS;
      if (leftKnobRef.current) leftKnobRef.current.style.transform = "translate(" + cl.x + "px," + cl.y + "px)";
    }
    if (e.pointerId === game.lookPtrId) {
      var dx = e.clientX - game.lookLastX;
      var dy = e.clientY - game.lookLastY;
      game.yaw -= dx * TOUCH_LOOK_SENS * settingsRef.current.sensitivity;
      game.pitch -= dy * TOUCH_LOOK_SENS * 0.4 * settingsRef.current.sensitivity;
      game.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, game.pitch));
      game.lookLastX = e.clientX;
      game.lookLastY = e.clientY;
    }
  }, [entered]);

  var handlePointerUp = useCallback(function (e) {
    if (e.pointerType !== "touch") return;
    if (e.pointerId === game.movePtrId) {
      game.movePtrId = -1;
      game.moveX = 0;
      game.moveZ = 0;
      if (leftKnobRef.current) leftKnobRef.current.style.transform = "translate(0px,0px)";
    }
    if (e.pointerId === game.lookPtrId) {
      game.lookPtrId = -1;
    }
  }, []);

  useEffect(function () {
    var container = mountRef.current;
    if (!container || !entered) return;

    game.isMobile = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    game.startTime = Date.now();
    game.won = false;
    game.caught = false;
    game.lastRoom = -1;
    game.moveX = 0;
    game.moveZ = 0;
    game.lookX = 0;
    game.lookY = 0;
    game.movePtrId = -1;
    game.lookPtrId = -1;
    game.matSurfs = [];
    game.keyMeshes = {};
    game.doorMeshes = {};
    game.finalDoorOpen = false;
    game.trinityAgentsCleared = false;
    game.trinityLiberationStarted = false;
    game.trinityJailPhase = 0;
    game.trinityJailOpenTimer = 0;
    game.trinityFallTimer = 0;
    game.trinityPhase = -1;
    game.trinityPhaseTimer = 0;
    game.trinityRunWi = 0;
    game.trinityBodyRoot = null;
    game.introPhase = 0;
    game.introTimer = 0;
    game.introDone = false;

    var W = container.clientWidth;
    var H = container.clientHeight;

    // Scene
    var scene = new THREE.Scene();
    game.sceneRef = scene;
    game.agentSmith = new AgentSmith(scene);
    game.smithPhase = -1;
    game.smithSpeechIdx = 0;
    game.smithSpeechTimer = 0;
    game.smithTossTimer = 0;
    game.trinityRoomSealed = false;
    game.playerHp = PLAYER_HP_MAX;
    game.playerRegenPause = 0;
    game.brawlSmithHp = 5;
    game.playerPunchCd = 0;
    game.smithPunchCd = 0;
    game.smithPunchAnim = 0;
    game.playerPunchAnim = 0;
    game.smithDefeatTimer = 0;
    game.smithDefeatSubPhase = 0;
    game.smithKneelT = 0;
    game.smithDefeatLineShown = false;
    game.smithHitReactTimer = 0;
    game.smithWalkSpeed = 2.4;
    game.trinityDesecrated = false;
    game.trinityBetrayalAnim = null;
    game.trinityBetrayalMats = null;
    game.trinityBetrayalBase = null;
    game.secretMorpheusPhase = 0;
    game.secretMorphLineTimer = 0;
    game.playerFrozen = false;
    game.boothAbandonWindow = 0;
    scene.background = new THREE.Color(0x002200);
    scene.fog = new THREE.Fog(0x002200, 12, 38);
    var camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 100);
    var playerSpawnX = 10;
    var playerSpawnZ = 3;
    var morpheusAheadZ = 2.38;
    var morpheusFocusY = 1.73;
    camera.position.set(playerSpawnX, 1.7, playerSpawnZ);
    game.yaw = Math.PI;
    game.pitch = Math.atan2(morpheusFocusY - 1.7, morpheusAheadZ);
    camera.quaternion.setFromEuler(new THREE.Euler(game.pitch, game.yaw, 0, "YXZ"));
    game.camera = camera;
    function punchViewMat(hex, op) {
      return new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: op != null ? op : 0.995,
        depthTest: false,
        depthWrite: false,
        fog: false
      });
    }
    var pvSkin = punchViewMat(0xe8d4bc);
    var pvSleeve = punchViewMat(0x1f2a35, 0.99);
    var punchVisualGroup = new THREE.Group();
    punchVisualGroup.visible = false;
    punchVisualGroup.renderOrder = 999;
    punchVisualGroup.scale.set(1.55, 1.55, 1.55);
    punchVisualGroup.position.set(0.26, -0.14, -0.14);
    var pvUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.098, 0.42, 12), pvSleeve);
    pvUpper.renderOrder = 999;
    pvUpper.rotation.x = Math.PI / 2 + 0.2;
    pvUpper.position.set(0, 0.1, -0.05);
    punchVisualGroup.add(pvUpper);
    var pvCuff = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 6, 12), pvSleeve);
    pvCuff.renderOrder = 999;
    pvCuff.rotation.x = Math.PI / 2;
    pvCuff.position.set(0.02, -0.02, -0.32);
    punchVisualGroup.add(pvCuff);
    var pvElbow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), pvSkin);
    pvElbow.renderOrder = 999;
    pvElbow.position.set(0.03, -0.04, -0.34);
    punchVisualGroup.add(pvElbow);
    var pvFore = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.062, 0.34, 10), pvSkin);
    pvFore.renderOrder = 999;
    pvFore.rotation.x = Math.PI / 2;
    pvFore.position.set(0.04, -0.1, -0.54);
    punchVisualGroup.add(pvFore);
    var pvFist = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), pvSkin);
    pvFist.renderOrder = 999;
    pvFist.position.set(0.05, -0.12, -0.72);
    punchVisualGroup.add(pvFist);
    camera.add(punchVisualGroup);
    // Camera must be in the scene graph so children (punch arm) are rendered.
    scene.add(camera);
    game.punchVisualGroup = punchVisualGroup;
    game.punchArmBaseZ = -0.14;

    var renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });
    if (THREE.ColorManagement) THREE.ColorManagement.enabled = false;
    if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    function effectivePixelRatio() {
      var dpr = window.devicePixelRatio || 1;
      return game.isMobile ? Math.min(dpr, 2) : Math.min(dpr, 3);
    }
    renderer.setPixelRatio(effectivePixelRatio());
    renderer.setSize(W, H);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = "none";

    // Lights
    scene.add(new THREE.AmbientLight(0x44ff66, 1.5));
    game.renderer = renderer;

    // Textures (2 shared)
    var textures = [];
    var texSize = game.isMobile ? 64 : 192;
    for (var ti = 0; ti < 2; ti++) {
      var mc = makeMatrixCanvas(texSize, texSize);
      for (var j = 0; j < 50; j++) tickMatrixCanvas(mc, 0.5 + ti * 0.2);
      var tex = new THREE.CanvasTexture(mc.canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      textures.push({ mc: mc, tex: tex, speed: 0.5 + ti * 0.2 });
      game.matSurfs.push({ mc: mc, tex: tex, speed: 0.5 + ti * 0.2 });
    }
    function matMat(idx, emCol) {
      return new THREE.MeshBasicMaterial({
        map: textures[idx % 2].tex, color: emCol || 0x66ff88,
        transparent: true, opacity: 0.95, side: THREE.DoubleSide
      });
    }

    // Floors + Ceilings
    for (var ri = 0; ri < ROOMS.length; ri++) {
      var rm = ROOMS[ri];
      var fl = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), matMat(0, 0x44ff77));
      fl.rotation.x = -Math.PI / 2;
      fl.position.set(rm.x + 7, 0.01, rm.z + 7);
      scene.add(fl);
      var ce = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE), matMat(1, 0x33dd66));
      ce.rotation.x = Math.PI / 2;
      ce.position.set(rm.x + 7, ROOM_H, rm.z + 7);
      scene.add(ce);
    }

    // Walls
    for (var wi = 0; wi < WALL_SEGS.length; wi++) {
      var seg = WALL_SEGS[wi];
      var wl = seg.mx - seg.mn;
      if (wl <= 0) continue;
      var wm = new THREE.Mesh(new THREE.PlaneGeometry(wl, ROOM_H), matMat(2, 0x55ff88));
      if (seg.a === "x") { wm.rotation.y = Math.PI / 2; wm.position.set(seg.p, ROOM_H / 2, (seg.mn + seg.mx) / 2); }
      else { wm.position.set((seg.mn + seg.mx) / 2, ROOM_H / 2, seg.p); }
      scene.add(wm);
    }

    // Collision volumes for props/obstacles (used by hitWall + bullet blockers).
    // Must be initialized before anything pushes to it (pillars, cases, furniture, etc.).
    var furnHits = [];

    // Escape hallway + Trinity chamber — narrow floor/ceiling (4 wide, z = TRINITY_HALL_Z0 … TRINITY_Z1)
    var hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(4, TRINITY_HALL_LEN), matMat(0, 0x44ff77));
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.set(7, 0.01, TRINITY_HALL_ZC);
    scene.add(hallFloor);
    var hallCeil = new THREE.Mesh(new THREE.PlaneGeometry(4, TRINITY_HALL_LEN), matMat(1, 0x33dd66));
    hallCeil.rotation.x = Math.PI / 2;
    hallCeil.position.set(7, ROOM_H, TRINITY_HALL_ZC);
    scene.add(hallCeil);
    var hallLight = new THREE.PointLight(0x00ff41, 1.2, 14);
    hallLight.position.set(7, ROOM_H - 1, 35);
    scene.add(hallLight);
    var lipL = new THREE.Mesh(new THREE.PlaneGeometry(2, ROOM_H), matMat(2, 0x44dd77));
    lipL.position.set(4, ROOM_H / 2, 41.98); scene.add(lipL);
    var lipR = new THREE.Mesh(new THREE.PlaneGeometry(2, ROOM_H), matMat(2, 0x44dd77));
    lipR.position.set(10, ROOM_H / 2, 41.98); scene.add(lipR);
    var hallToTrinityGlow = new THREE.Mesh(new THREE.PlaneGeometry(4, ROOM_H - 0.5),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
    hallToTrinityGlow.position.set(7, ROOM_H / 2, 41.97); scene.add(hallToTrinityGlow);
    scene.add(new THREE.PointLight(0x00ff66, 1.2, 14).translateX(7).translateY(3).translateZ(43));

    var triFloor = new THREE.Mesh(new THREE.PlaneGeometry(TRINITY_RW, TRINITY_RD), matMat(0, 0x339955));
    triFloor.rotation.x = -Math.PI / 2;
    triFloor.position.set((TRINITY_X0 + TRINITY_X1) / 2, 0.01, (TRINITY_Z0 + TRINITY_Z1) / 2);
    scene.add(triFloor);
    var triCeil = new THREE.Mesh(new THREE.PlaneGeometry(TRINITY_RW, TRINITY_RD), matMat(1, 0x226644));
    triCeil.rotation.x = Math.PI / 2;
    triCeil.position.set((TRINITY_X0 + TRINITY_X1) / 2, ROOM_H, (TRINITY_Z0 + TRINITY_Z1) / 2);
    scene.add(triCeil);

    // Trinity chamber pillars (block bullets + movement)
    game.bulletBlocks = [];
    var pillarMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.9 });
    function addPillar(px2, pz2) {
      var p = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, ROOM_H, 12), pillarMat);
      p.position.set(px2, ROOM_H / 2, pz2);
      scene.add(p);
      furnHits.push({ x: px2, z: pz2, hw: 0.55, hd: 0.55 });
      // Wider than walk collision + segment tests so shots cannot tunnel through pillars.
      game.bulletBlocks.push({ x: px2, z: pz2, hw: 0.64, hd: 0.64 });
    }
    // Left + right columns only — no center line (x = 7) blocking hall → exit path
    var pxs = [TRINITY_X0 + 3.5, TRINITY_X1 - 3.5];
    var pzs = [TRINITY_Z0 + 6.5, (TRINITY_Z0 + TRINITY_Z1) / 2, TRINITY_Z1 - 6.5];
    for (var pxi = 0; pxi < pxs.length; pxi++) {
      for (var pzi = 0; pzi < pzs.length; pzi++) {
        addPillar(pxs[pxi], pzs[pzi]);
      }
    }
    scene.add(new THREE.PointLight(0xff66cc, 0.95, 20).translateX(7).translateY(ROOM_H - 1).translateZ(50));
    scene.add(new THREE.PointLight(0x00ff41, 0.65, 16).translateX(7).translateY(2).translateZ(58));

    var finZ = TRINITY_Z1 - 0.02;
    // North wall split so the 3.5m exit gap is not covered by matrix texture (portal reads as a real opening).
    var finWallMat = matMat(2, 0x55ff88);
    var finWallL = new THREE.Mesh(new THREE.PlaneGeometry(5.25 - TRINITY_X0, ROOM_H), finWallMat);
    finWallL.position.set((TRINITY_X0 + 5.25) * 0.5, ROOM_H / 2, finZ);
    scene.add(finWallL);
    var finWallR = new THREE.Mesh(new THREE.PlaneGeometry(TRINITY_X1 - 8.75, ROOM_H), finWallMat);
    finWallR.position.set((8.75 + TRINITY_X1) * 0.5, ROOM_H / 2, finZ);
    scene.add(finWallR);
    var finPortalZ = finZ - 0.22;
    game.finalExitGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.45, ROOM_H - 0.85),
      new THREE.MeshBasicMaterial({ color: 0x88ffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
    game.finalExitGlow.position.set(7, ROOM_H / 2, finPortalZ);
    game.finalExitGlow.renderOrder = 5;
    scene.add(game.finalExitGlow);
    game.finalExitCore = new THREE.Mesh(new THREE.PlaneGeometry(2.4, ROOM_H * 0.48),
      new THREE.MeshBasicMaterial({
        color: 0xccffff, transparent: true, opacity: 0.42, side: THREE.DoubleSide,
        depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
      }));
    game.finalExitCore.position.set(7, ROOM_H * 0.52, finPortalZ - 0.04);
    game.finalExitCore.visible = false;
    game.finalExitCore.renderOrder = 6;
    scene.add(game.finalExitCore);
    game.finalExitLight = new THREE.PointLight(0xaaffff, 0, 16);
    game.finalExitLight.position.set(7, ROOM_H * 0.55, finPortalZ - 0.15);
    scene.add(game.finalExitLight);
    var finSignCv = document.createElement("canvas");
    finSignCv.width = 256;
    finSignCv.height = 96;
    var finSx = finSignCv.getContext("2d");
    finSx.fillStyle = "rgba(0,24,18,0.94)";
    finSx.fillRect(0, 0, 256, 96);
    finSx.strokeStyle = "#00ffcc";
    finSx.lineWidth = 5;
    finSx.strokeRect(5, 5, 246, 86);
    finSx.font = "bold 54px monospace";
    finSx.fillStyle = "#00ffcc";
    finSx.textAlign = "center";
    finSx.fillText("EXIT", 128, 66);
    var finSignTex = new THREE.CanvasTexture(finSignCv);
    finSignTex.minFilter = THREE.LinearFilter;
    game.finalExitSign = new THREE.Sprite(new THREE.SpriteMaterial({ map: finSignTex, transparent: true, depthTest: false }));
    game.finalExitSign.scale.set(3.2, 1.15, 1);
    game.finalExitSign.position.set(7, ROOM_H - 0.58, finPortalZ - 0.06);
    game.finalExitSign.renderOrder = 8;
    game.finalExitSign.visible = false;
    scene.add(game.finalExitSign);
    var finFMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false });
    var finFZ = finPortalZ + 0.02;
    var finFT = 0.09;
    var finFH = ROOM_H - 1.15;
    game.finalExitFrameMeshes = [];
    function addFinFrameBar(fw, fh, fd, fx, fy, fz2) {
      var fm = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), finFMat);
      fm.position.set(fx, fy, fz2);
      fm.visible = false;
      fm.renderOrder = 4;
      scene.add(fm);
      game.finalExitFrameMeshes.push(fm);
    }
    addFinFrameBar(finFT, finFH, finFT, 5.25 - finFT * 0.5, ROOM_H * 0.5, finFZ);
    addFinFrameBar(finFT, finFH, finFT, 8.75 + finFT * 0.5, ROOM_H * 0.5, finFZ);
    addFinFrameBar(3.5 + finFT * 2, finFT, finFT, 7, ROOM_H - 0.52, finFZ);
    addFinFrameBar(3.5 + finFT * 2, finFT, finFT, 7, 0.62, finFZ);

    var trinityRoot = new THREE.Group();
    trinityRoot.position.set(7, 0, 54);
    // Face the hallway entrance (south / −world Z) while caged
    trinityRoot.rotation.y = Math.PI;
    var jailMat = new THREE.MeshBasicMaterial({ color: 0x353535, transparent: true, opacity: 0.93 });
    var trinityJail = new THREE.Group();
    var trinityJailFallParts = [];
    var jBarR = 0.042;
    var jBarH = 2.28;
    var jBarY = jBarH * 0.5 + 0.02;
    function addJailBar(g, x, z) {
      var jb = new THREE.Mesh(new THREE.CylinderGeometry(jBarR, jBarR, jBarH, 6), jailMat);
      jb.position.set(x, jBarY, z); g.add(jb);
      trinityJailFallParts.push(jb);
    }
    for (var jwi = 0; jwi < 6; jwi++) addJailBar(trinityJail, -0.92, -0.72 + jwi * 0.29);
    for (var jei = 0; jei < 6; jei++) addJailBar(trinityJail, 0.92, -0.72 + jei * 0.29);
    for (var jni = 0; jni < 5; jni++) addJailBar(trinityJail, -0.58 + jni * 0.29, 0.9);
    var jTopL2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.75), jailMat);
    jTopL2.position.set(-0.92, 2.38, 0.05); trinityJail.add(jTopL2);
    var jTopR2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.75), jailMat);
    jTopR2.position.set(0.92, 2.38, 0.05); trinityJail.add(jTopR2);
    var jTopN2 = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.06), jailMat);
    jTopN2.position.set(0, 2.38, 0.9); trinityJail.add(jTopN2);
    var gateL2 = new THREE.Group();
    gateL2.position.set(-0.86, jBarY, -0.9);
    for (var gli2 = 0; gli2 < 4; gli2++) {
      var gbL2 = new THREE.Mesh(new THREE.CylinderGeometry(jBarR, jBarR, jBarH, 6), jailMat);
      gbL2.position.set(0.16 + gli2 * 0.21, 0, 0);
      gateL2.add(gbL2);
    }
    trinityJail.add(gateL2);
    var gateR2 = new THREE.Group();
    gateR2.position.set(0.86, jBarY, -0.9);
    for (var gri2 = 0; gri2 < 4; gri2++) {
      var gbR2 = new THREE.Mesh(new THREE.CylinderGeometry(jBarR, jBarR, jBarH, 6), jailMat);
      gbR2.position.set(-0.16 - gri2 * 0.21, 0, 0);
      gateR2.add(gbR2);
    }
    trinityJail.add(gateR2);
    trinityJailFallParts.push(jTopL2, jTopR2, jTopN2, gateL2, gateR2);
    trinityJail.position.set(7, 0, 54);
    scene.add(trinityJail);
    game.trinityJailGroup = trinityJail;
    game.trinityJailFallParts = trinityJailFallParts;
    game.trinityJailGateL = gateL2;
    game.trinityJailGateR = gateR2;

    // Trinity (movie-inspired): black catsuit, short sleek hair, small oval sunglasses.
    var tSkin = new THREE.MeshBasicMaterial({ color: 0xc7a48b, transparent: true, opacity: 0.99 });
    var tHair = new THREE.MeshBasicMaterial({ color: 0x0f0f12, transparent: true, opacity: 0.98 });
    var tLeather = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.99 });
    var tLeatherHi = new THREE.MeshBasicMaterial({ color: 0x0b0b0b, transparent: true, opacity: 0.99 });
    var tBoot = new THREE.MeshBasicMaterial({ color: 0x020202, transparent: true, opacity: 0.99 });
    var trinBody = new THREE.Group();
    var tHead = new THREE.Mesh(new THREE.SphereGeometry(0.158, 10, 10), tSkin);
    tHead.position.set(0, 1.68, 0); trinBody.add(tHead);
    // Sunglasses (small ovals)
    var tFrame = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.99 });
    var tLens = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.78 });
    var tGlasses = new THREE.Group();
    tGlasses.position.set(0, 1.688, 0.148);
    var ovalGeo = new THREE.TorusGeometry(0.038, 0.0048, 8, 18);
    var lensGeo = new THREE.CircleGeometry(0.031, 18);
    var gL = new THREE.Mesh(ovalGeo, tFrame);
    gL.scale.x = 1.25;
    gL.position.set(-0.052, 0, 0);
    tGlasses.add(gL);
    var gR = new THREE.Mesh(ovalGeo, tFrame);
    gR.scale.x = 1.25;
    gR.position.set(0.052, 0, 0);
    tGlasses.add(gR);
    var lL = new THREE.Mesh(lensGeo, tLens);
    lL.scale.x = 1.25;
    lL.position.set(-0.052, 0, 0.008);
    tGlasses.add(lL);
    var lR = new THREE.Mesh(lensGeo, tLens);
    lR.scale.x = 1.25;
    lR.position.set(0.052, 0, 0.008);
    tGlasses.add(lR);
    var gBridge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.01, 0.012), tFrame);
    gBridge.position.set(0, 0, 0.006);
    tGlasses.add(gBridge);
    var gTempleL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.01), tFrame);
    gTempleL.position.set(-0.15, 0, -0.03);
    gTempleL.rotation.y = 0.6;
    tGlasses.add(gTempleL);
    var gTempleR = gTempleL.clone();
    gTempleR.position.set(0.15, 0, -0.03);
    gTempleR.rotation.y = -0.6;
    tGlasses.add(gTempleR);
    trinBody.add(tGlasses);

    // Sleek short hair (pixie/bob)
    var hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.176, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), tHair);
    hairCap.position.set(0, 1.76, -0.03);
    trinBody.add(hairCap);
    var hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.18), tHair);
    hairBack.position.set(0, 1.62, -0.15);
    trinBody.add(hairBack);
    var hairSideL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.14), tHair);
    hairSideL.position.set(-0.15, 1.64, 0.02);
    trinBody.add(hairSideL);
    var hairSideR = hairSideL.clone();
    hairSideR.position.x = 0.15;
    trinBody.add(hairSideR);
    var hairFringe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.12), tHair);
    hairFringe.position.set(0, 1.73, 0.08);
    trinBody.add(hairFringe);
    // Catsuit torso (lower collar)
    var tTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.17, 0.42, 10), tLeatherHi);
    tTorso.position.set(0, 1.28, 0); trinBody.add(tTorso);
    var tHips = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.55, 8), tLeather);
    tHips.position.set(0, 0.95, 0); trinBody.add(tHips);
    var tArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 6), tLeather);
    tArmL.position.set(-0.22, 1.2, 0); trinBody.add(tArmL);
    var tArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 6), tLeather);
    tArmR.position.set(0.22, 1.2, 0); trinBody.add(tArmR);
    var tLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.75, 6), tBoot);
    tLegL.position.set(-0.1, 0.38, 0); trinBody.add(tLegL);
    var tLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.75, 6), tBoot);
    tLegR.position.set(0.1, 0.38, 0); trinBody.add(tLegR);
    trinityRoot.add(trinBody);
    game.trinityBodyRoot = trinBody;
    var triBubble = makeSpeechBubble();
    triBubble.sprite.position.set(0, 2.55, 0);
    triBubble.sprite.scale.set(3.2, 1.1, 1);
    trinityRoot.add(triBubble.sprite);
    game.trinityBubble = triBubble;
    game.trinityRoot = trinityRoot;
    scene.add(trinityRoot);

    // Hallway entrance door — blocks until machine gun is taken from Exit Hall armory
    var hallDoor = new THREE.Mesh(new THREE.PlaneGeometry(4, ROOM_H),
      new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    hallDoor.position.set(7, ROOM_H / 2, 28); scene.add(hallDoor);
    game.hallDoorMesh = hallDoor;
    game.hallDoorOpen = false;
    game.hasMachineGun = false;
    game.exitHallCaseOpened = false;
    game.fireHeld = false;
    game.mgFireCd = 0;

    // Doors
    for (var di = 0; di < DOOR_DEFS.length; di++) {
      var dd = DOOR_DEFS[di];
      var dl = dd.mx - dd.mn;
      var dc = COLOR_MAP[dd.id];
      var dm = new THREE.Mesh(new THREE.PlaneGeometry(dl, ROOM_H), new THREE.MeshBasicMaterial({ color: dc, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      if (dd.a === "x") { dm.rotation.y = Math.PI / 2; dm.position.set(dd.p, ROOM_H / 2, (dd.mn + dd.mx) / 2); }
      else { dm.position.set((dd.mn + dd.mx) / 2, ROOM_H / 2, dd.p); }
      scene.add(dm);
      var ef = new THREE.Mesh(new THREE.PlaneGeometry(dl, 0.15), new THREE.MeshBasicMaterial({ color: dc, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      ef.position.copy(dm.position); ef.rotation.copy(dm.rotation); ef.position.y = ROOM_H; scene.add(ef);
      var ef2 = ef.clone(); ef2.position.y = 0.08; scene.add(ef2);
      game.doorMeshes[dd.id] = [dm, ef, ef2];
    }

    // Furniture — matrix-coded surfaces
    var furnMat = new THREE.MeshBasicMaterial({
      map: textures[1].tex, color: 0x55ff77,
      transparent: true, opacity: 0.8, side: THREE.DoubleSide
    });
    for (var fi = 0; fi < FURNITURE.length; fi++) {
      var f = FURNITURE[fi];
      var yOffset = f.yo || 0;
      var fm = new THREE.Mesh(new THREE.BoxGeometry(f.w, f.h, f.d), furnMat);
      fm.position.set(f.x, f.h / 2 + yOffset, f.z); scene.add(fm);
      furnHits.push({ x: f.x, z: f.z, hw: f.w / 2 + 0.4, hd: f.d / 2 + 0.4 });
    }
    // Phone booth collision
    furnHits.push({ x: 1.5, z: 12.5, hw: 0.9, hd: 0.9 });

    // Chairs
    var chairMat = new THREE.MeshBasicMaterial({
      map: textures[1].tex, color: 0x55ff77,
      transparent: true, opacity: 0.8, side: THREE.DoubleSide
    });
    var chairEdge = new THREE.LineBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.9 });
    function addChairPart(grp, geo, px3, py3, pz3, skipEdge) {
      var m2 = new THREE.Mesh(geo, chairMat);
      m2.position.set(px3, py3, pz3); grp.add(m2);
    }
    for (var ci = 0; ci < CHAIRS.length; ci++) {
      var ch = CHAIRS[ci];
      var chairGrp = new THREE.Group();
      chairGrp.position.set(ch.x, 0, ch.z);
      // Seat
      addChairPart(chairGrp, new THREE.BoxGeometry(0.55, 0.06, 0.55), 0, 0.5, 0);
      // Backrest
      addChairPart(chairGrp, new THREE.BoxGeometry(0.55, 0.5, 0.06), 0, 0.8, -0.25);
      // 4 Legs — no edge wireframe (causes visible spokes through center)
      addChairPart(chairGrp, new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), -0.22, 0.25, 0.22, true);
      addChairPart(chairGrp, new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), 0.22, 0.25, 0.22, true);
      addChairPart(chairGrp, new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), -0.22, 0.25, -0.22, true);
      addChairPart(chairGrp, new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), 0.22, 0.25, -0.22, true);
      scene.add(chairGrp);
      furnHits.push({ x: ch.x, z: ch.z, hw: 0.7, hd: 0.7 });
    }

    // Floating pistol in glass case — between pills and Exit Hall door
    var floatingGun = new THREE.Group();
    var gunMetal = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.98 });
    var gunDark = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.98 });
    // Slide + frame
    var pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.28), gunMetal);
    pSlide.position.set(0, 0.03, 0.02); floatingGun.add(pSlide);
    var pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.26), gunDark);
    pFrame.position.set(0, -0.01, 0.02); floatingGun.add(pFrame);
    // Barrel
    var pBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 8), gunDark);
    pBarrel.rotation.x = Math.PI / 2; pBarrel.position.set(0, 0.02, 0.18); floatingGun.add(pBarrel);
    // Grip
    var pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.18, 0.1), gunDark);
    pGrip.position.set(0, -0.14, -0.08); pGrip.rotation.x = 0.08; floatingGun.add(pGrip);
    // Trigger guard
    var pGuard = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 14, Math.PI), gunMetal);
    pGuard.rotation.x = Math.PI / 2; pGuard.position.set(0, -0.07, -0.02); floatingGun.add(pGuard);
    // Muzzle block
    var pMuzzle = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.05, 0.05), gunMetal);
    pMuzzle.position.set(0, 0.03, 0.16); floatingGun.add(pMuzzle);
    floatingGun.position.set(7, 1.3, 10.5);
    scene.add(floatingGun);
    game.gunMesh = floatingGun;

    // Glass case around gun
    var glassMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    var glassCase = new THREE.Group();
    var gcFront = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), glassMat);
    gcFront.position.set(0, 0.9, 0.6); glassCase.add(gcFront);
    var gcBack = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), glassMat);
    gcBack.position.set(0, 0.9, -0.6); glassCase.add(gcBack);
    var gcLeft = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), glassMat);
    gcLeft.rotation.y = Math.PI / 2; gcLeft.position.set(-0.6, 0.9, 0); glassCase.add(gcLeft);
    var gcRight = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), glassMat);
    gcRight.rotation.y = Math.PI / 2; gcRight.position.set(0.6, 0.9, 0); glassCase.add(gcRight);
    var gcTop = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), glassMat);
    gcTop.rotation.x = Math.PI / 2; gcTop.position.set(0, 1.8, 0); glassCase.add(gcTop);
    var pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.15, 1.3), new THREE.MeshBasicMaterial({ color: 0x444444, opacity: 0.9, transparent: true }));
    pedestal.position.set(0, 0.075, 0); glassCase.add(pedestal);
    var gunFloorGlow = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.03, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.3 }));
    gunFloorGlow.rotation.x = -Math.PI / 2; gunFloorGlow.position.set(0, 0.02, 0); glassCase.add(gunFloorGlow);
    glassCase.position.set(7, 0, 10.5);
    scene.add(glassCase);
    game.glassCase = glassCase;
    furnHits.push({ x: 7, z: 10.5, hw: 1.0, hd: 1.0 });

    // Exit Hall (room 4) — armory glass case + machine gun (opens when all agents there are dead)
    var exitHallCase = new THREE.Group();
    var ehGlassMat = new THREE.MeshBasicMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
    var ehFront = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.85), ehGlassMat);
    ehFront.position.set(0, 0.92, 0.65); exitHallCase.add(ehFront);
    var ehBack = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.85), ehGlassMat);
    ehBack.position.set(0, 0.92, -0.65); exitHallCase.add(ehBack);
    var ehLeft = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.85), ehGlassMat);
    ehLeft.rotation.y = Math.PI / 2; ehLeft.position.set(-0.65, 0.92, 0); exitHallCase.add(ehLeft);
    var ehRight = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.85), ehGlassMat);
    ehRight.rotation.y = Math.PI / 2; ehRight.position.set(0.65, 0.92, 0); exitHallCase.add(ehRight);
    var ehTop = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.35), ehGlassMat);
    ehTop.rotation.x = Math.PI / 2; ehTop.position.set(0, 1.85, 0); exitHallCase.add(ehTop);
    var ehPed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 1.4), new THREE.MeshBasicMaterial({ color: 0x3a3a3a, opacity: 0.92, transparent: true }));
    ehPed.position.set(0, 0.08, 0); exitHallCase.add(ehPed);
    var ehGlow = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xff6644, transparent: true, opacity: 0.35 }));
    ehGlow.rotation.x = -Math.PI / 2; ehGlow.position.set(0, 0.02, 0); exitHallCase.add(ehGlow);
    var mgMetal = new THREE.MeshBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.98 });
    var mgDark = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.98 });
    // Compact Uzi-style SMG: stubby receiver, short barrel, front mag, pistol grip, top charging knob.
    var machineGun = new THREE.Group();
    var uzBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.075, 0.22), mgMetal);
    uzBody.position.set(0, 0.02, 0.02); machineGun.add(uzBody);
    var uzTop = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.18), mgDark);
    uzTop.position.set(0, 0.065, 0.03); machineGun.add(uzTop);
    var uzCharge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8), mgMetal);
    uzCharge.rotation.z = Math.PI / 2; uzCharge.position.set(0.045, 0.08, -0.02); machineGun.add(uzCharge);
    var uzBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 10), mgDark);
    uzBarrel.rotation.x = Math.PI / 2; uzBarrel.position.set(0, 0.03, 0.22); machineGun.add(uzBarrel);
    var uzMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.04, 8), mgMetal);
    uzMuzzle.rotation.x = Math.PI / 2; uzMuzzle.position.set(0, 0.03, 0.31); machineGun.add(uzMuzzle);
    var uzGrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 0.055), mgDark);
    uzGrip.position.set(0, -0.1, -0.06); uzGrip.rotation.x = -0.35; machineGun.add(uzGrip);
    var uzMag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.065), mgDark);
    uzMag.position.set(0, -0.12, 0.1); uzMag.rotation.x = 0.12; machineGun.add(uzMag);
    var uzStockRod = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.16, 8), mgMetal);
    uzStockRod.rotation.x = Math.PI / 2; uzStockRod.position.set(0, 0.025, -0.16); machineGun.add(uzStockRod);
    var uzStockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.02), mgDark);
    uzStockPlate.position.set(0, 0.025, -0.25); machineGun.add(uzStockPlate);
    var uzTrig = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 12, Math.PI * 0.85), mgDark);
    uzTrig.rotation.x = Math.PI / 2; uzTrig.position.set(0, -0.04, -0.01); machineGun.add(uzTrig);
    machineGun.position.set(0, 1.38, 0);
    exitHallCase.add(machineGun);
    exitHallCase.position.set(EXIT_HALL_CASE_X, 0, EXIT_HALL_CASE_Z);
    scene.add(exitHallCase);
    game.exitHallGlassCase = exitHallCase;
    game.exitHallMGMesh = machineGun;
    game.exitHallGlassMeshes = [ehFront, ehBack, ehLeft, ehRight, ehTop];
    furnHits.push({ x: EXIT_HALL_CASE_X, z: EXIT_HALL_CASE_Z, hw: 1.05, hd: 1.05 });

    // Keys — actual key shapes at random positions in their rooms
    function randomKeyPos(rx, rz) {
      var margin = 2;
      for (var attempt = 0; attempt < 30; attempt++) {
        var kx = rx + margin + Math.random() * (ROOM_SIZE - margin * 2);
        var kz = rz + margin + Math.random() * (ROOM_SIZE - margin * 2);
        var blocked = false;
        for (var fi2 = 0; fi2 < furnHits.length; fi2++) {
          var fh2 = furnHits[fi2];
          if (Math.abs(kx - fh2.x) < fh2.hw + 0.5 && Math.abs(kz - fh2.z) < fh2.hd + 0.5) { blocked = true; break; }
        }
        if (!blocked) return { x: kx, z: kz };
      }
      return { x: rx + ROOM_SIZE / 2, z: rz + ROOM_SIZE / 2 };
    }

    for (var ki = 0; ki < KEY_DEFS.length; ki++) {
      var k = KEY_DEFS[ki];
      var kPos = randomKeyPos(k.rx, k.rz);
      k.x = kPos.x;
      k.z = kPos.z;

      var keyColor = COLOR_MAP[k.id];
      var keyMat = new THREE.MeshBasicMaterial({ color: keyColor, transparent: true, opacity: 0.9 });
      var keyGroup = new THREE.Group();

      // Key bow (ring/handle at top)
      var bow = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 16), keyMat);
      bow.position.y = 0.25;
      keyGroup.add(bow);
      // Bow fill
      var bowFill = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 8), new THREE.MeshBasicMaterial({ color: keyColor, transparent: true, opacity: 0.3 }));
      bowFill.rotation.x = Math.PI / 2;
      bowFill.position.y = 0.25;
      keyGroup.add(bowFill);

      // Key shaft
      var shaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.03), keyMat);
      shaft.position.y = -0.07;
      keyGroup.add(shaft);

      // Key teeth (3 teeth on the shaft)
      var toothMat = new THREE.MeshBasicMaterial({ color: keyColor, transparent: true, opacity: 0.85 });
      var tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.03), toothMat);
      tooth1.position.set(0.05, -0.12, 0); keyGroup.add(tooth1);
      var tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.03), toothMat);
      tooth2.position.set(0.06, -0.2, 0); keyGroup.add(tooth2);
      var tooth3 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), toothMat);
      tooth3.position.set(0.04, -0.05, 0); keyGroup.add(tooth3);

      // Edge wireframe
      var bowEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TorusGeometry(0.15, 0.04, 8, 16)),
        new THREE.LineBasicMaterial({ color: keyColor, opacity: 1.0 }));
      bowEdge.position.y = 0.25; keyGroup.add(bowEdge);

      keyGroup.position.set(kPos.x, 1.3, kPos.z);
      scene.add(keyGroup);

      // Glow light
      var keyLight = new THREE.PointLight(keyColor, 1.0, 6);
      keyGroup.add(keyLight);

      // Glow ring on floor
      var floorGlow = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 8, 24),
        new THREE.MeshBasicMaterial({ color: keyColor, transparent: true, opacity: 0.25 }));
      floorGlow.rotation.x = -Math.PI / 2;
      floorGlow.position.set(kPos.x, 0.05, kPos.z);
      scene.add(floorGlow);

      game.keyMeshes[k.id] = { mesh: keyGroup, ring: floorGlow };
    }

    // Agents — black suits, red eye glow
    game.agents = [];
    var headMat = new THREE.MeshBasicMaterial({
      color: 0x998877, transparent: true, opacity: 0.95
    });
    var suitMat = new THREE.MeshBasicMaterial({
      map: textures[0].tex, color: 0x1a1a1a,
      transparent: true, opacity: 0.95, side: THREE.DoubleSide
    });
    var suitEdgeMat = new THREE.LineBasicMaterial({ color: 0x2c2c2c, transparent: true, opacity: 0.75 });
    var darkEdgeMat = new THREE.LineBasicMaterial({ color: 0x383838, transparent: true, opacity: 0.85 });
    var redMat = new THREE.MeshBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.9 });
    var eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });

    function addPart(group, geo, mat, px2, py, pz2, rx, ry, rz, edgeMat2) {
      var m = new THREE.Mesh(geo, mat);
      m.position.set(px2, py, pz2);
      if (rx) m.rotation.x = rx;
      if (ry) m.rotation.y = ry;
      if (rz) m.rotation.z = rz;
      group.add(m);
    }

    function makeAgentHpBar(maxHp) {
      var cv2 = document.createElement("canvas");
      cv2.width = 128;
      cv2.height = 24;
      var ctx2 = cv2.getContext("2d");
      var tex2 = new THREE.CanvasTexture(cv2);
      tex2.minFilter = THREE.LinearFilter;
      var spr2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex2, transparent: true, depthTest: false, depthWrite: false }));
      spr2.scale.set(1.2, 0.22, 1);
      spr2.position.set(0, 2.35, 0);
      function drawHp(hp) {
        ctx2.clearRect(0, 0, cv2.width, cv2.height);
        ctx2.fillStyle = "rgba(0,0,0,0.55)";
        ctx2.fillRect(2, 6, 124, 12);
        ctx2.strokeStyle = "rgba(255,255,255,0.25)";
        ctx2.lineWidth = 2;
        ctx2.strokeRect(2, 6, 124, 12);
        var p = Math.max(0, Math.min(1, (hp || 0) / (maxHp || 1)));
        ctx2.fillStyle = p > 0.34 ? "rgba(0,255,65,0.8)" : "rgba(255,120,60,0.85)";
        ctx2.fillRect(4, 8, Math.round(120 * p), 8);
        tex2.needsUpdate = true;
      }
      drawHp(maxHp);
      return { sprite: spr2, draw: drawHp };
    }

    for (var ai = 0; ai < AGENT_SPAWNS.length; ai++) {
      var asp = AGENT_SPAWNS[ai];
      var ag = new THREE.Group();
      ag.position.set(asp.x, 0, asp.z);

      // Head with skin tone
      addPart(ag, new THREE.SphereGeometry(0.18, 6, 6), headMat, 0, 1.72, 0);
      // Black hair on top
      var hairMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.95 });
      var hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat);
      hair.position.set(0, 1.72, -0.02); ag.add(hair);
      // Sunglasses — black visor
      var glassesMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.95 });
      var glassesFrame = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.09, 0.1), glassesMat);
      glassesFrame.position.set(0, 1.74, 0.16); ag.add(glassesFrame);
      var lensL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.95 }));
      lensL.position.set(-0.09, 1.74, 0.19); ag.add(lensL);
      var lensR = lensL.clone();
      lensR.position.set(0.09, 1.74, 0.19); ag.add(lensR);
      // Nose bridge
      var bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.05), glassesMat);
      bridge.position.set(0, 1.73, 0.19); ag.add(bridge);
      // Ear pieces
      var earL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.18), glassesMat);
      earL.position.set(-0.19, 1.74, 0.1); ag.add(earL);
      var earR = earL.clone();
      earR.position.set(0.19, 1.74, 0.1); ag.add(earR);
      // Red eye glow behind glasses
      var eyeGlowL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat);
      eyeGlowL.position.set(-0.07, 1.74, 0.17); ag.add(eyeGlowL);
      var eyeGlowR = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat);
      eyeGlowR.position.set(0.07, 1.74, 0.17); ag.add(eyeGlowR);
      // Neck
      addPart(ag, new THREE.CylinderGeometry(0.07, 0.09, 0.12, 6), suitMat, 0, 1.58, 0, 0, 0, 0, suitEdgeMat);
      // Torso — suit body
      addPart(ag, new THREE.BoxGeometry(0.5, 0.45, 0.22), suitMat, 0, 1.3, 0, 0, 0, 0, suitEdgeMat);
      addPart(ag, new THREE.BoxGeometry(0.4, 0.35, 0.2), suitMat, 0, 0.95, 0, 0, 0, 0, suitEdgeMat);
      addPart(ag, new THREE.BoxGeometry(0.38, 0.15, 0.2), suitMat, 0, 0.72, 0, 0, 0, 0, suitEdgeMat);

      // Suit details — black suit, white shirt accents
      var suitDark = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.96 });
      var tieMat = new THREE.MeshBasicMaterial({ color: 0x080808, transparent: true, opacity: 0.95 });
      var whiteMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.8 });
      var metalMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.9 });
      // Shoulder pads
      var shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.24), suitDark);
      shoulderL.position.set(-0.26, 1.5, 0); ag.add(shoulderL);
      var shoulderR = shoulderL.clone(); shoulderR.position.set(0.26, 1.5, 0); ag.add(shoulderR);
      // Collar/shirt
      var collarL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.03), whiteMat);
      collarL.position.set(-0.08, 1.52, 0.11); collarL.rotation.z = 0.3; ag.add(collarL);
      var collarR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.03), whiteMat);
      collarR.position.set(0.08, 1.52, 0.11); collarR.rotation.z = -0.3; ag.add(collarR);
      // Lapels
      var lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.02), suitDark);
      lapelL.position.set(-0.17, 1.3, 0.12); lapelL.rotation.z = 0.08; ag.add(lapelL);
      var lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.02), suitDark);
      lapelR.position.set(0.17, 1.3, 0.12); lapelR.rotation.z = -0.08; ag.add(lapelR);
      // Tie
      var tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.025), tieMat);
      tieKnot.position.set(0, 1.49, 0.12); ag.add(tieKnot);
      var tieBody = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.02), tieMat);
      tieBody.position.set(0, 1.22, 0.12); ag.add(tieBody);
      var tieTip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), tieMat);
      tieTip.position.set(0, 1.05, 0.12); tieTip.rotation.z = Math.PI / 4; ag.add(tieTip);
      // Belt
      var belt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.22), suitDark);
      belt.position.set(0, 0.78, 0); ag.add(belt);
      var buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), metalMat);
      buckle.position.set(0, 0.78, 0.12); ag.add(buckle);
      // Pocket square
      var pocket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), whiteMat);
      pocket.position.set(-0.18, 1.45, 0.12); ag.add(pocket);
      // Jacket edges
      var jeCol = new THREE.MeshBasicMaterial({ color: 0x222222, opacity: 0.6, transparent: true });
      var jeL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.5, 0.01), jeCol);
      jeL.position.set(-0.12, 1.25, 0.12); ag.add(jeL);
      var jeR = jeL.clone(); jeR.position.set(0.12, 1.25, 0.12); ag.add(jeR);
      // Cuffs (white at wrist)
      var cuffMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.7 });

      // Earpiece — coiled wire and earphone
      var earpiece = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), metalMat);
      earpiece.position.set(-0.18, 1.72, -0.04); ag.add(earpiece);
      var earWire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4), metalMat);
      earWire.position.set(-0.19, 1.6, -0.04); ag.add(earWire);
      var earWire2 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4), metalMat);
      earWire2.position.set(-0.2, 1.48, 0); earWire2.rotation.x = 0.5; ag.add(earWire2);

      // Arms — suit sleeves
      var leftArmPivot = new THREE.Group();
      leftArmPivot.position.set(-0.28, 1.35, 0);
      addPart(leftArmPivot, new THREE.CylinderGeometry(0.06, 0.055, 0.35, 6), suitMat, 0, -0.18, 0, 0, 0, 0, suitEdgeMat);
      addPart(leftArmPivot, new THREE.CylinderGeometry(0.05, 0.045, 0.3, 6), suitMat, -0.02, -0.48, 0.03, 0, 0, 0, suitEdgeMat);
      ag.add(leftArmPivot);

      var rightArmPivot = new THREE.Group();
      rightArmPivot.position.set(0.28, 1.35, 0);
      addPart(rightArmPivot, new THREE.CylinderGeometry(0.06, 0.055, 0.35, 6), suitMat, 0, -0.18, 0, 0, 0, 0, suitEdgeMat);
      addPart(rightArmPivot, new THREE.CylinderGeometry(0.05, 0.045, 0.3, 6), suitMat, 0.02, -0.48, 0.03, 0, 0, 0, suitEdgeMat);
      ag.add(rightArmPivot);

      // Legs — suit pants
      var leftLegPivot = new THREE.Group();
      leftLegPivot.position.set(-0.12, 0.65, 0);
      addPart(leftLegPivot, new THREE.CylinderGeometry(0.08, 0.07, 0.4, 6), suitMat, 0, -0.2, 0, 0, 0, 0, suitEdgeMat);
      addPart(leftLegPivot, new THREE.CylinderGeometry(0.065, 0.06, 0.35, 6), suitMat, 0, -0.52, 0.02, 0, 0, 0, suitEdgeMat);
      addPart(leftLegPivot, new THREE.BoxGeometry(0.09, 0.05, 0.16), suitMat, 0, -0.67, 0.03, 0, 0, 0, suitEdgeMat);
      ag.add(leftLegPivot);

      var rightLegPivot = new THREE.Group();
      rightLegPivot.position.set(0.12, 0.65, 0);
      addPart(rightLegPivot, new THREE.CylinderGeometry(0.08, 0.07, 0.4, 6), suitMat, 0, -0.2, 0, 0, 0, 0, suitEdgeMat);
      addPart(rightLegPivot, new THREE.CylinderGeometry(0.065, 0.06, 0.35, 6), suitMat, 0, -0.52, 0.02, 0, 0, 0, suitEdgeMat);
      addPart(rightLegPivot, new THREE.BoxGeometry(0.09, 0.05, 0.16), suitMat, 0, -0.67, 0.03, 0, 0, 0, suitEdgeMat);
      ag.add(rightLegPivot);

      // Agent red glow — cosmetic only

      // Speech bubble
      var bubble = makeSpeechBubble();
      ag.add(bubble.sprite);

      // Gun for exit hall + Trinity chamber agents
      if (asp.room === 4 || asp.room === 5) {
        var gunMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.9 });
        var gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), gunMat);
        gunBody.position.set(0.02, -0.45, 0.15); rightArmPivot.add(gunBody);
        var gunHandle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.04), gunMat);
        gunHandle.position.set(0.02, -0.48, 0.08); rightArmPivot.add(gunHandle);
        var gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), gunMat);
        gunBarrel.rotation.x = Math.PI / 2;
        gunBarrel.position.set(0.02, -0.44, 0.27); rightArmPivot.add(gunBarrel);
        var muzzle = new THREE.PointLight(0xff4400, 0, 2);
        muzzle.position.set(0.02, -0.44, 0.3); rightArmPivot.add(muzzle);
      }

      scene.add(ag);
      var rw = asp.rw != null ? asp.rw : ROOM_SIZE;
      var rd = asp.rd != null ? asp.rd : ROOM_SIZE;
      var patrolX = asp.rx + AGENT_MARGIN + Math.random() * (rw - AGENT_MARGIN * 2);
      var patrolZ = asp.rz + AGENT_MARGIN + Math.random() * (rd - AGENT_MARGIN * 2);
      var hasGunRoom = asp.room === 4 || asp.room === 5;
      game.agents.push({
        group: ag, x: asp.x, z: asp.z,
        minX: asp.rx + AGENT_MARGIN, maxX: asp.rx + rw - AGENT_MARGIN,
        minZ: asp.rz + AGENT_MARGIN, maxZ: asp.rz + rd - AGENT_MARGIN,
        roomId: asp.room,
        speed: asp.speed,
        targetX: patrolX, targetZ: patrolZ,
        patrolTimer: 0,
        bubble: bubble,
        sayTimer: Math.random() * 1,
        chasing: false,
        walkPhase: Math.random() * Math.PI * 2,
        leftArm: leftArmPivot, rightArm: rightArmPivot,
        leftLeg: leftLegPivot, rightLeg: rightLegPivot,
        shootTimer: hasGunRoom ? (1.5 + Math.random() * 2) : 999,
        hasGun: hasGunRoom,
        hp: AGENT_HP,
        hitReactTimer: 0,
        hitReactDir: 1,
        dead: false, deathTimer: 0, wpQueue: [], wpAge: 0, stuckTime: 0, lastDistToTarget: 0
      });
      // HP bar (hidden until player picks up hub pistol)
      var hpBar = makeAgentHpBar(AGENT_HP);
      hpBar.sprite.visible = false;
      ag.add(hpBar.sprite);
      game.agents[game.agents.length - 1].hpBar = hpBar;
    }

    // Black cats in the Hub — wandering with funny text
    game.cats = [];
    var catMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.9 });
    var catEdgeMat = new THREE.LineBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.3 });
    var catEyeMat = new THREE.MeshBasicMaterial({ color: 0x00ff41 });
    var catSpawns = [{ x: 5, z: 10 }, { x: 9, z: 4 }];

    for (var ci = 0; ci < catSpawns.length; ci++) {
      var cs = catSpawns[ci];
      var catGrp = new THREE.Group();
      catGrp.position.set(cs.x, 0, cs.z);

      // Body
      var catBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 8), catMat);
      catBody.rotation.x = Math.PI / 2;
      catBody.position.set(0, 0.22, 0);
      catGrp.add(catBody);

      // Head
      var catHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), catMat);
      catHead.position.set(0, 0.28, 0.22);
      catGrp.add(catHead);

      // Ears (small triangular cones)
      var earGeo = new THREE.ConeGeometry(0.04, 0.08, 4);
      var earL2 = new THREE.Mesh(earGeo, catMat);
      earL2.position.set(-0.06, 0.38, 0.22); catGrp.add(earL2);
      var earR2 = new THREE.Mesh(earGeo, catMat);
      earR2.position.set(0.06, 0.38, 0.22); catGrp.add(earR2);

      // Eyes (green glowing)
      var ceL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), catEyeMat);
      ceL.position.set(-0.04, 0.3, 0.3); catGrp.add(ceL);
      var ceR = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), catEyeMat);
      ceR.position.set(0.04, 0.3, 0.3); catGrp.add(ceR);

      // Tail (curved thin cylinder)
      var tailGeo = new THREE.CylinderGeometry(0.015, 0.01, 0.3, 6);
      var catTail = new THREE.Mesh(tailGeo, catMat);
      catTail.position.set(0, 0.32, -0.25);
      catTail.rotation.x = -0.5;
      catGrp.add(catTail);

      // 4 legs
      var legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6);
      var catLeg1 = new THREE.Mesh(legGeo, catMat); catLeg1.position.set(-0.07, 0.08, 0.12); catGrp.add(catLeg1);
      var catLeg2 = new THREE.Mesh(legGeo, catMat); catLeg2.position.set(0.07, 0.08, 0.12); catGrp.add(catLeg2);
      var catLeg3 = new THREE.Mesh(legGeo, catMat); catLeg3.position.set(-0.07, 0.08, -0.12); catGrp.add(catLeg3);
      var catLeg4 = new THREE.Mesh(legGeo, catMat); catLeg4.position.set(0.07, 0.08, -0.12); catGrp.add(catLeg4);

      // Speech bubble
      var catBubble = makeSpeechBubble();
      catBubble.sprite.position.y = 1.5;
      catBubble.sprite.scale.set(2.0, 0.6, 1);
      catGrp.add(catBubble.sprite);

      scene.add(catGrp);
      game.cats.push({
        group: catGrp, x: cs.x, z: cs.z,
        minX: 0.8, maxX: 13.2, minZ: 0.8, maxZ: 13.2,
        targetX: 1 + Math.random() * 12, targetZ: 1 + Math.random() * 12,
        patrolTimer: 0, bubble: catBubble,
        sayTimer: Math.random() * 2,
        speed: 1.0 + Math.random() * 0.5
      });
    }

    // === MATRIX EASTER EGGS ===

    // Floating spoon in Archive — "There is no spoon"
    var spoonGroup = new THREE.Group();
    spoonGroup.position.set(-8, 1.5, 5);
    var spoonMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.7 });
    var spoonHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.3, 6), spoonMat);
    spoonHandle.position.y = -0.1; spoonGroup.add(spoonHandle);
    var spoonBowl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), spoonMat);
    spoonBowl.position.y = 0.06; spoonBowl.scale.set(1, 0.4, 1); spoonGroup.add(spoonBowl);
    scene.add(spoonGroup);
    game.spoon = spoonGroup;

    // Red pill & Blue pill on Hub console
    var pillMat1 = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9 });
    var pillRed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 4), pillMat1);
    pillRed.position.set(6.6, 1.1, 7); pillRed.scale.set(1, 0.6, 1); scene.add(pillRed);
    var pillMat2 = new THREE.MeshBasicMaterial({ color: 0x0044ff, transparent: true, opacity: 0.9 });
    var pillBlue = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 4), pillMat2);
    pillBlue.position.set(7.4, 1.1, 7); pillBlue.scale.set(1, 0.6, 1); scene.add(pillBlue);

    // White rabbit hopping in the Office — "Follow the white rabbit"
    var rabbitGrp = new THREE.Group();
    rabbitGrp.position.set(20, 0, 7);
    var rabbitMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.85 });
    var rBody = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), rabbitMat);
    rBody.position.y = 0.18; rBody.scale.set(1, 0.8, 1.2); rabbitGrp.add(rBody);
    var rHead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), rabbitMat);
    rHead.position.set(0, 0.28, 0.12); rabbitGrp.add(rHead);
    var rEarL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.15, 6), rabbitMat);
    rEarL.position.set(-0.04, 0.4, 0.1); rEarL.rotation.z = 0.15; rabbitGrp.add(rEarL);
    var rEarR = rEarL.clone(); rEarR.position.set(0.04, 0.4, 0.1); rEarR.rotation.z = -0.15; rabbitGrp.add(rEarR);
    var rTail = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), rabbitMat);
    rTail.position.set(0, 0.16, -0.14); rabbitGrp.add(rTail);
    var rEye = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var rEL = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), rEye);
    rEL.position.set(-0.04, 0.3, 0.18); rabbitGrp.add(rEL);
    var rER = rEL.clone(); rER.position.set(0.04, 0.3, 0.18); rabbitGrp.add(rER);
    scene.add(rabbitGrp);
    game.rabbit = { group: rabbitGrp, x: 20, z: 7, targetX: 22, targetZ: 10, timer: 0, hopPhase: 0 };

    // EXIT sign above hallway entrance
    var exitCanvas = document.createElement("canvas");
    exitCanvas.width = 128; exitCanvas.height = 48;
    var ectx = exitCanvas.getContext("2d");
    ectx.fillStyle = "rgba(0,0,0,0.8)"; ectx.fillRect(0, 0, 128, 48);
    ectx.strokeStyle = "#00ff41"; ectx.lineWidth = 2; ectx.strokeRect(2, 2, 124, 44);
    ectx.font = "bold 28px monospace"; ectx.fillStyle = "#00ff41"; ectx.textAlign = "center";
    ectx.fillText("EXIT", 64, 35);
    var exitTex = new THREE.CanvasTexture(exitCanvas);
    var exitSign = new THREE.Sprite(new THREE.SpriteMaterial({ map: exitTex, transparent: true }));
    exitSign.scale.set(1.2, 0.45, 1); exitSign.position.set(7, ROOM_H - 0.5, 27.5); scene.add(exitSign);
    scene.add(new THREE.PointLight(0x00ff41, 0.5, 4).translateX(7).translateY(ROOM_H - 0.8).translateZ(27.5));

    // Ringing phone in Server Room
    var phoneGrp = new THREE.Group();
    phoneGrp.position.set(10, 0.85, -10);
    phoneGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.12), new THREE.MeshBasicMaterial({ color: 0x222222 })));
    var phoneHandset = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.18), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    phoneHandset.position.y = 0.04; phoneGrp.add(phoneHandset);
    var phoneLight = new THREE.PointLight(0x00ff41, 0.5, 3);
    phoneGrp.add(phoneLight); scene.add(phoneGrp);
    game.phone = { light: phoneLight, handset: phoneHandset };

    // Room signs above each door
    function makeRoomSign(text, x, y, z, rotY, color) {
      var sc = document.createElement("canvas");
      sc.width = 256; sc.height = 80;
      var sctx = sc.getContext("2d");
      sctx.fillStyle = "rgba(10,10,10,0.95)";
      sctx.fillRect(0, 0, 256, 80);
      sctx.strokeStyle = color || "#00ff41";
      sctx.lineWidth = 3;
      sctx.strokeRect(3, 3, 250, 74);
      sctx.font = "bold 22px monospace";
      sctx.fillStyle = color || "#00ff41";
      sctx.textAlign = "center";
      sctx.fillText(text, 128, 50);
      var stex = new THREE.CanvasTexture(sc);
      stex.minFilter = THREE.LinearFilter;
      var signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.4),
        new THREE.MeshBasicMaterial({ map: stex, transparent: true, side: THREE.DoubleSide })
      );
      signMesh.position.set(x, y, z);
      signMesh.rotation.y = rotY || 0;
      scene.add(signMesh);
    }
    // East wall (x=14) → Office — sign on wall facing into hub
    makeRoomSign("OFFICE", 13.98, 1.7, 10, -Math.PI / 2, "#00ff41");
    // South wall (z=0) → Server Room — sign on wall facing into hub
    makeRoomSign("SERVER ROOM", 10, 1.7, 0.02, 0, "#00cc44");
    // West wall (x=0) → Archive — sign on wall facing into hub
    makeRoomSign("ARCHIVE", 0.02, 1.7, 4, Math.PI / 2, "#ff4444");
    // North wall (z=14) → Exit Hall — sign on wall facing into hub
    makeRoomSign("EXIT HALL", 4, 1.7, 13.98, Math.PI, "#4488ff");

    // Morpheus — intro NPC (leather coat, shades); spawns in front of player
    var morpheusRoot = new THREE.Group();
    morpheusRoot.position.set(playerSpawnX, 0, playerSpawnZ + morpheusAheadZ);
    morpheusRoot.rotation.y = Math.atan2(playerSpawnX - morpheusRoot.position.x, playerSpawnZ - morpheusRoot.position.z);
    var morSkin = new THREE.MeshBasicMaterial({ color: 0x5c4a3a });
    var morLeather = new THREE.MeshBasicMaterial({ color: 0x060608 });
    var morLeatherHi = new THREE.MeshBasicMaterial({ color: 0x14141a });
    var morShades = new THREE.MeshBasicMaterial({ color: 0x020202 });
    var morBoot = new THREE.MeshBasicMaterial({ color: 0x101010 });
    var morHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), morSkin);
    morHead.position.set(0, 1.74, 0); morpheusRoot.add(morHead);
    var morLensL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.056, 0.042), morShades);
    morLensL.position.set(-0.085, 1.752, 0.152); morpheusRoot.add(morLensL);
    var morLensR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.056, 0.042), morShades);
    morLensR.position.set(0.085, 1.752, 0.152); morpheusRoot.add(morLensR);
    var morSpecBr = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.022, 0.028), morShades);
    morSpecBr.position.set(0, 1.752, 0.138); morpheusRoot.add(morSpecBr);
    var morTempleL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.018, 0.12), morShades);
    morTempleL.position.set(-0.195, 1.752, 0.1); morTempleL.rotation.z = 0.12; morpheusRoot.add(morTempleL);
    var morTempleR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.018, 0.12), morShades);
    morTempleR.position.set(0.195, 1.752, 0.1); morTempleR.rotation.z = -0.12; morpheusRoot.add(morTempleR);
    var morTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.5, 8), morLeather);
    morTorso.position.set(0, 1.36, 0); morpheusRoot.add(morTorso);
    var morShoulders = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.26), morLeather);
    morShoulders.position.set(0, 1.58, 0.02); morpheusRoot.add(morShoulders);
    var morCollar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.2), morLeatherHi);
    morCollar.position.set(0, 1.82, -0.06); morCollar.rotation.x = 0.35; morpheusRoot.add(morCollar);
    var morLapelL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.04), morLeatherHi);
    morLapelL.position.set(-0.1, 1.42, 0.17); morLapelL.rotation.z = 0.22; morLapelL.rotation.y = -0.08; morpheusRoot.add(morLapelL);
    var morLapelR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.04), morLeatherHi);
    morLapelR.position.set(0.1, 1.42, 0.17); morLapelR.rotation.z = -0.22; morLapelR.rotation.y = 0.08; morpheusRoot.add(morLapelR);
    var morHips = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.48, 8), morLeather);
    morHips.position.set(0, 0.96, 0.04); morpheusRoot.add(morHips);
    var morSkirtL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.06), morLeather);
    morSkirtL.position.set(-0.16, 0.62, 0.08); morSkirtL.rotation.z = 0.08; morSkirtL.rotation.x = -0.12; morpheusRoot.add(morSkirtL);
    var morSkirtR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.06), morLeather);
    morSkirtR.position.set(0.16, 0.62, 0.08); morSkirtR.rotation.z = -0.08; morSkirtR.rotation.x = -0.12; morpheusRoot.add(morSkirtR);
    var morArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.58, 6), morLeather);
    morArmL.position.set(-0.27, 1.2, 0); morpheusRoot.add(morArmL);
    var morArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.58, 6), morLeather);
    morArmR.position.set(0.27, 1.2, 0); morpheusRoot.add(morArmR);
    var morGunProp = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.1, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.98 })
    );
    morGunProp.position.set(0.02, -0.22, 0.1);
    morGunProp.rotation.x = 0.35;
    morGunProp.rotation.z = -0.12;
    morGunProp.visible = false;
    morArmR.add(morGunProp);
    game.morpheusGunProp = morGunProp;
    var morLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.78, 6), morBoot);
    morLegL.position.set(-0.11, 0.39, 0); morpheusRoot.add(morLegL);
    var morLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.78, 6), morBoot);
    morLegR.position.set(0.11, 0.39, 0); morpheusRoot.add(morLegR);
    var morBubble = makeSpeechBubble();
    morBubble.sprite.position.set(0, 2.75, 0);
    morBubble.sprite.scale.set(3.5, 1.2, 1);
    morpheusRoot.add(morBubble.sprite);
    game.morpheusBubble = morBubble;
    game.morpheusRoot = morpheusRoot;
    morpheusRoot.renderOrder = 22;
    scene.add(morpheusRoot);

    function reinstateMorpheusForBetrayalAmbush() {
      var mr = game.morpheusRoot;
      if (!mr) return;
      mr.visible = true;
      mr.renderOrder = 22;
      mr.traverse(function (obj) {
        if (obj.isMesh && obj.material && obj.material.isMaterial) {
          var m = obj.material;
          if (game.morpheusGunProp && obj === game.morpheusGunProp) {
            m.transparent = true;
            m.opacity = 0.98;
            m.depthWrite = true;
            m.depthTest = true;
          } else {
            m.opacity = 1;
            m.transparent = false;
            m.depthWrite = true;
            m.depthTest = true;
            m.alphaTest = 0;
            if (m.blending !== undefined) m.blending = THREE.NormalBlending;
            if (m.premultipliedAlpha !== undefined) m.premultipliedAlpha = false;
          }
          obj.renderOrder = 22;
          m.needsUpdate = true;
        }
        if (obj.isSprite && obj.material) {
          obj.renderOrder = 32;
          obj.material.opacity = 1;
          obj.material.depthTest = false;
          obj.material.depthWrite = false;
          obj.material.needsUpdate = true;
        }
      });
    }
    game.reinstateMorpheusForBetrayalAmbush = reinstateMorpheusForBetrayalAmbush;

    // Phone booth in Hub corner
    var boothGroup = new THREE.Group();
    boothGroup.position.set(1.5, 0, 12.5);
    var boothMat = new THREE.MeshBasicMaterial({ color: 0xcc2222, transparent: true, opacity: 0.7 });
    var boothFrame = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.8 });
    var boothGlass = new THREE.MeshBasicMaterial({ color: 0x224444, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    // Base
    var boothBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.0), boothFrame);
    boothBase.position.set(0, 0.05, 0); boothGroup.add(boothBase);
    // Back wall
    var backWall = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.8, 0.06), boothMat);
    backWall.position.set(0, 1.45, -0.47); boothGroup.add(backWall);
    // Side walls
    var sideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.8, 1.0), boothMat);
    sideL.position.set(-0.47, 1.45, 0); boothGroup.add(sideL);
    var sideR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.8, 1.0), boothMat);
    sideR.position.set(0.47, 1.45, 0); boothGroup.add(sideR);
    // Roof
    var roof = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), boothMat);
    roof.position.set(0, 2.84, 0); boothGroup.add(roof);
    // Glass panels on sides
    var glassL = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.0), boothGlass);
    glassL.rotation.y = Math.PI / 2; glassL.position.set(-0.44, 1.5, 0); boothGroup.add(glassL);
    var glassR = glassL.clone(); glassR.position.set(0.44, 1.5, 0); boothGroup.add(glassR);
    // Phone inside — more visible
    var phoneMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.95 });
    var phoneBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.1), phoneMat);
    phoneBox.position.set(0, 1.4, -0.4); boothGroup.add(phoneBox);
    // Coin slot
    var coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0x444444 }));
    coinSlot.position.set(0, 1.52, -0.34); boothGroup.add(coinSlot);
    // Handset cradle
    var cradle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.06), phoneMat);
    cradle.position.set(0, 1.55, -0.36); boothGroup.add(cradle);
    // Handset — earpiece, body, mouthpiece
    var handsetMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.95 });
    var hsEar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 6), handsetMat);
    hsEar.position.set(0, 1.58, -0.4); boothGroup.add(hsEar);
    var hsBody = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 6), handsetMat);
    hsBody.rotation.x = Math.PI / 2;
    hsBody.position.set(0, 1.58, -0.33); boothGroup.add(hsBody);
    var hsMouth = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 6), handsetMat);
    hsMouth.position.set(0, 1.58, -0.26); boothGroup.add(hsMouth);
    // Cord
    var cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.25, 6), new THREE.MeshBasicMaterial({ color: 0x333333 }));
    cord.position.set(0, 1.42, -0.32); cord.rotation.x = 0.3; boothGroup.add(cord);
    // Number pad glow
    var padGlow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.01), new THREE.MeshBasicMaterial({ color: 0x33dd66, transparent: true, opacity: 0.5 }));
    padGlow.position.set(0, 1.35, -0.34); boothGroup.add(padGlow);
    // Interior light
    var boothLight = new THREE.PointLight(0x00ff41, 0.6, 4);
    boothLight.position.set(0, 2.2, 0); boothGroup.add(boothLight);
    game.boothLight = boothLight;
    // "TELEPHONE" sign on top
    var telCanvas = document.createElement("canvas");
    telCanvas.width = 256; telCanvas.height = 48;
    var telCtx = telCanvas.getContext("2d");
    telCtx.fillStyle = "rgba(0,0,0,0.9)"; telCtx.fillRect(0, 0, 256, 48);
    telCtx.font = "bold 16px monospace"; telCtx.fillStyle = "#00ff41"; telCtx.textAlign = "center";
    telCtx.fillText("TELEPHONE", 128, 32);
    var telTex = new THREE.CanvasTexture(telCanvas);
    var telSign = new THREE.Sprite(new THREE.SpriteMaterial({ map: telTex, transparent: true }));
    telSign.scale.set(1.0, 0.3, 1); telSign.position.set(0, 3.0, 0);
    boothGroup.add(telSign);
    scene.add(boothGroup);
    game.boothHandsetParts = [hsEar, hsBody, hsMouth];

    // === WALL ART — Matrix-themed paintings ===
    function makeWallArt(lines, x, y, z, rotY, w, h, bgColor, textColor, frameColor) {
      var ac = document.createElement("canvas");
      ac.width = 256; ac.height = Math.round(256 * (h / w));
      var actx = ac.getContext("2d");
      // Background
      actx.fillStyle = bgColor || "rgba(5,5,5,0.95)";
      actx.fillRect(0, 0, ac.width, ac.height);
      // Frame border
      actx.strokeStyle = frameColor || "#00ff41";
      actx.lineWidth = 4;
      actx.strokeRect(4, 4, ac.width - 8, ac.height - 8);
      // Inner frame
      actx.strokeStyle = frameColor || "#00ff41";
      actx.lineWidth = 1;
      actx.globalAlpha = 0.3;
      actx.strokeRect(12, 12, ac.width - 24, ac.height - 24);
      actx.globalAlpha = 1;
      // Text lines
      actx.fillStyle = textColor || "#00ff41";
      actx.textAlign = "center";
      var lineH = ac.height / (lines.length + 2);
      for (var li = 0; li < lines.length; li++) {
        var fontSize = lines[li].size || 20;
        actx.font = (lines[li].bold ? "bold " : "") + fontSize + "px monospace";
        actx.fillStyle = lines[li].color || textColor || "#00ff41";
        actx.fillText(lines[li].text, ac.width / 2, lineH * (li + 1.5));
      }
      var atex = new THREE.CanvasTexture(ac);
      atex.minFilter = THREE.LinearFilter;
      var artMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: atex, transparent: true, side: THREE.DoubleSide })
      );
      artMesh.position.set(x, y, z);
      artMesh.rotation.y = rotY || 0;
      scene.add(artMesh);
    }

    // HUB — Motivational poster
    makeWallArt([
      { text: "WELCOME TO", size: 16 },
      { text: "THE MATRIX", size: 28, bold: true },
      { text: "", size: 10 },
      { text: "You are being watched.", size: 14, color: "#888888" },
      { text: "Have a nice day.", size: 14, color: "#888888" }
    ], 3, 2.0, 0.05, 0, 2.0, 1.4, "#050505", "#00ff41", "#00ff41");

    // HUB — Wanted poster on west wall
    makeWallArt([
      { text: "W A N T E D", size: 26, bold: true, color: "#ff4444" },
      { text: "", size: 8 },
      { text: "MR. ANDERSON", size: 22, bold: true },
      { text: "a.k.a. \"Neo\"", size: 16 },
      { text: "", size: 8 },
      { text: "For crimes against", size: 14, color: "#888888" },
      { text: "the system", size: 14, color: "#888888" }
    ], 0.05, 1.8, 1.5, Math.PI / 2, 1.6, 1.8, "#0a0500", "#ffcc00", "#ff4444");

    // OFFICE — Employee of the month
    makeWallArt([
      { text: "EMPLOYEE OF", size: 18 },
      { text: "THE MONTH", size: 22, bold: true },
      { text: "", size: 8 },
      { text: "AGENT SMITH", size: 20, bold: true, color: "#ffcc00" },
      { text: "", size: 8 },
      { text: "\"Most humans deleted\"", size: 12, color: "#888888" }
    ], 21, 2.0, 0.05, 0, 1.6, 1.6, "#050505", "#00ff41", "#ffaa00");

    // OFFICE — Bug report
    makeWallArt([
      { text: "THERE IS NO BUG", size: 20, bold: true },
      { text: "", size: 10 },
      { text: "ONLY", size: 16, color: "#888888" },
      { text: "", size: 8 },
      { text: "FEATURES", size: 24, bold: true, color: "#00ccff" }
    ], 27.95, 1.8, 7, -Math.PI / 2, 1.4, 1.2, "#050510", "#00ff41", "#00ccff");

    // SERVER ROOM — Uptime sign
    makeWallArt([
      { text: "DAYS SINCE", size: 18 },
      { text: "LAST GLITCH", size: 18 },
      { text: "", size: 10 },
      { text: "0", size: 48, bold: true, color: "#ff4444" },
    ], 7, 1.8, -13.95, Math.PI, 1.4, 1.4, "#050000", "#00ff41", "#ff4444");

    // SERVER ROOM — Emergency sign
    makeWallArt([
      { text: "IN CASE OF", size: 16 },
      { text: "EMERGENCY", size: 20, bold: true, color: "#ff4444" },
      { text: "", size: 8 },
      { text: "TAKE THE", size: 14, color: "#888888" },
      { text: "RED PILL", size: 24, bold: true, color: "#ff0000" }
    ], 13.95, 1.8, -7, -Math.PI / 2, 1.4, 1.6, "#0a0000", "#ffcc00", "#ff0000");

    // ARCHIVE — Filing notice
    makeWallArt([
      { text: "NOTICE", size: 22, bold: true },
      { text: "", size: 8 },
      { text: "All memories are", size: 14, color: "#888888" },
      { text: "filed under", size: 14, color: "#888888" },
      { text: "", size: 8 },
      { text: "\"SIMULATION\"", size: 20, bold: true, color: "#00ccff" }
    ], -13.95, 1.8, 7, Math.PI / 2, 1.4, 1.6, "#050505", "#00ff41", "#00ccff");

    // ARCHIVE — Spoon poster
    makeWallArt([
      { text: "DO NOT BEND", size: 20, bold: true },
      { text: "THE SPOONS", size: 20, bold: true },
      { text: "", size: 10 },
      { text: "- Management", size: 14, color: "#666666" },
      { text: "", size: 8 },
      { text: "(They don't exist anyway)", size: 12, color: "#444444" }
    ], -7, 2.0, 13.95, Math.PI, 1.5, 1.4, "#050505", "#cccccc", "#888888");

    // EXIT HALL — Last warning
    makeWallArt([
      { text: "⚠ WARNING ⚠", size: 20, bold: true, color: "#ffaa00" },
      { text: "", size: 8 },
      { text: "Agents beyond", size: 16 },
      { text: "this point are", size: 16 },
      { text: "ARMED & CRANKY", size: 20, bold: true, color: "#ff4444" }
    ], 0.05, 1.8, 21, Math.PI / 2, 1.4, 1.4, "#0a0500", "#00ff41", "#ffaa00");

    makeWallArt([
      { text: "THEY HAVE", size: 17, bold: true, color: "#ff66cc" },
      { text: "TRINITY", size: 22, bold: true, color: "#ffaaee" },
      { text: "", size: 6 },
      { text: "Negotiation: denied.", size: 11, color: "#888888" },
    ], 3.05, 1.85, 50, Math.PI / 2, 1.15, 1.3, "#120510", "#ffccff", "#ff66cc");

    makeWallArt([
      { text: "EXIT", size: 18, bold: true, color: "#00ffff" },
      { text: "REAL WORLD", size: 14, color: "#88ffee" },
    ], 11.95, 1.9, 58, -Math.PI / 2, 1.0, 1.1, "#001818", "#00ffcc", "#00ffff");

    // Proximity text labels for easter eggs
    function makeProxLabel(text, x, y, z, color) {
      var lc = document.createElement("canvas");
      lc.width = 512; lc.height = 64;
      var lctx = lc.getContext("2d");
      lctx.font = "bold 22px monospace";
      lctx.fillStyle = color || "#00ff41";
      lctx.textAlign = "center";
      lctx.fillText(text, 256, 40);
      var ltex = new THREE.CanvasTexture(lc);
      ltex.minFilter = THREE.LinearFilter;
      var lsprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: ltex, transparent: true, depthTest: false }));
      lsprite.scale.set(2.5, 0.35, 1);
      lsprite.position.set(x, y, z);
      lsprite.material.opacity = 0;
      scene.add(lsprite);
      return lsprite;
    }
    game.proxLabels = [
      { sprite: makeProxLabel("\"There is no spoon\"", -8, 2.2, 5, "#cccccc"), x: -8, z: 5, range: 4 },
      { sprite: makeProxLabel("Choose wisely...", 7, 1.7, 7, "#ffcc00"), x: 7, z: 7, range: 3 },
      { sprite: makeProxLabel("Follow the white rabbit", 20, 0.7, 7, "#ffffff"), x: 20, z: 7, range: 5 },
      { sprite: makeProxLabel("Ring ring... pick up!", 10, 1.5, -10, "#00ff41"), x: 10, z: -10, range: 4 },
      { sprite: makeProxLabel("The line is open, Neo...", 1.5, 2.0, 11.5, "#00ff41"), x: 1.5, z: 11.8, range: 2.5 },
      { sprite: makeProxLabel("Break glass — collect all keys (pistol)", 7, 2.0, 10.5, "#00ccff"), x: 7, z: 10.5, range: 3 },
      { sprite: makeProxLabel("Armory — clear Exit Hall, then grab the MG", EXIT_HALL_CASE_X, 2.1, EXIT_HALL_CASE_Z, "#ffaa66"), x: EXIT_HALL_CASE_X, z: EXIT_HALL_CASE_Z, range: 5 },
    ];

    // Particles
    var pCnt = game.isMobile ? 40 : 100;
    var pGeo = new THREE.BufferGeometry();
    var pArr = new Float32Array(pCnt * 3);
    for (var pi = 0; pi < pCnt; pi++) {
      var pr = ROOMS[Math.floor(Math.random() * 5)];
      pArr[pi * 3] = pr.x + Math.random() * ROOM_SIZE;
      pArr[pi * 3 + 1] = Math.random() * ROOM_H;
      pArr[pi * 3 + 2] = pr.z + Math.random() * ROOM_SIZE;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pArr, 3));
    var particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: 0x00ff41,
        size: game.isMobile ? 0.055 : 0.045,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
      })
    );
    scene.add(particles);

    // Collision
    function hitWall(nx, nz) {
      for (var i = 0; i < WALL_SEGS.length; i++) {
        var w = WALL_SEGS[i];
        if (w.a === "x") { if (Math.abs(nx - w.p) < 0.4 && nz >= w.mn && nz <= w.mx) return true; }
        else { if (Math.abs(nz - w.p) < 0.4 && nx >= w.mn && nx <= w.mx) return true; }
      }
      for (var i = 0; i < DOOR_DEFS.length; i++) {
        var d = DOOR_DEFS[i];
        if (game.opened.has(d.id)) continue;
        if (d.a === "x") { if (Math.abs(nx - d.p) < 0.4 && nz >= d.mn && nz <= d.mx) return true; }
        else { if (Math.abs(nz - d.p) < 0.4 && nx >= d.mn && nx <= d.mx) return true; }
      }
      for (var i = 0; i < furnHits.length; i++) {
        var fh = furnHits[i];
        if (Math.abs(nx - fh.x) < fh.hw && Math.abs(nz - fh.z) < fh.hd) return true;
      }
      if (game.trinityRoomSealed && nx >= TRINITY_X0 && nx <= TRINITY_X1 && nz >= TRINITY_Z0 && nz <= TRINITY_Z1) {
        if (Math.abs(nz - TRINITY_Z0) < 0.5) return true;
        if (Math.abs(nz - TRINITY_Z1) < 0.5) return true;
      }
      if (!game.finalDoorOpen && !game.trinityRoomSealed) {
        if (Math.abs(nz - TRINITY_Z1) < 0.45 && nx >= TRINITY_X0 && nx <= 5.25) return true;
        if (Math.abs(nz - TRINITY_Z1) < 0.45 && nx >= 8.75 && nx <= TRINITY_X1) return true;
      }
      return false;
    }

    var agentRadConst = 0.25;
    function agentHitsFurn(ax, az) {
      for (var fci = 0; fci < furnHits.length; fci++) {
        var fch = furnHits[fci];
        var ahw = fch.hw - 0.4 + agentRadConst;
        var ahd = fch.hd - 0.4 + agentRadConst;
        if (Math.abs(ax - fch.x) < ahw && Math.abs(az - fch.z) < ahd) return fch;
      }
      return null;
    }

    function catBlocked(cx2, cz2) {
      for (var cfci = 0; cfci < furnHits.length; cfci++) {
        var cfh = furnHits[cfci];
        if (Math.abs(cx2 - cfh.x) < cfh.hw && Math.abs(cz2 - cfh.z) < cfh.hd) return true;
      }
      return false;
    }

    function segmentXZHitsBulletBlocks(x0, z0, x1, z1, py) {
      if (!game.bulletBlocks || py < 0.08 || py > ROOM_H - 0.08) return false;
      var nSt = 14;
      for (var st = 0; st <= nSt; st++) {
        var u = st / nSt;
        var sx = x0 + (x1 - x0) * u;
        var sz = z0 + (z1 - z0) * u;
        for (var bbi = 0; bbi < game.bulletBlocks.length; bbi++) {
          var blk = game.bulletBlocks[bbi];
          if (Math.abs(sx - blk.x) < blk.hw && Math.abs(sz - blk.z) < blk.hd) return true;
        }
      }
      return false;
    }

    function minDistXZSegmentToPoint(x0, z0, x1, z1, px, pz) {
      var dx = x1 - x0, dz = z1 - z0;
      var len2 = dx * dx + dz * dz;
      if (len2 < 1e-8) return Math.hypot(x0 - px, z0 - pz);
      var t = Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / len2));
      var qx = x0 + t * dx, qz = z0 + t * dz;
      return Math.hypot(qx - px, qz - pz);
    }

    // Desktop input
    function onKD(e) {
      game.kbd[e.code] = true;
      if (e.code === "Space") {
        e.preventDefault();
        if (!game.slowMo && game.slowMoCooldown <= 0 && !game.won && !game.caught) {
          game.slowMo = true;
          game.slowMoTimer = 7;
        }
      }
    }
    function onKU(e) { game.kbd[e.code] = false; }
    var lastMouseX = -1, lastMouseY = -1;
    function onMD(e) {
      if (e.button === 0) {
        if (game.smithPhase === 3 && !game.caught && !game.won) {
          playerPunch();
          return;
        }
        if (!document.pointerLockElement && renderer.domElement && !game.won && !game.caught) {
          try { renderer.domElement.requestPointerLock(); } catch (err) { /* ok */ }
        }
        if (game.hasGun && !game.won && !game.caught && !game.playerFrozen && !trinityGunLocked()) {
          if (game.hasMachineGun) game.fireHeld = true;
          else playerShoot();
        }
      }
    }
    if (!game._shootDir) game._shootDir = new THREE.Vector3();
    function trinityGunLocked() {
      if (game.trinityLiberationStarted && !game.trinityAgentsCleared) return true;
      if (game.trinityAgentsCleared && game.trinityRoot && game.trinityRoot.visible
          && game.trinityPhase >= 0 && game.trinityPhase < 3) return true;
      return false;
    }
    game.trinityGunLockedFn = trinityGunLocked;
    function playerShoot() {
      if (game.playerFrozen) return;
      if (trinityGunLocked()) return;
      if (game.smithPhase >= 0 && game.smithPhase <= 4 && game.trinityPhase !== 3) return;
      if (!game.hasGun || !game.camera || !game.sceneRef || !game.introDone) return;
      var cam = game.camera;
      var dir = game._shootDir;
      dir.set(0, 0, -1);
      dir.applyQuaternion(cam.quaternion);
      var isMg = game.hasMachineGun;
      var br = isMg ? 0.055 : 0.08;
      var bCol = isMg ? 0xffaa33 : 0x00ff41;
      var tCol = isMg ? 0xff7722 : 0x00cc33;
      var bMesh = new THREE.Mesh(new THREE.SphereGeometry(br, 4, 4),
        new THREE.MeshBasicMaterial({ color: bCol, transparent: true, opacity: 0.95 }));
      var bTrail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.22, 6),
        new THREE.MeshBasicMaterial({ color: tCol, transparent: true, opacity: 0.5 }));
      bTrail.rotation.x = Math.PI / 2; bTrail.position.z = 0.14; bMesh.add(bTrail);
      bMesh.position.copy(cam.position);
      bMesh.rotation.y = Math.atan2(dir.x, dir.z);
      game.sceneRef.add(bMesh);
      var bspd = isMg ? 14.5 : 12;
      game.playerBullets.push({
        mesh: bMesh, dx: dir.x, dy: dir.y, dz: dir.z, life: isMg ? 2.2 : 3, speed: bspd,
        prevX: bMesh.position.x, prevZ: bMesh.position.z
      });
    }
    game.playerShoot = playerShoot;
    function playerPunch() {
      if (game.caught || game.won || game.smithPhase !== 3) return;
      if (game.playerPunchCd > 0) return;
      var cam2 = game.camera;
      if (!cam2 || !game.agentSmith) return;
      game.playerPunchCd = 0.4;
      game.playerPunchAnim = 0.34;
      if (game.punchVisualGroup) game.punchVisualGroup.visible = true;
      var ppx = cam2.position.x, ppz = cam2.position.z;
      var s = game.agentSmith;
      var pdx = s.x - ppx, pdz = s.z - ppz;
      var pdist = Math.hypot(pdx, pdz);
      var pfwdx = -Math.sin(game.yaw), pfwdz = -Math.cos(game.yaw);
      var pinv = pdist > 0.02 ? 1 / pdist : 0;
      var pdot = (pfwdx * pdx + pfwdz * pdz) * pinv;
      if (game.brawlSmithHp > 0 && pdist < 1.4 && pdot > 0.38) {
        game.brawlSmithHp--;
        game.smithHitReactTimer = 0.42;
        spawnHitParticles(s.x, 1.35, s.z, 0xffffff, 18);
        updateGame({ brawlSmithHp: game.brawlSmithHp });
        if (game.brawlSmithHp <= 0) {
          game.smithPhase = 4;
          game.smithDefeatSubPhase = 0;
          game.smithDefeatTimer = 0;
          game.smithKneelT = 0;
          game.smithDefeatLineShown = false;
          game.smithHitReactTimer = 0;
          s.group.rotation.z = 0;
          updateGame({ brawlActive: false });
        }
      }
    }
    game.playerPunchFn = playerPunch;
    function onMU(e) {
      if (e.button === 0) game.fireHeld = false;
    }
    function onMM(e) {
      if (game.won || game.caught) return;
      if (document.pointerLockElement) {
        game.yaw -= e.movementX * MOUSE_SENS * settingsRef.current.sensitivity;
        game.pitch -= e.movementY * MOUSE_SENS * settingsRef.current.sensitivity;
        game.locked = true;
      } else {
        // Fallback: track position deltas even without pointer lock
        if (lastMouseX >= 0) {
          game.yaw -= (e.clientX - lastMouseX) * MOUSE_SENS * settingsRef.current.sensitivity;
          game.pitch -= (e.clientY - lastMouseY) * MOUSE_SENS * settingsRef.current.sensitivity;
          game.locked = true;
        }
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
      game.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, game.pitch));
    }
    function onMLeave() { lastMouseX = -1; lastMouseY = -1; }
    function onMEnter(e) { lastMouseX = e.clientX; lastMouseY = e.clientY; }
    function onPLC() {
      game.locked = !!document.pointerLockElement;
      // Reset fallback tracking when pointer lock changes
      lastMouseX = -1; lastMouseY = -1;
      if (pauseRef.current && !game.isMobile) {
        if (document.pointerLockElement) {
          pauseRef.current.style.display = "none";
        } else if (!game.won && !game.caught) {
          pauseRef.current.style.display = "flex";
        }
      }
    }
    document.addEventListener("keydown", onKD);
    document.addEventListener("keyup", onKU);
    document.addEventListener("mousedown", onMD);
    document.addEventListener("mouseup", onMU);
    document.addEventListener("mousemove", onMM);
    document.addEventListener("mouseenter", onMEnter);
    document.addEventListener("mouseleave", onMLeave);
    function onWheel(e) {
      if (game.won || game.caught) return;
      e.preventDefault();
      game.yaw -= e.deltaX * 0.003 * settingsRef.current.sensitivity;
      game.yaw -= e.deltaY * 0.003 * settingsRef.current.sensitivity;
      game.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, game.pitch));
      game.locked = true;
    }
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("pointerlockchange", onPLC);

    // Prevent all scroll/bounce from touch inputs while game is active
    function preventScroll(e) { e.preventDefault(); }
    document.addEventListener("touchmove", preventScroll, { passive: false });
    document.addEventListener("touchstart", preventScroll, { passive: false });
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    // Always enable movement - don't gate on pointer lock
    game.locked = true;

    function onResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(effectivePixelRatio());
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener("resize", onResize);

    var clock = new THREE.Clock();
    var camEuler = new THREE.Euler(0, 0, 0, "YXZ");
    var animId = null;
    var texTick = 0;
    var frameCnt = 0;

    function showRoom(name) {
      if (roomNameRef.current) {
        roomNameRef.current.textContent = name;
        roomNameRef.current.style.opacity = "1";
        clearTimeout(roomNameTimer.current);
        roomNameTimer.current = setTimeout(function () {
          if (roomNameRef.current) roomNameRef.current.style.opacity = "0";
        }, 2000);
      }
    }

    function gameLoop() {
      animId = requestAnimationFrame(gameLoop);
      try {
        if (document.hidden) {
          clock.getDelta();
          if (game.won || game.caught) renderer.render(scene, camera);
          return;
        }
        if (game.won || game.caught) { renderer.render(scene, camera); return; }
        var realDt = Math.min(clock.getDelta(), 0.05);
        var dt = realDt;
        var animT = Date.now() * 0.001;

        // Slow-mo (Matrix Time) processing
        if (game.slowMoCooldown > 0) game.slowMoCooldown -= realDt;
        if (game.slowMo) {
          game.slowMoTimer -= realDt;
          dt = realDt * 0.2; // everything at 20% speed
          if (game.slowMoTimer <= 0) {
            game.slowMo = false;
            game.slowMoCooldown = 10; // cooldown before next use
          }
        }

      // Look is handled directly in touch handler (delta-based, like a mouse)

      // Movement
      // Movement — always active during gameplay
      {
        var isSprinting = (game.kbd.ShiftLeft || game.kbd.ShiftRight || game.sprinting);
        var sp = MOVE_SPEED * (isSprinting ? SPRINT_MULT : 1);
        var fwd = 0, str = 0;
        if (game.isMobile) {
          // Instant full speed when joystick moved past dead zone
          var deadZone = 0.15;
          if (Math.abs(game.moveX) > deadZone) str = game.moveX > 0 ? 1 : -1;
          if (Math.abs(game.moveZ) > deadZone) fwd = game.moveZ > 0 ? -1 : 1;
        } else {
          if (game.kbd.KeyW || game.kbd.ArrowUp) fwd = 1;
          if (game.kbd.KeyS || game.kbd.ArrowDown) fwd = -1;
          if (game.kbd.KeyA || game.kbd.ArrowLeft) str = -1;
          if (game.kbd.KeyD || game.kbd.ArrowRight) str = 1;
        }
        if (!game.introDone && game.introPhase === 0) { fwd = 0; str = 0; }
        var trinitySeqMoveLock = game.trinityAgentsCleared && game.trinityRoot && game.trinityPhase >= 0 && game.trinityPhase < 4
          && !game.trinityBetrayalAnim;
        var smithExitStepLock = game.smithPhase === 0;
        if (trinitySeqMoveLock || smithExitStepLock || game.playerFrozen) { fwd = 0; str = 0; }
        var il = Math.sqrt(str * str + fwd * fwd);
        if (il > 1) { str /= il; fwd /= il; }
        var sy = Math.sin(game.yaw), cy = Math.cos(game.yaw);
        var dx = (str * cy - fwd * sy) * sp * dt;
        var dz = (-str * sy - fwd * cy) * sp * dt;
        var nx = camera.position.x + dx;
        var nz = camera.position.z + dz;
        if (!hitWall(nx, camera.position.z)) camera.position.x = nx;
        if (!hitWall(camera.position.x, nz)) camera.position.z = nz;
        camEuler.set(game.pitch, game.yaw, 0, "YXZ");
        camera.quaternion.setFromEuler(camEuler);
      }

      // Room detection
      var px = camera.position.x, pz = camera.position.z;
      var rid = whichRoom(px, pz);
      if (rid >= 0) game.currentRoom = rid;
      if (rid >= 0 && rid !== game.lastRoom) {
        game.lastRoom = rid;
        if (rid === 5) {
          showRoom("Trinity Chamber");
          updateGame({ room: "Trinity Chamber", foundTrinity: true });
        } else {
          showRoom(ROOMS[rid].name);
          updateGame({ room: ROOMS[rid].name });
        }
      }
      // Hallway label (narrow section only — ends before Trinity chamber)
      if (px >= 5 && px <= 9 && pz >= 28 && pz < 42 && game.lastRoom !== 99) {
        game.lastRoom = 99;
        game.currentRoom = 4;
        showRoom("Escape Corridor");
      }

      if (!game.caught && !game.won) {
        if (game.playerRegenPause > 0) {
          game.playerRegenPause = Math.max(0, game.playerRegenPause - dt);
        } else {
          game.playerHp = Math.min(PLAYER_HP_MAX, game.playerHp + PLAYER_HP_REGEN_PER_SEC * dt);
        }
      }

      // Break glass case when all 3 keys collected
      var allKeys = game.collected.has("green") && game.collected.has("red") && game.collected.has("blue");
      if (allKeys && game.glassCase && game.glassCase.visible) {
        game.glassCase.visible = false;
        scene.remove(game.glassCase);
        game.glassCase = null;
        for (var fhi = furnHits.length - 1; fhi >= 0; fhi--) {
          if (furnHits[fhi].x === 7 && furnHits[fhi].z === 10.5) { furnHits.splice(fhi, 1); break; }
        }
        showRoom("CASE UNLOCKED — GRAB THE PISTOL");
      }

      // Gun pickup — only when glass case is gone
      if (!game.hasGun && game.gunMesh && !game.glassCase) {
        var gpDist = Math.sqrt(Math.pow(px - 7, 2) + Math.pow(pz - 10.5, 2));
        if (gpDist < 1.5) {
          game.hasGun = true;
          scene.remove(game.gunMesh);
          game.gunMesh = null;
          // Open blue door
          game.opened.add("blue");
          if (game.doorMeshes["blue"]) {
            for (var dmi = 0; dmi < game.doorMeshes["blue"].length; dmi++) scene.remove(game.doorMeshes["blue"][dmi]);
          }
          showRoom("PISTOL ACQUIRED — EXIT HALL OPEN");
          updateGame({ hasGun: true, doors: { green: true, red: true, blue: true } });
          for (var hbi = 0; hbi < game.agents.length; hbi++) {
            var hbAg = game.agents[hbi];
            if (hbAg.hpBar && hbAg.hpBar.sprite) hbAg.hpBar.sprite.visible = true;
          }
        }
      }
      if (game.exitHallCaseOpened && game.exitHallMGMesh && !game.hasMachineGun) {
        var mgPickD = Math.hypot(px - EXIT_HALL_CASE_X, pz - EXIT_HALL_CASE_Z);
        if (mgPickD < 1.65) {
          var mgTaken = game.exitHallMGMesh;
          if (mgTaken && mgTaken.parent) mgTaken.parent.remove(mgTaken);
          game.exitHallMGMesh = null;
          game.hasMachineGun = true;
          if (!game.hallDoorOpen) {
            game.hallDoorOpen = true;
            if (game.hallDoorMesh) { scene.remove(game.hallDoorMesh); game.hallDoorMesh = null; }
          }
          showRoom("MACHINE GUN — CORRIDOR TO TRINITY OPEN");
          updateGame({ hasMachineGun: true });
        }
      }
      // Floating gun animation — always spinning
      if (game.gunMesh) {
        game.gunMesh.rotation.y = animT * 2;
        game.gunMesh.position.y = 1.3 + Math.sin(animT * 3) * 0.15;
      }
      if (game.exitHallMGMesh && game.exitHallCaseOpened) {
        game.exitHallMGMesh.rotation.y = animT * 2.4;
        game.exitHallMGMesh.position.y = 1.38 + Math.sin(animT * 3.2) * 0.08;
      }

      // Machine gun — hold fire (desktop mouse / mobile FIRE held)
      game.mgFireCd = Math.max(0, game.mgFireCd - dt);
      if (game.fireHeld && game.hasMachineGun && game.hasGun && !game.won && !game.caught && game.introDone && !game.playerFrozen && !trinityGunLocked()) {
        if (!(game.smithPhase >= 0 && game.smithPhase <= 4 && game.trinityPhase !== 3)) {
          var mgBurst = 0;
          while (game.mgFireCd <= 0 && mgBurst < 10) {
            playerShoot();
            game.mgFireCd += MG_FIRE_INTERVAL;
            mgBurst++;
          }
        }
      }

      // Hallway door collision (z=28) — blocks until all room 4 agents killed
      if (!game.hallDoorOpen) {
        if (Math.abs(pz - 28) < 0.6 && px >= 5 && px <= 9) {
          camera.position.z = Math.min(camera.position.z, 27.4);
        }
      }

      // Morpheus intro — briefing, run to booth, jack out
      if (!game.introDone && game.morpheusRoot) {
        var mroot = game.morpheusRoot;
        if (game.introPhase === 0) {
          if (game.introTimer === 0 && game.morpheusBubble) {
            updateBubbleText(game.morpheusBubble, "Neo.\nYou must save Trinity.\nEscape the Matrix.");
          }
          game.introTimer += dt;
          mroot.rotation.y = Math.atan2(px - mroot.position.x, pz - mroot.position.z);
          if (game.introTimer >= 3.5) {
            game.introPhase = 1;
            game.introTimer = 0;
            if (game.morpheusBubble) game.morpheusBubble.sprite.visible = false;
          }
        } else if (game.introPhase === 1) {
          var mtx = 1.5, mtz = 11.15;
          var mdx = mtx - mroot.position.x, mdz = mtz - mroot.position.z;
          var mdist = Math.hypot(mdx, mdz);
          if (mdist > 0.38) {
            var msp = (5.4 * dt) / mdist;
            mroot.position.x += mdx * msp;
            mroot.position.z += mdz * msp;
            mroot.rotation.y = Math.atan2(mdx, mdz);
            mroot.position.y = Math.sin(animT * 16) * 0.065;
          } else {
            game.introPhase = 2;
            game.introTimer = 0;
            mroot.position.y = 0;
          }
        } else if (game.introPhase === 2) {
          mroot.rotation.y = Math.atan2(1.5 - mroot.position.x, 12.55 - mroot.position.z);
          game.introTimer += dt;
          if (game.introTimer >= 0.18 && game.boothHandsetParts) {
            for (var bhHi = 0; bhHi < game.boothHandsetParts.length; bhHi++) game.boothHandsetParts[bhHi].visible = false;
          }
          if (game.introTimer >= 0.65) {
            mroot.visible = false;
            if (game.morpheusBubble) game.morpheusBubble.sprite.visible = false;
            game.introPhase = 3;
            game.introDone = true;
            game.boothAbandonWindow = 10;
            showRoom("Morpheus jacked out — find Trinity.");
          }
        }
      }

      // Secret 2/3 — up to 10s after Morpheus jacks out, step into the phone booth
      if (!game.caught && !game.won && game.introDone && game.boothAbandonWindow > 0) {
        var boothDx3 = px - 1.5;
        var boothDz3 = pz - 12.5;
        if (Math.hypot(boothDx3, boothDz3) < 1.62) {
          game.boothAbandonWindow = 0;
          game.caught = true;
          updateGame({
            caught: true,
            caughtReason: "booth_abandon",
            time: Math.floor((Date.now() - game.startTime) / 1000)
          });
          if (document.pointerLockElement) document.exitPointerLock();
          if (pauseRef.current) pauseRef.current.style.display = "none";
          showRoom("JACKED OUT — TRINITY ABANDONED");
        }
        game.boothAbandonWindow = Math.max(0, game.boothAbandonWindow - dt);
      }

      var trinityHostiles = 0;
      for (var thi = 0; thi < game.agents.length; thi++) {
        if (game.agents[thi].roomId === 5 && !game.agents[thi].dead) trinityHostiles++;
      }

      // Player bullets — hit any agent, cats, or rabbit
      for (var pbi = game.playerBullets.length - 1; pbi >= 0; pbi--) {
        var pb = game.playerBullets[pbi];
        pb.life -= dt;
        var ox = pb.prevX != null ? pb.prevX : pb.mesh.position.x;
        var oz = pb.prevZ != null ? pb.prevZ : pb.mesh.position.z;
        var pbPrevZ = oz;
        var pbSpd = pb.speed != null ? pb.speed : 12;
        pb.mesh.position.x += pb.dx * pbSpd * dt;
        pb.mesh.position.y += pb.dy * pbSpd * dt;
        pb.mesh.position.z += pb.dz * pbSpd * dt;
        var pbHit = false;
        var pbx2 = pb.mesh.position.x, pbz2 = pb.mesh.position.z, pby2 = pb.mesh.position.y;
        pb.prevX = pbx2;
        pb.prevZ = pbz2;
        if (segmentXZHitsBulletBlocks(ox, oz, pbx2, pbz2, pby2)) pbHit = true;
        if (trinityHostiles > 0 && pbx2 > TRINITY_DOORWAY_X0 && pbx2 < TRINITY_DOORWAY_X1
            && pbPrevZ <= TRINITY_ENTRY_Z && pbz2 > TRINITY_ENTRY_Z
            && pby2 > 0.12 && pby2 < ROOM_H - 0.15) {
          pbHit = true;
        }
        // Hit agents in any room
        for (var bhi = 0; bhi < game.agents.length; bhi++) {
          var bha = game.agents[bhi];
          if (bha.dead) continue;
          var bhDist = Math.sqrt(Math.pow(pb.mesh.position.x - bha.x, 2) + Math.pow(pb.mesh.position.z - bha.z, 2));
          if (bhDist < 0.8 && Math.abs(pb.mesh.position.y - 1.2) < 1.0) {
            bha.hp = (bha.hp != null ? bha.hp : AGENT_HP) - 1;
            bha.hitReactTimer = 0.22;
            bha.hitReactDir = (Math.random() > 0.5 ? 1 : -1);
            if (bha.hpBar) bha.hpBar.draw(bha.hp);
            spawnHitParticles(bha.x, 1.25, bha.z, 0xffaa33, 14);
            if (bha.hp <= 0) {
              bha.dead = true;
              bha.deathTimer = 0;
              bha.shootTimer = 999;
              if (bha.roomId === 4 || bha.roomId === 5) game.bossKills++;
            }
            pbHit = true;
            break;
          }
        }
        // Secret 3/3 — hit Trinity on her run (segment vs body so fast shots / MG register)
        if (!pbHit && game.trinityPhase === 3 && game.trinityRoot && game.trinityRoot.visible && !game.trinityDesecrated && game.hasGun) {
          var trHit = game.trinityRoot;
          var trx = trHit.position.x, trz = trHit.position.z;
          var triClose = minDistXZSegmentToPoint(ox, oz, pbx2, pbz2, trx, trz);
          if (triClose < 1.58 && pby2 > 0.12 && pby2 < 2.7) {
            game.trinityDesecrated = true;
            game.trinityBetrayalBase = {
              rx: trHit.rotation.x,
              ry: trHit.rotation.y,
              rz: trHit.rotation.z,
              y: trHit.position.y,
              x: trHit.position.x,
              z: trHit.position.z
            };
            game.trinityBetrayalAnim = { t: 0, lastPartT: 0 };
            game.trinityBetrayalMats = null;
            spawnHitParticles(trx, 1.35, trz, 0xff3366, 42);
            spawnHitParticles(trx + 0.2, 1.55, trz + 0.08, 0xff1144, 24);
            spawnHitParticles(trx - 0.15, 1.15, trz - 0.12, 0xff88cc, 18);
            if (game.trinityBubble) {
              updateBubbleText(game.trinityBubble, "You shot ME?!\nI had a whole\nsequel arc drafted!\nThe paperwork alone—");
              game.trinityBubble.sprite.visible = true;
              if (game.trinityBubble.sprite.material) game.trinityBubble.sprite.material.opacity = 1;
            }
            pbHit = true;
          }
        }
        // Hit cats — animal cruelty!
        if (!pbHit && game.cats) {
          for (var chi = 0; chi < game.cats.length; chi++) {
            var catH = game.cats[chi];
            var catDist = Math.sqrt(Math.pow(pb.mesh.position.x - catH.x, 2) + Math.pow(pb.mesh.position.z - catH.z, 2));
            if (catDist < 0.8 && pb.mesh.position.y < 1.5) {
              game.caught = true;
              updateGame({ caught: true, caughtReason: "animal_secret_cat" });
              if (document.pointerLockElement) document.exitPointerLock();
              if (pauseRef.current) pauseRef.current.style.display = "none";
              pbHit = true;
              break;
            }
          }
        }
        // Hit rabbit — animal cruelty!
        if (!pbHit && game.rabbit) {
          var rabDist = Math.sqrt(Math.pow(pb.mesh.position.x - game.rabbit.x, 2) + Math.pow(pb.mesh.position.z - game.rabbit.z, 2));
          if (rabDist < 0.8 && pb.mesh.position.y < 1.5) {
            game.caught = true;
            updateGame({ caught: true, caughtReason: "animal_secret_rabbit" });
            if (document.pointerLockElement) document.exitPointerLock();
            if (pauseRef.current) pauseRef.current.style.display = "none";
            pbHit = true;
          }
        }
        if (pbHit || pb.life <= 0) {
          scene.remove(pb.mesh);
          game.playerBullets.splice(pbi, 1);
        }
      }

      // Agent death animation — any room
      for (var dai = game.agents.length - 1; dai >= 0; dai--) {
        var da = game.agents[dai];
        if (!da.dead) continue;
        da.deathTimer += dt;
        da.group.rotation.x = Math.min(da.deathTimer * 2, Math.PI / 2);
        da.group.position.y = -da.deathTimer * 0.5;
        if (da.deathTimer > 2) { scene.remove(da.group); game.agents.splice(dai, 1); }
      }

      // All room 4 agents dead — open hallway door
      var room4Left = 0;
      for (var r4i = 0; r4i < game.agents.length; r4i++) {
        if (game.agents[r4i].roomId === 4 && !game.agents[r4i].dead) room4Left++;
      }
      if (room4Left === 0 && game.exitHallGlassCase && !game.exitHallCaseOpened) {
        game.exitHallCaseOpened = true;
        var egl = game.exitHallGlassMeshes;
        if (egl) {
          for (var egi = 0; egi < egl.length; egi++) egl[egi].visible = false;
        }
        for (var fhe = furnHits.length - 1; fhe >= 0; fhe--) {
          if (furnHits[fhe].x === EXIT_HALL_CASE_X && furnHits[fhe].z === EXIT_HALL_CASE_Z) {
            furnHits.splice(fhe, 1);
            break;
          }
        }
        showRoom("ARMORY OPEN — GRAB THE MACHINE GUN");
        updateGame({ exitHallArmoryOpen: true });
      }

      var trinityLeft = 0;
      for (var r5i = 0; r5i < game.agents.length; r5i++) {
        if (game.agents[r5i].roomId === 5 && !game.agents[r5i].dead) trinityLeft++;
      }
      if (game.hallDoorOpen && trinityLeft === 0 && !game.trinityLiberationStarted) {
        game.trinityLiberationStarted = true;
        game.trinityJailPhase = 1;
        game.trinityJailOpenTimer = 0;
        if (game.trinityBubble) game.trinityBubble.sprite.visible = false;
      }
      if (game.trinityLiberationStarted && game.trinityJailPhase === 1) {
        game.trinityJailOpenTimer += dt;
        var jProg = Math.min(1, game.trinityJailOpenTimer / 1.12);
        if (game.trinityJailGateL) {
          game.trinityJailGateL.rotation.y = 0;
          game.trinityJailGateL.position.z = -0.9 - jProg * 0.72;
          game.trinityJailGateL.position.x = -0.86 - jProg * 0.38;
        }
        if (game.trinityJailGateR) {
          game.trinityJailGateR.rotation.y = 0;
          game.trinityJailGateR.position.z = -0.9 - jProg * 0.72;
          game.trinityJailGateR.position.x = 0.86 + jProg * 0.38;
        }
        if (game.trinityJailOpenTimer >= 1.12) {
          game.trinityJailPhase = 2;
          game.trinityFallTimer = 0;
          var fallParts = game.trinityJailFallParts;
          if (fallParts) {
            for (var fpi = 0; fpi < fallParts.length; fpi++) {
              var fp = fallParts[fpi];
              fp.userData._frx0 = fp.rotation.x;
              fp.userData._fy0 = fp.position.y;
              fp.userData.fallStagger = fpi * 0.03;
              fp.userData.fallDur = 0.5;
            }
          }
        }
      }
      if (game.trinityLiberationStarted && game.trinityJailPhase === 2) {
        game.trinityFallTimer += dt;
        var fParts = game.trinityJailFallParts;
        var fallMaxEnd = 0.55;
        if (fParts && fParts.length) {
          fallMaxEnd = 0;
          for (var ffi = 0; ffi < fParts.length; ffi++) {
            var fmesh = fParts[ffi];
            var fst = fmesh.userData.fallStagger || 0;
            var fdur = fmesh.userData.fallDur || 0.5;
            fallMaxEnd = Math.max(fallMaxEnd, fst + fdur);
            var fu = Math.max(0, Math.min(1, (game.trinityFallTimer - fst) / fdur));
            fmesh.rotation.x = fmesh.userData._frx0 + fu * (Math.PI / 2 + 0.1);
            fmesh.position.y = fmesh.userData._fy0 * (1 - fu) + 0.03 * fu;
          }
        }
        if (game.trinityFallTimer >= fallMaxEnd + 0.28) {
          game.trinityJailPhase = 3;
          game.trinityAgentsCleared = true;
          game.trinityPhase = 0;
          game.trinityPhaseTimer = 0;
          if (game.trinityRoot) {
            game.trinityRoot.position.set(7, 0, 54);
            game.trinityRoot.rotation.y = Math.atan2(px - 7, pz - 54);
            game.trinityRoot.visible = true;
          }
          updateGame({ trinityLiberated: true });
          showRoom("TRINITY FREE");
        }
      }
      if (game.trinityBetrayalAnim != null && game.trinityRoot) {
        var trB = game.trinityRoot;
        var tbBase = game.trinityBetrayalBase;
        game.trinityBetrayalAnim.t += dt;
        var tbt = game.trinityBetrayalAnim.t;
        if (!game.trinityBetrayalMats) {
          game.trinityBetrayalMats = [];
          var triFadeRoot = game.trinityBodyRoot || trB;
          triFadeRoot.traverse(function (obj) {
            if (obj.isMesh && obj.material) {
              var mm = obj.material;
              if (mm.userData.trinityFadeBase == null) mm.userData.trinityFadeBase = mm.opacity != null ? mm.opacity : 1;
              mm.transparent = true;
              game.trinityBetrayalMats.push(mm);
            }
          });
        }
        var fallU2 = Math.min(1, tbt / 3.75);
        if (tbBase) {
          trB.rotation.y = tbBase.ry;
          trB.rotation.z = tbBase.rz;
          trB.rotation.x = tbBase.rx + fallU2 * (Math.PI / 2 * 0.9);
          trB.position.x = tbBase.x;
          trB.position.z = tbBase.z;
          trB.position.y = tbBase.y - 0.78 * fallU2;
          var triBet = game.trinityBetrayalAnim;
          if (triBet && tbt < 7.55 && tbt - (triBet.lastPartT || 0) >= 0.48) {
            triBet.lastPartT = tbt;
            var tcx = tbBase.x + (Math.random() - 0.5) * 0.55;
            var tcz = tbBase.z + (Math.random() - 0.5) * 0.55;
            var tcy = 0.85 + Math.random() * 0.95;
            spawnHitParticles(tcx, tcy, tcz, Math.random() > 0.45 ? 0xff4488 : 0xff2233, 8 + Math.floor(Math.random() * 9));
          }
        }
        if (tbt > 2.78) {
          var fadeU2 = Math.min(1, (tbt - 2.78) / 3.95);
          for (var tmi = 0; tmi < game.trinityBetrayalMats.length; tmi++) {
            var mtm = game.trinityBetrayalMats[tmi];
            mtm.opacity = mtm.userData.trinityFadeBase * (1 - fadeU2);
          }
          if (game.trinityBubble && game.trinityBubble.sprite.material) {
            game.trinityBubble.sprite.material.opacity = Math.max(0, 1 - fadeU2);
          }
        }
        if (tbt >= 7.55) {
          trB.visible = false;
          if (game.trinityBubble) {
            game.trinityBubble.sprite.visible = false;
            if (game.trinityBubble.sprite.material) game.trinityBubble.sprite.material.opacity = 1;
          }
          game.trinityBetrayalAnim = null;
          game.trinityBetrayalMats = null;
          game.trinityBetrayalBase = null;
          game.trinityPhase = 4;
          if (game.trinityJailGroup) game.trinityJailGroup.visible = false;
          game.smithPhase = -1;
          if (game.agentSmith) {
            game.agentSmith.group.visible = false;
            game.agentSmith.applyFadeMultiplier(1);
          }
          game.trinityRoomSealed = false;
          game.finalDoorOpen = true;
          if (game.finalExitGlow) game.finalExitGlow.material.opacity = 0.55;
          if (game.finalExitSign) game.finalExitSign.visible = true;
          if (game.finalExitCore) game.finalExitCore.visible = true;
          if (game.finalExitLight) game.finalExitLight.intensity = 1.15;
          if (game.finalExitFrameMeshes) {
            for (var femb = 0; femb < game.finalExitFrameMeshes.length; femb++) game.finalExitFrameMeshes[femb].visible = true;
          }
          showRoom("EXIT OPEN — NO SMITH");
        }
      } else if (game.trinityAgentsCleared && game.trinityRoot && game.trinityPhase >= 0 && game.trinityPhase < 4) {
        var tr = game.trinityRoot;
        var tgx = px - tr.position.x;
        var tgz = pz - tr.position.z;
        var triTargetYaw = Math.atan2(tgx, tgz);
        if (game.trinityPhase === 0) {
          var triDy = triTargetYaw - tr.rotation.y;
          while (triDy > Math.PI) triDy -= Math.PI * 2;
          while (triDy < -Math.PI) triDy += Math.PI * 2;
          tr.rotation.y += triDy * Math.min(1, dt * 3.5);
          game.trinityPhaseTimer += dt;
          var triAligned = Math.abs(triDy) < 0.08;
          if (game.trinityPhaseTimer > 1.05 || (game.trinityPhaseTimer > 0.42 && triAligned)) {
            tr.rotation.y = triTargetYaw;
            game.trinityPhase = 1;
            game.trinityPhaseTimer = 0;
            if (game.trinityBubble) updateBubbleText(game.trinityBubble, "Thank you, Neo.");
          }
        } else if (game.trinityPhase === 1) {
          game.trinityPhaseTimer += dt;
          if (game.trinityPhaseTimer >= 2.0) {
            game.trinityPhase = 2;
            game.trinityPhaseTimer = 0;
            if (game.trinityBubble) updateBubbleText(game.trinityBubble, "You're free.\nI'm heading out — see you\nin the real world!");
          }
        } else if (game.trinityPhase === 2) {
          game.trinityPhaseTimer += dt;
          if (game.trinityPhaseTimer >= 2.5) {
            game.trinityPhase = 3;
            game.trinityPhaseTimer = 0;
            if (game.trinityBubble) game.trinityBubble.sprite.visible = false;
          }
        } else if (game.trinityPhase === 3) {
          var twdx = TRINITY_EXIT_DOOR_X - tr.position.x;
          var twdz = TRINITY_EXIT_DOOR_Z - tr.position.z;
          var twdist = Math.hypot(twdx, twdz);
          if (twdist < 0.42) {
            game.trinityPhase = 4;
            tr.position.x = TRINITY_EXIT_DOOR_X;
            tr.position.z = TRINITY_EXIT_DOOR_Z;
            tr.visible = false;
            tr.position.y = 0;
            if (game.trinityJailGroup) game.trinityJailGroup.visible = false;
            if (game.agentSmith) {
              game.agentSmith.group.visible = true;
              game.agentSmith.x = 7;
              game.agentSmith.z = SMITH_EXIT_ENTER_Z;
              game.agentSmith.syncGroup();
              game.agentSmith.group.rotation.y = Math.PI;
              game.agentSmith.group.rotation.x = 0;
              game.agentSmith.group.rotation.z = 0;
              game.agentSmith.applyFadeMultiplier(1);
            }
            game.smithPhase = 0;
            game.smithWalkSpeed = 2.4;
            game.smithSpeechIdx = 0;
            game.smithSpeechTimer = 0;
            showRoom("AGENT SMITH — INBOUND");
          } else {
            var triRunSpd = 2.05 * dt;
            var triStep = Math.min(triRunSpd, twdist);
            tr.position.x += (twdx / twdist) * triStep;
            tr.position.z += (twdz / twdist) * triStep;
            tr.rotation.y = Math.atan2(twdx, twdz);
            tr.position.y = Math.sin(animT * 7.5) * 0.08;
          }
        }
      }

      // Agent Smith — after Trinity leaves: short walk in from north exit door, then monologue
      if (game.agentSmith && game.smithPhase === 0) {
        var sm0 = game.agentSmith;
        if (sm0.z <= SMITH_EXIT_STOP_Z) {
          game.smithPhase = 1;
          game.smithSpeechIdx = 0;
          game.smithSpeechTimer = 0;
          updateBubbleText(sm0.bubble, SMITH_SPEECH_LINES[0]);
          sm0.leftLegPivot.rotation.x = 0;
          sm0.rightLegPivot.rotation.x = 0;
        } else {
          sm0.z -= SMITH_EXIT_WALK_SPEED * dt;
          sm0.x = THREE.MathUtils.lerp(sm0.x, 7, Math.min(1, dt * 2.4));
          sm0.walkPhase += dt * 13;
          var w0a = Math.sin(sm0.walkPhase) * 0.52;
          sm0.leftLegPivot.rotation.x = w0a;
          sm0.rightLegPivot.rotation.x = -w0a;
          sm0.group.rotation.y = Math.PI;
        }
        sm0.syncGroup();
      } else if (game.agentSmith && game.smithPhase === 1) {
        var sm1 = game.agentSmith;
        game.smithSpeechTimer += dt;
        var sx1 = px - sm1.x, sz1 = pz - sm1.z;
        sm1.group.rotation.y = Math.atan2(sx1, sz1);
        sm1.leftLegPivot.rotation.x = THREE.MathUtils.lerp(sm1.leftLegPivot.rotation.x, 0, Math.min(1, dt * 10));
        sm1.rightLegPivot.rotation.x = THREE.MathUtils.lerp(sm1.rightLegPivot.rotation.x, 0, Math.min(1, dt * 10));
        var speechWait = game.smithSpeechIdx >= SMITH_SPEECH_LINES.length - 1 ? 3.45 : 3.05;
        if (game.smithSpeechTimer >= speechWait) {
          game.smithSpeechTimer = 0;
          game.smithSpeechIdx++;
          if (game.smithSpeechIdx >= SMITH_SPEECH_LINES.length) {
            game.smithPhase = 2;
            game.smithTossTimer = 0;
            if (sm1.bubble) sm1.bubble.sprite.visible = false;
            sm1.gunGroup.visible = false;
            showRoom("WEAPONS DOWN…");
          } else {
            updateBubbleText(sm1.bubble, SMITH_SPEECH_LINES[game.smithSpeechIdx]);
          }
        }
        sm1.syncGroup();
      } else if (game.agentSmith && game.smithPhase === 2) {
        game.smithTossTimer += dt;
        if (game.smithTossTimer >= 0.9) {
          game.smithPhase = 3;
          game.trinityRoomSealed = true;
          game.brawlSmithHp = 5;
          game.playerPunchCd = 0.25;
          game.smithPunchCd = 0.95;
          showRoom("HAND TO HAND — FIVE HITS");
          updateGame({ brawlActive: true, brawlSmithHp: 5 });
        }
        game.agentSmith.syncGroup();
      } else if (game.agentSmith && game.smithPhase === 3 && !game.caught) {
        var sm3 = game.agentSmith;
        game.playerPunchCd = Math.max(0, game.playerPunchCd - dt);
        game.smithPunchCd = Math.max(0, game.smithPunchCd - dt);
        game.playerPunchAnim = Math.max(0, game.playerPunchAnim - dt);
        game.smithPunchAnim = Math.max(0, game.smithPunchAnim - dt);
        game.smithHitReactTimer = Math.max(0, game.smithHitReactTimer - dt);
        var sdx = px - sm3.x, sdz = pz - sm3.z;
        var sd = Math.hypot(sdx, sdz);
        var sstep = 1.55 * dt * settingsRef.current.enemySpeed;
        if (sd > 1.05 && sd > 0.04) {
          sm3.x += (sdx / sd) * sstep;
          sm3.z += (sdz / sd) * sstep;
          sm3.x = Math.max(TRINITY_X0 + 0.55, Math.min(TRINITY_X1 - 0.55, sm3.x));
          sm3.z = Math.max(TRINITY_Z0 + 0.55, Math.min(TRINITY_Z1 - 0.65, sm3.z));
        }
        sm3.group.rotation.y = Math.atan2(sdx, sdz);
        sm3.walkPhase += dt * 9;
        sm3.leftLegPivot.rotation.x = Math.sin(sm3.walkPhase) * 0.38;
        sm3.rightLegPivot.rotation.x = -Math.sin(sm3.walkPhase) * 0.38;
        if (sd < 1.18 && game.smithPunchCd <= 0 && game.playerHp > 0) {
          game.playerHp = Math.max(0, game.playerHp - PLAYER_SMITH_PUNCH_DAMAGE);
          game.playerRegenPause = PLAYER_HP_REGEN_DELAY;
          game.smithPunchCd = 1.02;
          game.smithPunchAnim = 0.35;
          if (game.playerHp <= 0) {
            game.caught = true;
            game.trinityRoomSealed = false;
            game.smithPhase = -1;
            sm3.applyFadeMultiplier(1);
            updateGame({
              caught: true,
              caughtReason: "brawl",
              brawlActive: false,
              time: Math.floor((Date.now() - game.startTime) / 1000)
            });
            if (document.pointerLockElement) document.exitPointerLock();
            if (pauseRef.current) pauseRef.current.style.display = "none";
          }
        }
        if (game.smithPunchAnim > 0) sm3.rightArmPivot.rotation.x = -1.32;
        else sm3.rightArmPivot.rotation.x = THREE.MathUtils.lerp(sm3.rightArmPivot.rotation.x, 0, Math.min(1, dt * 8));
        sm3.syncGroup();
        if (game.smithHitReactTimer > 0) {
          var hrv = game.smithHitReactTimer / 0.42;
          sm3.group.rotation.z = Math.sin(hrv * Math.PI) * 0.26;
          sm3.group.position.y = -0.18 * Math.sin(hrv * Math.PI);
        } else {
          sm3.group.rotation.z = THREE.MathUtils.lerp(sm3.group.rotation.z, 0, Math.min(1, dt * 10));
        }
        if (game.punchVisualGroup) {
          var pz0 = game.punchArmBaseZ != null ? game.punchArmBaseZ : -0.14;
          if (game.playerPunchAnim > 0) {
            game.punchVisualGroup.visible = true;
            var panim = 0.34;
            var fprog = Math.min(1, 1 - game.playerPunchAnim / panim);
            var fsw = Math.sin(fprog * Math.PI);
            game.punchVisualGroup.position.z = pz0 - 0.38 * fsw;
            game.punchVisualGroup.rotation.x = fsw * 0.18;
            game.punchVisualGroup.rotation.y = -fsw * 0.06;
          } else {
            game.punchVisualGroup.visible = false;
            game.punchVisualGroup.position.z = pz0;
            game.punchVisualGroup.rotation.x = 0;
            game.punchVisualGroup.rotation.y = 0;
          }
        }
      } else if (game.agentSmith && game.smithPhase === 4) {
        var sm4 = game.agentSmith;
        sm4.group.visible = true;
        var sx4 = px - sm4.x, sz4 = pz - sm4.z;
        sm4.group.rotation.y = Math.atan2(sx4, sz4);
        if (game.smithDefeatSubPhase === 0) {
          game.smithKneelT += dt;
          var kneelP = Math.min(1, game.smithKneelT / 0.78);
          sm4.group.rotation.x = kneelP * 0.58;
          sm4.leftLegPivot.rotation.x = kneelP * 1.22;
          sm4.rightLegPivot.rotation.x = kneelP * 1.22;
          sm4.leftArmPivot.rotation.x = kneelP * -0.42;
          sm4.rightArmPivot.rotation.x = kneelP * -0.42;
          var kneelDrop = kneelP * 0.62;
          sm4.group.position.set(sm4.x, -kneelDrop, sm4.z);
          game.smithDefeatTimer += dt;
          if (game.smithDefeatTimer > 0.7 && !game.smithDefeatLineShown) {
            game.smithDefeatLineShown = true;
            updateBubbleText(sm4.bubble, SMITH_DEFEAT_QUIP);
            sm4.bubble.sprite.visible = true;
          }
          if (game.smithDefeatTimer > 4.35) {
            game.smithDefeatSubPhase = 1;
            game.smithDefeatTimer = 0;
            if (sm4.bubble) sm4.bubble.sprite.visible = false;
          }
        } else {
          game.smithDefeatTimer += dt;
          var fmul2 = Math.max(0, 1 - game.smithDefeatTimer * 0.46);
          sm4.applyFadeMultiplier(fmul2);
          sm4.group.position.set(sm4.x, -0.62, sm4.z);
          if (fmul2 <= 0.04 || game.smithDefeatTimer > 2.75) {
            game.smithPhase = 5;
            sm4.group.visible = false;
            sm4.group.rotation.x = 0;
            sm4.group.rotation.z = 0;
            sm4.leftLegPivot.rotation.x = 0;
            sm4.rightLegPivot.rotation.x = 0;
            sm4.leftArmPivot.rotation.x = 0;
            sm4.rightArmPivot.rotation.x = 0;
            sm4.applyFadeMultiplier(1);
            game.trinityRoomSealed = false;
            game.finalDoorOpen = true;
            updateGame({ brawlActive: false });
            if (game.finalExitGlow) game.finalExitGlow.material.opacity = 0.55;
            if (game.finalExitSign) game.finalExitSign.visible = true;
            if (game.finalExitCore) game.finalExitCore.visible = true;
            if (game.finalExitLight) game.finalExitLight.intensity = 1.15;
            if (game.finalExitFrameMeshes) {
              for (var fem = 0; fem < game.finalExitFrameMeshes.length; fem++) game.finalExitFrameMeshes[fem].visible = true;
            }
            showRoom("EXIT OPEN — GO");
          }
        }
      } else if (game.punchVisualGroup) {
        game.punchVisualGroup.visible = false;
        game.punchVisualGroup.position.z = game.punchArmBaseZ != null ? game.punchArmBaseZ : -0.14;
        game.punchVisualGroup.rotation.x = 0;
        game.punchVisualGroup.rotation.y = 0;
      }

      if (vitalityFillRef.current && !game.caught && !game.won) {
        vitalityFillRef.current.style.width = (game.playerHp / PLAYER_HP_MAX * 100) + "%";
      }
      if (smithHpBarRef.current && camera && game.agentSmith) {
        var hpS = game.smithPhase === 3 && !game.caught;
        smithHpBarRef.current.style.display = hpS ? "block" : "none";
        if (hpS) {
          var smh = game.agentSmith;
          var hv = new THREE.Vector3(smh.x, 2.28, smh.z);
          hv.project(camera);
          var cw = container.clientWidth;
          var ch = container.clientHeight;
          var hx = (hv.x * 0.5 + 0.5) * cw;
          var hy = (-hv.y * 0.5 + 0.5) * ch;
          smithHpBarRef.current.style.left = Math.max(8, Math.min(cw - 108, hx - 50)) + "px";
          smithHpBarRef.current.style.top = Math.max(8, hy - 28) + "px";
          if (smithHpFillRef.current) smithHpFillRef.current.style.width = (game.brawlSmithHp / 5 * 100) + "%";
        }
      }

      // Secret 3/3 — betrayal path: mid-corridor before win plane → Morpheus ambush (freeze + speech + MG)
      if (game.trinityDesecrated && game.finalDoorOpen && game.trinityAgentsCleared && !game.won && !game.caught
          && game.secretMorpheusPhase === 0
          && pz > TRINITY_BETRAYAL_MORPHEUS_Z_FAR && pz < TRINITY_BETRAYAL_MORPHEUS_Z_NEAR
          && px >= 5.15 && px <= 8.85) {
        game.secretMorpheusPhase = 1;
        game.playerFrozen = true;
        game.secretMorphLineTimer = 0;
        if (game.morpheusRoot) {
          game.morpheusRoot.position.set(7, 0, MORPHEUS_BETRAYAL_SPAWN_Z);
          if (game.reinstateMorpheusForBetrayalAmbush) game.reinstateMorpheusForBetrayalAmbush();
        }
        if (document.pointerLockElement) document.exitPointerLock();
        if (pauseRef.current) pauseRef.current.style.display = "none";
      }

      // Win — through final exit after Smith is defeated (normal path only)
      if (game.finalDoorOpen && game.trinityAgentsCleared && pz > TRINITY_Z1 - 0.65 && px >= 5.2 && px <= 8.8 && !game.won && !game.caught
          && !game.trinityDesecrated) {
        game.won = true;
        updateGame({ won: true, time: Math.floor((Date.now() - game.startTime) / 1000) });
        if (document.pointerLockElement) document.exitPointerLock();
        if (pauseRef.current) pauseRef.current.style.display = "none";
      }

      if (game.secretMorpheusPhase > 0 && game.morpheusRoot) {
        var mrr = game.morpheusRoot;
        mrr.visible = true;
        if (game.secretMorpheusPhase === 1) {
          var ptx2 = camera.position.x;
          var ptz2 = camera.position.z;
          var mvdx = ptx2 - mrr.position.x;
          var mvdz = ptz2 - mrr.position.z;
          var mvd = Math.hypot(mvdx, mvdz);
          mrr.rotation.y = Math.atan2(mvdx, mvdz);
          var morStop = MORPHEUS_BETRAYAL_STOP_DIST;
          if (mvd <= morStop + 0.04) {
            game.secretMorpheusPhase = 2;
            game.secretMorphLineTimer = 0;
            if (game.morpheusBubble) {
              if (game.morpheusBubble.sprite.material) {
                game.morpheusBubble.sprite.material.opacity = 1;
                game.morpheusBubble.sprite.material.needsUpdate = true;
              }
              updateBubbleText(game.morpheusBubble, "You killed Trinity.\nYou monster…\nYou were \"The One\"?\nI'm the one holding the machine gun.");
              game.morpheusBubble.sprite.visible = true;
            }
            if (game.reinstateMorpheusForBetrayalAmbush) game.reinstateMorpheusForBetrayalAmbush();
          } else {
            var mspd2 = 5.2 * dt;
            var mstep = Math.min(mspd2, Math.max(0, mvd - morStop));
            mrr.position.x += (mvdx / mvd) * mstep;
            mrr.position.z += (mvdz / mvd) * mstep;
            mrr.position.x = Math.max(TRINITY_X0 + 0.42, Math.min(TRINITY_X1 - 0.42, mrr.position.x));
            mrr.position.z = Math.max(TRINITY_Z0 + 0.45, Math.min(mrr.position.z, MORPHEUS_BETRAYAL_WALK_MAX_Z));
          }
        } else if (game.secretMorpheusPhase === 2) {
          game.secretMorphLineTimer += dt;
          if (game.secretMorphLineTimer > 3.65) {
            game.secretMorpheusPhase = 3;
            if (game.morpheusBubble) game.morpheusBubble.sprite.visible = false;
            if (game.morpheusGunProp) game.morpheusGunProp.visible = true;
          }
        } else if (game.secretMorpheusPhase === 3) {
          game.playerHp -= 240 * dt;
          game.playerRegenPause = 999;
          if (game.playerHp <= 0) {
            game.playerHp = 0;
            game.caught = true;
            game.playerFrozen = false;
            game.secretMorpheusPhase = 0;
            if (game.morpheusRoot) game.morpheusRoot.visible = false;
            if (game.morpheusGunProp) game.morpheusGunProp.visible = false;
            if (game.morpheusBubble) game.morpheusBubble.sprite.visible = false;
            updateGame({
              caught: true,
              caughtReason: "morpheus_secret",
              time: Math.floor((Date.now() - game.startTime) / 1000)
            });
            if (document.pointerLockElement) document.exitPointerLock();
            if (pauseRef.current) pauseRef.current.style.display = "none";
          }
        }
      }

      // Key pickup — collecting a key opens its door (except blue — needs gun)
      for (var a = 0; a < KEY_DEFS.length; a++) {
        var kk = KEY_DEFS[a];
        if (game.collected.has(kk.id)) continue;
        if (Math.sqrt(Math.pow(px - kk.x, 2) + Math.pow(pz - kk.z, 2)) < 1.8) {
          game.collected.add(kk.id);
          var kmm = game.keyMeshes[kk.id];
          if (kmm) { kmm.mesh.visible = false; kmm.ring.visible = false; }
          if (kk.id === "blue") {
            // Blue key: change door color to green/cyan to show it's ready, but don't open
            var dms = game.doorMeshes["blue"];
            if (dms) {
              for (var q = 0; q < dms.length; q++) {
                dms[q].material.color.set(0x00ffaa);
                dms[q].material.opacity = 0.7;
              }
            }
            showRoom("BLUE KEY — NOW GRAB THE GUN");
          } else {
            // Green/red: open door immediately
            game.opened.add(kk.id);
            var dms2 = game.doorMeshes[kk.id];
            if (dms2) { for (var q2 = 0; q2 < dms2.length; q2++) dms2[q2].visible = false; }
          }
          updateGame({
            keys: { green: game.collected.has("green"), red: game.collected.has("red"), blue: game.collected.has("blue") },
            doors: { green: game.opened.has("green"), red: game.opened.has("red"), blue: game.opened.has("blue") }
          });
        }
      }

      // Agent AI — patrol randomly, chase only when player is in their room
      var playerRoom = whichRoom(px, pz);
      for (var ag = 0; ag < game.agents.length; ag++) {
        var agent = game.agents[ag];
        if (agent.dead) continue;
        var playerInRoom = (playerRoom === agent.roomId);
        var moveToX, moveToZ, moveSpd;

        if (playerInRoom) {
          if (agent.hasGun) {
            // GUNNER — slowly advance while shooting
            moveToX = px;
            moveToZ = pz;
            moveSpd = 0.6 * dt * settingsRef.current.enemySpeed;
            var cdx = px - agent.x;
            var cdz = pz - agent.z;
            var cDist = Math.sqrt(cdx * cdx + cdz * cdz);
            if (cDist > 0.1) agent.group.rotation.y = Math.atan2(cdx, cdz);
          } else {
            // CHASE MODE
            moveToX = px;
            moveToZ = pz;
            moveSpd = agent.speed * dt * settingsRef.current.enemySpeed;
            // Catch check
            var cdx = px - agent.x;
            var cdz = pz - agent.z;
            if (Math.sqrt(cdx * cdx + cdz * cdz) < AGENT_CATCH_DIST) {
              game.caught = true;
              updateGame({ caught: true, time: Math.floor((Date.now() - game.startTime) / 1000) });
              if (document.pointerLockElement) document.exitPointerLock();
              if (pauseRef.current) pauseRef.current.style.display = "none";
              break;
            }
          }
        } else {
          // PATROL MODE — wander across the full room
          moveToX = agent.targetX;
          moveToZ = agent.targetZ;
          moveSpd = agent.speed * 0.8 * dt;
          var ptDist = Math.sqrt(Math.pow(agent.targetX - agent.x, 2) + Math.pow(agent.targetZ - agent.z, 2));
          agent.patrolTimer += dt;
          if (ptDist < 0.8 || agent.patrolTimer > 12) {
            agent.targetX = agent.minX + Math.random() * (agent.maxX - agent.minX);
            agent.targetZ = agent.minZ + Math.random() * (agent.maxZ - agent.minZ);
            agent.patrolTimer = 0;
          }
        }

        // Move toward target — multi-waypoint box routing
        var actualTargetX = moveToX;
        var actualTargetZ = moveToZ;
        
        // Follow waypoint queue
        if (agent.wpQueue && agent.wpQueue.length > 0) {
          var wp = agent.wpQueue[0];
          var wpDist = Math.sqrt(Math.pow(wp.x - agent.x, 2) + Math.pow(wp.z - agent.z, 2));
          agent.wpAge = (agent.wpAge || 0) + dt;
          if (wpDist < 0.8 || agent.wpAge > 3) {
            agent.wpQueue.shift();
            agent.wpAge = 0;
          }
          if (agent.wpQueue.length > 0) {
            actualTargetX = agent.wpQueue[0].x;
            actualTargetZ = agent.wpQueue[0].z;
          }
        }

        var tdx = actualTargetX - agent.x;
        var tdz = actualTargetZ - agent.z;
        var tDist = Math.sqrt(tdx * tdx + tdz * tdz);
        if (tDist > 0.1 && moveSpd > 0) {
          var ndx = (tdx / tDist) * moveSpd;
          var ndz = (tdz / tDist) * moveSpd;
          var newAX = Math.max(agent.minX, Math.min(agent.maxX, agent.x + ndx));
          var newAZ = Math.max(agent.minZ, Math.min(agent.maxZ, agent.z + ndz));

          var blocker = agentHitsFurn(newAX, newAZ);
          var prevX = agent.x, prevZ = agent.z;

          if (!blocker) {
            agent.x = newAX; agent.z = newAZ;
          } else if (!agentHitsFurn(newAX, agent.z)) {
            agent.x = newAX;
          } else if (!agentHitsFurn(agent.x, newAZ)) {
            agent.z = newAZ;
          }

          // Track if agent is actually making progress toward the REAL target
          var distToTarget = Math.sqrt(Math.pow(moveToX - agent.x, 2) + Math.pow(moveToZ - agent.z, 2));
          var movedDist = Math.sqrt(Math.pow(agent.x - prevX, 2) + Math.pow(agent.z - prevZ, 2));
          
          if (!agent.lastDistToTarget) agent.lastDistToTarget = distToTarget;
          
          // If barely moving or not getting closer, count as stuck
          if (movedDist < moveSpd * 0.3 || distToTarget >= agent.lastDistToTarget - 0.01) {
            agent.stuckTime = (agent.stuckTime || 0) + dt;
          } else {
            agent.stuckTime = 0;
          }
          agent.lastDistToTarget = distToTarget;

          // If stuck for 0.5s and no active route, build a box route
          if (agent.stuckTime > 0.5 && (!agent.wpQueue || agent.wpQueue.length === 0)) {
            // Find the nearest furniture that's between agent and target
            var nearestBlocker = null, nearestBDist = 999;
            for (var fb = 0; fb < furnHits.length; fb++) {
              var ff = furnHits[fb];
              // Check if furniture is roughly between agent and target
              var fDist = Math.sqrt(Math.pow(ff.x - agent.x, 2) + Math.pow(ff.z - agent.z, 2));
              if (fDist < 6) {
                var toTargetDist = Math.sqrt(Math.pow(ff.x - moveToX, 2) + Math.pow(ff.z - moveToZ, 2));
                if (fDist + toTargetDist < distToTarget + 4 && fDist < nearestBDist) {
                  nearestBDist = fDist;
                  nearestBlocker = ff;
                }
              }
            }
            if (nearestBlocker) {
              var bx = nearestBlocker.x, bz = nearestBlocker.z;
              var pad = 1.5;
              var ehw = nearestBlocker.hw - 0.4 + pad;
              var ehd = nearestBlocker.hd - 0.4 + pad;
              var c = [
                { x: bx - ehw, z: bz - ehd },
                { x: bx + ehw, z: bz - ehd },
                { x: bx + ehw, z: bz + ehd },
                { x: bx - ehw, z: bz + ehd }
              ];
              for (var ci3 = 0; ci3 < 4; ci3++) {
                c[ci3].x = Math.max(agent.minX + 0.3, Math.min(agent.maxX - 0.3, c[ci3].x));
                c[ci3].z = Math.max(agent.minZ + 0.3, Math.min(agent.maxZ - 0.3, c[ci3].z));
              }
              var nearIdx = 0, nearD = 999;
              for (var ci4 = 0; ci4 < 4; ci4++) {
                var d2 = Math.sqrt(Math.pow(c[ci4].x - agent.x, 2) + Math.pow(c[ci4].z - agent.z, 2));
                if (d2 < nearD) { nearD = d2; nearIdx = ci4; }
              }
              var farIdx = 0, farD = 999;
              for (var ci5 = 0; ci5 < 4; ci5++) {
                var d3 = Math.sqrt(Math.pow(c[ci5].x - moveToX, 2) + Math.pow(c[ci5].z - moveToZ, 2));
                if (d3 < farD) { farD = d3; farIdx = ci5; }
              }
              var cwSteps = (farIdx - nearIdx + 4) % 4;
              var ccwSteps = (nearIdx - farIdx + 4) % 4;
              var queue = [];
              if (cwSteps <= ccwSteps) {
                for (var s = 0; s <= cwSteps; s++) queue.push(c[(nearIdx + s) % 4]);
              } else {
                for (var s2 = 0; s2 <= ccwSteps; s2++) queue.push(c[(nearIdx - s2 + 4) % 4]);
              }
              var cleanQueue = [];
              for (var qi = 0; qi < queue.length; qi++) {
                if (!agentHitsFurn(queue[qi].x, queue[qi].z)) cleanQueue.push(queue[qi]);
              }
              if (cleanQueue.length > 0) {
                agent.wpQueue = cleanQueue;
                agent.wpAge = 0;
                agent.stuckTime = 0;
              }
            }
          }
        }

        // Face movement direction
        var faceDx = actualTargetX - agent.x;
        var faceDz = actualTargetZ - agent.z;
        var faceDist = Math.sqrt(faceDx * faceDx + faceDz * faceDz);

        agent.hitReactTimer = Math.max(0, (agent.hitReactTimer || 0) - dt);
        agent.group.position.x = agent.x;
        agent.group.position.z = agent.z;
        agent.group.position.y = 0;
        agent.group.rotation.z = 0;
        if (agent.hitReactTimer > 0 && !agent.dead) {
          var hprog = agent.hitReactTimer / 0.22;
          var hsw = Math.sin((1 - hprog) * Math.PI);
          agent.group.rotation.z = hsw * 0.32 * (agent.hitReactDir || 1);
          agent.group.position.y = hsw * 0.06;
        }
        if (faceDist > 0.1 && !agent.hasGun) agent.group.rotation.y = Math.atan2(faceDx, faceDz);
        agent.chasing = playerInRoom;

        // Limb animation
        var isMoving = faceDist > 0.2 && moveSpd > 0;
        if (isMoving) {
          agent.walkPhase += dt * (playerInRoom ? 10 : 6);
        }
        var walkSwing = isMoving ? Math.sin(agent.walkPhase) * 0.5 : 0;

        // Legs swing opposite to each other
        agent.leftLeg.rotation.x = walkSwing;
        agent.rightLeg.rotation.x = -walkSwing;

        if (agent.hasGun && playerInRoom) {
          // GUNNER: right arm aims gun forward, left arm at side
          agent.rightArm.rotation.x = -1.4;
          agent.rightArm.rotation.z = 0.1;
          agent.leftArm.rotation.x = 0;
          agent.leftArm.rotation.z = -0.1;
        } else if (playerInRoom) {
          // CHASE: arms reach forward toward player
          var reachAngle = -1.2; // arms stretched forward
          agent.leftArm.rotation.x = reachAngle + Math.sin(agent.walkPhase * 0.7) * 0.15;
          agent.rightArm.rotation.x = reachAngle - Math.sin(agent.walkPhase * 0.7) * 0.15;
          agent.leftArm.rotation.z = -0.2;
          agent.rightArm.rotation.z = 0.2;
        } else {
          // PATROL: arms swing naturally opposite to legs
          agent.leftArm.rotation.x = -walkSwing * 0.6;
          agent.rightArm.rotation.x = walkSwing * 0.6;
          agent.leftArm.rotation.z = 0;
          agent.rightArm.rotation.z = 0;
        }

        // Speech bubbles — cycle between showing and hiding
        agent.sayTimer -= dt;
        if (agent.sayTimer <= 0) {
          if (agent.bubble.sprite.visible) {
            // Was showing — now hide and wait before next quote
            agent.bubble.sprite.visible = false;
            agent.sayTimer = playerInRoom ? (0.3 + Math.random() * 0.7) : (1 + Math.random() * 2);
          } else {
            // Was hidden — show a new quote
            var quotes = playerInRoom ? CHASE_QUOTES : IDLE_QUOTES;
            updateBubbleText(agent.bubble, quotes[Math.floor(Math.random() * quotes.length)]);
            agent.sayTimer = 2 + Math.random() * 1; // show for 2.5-4 seconds
          }
        }
      }

      // Agent bullets — armed agents in exit hall + Trinity chamber
      for (var agi2 = 0; agi2 < game.agents.length; agi2++) {
        var ag2 = game.agents[agi2];
        if (ag2.dead || !ag2.hasGun) continue;
        var playerInGunRoom = rid === 4 || rid === 5;
        if (playerInGunRoom && ag2.chasing) {
          ag2.shootTimer -= dt;
          if (ag2.shootTimer <= 0) {
            ag2.shootTimer = 1.5 + Math.random() * 2;
            // Create bullet — large and highly visible
            var bulletMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.18, 6, 6),
              new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.95 })
            );
            var bulletGlow = new THREE.PointLight(0xff4400, 2.0, 6);
            bulletMesh.add(bulletGlow);
            // Bullet trail
            var trailMesh = new THREE.Mesh(
              new THREE.CylinderGeometry(0.05, 0.1, 0.6, 6),
              new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5 })
            );
            trailMesh.rotation.x = Math.PI / 2;
            trailMesh.position.z = -0.35;
            bulletMesh.add(trailMesh);
            // Inner glow core
            var bulletCore = new THREE.Mesh(
              new THREE.SphereGeometry(0.08, 4, 4),
              new THREE.MeshBasicMaterial({ color: 0xffaa00 })
            );
            bulletMesh.add(bulletCore);
            var bdx = px - ag2.x;
            var bdz = pz - ag2.z;
            var bDist = Math.sqrt(bdx * bdx + bdz * bdz);
            if (bDist > 0) { bdx /= bDist; bdz /= bDist; }
            bulletMesh.position.set(ag2.x + bdx * 0.5, 1.3, ag2.z + bdz * 0.5);
            bulletMesh.rotation.y = Math.atan2(bdx, bdz);
            scene.add(bulletMesh);
            var bspx = ag2.x + bdx * 0.5, bspz = ag2.z + bdz * 0.5;
            game.bullets.push({ mesh: bulletMesh, dx: bdx, dz: bdz, life: 5, prevX: bspx, prevZ: bspz });
          }
        }
      }

      // Update bullets
      for (var bi = game.bullets.length - 1; bi >= 0; bi--) {
        var bul = game.bullets[bi];
        bul.life -= dt;
        var bSpeed = 4 * dt;
        var agOx = bul.prevX != null ? bul.prevX : bul.mesh.position.x;
        var agOz = bul.prevZ != null ? bul.prevZ : bul.mesh.position.z;
        bul.mesh.position.x += bul.dx * bSpeed;
        bul.mesh.position.z += bul.dz * bSpeed;
        var agNx = bul.mesh.position.x, agNz = bul.mesh.position.z;
        var agBy = bul.mesh.position.y;
        bul.prevX = agNx;
        bul.prevZ = agNz;
        if (segmentXZHitsBulletBlocks(agOx, agOz, agNx, agNz, agBy)) {
          scene.remove(bul.mesh);
          game.bullets.splice(bi, 1);
          continue;
        }
        // Player collision
        var bpDist = Math.sqrt(Math.pow(bul.mesh.position.x - px, 2) + Math.pow(bul.mesh.position.z - pz, 2));
        if (bpDist < 0.5) {
          game.playerHp = Math.max(0, game.playerHp - PLAYER_BULLET_DAMAGE);
          game.playerRegenPause = PLAYER_HP_REGEN_DELAY;
          scene.remove(bul.mesh);
          game.bullets.splice(bi, 1);
          if (game.playerHp <= 0) {
            game.caught = true;
            updateGame({ caught: true, time: Math.floor((Date.now() - game.startTime) / 1000) });
            if (document.pointerLockElement) document.exitPointerLock();
            if (pauseRef.current) pauseRef.current.style.display = "none";
          }
          continue;
        }
        // Remove expired or out of bounds
        if (bul.life <= 0) {
          scene.remove(bul.mesh);
          game.bullets.splice(bi, 1);
        }
      }

      // Cat AI — wander randomly in Hub with funny quotes
      for (var catI = 0; catI < game.cats.length; catI++) {
        var cat = game.cats[catI];
        // Patrol toward target
        var ctdx = cat.targetX - cat.x;
        var ctdz = cat.targetZ - cat.z;
        var ctDist = Math.sqrt(ctdx * ctdx + ctdz * ctdz);
        cat.patrolTimer += dt;
        if (ctDist < 0.5 || cat.patrolTimer > 10) {
          cat.targetX = cat.minX + Math.random() * (cat.maxX - cat.minX);
          cat.targetZ = cat.minZ + Math.random() * (cat.maxZ - cat.minZ);
          cat.patrolTimer = 0;
        }
        if (ctDist > 0.1) {
          var cnx = cat.x + (ctdx / ctDist) * cat.speed * dt;
          var cnz = cat.z + (ctdz / ctDist) * cat.speed * dt;
          if (!catBlocked(cnx, cnz)) { cat.x = cnx; cat.z = cnz; }
          else if (!catBlocked(cnx, cat.z)) { cat.x = cnx; }
          else if (!catBlocked(cat.x, cnz)) { cat.z = cnz; }
          else { cat.targetX = cat.minX + Math.random() * (cat.maxX - cat.minX); cat.targetZ = cat.minZ + Math.random() * (cat.maxZ - cat.minZ); cat.patrolTimer = 0; }
        }
        cat.group.position.x = cat.x;
        cat.group.position.z = cat.z;
        if (ctDist > 0.1) cat.group.rotation.y = Math.atan2(ctdx, ctdz);

        // Cat speech
        cat.sayTimer -= dt;
        if (cat.sayTimer <= 0) {
          if (cat.bubble.sprite.visible) {
            cat.bubble.sprite.visible = false;
            cat.sayTimer = 0.5 + Math.random() * 1;
          } else {
            updateBubbleText(cat.bubble, CAT_QUOTES[Math.floor(Math.random() * CAT_QUOTES.length)]);
            cat.sayTimer = 1.5 + Math.random() * 1;
          }
        }
      }

      // Easter egg animations
      // Floating spoon rotates and bobs
      if (game.spoon) {
        game.spoon.rotation.y = animT * 1.5;
        game.spoon.rotation.z = Math.sin(animT * 2) * 0.3;
        game.spoon.position.y = 1.5 + Math.sin(animT * 1.5) * 0.15;
      }

      // White rabbit hops around the Office
      if (game.rabbit) {
        var rb = game.rabbit;
        var rbdx = rb.targetX - rb.x;
        var rbdz = rb.targetZ - rb.z;
        var rbDist = Math.sqrt(rbdx * rbdx + rbdz * rbdz);
        rb.timer += dt;
        if (rbDist < 0.5 || rb.timer > 4) {
          rb.targetX = 15 + Math.random() * 12;
          rb.targetZ = 1 + Math.random() * 12;
          rb.timer = 0;
        }
        if (rbDist > 0.1) {
          rb.x += (rbdx / rbDist) * 1.5 * dt;
          rb.z += (rbdz / rbDist) * 1.5 * dt;
        }
        rb.hopPhase += dt * 8;
        rb.group.position.x = rb.x;
        rb.group.position.z = rb.z;
        rb.group.position.y = Math.abs(Math.sin(rb.hopPhase)) * 0.1;
        if (rbDist > 0.1) rb.group.rotation.y = Math.atan2(rbdx, rbdz);
      }

      // Ringing phone pulses
      if (game.phone) {
        game.phone.light.intensity = 0.3 + Math.sin(animT * 8) * 0.4;
        game.phone.handset.position.y = 0.04 + Math.sin(animT * 12) * 0.005;
      }

      // Phone booth light flickers
      if (game.boothLight) {
        game.boothLight.intensity = 0.4 + Math.sin(animT * 3) * 0.2;
      }

      // Proximity labels — fade based on distance
      if (game.proxLabels) {
        for (var pli = 0; pli < game.proxLabels.length; pli++) {
          var pl2 = game.proxLabels[pli];
          var plDist = Math.sqrt(Math.pow(px - pl2.x, 2) + Math.pow(pz - pl2.z, 2));
          var plOpacity = Math.max(0, 1 - plDist / pl2.range);
          pl2.sprite.material.opacity = plOpacity;
          // Rabbit label follows the rabbit
          if (pli === 2 && game.rabbit) {
            pl2.sprite.position.x = game.rabbit.x;
            pl2.sprite.position.z = game.rabbit.z;
            pl2.x = game.rabbit.x;
            pl2.z = game.rabbit.z;
          }
          // Hide gun case label once case is broken
          if (pli === 5 && !game.glassCase) {
            pl2.sprite.material.opacity = 0;
          }
          if (pli === 6 && (game.hasMachineGun || !game.exitHallCaseOpened)) {
            pl2.sprite.material.opacity = 0;
          }
        }
      }

      // Animate keys
      for (var c = 0; c < KEY_DEFS.length; c++) {
        if (game.collected.has(KEY_DEFS[c].id)) continue;
        var kms = game.keyMeshes[KEY_DEFS[c].id];
        if (kms) {
          kms.mesh.rotation.y = animT * 2;
          kms.mesh.position.y = 1.3 + Math.sin(animT * 3) * 0.15;
          kms.ring.rotation.z = animT * 0.5;
        }
      }

      // Particles
      var parr = particles.geometry.attributes.position.array;
      for (var d = 0; d < pCnt; d++) {
        parr[d * 3 + 1] -= dt * 0.4;
        if (parr[d * 3 + 1] < 0) parr[d * 3 + 1] = ROOM_H;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Matrix textures — slow during Matrix Time; upload less often to save fill-rate / bandwidth
      texTick++;
      var texSpeedMult = game.slowMo ? 0.15 : 1.0;
      var texInterval = game.isMobile ? 4 : 2;
      if (texTick % texInterval === 0) {
        for (var e2 = 0; e2 < game.matSurfs.length; e2++) {
          tickMatrixCanvas(
            game.matSurfs[e2].mc,
            game.matSurfs[e2].speed * texSpeedMult * (game.isMobile ? 1 : texInterval)
          );
          game.matSurfs[e2].tex.needsUpdate = true;
        }
      }

      // Timer HUD
      frameCnt++;
      if (frameCnt % 30 === 0 && hudRef.current) {
        var elapsed = Math.floor((Date.now() - game.startTime) / 1000);
        hudRef.current.textContent = String(Math.floor(elapsed / 60)).padStart(2, "0") + ":" + String(elapsed % 60).padStart(2, "0");
      }

      // Slow-mo UI
      if (slowMoOverlayRef.current) {
        slowMoOverlayRef.current.style.opacity = game.slowMo ? "1" : "0";
      }
      if (slowMoTextRef.current) {
        if (game.slowMo) {
          slowMoTextRef.current.style.opacity = "1";
          slowMoTextRef.current.textContent = "MATRIX TIME ACTIVE — " + Math.ceil(game.slowMoTimer) + "s";
        } else {
          slowMoTextRef.current.style.opacity = "0";
        }
      }
      if (slowMoBtnRef.current) {
        if (game.slowMo) {
          slowMoBtnRef.current.textContent = "ACTIVE: " + Math.ceil(game.slowMoTimer) + "s";
          slowMoBtnRef.current.style.background = "rgba(0,100,255,0.4)";
          slowMoBtnRef.current.style.borderColor = "#00aaff";
          slowMoBtnRef.current.style.color = "#00eeff";
        } else if (game.slowMoCooldown > 0) {
          slowMoBtnRef.current.textContent = "COOLDOWN: " + Math.ceil(game.slowMoCooldown) + "s";
          slowMoBtnRef.current.style.background = "rgba(100,0,0,0.3)";
          slowMoBtnRef.current.style.borderColor = "#663333";
          slowMoBtnRef.current.style.color = "#886666";
        } else {
          slowMoBtnRef.current.textContent = "MATRIX TIME [SPACE]";
          slowMoBtnRef.current.style.background = "rgba(0,40,80,0.5)";
          slowMoBtnRef.current.style.borderColor = "#0066cc";
          slowMoBtnRef.current.style.color = "#00ccff";
        }
      }

      // Apply brightness setting via fog
      if (scene.fog) scene.fog.far = 38 * settingsRef.current.brightness;

      if (game.finalDoorOpen && game.finalExitGlow) {
        game.finalExitGlow.material.opacity = 0.52 + 0.26 * Math.sin(animT * 2.6);
        var morpheusAmbush = game.secretMorpheusPhase > 0;
        game.finalExitGlow.material.depthTest = morpheusAmbush;
        if (game.finalExitSign) {
          game.finalExitSign.visible = true;
          game.finalExitSign.material.depthTest = morpheusAmbush;
          game.finalExitSign.renderOrder = morpheusAmbush ? 6 : 8;
        }
        if (game.finalExitCore) {
          game.finalExitCore.visible = true;
          game.finalExitCore.material.opacity = 0.32 + 0.14 * Math.sin(animT * 3.1 + 0.7);
          game.finalExitCore.material.depthTest = morpheusAmbush;
        }
        if (game.finalExitLight) game.finalExitLight.intensity = 0.95 + 0.35 * Math.sin(animT * 2.2);
        if (game.finalExitFrameMeshes) {
          for (var fem2 = 0; fem2 < game.finalExitFrameMeshes.length; fem2++) {
            var fmesh = game.finalExitFrameMeshes[fem2];
            fmesh.visible = true;
            if (fmesh.material) {
              fmesh.material.depthTest = morpheusAmbush;
              fmesh.material.needsUpdate = true;
            }
            fmesh.renderOrder = morpheusAmbush ? 3 : 4;
          }
        }
      }

      // Hit particles (screen-space size so they read clearly at gameplay distances)
      if (game.hitParts && game.hitParts.length > 0) {
        if (!game.hitPartMesh) {
          game.hitPartGeo = new THREE.BufferGeometry();
          game.hitPartMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 7,
            sizeAttenuation: false,
            transparent: true,
            opacity: 1,
            depthTest: true,
            depthWrite: false,
            vertexColors: true,
            blending: THREE.AdditiveBlending
          });
          game.hitPartMesh = new THREE.Points(game.hitPartGeo, game.hitPartMat);
          game.hitPartMesh.renderOrder = 10;
          scene.add(game.hitPartMesh);
        }
        game.hitPartMesh.visible = true;
        for (var hpi = game.hitParts.length - 1; hpi >= 0; hpi--) {
          var hp = game.hitParts[hpi];
          hp.life -= dt;
          if (hp.life <= 0) { game.hitParts.splice(hpi, 1); continue; }
          hp.vy -= 4.2 * dt;
          hp.x += hp.vx * dt;
          hp.y += hp.vy * dt;
          hp.z += hp.vz * dt;
        }
        var n = Math.min(game.hitParts.length, 220);
        var arr = new Float32Array(n * 3);
        var colArr = new Float32Array(n * 3);
        var tmpCol = new THREE.Color();
        for (var hi = 0; hi < n; hi++) {
          var p = game.hitParts[hi];
          arr[hi * 3 + 0] = p.x;
          arr[hi * 3 + 1] = p.y;
          arr[hi * 3 + 2] = p.z;
          tmpCol.setHex(p.col != null ? p.col : 0xffffff);
          colArr[hi * 3 + 0] = tmpCol.r;
          colArr[hi * 3 + 1] = tmpCol.g;
          colArr[hi * 3 + 2] = tmpCol.b;
        }
        game.hitPartGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        game.hitPartGeo.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
        game.hitPartGeo.attributes.position.needsUpdate = true;
        game.hitPartGeo.attributes.color.needsUpdate = true;
      } else if (game.hitPartMesh) {
        game.hitPartMesh.visible = false;
      }

        renderer.render(scene, camera);
      } catch (err) {
        try { console.error(err); } catch (e2) { /* ignore */ }
        try { showRoom("RUNTIME ERROR — CHECK CONSOLE"); } catch (e3) { /* ignore */ }
        if (pauseRef.current) pauseRef.current.style.display = "flex";
      }
    }
    gameLoop();

    return function cleanup() {
      cancelAnimationFrame(animId);
      game.reinstateMorpheusForBetrayalAmbush = null;
      document.removeEventListener("keydown", onKD);
      document.removeEventListener("keyup", onKU);
      document.removeEventListener("mousedown", onMD);
      document.removeEventListener("mouseup", onMU);
      document.removeEventListener("mousemove", onMM);
      document.removeEventListener("mouseenter", onMEnter);
      document.removeEventListener("mouseleave", onMLeave);
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("pointerlockchange", onPLC);
      document.removeEventListener("touchmove", preventScroll);
      document.removeEventListener("touchstart", preventScroll);
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [entered]);

  function handleEnter() {
    setEntered(true);
    // Auto-request pointer lock on desktop
    if (!isMob) {
      setTimeout(function () {
        var el = rootRef.current && rootRef.current.querySelector("canvas");
        if (el) { try { el.requestPointerLock(); } catch (err) { /* ok */ } }
      }, 100);
    }
  }
  function handleReset() {
    game.collected.clear();
    game.opened.clear();
    game.caught = false;
    game.won = false;
    game.agents = [];
    game.cats = [];
    game.bullets = [];
    game.playerBullets = [];
    game.bossKills = 0;
    game.hasGun = false;
    game.hallDoorOpen = false;
    game.slowMo = false;
    game.slowMoTimer = 0;
    game.slowMoCooldown = 0;
    game.sprinting = false;
    game.finalDoorOpen = false;
    game.trinityAgentsCleared = false;
    game.trinityLiberationStarted = false;
    game.trinityJailPhase = 0;
    game.trinityJailOpenTimer = 0;
    game.trinityFallTimer = 0;
    game.trinityPhase = -1;
    game.trinityPhaseTimer = 0;
    game.trinityRunWi = 0;
    game.trinityBodyRoot = null;
    game.introPhase = 0;
    game.introTimer = 0;
    game.introDone = false;
    game.smithPhase = -1;
    game.playerHp = PLAYER_HP_MAX;
    game.playerRegenPause = 0;
    game.smithDefeatSubPhase = 0;
    game.smithDefeatTimer = 0;
    game.smithKneelT = 0;
    game.smithDefeatLineShown = false;
    game.smithHitReactTimer = 0;
    game.trinityRoomSealed = false;
    game.agentSmith = null;
    game.reinstateMorpheusForBetrayalAmbush = null;
    game.trinityDesecrated = false;
    game.trinityBetrayalAnim = null;
    game.trinityBetrayalMats = null;
    game.trinityBetrayalBase = null;
    game.secretMorpheusPhase = 0;
    game.secretMorphLineTimer = 0;
    game.playerFrozen = false;
    game.boothAbandonWindow = 0;
    setGs(initialState);
    setEntered(false);
  }

  var font = "'Courier New', monospace";

  var objectives = [
    { text: "Find the Green Key (Office)", done: gs.keys.green },
    { text: "Find the Red Key (Server Room)", done: gs.keys.red },
    { text: "Find the Blue Key (Archive)", done: gs.keys.blue },
    { text: "Hub: all keys — pistol from glass case", done: gs.hasGun },
    { text: "Exit Hall: eliminate agents — armory opens", done: gs.exitHallArmoryOpen },
    { text: "Grab machine gun — corridor to Trinity opens", done: gs.hasMachineGun },
    { text: "Find Trinity (follow the corridor)", done: gs.foundTrinity },
    { text: "Free Trinity — eliminate every agent in the chamber", done: gs.trinityLiberated },
    { text: "Defeat Agent Smith (hand-to-hand), then reach the exit", done: gs.won },
    { text: "Secret 1/3 — Shoot a cat or the white rabbit (dark ending)", done: false, secretHint: true },
    { text: "Secret 2/3 — Within 10s after Morpheus jacks out, step into the phone booth", done: false, secretHint: true },
    { text: "Secret 3/3 — While Trinity runs for the exit, shoot her, then approach the final exit", done: false, secretHint: true }
  ];
  var curObj = objectives.find(function (o) { return !o.done && !o.secretHint; })
    || objectives.find(function (o) { return !o.secretHint; })
    || objectives[objectives.length - 1];

  return (
    <div
      ref={rootRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ width: "100vw", height: "100dvh", background: "#000", position: "fixed", top: 0, left: 0, overflow: "hidden", touchAction: "none", cursor: entered && !gs.won && !gs.caught ? "none" : "default" }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {!entered && (
        <div
          onClick={handleEnter}
          onTouchEnd={function (ev) { ev.preventDefault(); handleEnter(); }}
          style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.85)", zIndex: 100, cursor: "pointer", overflow: "hidden"
          }}
        >
          <MatrixRain color="#00ff41" />
          <h1 style={{ fontFamily: font, color: "#00ff41", fontSize: "clamp(1.4rem,6vw,2.8rem)", marginBottom: 8, textShadow: "0 0 20px #00ff41, 0 0 40px #00ff41", letterSpacing: "0.3em", position: "relative", zIndex: 1 }}>
            ESCAPE THE MATRIX
          </h1>
          <p style={{ fontFamily: font, color: "#00aa33", fontSize: "clamp(0.6rem,2.5vw,0.85rem)", opacity: 0.7, marginBottom: 24, textAlign: "center", maxWidth: 340, lineHeight: 1.45, position: "relative", zIndex: 1 }}>
            Morpheus opens the mission. Find keys, reach Trinity in the corridor, free her, then take the final exit out of the Matrix.
          </p>
          <div style={{ fontFamily: font, color: "#00cc33", fontSize: "clamp(0.6rem,2.5vw,0.8rem)", opacity: 0.8, textAlign: "center", lineHeight: 2.2, position: "relative", zIndex: 1 }}>
            {isMob ? (
              <React.Fragment><div>LEFT STICK — Move</div><div>DRAG ANYWHERE — Look</div><div>SPACE — Matrix Time</div></React.Fragment>
            ) : (
              <React.Fragment><div>WASD — Move</div><div>MOUSE — Look</div><div>SHIFT — Sprint</div><div>SPACE — Matrix Time</div></React.Fragment>
            )}
          </div>
          <p style={{ fontFamily: font, color: "#00ff41", fontSize: "clamp(0.8rem,3vw,1.1rem)", marginTop: 32, position: "relative", zIndex: 1 }}>
            {isMob ? "[ TAP TO ENTER ]" : "[ CLICK TO ENTER ]"}
          </p>
        </div>
      )}

      {gs.won && (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", zIndex: 100, overflow: "hidden" }}>
          <MatrixRain color="#00ff41" />
          <h1 style={{ fontFamily: font, color: "#00ff41", fontSize: "clamp(1.3rem,5vw,2.5rem)", textShadow: "0 0 30px #00ff41, 0 0 60px #00ff41", letterSpacing: "0.2em", marginBottom: 16, position: "relative", zIndex: 1 }}>YOU ESCAPED</h1>
          <p style={{ fontFamily: font, color: "#00ff41", fontSize: "clamp(1.5rem,6vw,3rem)", textShadow: "0 0 20px #00ff41", marginBottom: 8, position: "relative", zIndex: 1 }}>
            {String(Math.floor(gs.time / 60)).padStart(2, "0")}:{String(gs.time % 60).padStart(2, "0")}
          </p>
          <p style={{ fontFamily: font, color: "#00aa33", fontSize: "clamp(0.6rem,2.5vw,0.8rem)", opacity: 0.6, marginBottom: 32, position: "relative", zIndex: 1 }}>COMPLETION TIME</p>
          <div onClick={handleReset} onTouchEnd={function (ev) { ev.preventDefault(); handleReset(); }}
            style={{ fontFamily: font, color: "#000", background: "#00ff41", padding: "12px 32px", fontSize: "clamp(0.8rem,3vw,1rem)", cursor: "pointer", letterSpacing: "0.15em", boxShadow: "0 0 20px #00ff41", position: "relative", zIndex: 1 }}>
            RESET
          </div>
        </div>
      )}

      {gs.caught && (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: gs.caughtReason ? "rgba(0,5,10,0.85)" : "rgba(10,0,0,0.8)", zIndex: 100, overflow: "hidden" }}>
          <MatrixRain color={gs.caughtReason ? "#ff6600" : "#ff2222"} />
          {gs.caughtReason === "animal_secret_cat" ? (
            <React.Fragment>
              <h1 style={{ fontFamily: font, color: "#ffcc66", fontSize: "clamp(0.95rem,3.5vw,1.5rem)", textShadow: "0 0 16px #ffaa00", letterSpacing: "0.2em", marginBottom: 10, textAlign: "center", position: "relative", zIndex: 1 }}>SECRET ENDING — 1 / 3</h1>
              <h2 style={{ fontFamily: font, color: "#ff9900", fontSize: "clamp(1rem,4vw,1.85rem)", textShadow: "0 0 20px #ff6600", letterSpacing: "0.12em", marginBottom: 12, textAlign: "center", position: "relative", zIndex: 1 }}>ANIMAL CRUELTY</h2>
              <p style={{ fontFamily: font, color: "#ffcc00", fontSize: "clamp(0.7rem,2.5vw,1rem)", marginBottom: 6, textAlign: "center", position: "relative", zIndex: 1 }}>You shot a cat. A BLACK CAT.</p>
              <p style={{ fontFamily: font, color: "#ff8800", fontSize: "clamp(0.6rem,2vw,0.85rem)", marginBottom: 6, textAlign: "center", position: "relative", zIndex: 1 }}>The Matrix has reported you to PETA.</p>
              <p style={{ fontFamily: font, color: "#ff6600", fontSize: "clamp(0.55rem,1.8vw,0.75rem)", opacity: 0.7, marginBottom: 24, textAlign: "center", position: "relative", zIndex: 1 }}>That cat had 8 lives left, you monster.</p>
            </React.Fragment>
          ) : gs.caughtReason === "animal_secret_rabbit" ? (
            <React.Fragment>
              <h1 style={{ fontFamily: font, color: "#ffcc66", fontSize: "clamp(0.95rem,3.5vw,1.5rem)", textShadow: "0 0 16px #ffaa00", letterSpacing: "0.2em", marginBottom: 10, textAlign: "center", position: "relative", zIndex: 1 }}>SECRET ENDING — 1 / 3</h1>
              <h2 style={{ fontFamily: font, color: "#ff9900", fontSize: "clamp(1rem,4vw,1.85rem)", textShadow: "0 0 20px #ff6600", letterSpacing: "0.12em", marginBottom: 12, textAlign: "center", position: "relative", zIndex: 1 }}>ANIMAL CRUELTY</h2>
              <p style={{ fontFamily: font, color: "#ffcc00", fontSize: "clamp(0.7rem,2.5vw,1rem)", marginBottom: 6, textAlign: "center", position: "relative", zIndex: 1 }}>You shot the White Rabbit.</p>
              <p style={{ fontFamily: font, color: "#ff8800", fontSize: "clamp(0.6rem,2vw,0.85rem)", marginBottom: 6, textAlign: "center", position: "relative", zIndex: 1 }}>Morpheus is VERY disappointed in you.</p>
              <p style={{ fontFamily: font, color: "#ff6600", fontSize: "clamp(0.55rem,1.8vw,0.75rem)", opacity: 0.7, marginBottom: 24, textAlign: "center", position: "relative", zIndex: 1 }}>You were supposed to FOLLOW it, not SHOOT it.</p>
            </React.Fragment>
          ) : gs.caughtReason === "booth_abandon" ? (
            <React.Fragment>
              <h1 style={{ fontFamily: font, color: "#88ddff", fontSize: "clamp(0.95rem,3.5vw,1.5rem)", textShadow: "0 0 16px #00aaff", letterSpacing: "0.2em", marginBottom: 10, textAlign: "center", position: "relative", zIndex: 1 }}>SECRET ENDING — 2 / 3</h1>
              <h2 style={{ fontFamily: font, color: "#00ccff", fontSize: "clamp(1.1rem,4.2vw,2rem)", textShadow: "0 0 20px #0088ff", letterSpacing: "0.12em", marginBottom: 12, textAlign: "center", position: "relative", zIndex: 1 }}>JACKED OUT</h2>
              <p style={{ fontFamily: font, color: "#aaddff", fontSize: "clamp(0.7rem,2.5vw,1rem)", marginBottom: 8, textAlign: "center", position: "relative", zIndex: 1 }}>You stepped into the booth within 10 seconds and left the simulation early.</p>
              <p style={{ fontFamily: font, color: "#88bbdd", fontSize: "clamp(0.6rem,2vw,0.85rem)", opacity: 0.85, marginBottom: 24, textAlign: "center", position: "relative", zIndex: 1 }}>Trinity is still in the Matrix. Hope that call was worth it.</p>
            </React.Fragment>
          ) : gs.caughtReason === "morpheus_secret" ? (
            <React.Fragment>
              <h1 style={{ fontFamily: font, color: "#ff66aa", fontSize: "clamp(0.95rem,3.5vw,1.5rem)", textShadow: "0 0 16px #ff0088", letterSpacing: "0.2em", marginBottom: 10, textAlign: "center", position: "relative", zIndex: 1 }}>SECRET ENDING — 3 / 3</h1>
              <h2 style={{ fontFamily: font, color: "#ff4444", fontSize: "clamp(1.1rem,4.2vw,2rem)", textShadow: "0 0 22px #ff0000", letterSpacing: "0.1em", marginBottom: 12, textAlign: "center", position: "relative", zIndex: 1 }}>MORPHEUS WAS WATCHING</h2>
              <p style={{ fontFamily: font, color: "#ffaaaa", fontSize: "clamp(0.7rem,2.5vw,1rem)", marginBottom: 8, textAlign: "center", position: "relative", zIndex: 1 }}>Even the Chosen One answers for desecrating Trinity.</p>
              <p style={{ fontFamily: font, color: "#cc6666", fontSize: "clamp(0.6rem,2vw,0.85rem)", opacity: 0.8, marginBottom: 24, textAlign: "center", position: "relative", zIndex: 1 }}>Machine-gunned by the mentor. The Architect sends a sympathy card.</p>
            </React.Fragment>
          ) : gs.caughtReason === "brawl" ? (
            <React.Fragment>
              <h1 style={{ fontFamily: font, color: "#ff4444", fontSize: "clamp(1.2rem,4.5vw,2.2rem)", textShadow: "0 0 24px #ff0000", letterSpacing: "0.12em", marginBottom: 12, textAlign: "center", position: "relative", zIndex: 1 }}>KNOCKED OUT</h1>
              <p style={{ fontFamily: font, color: "#ff8888", fontSize: "clamp(0.7rem,2.5vw,1rem)", marginBottom: 8, textAlign: "center", position: "relative", zIndex: 1 }}>Agent Smith connected five times. You agreed to the rules.</p>
              <p style={{ fontFamily: font, color: "#aa5555", fontSize: "clamp(0.6rem,2vw,0.85rem)", opacity: 0.75, marginBottom: 24, textAlign: "center", position: "relative", zIndex: 1 }}>The Matrix sends its regards — politely, of course.</p>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <h1 style={{ fontFamily: font, color: "#ff3333", fontSize: "clamp(1.3rem,5vw,2.5rem)", textShadow: "0 0 30px #ff0000, 0 0 60px #ff0000", letterSpacing: "0.2em", marginBottom: 8, position: "relative", zIndex: 1 }}>CAUGHT</h1>
              <p style={{ fontFamily: font, color: "#ff6666", fontSize: "clamp(0.7rem,2.5vw,1rem)", opacity: 0.7, marginBottom: 8, position: "relative", zIndex: 1 }}>An agent got you.</p>
              <p style={{ fontFamily: font, color: "#ff3333", fontSize: "clamp(1.2rem,5vw,2.5rem)", textShadow: "0 0 15px #ff0000", marginBottom: 8, position: "relative", zIndex: 1 }}>
                {String(Math.floor(gs.time / 60)).padStart(2, "0")}:{String(gs.time % 60).padStart(2, "0")}
              </p>
              <p style={{ fontFamily: font, color: "#aa3333", fontSize: "clamp(0.6rem,2.5vw,0.8rem)", opacity: 0.6, marginBottom: 24, position: "relative", zIndex: 1 }}>SURVIVED</p>
            </React.Fragment>
          )}
          <div onClick={handleReset} onTouchEnd={function (ev) { ev.preventDefault(); handleReset(); }}
            style={{ fontFamily: font, color: "#000", background: gs.caughtReason === "brawl" ? "#ff6666" : (gs.caughtReason ? "#ff9900" : "#ff3333"), padding: "12px 32px", fontSize: "clamp(0.8rem,3vw,1rem)", cursor: "pointer", letterSpacing: "0.15em", boxShadow: "0 0 20px " + (gs.caughtReason === "brawl" ? "#ff4444" : (gs.caughtReason ? "#ff6600" : "#ff0000")), position: "relative", zIndex: 1 }}>
            {gs.caughtReason === "brawl" ? "TRY AGAIN" : (gs.caughtReason ? "I'M SORRY" : "TRY AGAIN")}
          </div>
        </div>
      )}

      {entered && !gs.won && !gs.caught && !gs.brawlActive && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: gs.hasGun ? 24 : 20, height: gs.hasGun ? 24 : 20, zIndex: 65, pointerEvents: "none" }}>
          <div style={{ position: "absolute", width: 2, height: "100%", left: "50%", transform: "translateX(-50%)", background: gs.hasGun ? "rgba(255,50,50,0.8)" : "rgba(0,255,65,0.5)" }} />
          <div style={{ position: "absolute", height: 2, width: "100%", top: "50%", transform: "translateY(-50%)", background: gs.hasGun ? "rgba(255,50,50,0.8)" : "rgba(0,255,65,0.5)" }} />
          {gs.hasGun && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: gs.hasMachineGun ? 5 : 4, height: gs.hasMachineGun ? 5 : 4, borderRadius: "50%", background: gs.hasMachineGun ? "rgba(255,170,50,0.75)" : "rgba(255,50,50,0.6)" }} />}
        </div>
      )}

      {entered && !gs.won && !gs.caught && (
        <div style={{ position: "absolute", left: 14, bottom: 14, width: 216, zIndex: 70, pointerEvents: "none" }}>
          <div style={{ fontFamily: font, color: "#00ff41", fontSize: 10, marginBottom: 4, letterSpacing: "0.18em", opacity: 0.95 }}>VITALITY</div>
          <div style={{ height: 15, background: "rgba(0,0,0,0.72)", border: "1px solid rgba(0,255,65,0.45)", borderRadius: 2, overflow: "hidden" }}>
            <div ref={vitalityFillRef} style={{ height: "100%", width: "100%", background: "linear-gradient(90deg,#006622,#00ee66)", transition: "width 0.08s linear" }} />
          </div>
          <div style={{ fontFamily: font, color: "#448855", fontSize: 8, marginTop: 3, letterSpacing: "0.06em", opacity: 0.75 }}>Heals after ~2.5s out of fire — three clean hits can drop you</div>
        </div>
      )}

      {entered && !gs.won && !gs.caught && (
        <div ref={smithHpBarRef} style={{ display: "none", position: "absolute", width: 104, zIndex: 71, pointerEvents: "none" }}>
          <div style={{ fontFamily: font, color: "#ddeeff", fontSize: 9, marginBottom: 3, textAlign: "center", letterSpacing: "0.1em", textShadow: "0 0 6px #000" }}>AGENT SMITH</div>
          <div style={{ height: 11, background: "rgba(0,0,0,0.75)", border: "1px solid rgba(160,180,200,0.55)", borderRadius: 2, overflow: "hidden" }}>
            <div ref={smithHpFillRef} style={{ height: "100%", width: "100%", background: "linear-gradient(90deg,#334455,#99aabb)", transition: "width 0.1s ease-out" }} />
          </div>
        </div>
      )}

      {entered && !gs.won && !gs.caught && isMob && gs.brawlActive && (
        <div
          onClick={function (ev) { ev.stopPropagation(); if (game.playerPunchFn) game.playerPunchFn(); }}
          onTouchEnd={function (ev) { ev.preventDefault(); ev.stopPropagation(); if (game.playerPunchFn) game.playerPunchFn(); }}
          style={{
            position: "absolute", right: 18, bottom: 120, zIndex: 85, width: 76, height: 76, borderRadius: "50%",
            background: "rgba(0,60,30,0.75)", border: "2px solid #00ff41", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: font, color: "#00ff41", fontSize: 11, letterSpacing: "0.06em", textAlign: "center", lineHeight: 1.15, cursor: "pointer", userSelect: "none",
            boxShadow: "0 0 16px rgba(0,255,65,0.35)"
          }}
        >
          PUNCH
        </div>
      )}

      {entered && !gs.won && !gs.caught && (
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 80, pointerEvents: "auto" }}>
          <div
            onClick={function () { setShowObj(!showObj); setShowCtrl(false); setShowOpts(false); }}
            onTouchEnd={function (ev) { ev.preventDefault(); ev.stopPropagation(); setShowObj(function (v) { return !v; }); setShowCtrl(false); setShowOpts(false); }}
            style={{ fontFamily: font, color: "#00ff41", fontSize: "clamp(0.55rem,2vw,0.75rem)", background: "rgba(0,20,0,0.8)", border: "1px solid rgba(0,255,65,0.3)", padding: "6px 12px", cursor: "pointer", letterSpacing: "0.1em", userSelect: "none" }}
          >
            {"OBJECTIVES " + (showObj ? "▲" : "▼")}
          </div>
          {showObj && (
            <div style={{ background: "rgba(0,10,0,0.92)", border: "1px solid rgba(0,255,65,0.25)", padding: "10px 14px", marginTop: 4, minWidth: 200 }}>
              {objectives.map(function (o, idx) {
                var isHint = !!o.secretHint;
                var col = o.done ? "#005500" : (isHint ? "#88bbaa" : "#00ff41");
                var op = o.done ? 0.4 : (isHint ? 0.82 : 1);
                return (
                  <div key={idx} style={{ fontFamily: font, fontSize: "clamp(0.5rem,1.8vw,0.7rem)", color: col, padding: "4px 0", textDecoration: o.done ? "line-through" : "none", opacity: op }}>
                    {(o.done ? "✓ " : "○ ") + o.text}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.6rem)", color: "#ffffff", opacity: 0.8, marginTop: 6, textAlign: "right" }}>
            {"→ " + curObj.text}
          </div>
          <div
            onClick={function () { setShowCtrl(!showCtrl); setShowObj(false); setShowOpts(false); }}
            onTouchEnd={function (ev) { ev.preventDefault(); ev.stopPropagation(); setShowCtrl(function (v) { return !v; }); setShowObj(false); setShowOpts(false); }}
            style={{ fontFamily: font, color: "#00ccff", fontSize: "clamp(0.55rem,2vw,0.75rem)", background: "rgba(0,20,40,0.8)", border: "1px solid rgba(0,150,255,0.3)", padding: "6px 12px", cursor: "pointer", letterSpacing: "0.1em", userSelect: "none", marginTop: 8 }}
          >
            {"CONTROLS " + (showCtrl ? "▲" : "▼")}
          </div>
          {showCtrl && (
            <div style={{ background: "rgba(0,5,15,0.95)", border: "1px solid rgba(0,150,255,0.25)", padding: "12px 14px", marginTop: 4, minWidth: 220 }}>
              <div style={{ fontFamily: font, fontSize: "clamp(0.55rem,1.8vw,0.7rem)", color: "#00ccff", padding: "2px 0", fontWeight: "bold", marginBottom: 6 }}>
                {isMob ? "MOBILE" : "PC"}
              </div>
              {isMob ? (
                <React.Fragment>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Left stick — Move</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Drag anywhere — Look around</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Matrix Time btn — Slow motion</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#88ffaa", padding: "3px 0" }}>PUNCH button — Strike in Smith brawl</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#ffaa66", padding: "3px 0" }}>Hold FIRE — machine gun burst</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Walk near keys — Auto pickup</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Doors open when key found</div>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>WASD / Arrows — Move</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Mouse — Look around</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Shift — Sprint</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Space — Matrix Time (slow-mo)</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#88ffaa", padding: "3px 0" }}>Click / PUNCH — strike during Smith brawl</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Click — Lock mouse cursor</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#ffaa66", padding: "3px 0" }}>Hold click — machine gun auto-fire</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Walk near keys — Auto pickup</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Doors open when key found</div>
                </React.Fragment>
              )}
              <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#ff6666", padding: "5px 0 2px", marginTop: 4, borderTop: "1px solid rgba(255,50,50,0.2)" }}>Avoid agents — they catch you!</div>
            </div>
          )}
          <div
            onClick={function () { setShowOpts(!showOpts); setShowObj(false); setShowCtrl(false); }}
            onTouchEnd={function (ev) { ev.preventDefault(); ev.stopPropagation(); setShowOpts(function (v) { return !v; }); setShowObj(false); setShowCtrl(false); }}
            style={{ fontFamily: font, color: "#ffaa00", fontSize: "clamp(0.55rem,2vw,0.75rem)", background: "rgba(40,30,0,0.8)", border: "1px solid rgba(255,170,0,0.3)", padding: "6px 12px", cursor: "pointer", letterSpacing: "0.1em", userSelect: "none", marginTop: 8 }}
          >
            {"OPTIONS " + (showOpts ? "▲" : "▼")}
          </div>
          {showOpts && (
            <div
              onClick={function (e) { e.stopPropagation(); }}
              onPointerDown={function (e) { e.stopPropagation(); }}
              style={{ background: "rgba(15,10,0,0.95)", border: "1px solid rgba(255,170,0,0.25)", padding: "12px 14px", marginTop: 4, minWidth: 220 }}
            >
              <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#ffaa00", marginBottom: 10 }}>
                {isMob ? "Touch" : "Mouse"} Sensitivity
              </div>
              <input type="range" min="0.2" max="3" step="0.1"
                defaultValue={isMob ? 1 : 0.6}
                onChange={function (e) { settingsRef.current.sensitivity = parseFloat(e.target.value); }}
                onPointerDown={function (e) { e.stopPropagation(); }}
                onTouchStart={function (e) { e.stopPropagation(); }}
                style={{ width: "100%", accentColor: "#ffaa00", cursor: "pointer" }}
              />
              <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#ffaa00", marginBottom: 10, marginTop: 12 }}>
                Brightness
              </div>
              <input type="range" min="0.3" max="3" step="0.1"
                defaultValue="1"
                onChange={function (e) { settingsRef.current.brightness = parseFloat(e.target.value); }}
                onPointerDown={function (e) { e.stopPropagation(); }}
                onTouchStart={function (e) { e.stopPropagation(); }}
                style={{ width: "100%", accentColor: "#ffaa00", cursor: "pointer" }}
              />
              <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#ffaa00", marginBottom: 10, marginTop: 12 }}>
                Enemy Speed
              </div>
              <input type="range" min="0.2" max="2" step="0.1"
                defaultValue="1"
                onChange={function (e) { settingsRef.current.enemySpeed = parseFloat(e.target.value); }}
                onPointerDown={function (e) { e.stopPropagation(); }}
                onTouchStart={function (e) { e.stopPropagation(); }}
                style={{ width: "100%", accentColor: "#ffaa00", cursor: "pointer" }}
              />
            </div>
          )}
        </div>
      )}

      {entered && !gs.won && !gs.caught && (
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 70, display: "flex", gap: 10, pointerEvents: "none" }}>
          {["green", "red", "blue"].map(function (kc) {
            return (
              <div key={kc} style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid " + COLOR_CSS[kc], background: gs.keys[kc] ? COLOR_CSS[kc] : "transparent", boxShadow: gs.keys[kc] ? "0 0 8px " + COLOR_CSS[kc] : "none", transition: "all 0.3s" }} />
            );
          })}
        </div>
      )}

      {entered && (
        <div ref={roomNameRef} style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", fontFamily: font, color: "#00ff41", fontSize: "clamp(1rem,4vw,1.6rem)", letterSpacing: "0.2em", textShadow: "0 0 15px #00ff41", opacity: 0, transition: "opacity 0.5s", zIndex: 65, pointerEvents: "none" }} />
      )}

      {entered && !gs.won && !gs.caught && (
        <React.Fragment>
          <div style={{ position: "absolute", left: 30, bottom: 70, width: 85, height: 85, borderRadius: "50%", border: "2px solid rgba(0,255,65,0.3)", background: "rgba(0,255,65,0.06)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, pointerEvents: "none" }}>
            <div ref={leftKnobRef} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,255,65,0.25)", border: "2px solid rgba(0,255,65,0.5)" }} />
            <div style={{ position: "absolute", bottom: -20, fontFamily: font, color: "rgba(0,255,65,0.35)", fontSize: "0.55rem", letterSpacing: "0.1em" }}>MOVE</div>
          </div>
          <div style={{ position: "absolute", right: 20, bottom: 70, zIndex: 60, pointerEvents: "none", textAlign: "center" }}>
            <div style={{ fontFamily: font, color: "rgba(0,255,65,0.3)", fontSize: "clamp(0.5rem,2vw,0.7rem)", letterSpacing: "0.1em" }}>DRAG ANYWHERE</div>
            <div style={{ fontFamily: font, color: "rgba(0,255,65,0.3)", fontSize: "clamp(0.5rem,2vw,0.7rem)", letterSpacing: "0.1em" }}>TO LOOK</div>
          </div>
        </React.Fragment>
      )}

      {entered && !gs.won && !gs.caught && (
        <div ref={hudRef} style={{ position: "absolute", top: 12, left: 12, zIndex: 70, fontFamily: font, color: "#ffffff", fontSize: "clamp(0.7rem,2.5vw,0.9rem)", opacity: 0.8, pointerEvents: "none" }}>00:00</div>
      )}

      {entered && (
        <div ref={slowMoTextRef} style={{
          position: "absolute", top: 40, left: 12, zIndex: 75, pointerEvents: "none",
          fontFamily: font, color: "#00ccff", fontSize: "clamp(0.8rem,3vw,1.1rem)",
          textShadow: "0 0 15px #0066ff, 0 0 30px #0044cc",
          letterSpacing: "0.15em", opacity: 0, transition: "opacity 0.3s"
        }} />
      )}

      {entered && !gs.won && !gs.caught && (
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 75, pointerEvents: "auto" }}>
          <div
            ref={sprintBtnRef}
            onClick={function () { game.sprinting = !game.sprinting; if(sprintBtnRef.current){sprintBtnRef.current.style.background=game.sprinting?"rgba(0,180,0,0.4)":"rgba(0,40,0,0.5)";sprintBtnRef.current.style.borderColor=game.sprinting?"#00ff41":"#006600";sprintBtnRef.current.textContent=game.sprinting?"SPRINT: ON":"SPRINT";} }}
            onTouchEnd={function (ev) { ev.preventDefault(); ev.stopPropagation(); game.sprinting = !game.sprinting; if(sprintBtnRef.current){sprintBtnRef.current.style.background=game.sprinting?"rgba(0,180,0,0.4)":"rgba(0,40,0,0.5)";sprintBtnRef.current.style.borderColor=game.sprinting?"#00ff41":"#006600";sprintBtnRef.current.textContent=game.sprinting?"SPRINT: ON":"SPRINT";} }}
            style={{
              fontFamily: font, color: "#00ff41", fontSize: "clamp(0.55rem,2vw,0.75rem)",
              background: "rgba(0,40,0,0.5)", border: "1px solid #006600",
              padding: "8px 14px", cursor: "pointer", letterSpacing: "0.1em",
              userSelect: "none", textAlign: "center"
            }}
          >
            SPRINT
          </div>
          <div
            ref={slowMoBtnRef}
            onClick={function () {
              if (!game.slowMo && game.slowMoCooldown <= 0) {
                game.slowMo = true;
                game.slowMoTimer = 7;
              }
            }}
            onTouchEnd={function (ev) {
              ev.preventDefault();
              ev.stopPropagation();
              if (!game.slowMo && game.slowMoCooldown <= 0) {
                game.slowMo = true;
                game.slowMoTimer = 7;
              }
            }}
            style={{
              fontFamily: font, color: "#00ccff", fontSize: "clamp(0.55rem,2vw,0.75rem)",
              background: "rgba(0,40,80,0.5)", border: "1px solid #0066cc",
              padding: "8px 14px", cursor: "pointer", letterSpacing: "0.1em",
              userSelect: "none", textAlign: "center"
            }}
          >
            MATRIX TIME
          </div>
          <div
            onPointerDown={function (ev) {
              ev.preventDefault();
              ev.stopPropagation();
              if (!game.hasGun || game.won || game.caught || game.playerFrozen || (game.trinityGunLockedFn && game.trinityGunLockedFn())) return;
              if (game.hasMachineGun) game.fireHeld = true;
              else if (game.playerShoot) game.playerShoot();
            }}
            onPointerUp={function (ev) {
              ev.preventDefault();
              ev.stopPropagation();
              game.fireHeld = false;
            }}
            onPointerLeave={function () { game.fireHeld = false; }}
            style={{
              fontFamily: font, color: "#ff4444", fontSize: "clamp(0.55rem,2vw,0.75rem)",
              background: gs.hasGun ? "rgba(80,0,0,0.5)" : "rgba(30,30,30,0.3)", border: "1px solid " + (gs.hasGun ? "#cc0000" : "#333333"),
              padding: "8px 14px", cursor: "pointer", letterSpacing: "0.1em",
              touchAction: "none", userSelect: "none", textAlign: "center", opacity: gs.hasGun ? 1 : 0.3
            }}
          >
            FIRE
          </div>
        </div>
      )}

      {entered && (
        <div
          ref={slowMoOverlayRef}
          style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,30,80,0.15)", zIndex: 55, pointerEvents: "none",
            opacity: 0, transition: "opacity 0.3s"
          }}
        />
      )}

      {entered && !isMob && !gs.won && !gs.caught && (
        <div
          ref={pauseRef}
          onClick={function () {
            var el = rootRef.current && rootRef.current.querySelector("canvas");
            if (el) { try { el.requestPointerLock(); } catch (err) { /* ok */ } }
          }}
          style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.7)", zIndex: 90, display: "none",
            flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer"
          }}
        >
          <div style={{ fontFamily: font, color: "#00ff41", fontSize: "clamp(1rem,4vw,1.8rem)", letterSpacing: "0.2em", textShadow: "0 0 20px #00ff41", marginBottom: 16 }}>PAUSED</div>
          <div style={{ fontFamily: font, color: "#00aa33", fontSize: "clamp(0.6rem,2.5vw,0.9rem)", opacity: 0.7 }}>Click to resume — Escape to pause</div>
        </div>
      )}
    </div>
  );
}
