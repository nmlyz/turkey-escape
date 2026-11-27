// The simulation: the turkey, the farmer, knives, ovens, corn and feathers, and the
// score. No drawing happens here; the renderer reads this state and paints it.
import {
  ESCAPE_X, FARMER, FEATHERS, FIELD, HIDES, KNIFE, LIVES, OVEN_BURN_TIME,
  OVEN_HEAT_RADIUS, OVENS, STEP, TURKEY, WORLD_END, zoneAt,
} from './config.js';
import { randomInt } from './random.js';
import { createFarmer, stepFarmer } from './farmer.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_PICKUP = 8;
export const EVENT_SPOTTED = 16;
export const EVENT_TRICK = 32;
export const EVENT_THROW = 64;
export const EVENT_HIDE = 128;
export const EVENT_BURN = 256;

const CORN_COUNT = 42;

/** A fresh world for one run. Corn is scattered by the seeded random. */
export function createWorld(random) {
  const corns = [];
  for (let i = 0; i < CORN_COUNT; i += 1) {
    corns.push({
      x: 180 + random() * (WORLD_END - 360),
      y: FIELD.groundY - 14 - random() * 90,
      taken: false,
    });
  }
  const feathers = FEATHERS.map((f) => ({ ...f, taken: false }));
  return {
    random,
    time: 0,
    status: 'title',
    result: null,
    // Grace at the start of a run: the farmer waits at the farmhouse door while
    // the turkey gets a head start, so the game never opens with an instant grab.
    grace: 2.5,
    turkey: {
      x: 120, y: FIELD.groundY, vx: 0, vy: 0, dir: 1,
      onGround: true, hidden: false, hideSpot: null,
      stamina: TURKEY.staminaMax, lives: LIVES, invul: 0,
      score: 0, distance: 0, corn: 0, tricks: 0, decoys: 3, burn: 0,
    },
    farmer: createFarmer(-260),
    knives: [],
    corns,
    feathers,
    decoys: [],
    fallTimer: 3,
    toasts: [],
    best: 0,
  };
}

export function resetWorld(world) {
  const fresh = createWorld(world.random);
  Object.keys(fresh).forEach((key) => { world[key] = fresh[key]; });
  world.status = 'title';
}

function addToast(world, text, color) {
  // The same message twice in a row would smear over itself; refresh it instead.
  const existing = world.toasts.find((t) => t.text === text);
  if (existing) {
    existing.time = 0;
    return;
  }
  world.toasts.push({ text, color: color ?? '#ffe9c4', time: 0 });
  if (world.toasts.length > 3) world.toasts.shift();
}

function hurtTurkey(world, cause) {
  const turkey = world.turkey;
  if (turkey.invul > 0 || turkey.hidden) return 0;
  turkey.lives -= 1;
  turkey.invul = TURKEY.invulnerable;
  turkey.vx = 0;
  turkey.x = Math.min(WORLD_END - 60, turkey.x + 70);
  turkey.burn = 0;
  addToast(world, cause === 'burn' ? 'BURNED BY THE OVEN!' : 'OUCH!', '#ff8a7a');
  if (turkey.lives <= 0) {
    world.status = 'over';
    world.result = 'caught';
    return EVENT_HIT | EVENT_OVER;
  }
  return EVENT_HIT;
}

function nearestHide(turkey) {
  let best = null;
  let bestDist = 85;
  for (const hide of HIDES) {
    const d = Math.abs(hide.x - turkey.x);
    if (d < bestDist) { best = hide; bestDist = d; }
  }
  return best;
}

/**
 * Advance the world one fixed step. `input` holds held keys and one-shot actions
 * (jump, hide, decoy) already consumed as edges by the caller. Returns an event
 * bitmask for sounds and screen changes.
 */
