// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, groundY: 600 };

// The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate.
export const STEP = 1 / 60;

export const BEST_KEY = 'turkey-escape-best';
export const LIVES = 3;
export const WORLD_END = 4000;
export const ESCAPE_X = 3950;

export const TURKEY = {
  width: 56,
  height: 64,
  walkSpeed: 245,
  sprintSpeed: 405,
  jumpSpeed: 620,
  gravity: 1750,
  staminaMax: 100,
  staminaDrain: 26,
  staminaRegenWalk: 20,
  staminaRegenIdle: 30,
  invulnerable: 1.6,
};

export const FARMER = {
  width: 64,
  height: 108,
  patrolSpeed: 125,
  chaseSpeed: 252,
  searchSpeed: 170,
  trickedSpeed: 200,
  sightRange: 560,
  grabRange: 48,
  throwInterval: 3.2,
  throwRange: 520,
  searchTime: 4.0,
  peckTime: 3.0,
  tauntTime: 1.2,
};

export const KNIFE = {
  width: 46,
  height: 14,
  throwSpeed: 520,
  fallSpeed: 330,
  windup: 0.55,
};

// Zones the turkey runs through, in order. Each zone changes the scenery, the hazards and
// the farmer's temper; the progress bar in the HUD is drawn from these.
export const ZONES = [
  { name: 'FARMYARD', from: 0, to: 1300, sky: ['#ffd9a0', '#ff9e5e'], ground: '#a8763e', grass: '#7a9b3f' },
  { name: 'THE BARN', from: 1300, to: 2700, sky: ['#e8b06a', '#c97e3f'], ground: '#8a5a30', grass: '#6d7f33' },
  { name: 'THE KITCHEN', from: 2700, to: 4000, sky: ['#f2c98f', '#d98a4a'], ground: '#9c6b45', grass: '#8a6a3a' },
];

export function zoneAt(x) {
  for (const zone of ZONES) if (x < zone.to) return zone;
  return ZONES[ZONES.length - 1];
}

// Hide spots: hay bales in the yard, crates in the barn, counters in the kitchen.
// Hiding here breaks the farmer's line of sight; he comes to search the spot.
export const HIDES = [
  { x: 350, kind: 'hay' }, { x: 900, kind: 'hay' },
  { x: 1500, kind: 'crate' }, { x: 2100, kind: 'crate' }, { x: 2500, kind: 'crate' },
  { x: 2900, kind: 'counter' }, { x: 3400, kind: 'counter' }, { x: 3800, kind: 'counter' },
];

// Ovens live in the kitchen only. Standing in one's heat ring builds burn; a full burn
// costs a life, so the turkey must hop past or sprint through.
export const OVENS = [{ x: 2950 }, { x: 3350 }, { x: 3700 }];
export const OVEN_HEAT_RADIUS = 95;
export const OVEN_BURN_TIME = 0.9;

// Golden feathers: rare pickups worth 50 points and one extra corn decoy.
export const FEATHERS = [
  { x: 700, y: 520 }, { x: 1800, y: 520 }, { x: 2400, y: 470 },
  { x: 3200, y: 520 }, { x: 3900, y: 470 },
];

export const PALETTE = {
  turkeyBody: '#8a5a2b',
  turkeyWing: '#6e4520',
  turkeyHead: '#c98a4b',
  turkeyBeak: '#e8a13a',
  turkeyWattle: '#c0392b',
  featherFan: ['#b5651d', '#d35400', '#e67e22', '#f39c12', '#a04000'],
  farmerShirt: '#4a6fa5',
  farmerOveralls: '#3b5a8a',
  farmerHat: '#d9c27a',
  farmerSkin: '#e8b88a',
  knifeBlade: '#dfe6ea',
  knifeHandle: '#5d3a1a',
  corn: '#f1c40f',
  heart: '#e74c3c',
  hudBg: 'rgba(40, 22, 8, 0.72)',
  hudText: '#ffe9c4',
  accent: '#ffb347',
};
