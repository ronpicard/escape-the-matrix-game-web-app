import { describe, it, expect } from "vitest";
import {
  whichRoom,
  clampJoy,
  hitWall,
  inMoveZone,
  approach,
  createResState,
  updateResState,
  RES_SCALES,
  MOVE_ZONE_FRAC,
  isPaused
} from "./logic.js";
import { JOY_RADIUS, TRINITY_X0, TRINITY_X1, TRINITY_Z0, TRINITY_Z1 } from "./constants.js";

describe("whichRoom", function () {
  it("maps a point inside each defined room to that room's id", function () {
    expect(whichRoom(7, 7)).toBe(0); // Hub
    expect(whichRoom(21, 7)).toBe(1); // Office
    expect(whichRoom(7, -7)).toBe(2); // Server Room
    expect(whichRoom(-7, 7)).toBe(3); // Archive
    expect(whichRoom(7, 21)).toBe(4); // Exit Hall
  });

  it("maps points inside the Trinity room to id 5", function () {
    expect(whichRoom(7, 56)).toBe(5);
    expect(whichRoom(TRINITY_X0, TRINITY_Z0)).toBe(5);
    expect(whichRoom(TRINITY_X1, TRINITY_Z1)).toBe(5);
  });

  it("returns -1 for the escape hallway and points outside all rooms", function () {
    expect(whichRoom(7, 35)).toBe(-1); // narrow hallway between Exit Hall and Trinity room
    expect(whichRoom(100, 100)).toBe(-1);
    expect(whichRoom(-20, -20)).toBe(-1);
  });

  it("resolves shared room edges to the first room in declaration order", function () {
    // x=14 is the Hub/Office boundary; Hub is declared first and bounds are inclusive.
    expect(whichRoom(14, 7)).toBe(0);
    // z=0 is the Hub/Server Room boundary; Hub is declared first.
    expect(whichRoom(7, 0)).toBe(0);
  });
});

