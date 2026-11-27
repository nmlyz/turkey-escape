// The screenshot scenes behind ?shot=start|play|kitchen|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (run right, jump low knives, sprint when the farmer closes in, hide or drop
// a decoy when cornered, chase the nearest corn), so the frame is what a real game
// looks like and the same seed always gives the same frame.
import { FIELD, HIDES, OVENS, STEP, TURKEY } from './config.js';
import { stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 3;
const PLAY_SECONDS = 7;
const KITCHEN_SECONDS = 4;
const END_LIMIT_SECONDS = 120;

/** A knife that will reach the turkey's height band soon, if he keeps running. */
function incomingKnife(state) {
  for (const knife of state.knives) {
    if (knife.kind === 'thrown' && knife.vx < 0 && knife.x > state.turkey.x
      && knife.x - state.turkey.x < 320 && knife.y > state.turkey.y - TURKEY.height - 30) {
      return knife;
    }
    if (knife.kind === 'falling' && knife.y < state.turkey.y - 40
      && Math.abs(knife.x - state.turkey.x) < 70) {
      return knife;
    }
  }
  return null;
}

/** The nearest hide spot ahead, if one is close enough to duck into. */
function nearHide(state) {
  let best = null;
  let bestDist = 130;
  for (const hide of HIDES) {
    const d = hide.x - state.turkey.x;
    if (d >= -20 && d < bestDist) { best = hide; bestDist = d; }
  }
  return best;
}

function nearestCorn(state) {
  let best = null;
  let bestDist = Infinity;
  for (const corn of state.corns) {
    if (corn.taken) continue;
    const d = Math.abs(corn.x - state.turkey.x);
    if (d < bestDist && corn.x > state.turkey.x - 40) { best = corn; bestDist = d; }
  }
  return best;
}

/** Steer one step: returns the input the world step takes. */
function autopilot(state, stroll) {
  const turkey = state.turkey;
  const farmer = state.farmer;
  const input = { left: false, right: false, sprint: false, jump: false, hide: false, decoy: false };
  const gap = farmer.x - turkey.x;
  const knife = incomingKnife(state);

  if (turkey.hidden) {
    // Slip out once the farmer has wandered off to search elsewhere.
    if (farmer.state !== 'chase' && Math.abs(gap) > 260) input.hide = true;
    return input;
  }
  // Cornered: drop a decoy, or duck into a hide spot that is right here.
  if (farmer.state === 'chase' && Math.abs(gap) < 170 && turkey.decoys > 0) {
    input.decoy = true;
  }
  if (farmer.state === 'chase' && Math.abs(gap) < 120) {
    const spot = nearHide(state);
    if (spot && Math.abs(spot.x - turkey.x) < 60) input.hide = true;
  }
  input.right = true;
  // Sprint whenever the farmer is on the hunt (not in a stroll scene), and save
  // stamina by walking when he is not.
  if (!stroll && farmer.state === 'chase' && turkey.stamina > 15) input.sprint = true;
  // Hop over an oven's heat ring instead of standing in it and burning.
  for (const oven of OVENS) {
    if (oven.x - turkey.x > 0 && oven.x - turkey.x < 130 && turkey.onGround) {
      input.jump = true;
      input.sprint = true;
    }
  }
  if (knife) {
    if (knife.kind === 'thrown') input.jump = turkey.onGround;
    else input.left = Math.abs(knife.x - turkey.x) < 60;
  }
  // Drift toward the nearest corn ahead when it costs nothing.
  const corn = nearestCorn(state);
  if (corn && !knife && Math.abs(corn.x - turkey.x) < 200 && corn.y > FIELD.groundY - 60) {
    input.right = corn.x >= turkey.x;
    input.left = corn.x < turkey.x;
  }
  return input;
}

function runFor(world, seconds, stroll) {
  let events = 0;
  for (let i = 0; i < seconds / STEP; i += 1) {
    events = stepWorld(world, autopilot(world, stroll), STEP);
    if (world.status === 'over') break;
  }
  return events;
}

/**
 * Set `world` to the named scene (start, play, kitchen or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'kitchen') {
    // A stroll through the kitchen: ovens, falling knives and the farmer behind,
    // without sprinting on to the woods (that is the end scene's job).
    world.turkey.x = 2900;
    world.farmer.x = 2700;
    runFor(world, KITCHEN_SECONDS, true);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    world.turkey.x = 3850;
    world.farmer.x = 3600;
    runFor(world, END_LIMIT_SECONDS, false);
    const over = world.status === 'over';
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.turkey.score };
  }
  if (name === 'play') {
    // The farmer starts close behind, so the shot shows the chase itself.
    world.farmer.x = 500;
    runFor(world, PLAY_SECONDS, false);
    // The turkey outruns the farmer's sight, so he drops to a search and falls
    // out of frame; put him back on the hunt just behind the turkey, a state the
    // game reaches on its own whenever the turkey is spotted up close.
    if (world.status !== 'over' && world.turkey.x - world.farmer.x > 500) {
      world.farmer.x = world.turkey.x - 380;
      world.farmer.state = 'chase';
      world.farmer.stateTime = 0;
      world.farmer.lastSeenX = world.turkey.x;
    }
    const over = world.status === 'over';
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  runFor(world, START_SECONDS, false);
  return { screen: SCREEN_TITLE, best: 0 };
}
