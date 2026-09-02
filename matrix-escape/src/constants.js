var ROOM_H = 7;
var ROOM_SIZE = 14;
var MOVE_SPEED = 3.5;
var SPRINT_MULT = 1.6;
var MOUSE_SENS = 0.009;
var LOOK_RATE = 4.5;
var JOY_RADIUS = 22;
var CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFZ";

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
  { a: "z", p: 0, mn: 0, mx: 5.25 },
  { a: "z", p: 0, mn: 8.75, mx: 14 },
  { a: "x", p: 14, mn: 0, mx: 5.25 },
  { a: "x", p: 14, mn: 8.75, mx: 14 },
  { a: "z", p: 14, mn: 0, mx: 5.25 },
  { a: "z", p: 14, mn: 8.75, mx: 14 },
  { a: "x", p: 0, mn: 0, mx: 5.25 },
  { a: "x", p: 0, mn: 8.75, mx: 14 },
  { a: "z", p: 0, mn: 14, mx: 28 },
  { a: "x", p: 28, mn: 0, mx: 14 },
  { a: "z", p: 14, mn: 14, mx: 28 },
  { a: "z", p: -14, mn: 0, mx: 14 },
  { a: "x", p: 14, mn: -14, mx: 0 },
  { a: "x", p: 0, mn: -14, mx: 0 },
  { a: "z", p: 0, mn: -14, mx: 0 },
  { a: "z", p: 14, mn: -14, mx: 0 },
  { a: "x", p: -14, mn: 0, mx: 14 },
  { a: "x", p: 14, mn: 14, mx: 28 },
  { a: "z", p: 28, mn: 0, mx: 5 },
  { a: "z", p: 28, mn: 9, mx: 14 },
  { a: "x", p: 0, mn: 14, mx: 28 },
  // Escape hallway walls (narrow, z=28–42)
  { a: "x", p: 5, mn: 28, mx: 42 },
  { a: "x", p: 9, mn: 28, mx: 42 },
  { a: "z", p: 42, mn: TRINITY_X0, mx: 5 },
  { a: "z", p: 42, mn: 9, mx: TRINITY_X1 },
  { a: "x", p: TRINITY_X0, mn: TRINITY_Z0, mx: TRINITY_Z1 },
  { a: "x", p: TRINITY_X1, mn: TRINITY_Z0, mx: TRINITY_Z1 }
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
  { x: 7, z: 7, w: 2.5, d: 1.2, h: 1 },
  { x: 3, z: 3, w: 1, d: 0.5, h: 2.5 },
  { x: 11, z: 11, w: 1, d: 0.5, h: 2.5 },
  // Office - desks with monitors on top
  { x: 19, z: 3, w: 3, d: 1.5, h: 0.8 },
  { x: 19, z: 11, w: 3, d: 1.5, h: 0.8 },
  { x: 17, z: 3, w: 0.05, d: 0.05, h: 0.55, yo: 0.5 },
  { x: 17, z: 11, w: 0.05, d: 0.05, h: 0.55, yo: 0.5 },
  { x: 19, z: 3, w: 0.7, d: 0.15, h: 0.55, yo: 0.8 },
  { x: 19, z: 11, w: 0.7, d: 0.15, h: 0.55, yo: 0.8 },
  { x: 26, z: 7, w: 0.5, d: 3, h: 2 },
  // Server Room - server racks, desk with monitor
  { x: 3, z: -4, w: 1, d: 3, h: 3 },
  { x: 7, z: -4, w: 1, d: 3, h: 3 },
  { x: 11, z: -4, w: 1, d: 3, h: 3 },
  { x: 7, z: -11, w: 2, d: 1, h: 0.8 },
  { x: 7, z: -11, w: 0.7, d: 0.15, h: 0.5, yo: 0.8 },
  // Archive - filing cabinets, shelves
  { x: -3, z: 3, w: 0.8, d: 0.5, h: 1.8 },
  { x: -3, z: 5, w: 0.8, d: 0.5, h: 1.8 },
  { x: -3, z: 7, w: 0.8, d: 0.5, h: 1.8 },
  { x: -3, z: 9, w: 0.8, d: 0.5, h: 1.8 },
  { x: -10, z: 7, w: 0.5, d: 4, h: 2.2 },
  { x: -10, z: 3, w: 0.5, d: 2, h: 2.2 },
  // Exit - terminal
  { x: 7, z: 21, w: 1.5, d: 1, h: 1.2 }
];