describe("clampJoy", function () {
  it("returns the input unchanged when within the joystick radius", function () {
    expect(clampJoy(3, 4)).toEqual({ x: 3, y: 4 });
    expect(clampJoy(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("returns the input unchanged when exactly at the radius", function () {
    expect(clampJoy(JOY_RADIUS, 0)).toEqual({ x: JOY_RADIUS, y: 0 });
  });

  it("clamps magnitude to the radius while preserving direction", function () {
    var r = clampJoy(30, 40); // magnitude 50
    var mag = Math.sqrt(r.x * r.x + r.y * r.y);
    expect(mag).toBeCloseTo(JOY_RADIUS, 6);
    expect(r.y / r.x).toBeCloseTo(40 / 30, 6);
  });

  it("clamps negative components the same way", function () {
    var r = clampJoy(-30, -40);
    var mag = Math.sqrt(r.x * r.x + r.y * r.y);
    expect(mag).toBeCloseTo(JOY_RADIUS, 6);
    expect(r.x).toBeLessThan(0);
    expect(r.y).toBeLessThan(0);
  });
});

describe("hitWall", function () {
  function state(overrides) {
    return Object.assign(
      { opened: new Set(), furnHits: [], trinityRoomSealed: false, finalDoorOpen: false },
      overrides
    );
  }

  it("allows movement in open floor space", function () {
    expect(hitWall(7, 7, state())).toBe(false);
    expect(hitWall(21, 7, state())).toBe(false);
  });

  it("blocks movement into a wall segment", function () {
    // x=3 on the Hub's south wall (z=0, span 0–5.25)
    expect(hitWall(3, 0.2, state())).toBe(true);
    // approach from either side of the wall plane
    expect(hitWall(3, -0.2, state())).toBe(true);
  });

  it("blocks a closed door and lets an opened one through", function () {
    // The green door sits in the Hub's south wall gap at x=7, z=0.
    expect(hitWall(7, 0.2, state())).toBe(true);
    expect(hitWall(7, 0.2, state({ opened: new Set(["green"]) }))).toBe(false);
  });

  it("blocks furniture collision boxes", function () {
    var s = state({ furnHits: [{ x: 7, z: 7, hw: 1.5, hd: 1 }] });
    expect(hitWall(7.5, 7, s)).toBe(true);
    expect(hitWall(9, 7, s)).toBe(false);
  });

  it("seals the Trinity room's north and south thresholds when Smith seals it", function () {
    var southEdge = TRINITY_Z0 + 0.3;
    var northEdge = TRINITY_Z1 - 0.3;
    expect(hitWall(7, southEdge, state({ trinityRoomSealed: true }))).toBe(true);
    expect(hitWall(7, northEdge, state({ trinityRoomSealed: true }))).toBe(true);
    expect(hitWall(7, southEdge, state())).toBe(false);
  });

  it("blocks the sides of the final exit until the door opens, leaving the doorway gap", function () {
    var nearExit = TRINITY_Z1 - 0.3;
    // Beside the doorway: blocked while closed, free once open.
    expect(hitWall(2, nearExit, state())).toBe(true);
    expect(hitWall(12, nearExit, state())).toBe(true);
    expect(hitWall(2, nearExit, state({ finalDoorOpen: true }))).toBe(false);
    // The doorway gap (x 5.25–8.75) is never blocked by this gate.
    expect(hitWall(7, nearExit, state())).toBe(false);
  });
});

describe("inMoveZone", function () {
  it("treats touches on the left fraction of the screen as movement", function () {
    expect(inMoveZone(0, 1000)).toBe(true);
    expect(inMoveZone(MOVE_ZONE_FRAC * 1000 - 1, 1000)).toBe(true);
  });

  it("treats touches right of the zone as camera look", function () {
    expect(inMoveZone(MOVE_ZONE_FRAC * 1000 + 1, 1000)).toBe(false);
    expect(inMoveZone(999, 1000)).toBe(false);
  });
});

describe("approach", function () {
  it("moves a fraction rate*dt toward the target", function () {
    expect(approach(0, 1, 10, 0.05)).toBeCloseTo(0.5, 6);
    expect(approach(2, 4, 5, 0.1)).toBeCloseTo(3, 6);
  });

  it("never overshoots the target", function () {
    expect(approach(0, 1, 10, 1)).toBe(1);
    expect(approach(1, 0, 100, 5)).toBe(0);
  });

  it("holds steady when already at the target", function () {
    expect(approach(5, 5, 10, 0.016)).toBe(5);
  });
});

describe("isPaused", function () {
  it("pauses on desktop when pointer lock is lost mid-game", function () {
    expect(isPaused({ isMobile: false, pointerLocked: false, won: false, caught: false })).toBe(
      true
    );
  });

  it("runs while pointer lock is held", function () {
    expect(isPaused({ isMobile: false, pointerLocked: true, won: false, caught: false })).toBe(
      false
    );
  });

  it("never pauses on mobile (no pointer lock there)", function () {
    expect(isPaused({ isMobile: true, pointerLocked: false, won: false, caught: false })).toBe(
      false
    );
  });

  it("does not pause over the win or caught screens", function () {
    expect(isPaused({ isMobile: false, pointerLocked: false, won: true, caught: false })).toBe(
      false
    );
    expect(isPaused({ isMobile: false, pointerLocked: false, won: false, caught: true })).toBe(
      false
    );
  });
});

describe("dynamic resolution state", function () {
  function feed(state, frameDt, seconds) {
    var changed = false;
    for (var t = 0; t < seconds; t += frameDt) {
      if (updateResState(state, frameDt)) changed = true;
    }
    return changed;
  }

  it("starts at full resolution", function () {
    expect(createResState().level).toBe(0);
    expect(RES_SCALES[0]).toBe(1);
  });

  it("steps down after sustained slow frames", function () {
    var s = createResState();
    expect(feed(s, 0.033, 3)).toBe(true);
    expect(s.level).toBe(1);
    expect(RES_SCALES[s.level]).toBeLessThan(1);
  });

  it("does not react to a brief hitch", function () {
    var s = createResState();
    feed(s, 0.033, 0.5); // half a second of jank
    feed(s, 0.016, 1); // then smooth again
    expect(s.level).toBe(0);
  });

  it("steps back up after a long stretch of fast frames", function () {
    var s = createResState();
    feed(s, 0.033, 3);
    expect(s.level).toBe(1);
    expect(feed(s, 0.01, 12)).toBe(true);
    expect(s.level).toBe(0);
  });

  it("never steps below the lowest scale", function () {
    var s = createResState();
    feed(s, 0.05, 30);
    expect(s.level).toBe(RES_SCALES.length - 1);
  });

  it("ignores mid-range frame times", function () {
    var s = createResState();
    feed(s, 0.018, 20);
    expect(s.level).toBe(0);
  });
});
