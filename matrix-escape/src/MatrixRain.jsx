import React, { useRef, useEffect } from "react";

var RAIN_CHARS = "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFZ";
function MatrixRain({ color }) {
  var canvasRef = useRef(null);
  useEffect(
    function () {
      var cv = canvasRef.current;
      if (!cv) return;
      var ctx = cv.getContext("2d", { alpha: true, desynchronized: true });
      var parent = cv.parentElement;
      var lowFi =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        (typeof window.matchMedia === "function" &&
          window.matchMedia("(max-width: 768px)").matches);
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
        var bw = Math.max(32, Math.floor(parent.clientWidth * dpr * (lowFi ? 0.7 : 1)));
        var bh = Math.max(32, Math.floor(parent.clientHeight * dpr * (lowFi ? 0.7 : 1)));
        w = bw;
        h = bh;
        cv.width = bw;
        cv.height = bh;
        cols = Math.floor(w / colW);
        drops.length = 0;
        for (var i = 0; i < cols; i++) drops.push((Math.random() * h) / colW);
      }
      layout();
      var onResize = function () {
        layout();
      };
      window.addEventListener("resize", onResize);
      function draw() {
        animId = requestAnimationFrame(draw);
        if (lowFi && ++frameSkip & 1) return;
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
    },
    [color]
  );
  return React.createElement("canvas", {
    ref: canvasRef,
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 0,
      imageRendering: "auto"
    }
  });
}

export default MatrixRain;
