// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the random pattern. ?shot=start|play|kitchen|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createWorld, resetWorld, stepWorld, EVENT_ESCAPED, EVENT_HIT, EVENT_HIDE, EVENT_OVER, EVENT_PICKUP, EVENT_SPOTTED, EVENT_THROW, EVENT_TRICK } from './world.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();
let screen = SCREEN_TITLE;
let best = readBest();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  window.__shotState = {
    screen: scene.screen, score: world.turkey.score, lives: world.turkey.lives,
    x: Math.round(world.turkey.x), farmerX: Math.round(world.farmer.x),
    farmerState: world.farmer.state, result: world.result,
  };
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, world.time);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function playSound(events) {
  if (events & EVENT_SPOTTED) audio.alert();
  if (events & EVENT_THROW) audio.throwKnife();
  if (events & EVENT_PICKUP) audio.pickup();
  if (events & EVENT_HIDE) audio.hide();
  if (events & EVENT_TRICK) audio.trick();
  if (events & EVENT_HIT) audio.hit();
  if (events & EVENT_ESCAPED) audio.win();
  if ((events & EVENT_OVER) && world.result === 'caught') audio.lose();
}

function startGame() {
  audio.unlock();
  audio.gobble();
  resetWorld(world);
  world.status = 'play';
  screen = SCREEN_PLAY;
  input.consumeAll();
}

function endGame() {
  if (world.turkey.score > best) {
    best = world.turkey.score;
    saveBest(best);
  }
  screen = SCREEN_OVER;
}

let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  const delta = Math.min(MAX_FRAME, (now - lastTime) / 1000);
  lastTime = now;
  const mouse = input.mouse();

  if (input.wasPressed('mute')) {
    const muted = audio.toggleMute();
    status.textContent = muted ? 'Sound off (M to turn on)' : '';
    input.consume('mute');
  }
  if (input.wasPressed('pause') && screen === SCREEN_PLAY) {
    screen = SCREEN_PAUSED;
    input.consume('pause');
  } else if (input.wasPressed('pause') && screen === SCREEN_PAUSED) {
    screen = SCREEN_PLAY;
    input.consume('pause');
  }

  if (screen === SCREEN_TITLE) {
    if (input.wasPressed('confirm') || mouse.clicked) startGame();
  } else if (screen === SCREEN_OVER) {
    if (input.wasPressed('restart') || input.wasPressed('confirm')) startGame();
  } else if (screen === SCREEN_PLAY) {
    const held = input.read();
    const stepInput = {
      left: held.left,
      right: held.right,
      sprint: held.sprint,
      jump: input.wasPressed('jump'),
      hide: input.wasPressed('hide'),
      decoy: input.wasPressed('decoy'),
    };
    input.consume('jump');
    input.consume('hide');
    input.consume('decoy');
    accumulator += delta;
    while (accumulator >= STEP) {
      const events = stepWorld(world, stepInput, STEP);
      stepInput.jump = false;
      stepInput.hide = false;
      stepInput.decoy = false;
      playSound(events);
      accumulator -= STEP;
      if (world.status === 'over') {
        endGame();
        accumulator = 0;
        break;
      }
    }
  }

  renderer.draw(world, screen, best, world.time / 1);
  // Small read-only hook for automated play-testing; it changes nothing in the game.
  window.__gameState = {
    screen, score: world.turkey.score, lives: world.turkey.lives,
    x: Math.round(world.turkey.x), stamina: Math.round(world.turkey.stamina),
    farmerState: world.farmer.state, result: world.result,
  };
  requestAnimationFrame(frame);
}

if (shot) {
  runShot(shot);
} else {
  status.textContent = 'Arrows / WASD to run · SPACE to jump · SHIFT to sprint · H to hide · C for a decoy';
  requestAnimationFrame(frame);
}
