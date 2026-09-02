import {
  ROOMS,
  ROOM_SIZE,
  JOY_RADIUS,
  TRINITY_X0,
  TRINITY_X1,
  TRINITY_Z0,
  TRINITY_Z1,
  WALL_SEGS,
  DOOR_DEFS
} from "./constants.js";

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

/**
 * Player collision test against walls, closed doors, furniture, and story gates.
 * state: {
 *   opened: Set of opened door ids,
 *   furnHits: [{ x, z, hw, hd }] collision boxes,
 *   trinityRoomSealed: boolean (Smith has sealed the Trinity room),
 *   finalDoorOpen: boolean (north exit of the Trinity room is open)
 * }
 */
function hitWall(nx, nz, state) {
  for (var i = 0; i < WALL_SEGS.length; i++) {
    var w = WALL_SEGS[i];
    if (w.a === "x") {
      if (Math.abs(nx - w.p) < 0.4 && nz >= w.mn && nz <= w.mx) return true;
    } else {
      if (Math.abs(nz - w.p) < 0.4 && nx >= w.mn && nx <= w.mx) return true;
    }
  }
  for (i = 0; i < DOOR_DEFS.length; i++) {
    var d = DOOR_DEFS[i];
    if (state.opened.has(d.id)) continue;
    if (d.a === "x") {
      if (Math.abs(nx - d.p) < 0.4 && nz >= d.mn && nz <= d.mx) return true;
    } else {
      if (Math.abs(nz - d.p) < 0.4 && nx >= d.mn && nx <= d.mx) return true;
    }
  }
  for (i = 0; i < state.furnHits.length; i++) {
    var fh = state.furnHits[i];
    if (Math.abs(nx - fh.x) < fh.hw && Math.abs(nz - fh.z) < fh.hd) return true;
  }
  if (
    state.trinityRoomSealed &&
    nx >= TRINITY_X0 &&
    nx <= TRINITY_X1 &&
    nz >= TRINITY_Z0 &&
    nz <= TRINITY_Z1
  ) {
    if (Math.abs(nz - TRINITY_Z0) < 0.5) return true;
    if (Math.abs(nz - TRINITY_Z1) < 0.5) return true;
  }
  if (!state.finalDoorOpen && !state.trinityRoomSealed) {
    if (Math.abs(nz - TRINITY_Z1) < 0.45 && nx >= TRINITY_X0 && nx <= 5.25) return true;
    if (Math.abs(nz - TRINITY_Z1) < 0.45 && nx >= 8.75 && nx <= TRINITY_X1) return true;
  }
  return false;
}

export { whichRoom, clampJoy, hitWall };

/** Fraction of the viewport width (from the left) where a touch becomes the movement joystick. */
var MOVE_ZONE_FRAC = 0.42;

function inMoveZone(x, viewportWidth) {
  return x < viewportWidth * MOVE_ZONE_FRAC;
}

/** Frame-rate-independent lerp toward a target; never overshoots. */
function approach(current, target, rate, dt) {
  var f = rate * dt;
  if (f > 1) f = 1;
  return current + (target - current) * f;
}

/**
 * Dynamic resolution scaling: render-scale multipliers stepped through when
 * frame times stay slow (>24ms for 2s -> step down) or fast (<14ms for 10s
 * -> step back up). Mid-range frame times reset both counters, so brief
 * hitches never change the level.
 */
var RES_SCALES = [1, 0.75, 0.6];
var RES_SLOW_FRAME = 0.024;
var RES_FAST_FRAME = 0.014;
var RES_DOWN_AFTER = 2;
var RES_UP_AFTER = 10;

function createResState() {
  return { level: 0, hot: 0, cool: 0 };
}

/** Feed one frame's real dt; returns true when the level changed. */
function updateResState(state, frameDt) {
  if (frameDt > RES_SLOW_FRAME) {
    state.hot += frameDt;
    state.cool = 0;
  } else if (frameDt < RES_FAST_FRAME) {
    state.cool += frameDt;
    state.hot = 0;
  } else {
    state.hot = 0;
    state.cool = 0;
  }
  if (state.hot > RES_DOWN_AFTER && state.level < RES_SCALES.length - 1) {
    state.level++;
    state.hot = 0;
    state.cool = 0;
    return true;
  }
  if (state.cool > RES_UP_AFTER && state.level > 0) {
    state.level--;
    state.hot = 0;
    state.cool = 0;
    return true;
  }
  return false;
}

/**
 * True when the simulation should freeze: desktop mid-game with pointer lock
 * lost (the PAUSED overlay is up). Mobile has no pointer lock, and the win /
 * caught screens are their own states, not a pause.
 */
function isPaused(s) {
  return !s.isMobile && !s.pointerLocked && !s.won && !s.caught;
}

export {
  MOVE_ZONE_FRAC,
  inMoveZone,
  approach,
  RES_SCALES,
  createResState,
  updateResState,
  isPaused
};
