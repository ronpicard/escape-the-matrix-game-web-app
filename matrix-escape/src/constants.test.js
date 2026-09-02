import { describe, it, expect } from "vitest";
import { whichRoom } from "./logic.js";
import {
  ROOMS,
  ROOM_SIZE,
  TRINITY_X0,
  TRINITY_X1,
  TRINITY_Z0,
  TRINITY_Z1,
  WALL_SEGS,
  DOOR_DEFS,
  KEY_DEFS,
  COLOR_MAP,
  COLOR_CSS,
  AGENT_SPAWNS,
  PLAYER_HP_MAX,
  PLAYER_SMITH_PUNCH_DAMAGE
} from "./constants.js";

describe("level data consistency", function () {
  it("uses the same color ids across doors, keys, and color tables", function () {
    var doorIds = DOOR_DEFS.map(function (d) {
      return d.id;
    }).sort();
    var keyIds = KEY_DEFS.map(function (k) {
      return k.id;
    }).sort();
    expect(doorIds).toEqual(keyIds);
    expect(doorIds).toEqual(Object.keys(COLOR_MAP).sort());
    expect(doorIds).toEqual(Object.keys(COLOR_CSS).sort());
  });

  it("places every key in a defined room", function () {
    KEY_DEFS.forEach(function (k) {
      var room = ROOMS.find(function (r) {
        return r.x === k.rx && r.z === k.rz;
      });
      expect(room, "key " + k.id + " at (" + k.rx + "," + k.rz + ")").toBeDefined();
    });
  });

  it("gives rooms unique ids matching their array index", function () {
    ROOMS.forEach(function (r, i) {
      expect(r.id).toBe(i);
    });
  });

  it("spawns every agent inside its assigned room", function () {
    AGENT_SPAWNS.forEach(function (s) {
      expect(whichRoom(s.x, s.z), "agent at (" + s.x + "," + s.z + ")").toBe(s.room);
    });
  });

  it("spawns every agent inside its patrol bounds", function () {
    AGENT_SPAWNS.forEach(function (s) {
      var w = s.rw != null ? s.rw : ROOM_SIZE;
      var d = s.rd != null ? s.rd : ROOM_SIZE;
      expect(s.x).toBeGreaterThanOrEqual(s.rx);
      expect(s.x).toBeLessThanOrEqual(s.rx + w);
      expect(s.z).toBeGreaterThanOrEqual(s.rz);
      expect(s.z).toBeLessThanOrEqual(s.rz + d);
    });
  });

  it("leaves a gap in the walls for every door", function () {
    DOOR_DEFS.forEach(function (door) {
      var blocking = WALL_SEGS.filter(function (seg) {
        return seg.a === door.a && seg.p === door.p && seg.mn < door.mx && seg.mx > door.mn;
      });
      expect(blocking, "door " + door.id + " is walled over").toEqual([]);
    });
  });

  it("keeps the Trinity room aligned with the escape hallway doorway", function () {
    // The hallway (x 5–9) must open into the Trinity room's south wall gap.
    expect(TRINITY_X0).toBeLessThan(5);
    expect(TRINITY_X1).toBeGreaterThan(9);
    expect(TRINITY_Z1).toBeGreaterThan(TRINITY_Z0);
  });
});

describe("combat constants", function () {
  it("lets Smith defeat a full-health player in exactly five punches", function () {
    expect(PLAYER_SMITH_PUNCH_DAMAGE * 5).toBe(PLAYER_HP_MAX);
  });
});
