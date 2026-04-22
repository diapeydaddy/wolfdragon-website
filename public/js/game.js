/**
 * WOLFDRAGON — Browser Game
 * NES/SNES pixel-art style demon slayer
 *
 * Parts implemented here:
 *   Part 2 — Engine, Wolfdragon sprite, movement, controls
 *   (Parts 3–8 will extend this file)
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  // CANVAS SETUP
  // ─────────────────────────────────────────────
  const canvas  = document.getElementById('game-canvas');
  const ctx     = canvas.getContext('2d');
  const overlay = document.querySelector('.game-coming-soon');

  const W = 800;
  const H = 480;
  canvas.width  = W;
  canvas.height = H;

  // Pixel-art crisp rendering
  ctx.imageSmoothingEnabled = false;

  // ─────────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────────
  const TILE   = 32;           // base tile/sprite size
  const ROWS   = 3;            // vertical movement rows
  const ROW_Y  = [            // Y positions for each row (bottom = row 0)
    H - TILE - 24,
    H - TILE - 24 - 60,
    H - TILE - 24 - 120,
  ];
  const GROUND_Y = H - 24;    // ground line Y

  const COLORS = {
    bg:          '#0a0a0a',
    ground:      '#1a0000',
    groundLine:  '#cc0000',
    hud:         '#0d0d0d',
    hudBorder:   '#8b0000',
    red:         '#cc0000',
    redBright:   '#ff2222',
    purple:      '#6600aa',
    purpleDark:  '#330055',
    white:       '#f0f0f0',
    yellow:      '#ffdd00',
    orange:      '#ff6600',
    grey:        '#444444',
  };

  // ─────────────────────────────────────────────
  // PIXEL ART RENDERER
  // draws a 2D array of color strings as pixels
  // ─────────────────────────────────────────────
  function drawSprite(sprite, x, y, scale = 2, flipX = false) {
    const pw = scale;
    const ph = scale;
    const cols = sprite[0].length;
    const rows = sprite.length;
    sprite.forEach((row, ry) => {
      row.forEach((col, rx) => {
        if (!col || col === ' ' || col === null) return;
        ctx.fillStyle = col;
        const drawX = flipX
          ? x + (cols - 1 - rx) * pw
          : x + rx * pw;
        ctx.fillRect(drawX, y + ry * ph, pw, ph);
      });
    });
  }

  // ─────────────────────────────────────────────
  // SPRITE DEFINITIONS  (pixel arrays, 2px scale)
  // Each cell is a CSS color string or null (transparent)
  // ─────────────────────────────────────────────

  // Wolfdragon — 16×16 base sprite
  const _ = null;
  const WD_BODY   = '#4a2080';   // purple body
  const WD_FUR    = '#2a1040';   // dark fur
  const WD_EYE    = '#ff2222';   // red eyes
  const WD_FANG   = '#f0f0f0';   // white fangs
  const WD_WING   = '#6600aa';   // wing membrane
  const WD_WING2  = '#440077';   // wing edge
  const WD_CLAW   = '#ccaaff';   // claw
  const WD_CAPE   = '#cc0000';   // red cape

  const SPRITE_WD_IDLE = [
    [_,_,WD_WING2,WD_WING,WD_WING,_,_,_,_,WD_WING,WD_WING,WD_WING2,_,_,_,_],
    [_,WD_WING2,WD_WING,WD_WING,WD_WING,_,_,_,_,WD_WING,WD_WING,WD_WING,WD_WING2,_,_,_],
    [_,WD_WING,WD_WING,_,_,WD_BODY,WD_BODY,WD_BODY,WD_BODY,_,_,WD_WING,WD_WING,_,_,_],
    [_,_,WD_WING,_,WD_BODY,WD_FUR,WD_FUR,WD_FUR,WD_FUR,WD_BODY,_,WD_WING,_,_,_,_],
    [_,_,_,WD_BODY,WD_FUR,WD_EYE,WD_FUR,WD_FUR,WD_EYE,WD_FUR,WD_BODY,_,_,_,_,_],
    [_,_,_,WD_BODY,WD_FUR,WD_FUR,WD_FANG,WD_FANG,WD_FUR,WD_FUR,WD_BODY,_,_,_,_,_],
    [_,_,WD_CAPE,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_CAPE,_,_,_,_],
    [_,WD_CAPE,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_CAPE,_,_,_],
    [_,WD_CAPE,WD_CAPE,WD_BODY,WD_CLAW,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_CLAW,WD_BODY,WD_CAPE,WD_CAPE,_,_],
    [_,_,WD_CAPE,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_CAPE,_,_,_],
    [_,_,_,WD_BODY,WD_BODY,WD_CLAW,WD_BODY,WD_BODY,WD_BODY,WD_CLAW,WD_BODY,WD_BODY,_,_,_,_],
    [_,_,_,WD_FUR,_,_,WD_BODY,WD_BODY,WD_BODY,_,_,WD_FUR,_,_,_,_],
    [_,_,_,WD_CLAW,_,_,WD_FUR,WD_FUR,WD_FUR,_,_,WD_CLAW,_,_,_,_],
    [_,_,_,_,_,_,WD_CLAW,_,WD_CLAW,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  ];

  // Attack frame — arm extended with claw
  const SPRITE_WD_ATTACK = [
    [_,_,WD_WING2,WD_WING,WD_WING,_,_,_,_,WD_WING,WD_WING,WD_WING2,_,_,_,_],
    [_,WD_WING2,WD_WING,WD_WING,WD_WING,_,_,_,_,WD_WING,WD_WING,WD_WING,WD_WING2,_,_,_],
    [_,WD_WING,WD_WING,_,_,WD_BODY,WD_BODY,WD_BODY,WD_BODY,_,_,WD_WING,WD_WING,_,_,_],
    [_,_,WD_WING,_,WD_BODY,WD_FUR,WD_FUR,WD_FUR,WD_FUR,WD_BODY,_,WD_WING,_,_,_,_],
    [_,_,_,WD_BODY,WD_FUR,WD_EYE,WD_FUR,WD_FUR,WD_EYE,WD_FUR,WD_BODY,_,_,_,_,_],
    [_,_,_,WD_BODY,WD_FUR,WD_FUR,WD_FANG,WD_FANG,WD_FUR,WD_FUR,WD_BODY,_,_,_,_,_],
    [_,_,WD_CAPE,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_CAPE,_,_,_,_],
    [_,WD_CAPE,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_CAPE,WD_CLAW,WD_CLAW,WD_CLAW],
    [_,WD_CAPE,WD_CAPE,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_CAPE,WD_CAPE,_,_],
    [_,_,WD_CAPE,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_BODY,WD_CAPE,_,_,_],
    [_,_,_,WD_BODY,WD_BODY,WD_CLAW,WD_BODY,WD_BODY,WD_BODY,WD_CLAW,WD_BODY,WD_BODY,_,_,_,_],
    [_,_,_,WD_FUR,_,_,WD_BODY,WD_BODY,WD_BODY,_,_,WD_FUR,_,_,_,_],
    [_,_,_,WD_CLAW,_,_,WD_FUR,WD_FUR,WD_FUR,_,_,WD_CLAW,_,_,_,_],
    [_,_,_,_,_,_,WD_CLAW,_,WD_CLAW,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  ];

  // Basic demon — 14×14
  const DM_SKIN  = '#cc2200';
  const DM_DARK  = '#880000';
  const DM_HORN  = '#ffaa00';
  const DM_EYE   = '#ffff00';
  const DM_TOOTH = '#f0f0f0';
  const DM_WING  = '#660000';

  const SPRITE_DEMON = [
    [_,_,DM_HORN,_,_,_,_,_,_,_,DM_HORN,_,_,_],
    [_,DM_HORN,DM_HORN,_,_,_,_,_,_,_,DM_HORN,DM_HORN,_,_],
    [_,DM_WING,_,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,_,DM_WING,_],
    [DM_WING,DM_WING,DM_SKIN,DM_DARK,DM_EYE,DM_SKIN,DM_SKIN,DM_SKIN,DM_EYE,DM_DARK,DM_SKIN,DM_WING,DM_WING,_],
    [_,DM_WING,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_WING,_,_],
    [_,_,DM_SKIN,DM_SKIN,DM_TOOTH,DM_SKIN,DM_SKIN,DM_SKIN,DM_TOOTH,DM_SKIN,DM_SKIN,_,_,_],
    [_,_,DM_DARK,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_DARK,_,_,_],
    [_,_,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,_,_,_],
    [_,DM_DARK,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,DM_DARK,_,_],
    [_,_,DM_SKIN,DM_DARK,_,DM_SKIN,DM_SKIN,DM_SKIN,DM_SKIN,_,DM_DARK,DM_SKIN,_,_],
    [_,_,_,DM_SKIN,_,_,DM_SKIN,DM_SKIN,_,_,DM_SKIN,_,_,_],
    [_,_,_,DM_DARK,_,_,_,_,_,_,DM_DARK,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  ];

  // Fireball projectile — 6×6
  const FB_O = '#ff6600';
  const FB_Y = '#ffdd00';
  const FB_R = '#ff2222';
  const SPRITE_FIREBALL = [
    [_,FB_Y,FB_Y,FB_Y,_,_],
    [FB_Y,FB_O,FB_O,FB_O,FB_Y,_],
    [FB_Y,FB_O,FB_R,FB_O,FB_Y,_],
    [FB_Y,FB_O,FB_O,FB_O,FB_Y,_],
    [_,FB_Y,FB_Y,FB_Y,_,_],
    [_,_,_,_,_,_],
  ];

  // Shield block flash — 10×10
  const SH_B = '#4488ff';
  const SH_W = '#aaccff';
  const SPRITE_SHIELD = [
    [_,_,SH_B,SH_B,SH_B,SH_B,SH_B,SH_B,_,_],
    [_,SH_B,SH_W,SH_W,SH_W,SH_W,SH_W,SH_W,SH_B,_],
    [SH_B,SH_W,SH_W,SH_B,SH_B,SH_B,SH_B,SH_W,SH_W,SH_B],
    [SH_B,SH_W,SH_B,SH_W,SH_W,SH_W,SH_W,SH_B,SH_W,SH_B],
    [SH_B,SH_W,SH_B,SH_W,SH_W,SH_W,SH_W,SH_B,SH_W,SH_B],
    [SH_B,SH_W,SH_B,SH_W,SH_W,SH_W,SH_W,SH_B,SH_W,SH_B],
    [SH_B,SH_W,SH_W,SH_B,SH_B,SH_B,SH_B,SH_W,SH_W,SH_B],
    [_,SH_B,SH_W,SH_W,SH_W,SH_W,SH_W,SH_W,SH_B,_],
    [_,_,SH_B,SH_B,SH_B,SH_B,SH_B,SH_B,_,_],
    [_,_,_,_,SH_B,SH_B,_,_,_,_],
  ];

  // ─────────────────────────────────────────────
  // GAME STATE
  // ─────────────────────────────────────────────
  const state = {
    screen:     'title',   // 'title' | 'playing' | 'paused' | 'gameover'
    score:      0,
    level:      1,
    wave:       1,         // wave within level (1–3 before boss)
    hp:         100,
    maxHp:      100,
    spellUses:  2,
    maxSpell:   2,
  };

  // ─────────────────────────────────────────────
  // WOLFDRAGON ENTITY
  // ─────────────────────────────────────────────
  const WD = {
    row:        0,          // current row (0 = bottom)
    x:          80,         // horizontal position
    speed:      4,
    attackTimer: 0,
    attackDuration: 12,
    shieldTimer: 0,
    shieldDuration: 18,
    invincible:  0,          // frames of invincibility after hit
    facing:      1,          // 1 = right, -1 = left
    weapon: {
      name:  'Iron Claws',
      damage: 20,
      range:  80,
      color: WD_CLAW,
    },
    spell: {
      name:   'Fire Breath',
      damage: 50,
      color:  '#ff6600',
    },
    shield: {
      name:  'Bone Shield',
      block:  40,
    },

    get spriteW() { return 16 * 2; },
    get spriteH() { return 16 * 2; },
    get cx()      { return this.x + this.spriteW / 2; },
    get cy()      { return ROW_Y[this.row] + this.spriteH / 2; },
    get hitbox()  {
      return { x: this.x + 8, y: ROW_Y[this.row] + 6, w: this.spriteW - 16, h: this.spriteH - 8 };
    },
    get isAttacking() { return this.attackTimer > 0; },
    get isShielding() { return this.shieldTimer > 0; },
  };

  // ─────────────────────────────────────────────
  // INPUT
  // ─────────────────────────────────────────────
  const keys = {};
  const justPressed = {};

  window.addEventListener('keydown', e => {
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
    // prevent arrow scroll
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });

  function consumeJustPressed(code) {
    if (justPressed[code]) { justPressed[code] = false; return true; }
    return false;
  }

  // ─────────────────────────────────────────────
  // ENTITIES
  // ─────────────────────────────────────────────
  let enemies     = [];
  let projectiles = [];
  let particles   = [];
  let drops       = [];

  // ─────────────────────────────────────────────
  // PARTICLES
  // ─────────────────────────────────────────────
  function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        life: 20 + Math.random() * 20,
        maxLife: 40,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  // ─────────────────────────────────────────────
  // ENEMY SPAWNING
  // ─────────────────────────────────────────────
  let spawnTimer  = 0;
  let spawnRate   = 120;   // frames between spawns
  let enemiesLeft = 8;
  let waveCleared = false;

  function spawnEnemy() {
    if (enemiesLeft <= 0) return;
    enemiesLeft--;
    const row = Math.floor(Math.random() * ROWS);
    enemies.push({
      x:       W + 10,
      row,
      hp:      30 + state.level * 10,
      maxHp:   30 + state.level * 10,
      speed:   0.8 + state.level * 0.15,
      attackTimer: 0,
      shootTimer:  Math.floor(Math.random() * 120),
      type:    'basic',
      sprite:  SPRITE_DEMON,
      spriteW: 14 * 2,
      spriteH: 14 * 2,
      scoreValue: 100,
      flashTimer: 0,
    });
  }

  // ─────────────────────────────────────────────
  // WAVE MANAGEMENT
  // ─────────────────────────────────────────────
  let waveMessageTimer = 0;
  let waveMessage = '';

  function startWave() {
    const waveInLevel = ((state.wave - 1) % 3) + 1;
    enemiesLeft = 5 + waveInLevel * 2 + state.level;
    spawnRate   = Math.max(40, 120 - state.level * 8);
    spawnTimer  = 0;
    waveCleared = false;
    waveMessage = `WAVE ${state.wave}`;
    waveMessageTimer = 120;
  }

  // ─────────────────────────────────────────────
  // COLLISION HELPERS
  // ─────────────────────────────────────────────
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function getEnemyHitbox(e) {
    return { x: e.x + 4, y: ROW_Y[e.row] + 4, w: e.spriteW - 8, h: e.spriteH - 8 };
  }

  // ─────────────────────────────────────────────
  // ATTACK LOGIC
  // ─────────────────────────────────────────────
  function playerAttack() {
    if (WD.isAttacking) return;
    WD.attackTimer = WD.attackDuration;
    // Hitbox in front of player
    const atkBox = {
      x: WD.facing > 0 ? WD.x + WD.spriteW : WD.x - WD.weapon.range,
      y: ROW_Y[WD.row],
      w: WD.weapon.range,
      h: WD.spriteH,
    };
    enemies.forEach(e => {
      if (e.row !== WD.row) return;
      const ehb = getEnemyHitbox(e);
      if (rectsOverlap(atkBox, ehb)) {
        e.hp -= WD.weapon.damage;
        e.flashTimer = 8;
        spawnParticles(e.x + e.spriteW / 2, ROW_Y[e.row] + e.spriteH / 2, DM_SKIN);
        if (e.hp <= 0) killEnemy(e);
      }
    });
  }

  function playerCastSpell() {
    if (state.spellUses <= 0) return;
    state.spellUses--;
    // Fire a projectile in the facing direction
    projectiles.push({
      x:    WD.cx,
      y:    ROW_Y[WD.row] + WD.spriteH / 2 - 6,
      vx:   WD.facing * 10,
      vy:   0,
      row:  WD.row,
      damage: WD.spell.damage,
      owner: 'player',
      sprite: SPRITE_FIREBALL,
      spriteW: 6 * 2,
      spriteH: 6 * 2,
      life:   120,
    });
    spawnParticles(WD.cx, ROW_Y[WD.row], '#ff6600', 12);
  }

  function playerShield() {
    if (WD.isShielding) return;
    WD.shieldTimer = WD.shieldDuration;
  }

  function killEnemy(e) {
    e.hp = 0;
    state.score += e.scoreValue;
    spawnParticles(e.x + e.spriteW / 2, ROW_Y[e.row] + e.spriteH / 2, DM_SKIN, 14);
    // Small chance to drop a weapon (Part 6 will expand this)
    if (Math.random() < 0.12) {
      drops.push({
        x: e.x,
        y: ROW_Y[e.row],
        row: e.row,
        type: 'health',
        life: 300,
      });
    }
  }

  // ─────────────────────────────────────────────
  // PLAYER HURT
  // ─────────────────────────────────────────────
  function hurtPlayer(dmg) {
    if (WD.invincible > 0) return;
    if (WD.isShielding) {
      dmg = Math.max(0, dmg - WD.shield.block);
      spawnParticles(WD.cx, WD.cy, SH_B, 10);
    }
    state.hp = Math.max(0, state.hp - dmg);
    WD.invincible = 60;
    spawnParticles(WD.cx, WD.cy, '#ff4444', 8);
    if (state.hp <= 0) triggerGameOver();
  }

  function triggerGameOver() {
    state.screen = 'gameover';
  }

  // ─────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────
  function update() {
    if (state.screen !== 'playing') return;

    // ── Wolfdragon movement ──
    const targetRow = WD.row;

    if (consumeJustPressed('ArrowUp')   && WD.row < ROWS - 1) WD.row++;
    if (consumeJustPressed('ArrowDown') && WD.row > 0)        WD.row--;

    if (keys['ArrowLeft'])  { WD.x -= WD.speed; WD.facing = -1; }
    if (keys['ArrowRight']) { WD.x += WD.speed; WD.facing =  1; }

    // Clamp horizontal
    WD.x = Math.max(0, Math.min(W - WD.spriteW, WD.x));

    // ── Actions ──
    if (consumeJustPressed('KeyZ') || consumeJustPressed('Space')) playerAttack();
    if (consumeJustPressed('KeyX')) playerCastSpell();
    if (consumeJustPressed('KeyC')) playerShield();

    // ── Timers ──
    if (WD.attackTimer > 0) WD.attackTimer--;
    if (WD.shieldTimer > 0) WD.shieldTimer--;
    if (WD.invincible  > 0) WD.invincible--;

    // ── Spawn enemies ──
    if (enemiesLeft > 0) {
      spawnTimer++;
      if (spawnTimer >= spawnRate) {
        spawnTimer = 0;
        spawnEnemy();
      }
    }

    // ── Update enemies ──
    enemies.forEach(e => {
      e.x -= e.speed;
      if (e.flashTimer > 0) e.flashTimer--;

      // Enemy shoots at player if on same row
      e.shootTimer--;
      if (e.shootTimer <= 0) {
        e.shootTimer = 90 + Math.floor(Math.random() * 60);
        if (e.row === WD.row) {
          projectiles.push({
            x:    e.x,
            y:    ROW_Y[e.row] + e.spriteH / 2 - 6,
            vx:   -3,
            vy:   0,
            row:  e.row,
            damage: 15,
            owner: 'enemy',
            sprite: SPRITE_FIREBALL,
            spriteW: 6 * 2,
            spriteH: 6 * 2,
            life: 200,
          });
        }
      }

      // Melee collision
      const ehb = getEnemyHitbox(e);
      const whb = WD.hitbox;
      if (e.row === WD.row && rectsOverlap(ehb, whb)) {
        hurtPlayer(10);
        e.hp -= 5;
        if (e.hp <= 0) killEnemy(e);
      }
    });

    // Remove dead / off-screen enemies
    enemies = enemies.filter(e => e.hp > 0 && e.x > -64);

    // ── Drops ──
    drops.forEach(d => {
      d.life--;
      const dhb = { x: d.x, y: ROW_Y[d.row], w: 16, h: 16 };
      const whb = WD.hitbox;
      if (d.row === WD.row && rectsOverlap(dhb, whb)) {
        if (d.type === 'health') {
          state.hp = Math.min(state.maxHp, state.hp + 25);
          spawnParticles(d.x, ROW_Y[d.row], '#00ff88', 8);
        }
        d.life = 0;
      }
    });
    drops = drops.filter(d => d.life > 0);

    // ── Projectiles ──
    projectiles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.life--;

      if (p.owner === 'player') {
        enemies.forEach(e => {
          if (e.row !== p.row) return;
          const ehb = getEnemyHitbox(e);
          const phb = { x: p.x, y: p.y, w: p.spriteW, h: p.spriteH };
          if (rectsOverlap(phb, ehb)) {
            e.hp -= p.damage;
            e.flashTimer = 8;
            spawnParticles(e.x + e.spriteW / 2, ROW_Y[e.row] + e.spriteH / 2, FB_O, 6);
            if (e.hp <= 0) killEnemy(e);
            p.life = 0;
          }
        });
      } else {
        // Enemy projectile
        const phb = { x: p.x, y: p.y, w: p.spriteW, h: p.spriteH };
        if (p.row === WD.row && rectsOverlap(phb, WD.hitbox)) {
          hurtPlayer(p.damage);
          p.life = 0;
        }
      }
    });
    projectiles = projectiles.filter(p => p.life > 0 && p.x > -32 && p.x < W + 32);

    // ── Particles ──
    particles.forEach(p => {
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.2;
      p.life--;
    });
    particles = particles.filter(p => p.life > 0);

    // ── Wave complete? ──
    if (!waveCleared && enemiesLeft === 0 && enemies.length === 0) {
      waveCleared = true;
      waveMessageTimer = 0;
      setTimeout(() => {
        state.wave++;
        startWave();
      }, 2000);
    }

    if (waveMessageTimer > 0) waveMessageTimer--;
  }

  // ─────────────────────────────────────────────
  // DRAW HELPERS
  // ─────────────────────────────────────────────
  function drawBackground() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#1a0000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // Stars
    ctx.fillStyle = 'rgba(255,200,200,0.6)';
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 + 7) % W);
      const sy = ((i * 97  + 3) % (GROUND_Y * 0.7));
      const ss = (i % 3 === 0) ? 2 : 1;
      ctx.fillRect(sx, sy, ss, ss);
    }

    // Row lanes (subtle)
    ROW_Y.forEach((ry, i) => {
      ctx.fillStyle = i % 2 === 0
        ? 'rgba(100,0,0,0.08)'
        : 'rgba(80,0,80,0.06)';
      ctx.fillRect(0, ry - 4, W, TILE * 2 + 8);
    });

    // Ground
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = COLORS.groundLine;
    ctx.fillRect(0, GROUND_Y, W, 3);

    // Lava cracks in ground
    ctx.strokeStyle = '#ff3300';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const gx = 40 + i * 95;
      ctx.beginPath();
      ctx.moveTo(gx, GROUND_Y + 3);
      ctx.lineTo(gx + 10, GROUND_Y + 12);
      ctx.lineTo(gx + 5, H);
      ctx.stroke();
    }
  }

  function drawHUD() {
    const hudH = 40;
    // BG
    ctx.fillStyle = COLORS.hud;
    ctx.fillRect(0, 0, W, hudH);
    ctx.fillStyle = COLORS.hudBorder;
    ctx.fillRect(0, hudH - 2, W, 2);

    // HP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(12, 10, 150, 16);
    const hpW = Math.floor(150 * (state.hp / state.maxHp));
    const hpColor = state.hp > 60 ? '#22cc44' : state.hp > 30 ? '#ffaa00' : '#ff2222';
    ctx.fillStyle = hpColor;
    ctx.fillRect(12, 10, hpW, 16);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 10, 150, 16);

    pixelText('HP', 168, 23, '#aaa', 10);

    // Spell pips
    for (let i = 0; i < state.maxSpell; i++) {
      ctx.fillStyle = i < state.spellUses ? '#aa44ff' : '#333';
      ctx.fillRect(12 + i * 20, 30, 14, 6);
    }
    pixelText('MP', 12 + state.maxSpell * 20 + 4, 36, '#aaa', 10);

    // Score
    pixelText('SCORE ' + String(state.score).padStart(7, '0'), W / 2 - 60, 23, COLORS.red, 12);

    // Level / wave
    pixelText(`LVL ${state.level}  WAVE ${state.wave}`, W - 160, 23, '#cc8800', 11);

    // Controls hint (tiny)
    pixelText('← → ↑ ↓ MOVE   Z ATK   X SPELL   C SHIELD', 12, H - 8, '#555', 9);
  }

  function pixelText(text, x, y, color, size = 12) {
    ctx.fillStyle = color;
    ctx.font = `${size}px monospace`;
    ctx.fillText(text, x, y);
  }

  function drawWolfdragon() {
    const wy = ROW_Y[WD.row];
    const blink = WD.invincible > 0 && Math.floor(WD.invincible / 4) % 2 === 0;
    if (blink) return;

    const sprite = WD.isAttacking ? SPRITE_WD_ATTACK : SPRITE_WD_IDLE;
    drawSprite(sprite, WD.x, wy, 2, WD.facing < 0);

    // Shield visual
    if (WD.isShielding) {
      const alpha = WD.shieldTimer / WD.shieldDuration;
      ctx.globalAlpha = alpha;
      drawSprite(SPRITE_SHIELD, WD.x - 4, wy + 4, 2);
      ctx.globalAlpha = 1;
    }
  }

  function drawEnemies() {
    enemies.forEach(e => {
      const ey = ROW_Y[e.row];
      if (e.flashTimer > 0 && Math.floor(e.flashTimer / 2) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      drawSprite(e.sprite, e.x, ey, 2, true); // demons face left (toward player)
      ctx.globalAlpha = 1;

      // HP bar above enemy
      if (e.hp < e.maxHp) {
        const bw = e.spriteW;
        ctx.fillStyle = '#330000';
        ctx.fillRect(e.x, ey - 6, bw, 3);
        ctx.fillStyle = '#cc2200';
        ctx.fillRect(e.x, ey - 6, Math.floor(bw * (e.hp / e.maxHp)), 3);
      }
    });
  }

  function drawProjectiles() {
    projectiles.forEach(p => {
      drawSprite(p.sprite, p.x, p.y, 2, p.owner === 'enemy');
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  function drawDrops() {
    drops.forEach(d => {
      const dy = ROW_Y[d.row];
      const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = d.type === 'health' ? '#00ff88' : '#ffdd00';
      // Draw a small cross / pickup icon
      ctx.fillRect(d.x + 4, d.y + 2,  8, 14);
      ctx.fillRect(d.x,     d.y + 6, 16,  6);
      ctx.globalAlpha = 1;
    });
  }

  function drawWaveMessage() {
    if (waveMessageTimer <= 0) return;
    const alpha = Math.min(1, waveMessageTimer / 30);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W / 2 - 120, H / 2 - 30, 240, 50);
    ctx.fillStyle = COLORS.red;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(waveMessage, W / 2, H / 2 + 6);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // ─────────────────────────────────────────────
  // SCREENS
  // ─────────────────────────────────────────────
  function drawTitleScreen() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Animated scanlines
    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, y, W, 2);
    }

    // Title glow
    const t = Date.now() / 1000;
    const glow = Math.sin(t * 1.5) * 0.3 + 0.7;
    ctx.shadowColor   = `rgba(200,0,0,${glow})`;
    ctx.shadowBlur    = 30;
    ctx.fillStyle     = '#cc0000';
    ctx.font          = 'bold 52px monospace';
    ctx.textAlign     = 'center';
    ctx.fillText('WOLFDRAGON', W / 2, 160);
    ctx.shadowBlur    = 0;

    ctx.fillStyle = '#880000';
    ctx.font      = '18px monospace';
    ctx.fillText('SLAY THE DEMON ARMY', W / 2, 200);

    ctx.fillStyle = '#666';
    ctx.font      = '13px monospace';
    ctx.fillText('ARROW KEYS  MOVE', W / 2, 280);
    ctx.fillText('Z  ATTACK     X  SPELL     C  BLOCK', W / 2, 304);

    const blink = Math.floor(t * 2) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#cc0000';
      ctx.font      = 'bold 16px monospace';
      ctx.fillText('PRESS ENTER TO BEGIN', W / 2, 360);
    }

    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#cc0000';
    ctx.font      = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 40);
    ctx.fillStyle = '#888';
    ctx.font      = '18px monospace';
    ctx.fillText(`SCORE: ${state.score}`, W / 2, H / 2 + 10);
    ctx.fillStyle = '#555';
    ctx.font      = '14px monospace';
    ctx.fillText('PRESS ENTER TO RETRY', W / 2, H / 2 + 50);
    ctx.textAlign = 'left';
  }

  // ─────────────────────────────────────────────
  // TITLE / GAMEOVER INPUT
  // ─────────────────────────────────────────────
  function handleMenuInput() {
    if (consumeJustPressed('Enter') || consumeJustPressed('Space')) {
      if (state.screen === 'title' || state.screen === 'gameover') {
        resetGame();
      }
    }
  }

  function resetGame() {
    Object.assign(state, {
      screen:    'playing',
      score:     0,
      level:     1,
      wave:      1,
      hp:        100,
      maxHp:     100,
      spellUses: 2,
      maxSpell:  2,
    });
    WD.x          = 80;
    WD.row        = 0;
    WD.facing     = 1;
    WD.attackTimer = 0;
    WD.shieldTimer = 0;
    WD.invincible  = 0;
    enemies     = [];
    projectiles = [];
    particles   = [];
    drops       = [];
    startWave();
  }

  // ─────────────────────────────────────────────
  // MAIN LOOP
  // ─────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);

    if (state.screen === 'title') {
      drawTitleScreen();
      handleMenuInput();
      return;
    }

    if (state.screen === 'gameover') {
      // draw the game frozen underneath
      drawBackground();
      drawDrops();
      drawEnemies();
      drawProjectiles();
      drawWolfdragon();
      drawParticles();
      drawHUD();
      drawGameOverScreen();
      handleMenuInput();
      return;
    }

    // Playing
    drawBackground();
    drawDrops();
    drawEnemies();
    drawProjectiles();
    drawWolfdragon();
    drawParticles();
    drawWaveMessage();
    drawHUD();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // ─────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────
  if (overlay) overlay.classList.add('hidden');
  loop();

})();
