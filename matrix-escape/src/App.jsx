import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

var RAIN_CHARS = "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFZ";
function MatrixRain({ color }) {
  var canvasRef = useRef(null);
  useEffect(function () {
    var cv = canvasRef.current;
    if (!cv) return;
    var ctx = cv.getContext("2d");
    var w = cv.width = cv.parentElement.clientWidth;
    var h = cv.height = cv.parentElement.clientHeight;
    var cols = Math.floor(w / 14);
    var drops = [];
    for (var i = 0; i < cols; i++) drops.push(Math.random() * h / 14);
    var col = color || "#00ff41";
    var animId;
    function draw() {
      animId = requestAnimationFrame(draw);
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = "12px monospace";
      for (var i2 = 0; i2 < cols; i2++) {
        var ch = RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
        var x = i2 * 14;
        var y = drops[i2] * 14;
        ctx.fillStyle = Math.random() > 0.8 ? "#ffffff" : col;
        ctx.globalAlpha = 0.4 + Math.random() * 0.6;
        ctx.fillText(ch, x, y);
        ctx.globalAlpha = 1;
        if (y > h && Math.random() > 0.975) drops[i2] = 0;
        drops[i2] += 0.5 + Math.random() * 0.5;
      }
    }
    draw();
    return function () { cancelAnimationFrame(animId); };
  }, [color]);
  return React.createElement("canvas", { ref: canvasRef, style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 } });
}

var ROOM_H = 7;
var ROOM_SIZE = 14;
var MOVE_SPEED = 3.5;
var SPRINT_MULT = 1.6;
var MOUSE_SENS = 0.018;
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