export function stepWorld(world, input, dt) {
  const turkey = world.turkey;
  const farmer = world.farmer;
  let events = 0;
  world.time += dt;

  for (const toast of world.toasts) toast.time += dt;
  world.toasts = world.toasts.filter((t) => t.time < 2.2);
  if (turkey.invul > 0) turkey.invul -= dt;

  // --- hiding: step into a hay bale, crate or counter and the farmer loses sight.
  if (input.hide) {
    if (turkey.hidden) {
      turkey.hidden = false;
      turkey.hideSpot = null;
    } else {
      const spot = nearestHide(turkey);
      if (spot && turkey.onGround) {
        turkey.hidden = true;
        turkey.hideSpot = spot;
        turkey.x = spot.x;
        events |= EVENT_HIDE;
      }
    }
  }
  if (turkey.hidden && (input.left || input.right || input.jump)) {
    turkey.hidden = false;
    turkey.hideSpot = null;
  }

  // --- turkey movement: walk, sprint on stamina, jump.
  if (!turkey.hidden) {
    const sprinting = input.sprint && turkey.stamina > 1 && (input.left || input.right);
    const speed = sprinting ? TURKEY.sprintSpeed : TURKEY.walkSpeed;
    let move = 0;
    if (input.left) move -= 1;
    if (input.right) move += 1;
    turkey.vx = move * speed;
    if (move !== 0) turkey.dir = move;
    turkey.x = Math.max(30, Math.min(WORLD_END - 30, turkey.x + turkey.vx * dt));
    if (sprinting) {
      turkey.stamina = Math.max(0, turkey.stamina - TURKEY.staminaDrain * dt);
    } else if (move === 0) {
      turkey.stamina = Math.min(TURKEY.staminaMax, turkey.stamina + TURKEY.staminaRegenIdle * dt);
    } else {
      turkey.stamina = Math.min(TURKEY.staminaMax, turkey.stamina + TURKEY.staminaRegenWalk * dt);
    }
    if (input.jump && turkey.onGround) {
      turkey.vy = -TURKEY.jumpSpeed;
      turkey.onGround = false;
    }
    turkey.vy += TURKEY.gravity * dt;
    turkey.y += turkey.vy * dt;
    if (turkey.y >= FIELD.groundY) {
      turkey.y = FIELD.groundY;
      turkey.vy = 0;
      turkey.onGround = true;
    }
  }

  // --- decoy: drop a corn decoy; the farmer walks over and pecks it.
  if (input.decoy && turkey.decoys > 0 && !turkey.hidden) {
    turkey.decoys -= 1;
    world.decoys.push({ x: turkey.x, y: FIELD.groundY, time: 0 });
    addToast(world, 'DECOY DROPPED!', '#ffd76a');
  }

  // --- farmer: his step may spot the turkey, throw a knife or grab him.
  // During the opening grace he waits at the farmhouse door.
  if (world.grace > 0) world.grace -= dt;
  const decoy = world.decoys[0] ?? null;
  const farmerEvent = world.grace > 0 ? null : stepFarmer(farmer, turkey, decoy, dt);
  if (farmerEvent) {
    if (farmerEvent.type === 'spotted') events |= EVENT_SPOTTED;
    if (farmerEvent.type === 'windup') events |= EVENT_THROW;
    if (farmerEvent.type === 'throw') {
      world.knives.push({
        x: farmer.x + farmer.dir * 30, y: farmer.y - 72,
        vx: farmer.dir * KNIFE.throwSpeed, vy: -60, kind: 'thrown', spin: 0,
      });
    }
    if (farmerEvent.type === 'decoyEaten') {
      world.decoys.shift();
      turkey.score += 25;
      turkey.tricks += 1;
      addToast(world, 'OUTWITTED! +25', '#ffd76a');
      events |= EVENT_TRICK;
    }
    if (farmerEvent.type === 'grab') {
      events |= hurtTurkey(world, 'grab');
      if (world.status === 'over') return events;
    }
  }

  // --- kitchen: knives rain from the ceiling racks over the turkey.
  if (zoneAt(turkey.x).name === 'THE KITCHEN') {
    world.fallTimer -= dt;
    if (world.fallTimer <= 0) {
      world.fallTimer = 1.1 + world.random() * 0.9;
      world.knives.push({
        x: turkey.x + (world.random() * 320 - 160), y: -30,
        vx: 0, vy: KNIFE.fallSpeed, kind: 'falling', spin: 0,
      });
    }
  }

  // --- knives fly, spin and hit.
  for (const knife of world.knives) {
    knife.x += knife.vx * dt;
    knife.y += knife.vy * dt;
    if (knife.kind === 'thrown') knife.vy += 500 * dt;
    knife.spin += dt * 14;
    const hitX = Math.abs(knife.x - turkey.x) < (KNIFE.width + TURKEY.width) / 2;
    const hitY = knife.y > turkey.y - TURKEY.height && knife.y < turkey.y + 6;
    if (hitX && hitY) {
      knife.dead = true;
      events |= hurtTurkey(world, 'knife');
      if (world.status === 'over') return events;
    }
    if (knife.y > FIELD.groundY + 40 || knife.x < -80 || knife.x > WORLD_END + 80) knife.dead = true;
  }
  world.knives = world.knives.filter((k) => !k.dead);

  // --- ovens: heat builds while the turkey stands in the ring.
  let inHeat = false;
  for (const oven of OVENS) {
    if (Math.abs(turkey.x - oven.x) < OVEN_HEAT_RADIUS && turkey.onGround && !turkey.hidden) {
      inHeat = true;
      break;
    }
  }
  if (inHeat) {
    turkey.burn += dt;
    if (turkey.burn >= OVEN_BURN_TIME) {
      events |= EVENT_BURN;
      events |= hurtTurkey(world, 'burn');
      if (world.status === 'over') return events;
    }
  } else {
    turkey.burn = Math.max(0, turkey.burn - dt * 2);
  }

  // --- pickups: corn for points, feathers for points and a decoy.
  for (const corn of world.corns) {
    if (!corn.taken && Math.abs(corn.x - turkey.x) < 42 && Math.abs(corn.y - (turkey.y - 34)) < 48) {
      corn.taken = true;
      turkey.corn += 1;
      turkey.score += 10;
      events |= EVENT_PICKUP;
    }
  }
  for (const feather of world.feathers) {
    if (!feather.taken && Math.abs(feather.x - turkey.x) < 46 && Math.abs(feather.y - (turkey.y - 34)) < 52) {
      feather.taken = true;
      turkey.score += 50;
      turkey.decoys += 1;
      addToast(world, 'GOLDEN FEATHER! +50, +1 DECOY', '#ffd76a');
      events |= EVENT_PICKUP;
    }
  }

  // --- distance score and the escape.
  const metres = Math.max(0, Math.floor((turkey.x - 120) / 10));
  if (metres > turkey.distance) {
    turkey.score += metres - turkey.distance;
    turkey.distance = metres;
  }
  if (turkey.x >= ESCAPE_X) {
    turkey.score += 200;
    world.status = 'over';
    world.result = 'escaped';
    return events | EVENT_ESCAPED | EVENT_OVER;
  }
  return events;
}

/** Distance left to the woods, in metres, for the HUD progress bar. */
export function distanceLeft(world) {
  return Math.max(0, Math.floor((ESCAPE_X - world.turkey.x) / 10));
}
