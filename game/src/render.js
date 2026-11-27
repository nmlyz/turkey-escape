// All drawing: the farm, the barn, the kitchen, the turkey, the farmer, the HUD and
// the title / pause / end screens. Everything is drawn from code (no image files),
// in a warm autumn palette, so the game is readable at a glance when shrunk.
import {
  ESCAPE_X, FIELD, HIDES, KNIFE, OVEN_HEAT_RADIUS, OVENS, PALETTE,
  TURKEY, WORLD_END, zoneAt,
} from './config.js';
import { distanceLeft } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(8, 14);
  ctx.bezierCurveTo(0, 7, -2, 2, 3, 0);
  ctx.bezierCurveTo(6, -1, 8, 2, 8, 4);
  ctx.bezierCurveTo(8, 2, 10, -1, 13, 0);
  ctx.bezierCurveTo(18, 2, 16, 7, 8, 14);
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.heart : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.restore();
}

function drawCorn(ctx, x, y, bob) {
  ctx.save();
  ctx.translate(x, y + Math.sin(bob) * 3);
  ctx.rotate(0.5);
  ctx.fillStyle = '#7cb342';
  ctx.fillRect(-7, -4, 6, 12);
  ctx.fillRect(1, -4, 6, 12);
  ctx.fillStyle = PALETTE.corn;
  roundRect(ctx, -5, -10, 10, 18, 5);
  ctx.fill();
  ctx.fillStyle = '#d4a017';
  ctx.fillRect(-3, -7, 2, 12);
  ctx.fillRect(1, -7, 2, 12);
  ctx.restore();
}

function drawFeatherPickup(ctx, x, y, time) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 3) * 4);
  ctx.rotate(Math.sin(time * 2) * 0.3);
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b7950b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(0, 15);
  ctx.stroke();
  ctx.restore();
}