var WALL_SEGS = [
  { a: "z", p: 0, mn: 0, mx: 5.25 }, { a: "z", p: 0, mn: 8.75, mx: 14 },
  { a: "x", p: 14, mn: 0, mx: 5.25 }, { a: "x", p: 14, mn: 8.75, mx: 14 },
  { a: "z", p: 14, mn: 0, mx: 5.25 }, { a: "z", p: 14, mn: 8.75, mx: 14 },
  { a: "x", p: 0, mn: 0, mx: 5.25 }, { a: "x", p: 0, mn: 8.75, mx: 14 },
  { a: "z", p: 0, mn: 14, mx: 28 }, { a: "x", p: 28, mn: 0, mx: 14 }, { a: "z", p: 14, mn: 14, mx: 28 },
  { a: "z", p: -14, mn: 0, mx: 14 }, { a: "x", p: 14, mn: -14, mx: 0 }, { a: "x", p: 0, mn: -14, mx: 0 },
  { a: "z", p: 0, mn: -14, mx: 0 }, { a: "z", p: 14, mn: -14, mx: 0 }, { a: "x", p: -14, mn: 0, mx: 14 },
  { a: "x", p: 14, mn: 14, mx: 28 }, { a: "z", p: 28, mn: 0, mx: 5 }, { a: "z", p: 28, mn: 9, mx: 14 }, { a: "x", p: 0, mn: 14, mx: 28 },
  // Escape hallway walls
  { a: "x", p: 5, mn: 28, mx: 42 }, { a: "x", p: 9, mn: 28, mx: 42 }
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
  { x: 11, z: 25, rx: 0, rz: 14, speed: 1.2, room: 4 }
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
  cv.height = 128;
  var ctx = cv.getContext("2d");
  var tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  var spMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
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
  var startY = lines.length > 1 ? 52 : 72;
  for (var i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cv.width / 2, startY + i * 30);
  }
  bubble.tex.needsUpdate = true;
  bubble.sprite.visible = true;
}

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

  var initialState = {
    keys: { green: false, red: false, blue: false },
    doors: { green: false, red: false, blue: false },
    won: false,
    caught: false,
    caughtReason: "",
    time: 0,
    room: "Hub",
    hasGun: false
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

  var settingsRef = useRef({ sensitivity: 1.0, brightness: 1.0, enemySpeed: 1.0 });

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
    hallDoorOpen: false,
    bossKills: 0,
    playerBullets: [],
    gunMesh: null,
    glassCase: null,
    hallDoorMesh: null
  }).current;

  var updateGame = useCallback(function (u) {
    setGs(function (prev) { return Object.assign({}, prev, u); });
  }, []);

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
    game.yaw = Math.PI;
    game.pitch = 0;
    game.moveX = 0;
    game.moveZ = 0;
    game.lookX = 0;
    game.lookY = 0;
    game.movePtrId = -1;
    game.lookPtrId = -1;
    game.matSurfs = [];
    game.keyMeshes = {};
    game.doorMeshes = {};

    var W = container.clientWidth;
    var H = container.clientHeight;

    // Scene
    var scene = new THREE.Scene();
    game.sceneRef = scene;
    scene.background = new THREE.Color(0x002200);
    scene.fog = new THREE.Fog(0x002200, 12, 38);
    var camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 100);
    camera.position.set(10, 1.7, 3);
    game.camera = camera;
    var renderer = new THREE.WebGLRenderer({ antialias: false });
    // Match Claude artifact Three.js r128 color behavior
    if (THREE.ColorManagement) THREE.ColorManagement.enabled = false;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace || THREE.LinearEncoding;
    renderer.setSize(W, H);
    renderer.setPixelRatio(game.isMobile ? 1 : Math.min(window.devicePixelRatio, 1));
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = "none";

    // Lights
    scene.add(new THREE.AmbientLight(0x44ff66, 1.5));
    game.renderer = renderer;

    // Textures (2 shared)
    var textures = [];
    var texSize = game.isMobile ? 64 : 128;
    for (var ti = 0; ti < 2; ti++) {
      var mc = makeMatrixCanvas(texSize, texSize);
      for (var j = 0; j < 50; j++) tickMatrixCanvas(mc, 0.5 + ti * 0.2);
      var tex = new THREE.CanvasTexture(mc.canvas);
      tex.minFilter = THREE.LinearFilter;
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

    // Escape hallway — floor, ceiling
    var hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(4, 14), matMat(0, 0x44ff77));
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.set(7, 0.01, 35);
    scene.add(hallFloor);
    var hallCeil = new THREE.Mesh(new THREE.PlaneGeometry(4, 14), matMat(1, 0x33dd66));
    hallCeil.rotation.x = Math.PI / 2;
    hallCeil.position.set(7, ROOM_H, 35);
    scene.add(hallCeil);
    var hallLight = new THREE.PointLight(0x00ff41, 0.8, 12);
    hallLight.position.set(7, ROOM_H - 1, 35);
    scene.add(hallLight);
    // End wall with exit portal
    var endWallL = new THREE.Mesh(new THREE.PlaneGeometry(1, ROOM_H), matMat(2, 0x55ff88));
    endWallL.position.set(5.5, ROOM_H / 2, 42); scene.add(endWallL);
    var endWallR = new THREE.Mesh(new THREE.PlaneGeometry(1, ROOM_H), matMat(2, 0x55ff88));
    endWallR.position.set(8.5, ROOM_H / 2, 42); scene.add(endWallR);
    var exitPortal = new THREE.Mesh(new THREE.PlaneGeometry(2, ROOM_H - 1),
      new THREE.MeshBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
    exitPortal.position.set(7, ROOM_H / 2, 42); scene.add(exitPortal);
    scene.add(new THREE.PointLight(0x00ff41, 2.0, 10).translateX(7).translateY(3).translateZ(41));

    // Hallway entrance door — blocks hallway until all room 4 agents killed
    var hallDoor = new THREE.Mesh(new THREE.PlaneGeometry(4, ROOM_H),
      new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    hallDoor.position.set(7, ROOM_H / 2, 28); scene.add(hallDoor);
    game.hallDoorMesh = hallDoor;
    game.hallDoorOpen = false;

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
    var furnHits = [];
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

    // Floating gun in glass case — between pills and Exit Hall door
    var floatingGun = new THREE.Group();
    var gunMetal = new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.95 });
    floatingGun.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), gunMetal));
    var gunGrip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.08), gunMetal);
    gunGrip.position.set(0, -0.12, -0.1); floatingGun.add(gunGrip);
    var gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6), gunMetal);
    gunBarrel.rotation.x = Math.PI / 2; gunBarrel.position.set(0, 0, 0.32); floatingGun.add(gunBarrel);
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

    // Agents — suited figures with red glow
    game.agents = [];
    var headMat = new THREE.MeshBasicMaterial({
      color: 0x998877, transparent: true, opacity: 0.95
    });
    var suitMat = new THREE.MeshBasicMaterial({
      map: textures[0].tex, color: 0xff7777,
      transparent: true, opacity: 0.95, side: THREE.DoubleSide
    });
    var suitEdgeMat = new THREE.LineBasicMaterial({ color: 0xff8888, transparent: true, opacity: 0.7 });
    var darkEdgeMat = new THREE.LineBasicMaterial({ color: 0xffaaaa, transparent: true, opacity: 0.9 });
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

      // Suit details — full Agent Smith look
      var suitDark = new THREE.MeshBasicMaterial({ color: 0x443344, transparent: true, opacity: 0.95 });
      var tieMat = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.9 });
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

      // Gun for room 4 agents
      if (asp.room === 4) {
        var gunMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.9 });
        var gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), gunMat);
        gunBody.position.set(0.02, -0.45, 0.15); rightArmPivot.add(gunBody);
        var gunHandle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.04), gunMat);
        gunHandle.position.set(0.02, -0.48, 0.08); rightArmPivot.add(gunHandle);
        var gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), gunMat);
        gunBarrel.rotation.x = Math.PI / 2;
        gunBarrel.position.set(0.02, -0.44, 0.27); rightArmPivot.add(gunBarrel);
        // Muzzle glow
        var muzzle = new THREE.PointLight(0xff4400, 0, 2);
        muzzle.position.set(0.02, -0.44, 0.3); rightArmPivot.add(muzzle);
      }

      scene.add(ag);
      var patrolX = asp.rx + AGENT_MARGIN + Math.random() * (ROOM_SIZE - AGENT_MARGIN * 2);
      var patrolZ = asp.rz + AGENT_MARGIN + Math.random() * (ROOM_SIZE - AGENT_MARGIN * 2);
      game.agents.push({
        group: ag, x: asp.x, z: asp.z,
        minX: asp.rx + AGENT_MARGIN, maxX: asp.rx + ROOM_SIZE - AGENT_MARGIN,
        minZ: asp.rz + AGENT_MARGIN, maxZ: asp.rz + ROOM_SIZE - AGENT_MARGIN,
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
        shootTimer: asp.room === 4 ? (1.5 + Math.random() * 2) : 999,
        hasGun: asp.room === 4,
        dead: false, deathTimer: 0, wpQueue: [], wpAge: 0, stuckTime: 0, lastDistToTarget: 0
      });
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
      { sprite: makeProxLabel("Break glass — collect all keys", 7, 2.0, 10.5, "#00ccff"), x: 7, z: 10.5, range: 3 },
    ];

    // Particles
    var pCnt = game.isMobile ? 50 : 150;
    var pGeo = new THREE.BufferGeometry();
    var pArr = new Float32Array(pCnt * 3);
    for (var pi = 0; pi < pCnt; pi++) {
      var pr = ROOMS[Math.floor(Math.random() * 5)];
      pArr[pi * 3] = pr.x + Math.random() * ROOM_SIZE;
      pArr[pi * 3 + 1] = Math.random() * ROOM_H;
      pArr[pi * 3 + 2] = pr.z + Math.random() * ROOM_SIZE;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pArr, 3));
    var particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x00ff41, size: 0.04, transparent: true, opacity: 0.6 }));
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
      return false;
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
        if (!document.pointerLockElement && renderer.domElement && !game.won && !game.caught) {
          try { renderer.domElement.requestPointerLock(); } catch (err) { /* ok */ }
        }
        // Shoot if player has gun — works with or without pointer lock
        if (game.hasGun && !game.won && !game.caught) {
          playerShoot();
        }
      }
    }
    function playerShoot() {
      if (!game.hasGun || !game.camera || !game.sceneRef) return;
      var cam = game.camera;
      var dir = new THREE.Vector3(0, 0, -1);
      dir.applyQuaternion(cam.quaternion);
      var bMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.95 }));
      // Trail
      var bTrail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.3, 6),
        new THREE.MeshBasicMaterial({ color: 0x00cc33, transparent: true, opacity: 0.5 }));
      bTrail.rotation.x = Math.PI / 2; bTrail.position.z = 0.2; bMesh.add(bTrail);
      bMesh.position.copy(cam.position);
      bMesh.rotation.y = Math.atan2(dir.x, dir.z);
      game.sceneRef.add(bMesh);
      game.playerBullets.push({ mesh: bMesh, dx: dir.x, dy: dir.y, dz: dir.z, life: 3 });
    }
    game.playerShoot = playerShoot;
    function onMU(e) { }
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
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener("resize", onResize);

    var clock = new THREE.Clock();
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
      if (game.won || game.caught) { renderer.render(scene, camera); return; }
      var realDt = Math.min(clock.getDelta(), 0.05);
      var dt = realDt;

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
        var il = Math.sqrt(str * str + fwd * fwd);
        if (il > 1) { str /= il; fwd /= il; }
        var sy = Math.sin(game.yaw), cy = Math.cos(game.yaw);
        var dx = (str * cy - fwd * sy) * sp * dt;
        var dz = (-str * sy - fwd * cy) * sp * dt;
        var nx = camera.position.x + dx;
        var nz = camera.position.z + dz;
        if (!hitWall(nx, camera.position.z)) camera.position.x = nx;
        if (!hitWall(camera.position.x, nz)) camera.position.z = nz;
        camera.quaternion.setFromEuler(new THREE.Euler(game.pitch, game.yaw, 0, "YXZ"));
      }

      // Room detection
      var px = camera.position.x, pz = camera.position.z;
      var rid = whichRoom(px, pz);
      if (rid >= 0) game.currentRoom = rid;
      if (rid >= 0 && rid !== game.lastRoom) {
        game.lastRoom = rid;
        showRoom(ROOMS[rid].name);
        updateGame({ room: ROOMS[rid].name });
      }
      // Hallway label
      if (px >= 5 && px <= 9 && pz >= 28 && pz <= 42 && game.lastRoom !== 99) {
        game.lastRoom = 99;
        game.currentRoom = 4;
        showRoom("Escape Corridor");
      }
      // Break glass case when all 3 keys collected
      var allKeys = game.collected.has("green") && game.collected.has("red") && game.collected.has("blue");
      if (allKeys && game.glassCase && game.glassCase.visible) {
        game.glassCase.visible = false;
        scene.remove(game.glassCase);
        game.glassCase = null;
        // Remove glass case collision
        for (var fhi = furnHits.length - 1; fhi >= 0; fhi--) {
          if (furnHits[fhi].x === 7 && furnHits[fhi].z === 10.5) { furnHits.splice(fhi, 1); break; }
        }
        showRoom("CASE UNLOCKED — GRAB THE GUN");
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
          showRoom("GUN ACQUIRED — EXIT HALL OPEN");
          updateGame({ hasGun: true, doors: { green: true, red: true, blue: true } });
        }
      }
      // Floating gun animation — always spinning
      if (game.gunMesh) {
        game.gunMesh.rotation.y = Date.now() * 0.002;
        game.gunMesh.position.y = 1.3 + Math.sin(Date.now() * 0.003) * 0.15;
      }

      // Hallway door collision (z=28) — blocks until all room 4 agents killed
      if (!game.hallDoorOpen) {
        if (Math.abs(pz - 28) < 0.6 && px >= 5 && px <= 9) {
          camera.position.z = Math.min(camera.position.z, 27.4);
        }
      }

      // Player bullets — hit any agent, cats, or rabbit
      for (var pbi = game.playerBullets.length - 1; pbi >= 0; pbi--) {
        var pb = game.playerBullets[pbi];
        pb.life -= dt;
        pb.mesh.position.x += pb.dx * 12 * dt;
        pb.mesh.position.y += pb.dy * 12 * dt;
        pb.mesh.position.z += pb.dz * 12 * dt;
        var pbHit = false;
        // Hit agents in any room
        for (var bhi = 0; bhi < game.agents.length; bhi++) {
          var bha = game.agents[bhi];
          if (bha.dead) continue;
          var bhDist = Math.sqrt(Math.pow(pb.mesh.position.x - bha.x, 2) + Math.pow(pb.mesh.position.z - bha.z, 2));
          if (bhDist < 0.8 && Math.abs(pb.mesh.position.y - 1.2) < 1.0) {
            bha.dead = true;
            bha.deathTimer = 0;
            if (bha.roomId === 4) game.bossKills++;
            pbHit = true;
            break;
          }
        }
        // Hit cats — animal cruelty!
        if (!pbHit && game.cats) {
          for (var chi = 0; chi < game.cats.length; chi++) {
            var catH = game.cats[chi];
            var catDist = Math.sqrt(Math.pow(pb.mesh.position.x - catH.x, 2) + Math.pow(pb.mesh.position.z - catH.z, 2));
            if (catDist < 0.8 && pb.mesh.position.y < 1.5) {
              game.caught = true;
              updateGame({ caught: true, caughtReason: "cat" });
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
            updateGame({ caught: true, caughtReason: "rabbit" });
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
      if (game.hasGun && room4Left === 0 && !game.hallDoorOpen) {
        game.hallDoorOpen = true;
        if (game.hallDoorMesh) { scene.remove(game.hallDoorMesh); game.hallDoorMesh = null; }
        showRoom("ESCAPE ROUTE OPEN");
      }

      // Win — reach exit portal at end of hallway
      if (pz > 41 && px >= 5 && px <= 9 && game.hallDoorOpen && !game.won) {
        game.won = true;
        updateGame({ won: true, time: Math.floor((Date.now() - game.startTime) / 1000) });
        if (document.pointerLockElement) document.exitPointerLock();
        if (pauseRef.current) pauseRef.current.style.display = "none";
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

          var agentRad = 0.25;
          function agentHits(ax, az) {
            for (var fci = 0; fci < furnHits.length; fci++) {
              var fch = furnHits[fci];
              var ahw = fch.hw - 0.4 + agentRad;
              var ahd = fch.hd - 0.4 + agentRad;
              if (Math.abs(ax - fch.x) < ahw && Math.abs(az - fch.z) < ahd) return fch;
            }
            return null;
          }

          var blocker = agentHits(newAX, newAZ);
          var prevX = agent.x, prevZ = agent.z;

          if (!blocker) {
            agent.x = newAX; agent.z = newAZ;
          } else if (!agentHits(newAX, agent.z)) {
            agent.x = newAX;
          } else if (!agentHits(agent.x, newAZ)) {
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
                if (!agentHits(queue[qi].x, queue[qi].z)) cleanQueue.push(queue[qi]);
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

        agent.group.position.x = agent.x;
        agent.group.position.z = agent.z;
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

      // Agent bullets — room 4 agents shoot at player
      for (var agi2 = 0; agi2 < game.agents.length; agi2++) {
        var ag2 = game.agents[agi2];
        if (!ag2.hasGun) continue;
        var playerInR4 = rid === 4;
        if (playerInR4 && ag2.chasing) {
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
            game.bullets.push({ mesh: bulletMesh, dx: bdx, dz: bdz, life: 5 });
          }
        }
      }

      // Update bullets
      for (var bi = game.bullets.length - 1; bi >= 0; bi--) {
        var bul = game.bullets[bi];
        bul.life -= dt;
        var bSpeed = 4 * dt;
        bul.mesh.position.x += bul.dx * bSpeed;
        bul.mesh.position.z += bul.dz * bSpeed;
        // Player collision
        var bpDist = Math.sqrt(Math.pow(bul.mesh.position.x - px, 2) + Math.pow(bul.mesh.position.z - pz, 2));
        if (bpDist < 0.5) {
          game.caught = true;
          updateGame({ caught: true });
          if (document.pointerLockElement) document.exitPointerLock();
          if (pauseRef.current) pauseRef.current.style.display = "none";
          break;
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
          function catBlocked(cx2, cz2) {
            for (var cfci = 0; cfci < furnHits.length; cfci++) {
              var cfh = furnHits[cfci];
              if (Math.abs(cx2 - cfh.x) < cfh.hw && Math.abs(cz2 - cfh.z) < cfh.hd) return true;
            }
            return false;
          }
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
      var now = Date.now() * 0.001;

      // Floating spoon rotates and bobs
      if (game.spoon) {
        game.spoon.rotation.y = now * 1.5;
        game.spoon.rotation.z = Math.sin(now * 2) * 0.3;
        game.spoon.position.y = 1.5 + Math.sin(now * 1.5) * 0.15;
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
        game.phone.light.intensity = 0.3 + Math.sin(now * 8) * 0.4;
        game.phone.handset.position.y = 0.04 + Math.sin(now * 12) * 0.005;
      }

      // Phone booth light flickers
      if (game.boothLight) {
        game.boothLight.intensity = 0.4 + Math.sin(now * 3) * 0.2;
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
        }
      }

      // Animate keys
      var now = Date.now() * 0.001;
      for (var c = 0; c < KEY_DEFS.length; c++) {
        if (game.collected.has(KEY_DEFS[c].id)) continue;
        var kms = game.keyMeshes[KEY_DEFS[c].id];
        if (kms) {
          kms.mesh.rotation.y = now * 2;
          kms.mesh.position.y = 1.3 + Math.sin(now * 3) * 0.15;
          kms.ring.rotation.z = now * 0.5;
        }
      }

      // Particles
      var parr = particles.geometry.attributes.position.array;
      for (var d = 0; d < pCnt; d++) {
        parr[d * 3 + 1] -= dt * 0.4;
        if (parr[d * 3 + 1] < 0) parr[d * 3 + 1] = ROOM_H;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Matrix textures
      // Matrix textures — slow during Matrix Time
      texTick++;
      var texSpeedMult = game.slowMo ? 0.15 : 1.0;
      if (!game.isMobile || texTick % 4 === 0) {
        for (var e2 = 0; e2 < game.matSurfs.length; e2++) {
          tickMatrixCanvas(game.matSurfs[e2].mc, game.matSurfs[e2].speed * texSpeedMult);
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

      renderer.render(scene, camera);
    }
    gameLoop();

    return function cleanup() {
      cancelAnimationFrame(animId);
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
    setGs(initialState);
    setEntered(false);
  }

  var isMob = (typeof window !== "undefined") && (("ontouchstart" in window) || navigator.maxTouchPoints > 0);
  var font = "'Courier New', monospace";

  var objectives = [
    { text: "Find the Green Key (Office)", done: gs.keys.green },
    { text: "Find the Red Key (Server Room)", done: gs.keys.red },
    { text: "Find the Blue Key (Archive)", done: gs.keys.blue },
    { text: "Grab the gun from the case (Hub)", done: gs.hasGun },
    { text: "Eliminate all agents (Exit Hall)", done: game.hallDoorOpen },
    { text: "Escape through the hallway!", done: gs.won }
  ];
  var curObj = objectives.find(function (o) { return !o.done; }) || objectives[5];

  return (
    <div
      ref={rootRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ width: "100vw", height: "100vh", background: "#000", position: "relative", overflow: "hidden", touchAction: "none", cursor: entered && !gs.won && !gs.caught ? "none" : "default" }}
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
          <p style={{ fontFamily: font, color: "#00aa33", fontSize: "clamp(0.6rem,2.5vw,0.85rem)", opacity: 0.7, marginBottom: 24, textAlign: "center", position: "relative", zIndex: 1 }}>
            Find keys. Unlock doors. Escape.
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
          {gs.caughtReason === "cat" ? (
            <React.Fragment>
              <h1 style={{ fontFamily: font, color: "#ff9900", fontSize: "clamp(1.1rem,4vw,2rem)", textShadow: "0 0 20px #ff6600", letterSpacing: "0.15em", marginBottom: 12, textAlign: "center", position: "relative", zIndex: 1 }}>ANIMAL CRUELTY DETECTED</h1>
              <p style={{ fontFamily: font, color: "#ffcc00", fontSize: "clamp(0.7rem,2.5vw,1rem)", marginBottom: 6, textAlign: "center", position: "relative", zIndex: 1 }}>You shot a cat. A BLACK CAT.</p>
              <p style={{ fontFamily: font, color: "#ff8800", fontSize: "clamp(0.6rem,2vw,0.85rem)", marginBottom: 6, textAlign: "center", position: "relative", zIndex: 1 }}>The Matrix has reported you to PETA.</p>
              <p style={{ fontFamily: font, color: "#ff6600", fontSize: "clamp(0.55rem,1.8vw,0.75rem)", opacity: 0.7, marginBottom: 24, textAlign: "center", position: "relative", zIndex: 1 }}>That cat had 8 lives left, you monster.</p>
            </React.Fragment>
          ) : gs.caughtReason === "rabbit" ? (
            <React.Fragment>
              <h1 style={{ fontFamily: font, color: "#ff9900", fontSize: "clamp(1.1rem,4vw,2rem)", textShadow: "0 0 20px #ff6600", letterSpacing: "0.15em", marginBottom: 12, textAlign: "center", position: "relative", zIndex: 1 }}>ANIMAL CRUELTY DETECTED</h1>
              <p style={{ fontFamily: font, color: "#ffcc00", fontSize: "clamp(0.7rem,2.5vw,1rem)", marginBottom: 6, textAlign: "center", position: "relative", zIndex: 1 }}>You shot the White Rabbit.</p>
              <p style={{ fontFamily: font, color: "#ff8800", fontSize: "clamp(0.6rem,2vw,0.85rem)", marginBottom: 6, textAlign: "center", position: "relative", zIndex: 1 }}>Morpheus is VERY disappointed in you.</p>
              <p style={{ fontFamily: font, color: "#ff6600", fontSize: "clamp(0.55rem,1.8vw,0.75rem)", opacity: 0.7, marginBottom: 24, textAlign: "center", position: "relative", zIndex: 1 }}>You were supposed to FOLLOW it, not SHOOT it.</p>
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
            style={{ fontFamily: font, color: "#000", background: gs.caughtReason ? "#ff9900" : "#ff3333", padding: "12px 32px", fontSize: "clamp(0.8rem,3vw,1rem)", cursor: "pointer", letterSpacing: "0.15em", boxShadow: "0 0 20px " + (gs.caughtReason ? "#ff6600" : "#ff0000"), position: "relative", zIndex: 1 }}>
            {gs.caughtReason ? "I'M SORRY" : "TRY AGAIN"}
          </div>
        </div>
      )}

      {entered && !gs.won && !gs.caught && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: gs.hasGun ? 24 : 20, height: gs.hasGun ? 24 : 20, zIndex: 65, pointerEvents: "none" }}>
          <div style={{ position: "absolute", width: 2, height: "100%", left: "50%", transform: "translateX(-50%)", background: gs.hasGun ? "rgba(255,50,50,0.8)" : "rgba(0,255,65,0.5)" }} />
          <div style={{ position: "absolute", height: 2, width: "100%", top: "50%", transform: "translateY(-50%)", background: gs.hasGun ? "rgba(255,50,50,0.8)" : "rgba(0,255,65,0.5)" }} />
          {gs.hasGun && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 4, height: 4, borderRadius: "50%", background: "rgba(255,50,50,0.6)" }} />}
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
                return (
                  <div key={idx} style={{ fontFamily: font, fontSize: "clamp(0.5rem,1.8vw,0.7rem)", color: o.done ? "#005500" : "#00ff41", padding: "4px 0", textDecoration: o.done ? "line-through" : "none", opacity: o.done ? 0.4 : 1 }}>
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
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Walk near keys — Auto pickup</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Doors open when key found</div>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>WASD / Arrows — Move</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Mouse — Look around</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Shift — Sprint</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Space — Matrix Time (slow-mo)</div>
                  <div style={{ fontFamily: font, fontSize: "clamp(0.45rem,1.6vw,0.65rem)", color: "#00aacc", padding: "3px 0" }}>Click — Lock mouse cursor</div>
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
                defaultValue="1"
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
            onClick={function () { if (game.playerShoot) game.playerShoot(); }}
            onTouchEnd={function (ev) { ev.preventDefault(); ev.stopPropagation(); if (game.playerShoot) game.playerShoot(); }}
            style={{
              fontFamily: font, color: "#ff4444", fontSize: "clamp(0.55rem,2vw,0.75rem)",
              background: gs.hasGun ? "rgba(80,0,0,0.5)" : "rgba(30,30,30,0.3)", border: "1px solid " + (gs.hasGun ? "#cc0000" : "#333333"),
              padding: "8px 14px", cursor: "pointer", letterSpacing: "0.1em",
              userSelect: "none", textAlign: "center", opacity: gs.hasGun ? 1 : 0.3
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
