/**
 * WOLFDRAGON — Browser Game  v0.5
 *
 * v0.5:
 *   - Vector sprite drawing: all characters use Canvas 2D bezier curves + gradients
 *   - WolfDragon: purple dragon-wolf, large bat wings, wolf head, red eye, sash, tail
 *   - Grunt: lean red hunched demon, reaching claws
 *   - Archer: slim robed demon caster, raised casting arm
 *   - Brute: massive armored red demon, huge horns, thick arms
 *   - Gameplay fixes: no shield+attack combo, melee collision harms only player,
 *                     fireballs cross rows and fire regardless of row
 */

(function () {
  'use strict';

  const canvas  = document.getElementById('game-canvas');
  const ctx     = canvas.getContext('2d');
  const overlay = document.querySelector('.game-coming-soon');

  const W = 800, H = 480;
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingEnabled = false;

  const ROWS     = 3;
  const GROUND_Y = H - 22;
  const SC2      = 3;   // scale for pixel-art projectile/shield/health sprites
  const ROW_Y    = [GROUND_Y - 88, GROUND_Y - 178, GROUND_Y - 268];

  // ─── pixel renderer (projectiles, shield, health drops only) ─────────────
  function spr(grid, x, y, scale, flipX) {
    scale = scale || SC2;
    const R = grid.length, C = grid[0].length;
    for (let r=0;r<R;r++) for (let c=0;c<C;c++) {
      const col = grid[r][c];
      if (!col) continue;
      ctx.fillStyle = col;
      const px = flipX ? x+(C-1-c)*scale : x+c*scale;
      ctx.fillRect(px, y+r*scale, scale, scale);
    }
  }

  const _ = null;

  // ── Projectile sprites ─────────────────────────────────────────────────────
  const FY='#ffee44',FO='#ff8800',FR='#ff3300',FW2='#ffffff';
  const SPR_FB = [
    [ _,  _,  FO, FO, FO, _,  _,  _ ],
    [ _,  FO, FY, FY, FY, FO, _,  _ ],
    [ FO, FY, FW2,FY, FW2,FY, FO, _ ],
    [ FO, FY, FY, FY, FY, FY, FO, _ ],
    [ FO, FY, FW2,FY, FW2,FY, FO, _ ],
    [ _,  FO, FY, FY, FY, FO, _,  _ ],
    [ _,  _,  FR, FR, FR, _,  _,  _ ],
    [ _,  _,  _,  _,  _,  _,  _,  _ ],
  ];
  const SP2='#aa00ff';
  const SPR_SPELL = [
    [ _,  _,   SP2, FO, FO, FO, SP2, _,  _,  _ ],
    [ _,  SP2, FO,  FY, FY, FY, FO,  SP2,_,  _ ],
    [ SP2,FO,  FY,  FW2,FY, FW2,FY,  FO, SP2,_ ],
    [ FO, FY,  FW2, FY, FY, FY, FW2, FY, FO, _ ],
    [ FO, FY,  FY,  FY, FW2,FY, FY,  FY, FO, _ ],
    [ FO, FY,  FW2, FY, FY, FY, FW2, FY, FO, _ ],
    [ SP2,FO,  FY,  FW2,FY, FW2,FY,  FO, SP2,_ ],
    [ _,  SP2, FO,  FY, FY, FY, FO,  SP2,_,  _ ],
    [ _,  _,   SP2, FR, FR, FR, SP2, _,  _,  _ ],
    [ _,  _,   _,   _,  _,  _,  _,   _,  _,  _ ],
  ];

  // Shield
  const SB='#4499ff',SW='#aaddff',SD='#1155aa',ST='#ffffff';
  const SPR_SHIELD = [
    [_,_,SD,SB,SB,SB,SB,SB,SB,SD,_,_],
    [_,SD,SB,SW,SW,SW,SW,SW,SW,SB,SD,_],
    [SD,SB,SW,ST,SD,SD,SD,SD,ST,SW,SB,SD],
    [SB,SW,SD,SD,SW,SW,SW,SW,SD,SD,SW,SB],
    [SB,SW,SD,SW,ST,SW,SW,ST,SW,SD,SW,SB],
    [SB,SW,SD,SW,SW,SW,SW,SW,SW,SD,SW,SB],
    [SB,SW,SD,SW,ST,SW,SW,ST,SW,SD,SW,SB],
    [SB,SW,SD,SD,SW,SW,SW,SW,SD,SD,SW,SB],
    [SD,SB,SW,ST,SD,SD,SD,SD,ST,SW,SB,SD],
    [_,SD,SB,SW,SW,SW,SW,SW,SW,SB,SD,_],
    [_,_,SD,SB,SB,SB,SB,SB,SB,SD,_,_],
    [_,_,_,_,SD,SB,SB,SD,_,_,_,_],
  ];

  // Health drop
  const HG='#00ee88',HG2='#00aa55',HW='#aaffcc';
  const SPR_HEALTH = [
    [_,_,HG2,HG,HG,HG2,_,_],
    [_,HG2,HG,HW,HW,HG,HG2,_],
    [HG2,HG,HW,HG,HG,HW,HG,HG2],
    [HG,HW,HG,HG2,HG2,HG,HW,HG],
    [HG,HW,HG,HG2,HG2,HG,HW,HG],
    [HG2,HG,HW,HG,HG,HW,HG,HG2],
    [_,HG2,HG,HW,HW,HG,HG2,_],
    [_,_,HG2,HG,HG,HG2,_,_],
  ];

  // ─── sprite sizes ─────────────────────────────────────────────────────────
  const WD_W   = 66, WD_H   = 90;
  const GRUNT_W = 64, GRUNT_H = 96;
  const ARCH_W  = 56, ARCH_H  = 88;
  const BRUTE_W = 80, BRUTE_H = 112;
  const FB_W    = SPR_FB[0].length    * SC2;
  const FB_H    = SPR_FB.length       * SC2;
  const SP_W    = SPR_SPELL[0].length * SC2;
  const SP_H    = SPR_SPELL.length    * SC2;

  // ═══════════════════════════════════════════════════════════════════════════
  //  VECTOR SPRITE DRAW FUNCTIONS
  //  All characters drawn facing RIGHT by default.
  //  Pass flipX=true to mirror (face left).
  //  Coordinates are local to the sprite bounding box (0,0 = top-left).
  // ═══════════════════════════════════════════════════════════════════════════

  // ── WOLFDRAGON (66×90) ────────────────────────────────────────────────────
  // Purple dragon-wolf: bat wings, wolf head with snout right, horns,
  // glowing red eye, red sash, dragon tail, digitigrade legs.
  function drawWDSprite(ox, oy, flipX, atk) {
    ctx.save();
    if (flipX) { ctx.translate(ox + WD_W, oy); ctx.scale(-1, 1); }
    else        { ctx.translate(ox, oy); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // TAIL — curling from lower-left body
    ctx.beginPath();
    ctx.moveTo(15, 58);
    ctx.bezierCurveTo(2, 68, -6, 80, 4, 87);
    ctx.bezierCurveTo(10, 92, 18, 88, 12, 82);
    ctx.strokeStyle = '#7a1c50'; ctx.lineWidth = 9; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(15, 58);
    ctx.bezierCurveTo(3, 67, -4, 78, 5, 85);
    ctx.strokeStyle = '#4a1030'; ctx.lineWidth = 5; ctx.stroke();

    // BAT WINGS — large, behind body (3 angular fingers)
    const wg = ctx.createLinearGradient(1, 3, 22, 58);
    wg.addColorStop(0, '#1a0835'); wg.addColorStop(0.55, '#2e1260'); wg.addColorStop(1, '#441a7a');
    ctx.beginPath();
    ctx.moveTo(22, 30);   // wing root at shoulder
    ctx.lineTo(1,  3);    // apex / finger 1 tip
    ctx.lineTo(8,  24);   // notch
    ctx.lineTo(0,  36);   // finger 2 tip
    ctx.lineTo(5,  50);   // notch
    ctx.lineTo(2,  60);   // finger 3 tip
    ctx.lineTo(20, 55);   // wing base lower
    ctx.closePath();
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = '#6828a8'; ctx.lineWidth = 1.5; ctx.stroke();
    // Leading-edge finger bones
    ctx.strokeStyle = '#8822cc'; ctx.lineWidth = 1.5;
    [[22,30, 1,3],[22,36, 0,36],[22,48, 2,60]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });

    // BACK LEG (left, slightly faded)
    ctx.save(); ctx.globalAlpha = 0.65;
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(22,64); ctx.lineTo(16,76); ctx.lineTo(10,84); ctx.lineTo(8,90);
    ctx.strokeStyle = '#2e1260'; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#d0c4f0';
    [[8,90,4,87],[8,90,6,91],[8,90,11,90]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    ctx.restore();

    // BODY — muscular purple torso
    const bg = ctx.createRadialGradient(33, 44, 4, 33, 44, 22);
    bg.addColorStop(0, '#ac66e8'); bg.addColorStop(0.5, '#6830b0'); bg.addColorStop(1, '#2e1260');
    ctx.beginPath();
    ctx.moveTo(22, 30);
    ctx.bezierCurveTo(14, 32, 12, 40, 14, 52);
    ctx.bezierCurveTo(16, 62, 22, 67, 31, 67);
    ctx.bezierCurveTo(41, 67, 48, 60, 48, 51);
    ctx.bezierCurveTo(50, 40, 46, 30, 40, 27);
    ctx.bezierCurveTo(34, 22, 27, 25, 22, 30);
    ctx.closePath();
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = '#080012'; ctx.lineWidth = 1.5; ctx.stroke();

    // RED SASH at waist
    ctx.beginPath(); ctx.ellipse(31, 63, 13, 5, 0, 0, Math.PI*2);
    ctx.fillStyle = '#aa1133'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(29, 61, 7, 2.5, -0.15, 0, Math.PI*2);
    ctx.fillStyle = '#ee3355'; ctx.fill();

    // FRONT LEG (right, digitigrade)
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(36,64); ctx.lineTo(40,76); ctx.lineTo(46,84); ctx.lineTo(50,90);
    ctx.strokeStyle = '#4a1e88'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(36,64); ctx.lineTo(40,76); ctx.lineTo(46,84); ctx.lineTo(50,90);
    ctx.strokeStyle = '#6830b0'; ctx.lineWidth = 6; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#d0c4f0';
    [[50,90,46,87],[50,90,48,91],[50,90,53,89]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });

    // ARM + CLAWS (reaches further when attacking)
    const ax = atk ? 62 : 56;
    const ay = atk ? 42 : 38;
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(44,37); ctx.quadraticCurveTo(52,34,ax,ay);
    ctx.strokeStyle = '#4a1e88'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(44,37); ctx.quadraticCurveTo(52,34,ax,ay);
    ctx.strokeStyle = '#6830b0'; ctx.lineWidth = 5; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#d0c4f0';
    [[-5,-3],[0,0],[5,3]].forEach(([dy,slant])=>{
      ctx.beginPath(); ctx.moveTo(ax+slant, ay+dy); ctx.lineTo(ax+slant+8, ay+dy-3); ctx.stroke();
    });

    // NECK
    ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(38,28); ctx.lineTo(44,16);
    ctx.strokeStyle = '#4a1e88'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(38,28); ctx.lineTo(44,16);
    ctx.strokeStyle = '#6830b0'; ctx.lineWidth = 7; ctx.stroke();

    // HEAD — wolf skull
    const hg = ctx.createRadialGradient(47,13,2,47,13,14);
    hg.addColorStop(0, '#8a48cc'); hg.addColorStop(0.6, '#4a1e88'); hg.addColorStop(1, '#18083a');
    ctx.beginPath(); ctx.ellipse(46,13,13,11,0.2,0,Math.PI*2);
    ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = '#080012'; ctx.lineWidth = 1.5; ctx.stroke();

    // HORNS (two curved, one behind one front)
    ctx.beginPath(); ctx.moveTo(41,5); ctx.bezierCurveTo(36,-4,30,-2,34,7);
    ctx.strokeStyle = '#7720aa'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(41,5); ctx.bezierCurveTo(37,-2,32,0,35,6);
    ctx.strokeStyle = '#aa44dd'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(53,3); ctx.bezierCurveTo(58,-4,63,-1,59,8);
    ctx.strokeStyle = '#7720aa'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(53,3); ctx.bezierCurveTo(57,-3,61,0,58,7);
    ctx.strokeStyle = '#aa44dd'; ctx.lineWidth = 1.5; ctx.stroke();

    // SNOUT (wolf muzzle pointing right)
    if (atk) {
      // Upper jaw open
      ctx.beginPath(); ctx.moveTo(52,11);
      ctx.bezierCurveTo(57,8,64,9,65,13);
      ctx.bezierCurveTo(64,15,60,15,55,15); ctx.lineTo(52,15); ctx.closePath();
      ctx.fillStyle = '#4a1e88'; ctx.fill();
      ctx.strokeStyle = '#080012'; ctx.lineWidth = 1; ctx.stroke();
      // Lower jaw
      ctx.beginPath(); ctx.moveTo(52,16);
      ctx.bezierCurveTo(57,18,63,19,65,17);
      ctx.bezierCurveTo(64,20,58,22,53,21); ctx.lineTo(52,19); ctx.closePath();
      ctx.fillStyle = '#4a1e88'; ctx.fill();
      ctx.strokeStyle = '#080012'; ctx.lineWidth = 1; ctx.stroke();
      // Mouth interior dark
      ctx.beginPath(); ctx.moveTo(52,15); ctx.lineTo(65,14); ctx.lineTo(64,17); ctx.lineTo(52,16); ctx.closePath();
      ctx.fillStyle = '#100008'; ctx.fill();
      // Fangs
      ctx.beginPath(); ctx.moveTo(57,15); ctx.lineTo(59,12); ctx.lineTo(61,15); ctx.fillStyle='#f0f0f0'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(57,16); ctx.lineTo(59,19); ctx.lineTo(61,16); ctx.fillStyle='#f0f0f0'; ctx.fill();
    } else {
      // Closed muzzle
      ctx.beginPath(); ctx.moveTo(52,11);
      ctx.bezierCurveTo(57,8,64,10,65,13);
      ctx.bezierCurveTo(64,17,59,18,55,17);
      ctx.bezierCurveTo(53,20,50,20,50,17); ctx.lineTo(52,11); ctx.closePath();
      ctx.fillStyle = '#4a1e88'; ctx.fill();
      ctx.strokeStyle = '#080012'; ctx.lineWidth = 1; ctx.stroke();
      // Fang hint
      ctx.beginPath(); ctx.moveTo(62,15); ctx.lineTo(64,12); ctx.lineTo(65,15); ctx.fillStyle='#f0f0f0'; ctx.fill();
    }

    // EYE — glowing red
    ctx.beginPath(); ctx.arc(50,11,5,0,Math.PI*2);
    ctx.fillStyle = 'rgba(255,136,0,0.25)'; ctx.fill();
    ctx.beginPath(); ctx.arc(50,11,3.5,0,Math.PI*2);
    ctx.fillStyle = '#ff8800'; ctx.fill();
    ctx.beginPath(); ctx.arc(50,11,2.5,0,Math.PI*2);
    ctx.fillStyle = '#ff1111'; ctx.fill();
    ctx.beginPath(); ctx.arc(51,10,1,0,Math.PI*2);
    ctx.fillStyle = '#ffffc0'; ctx.fill();

    ctx.restore();
  }

  // ── GRUNT DEMON (64×96) ───────────────────────────────────────────────────
  // Lean red humanoid, hunched forward, long reaching arms with claws.
  function drawGruntSprite(ox, oy, flipX) {
    ctx.save();
    if (flipX) { ctx.translate(ox + GRUNT_W, oy); ctx.scale(-1, 1); }
    else        { ctx.translate(ox, oy); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // HORNS
    ctx.beginPath(); ctx.moveTo(38,8); ctx.bezierCurveTo(33,0,27,2,30,10);
    ctx.strokeStyle = '#cc9900'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(48,6); ctx.bezierCurveTo(53,-2,58,1,54,9);
    ctx.strokeStyle = '#cc9900'; ctx.lineWidth = 3; ctx.stroke();

    // HEAD
    const hg = ctx.createRadialGradient(42,14,2,42,14,12);
    hg.addColorStop(0, '#ff4422'); hg.addColorStop(0.6, '#cc2200'); hg.addColorStop(1, '#881000');
    ctx.beginPath(); ctx.ellipse(42,14,12,10,0.15,0,Math.PI*2);
    ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = '#080012'; ctx.lineWidth = 1.5; ctx.stroke();
    // Eyes
    ctx.beginPath(); ctx.ellipse(47,11,3,2.5,0,0,Math.PI*2); ctx.fillStyle='#ffee44'; ctx.fill();
    ctx.beginPath(); ctx.arc(47,11,1.5,0,Math.PI*2); ctx.fillStyle='#220000'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(37,12,2.5,2,0,0,Math.PI*2); ctx.fillStyle='#ffee44'; ctx.fill();
    ctx.beginPath(); ctx.arc(37,12,1.2,0,Math.PI*2); ctx.fillStyle='#220000'; ctx.fill();
    // Fangs
    ctx.beginPath(); ctx.moveTo(50,18); ctx.lineTo(52,22); ctx.lineTo(54,18); ctx.fillStyle='#f0f0f0'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(44,19); ctx.lineTo(46,23); ctx.lineTo(48,19); ctx.fillStyle='#f0f0f0'; ctx.fill();

    // BODY — hunched, leaning forward
    const bg = ctx.createRadialGradient(36,45,4,36,45,20);
    bg.addColorStop(0, '#ff4422'); bg.addColorStop(0.6, '#cc2200'); bg.addColorStop(1, '#661500');
    ctx.beginPath();
    ctx.moveTo(40,24);
    ctx.bezierCurveTo(48,26,52,36,50,50);
    ctx.bezierCurveTo(48,60,40,64,32,64);
    ctx.bezierCurveTo(20,64,14,56,14,48);
    ctx.bezierCurveTo(12,36,22,28,28,24);
    ctx.closePath();
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = '#080012'; ctx.lineWidth = 1.5; ctx.stroke();

    // RIGHT ARM — reaching forward with claws
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(46,36); ctx.quadraticCurveTo(56,40,62,52);
    ctx.strokeStyle = '#881000'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(46,36); ctx.quadraticCurveTo(56,40,62,52);
    ctx.strokeStyle = '#cc2200'; ctx.lineWidth = 5; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#e8c8a0';
    [[62,52,64,47],[62,52,65,52],[62,52,63,57]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });

    // LEFT ARM — back, partially visible
    ctx.save(); ctx.globalAlpha = 0.5;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(20,36); ctx.quadraticCurveTo(12,44,8,56);
    ctx.strokeStyle = '#661500'; ctx.stroke();
    ctx.restore();

    // LEGS
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(40,60); ctx.lineTo(44,74); ctx.lineTo(48,84); ctx.lineTo(52,96);
    ctx.strokeStyle = '#881000'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40,60); ctx.lineTo(44,74); ctx.lineTo(48,84); ctx.lineTo(52,96);
    ctx.strokeStyle = '#cc2200'; ctx.lineWidth = 6; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#e8c8a0';
    [[52,96,48,93],[52,96,50,97],[52,96,54,95]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    ctx.save(); ctx.globalAlpha = 0.6;
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(28,60); ctx.lineTo(26,74); ctx.lineTo(22,84); ctx.lineTo(18,96);
    ctx.strokeStyle = '#661500'; ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // ── ARCHER DEMON (56×88) ─────────────────────────────────────────────────
  // Slim robed demon caster, raised arm glowing with energy ball.
  function drawArcherSprite(ox, oy, flipX) {
    ctx.save();
    if (flipX) { ctx.translate(ox + ARCH_W, oy); ctx.scale(-1, 1); }
    else        { ctx.translate(ox, oy); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // HORNS
    ctx.beginPath(); ctx.moveTo(25,6); ctx.bezierCurveTo(21,0,16,2,19,8);
    ctx.strokeStyle = '#cc9900'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(34,4); ctx.bezierCurveTo(38,-2,43,1,39,8);
    ctx.strokeStyle = '#cc9900'; ctx.lineWidth = 2.5; ctx.stroke();

    // HEAD
    const hg = ctx.createRadialGradient(30,12,2,30,12,11);
    hg.addColorStop(0, '#cc3300'); hg.addColorStop(0.6, '#aa2800'); hg.addColorStop(1, '#661500');
    ctx.beginPath(); ctx.ellipse(29,12,11,9,0,0,Math.PI*2);
    ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = '#080012'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(35,10,2.5,2,0,0,Math.PI*2); ctx.fillStyle='#ffee44'; ctx.fill();
    ctx.beginPath(); ctx.arc(35,10,1.2,0,Math.PI*2); ctx.fillStyle='#1a0000'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(36,16); ctx.lineTo(38,20); ctx.lineTo(40,16); ctx.fillStyle='#f0f0f0'; ctx.fill();

    // ROBED BODY
    const rg = ctx.createLinearGradient(12,20,42,66);
    rg.addColorStop(0, '#2a3a88'); rg.addColorStop(0.5, '#1a2a66'); rg.addColorStop(1, '#0e1844');
    ctx.beginPath();
    ctx.moveTo(26,20);
    ctx.bezierCurveTo(18,22,12,32,12,46);
    ctx.bezierCurveTo(12,58,18,66,26,66);
    ctx.bezierCurveTo(34,66,42,60,42,48);
    ctx.bezierCurveTo(44,36,38,24,32,20);
    ctx.closePath();
    ctx.fillStyle = rg; ctx.fill();
    ctx.strokeStyle = '#080012'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = '#3a4aaa'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(27,22); ctx.lineTo(25,64); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(31,22); ctx.lineTo(33,64); ctx.stroke();

    // RAISED CASTING ARM
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(38,32); ctx.quadraticCurveTo(48,22,52,14);
    ctx.strokeStyle = '#661500'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(38,32); ctx.quadraticCurveTo(48,22,52,14);
    ctx.strokeStyle = '#aa2800'; ctx.lineWidth = 4; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#e8c8a0';
    [[52,14,49,10],[52,14,53,10],[52,14,55,14]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    // Glowing energy orb
    const eg = ctx.createRadialGradient(52,14,1,52,14,5);
    eg.addColorStop(0,'rgba(255,200,0,0.9)'); eg.addColorStop(1,'rgba(255,80,0,0)');
    ctx.beginPath(); ctx.arc(52,14,5,0,Math.PI*2); ctx.fillStyle=eg; ctx.fill();

    // LEGS
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(30,64); ctx.lineTo(34,76); ctx.lineTo(38,84); ctx.lineTo(42,88);
    ctx.strokeStyle = '#661500'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30,64); ctx.lineTo(34,76); ctx.lineTo(38,84); ctx.lineTo(42,88);
    ctx.strokeStyle = '#aa2800'; ctx.lineWidth = 5; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#e8c8a0';
    [[42,88,38,85],[42,88,40,89],[42,88,44,87]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    ctx.save(); ctx.globalAlpha = 0.6;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(20,64); ctx.lineTo(18,76); ctx.lineTo(14,84); ctx.lineTo(10,88);
    ctx.strokeStyle = '#661500'; ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // ── BRUTE DEMON (80×112) ──────────────────────────────────────────────────
  // Massive armored red demon — wide chest, huge golden horns, giant arms.
  function drawBruteSprite(ox, oy, flipX) {
    ctx.save();
    if (flipX) { ctx.translate(ox + BRUTE_W, oy); ctx.scale(-1, 1); }
    else        { ctx.translate(ox, oy); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // HUGE HORNS
    ctx.beginPath(); ctx.moveTo(28,10); ctx.bezierCurveTo(18,-6,8,-4,12,12);
    ctx.strokeStyle = '#ccaa00'; ctx.lineWidth = 7; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28,10); ctx.bezierCurveTo(20,-4,11,-3,14,10);
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(52,10); ctx.bezierCurveTo(62,-6,72,-4,68,12);
    ctx.strokeStyle = '#ccaa00'; ctx.lineWidth = 7; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(52,10); ctx.bezierCurveTo(60,-4,69,-3,66,10);
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2.5; ctx.stroke();

    // HEAD
    const hg = ctx.createRadialGradient(40,18,3,40,18,18);
    hg.addColorStop(0, '#ff3311'); hg.addColorStop(0.6, '#991800'); hg.addColorStop(1, '#550d00');
    ctx.beginPath(); ctx.ellipse(40,18,18,15,0,0,Math.PI*2);
    ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = '#080012'; ctx.lineWidth = 2; ctx.stroke();
    // Armored brow plate
    ctx.beginPath();
    ctx.moveTo(22,12); ctx.lineTo(58,12); ctx.lineTo(56,20); ctx.lineTo(24,20); ctx.closePath();
    ctx.fillStyle = '#4a4a4a'; ctx.fill(); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1; ctx.stroke();
    // Eyes
    ctx.beginPath(); ctx.ellipse(31,16,4,3,0,0,Math.PI*2); ctx.fillStyle='#ffee44'; ctx.fill();
    ctx.beginPath(); ctx.arc(31,16,2,0,Math.PI*2); ctx.fillStyle='#110000'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(49,16,4,3,0,0,Math.PI*2); ctx.fillStyle='#ffee44'; ctx.fill();
    ctx.beginPath(); ctx.arc(49,16,2,0,Math.PI*2); ctx.fillStyle='#110000'; ctx.fill();
    // Fangs
    ctx.beginPath(); ctx.moveTo(34,26); ctx.lineTo(32,32); ctx.lineTo(36,26); ctx.fillStyle='#f0f0f0'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(44,26); ctx.lineTo(42,32); ctx.lineTo(46,26); ctx.fillStyle='#f0f0f0'; ctx.fill();

    // MASSIVE ARMORED CHEST + BODY
    const cg = ctx.createLinearGradient(6,28,74,76);
    cg.addColorStop(0, '#707070'); cg.addColorStop(0.4, '#4a4a4a'); cg.addColorStop(1, '#2a2a2a');
    ctx.beginPath();
    ctx.moveTo(10,32);
    ctx.bezierCurveTo(4,36,2,48,6,60);
    ctx.bezierCurveTo(10,70,18,76,28,76);
    ctx.lineTo(52,76);
    ctx.bezierCurveTo(62,76,70,70,74,60);
    ctx.bezierCurveTo(78,48,76,36,70,32);
    ctx.bezierCurveTo(62,24,56,22,40,22);
    ctx.bezierCurveTo(24,22,18,24,10,32);
    ctx.closePath();
    ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = '#080012'; ctx.lineWidth = 2; ctx.stroke();
    // Armor plate lines
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(40,24); ctx.lineTo(40,74); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8,50); ctx.lineTo(72,50); ctx.stroke();

    // GIANT ARMS
    ctx.lineWidth = 15;
    ctx.beginPath(); ctx.moveTo(66,38); ctx.quadraticCurveTo(76,54,76,72);
    ctx.strokeStyle = '#4a4a4a'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(66,38); ctx.quadraticCurveTo(76,54,76,72);
    ctx.strokeStyle = '#707070'; ctx.lineWidth = 9; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#e8c8a0';
    [[76,72,72,68],[76,72,74,74],[76,72,79,70],[76,72,78,75]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    ctx.save(); ctx.globalAlpha = 0.6;
    ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(14,38); ctx.quadraticCurveTo(4,54,4,72);
    ctx.strokeStyle = '#2a2a2a'; ctx.stroke();
    ctx.restore();

    // LEGS
    ctx.lineWidth = 15;
    ctx.beginPath(); ctx.moveTo(52,74); ctx.lineTo(56,90); ctx.lineTo(60,102); ctx.lineTo(62,112);
    ctx.strokeStyle = '#3a3a3a'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(52,74); ctx.lineTo(56,90); ctx.lineTo(60,102); ctx.lineTo(62,112);
    ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 9; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#e8c8a0';
    [[62,112,58,108],[62,112,60,113],[62,112,65,110]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    ctx.save(); ctx.globalAlpha = 0.6;
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(28,74); ctx.lineTo(24,90); ctx.lineTo(20,102); ctx.lineTo(18,112);
    ctx.strokeStyle = '#2a2a2a'; ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // ─── enemy type definitions ───────────────────────────────────────────────
  const ENEMY_TYPES = {
    grunt: {
      drawFn: drawGruntSprite, w: GRUNT_W, h: GRUNT_H,
      hp: 40, speed: 0.9, shootCd: 180, dmg: 10, score: 100,
      dropRate: 0.15, spellDrop: 0.04,
    },
    archer: {
      drawFn: drawArcherSprite, w: ARCH_W, h: ARCH_H,
      hp: 25, speed: 0.55, shootCd: 90, dmg: 8, score: 150,
      dropRate: 0.12, spellDrop: 0.10,  // archers drop spell refills more often
      minX: 420,
    },
    brute: {
      drawFn: drawBruteSprite, w: BRUTE_W, h: BRUTE_H,
      hp: 120, speed: 0.4, shootCd: 999, dmg: 22, score: 250,
      dropRate: 0.4, spellDrop: 0.20,
    },
  };

  // ─── game state ───────────────────────────────────────────────────────────
  const gs = {
    screen: 'title',
    score: 0, level: 1, wave: 1,
    hp: 140, maxHp: 140,
    spellUses: 3, maxSpell: 3,
  };

  // ─── player ───────────────────────────────────────────────────────────────
  const PL = {
    row: 0, x: 70,
    speed: 4, facing: 1,
    atkTimer: 0, atkDur: 14,
    atkRange: 72,
    slashTimer: 0,
    shTimer: 0, shDur: 999,
    iframes: 0,
    weapon: { name:'Dragon Claws', dmg: 25 },
    spell:  { name:'Fire Breath',  dmg: 60 },
    shield: { name:'Scale Shield', block: 50 },
    get w()  { return WD_W; },
    get h()  { return WD_H; },
    get cx() { return this.x + this.w/2; },
    get cy() { return ROW_Y[this.row] + this.h/2; },
    get hb() { return { x:this.x+12, y:ROW_Y[this.row]+10, w:this.w-24, h:this.h-16 }; },
    get atk(){ return this.atkTimer > 0; },
    // Shield only active if holding C AND not currently attacking
    get sh() { return K['KeyC'] === true && this.atkTimer <= 0; },
  };

  // ─── input ────────────────────────────────────────────────────────────────
  const K={}, J={};
  window.addEventListener('keydown', e=>{
    if(!K[e.code]) J[e.code]=true;
    K[e.code]=true;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e=>{ K[e.code]=false; });
  function eat(c){ if(J[c]){J[c]=false;return true;} return false; }

  // ─── entity lists ─────────────────────────────────────────────────────────
  let enemies=[], projs=[], parts=[], drops=[];

  // ─── particles ────────────────────────────────────────────────────────────
  function burst(x,y,col,n,spd){
    n=n||10; spd=spd||5;
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2, v=(0.3+Math.random()*0.7)*spd;
      parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,
        life:18+Math.random()*22,maxLife:40,col,sz:2+Math.random()*3});
    }
  }

  // ─── waves ────────────────────────────────────────────────────────────────
  let spawnT=0, spawnRate=120, leftToSpawn=0, cleared=false, msgT=0, msg='';
  let spawnQueue=[];

  function buildWaveQueue() {
    const wi = ((gs.wave-1)%3)+1;
    const count = 5 + wi*2 + gs.level;
    spawnQueue = [];
    for(let i=0;i<count;i++){
      const r = Math.random();
      if(gs.level >= 2 && r < 0.20) spawnQueue.push('brute');
      else if(gs.level >= 1 && r < 0.45) spawnQueue.push('archer');
      else spawnQueue.push('grunt');
    }
    for(let i=spawnQueue.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [spawnQueue[i],spawnQueue[j]]=[spawnQueue[j],spawnQueue[i]];
    }
    leftToSpawn = spawnQueue.length;
  }

  function startWave() {
    buildWaveQueue();
    spawnRate = Math.max(50, 130 - gs.level*7);
    spawnT=0; cleared=false;
    msg=`WAVE ${gs.wave}`; msgT=130;
  }

  function spawnEnemy() {
    if(!spawnQueue.length) return;
    const type = spawnQueue.pop();
    leftToSpawn = spawnQueue.length;
    const def  = ENEMY_TYPES[type];
    const row  = Math.floor(Math.random()*ROWS);
    const landX= (type==='archer')
      ? 480 + Math.random()*120
      : W - 60 - Math.random()*120;

    enemies.push({
      type, row,
      x: landX,
      y: -def.h,
      targetY: ROW_Y[row],
      phase: 'drop',
      dropSpd: 4 + Math.random()*2,
      hp: def.hp + gs.level*10,
      maxHp: def.hp + gs.level*10,
      speed: def.speed + gs.level*0.1,
      shootT: def.shootCd * 0.5,
      flashT: 0,
      facing: -1,
      score: def.score + gs.level*15,
      minX: def.minX || 0,
    });
  }

  // ─── collision ────────────────────────────────────────────────────────────
  function ov(a,b){ return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y; }
  function ehb(e){
    const def=ENEMY_TYPES[e.type];
    return {x:e.x+6, y:e.y+8, w:def.w-12, h:def.h-12};
  }

  // ─── combat ───────────────────────────────────────────────────────────────
  function doAttack() {
    if(PL.atk) return;
    PL.atkTimer  = PL.atkDur;
    PL.slashTimer = PL.atkDur;
    const box = {
      x: PL.facing>0 ? PL.x+PL.w-10 : PL.x-PL.atkRange+10,
      y: ROW_Y[PL.row]-6,
      w: PL.atkRange, h: PL.h+12,
    };
    enemies.forEach(e=>{
      if(e.phase!=='charge') return;
      if(e.row !== PL.row) return;
      if(ov(box, ehb(e))) hitEnemy(e, PL.weapon.dmg);
    });
  }

  function doSpell() {
    if(gs.spellUses<=0) return;
    gs.spellUses--;
    projs.push({x:PL.cx, y:ROW_Y[PL.row]+PL.h/2-SP_H/2,
      vx:PL.facing*12, vy:0, row:PL.row,
      dmg:PL.spell.dmg, owner:'player',
      spr:SPR_SPELL, w:SP_W, h:SP_H, life:160});
    burst(PL.cx, PL.cy, '#aa44ff', 16);
  }

  function hitEnemy(e,dmg) {
    e.hp-=dmg; e.flashT=9;
    burst(e.x+ENEMY_TYPES[e.type].w/2, e.y+ENEMY_TYPES[e.type].h/2, '#ff4422', 9);
    if(e.hp<=0) killEnemy(e);
  }

  function killEnemy(e) {
    e.hp=0; gs.score+=e.score;
    const def = ENEMY_TYPES[e.type];
    const cx = e.x + def.w/2, cy = e.y + def.h/2;
    burst(cx, cy, '#cc2200', 20, 7);
    if(Math.random() < def.dropRate)
      drops.push({x:e.x, y:e.y, row:e.row, type:'health', life:360});
    if(Math.random() < def.spellDrop)
      drops.push({x:e.x + def.w/2 - 10, y:e.y, row:e.row, type:'spell', life:360});
  }

  let blockMsg = 0;

  function hurtPlayer(dmg) {
    if(PL.sh) {
      burst(PL.cx, PL.cy, SB, 18, 6);
      blockMsg = 40;
      return;
    }
    if(PL.iframes>0) return;
    gs.hp=Math.max(0,gs.hp-dmg);
    PL.iframes=70;
    burst(PL.cx,PL.cy,'#ff3333',12);
    if(gs.hp<=0) gs.screen='gameover';
  }

  // ─── update ───────────────────────────────────────────────────────────────
  function update() {
    if(gs.screen!=='playing') return;

    // movement
    if(eat('ArrowUp')   && PL.row<ROWS-1) PL.row++;
    if(eat('ArrowDown') && PL.row>0)      PL.row--;
    if(K['ArrowLeft'])  { PL.x-=PL.speed; PL.facing=-1; }
    if(K['ArrowRight']) { PL.x+=PL.speed; PL.facing= 1; }
    PL.x = Math.max(0, Math.min(W-WD_W, PL.x));

    if(eat('KeyZ')||eat('Space')) doAttack();
    if(eat('KeyX')) doSpell();

    if(PL.atkTimer  > 0) PL.atkTimer--;
    if(PL.slashTimer > 0) PL.slashTimer--;
    if(PL.iframes   > 0) PL.iframes--;
    if(blockMsg     > 0) blockMsg--;

    // spawn
    if(spawnQueue.length>0){ spawnT++; if(spawnT>=spawnRate){spawnT=0;spawnEnemy();} }

    // enemy AI
    enemies.forEach(e=>{
      if(e.flashT>0) e.flashT--;
      const def = ENEMY_TYPES[e.type];

      if(e.phase==='drop'){
        e.y+=e.dropSpd;
        if(e.y>=e.targetY){ e.y=e.targetY; e.phase='charge'; burst(e.x+def.w/2,e.y,'#ff4422',10,4); }
        return;
      }

      const playerCX = PL.x + PL.w / 2;
      const eCX      = e.x  + def.w  / 2;
      const dirToPlayer = (playerCX < eCX) ? -1 : 1;
      e.facing = dirToPlayer;

      if(e.type === 'archer') {
        const dist = Math.abs(playerCX - eCX);
        const ideal = 220;
        if(dist < ideal - 50) {
          e.x -= dirToPlayer * e.speed * 0.5;
        } else if(dist > ideal + 60) {
          e.x += dirToPlayer * e.speed;
        }
        e.x = Math.max(10, Math.min(W - def.w - 10, e.x));
      } else {
        e.x += dirToPlayer * e.speed;
      }

      // shooting — fires at ANY row gap (spread shot covers adjacent rows)
      e.shootT--;
      if(e.shootT<=0){
        e.shootT = Math.max(40, def.shootCd - gs.level*8);
        const rowDist = Math.abs(e.row - PL.row);
        // Archers and brutes fire if player is within 2 rows; grunts within 1
        const shootRange = (e.type==='archer') ? 2 : 1;
        if(rowDist <= shootRange) {
          const shotVX = dirToPlayer * (e.type==='brute' ? 2 : 3);
          if(e.type==='archer'){
            [-0.5,0,0.5].forEach((yo,i)=>{
              setTimeout(()=>{
                if(gs.screen!=='playing') return;
                projs.push({x:e.x+(e.facing>0?def.w:0), y:e.y+def.h/2-FB_H/2,
                  vx:shotVX, vy:yo, row:e.row, dmg:def.dmg*0.7,
                  owner:'enemy', spr:SPR_FB, w:FB_W, h:FB_H, life:260});
              }, i*110);
            });
          } else {
            projs.push({x:e.x+(e.facing>0?def.w:0), y:e.y+def.h/2-FB_H/2,
              vx:shotVX, vy:0, row:e.row, dmg:def.dmg,
              owner:'enemy', spr:SPR_FB, w:FB_W, h:FB_H, life:260});
          }
        }
      }

      // melee touch — ONLY hurts player, never damages enemy
      if(e.row===PL.row && ov(ehb(e), PL.hb)){
        hurtPlayer(def.dmg);
      }
    });

    enemies = enemies.filter(e=>e.hp>0 && e.x>-80 && e.x<W+120);

    // projectiles
    projs.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.life--;
      if(p.owner==='player'){
        enemies.forEach(e=>{
          if(e.phase!=='charge') return;
          const rowDiff=Math.abs(e.row-p.row);
          if(rowDiff>0) return;
          if(ov({x:p.x,y:p.y,w:p.w,h:p.h}, ehb(e))){
            hitEnemy(e,p.dmg); burst(p.x,p.y,FO,10); p.life=0;
          }
        });
      } else {
        // Enemy projectiles can hit across rows (spread vy carries them between lanes)
        // Check if projectile has drifted into a different row
        let hitRow = p.row;
        for(let r=0; r<ROWS; r++){
          const ry = ROW_Y[r];
          if(p.y + p.h/2 > ry && p.y + p.h/2 < ry + GRUNT_H) { hitRow = r; break; }
        }
        if(hitRow===PL.row && ov({x:p.x,y:p.y,w:p.w,h:p.h}, PL.hb)){
          hurtPlayer(p.dmg); p.life=0;
        }
      }
    });
    projs=projs.filter(p=>p.life>0&&p.x>-40&&p.x<W+40);

    // drops
    drops.forEach(d=>{
      d.life--;
      if(d.row===PL.row&&ov({x:d.x,y:ROW_Y[d.row],w:22,h:22},PL.hb)){
        if(d.type==='health'){
          gs.hp=Math.min(gs.maxHp,gs.hp+35);
          burst(d.x,ROW_Y[d.row],HG,12);
        } else if(d.type==='spell' && gs.spellUses < gs.maxSpell){
          gs.spellUses=Math.min(gs.maxSpell, gs.spellUses+1);
          burst(d.x,ROW_Y[d.row],'#aa44ff',14,6);
        }
        d.life=0;
      }
    });
    drops=drops.filter(d=>d.life>0);

    // particles
    parts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.18; p.life--; });
    parts=parts.filter(p=>p.life>0);

    // wave complete
    if(!cleared&&spawnQueue.length===0&&enemies.length===0){
      cleared=true; msgT=0;
      // Guarantee 1–2 spell refill orbs appear spread across rows
      const spellCount = 1 + Math.floor(Math.random()*2);
      for(let i=0;i<spellCount;i++){
        const row = Math.floor(Math.random()*ROWS);
        drops.push({x: 150 + Math.random()*(W-300), y: ROW_Y[row],
          row, type:'spell', life:500});
      }
      setTimeout(()=>{ gs.wave++; startWave(); },2200);
    }
    if(msgT>0) msgT--;
  }

  // ─── BG ───────────────────────────────────────────────────────────────────
  let bgOff=0;
  function drawBG(){
    bgOff=(bgOff+0.4)%W;
    const sky=ctx.createLinearGradient(0,0,0,GROUND_Y);
    sky.addColorStop(0,'#08000f');
    sky.addColorStop(0.5,'#180020');
    sky.addColorStop(1,'#280010');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,GROUND_Y);

    ctx.fillStyle='#120008';
    for(let i=0;i<7;i++){
      const mx=((i*130-bgOff*0.2)%(W+40))-20;
      const mh=55+(i%3)*35;
      ctx.beginPath(); ctx.moveTo(mx,GROUND_Y);
      ctx.lineTo(mx+60,GROUND_Y-mh); ctx.lineTo(mx+120,GROUND_Y); ctx.fill();
    }

    const hg=ctx.createLinearGradient(0,GROUND_Y-35,0,GROUND_Y);
    hg.addColorStop(0,'rgba(180,20,0,0)'); hg.addColorStop(1,'rgba(180,20,0,0.4)');
    ctx.fillStyle=hg; ctx.fillRect(0,GROUND_Y-35,W,35);

    ROW_Y.forEach((ry,i)=>{
      ctx.fillStyle=i%2===0?'rgba(110,0,0,0.08)':'rgba(70,0,50,0.07)';
      ctx.fillRect(0,ry,W,BRUTE_H+10);
    });

    const t=Date.now()/1000;
    for(let i=0;i<18;i++){
      const ex=((i*53+t*30*(i%3===0?1:-0.5))%W+W)%W;
      const ey=GROUND_Y-20-((t*(15+i%5)+i*37)%200);
      if(ey<0||ey>GROUND_Y) continue;
      ctx.globalAlpha=0.25+(i%3)*0.12;
      ctx.fillStyle='#ff6600'; ctx.fillRect(ex,ey,2,2);
    }
    ctx.globalAlpha=1;

    ctx.fillStyle='#180404'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    ctx.strokeStyle='#bb2200'; ctx.lineWidth=1;
    for(let i=0;i<10;i++){
      const gx=((i*87-bgOff*0.6)%(W+40))-20;
      ctx.globalAlpha=0.65;
      ctx.beginPath(); ctx.moveTo(gx,GROUND_Y+1);
      ctx.lineTo(gx+9,GROUND_Y+9); ctx.lineTo(gx+14,H); ctx.stroke();
    }
    ctx.globalAlpha=1;
    ctx.fillStyle='#cc2200'; ctx.fillRect(0,GROUND_Y,W,3);

    const tg=ctx.createLinearGradient(0,0,0,50);
    tg.addColorStop(0,'rgba(200,0,30,0.55)'); tg.addColorStop(1,'rgba(200,0,30,0)');
    ctx.fillStyle=tg; ctx.fillRect(0,0,W,50);
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────
  function drawHUD(){
    ctx.fillStyle='rgba(6,0,10,0.93)'; ctx.fillRect(0,0,W,44);
    ctx.fillStyle='#550020'; ctx.fillRect(0,42,W,2);
    ctx.fillStyle='#1a1a1a'; ctx.fillRect(12,11,170,14);
    const hf=gs.hp/gs.maxHp;
    ctx.fillStyle=hf>0.6?'#22cc55':hf>0.3?'#ffaa00':'#ff2222';
    ctx.fillRect(12,11,Math.floor(170*hf),14);
    ctx.strokeStyle='#444'; ctx.lineWidth=1; ctx.strokeRect(12,11,170,14);
    ctx.fillStyle='#888'; ctx.font='9px monospace'; ctx.fillText('HP',188,22);
    for(let i=0;i<gs.maxSpell;i++){
      ctx.fillStyle=i<gs.spellUses?'#9933ff':'#220022';
      ctx.fillRect(12+i*17,29,12,8);
      ctx.strokeStyle='#550077'; ctx.lineWidth=1; ctx.strokeRect(12+i*17,29,12,8);
    }
    ctx.fillStyle='#773399'; ctx.font='9px monospace';
    ctx.fillText('SP',12+gs.maxSpell*17+3,37);
    if(PL.sh){
      ctx.fillStyle='rgba(68,153,255,0.25)'; ctx.fillRect(12+gs.maxSpell*17+22,25,36,12);
      ctx.strokeStyle='#4499ff'; ctx.lineWidth=1; ctx.strokeRect(12+gs.maxSpell*17+22,25,36,12);
      ctx.fillStyle='#aaddff'; ctx.font='bold 9px monospace';
      ctx.fillText('🛡 ON',12+gs.maxSpell*17+24,34);
    }
    ctx.fillStyle='#cc0000'; ctx.font='bold 13px monospace';
    ctx.textAlign='center'; ctx.fillText('SCORE '+String(gs.score).padStart(7,'0'),W/2,22);
    ctx.textAlign='left';
    ctx.fillStyle='#cc8800'; ctx.font='11px monospace';
    ctx.fillText(`LVL ${gs.level}   WAVE ${gs.wave}`,W-155,22);
    ctx.fillStyle='#2a2a2a'; ctx.font='9px monospace';
    ctx.fillText('ARROWS MOVE  Z ATK  X SPELL  HOLD C BLOCK',12,H-5);
  }

  // ─── draw player ──────────────────────────────────────────────────────────
  function drawPlayer(){
    const wy = ROW_Y[PL.row];

    // Shield aura (behind player)
    if(PL.sh){
      const pulse = 0.55 + Math.sin(Date.now()/80)*0.45;
      ctx.shadowColor = '#4499ff';
      ctx.shadowBlur  = 18;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#aaddff';
      ctx.lineWidth   = 3;
      ctx.strokeRect(PL.x-4, wy-4, PL.w+8, PL.h+8);
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;

      const shX = PL.facing > 0 ? PL.x + PL.w - 4 : PL.x - SPR_SHIELD[0].length*SC2 + 4;
      spr(SPR_SHIELD, shX, wy + PL.h/2 - SPR_SHIELD.length*SC2/2, SC2);
    }

    // Player sprite
    if(PL.iframes>0 && Math.floor(PL.iframes/4)%2===0) return;
    drawWDSprite(PL.x, wy, PL.facing < 0, PL.atk);

    // Claw slash arc
    if(PL.slashTimer > 0){
      const prog = 1 - (PL.slashTimer / PL.atkDur);
      const slashX  = PL.facing > 0 ? PL.x + PL.w - 6 : PL.x - PL.atkRange + 6;
      const slashCX = slashX + PL.atkRange/2;
      const slashCY = wy + PL.h * 0.45;
      const radius  = PL.atkRange * 0.55 * (0.4 + prog*0.6);

      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - prog * 1.4);
      ctx.strokeStyle = '#c8b8e8';
      ctx.lineWidth   = 4;
      const startAngle = PL.facing > 0 ? -Math.PI*0.65 : -Math.PI*0.35;
      const endAngle   = PL.facing > 0 ? Math.PI*0.25  : Math.PI + Math.PI*0.65;
      ctx.beginPath();
      ctx.arc(slashCX, slashCY, radius, startAngle, endAngle, PL.facing < 0);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.globalAlpha *= 0.7;
      ctx.stroke();
      ctx.restore();
    }

    // "BLOCKED!" feedback
    if(blockMsg > 0){
      const a = Math.min(1, blockMsg / 12);
      ctx.globalAlpha = a;
      ctx.fillStyle   = '#aaddff';
      ctx.font        = 'bold 14px monospace';
      ctx.textAlign   = 'center';
      ctx.fillText('BLOCKED!', PL.cx, wy - 12);
      ctx.textAlign   = 'left';
      ctx.globalAlpha = 1;
    }
  }

  // ─── draw enemies ─────────────────────────────────────────────────────────
  function drawEnemies(){
    enemies.forEach(e=>{
      const def=ENEMY_TYPES[e.type];
      ctx.globalAlpha=(e.flashT>0&&Math.floor(e.flashT/2)%2===0)?0.2:1;
      // flipX=true when enemy faces LEFT (toward player who is on left)
      def.drawFn(e.x, e.y, e.facing < 0);
      ctx.globalAlpha=1;
      if(e.hp<e.maxHp){
        ctx.fillStyle='#2a0000'; ctx.fillRect(e.x,e.y-6,def.w,3);
        ctx.fillStyle=e.type==='brute'?'#ff8800':e.type==='archer'?'#4466ff':'#cc2200';
        ctx.fillRect(e.x,e.y-6,Math.floor(def.w*e.hp/e.maxHp),3);
      }
      if(e.phase==='drop'){
        ctx.fillStyle='rgba(255,40,0,0.7)'; ctx.font='11px monospace'; ctx.textAlign='center';
        ctx.fillText('▼',e.x+def.w/2,e.y-9); ctx.textAlign='left';
      }
      if(e.type==='brute'&&e.phase==='charge'&&e.hp===e.maxHp){
        ctx.fillStyle='#ff8800'; ctx.font='bold 9px monospace'; ctx.textAlign='center';
        ctx.fillText('BRUTE',e.x+def.w/2,e.y-9); ctx.textAlign='left';
      }
    });
  }

  function drawProjs(){
    projs.forEach(p=> spr(p.spr,p.x,p.y,SC2,p.owner==='enemy'));
  }

  function drawDrops(){
    const t=Date.now()/200;
    drops.forEach(d=>{
      const pulse = 0.55 + Math.sin(t + d.x*0.01)*0.45;
      ctx.globalAlpha = pulse;
      if(d.type==='health'){
        spr(SPR_HEALTH, d.x, ROW_Y[d.row]-4, SC2);
      } else if(d.type==='spell'){
        // Glowing purple spell orb
        const cx = d.x + 11, cy = ROW_Y[d.row] + 8;
        const glow = ctx.createRadialGradient(cx,cy,1,cx,cy,11);
        glow.addColorStop(0,'rgba(200,100,255,0.9)');
        glow.addColorStop(0.4,'rgba(140,40,220,0.7)');
        glow.addColorStop(1,'rgba(80,0,160,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx,cy,11,0,Math.PI*2); ctx.fill();
        // Inner bright core
        const core = ctx.createRadialGradient(cx,cy,0,cx,cy,5);
        core.addColorStop(0,'#ffffff'); core.addColorStop(0.4,'#dd88ff'); core.addColorStop(1,'#8800cc');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
        // Small sparkles
        ctx.fillStyle = '#ffffff';
        [[cx-7,cy-3],[cx+6,cy-5],[cx+2,cy+7]].forEach(([sx,sy])=>{
          ctx.beginPath(); ctx.arc(sx+Math.sin(t+sx)*1.5,sy,1.2,0,Math.PI*2); ctx.fill();
        });
      }
      ctx.globalAlpha=1;
    });
  }

  function drawParts(){
    parts.forEach(p=>{
      ctx.globalAlpha=Math.max(0,p.life/p.maxLife);
      ctx.fillStyle=p.col; ctx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
    });
    ctx.globalAlpha=1;
  }

  function drawWaveMsg(){
    if(msgT<=0) return;
    const a=Math.min(1,msgT/30);
    ctx.globalAlpha=a;
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(W/2-140,H/2-34,280,58);
    ctx.fillStyle='#cc0000'; ctx.font='bold 32px monospace';
    ctx.textAlign='center'; ctx.fillText(msg,W/2,H/2+10); ctx.textAlign='left';
    ctx.globalAlpha=1;
  }

  // ─── title ────────────────────────────────────────────────────────────────
  function drawTitle(){
    ctx.fillStyle='#04000a'; ctx.fillRect(0,0,W,H);
    for(let y=0;y<H;y+=3){ ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(0,y,W,1); }
    const t=Date.now()/1000, g=Math.sin(t*1.8)*0.4+0.6;
    ctx.shadowColor=`rgba(200,0,0,${g})`; ctx.shadowBlur=40;
    ctx.fillStyle='#cc0000'; ctx.font='bold 58px monospace';
    ctx.textAlign='center'; ctx.fillText('WOLFDRAGON',W/2,130);
    ctx.shadowBlur=0;
    ctx.fillStyle='#660000'; ctx.font='15px monospace';
    ctx.fillText('SLAY THE DEMON ARMY',W/2,170);
    // Show WolfDragon on title screen
    drawWDSprite(W/2 - WD_W/2, 195, false, false);
    ctx.fillStyle='#333'; ctx.font='12px monospace';
    ctx.fillText('ARROW KEYS  MOVE',W/2,370);
    ctx.fillText('Z  ATTACK    X  SPELL    HOLD C  BLOCK',W/2,390);
    const blink=Math.floor(t*2)%2===0;
    ctx.fillStyle=blink?'#cc0000':'#550000'; ctx.font='bold 15px monospace';
    ctx.fillText('PRESS  ENTER  TO  BEGIN',W/2,435);
    ctx.textAlign='left';
  }

  function drawGameOver(){
    ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#cc0000'; ctx.font='bold 50px monospace'; ctx.textAlign='center';
    ctx.fillText('GAME OVER',W/2,H/2-44);
    ctx.fillStyle='#888'; ctx.font='18px monospace';
    ctx.fillText(`SCORE: ${gs.score}`,W/2,H/2+12);
    ctx.fillStyle='#444'; ctx.font='13px monospace';
    ctx.fillText('PRESS ENTER TO RETRY',W/2,H/2+52);
    ctx.textAlign='left';
  }

  // ─── reset ────────────────────────────────────────────────────────────────
  function reset(){
    Object.assign(gs,{screen:'playing',score:0,level:1,wave:1,
      hp:140,maxHp:140,spellUses:3,maxSpell:3});
    PL.x=70; PL.row=0; PL.facing=1;
    PL.atkTimer=0; PL.shTimer=0; PL.iframes=0;
    enemies=[]; projs=[]; parts=[]; drops=[]; bgOff=0;
    startWave();
  }

  // ─── loop ─────────────────────────────────────────────────────────────────
  function frame(){
    ctx.clearRect(0,0,W,H);
    if(gs.screen==='title'){
      drawTitle();
      if(eat('Enter')||eat('Space')) reset();
    } else if(gs.screen==='gameover'){
      drawBG(); drawDrops(); drawEnemies(); drawProjs();
      drawPlayer(); drawParts(); drawHUD(); drawGameOver();
      if(eat('Enter')||eat('Space')) reset();
    } else {
      update();
      drawBG(); drawDrops(); drawEnemies(); drawProjs();
      drawPlayer(); drawParts(); drawWaveMsg(); drawHUD();
    }
    requestAnimationFrame(frame);
  }

  if(overlay) overlay.classList.add('hidden');
  frame();

})();
