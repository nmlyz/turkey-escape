// The farmer's brain: patrol, chase, search, tricked and taunt. He is slower than a
// sprinting turkey but faster than a walking one, so the turkey must spend stamina to
// open a gap, and hide or drop a decoy to break the chase outright.
import { FARMER, FIELD, KNIFE } from './config.js';

export const FARMER_PATROL = 'patrol';
export const FARMER_CHASE = 'chase';
export const FARMER_SEARCH = 'search';
export const FARMER_TRICKED = 'tricked';
export const FARMER_TAUNT = 'taunt';

/** The farmer starts a little behind the turkey, already on the hunt. */
export function createFarmer(x) {
  return {
    x, y: FIELD.groundY, vx: 0, dir: 1,
    state: FARMER_PATROL, stateTime: 0,
    lastSeenX: x, lastSeenY: FIELD.groundY,
    throwTimer: 1.5, windup: 0, searchTargetX: x,
  };
}

/** Can the farmer see the turkey right now? Hiding breaks sight at any range. */
export function farmerSees(farmer, turkey) {
  if (turkey.hidden) return false;
  return Math.abs(farmer.x - turkey.x) < FARMER.sightRange;
}

/**
 * Advance the farmer one fixed step. Returns an event for the world to act on:
 * null, { type: 'spotted' } when a chase begins, { type: 'throw' } when a knife
 * leaves his hand, or { type: 'grab' } when he catches the turkey.
 */
export function stepFarmer(farmer, turkey, decoy, dt) {
  farmer.stateTime += dt;
  const dx = turkey.x - farmer.x;
  const dist = Math.abs(dx);
  let event = null;

  const seen = farmerSees(farmer, turkey);
  if (seen) {
    farmer.lastSeenX = turkey.x;
    farmer.lastSeenY = turkey.y;
    if (farmer.state !== FARMER_CHASE && farmer.state !== FARMER_TAUNT) {
      farmer.state = FARMER_CHASE;
      farmer.stateTime = 0;
      event = { type: 'spotted' };
    }
  }

  // A corn decoy on the ground pulls him off the chase while he investigates it.
  if (decoy && farmer.state !== FARMER_TAUNT && farmer.state !== FARMER_TRICKED
    && dist < FARMER.sightRange * 1.2) {
    farmer.state = FARMER_TRICKED;
    farmer.stateTime = 0;
  }

  switch (farmer.state) {
    case FARMER_PATROL: {
      // Shamble toward the turkey's side of the field, never quite catching up.
      farmer.dir = dx >= 0 ? 1 : -1;
      farmer.x += farmer.dir * FARMER.patrolSpeed * dt;
      break;
    }
    case FARMER_CHASE: {
      farmer.dir = dx >= 0 ? 1 : -1;
      farmer.x += farmer.dir * FARMER.chaseSpeed * dt;
      farmer.throwTimer -= dt;
      if (farmer.windup > 0) {
        farmer.windup -= dt;
        if (farmer.windup <= 0) event = { type: 'throw' };
      } else if (farmer.throwTimer <= 0 && dist < FARMER.throwRange && dist > 90) {
        farmer.windup = KNIFE.windup;
        farmer.throwTimer = FARMER.throwInterval;
        event = { type: 'windup' };
      }
      if (!seen && farmer.stateTime > 1.2) {
        // Lost him: go and search where he was last seen.
        farmer.state = FARMER_SEARCH;
        farmer.stateTime = 0;
        farmer.searchTargetX = farmer.lastSeenX;
      }
      if (dist < FARMER.grabRange && !turkey.hidden && turkey.invul <= 0) {
        event = { type: 'grab' };
        farmer.state = FARMER_TAUNT;
        farmer.stateTime = 0;
      }
      break;
    }
    case FARMER_SEARCH: {
      const sdx = farmer.searchTargetX - farmer.x;
      farmer.dir = sdx >= 0 ? 1 : -1;
      if (Math.abs(sdx) > 12) {
        farmer.x += farmer.dir * FARMER.searchSpeed * dt;
      } else {
        // At the spot: look around, scratch his head, then give up.
        farmer.dir = Math.sin(farmer.stateTime * 2.2) >= 0 ? 1 : -1;
        if (farmer.stateTime > FARMER.searchTime) {
          farmer.state = FARMER_PATROL;
          farmer.stateTime = 0;
        }
      }
      break;
    }
    case FARMER_TRICKED: {
      if (!decoy) {
        farmer.state = FARMER_PATROL;
        farmer.stateTime = 0;
        break;
      }
      const ddx = decoy.x - farmer.x;
      farmer.dir = ddx >= 0 ? 1 : -1;
      if (Math.abs(ddx) > 24) {
        farmer.x += farmer.dir * FARMER.trickedSpeed * dt;
      } else if (farmer.stateTime > FARMER.peckTime) {
        // The corn is gone; he realises he was tricked and resumes the hunt.
        farmer.state = FARMER_PATROL;
        farmer.stateTime = 0;
        event = { type: 'decoyEaten' };
      }
      break;
    }
    case FARMER_TAUNT: {
      if (farmer.stateTime > FARMER.tauntTime) {
        farmer.state = seen ? FARMER_CHASE : FARMER_PATROL;
        farmer.stateTime = 0;
      }
      break;
    }
    default:
      break;
  }

  farmer.x = Math.max(-400, Math.min(4000, farmer.x));
  return event;
}
