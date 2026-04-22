/**
 * WOLFDRAGON — Browser Game  v0.4
 *
 * v0.4:
 *   - Revised Wolfdragon sprite: wolf head + wings + scaled body, no cape
 *   - 3 enemy types: Grunt, Archer, Brute
 *   - Easier difficulty: bigger attack range, holdable shield, slower projectiles
 *   - Hybrid enemy entry: demons drop from top into rows then charge
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
  const SC2      = 3;   // sprite scale — 3px per pixel for bigger, more detailed sprites
  // Row Y positions spaced for SC2=3 sprite heights (~84px per sprite)
  const ROW_Y    = [GROUND_Y - 88, GROUND_Y - 178, GROUND_Y - 268];

  // ─── pixel renderer ──────────────────────────────────────────────────────
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

  // ═══════════════════════════════════════════════════════════════════════════
  //  SPRITES  —  side-profile pixel art, SC2=3 (each pixel = 3×3 screen px)
  //  Wolfdragon faces RIGHT by default; flip when facing left.
  //  Demons face LEFT by default; flip when e.facing > 0 (chasing player).
  //  Dark outline (#080012) wraps every sprite for definition.
  // ═══════════════════════════════════════════════════════════════════════════
  const _ = null;


  // ── Wolfdragon palette (side-profile) ──────────────────────────────────
  const XO = '#080012'; // hard outline
  const WA = '#18083a'; // body darkest
  const WB = '#2e1260'; // body dark
  const WC = '#4a1e88'; // body mid
  const WD = '#6830b0'; // body bright
  const WE = '#8a48cc'; // body highlight
  const WF = '#ac66e8'; // body brightest
  const WR = '#ff0a0a'; // eye red
  const WGL= '#ff6600'; // eye glow
  const WT = '#f2f2f2'; // fang
  const WMO= '#08000e'; // mouth interior
  const WHR= '#cc1100'; // horn/ear red
  const WH2= '#ff3300'; // horn tip
  const WN1= '#2a0860'; // wing dark
  const WN2= '#4a14a8'; // wing mid
  const WN3= '#7228d8'; // wing light
  const WNR= '#aa0044'; // wing red tip
  const WTE= '#5a1435'; // tail dark
  const WTM= '#8c2055'; // tail mid
  const SC1= '#180830'; // dragon scale dark
  const DS2= '#2e1450'; // dragon scale mid
  const SC3= '#4a2270'; // dragon scale light
  const CL1= '#c8bce8'; // claw light
  const CL2= '#8870c0'; // claw mid
  const CL3= '#5040a0'; // claw dark

  // ── WOLFDRAGON — 18 wide × 26 tall, FACING RIGHT ────────────────────────
  // Wing on left columns, wolf head (snout right) on right columns
  // Dragon tail bottom-left, dragon claws bottom-right
  const WD_IDLE = [
//  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17
  [ _,   _,   WN1, WN2, _,   _,   _,   _,   _,   _,   _,   _,   WHR, _,   _,   _,   _,   _ ],  //  0 wing tip + far horn
  [ _,   WN1, WN2, WN3, WN2, _,   _,   _,   _,   _,   _,   WHR, WH2, WHR, _,   _,   _,   _ ],  //  1 wing + horn
  [ WN1, WN2, WN3, WN3, WN2, WN1, _,   _,   _,   WA,  WB,  WC,  WD,  WC,  WB,  WA,  _,   _ ],  //  2 wing + head top (skull)
  [ WNR, WN2, WN3, WN3, WN2, XO,  XO,  WA,  WB,  WC,  WD,  WE,  WF,  WE,  WD,  WC,  WA,  _ ],  //  3 wing + upper head
  [ WNR, WN1, WN2, WN3, WN2, WN1, XO,  WB,  WC,  WD,  WGL, WR,  WF,  WE,  WD,  WC,  WB,  XO],  //  4 EYE row
  [ _,   WNR, WN1, WN2, WN3, XO,  WA,  WC,  WD,  WE,  WF,  WE,  WD,  WE,  WD,  WC,  WB,  XO],  //  5 muzzle top
  [ _,   _,   WNR, WN2, XO,  WA,  WB,  WC,  WD,  WE,  WF,  WE,  WD,  WC,  WB,  XO,  WT,  _ ],  //  6 muzzle + fang
  [ _,   _,   WN1, XO,  WA,  WB,  WC,  WD,  WE,  WD,  WC,  WB,  WMO, WMO, XO,  _,   _,   _ ],  //  7 lower jaw / chin
  [ _,   _,   XO,  WA,  WB,  WC,  WD,  WD,  WC,  WB,  WA,  XO,  _,   _,   _,   _,   _,   _ ],  //  8 chin tuck
  [ _,   WN2, XO,  WB,  WC,  WD,  WE,  WD,  WC,  WB,  XO,  _,   _,   _,   _,   _,   _,   _ ],  //  9 neck
  [ WN2, WN3, XO,  WC,  WD,  WE,  WF,  WE,  WD,  WC,  XO,  _,   _,   _,   _,   _,   _,   _ ],  // 10 shoulder
  [ WN3, WN3, WC,  WD,  WE,  WF,  WF,  WE,  WD,  SC3, DS2, XO,  _,   _,   _,   _,   _,   _ ],  // 11 chest + scale begins
  [ WN2, WN3, WD,  WE,  WF,  WF,  WE,  WD,  DS2, SC3, DS2, CL1, CL2, XO,  _,   _,   _,   _ ],  // 12 body + forearm
  [ WNR, WN2, WC,  WD,  WE,  WE,  WD,  SC1, DS2, SC3, DS2, CL2, CL1, CL2, XO,  _,   _,   _ ],  // 13 lower body + claw
  [ _,   WNR, WB,  WC,  WD,  WD,  SC1, DS2, SC3, DS2, CL1, CL2, CL1, XO,  _,   _,   _,   _ ],  // 14 foreleg reaching
  [ _,   XO,  WB,  WC,  WD,  SC1, DS2, SC3, DS2, CL1, CL2, CL1, XO,  _,   _,   _,   _,   _ ],  // 15 claw extended
  [ XO,  WTE, WB,  WC,  SC1, DS2, SC3, DS2, XO,  _,   _,   _,   _,   _,   _,   _,   _,   _ ],  // 16 haunch + tail
  [ WTE, WTM, XO,  SC1, DS2, SC3, DS2, SC1, XO,  _,   WTE, WTM, XO,  _,   _,   _,   _,   _ ],  // 17 upper hind leg + tail
  [ WTM, WTE, XO,  SC1, DS2, SC3, SC1, XO,  WTE, WTM, WTE, XO,  _,   _,   _,   _,   _,   _ ],  // 18 hind leg + tail
  [ XO,  WTE, SC1, DS2, SC3, DS2, XO,  WTE, WTM, WTE, XO,  _,   _,   _,   _,   _,   _,   _ ],  // 19 lower hind leg
  [ _,   XO,  SC1, DS2, SC3, XO,  WTE, WTM, WTE, XO,  _,   _,   _,   _,   _,   _,   _,   _ ],  // 20 ankle + tail
  [ _,   _,   CL2, DS2, XO,  WTE, WTM, WTE, XO,  _,   _,   _,   _,   _,   _,   _,   _,   _ ],  // 21 dragon foot + tail
  [ _,   _,   CL1, CL2, XO,  WTE, WTM, XO,  _,   _,   _,   _,   _,   _,   _,   _,   _,   _ ],  // 22 toe claws + tail end
  [ _,   CL1, CL2, CL1, XO,  WTM, XO,  _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _ ],  // 23 claw tips
  [ _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _ ],  // 24
  [ _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _ ],  // 25
  ];

  // ATTACK frame — claw lunges further right, mouth open
  const WD_ATTACK = [
  [ _,   _,   WN1, WN2, _,   _,   _,   _,   _,   _,   _,   _,   WHR, _,   _,   _,   _,   _ ],
  [ _,   WN1, WN2, WN3, WN2, _,   _,   _,   _,   _,   _,   WHR, WH2, WHR, _,   _,   _,   _ ],
  [ WN1, WN2, WN3, WN3, WN2, WN1, _,   _,   _,   XO,  WB,  WC,  WD,  WC,  WB,  XO,  _,   _ ],
  [ WNR, WN2, WN3, WN3, WN2, XO,  XO,  WA,  WB,  WC,  WD,  WE,  WF,  WE,  WD,  WC,  WA,  _ ],
  [ WNR, WN1, WN2, WN3, WN2, WN1, XO,  WB,  WC,  WD,  WGL, WR,  WF,  WE,  WD,  WC,  WB,  XO],  // eye
  [ _,   WNR, WN1, WN2, WN3, XO,  WA,  WC,  WD,  WE,  WF,  WE,  WD,  WE,  WD,  WC,  WB,  XO],
  [ _,   _,   WNR, WN2, XO,  WA,  WB,  WC,  WD,  WE,  WF,  WE,  WD,  WC,  WB,  XO,  WT,  _ ],
  // mouth open wider on attack
  [ _,   _,   WN1, XO,  WA,  WB,  WC,  WD,  WE,  WD,  WMO, WMO, WMO, XO,  _,   _,   _,   _ ],  // jaw open
  [ _,   _,   XO,  WA,  WB,  WC,  WD,  WD,  WC,  XO,  WMO, XO,  _,   _,   _,   _,   _,   _ ],  // wide open
  [ _,   WN2, XO,  WB,  WC,  WD,  WE,  WD,  WC,  WB,  XO,  _,   _,   _,   _,   _,   _,   _ ],
  [ WN2, WN3, XO,  WC,  WD,  WE,  WF,  WE,  WD,  WC,  XO,  _,   _,   _,   _,   _,   _,   _ ],
  [ WN3, WN3, WC,  WD,  WE,  WF,  WF,  WE,  WD,  SC3, DS2, XO,  _,   _,   _,   _,   _,   _ ],
  [ WN2, WN3, WD,  WE,  WF,  WF,  WE,  WD,  DS2, SC3, DS2, CL1, CL2, XO,  _,   _,   _,   _ ],
  // claw punches out further right
  [ WNR, WN2, WC,  WD,  WE,  WE,  WD,  SC1, DS2, SC3, CL1, CL2, CL1, CL2, CL1, XO,  _,   _ ],  // arm extended
  [ _,   WNR, WB,  WC,  WD,  WD,  SC1, DS2, SC3, CL1, CL2, CL1, CL2, CL1, XO,  _,   _,   _ ],  // foreleg lunge
  [ _,   XO,  WB,  WC,  WD,  SC1, DS2, SC3, CL1, CL2, CL1, CL2, XO,  _,   _,   _,   _,   _ ],  // claws wide
  [ XO,  WTE, WB,  WC,  SC1, DS2, SC3, DS2, XO,  _,   _,   _,   _,   _,   _,   _,   _,   _ ],
  [ WTE, WTM, XO,  SC1, DS2, SC3, DS2, SC1, XO,  _,   WTE, WTM, XO,  _,   _,   _,   _,   _ ],
  [ WTM, WTE, XO,  SC1, DS2, SC3, SC1, XO,  WTE, WTM, WTE, XO,  _,   _,   _,   _,   _,   _ ],
  [ XO,  WTE, SC1, DS2, SC3, DS2, XO,  WTE, WTM, WTE, XO,  _,   _,   _,   _,   _,   _,   _ ],
  [ _,   XO,  SC1, DS2, SC3, XO,  WTE, WTM, WTE, XO,  _,   _,   _,   _,   _,   _,   _,   _ ],
  [ _,   _,   CL2, DS2, XO,  WTE, WTM, WTE, XO,  _,   _,   _,   _,   _,   _,   _,   _,   _ ],
  [ _,   _,   CL1, CL2, XO,  WTE, WTM, XO,  _,   _,   _,   _,   _,   _,   _,   _,   _,   _ ],
  [ _,   CL1, CL2, CL1, XO,  WTM, XO,  _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _ ],
  [ _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _ ],
  [ _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _ ],
  ];

  // ── DEMON SPRITES (all designed facing LEFT = cols 0 is front/attacking side)
  // ── GRUNT — 14 wide × 20 tall ───────────────────────────────────────────
  const DR = '#cc2200'; const DR2= '#aa1800'; const DR3= '#881000';
  const DR4= '#ff4422'; const DH = '#ffbb00'; const DH2= '#cc8800';
  const DE = '#ffff55'; const DT = '#f0f0f0'; const DW = '#550000';
  const DW2= '#330000'; const DCL= '#ffccaa';

  const SPR_GRUNT = [
//  0    1    2    3    4    5    6    7    8    9   10   11   12   13
  [ _,   DH,  DH,  _,   _,   _,   _,   _,   _,   DH,  _,   _,   _,   _ ],  //  0 horns
  [ DH,  DH2, DH,  DH2, _,   _,   _,   _,   DH2, DH,  DH2, _,   _,   _ ],  //  1
  [ XO,  DR3, DR2, DR,  DR,  DR,  DR,  DR,  DR,  DR2, DR3, XO,  _,   _ ],  //  2 head
  [ DR3, DR4, DE,  DR3, DR,  DR,  DR,  DR3, DE,  DR4, DR2, DR3, _,   _ ],  //  3 eyes
  [ DR2, DR4, DR4, DR4, DR3, DR,  DR3, DR4, DR4, DR4, DR3, DR2, _,   _ ],  //  4 snout/brow
  [ XO,  DR3, DT,  DR4, DR4, DR4, DR4, DT,  DR4, DR3, DR2, XO,  _,   _ ],  //  5 fangs/teeth
  [ _,   XO,  DR3, DR2, DW,  DR,  DW,  DR2, DR3, DR2, XO,  _,   _,   _ ],  //  6 lower jaw
  [ DW2, DW,  DR3, DR2, DR3, DR2, DR3, DR2, DR3, DW,  DW2, _,   _,   _ ],  //  7 neck
  [ DW,  DR3, DR2, DR4, DR4, DR3, DR4, DR4, DR2, DR3, DW,  DW2, _,   _ ],  //  8 shoulder
  [ DR3, DR2, DR4, DR4, DR3, DR4, DR4, DR4, DR3, DR2, DR3, DW,  _,   _ ],  //  9 chest
  [ DR2, DR4, DR4, DCL, DR3, DR4, DR4, DR3, DCL, DR4, DR2, DR3, XO,  _ ],  // 10 arms/claw
  [ XO,  DR3, DR2, DCL, DR2, DR3, DR4, DR2, DCL, DR2, DR3, XO,  _,   _ ],  // 11 lower arm
  [ _,   DR3, DR2, DR3, DR2, DR4, DR4, DR2, DR3, DR2, DR3, _,   _,   _ ],  // 12 belly
  [ _,   _,   DR3, DR2, DR3, DR2, DR2, DR3, DR2, DR3, _,   _,   _,   _ ],  // 13 hip
  [ _,   _,   _,   DR3, DR2, DR3, _,   DR3, DR2, DR3, _,   _,   _,   _ ],  // 14 upper legs
  [ _,   _,   _,   DR2, DR3, DR2, _,   DR2, DR3, DR2, _,   _,   _,   _ ],  // 15
  [ _,   _,   DR3, DR2, DR3, _,   _,   _,   DR3, DR2, DR3, _,   _,   _ ],  // 16 knees
  [ _,   _,   DR2, DR3, _,   _,   _,   _,   _,   DR3, DR2, _,   _,   _ ],  // 17 lower legs
  [ _,   _,   DCL, DR3, _,   _,   _,   _,   _,   DR3, DCL, _,   _,   _ ],  // 18 feet
  [ _,   DCL, DR3, _,   _,   _,   _,   _,   _,   _,   DR3, DCL, _,   _ ],  // 19 claws
  ];

  // ── ARCHER — 12 wide × 20 tall (robed, thinner) ─────────────────────────
  const AR = '#aa2800'; const AR2= '#882000'; const AR3= '#661500';
  const AR4= '#cc3300'; const ABL= '#223388'; const ABL2='#334499';
  const ABL3='#4455bb';
  const SPR_ARCHER = [
//  0    1    2    3    4    5    6    7    8    9   10   11
  [ _,   DH,  DH2, _,   _,   _,   _,   _,   _,   DH2, DH,  _ ],  //  0 horns
  [ DH2, DH,  DH2, _,   _,   _,   _,   _,   DH2, DH,  DH2, _ ],  //  1
  [ XO,  AR3, AR2, AR,  AR,  AR,  AR,  AR,  AR,  AR2, XO,  _ ],  //  2 head
  [ AR3, AR4, DE,  AR3, AR,  AR,  AR3, DE,  AR4, AR2, AR3, _ ],  //  3 eyes
  [ AR2, AR4, AR4, AR4, AR3, AR3, AR4, AR4, AR4, AR3, AR2, _ ],  //  4 brow
  [ XO,  AR3, DT,  AR4, AR4, AR4, AR4, DT,  AR3, AR2, XO,  _ ],  //  5 fangs
  [ _,   XO,  AR3, AR2, DW,  DW,  AR2, AR3, AR2, XO,  _,   _ ],  //  6 jaw
  [ _,   ABL2,ABL, ABL3,ABL2,ABL, ABL2,ABL, ABL3,ABL2,_,   _ ],  //  7 robe top
  [ ABL2,ABL, ABL3,ABL3,ABL2,ABL, ABL2,ABL3,ABL3,ABL2,ABL, _ ],  //  8 chest
  [ ABL3,ABL2,ABL, ABL2,ABL3,ABL2,ABL3,ABL2,ABL, ABL2,ABL3,_ ],  //  9 body
  [ ABL2,ABL3,ABL2,ABL, ABL2,ABL3,ABL2,ABL, ABL2,ABL3,ABL2,_ ],  // 10 robe
  [ _,   ABL3,ABL2,DCL, ABL3,ABL2,ABL3,DCL, ABL2,ABL3,_,   _ ],  // 11 arm/claw
  [ _,   _,   ABL2,DCL, ABL3,ABL2,ABL3,DCL, ABL2,_,   _,   _ ],  // 12
  [ _,   _,   AR3, AR2, ABL2,ABL3,ABL2,AR2, AR3, _,   _,   _ ],  // 13 lower robe
  [ _,   _,   _,   AR3, AR2, AR3, AR2, AR3, _,   _,   _,   _ ],  // 14 legs
  [ _,   _,   _,   AR2, AR3, AR2, AR3, AR2, _,   _,   _,   _ ],  // 15
  [ _,   _,   AR3, AR2, AR3, _,   AR3, AR2, AR3, _,   _,   _ ],  // 16
  [ _,   _,   AR2, AR3, _,   _,   _,   AR3, AR2, _,   _,   _ ],  // 17
  [ _,   _,   DCL, AR3, _,   _,   _,   AR3, DCL, _,   _,   _ ],  // 18
  [ _,   DCL, AR3, _,   _,   _,   _,   _,   AR3, DCL, _,   _ ],  // 19
  ];

  // ── BRUTE — 18 wide × 24 tall (huge, armored) ────────────────────────────
  const BR = '#991800'; const BR2= '#cc2200'; const BR3= '#ff3311';
  const BR4= '#770f00'; const BRA= '#555555'; const BRA2='#888888';
  const BRA3='#333333'; const BRH= '#ddbb00';
  const SPR_BRUTE = [
//  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17
  [ _,   _,   BRH, BRH, _,   _,   _,   _,   _,   _,   _,   _,   BRH, BRH, _,   _,   _,   _ ],  //  0 horns
  [ _,   BRH, BRH, BRH, BRH, _,   _,   _,   _,   _,   BRH, BRH, BRH, BRH, _,   _,   _,   _ ],  //  1
  [ BRH, BRH, XO,  BR4, BR,  BR,  BR,  BR,  BR,  BR,  BR,  BR4, XO,  BRH, _,   _,   _,   _ ],  //  2 head
  [ XO,  BR4, BR3, DE,  BR,  BR,  BR,  BR,  DE,  BR3, BR4, XO,  _,   _,   _,   _,   _,   _ ],  //  3 eyes
  [ BRA3,BRA, BR4, BR3, BR3, BR,  BR,  BR3, BR3, BR4, BRA, BRA3,_,   _,   _,   _,   _,   _ ],  //  4 armored brow
  [ XO,  BRA3,BRA, DT,  BR3, BR3, BR3, DT,  BRA, BRA3,XO,  _,   _,   _,   _,   _,   _,   _ ],  //  5 fangs
  [ _,   XO,  BRA3,BR4, DW,  DW2, DW,  BR4, BRA3,XO,  _,   _,   _,   _,   _,   _,   _,   _ ],  //  6 jaw
  [ BRA3,BRA, BRA2,BR4, BR3, BR2, BR3, BR4, BRA2,BRA, BRA3,_,   _,   _,   _,   _,   _,   _ ],  //  7 neck
  [ BRA, BRA2,BRA2,BRA, BR4, BR3, BR4, BRA, BRA2,BRA2,BRA, BRA3,_,   _,   _,   _,   _,   _ ],  //  8 huge shoulder
  [ BRA2,BRA2,BRA3,BRA, BRA2,BR4, BRA2,BRA, BRA3,BRA2,BRA2,BRA, BRA3,_,   _,   _,   _,   _ ],  //  9 chest plate
  [ BRA3,BRA, BRA2,BRA3,BRA, BRA2,BRA3,BRA2,BRA, BRA3,BRA, BRA2,BRA3,BRA, _,   _,   _,   _ ],  // 10 body
  [ BRA, BRA2,BRA3,BRA, BRA2,DCL, BRA3,BRA2,BRA, BRA3,BRA2,DCL, BRA, BRA2,XO,  _,   _,   _ ],  // 11 arms
  [ XO,  BRA2,BRA3,BRA, DCL, DCL, BRA3,BRA, DCL, DCL, BRA3,BRA, BRA2,XO,  _,   _,   _,   _ ],  // 12 claws
  [ _,   XO,  BRA3,BR4, BR3, BR4, BRA3,BR4, BR3, BR4, BRA3,XO,  _,   _,   _,   _,   _,   _ ],  // 13 waist
  [ _,   _,   BRA, BR4, BR,  BR4, BRA, BR4, BR,  BR4, BRA, _,   _,   _,   _,   _,   _,   _ ],  // 14 hip
  [ _,   _,   _,   BRA3,BRA, BRA2,BRA3,BRA2,BRA, BRA3,_,   _,   _,   _,   _,   _,   _,   _ ],  // 15 upper legs
  [ _,   _,   _,   BRA, BRA2,BRA3,BRA2,BRA3,BRA2,BRA, _,   _,   _,   _,   _,   _,   _,   _ ],  // 16
  [ _,   _,   BRA3,BRA2,BRA, BRA3,BRA, BRA3,BRA, BRA2,BRA3,_,   _,   _,   _,   _,   _,   _ ],  // 17 knees
  [ _,   _,   BRA, BRA2,BRA3,BRA, _,   BRA, BRA3,BRA2,BRA, _,   _,   _,   _,   _,   _,   _ ],  // 18 lower legs
  [ _,   _,   BRA2,BRA3,BRA, _,   _,   _,   BRA, BRA3,BRA2,_,   _,   _,   _,   _,   _,   _ ],  // 19
  [ _,   _,   DCL, BRA3,_,   _,   _,   _,   _,   BRA3,DCL, _,   _,   _,   _,   _,   _,   _ ],  // 20 feet
  [ _,   DCL, BRA3,_,   _,   _,   _,   _,   _,   _,   BRA3,DCL, _,   _,   _,   _,   _,   _ ],  // 21 claws
  [ _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _ ],  // 22
  [ _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _ ],  // 23
  ];

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

  // ─── sprite sizes (auto-calculated) ───────────────────────────────────────
  const WD_W    = WD_IDLE[0].length   * DS2;
  const WD_H    = WD_IDLE.length      * SC2;
  const GRUNT_W = SPR_GRUNT[0].length * DS2;
  const GRUNT_H = SPR_GRUNT.length    * SC2;
  const ARCH_W  = SPR_ARCHER[0].length* DS2;
  const ARCH_H  = SPR_ARCHER.length   * SC2;
  const BRUTE_W = SPR_BRUTE[0].length * DS2;
  const BRUTE_H = SPR_BRUTE.length    * SC2;
  const FB_W    = SPR_FB[0].length    * DS2;
  const FB_H    = SPR_FB.length       * SC2;
  const SP_W    = SPR_SPELL[0].length * DS2;
  const SP_H    = SPR_SPELL.length    * SC2;


  // ─── enemy type definitions ───────────────────────────────────────────────
  const ENEMY_TYPES = {
    grunt: {
      sprite: SPR_GRUNT, w: GRUNT_W, h: GRUNT_H,
      hp: 40, speed: 0.9, shootCd: 180, dmg: 10, score: 100,
      dropRate: 0.15,
    },
    archer: {
      sprite: SPR_ARCHER, w: ARCH_W, h: ARCH_H,
      hp: 25, speed: 0.55, shootCd: 90, dmg: 8, score: 150,
      dropRate: 0.12,
      // archers hang back and shoot triple
      minX: 420,
    },
    brute: {
      sprite: SPR_BRUTE, w: BRUTE_W, h: BRUTE_H,
      hp: 120, speed: 0.4, shootCd: 999, dmg: 22, score: 250,
      dropRate: 0.4,
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
    atkRange: 72,          // matches visual claw slash
    slashTimer: 0,         // claw slash visual
    shTimer: 0,  shDur: 999, // stays active while C held; stamina caps it
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
    get sh() { return K['KeyC'] === true; },  // shield = actively holding C
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
  let spawnQueue=[];  // pre-built list of types to spawn this wave

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
    // shuffle
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
      facing: -1,           // start facing left (toward player)
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
    PL.slashTimer = PL.atkDur;  // drives slash visual
    const box = {
      x: PL.facing>0 ? PL.x+PL.w-10 : PL.x-PL.atkRange+10,
      y: ROW_Y[PL.row]-6,
      w: PL.atkRange, h: PL.h+12,
    };
    enemies.forEach(e=>{
      if(e.phase!=='charge') return;
      if(e.row !== PL.row) return;  // same row only — slash is horizontal
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
    burst(e.x+ENEMY_TYPES[e.type].w/2, e.y+ENEMY_TYPES[e.type].h/2, DR4, 9);
    if(e.hp<=0) killEnemy(e);
  }

  function killEnemy(e) {
    e.hp=0; gs.score+=e.score;
    burst(e.x+ENEMY_TYPES[e.type].w/2, e.y+ENEMY_TYPES[e.type].h/2, DR, 20, 7);
    if(Math.random()<ENEMY_TYPES[e.type].dropRate)
      drops.push({x:e.x, y:e.y, row:e.row, type:'health', life:360});
  }

  let blockMsg = 0;  // frames to show "BLOCKED!" text

  function hurtPlayer(dmg) {
    // Shield check FIRST — a successful block produces no iframes and no damage
    if(PL.sh) {
      burst(PL.cx, PL.cy, SB, 18, 6);
      blockMsg = 40;
      return;  // fully blocked, no damage, no iframes
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
    // Shield: just hold C — PL.sh getter checks K['KeyC'] directly

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
        if(e.y>=e.targetY){ e.y=e.targetY; e.phase='charge'; burst(e.x+def.w/2,e.y,DR4,10,4); }
        return;
      }

      // ── Direction: always face and move toward player ──
      // This means if player gets behind the enemy, it turns and chases
      const playerCX = PL.x + PL.w / 2;
      const eCX      = e.x  + def.w  / 2;
      const dirToPlayer = (playerCX < eCX) ? -1 : 1;
      e.facing = dirToPlayer;   // enemy flips sprite to face player

      if(e.type === 'archer') {
        // Archers keep a preferred distance — approach if too close, retreat if too far
        const dist = Math.abs(playerCX - eCX);
        const ideal = 280;
        if(dist < ideal - 40) {
          // too close — back away from player
          e.x -= dirToPlayer * e.speed;
        } else if(dist > ideal + 40) {
          // too far — close in
          e.x += dirToPlayer * e.speed;
        }
        // else: sit in comfortable range
      } else {
        // Grunts and Brutes charge straight at the player
        e.x += dirToPlayer * e.speed;
      }

      // shooting
      e.shootT--;
      if(e.shootT<=0){
        e.shootT = Math.max(40, def.shootCd - gs.level*8);
        if(e.row===PL.row){
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

      // melee
      if(e.row===PL.row && ov(ehb(e), PL.hb)){
        hurtPlayer(def.dmg);
        hitEnemy(e, 5);
      }
    });

    enemies = enemies.filter(e=>e.hp>0 && e.x>-80);

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
        const rowDiff=Math.abs(p.row-PL.row);
        if(rowDiff===0 && ov({x:p.x,y:p.y,w:p.w,h:p.h}, PL.hb)){
          hurtPlayer(p.dmg); p.life=0;
        }
      }
    });
    projs=projs.filter(p=>p.life>0&&p.x>-40&&p.x<W+40);

    // drops
    drops.forEach(d=>{
      d.life--;
      if(d.row===PL.row&&ov({x:d.x,y:ROW_Y[d.row],w:20,h:20},PL.hb)){
        if(d.type==='health'){ gs.hp=Math.min(gs.maxHp,gs.hp+35); burst(d.x,ROW_Y[d.row],HG,12); }
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
      setTimeout(()=>{ gs.wave++; startWave(); },2200);
    }
    if(msgT>0) msgT--;
  }

  // ─── BG ───────────────────────────────────────────────────────────────────
  let bgOff=0;
  function drawBG(){
    bgOff=(bgOff+0.4)%W;
    // sky
    const sky=ctx.createLinearGradient(0,0,0,GROUND_Y);
    sky.addColorStop(0,'#08000f');
    sky.addColorStop(0.5,'#180020');
    sky.addColorStop(1,'#280010');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,GROUND_Y);

    // mountains
    ctx.fillStyle='#120008';
    for(let i=0;i<7;i++){
      const mx=((i*130-bgOff*0.2)%(W+40))-20;
      const mh=55+(i%3)*35;
      ctx.beginPath(); ctx.moveTo(mx,GROUND_Y);
      ctx.lineTo(mx+60,GROUND_Y-mh); ctx.lineTo(mx+120,GROUND_Y); ctx.fill();
    }

    // horizon glow
    const hg=ctx.createLinearGradient(0,GROUND_Y-35,0,GROUND_Y);
    hg.addColorStop(0,'rgba(180,20,0,0)'); hg.addColorStop(1,'rgba(180,20,0,0.4)');
    ctx.fillStyle=hg; ctx.fillRect(0,GROUND_Y-35,W,35);

    // row lanes
    ROW_Y.forEach((ry,i)=>{
      ctx.fillStyle=i%2===0?'rgba(110,0,0,0.08)':'rgba(70,0,50,0.07)';
      ctx.fillRect(0,ry,W,BRUTE_H+10);
    });

    // scrolling embers
    const t=Date.now()/1000;
    for(let i=0;i<18;i++){
      const ex=((i*53+t*30*(i%3===0?1:-0.5))%W+W)%W;
      const ey=GROUND_Y-20-((t*(15+i%5)+i*37)%200);
      if(ey<0||ey>GROUND_Y) continue;
      ctx.globalAlpha=0.25+(i%3)*0.12;
      ctx.fillStyle='#ff6600'; ctx.fillRect(ex,ey,2,2);
    }
    ctx.globalAlpha=1;

    // ground
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

    // demon-entry red glow at top
    const tg=ctx.createLinearGradient(0,0,0,50);
    tg.addColorStop(0,'rgba(200,0,30,0.55)'); tg.addColorStop(1,'rgba(200,0,30,0)');
    ctx.fillStyle=tg; ctx.fillRect(0,0,W,50);
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────
  function drawHUD(){
    ctx.fillStyle='rgba(6,0,10,0.93)'; ctx.fillRect(0,0,W,44);
    ctx.fillStyle='#550020'; ctx.fillRect(0,42,W,2);
    // HP
    ctx.fillStyle='#1a1a1a'; ctx.fillRect(12,11,170,14);
    const hf=gs.hp/gs.maxHp;
    ctx.fillStyle=hf>0.6?'#22cc55':hf>0.3?'#ffaa00':'#ff2222';
    ctx.fillRect(12,11,Math.floor(170*hf),14);
    ctx.strokeStyle='#444'; ctx.lineWidth=1; ctx.strokeRect(12,11,170,14);
    ctx.fillStyle='#888'; ctx.font='9px monospace'; ctx.fillText('HP',188,22);
    // spell pips
    for(let i=0;i<gs.maxSpell;i++){
      ctx.fillStyle=i<gs.spellUses?'#9933ff':'#220022';
      ctx.fillRect(12+i*17,29,12,8);
      ctx.strokeStyle='#550077'; ctx.lineWidth=1; ctx.strokeRect(12+i*17,29,12,8);
    }
    ctx.fillStyle='#773399'; ctx.font='9px monospace';
    ctx.fillText('SP',12+gs.maxSpell*17+3,37);
    // shield indicator
    if(PL.sh){
      ctx.fillStyle='rgba(68,153,255,0.25)'; ctx.fillRect(12+gs.maxSpell*17+22,25,36,12);
      ctx.strokeStyle='#4499ff'; ctx.lineWidth=1; ctx.strokeRect(12+gs.maxSpell*17+22,25,36,12);
      ctx.fillStyle='#aaddff'; ctx.font='bold 9px monospace';
      ctx.fillText('🛡 ON',12+gs.maxSpell*17+24,34);
    }
    // score
    ctx.fillStyle='#cc0000'; ctx.font='bold 13px monospace';
    ctx.textAlign='center'; ctx.fillText('SCORE '+String(gs.score).padStart(7,'0'),W/2,22);
    ctx.textAlign='left';
    // level/wave
    ctx.fillStyle='#cc8800'; ctx.font='11px monospace';
    ctx.fillText(`LVL ${gs.level}   WAVE ${gs.wave}`,W-155,22);
    // controls
    ctx.fillStyle='#2a2a2a'; ctx.font='9px monospace';
    ctx.fillText('ARROWS MOVE  Z ATK  X SPELL  HOLD C BLOCK',12,H-5);
  }

  // ─── draw player ──────────────────────────────────────────────────────────
  function drawPlayer(){
    const wy = ROW_Y[PL.row];

    // ── Shield aura (rendered behind player) ──
    if(PL.sh){
      // Pulsing blue glow rim
      const pulse = 0.55 + Math.sin(Date.now()/80)*0.45;
      ctx.shadowColor = '#4499ff';
      ctx.shadowBlur  = 18;
      ctx.globalAlpha = pulse;
      // Blue rim around player bounds
      ctx.strokeStyle = '#aaddff';
      ctx.lineWidth   = 3;
      ctx.strokeRect(PL.x-4, wy-4, PL.w+8, PL.h+8);
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;

      // Shield sprite overlaid on front side
      const shX = PL.facing > 0 ? PL.x + PL.w - 4 : PL.x - SPR_SHIELD[0].length*DS2 + 4;
      spr(SPR_SHIELD, shX, wy + PL.h/2 - SPR_SHIELD.length*SC2/2, SC2);
    }

    // ── Player sprite ──
    if(PL.iframes>0 && Math.floor(PL.iframes/4)%2===0) return;
    spr(PL.atk ? WD_ATTACK : WD_IDLE, PL.x, wy, SC2, PL.facing<0);

    // ── Claw slash arc ──
    if(PL.slashTimer > 0){
      const prog = 1 - (PL.slashTimer / PL.atkDur); // 0→1 as slash plays out
      const slashX  = PL.facing > 0 ? PL.x + PL.w - 6 : PL.x - PL.atkRange + 6;
      const slashCX = slashX + (PL.facing > 0 ? PL.atkRange/2 : PL.atkRange/2);
      const slashCY = wy + PL.h * 0.45;
      const radius  = PL.atkRange * 0.55 * (0.4 + prog*0.6);

      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - prog * 1.4);
      ctx.strokeStyle = '#c8b8e8';
      ctx.lineWidth   = 4;
      // Arc sweeping in the facing direction
      const startAngle = PL.facing > 0 ? -Math.PI*0.65 : -Math.PI*0.35;
      const endAngle   = PL.facing > 0 ? Math.PI*0.25  : Math.PI + Math.PI*0.65;
      ctx.beginPath();
      ctx.arc(slashCX, slashCY, radius, startAngle, endAngle, PL.facing < 0);
      ctx.stroke();
      // bright core line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.globalAlpha *= 0.7;
      ctx.stroke();
      ctx.restore();
    }

    // ── "BLOCKED!" feedback text ──
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
      // flip=true when enemy faces RIGHT (chasing player who went behind)
      spr(def.sprite, e.x, e.y, SC2, e.facing > 0);
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
      // brute: label so player knows it's tough
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
      ctx.globalAlpha=0.55+Math.sin(t)*0.45;
      spr(SPR_HEALTH,d.x,ROW_Y[d.row]-4,DS2);
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
    // show big wolfdragon on title
    spr(WD_IDLE,W/2-WD_W*1.5/2,200,3,false);
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