var CHAIRS = [
  { x: 17, z: 3 },
  { x: 17, z: 11 },
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
  {
    x: 3.2,
    z: 47,
    rx: TRINITY_X0,
    rz: TRINITY_Z0,
    rw: TRINITY_RW,
    rd: TRINITY_RD,
    speed: 1.35,
    room: 5
  },
  {
    x: 10.5,
    z: 51,
    rx: TRINITY_X0,
    rz: TRINITY_Z0,
    rw: TRINITY_RW,
    rd: TRINITY_RD,
    speed: 1.35,
    room: 5
  },
  {
    x: 7,
    z: 44.5,
    rx: TRINITY_X0,
    rz: TRINITY_Z0,
    rw: TRINITY_RW,
    rd: TRINITY_RD,
    speed: 1.4,
    room: 5
  },
  {
    x: 2.8,
    z: 56,
    rx: TRINITY_X0,
    rz: TRINITY_Z0,
    rw: TRINITY_RW,
    rd: TRINITY_RD,
    speed: 1.3,
    room: 5
  },
  {
    x: 11.2,
    z: 57,
    rx: TRINITY_X0,
    rz: TRINITY_Z0,
    rw: TRINITY_RW,
    rd: TRINITY_RD,
    speed: 1.35,
    room: 5
  },
  {
    x: 5.5,
    z: 49,
    rx: TRINITY_X0,
    rz: TRINITY_Z0,
    rw: TRINITY_RW,
    rd: TRINITY_RD,
    speed: 1.25,
    room: 5
  },
  {
    x: 8.8,
    z: 59,
    rx: TRINITY_X0,
    rz: TRINITY_Z0,
    rw: TRINITY_RW,
    rd: TRINITY_RD,
    speed: 1.3,
    room: 5
  },
  {
    x: 10,
    z: 45,
    rx: TRINITY_X0,
    rz: TRINITY_Z0,
    rw: TRINITY_RW,
    rd: TRINITY_RD,
    speed: 1.35,
    room: 5
  }
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
  "You look like a beta test."
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
  "HR never returns my calls."
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
  "*stares at nothing*"
];
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

export {
  ROOM_H,
  ROOM_SIZE,
  MOVE_SPEED,
  SPRINT_MULT,
  MOUSE_SENS,
  LOOK_RATE,
  JOY_RADIUS,
  CHARS,
  COLOR_MAP,
  COLOR_CSS,
  ROOMS,
  TRINITY_X0,
  TRINITY_X1,
  TRINITY_Z0,
  TRINITY_Z1,
  TRINITY_RW,
  TRINITY_RD,
  TRINITY_HALL_Z0,
  TRINITY_HALL_LEN,
  TRINITY_HALL_ZC,
  TRINITY_ENTRY_Z,
  TRINITY_DOORWAY_X0,
  TRINITY_DOORWAY_X1,
  TRINITY_EXIT_DOOR_X,
  TRINITY_EXIT_DOOR_Z,
  TRINITY_BETRAYAL_MORPHEUS_Z_FAR,
  TRINITY_BETRAYAL_MORPHEUS_Z_NEAR,
  MORPHEUS_BETRAYAL_SPAWN_Z,
  MORPHEUS_BETRAYAL_WALK_MAX_Z,
  MORPHEUS_BETRAYAL_STOP_DIST,
  SMITH_EXIT_ENTER_Z,
  SMITH_EXIT_STOP_Z,
  SMITH_EXIT_WALK_SPEED,
  EXIT_HALL_CASE_X,
  EXIT_HALL_CASE_Z,
  MG_FIRE_INTERVAL,
  AGENT_HP,
  PLAYER_HP_MAX,
  PLAYER_BULLET_DAMAGE,
  PLAYER_SMITH_PUNCH_DAMAGE,
  PLAYER_HP_REGEN_PER_SEC,
  PLAYER_HP_REGEN_DELAY,
  WALL_SEGS,
  DOOR_DEFS,
  KEY_DEFS,
  FURNITURE,
  CHAIRS,
  AGENT_SPAWNS,
  AGENT_CATCH_DIST,
  AGENT_MARGIN,
  CHASE_QUOTES,
  IDLE_QUOTES,
  CAT_QUOTES,
  SMITH_SPEECH_LINES,
  SMITH_DEFEAT_QUIP
};
