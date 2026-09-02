import * as THREE from "three";
import { CHARS } from "./constants.js";

function makeSpeechBubble() {
  var cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 168;
  var ctx = cv.getContext("2d");
  var tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  var spMat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false
  });
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
    ctx.fillStyle =
      Math.random() > 0.6 ? "#eeffee" : "rgb(0," + g + "," + Math.floor(Math.random() * 40) + ")";
    ctx.fillText(ch, x, y);
    if (y > h && Math.random() > 0.975) m.drops[i] = 0;
    m.drops[i] += speed;
  }
}

export { makeSpeechBubble, updateBubbleText, makeMatrixCanvas, tickMatrixCanvas };