/** The turkey, drawn facing `dir` (1 right, -1 left), mid-stride when moving. */
function drawTurkey(ctx, x, y, dir, time, moving, hidden) {
  if (hidden) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const bob = moving ? Math.sin(time * 14) * 2 : Math.sin(time * 3) * 1;
  // Tail fan.
  for (let i = 0; i < 5; i += 1) {
    const angle = -0.9 + i * 0.45;
    ctx.save();
    ctx.translate(-14, -34 + bob);
    ctx.rotate(angle);
    ctx.fillStyle = PALETTE.featherFan[i];
    ctx.beginPath();
    ctx.ellipse(-12, 0, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Body.
  ctx.fillStyle = PALETTE.turkeyBody;
  ctx.beginPath();
  ctx.ellipse(0, -28 + bob, 24, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wing.
  ctx.fillStyle = PALETTE.turkeyWing;
  ctx.beginPath();
  ctx.ellipse(-4, -26 + bob, 13, 9, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Neck and head.
  ctx.fillStyle = PALETTE.turkeyHead;
  ctx.beginPath();
  ctx.ellipse(16, -48 + bob, 9, 13, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Beak.
  ctx.fillStyle = PALETTE.turkeyBeak;
  ctx.beginPath();
  ctx.moveTo(22, -52 + bob);
  ctx.lineTo(34, -48 + bob);
  ctx.lineTo(22, -44 + bob);
  ctx.closePath();
  ctx.fill();
  // Wattle.
  ctx.fillStyle = PALETTE.turkeyWattle;
  ctx.beginPath();
  ctx.ellipse(24, -40 + bob, 3.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye.
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(18, -52 + bob, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(19, -53 + bob, 0.9, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  const step = moving ? Math.sin(time * 14) * 6 : 0;
  ctx.strokeStyle = '#e8a13a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.lineTo(-6 + step, 0);
  ctx.moveTo(6, -10);
  ctx.lineTo(6 - step, 0);
  ctx.stroke();
  ctx.restore();
}

/** The farmer, with hat, overalls and pitchfork; wind-up pose when about to throw. */
function drawFarmer(ctx, x, y, dir, time, state, windup) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const bob = state === 'chase' ? Math.abs(Math.sin(time * 10)) * 3 : 0;
  const armRaise = windup > 0 ? -1.2 : 0;
  // Legs.
  ctx.strokeStyle = PALETTE.farmerOveralls;
  ctx.lineWidth = 7;
  const step = state === 'chase' ? Math.sin(time * 10) * 8 : 0;
  ctx.beginPath();
  ctx.moveTo(-6, -52 + bob);
  ctx.lineTo(-6 + step, 0);
  ctx.moveTo(6, -52 + bob);
  ctx.lineTo(6 - step, 0);
  ctx.stroke();
  // Body (overalls + shirt).
  ctx.fillStyle = PALETTE.farmerShirt;
  roundRect(ctx, -16, -96 + bob, 32, 46, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerOveralls;
  ctx.fillRect(-14, -72 + bob, 28, 22);
  // Head.
  ctx.fillStyle = PALETTE.farmerSkin;
  ctx.beginPath();
  ctx.arc(0, -108 + bob, 13, 0, Math.PI * 2);
  ctx.fill();
  // Straw hat.
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(0, -118 + bob, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-11, -130 + bob, 22, 13);
  // Beard.
  ctx.fillStyle = '#e8dcc8';
  ctx.beginPath();
  ctx.ellipse(0, -98 + bob, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eyes: angry when chasing.
  ctx.fillStyle = '#1a1a1a';
  const eyeY = -110 + bob;
  ctx.beginPath();
  ctx.arc(4, eyeY, 1.8, 0, Math.PI * 2);
  ctx.arc(10, eyeY, 1.8, 0, Math.PI * 2);
  ctx.fill();
  if (state === 'chase' || state === 'tricked') {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, eyeY - 4);
    ctx.lineTo(6, eyeY - 2);
    ctx.moveTo(12, eyeY - 2);
    ctx.lineTo(8, eyeY - 4);
    ctx.stroke();
  }
  // Pitchfork arm.
  ctx.save();
  ctx.translate(14, -84 + bob);
  ctx.rotate(armRaise);
  ctx.strokeStyle = '#8a6d3b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(16, -34);
  ctx.stroke();
  ctx.strokeStyle = '#c0c8cc';
  ctx.lineWidth = 2.5;
  for (const off of [-4, 0, 4]) {
    ctx.beginPath();
    ctx.moveTo(16 + off, -34);
    ctx.lineTo(18 + off, -46);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

function drawKnife(ctx, x, y, spin, kind) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(kind === 'falling' ? Math.PI / 2 + Math.sin(spin) * 0.1 : spin);
  ctx.fillStyle = PALETTE.knifeBlade;
  ctx.beginPath();
  ctx.moveTo(-23, -4);
  ctx.lineTo(10, -5);
  ctx.lineTo(23, 0);
  ctx.lineTo(10, 5);
  ctx.lineTo(-23, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.knifeHandle;
  ctx.fillRect(-23, -5, 12, 10);
  ctx.restore();
}

function drawHideSpot(ctx, hide, camX, time) {
  const x = hide.x - camX;
  const y = FIELD.groundY;
  ctx.save();
  if (hide.kind === 'hay') {
    ctx.fillStyle = '#d9a441';
    ctx.beginPath();
    ctx.ellipse(x, y - 26, 52, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b5822a';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * 18, y - 52);
      ctx.quadraticCurveTo(x + i * 20, y - 26, x + i * 18, y - 2);
      ctx.stroke();
    }
  } else if (hide.kind === 'crate') {
    ctx.fillStyle = '#9c6b3f';
    ctx.fillRect(x - 42, y - 64, 84, 64);
    ctx.strokeStyle = '#6e4520';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 42, y - 64, 84, 64);
    ctx.beginPath();
    ctx.moveTo(x - 42, y - 64);
    ctx.lineTo(x + 42, y);
    ctx.moveTo(x + 42, y - 64);
    ctx.lineTo(x - 42, y);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#7d8a99';
    ctx.fillRect(x - 56, y - 58, 112, 58);
    ctx.fillStyle = '#aeb9c4';
    ctx.fillRect(x - 56, y - 64, 112, 8);
    ctx.fillStyle = '#5d6b78';
    ctx.fillRect(x - 40, y - 44, 80, 6);
  }
  ctx.restore();
}

function drawOven(ctx, oven, camX, time) {
  const x = oven.x - camX;
  const y = FIELD.groundY;
  const glow = 0.55 + Math.sin(time * 5) * 0.2;
  // Heat ring on the floor.
  const grad = ctx.createRadialGradient(x, y, 10, x, y, OVEN_HEAT_RADIUS);
  grad.addColorStop(0, `rgba(255, 90, 20, ${0.35 * glow})`);
  grad.addColorStop(1, 'rgba(255, 90, 20, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y + 2, OVEN_HEAT_RADIUS, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Oven body.
  ctx.fillStyle = '#3a3f45';
  roundRect(ctx, x - 58, y - 150, 116, 150, 10);
  ctx.fill();
  ctx.fillStyle = '#22262b';
  ctx.fillRect(x - 48, y - 138, 96, 84);
  // Fire inside.
  ctx.fillStyle = `rgba(255, ${Math.floor(120 + 60 * glow)}, 30, ${0.85})`;
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 60);
  ctx.quadraticCurveTo(x - 20, y - 110 - glow * 14, x, y - 96);
  ctx.quadraticCurveTo(x + 20, y - 110 - glow * 14, x + 34, y - 60);
  ctx.closePath();
  ctx.fill();
  // Door handle + knobs.
  ctx.fillStyle = '#c0c8cc';
  ctx.fillRect(x - 40, y - 46, 80, 6);
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(x - 30 + i * 30, y - 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Warning sign.
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HOT!', x, y - 158);
}

/** Background scenery for the zone under the camera: sky, hills, fence, trees or beams. */
function drawScenery(ctx, camX, zone, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, zone.sky[0]);
  sky.addColorStop(1, zone.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Sun.
  ctx.fillStyle = 'rgba(255, 236, 180, 0.95)';
  ctx.beginPath();
  ctx.arc(1080, 96, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 236, 180, 0.35)';
  ctx.beginPath();
  ctx.arc(1080, 96, 64, 0, Math.PI * 2);
  ctx.fill();

  if (zone.name === 'THE KITCHEN') {
    // Tiled wall and a long kitchen counter along the back.
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(0, 0, FIELD.width, 420);
    ctx.strokeStyle = 'rgba(120, 90, 60, 0.25)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 420; y += 52) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
    }
    for (let x = 0; x < FIELD.width; x += 52) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 420); ctx.stroke();
    }
    ctx.fillStyle = '#b08a5a';
    ctx.fillRect(0, 420, FIELD.width, 26);
    ctx.fillStyle = '#8a6a42';
    ctx.fillRect(0, 446, FIELD.width, 10);
    // Hanging pans with a rim highlight.
    for (let i = 0; i < 5; i += 1) {
      const px = 120 + i * 260 - (camX % 260);
      ctx.fillStyle = '#3a3f45';
      ctx.beginPath();
      ctx.arc(px, 190, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22262b';
      ctx.beginPath();
      ctx.arc(px, 190, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, 190, 23, Math.PI * 1.1, Math.PI * 1.6);
      ctx.stroke();
    }
  } else {
    // Rolling hills, far and near.
    ctx.fillStyle = zone.name === 'THE BARN' ? '#7a5a30' : '#8a9a4b';
    ctx.beginPath();
    ctx.moveTo(0, 470);
    for (let x = 0; x <= FIELD.width; x += 40) {
      ctx.lineTo(x, 452 + Math.sin((x + camX * 0.4) * 0.008) * 22);
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.closePath();
    ctx.fill();
    // Trees and fence posts scrolling with parallax.
    const parallax = zone.name === 'THE BARN' ? 0.6 : 0.5;
    for (let i = 0; i < 8; i += 1) {
      const wx = Math.floor((i * 620 - camX * parallax) % 4400);
      const drawX = wx < 0 ? wx + 4400 : wx;
      if (drawX < -120 || drawX > FIELD.width + 120) continue;
      if (zone.name === 'THE BARN') {
        // A warm red barn with a hayloft door, behind the playfield.
        ctx.fillStyle = '#a8432f';
        ctx.fillRect(drawX - 90, 310, 180, 160);
        ctx.fillStyle = '#8a3524';
        ctx.beginPath();
        ctx.moveTo(drawX - 102, 310);
        ctx.lineTo(drawX, 232);
        ctx.lineTo(drawX + 102, 310);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        for (let px = drawX - 90; px < drawX + 90; px += 30) {
          ctx.beginPath(); ctx.moveTo(px, 310); ctx.lineTo(px, 470); ctx.stroke();
        }
        ctx.fillStyle = '#5d3a1a';
        ctx.fillRect(drawX - 26, 380, 52, 90);
        ctx.strokeStyle = '#e8dcc8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(drawX - 26, 380); ctx.lineTo(drawX + 26, 470);
        ctx.moveTo(drawX + 26, 380); ctx.lineTo(drawX - 26, 470);
        ctx.stroke();
        ctx.fillStyle = '#ffd76a';
        ctx.fillRect(drawX - 16, 330, 32, 26);
        ctx.fillStyle = '#5d3a1a';
        ctx.fillRect(drawX - 16, 341, 32, 4);
      } else {
        ctx.fillStyle = '#6e4520';
        ctx.fillRect(drawX - 6, 400, 12, 70);
        ctx.fillStyle = '#c96a2b';
        ctx.beginPath();
        ctx.arc(drawX, 380, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e07b2e';
        ctx.beginPath();
        ctx.arc(drawX - 26, 398, 26, 0, Math.PI * 2);
        ctx.arc(drawX + 26, 398, 26, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Fence along the ground.
    ctx.fillStyle = '#8a6d3b';
    for (let x = -((camX % 96) + 96) % 96; x < FIELD.width; x += 96) {
      ctx.fillRect(x, FIELD.groundY - 44, 8, 44);
    }
    ctx.fillRect(0, FIELD.groundY - 44, FIELD.width, 6);
    ctx.fillRect(0, FIELD.groundY - 26, FIELD.width, 6);
  }

  // Ground.
  ctx.fillStyle = zone.ground;
  ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, FIELD.groundY, FIELD.width, 6);
  // Grass tufts / floor boards.
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  for (let x = -((camX % 64) + 64) % 64; x < FIELD.width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, FIELD.groundY + 18);
    ctx.lineTo(x + 10, FIELD.groundY + 8);
    ctx.moveTo(x + 20, FIELD.groundY + 26);
    ctx.lineTo(x + 30, FIELD.groundY + 14);
    ctx.stroke();
  }
  // The woods gate at the end of the world: freedom.
  if (camX + FIELD.width > ESCAPE_X - 40) {
    const gx = ESCAPE_X - camX;
    ctx.fillStyle = '#2f6b2f';
    ctx.fillRect(gx - 8, FIELD.groundY - 190, 16, 190);
    ctx.fillRect(gx + 90, FIELD.groundY - 190, 16, 190);
    ctx.fillStyle = '#3f8a3f';
    ctx.beginPath();
    ctx.arc(gx + 46, FIELD.groundY - 190, 70, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffe9c4';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE WOODS', gx + 46, FIELD.groundY - 200);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('FREEDOM →', gx + 46, FIELD.groundY - 176);
  }
}

function drawHud(ctx, state, screen, best) {
  const turkey = state.turkey;
  const farmer = state.farmer;
  ctx.fillStyle = PALETTE.hudBg;
  roundRect(ctx, 12, 10, FIELD.width - 24, 64, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudText;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`SCORE ${turkey.score}`, 28, 40);
  if (best > 0) {
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`BEST ${best}`, 28, 64);
  }

  // Distance progress: farmyard, barn, kitchen, woods.
  const barX = 300;
  const barW = 400;
  const progress = Math.min(1, turkey.x / ESCAPE_X);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, barX, 26, barW, 14, 7);
  ctx.fill();
  ctx.fillStyle = PALETTE.accent;
  roundRect(ctx, barX, 26, barW * progress, 14, 7);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${distanceLeft(state)}m to the woods`, barX + barW / 2, 58);
  for (const mark of [1300 / ESCAPE_X, 2700 / ESCAPE_X]) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX + barW * mark - 1, 24, 2, 18);
  }

  // Decoys: a drawn corn cob, never an emoji (they render unevenly).
  drawCorn(ctx, 728, 40, 0);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`×${turkey.decoys} [C]`, 744, 42);
  // Lives.
  for (let i = 0; i < 3; i += 1) drawHeart(ctx, 850 + i * 30, 36, 26, i < turkey.lives);
  // Stamina bar.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, 940, 26, 120, 12, 6);
  ctx.fill();
  ctx.fillStyle = turkey.stamina < 25 ? '#ff6b5e' : '#7ee787';
  roundRect(ctx, 940, 26, 120 * (turkey.stamina / 100), 12, 6);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STAMINA', 940, 58);

  // Zone + farmer state badge.
  const zone = zoneAt(turkey.x);
  ctx.textAlign = 'right';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(zone.name, FIELD.width - 28, 40);
  const badge = farmer.state === 'chase' ? '⚠ FARMER HUNTING'
    : farmer.state === 'search' ? '? FARMER SEARCHING'
    : farmer.state === 'tricked' ? '✓ FARMER TRICKED'
    : 'FARMER PATROLLING';
  ctx.fillStyle = farmer.state === 'chase' ? '#ff8a7a'
    : farmer.state === 'tricked' ? '#7ee787' : PALETTE.hudText;
  ctx.fillText(badge, FIELD.width - 28, 62);

  // Burn warning.
  if (turkey.burn > 0.15) {
    ctx.fillStyle = '#ff5a14';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOO HOT! MOVE!', FIELD.width / 2, 110);
  }
  if (turkey.hidden) {
    ctx.fillStyle = '#7ee787';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN — hold still… (move to slip out)', FIELD.width / 2, 110);
  }
  // Toasts (play only: they would overlap the end screen's title).
  if (screen === SCREEN_PLAY) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px sans-serif';
  state.toasts.forEach((toast, i) => {
    ctx.globalAlpha = Math.max(0, 1 - toast.time / 2.2);
    ctx.fillStyle = toast.color;
    ctx.fillText(toast.text, FIELD.width / 2, 150 + i * 30);
    ctx.globalAlpha = 1;
  });
  }
}

function drawTitle(ctx, state, best, time) {
  ctx.fillStyle = 'rgba(30, 14, 4, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Big turkey mascot.
  ctx.save();
  ctx.translate(300, 430);
  ctx.scale(2.4, 2.4);
  drawTurkey(ctx, 0, 0, 1, time, false, false);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9c4';
  ctx.font = 'bold 92px sans-serif';
  ctx.fillText('TURKEY', 760, 210);
  ctx.fillText('ESCAPE', 760, 300);
  ctx.fillStyle = PALETTE.accent;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('— Thanksgiving Getaway —', 760, 350);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '20px sans-serif';
  ctx.fillText('The farmer is coming for dinner. You are the dinner.', 760, 395);
  ctx.fillText('Run the farmyard, slip through the barn, dodge the oven,', 760, 425);
  ctx.fillText('and reach the woods before he catches you.', 760, 455);

  // How to play panel.
  ctx.fillStyle = 'rgba(40, 22, 8, 0.78)';
  roundRect(ctx, 480, 480, 560, 150, 14);
  ctx.fill();
  ctx.fillStyle = '#ffe9c4';
  ctx.font = 'bold 19px sans-serif';
  ctx.textAlign = 'left';
  const lines = [
    '← → / A D  run      SPACE  jump      SHIFT  sprint (stamina)',
    'H  hide in hay / crates / counters     C  drop a corn decoy',
    'Grab corn +10, golden feathers +50. Three lives. Reach the woods!',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 505, 512 + i * 34));
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = PALETTE.accent;
  ctx.fillText(best > 0 ? `BEST SCORE ${best}  —  press ENTER or click to play` : 'Press ENTER or click to play', 760, 668);
}

function drawEnd(ctx, state, best, time) {
  const turkey = state.turkey;
  const escaped = state.result === 'escaped';
  ctx.fillStyle = escaped ? 'rgba(20, 60, 20, 0.6)' : 'rgba(60, 10, 5, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = escaped ? '#b6f0b6' : '#ffb0a0';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText(escaped ? 'ESCAPED!' : 'CAUGHT!', FIELD.width / 2, 210);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '26px sans-serif';
  ctx.fillText(
    escaped
      ? 'You made it to the woods. Thanksgiving dinner is cancelled.'
      : 'The farmer got you… but turkeys get a rematch every year.',
    FIELD.width / 2, 262,
  );
  // Stats table.
  ctx.fillStyle = 'rgba(40, 22, 8, 0.8)';
  roundRect(ctx, FIELD.width / 2 - 260, 300, 520, 190, 14);
  ctx.fill();
  ctx.fillStyle = '#ffe9c4';
  ctx.font = 'bold 24px sans-serif';
  const rows = [
    ['SCORE', `${turkey.score}`],
    ['DISTANCE', `${turkey.distance} m`],
    ['CORN', `${turkey.corn}`],
    ['TIMES THE FARMER WAS TRICKED', `${turkey.tricks}`],
    ['BEST', `${Math.max(best, turkey.score)}`],
  ];
  rows.forEach(([label, value], i) => {
    ctx.textAlign = 'left';
    ctx.fillText(label, FIELD.width / 2 - 230, 338 + i * 30);
    ctx.textAlign = 'right';
    ctx.fillText(value, FIELD.width / 2 + 230, 338 + i * 30);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.accent;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Press R or ENTER to run again', FIELD.width / 2, 560);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(20, 10, 4, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = '#ffe9c4';
  ctx.textAlign = 'center';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('PAUSED', FIELD.width / 2, 340);
  ctx.font = '24px sans-serif';
  ctx.fillText('Press P to keep running', FIELD.width / 2, 390);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const width = FIELD.width;
  const height = FIELD.height;

  function draw(state, screen, best, time) {
    const turkey = state.turkey;
    const camX = Math.max(0, Math.min(WORLD_END - width, turkey.x - width * 0.42));
    const zone = zoneAt(turkey.x);
    ctx.clearRect(0, 0, width, height);
    drawScenery(ctx, camX, zone, time);

    // Hide spots (behind the turkey), ovens, pickups, decoys.
    for (const hide of HIDES) drawHideSpot(ctx, hide, camX, time);
    for (const oven of OVENS) drawOven(ctx, oven, camX, time);
    for (const corn of state.corns) {
      if (!corn.taken) drawCorn(ctx, corn.x - camX, corn.y, time + corn.x);
    }
    for (const feather of state.feathers) {
      if (!feather.taken) drawFeatherPickup(ctx, feather.x - camX, feather.y, time);
    }
    for (const decoy of state.decoys) {
      drawCorn(ctx, decoy.x - camX, FIELD.groundY - 12, time);
      ctx.fillStyle = '#ffe9c4';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DECOY', decoy.x - camX, FIELD.groundY - 44);
    }
    // Knives.
    for (const knife of state.knives) drawKnife(ctx, knife.x - camX, knife.y, knife.spin, knife.kind);
    // Farmer, then the turkey (hidden turkey is drawn inside his spot instead).
    const f = state.farmer;
    drawFarmer(ctx, f.x - camX, f.y, f.dir, time, f.state, f.windup);
    if (turkey.hidden && turkey.hideSpot) {
      // Just a tail feather sticking out of the hay: the giveaway is subtle.
      ctx.fillStyle = PALETTE.featherFan[2];
      ctx.beginPath();
      ctx.ellipse(turkey.hideSpot.x - camX + 18, FIELD.groundY - 52, 12, 5, -0.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const moving = Math.abs(turkey.vx) > 10;
      const flash = turkey.invul > 0 && Math.floor(time * 12) % 2 === 0;
      if (!flash) drawTurkey(ctx, turkey.x - camX, turkey.y, turkey.dir, time, moving, false);
    }
    // Low-stamina / danger vignette.
    if (turkey.lives === 1 || turkey.stamina < 20) {
      const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.42, width / 2, height / 2, height * 0.75);
      grad.addColorStop(0, 'rgba(200,30,10,0)');
      grad.addColorStop(1, `rgba(200,30,10,${0.22 + Math.sin(time * 4) * 0.08})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    if (screen === SCREEN_TITLE) drawTitle(ctx, state, best, time);
    else if (screen === SCREEN_OVER) drawEnd(ctx, state, best, time);
    else if (screen === SCREEN_PAUSED) drawPaused(ctx);
    if (screen !== SCREEN_TITLE) drawHud(ctx, state, screen, best);
  }

  return { draw };
}
