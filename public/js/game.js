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

  const bgMusic=new Audio('audio/Rise_VideoGame_V1.mp3');
  bgMusic.loop=true; bgMusic.volume=0.45;
  let musicStarted=false;
  function tryStartMusic(){ if(musicStarted)return; musicStarted=true; bgMusic.play().catch(()=>{}); }
  window.addEventListener('keydown',tryStartMusic);
  canvas.addEventListener('click',tryStartMusic);

  const W = 800, H = 480;
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const ROWS     = 5;
  const GROUND_Y = H - 22;
  const SC2      = 3;   // scale for pixel-art projectile/shield/health sprites
  const ROW_Y    = [
    GROUND_Y - 88,
    GROUND_Y - 88 - 72,
    GROUND_Y - 88 - 144,
    GROUND_Y - 88 - 216,
    GROUND_Y - 88 - 288,
  ];
  const CENTER_ROW = Math.floor(ROWS / 2); // = 2

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
  // WolfDragon is the hero reference size. Brute is visibly larger.
  // Bosses are HUGE — they span multiple rows to feel truly threatening.
  const WD_W    = 88,  WD_H    = 88;
  const GRUNT_W = 72,  GRUNT_H = 80;
  const ARCH_W  = 72,  ARCH_H  = 80;
  const BRUTE_W = 120, BRUTE_H = 130;  // clearly bigger than WolfDragon
  const SPIDER_W= 210, SPIDER_H= 170;  // spans ~2 rows
  const LICH_W  = 150, LICH_H  = 210;  // tall ghost, spans ~2.5 rows
  const APOC_W  = 230, APOC_H  = 260;  // massive, fills the arena
  const FB_W    = SPR_FB[0].length    * SC2;
  const FB_H    = SPR_FB.length       * SC2;
  const SP_W    = SPR_SPELL[0].length * SC2;
  const SP_H    = SPR_SPELL.length    * SC2;

  // ═══════════════════════════════════════════════════════════════════════════
  //  SPRITE SHEET SYSTEM  (new transparent-bg images)
  //  Sheet WD = "new image 4.png"  — WolfDragon side profile, white bg (source faces LEFT)
  //  Sheet SM = "new image 6.png"  — Small demon front+side, white bg
  //  Sheet GR = "new image 7.png"  — Grunt / red devil front, white bg
  //  Sheet BR = "new image 5.png"  — Brute front, white bg
  //  Sheet SP = "new image 3.png"  — Spider/Insectoid boss, front+profile, dark header + white bg
  //  Sheet LI = "new image 2.png"  — Lich/Ghost boss, front+profile, dark header + white bg
  //  Sheet AP = "new image 1.png"  — Apoc boss, front+profile, dark header + white bg
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Source rectangles ────────────────────────────────────────────────────
  const SRECTS = {
    // WolfDragon — side profile only (new image 4, white bg, source faces LEFT)
    WD_SIDE:      { sh:'WD', sx:82,  sy:144, sw:858, sh_:722 },
    // Archer/small demon — side view right sprite (new image 6, white bg, source faces LEFT)
    DEM_SIDE:     { sh:'SM', sx:855, sy:46,  sw:351, sh_:712 },
    // Grunt / red devil — front view (new image 7, white bg)
    GRUNT:        { sh:'GR', sx:86,  sy:15,  sw:843, sh_:896 },
    // Brute — front view (new image 5, white bg)
    BRUTE:        { sh:'BR', sx:164, sy:144, sw:742, sh_:694 },
    // Spider boss — front + profile (new image 3)
    // sy=177: skips title text band (row gap at y=124-176 confirms sprite starts at 177)
    SPIDER_FRONT: { sh:'SP', sx:0,   sy:177, sw:509, sh_:620 },
    SPIDER_SIDE:  { sh:'SP', sx:584, sy:177, sw:386, sh_:613 },
    // Lich boss — front + profile (new image 2)
    // sy=136: skips title text band (row gap at y=52-135 confirms sprite starts at 136)
    LICH_FRONT:   { sh:'LI', sx:61,  sy:136, sw:430, sh_:543 },
    LICH_SIDE:    { sh:'LI', sx:575, sy:136, sw:410, sh_:543 },
    // Apoc boss — front + profile (new image 1)
    // sy=0: no clean row gap; nearBlack in removeBgCheckerboard handles the text pixels
    APOC_FRONT:   { sh:'AP', sx:0,   sy:0,   sw:514, sh_:612 },
    APOC_SIDE:    { sh:'AP', sx:575, sy:0,   sw:428, sh_:615 },
  };

  // ── Background-removal helpers ────────────────────────────────────────────
  // globalReplace: removes ALL pixels within tolerance of the bg colour.
  // Safe for sheet R (grey bg ~150,150,150 — characters are purple/red/dark,
  // so no character pixels will accidentally match the neutral grey).
  // Also does a secondary corner-flood to remove white border-frame lines.
  function removeBgGlobal(img, tolerance) {
    const oc = document.createElement('canvas');
    oc.width = img.naturalWidth; oc.height = img.naturalHeight;
    const ox = oc.getContext('2d');
    ox.drawImage(img, 0, 0);
    const W2 = oc.width, H2 = oc.height;
    const id = ox.getImageData(0, 0, W2, H2);
    const d  = id.data;

    // Pass 1 — global grey removal
    let br=0,bg2=0,bb2=0;
    for(let cy=0;cy<4;cy++) for(let cx=0;cx<4;cx++){
      const i=(cy*W2+cx)*4; br+=d[i]; bg2+=d[i+1]; bb2+=d[i+2];
    }
    br=Math.round(br/16); bg2=Math.round(bg2/16); bb2=Math.round(bb2/16);
    for (let i = 0; i < d.length; i += 4) {
      if (Math.max(Math.abs(d[i]-br),Math.abs(d[i+1]-bg2),Math.abs(d[i+2]-bb2)) <= tolerance)
        d[i+3] = 0;
    }

    // Pass 2 — corner flood-fill to remove white/near-white border lines
    // (white fangs/highlights deep inside the character are unreachable from corners)
    const visited = new Uint8Array(W2*H2);
    const queue = new Int32Array(W2*H2);
    let head=0, tail=0;
    function enq(x,y){ if(x<0||x>=W2||y<0||y>=H2) return; const idx=y*W2+x; if(visited[idx]) return; visited[idx]=1; queue[tail++]=idx; }
    enq(0,0); enq(W2-1,0); enq(0,H2-1); enq(W2-1,H2-1);
    while(head<tail){
      const idx=queue[head++];
      const pi=idx*4;
      // Already transparent (from pass 1) OR near-white → kill and expand
      if(d[pi+3]===0 || (d[pi]>200 && d[pi+1]>200 && d[pi+2]>200)){
        d[pi+3]=0;
        const x=idx%W2, y=(idx/W2)|0;
        enq(x-1,y); enq(x+1,y); enq(x,y-1); enq(x,y+1);
      }
    }

    ox.putImageData(id, 0, 0);
    return oc;
  }

  // floodFill: corner-seeds only — used for dark-bg boss sheet where global
  // replace would incorrectly hit shadowed interior character pixels.
  function removeBgFlood(img, tolerance) {
    const oc = document.createElement('canvas');
    oc.width = img.naturalWidth; oc.height = img.naturalHeight;
    const ox = oc.getContext('2d');
    ox.drawImage(img, 0, 0);
    const W2 = oc.width, H2 = oc.height;
    const id = ox.getImageData(0, 0, W2, H2);
    const d  = id.data;
    let br=0,bg2=0,bb2=0;
    for(let cy=0;cy<4;cy++) for(let cx=0;cx<4;cx++){
      const i=(cy*W2+cx)*4; br+=d[i]; bg2+=d[i+1]; bb2+=d[i+2];
    }
    br=Math.round(br/16); bg2=Math.round(bg2/16); bb2=Math.round(bb2/16);
    const visited = new Uint8Array(W2*H2);
    const queue = new Int32Array(W2*H2);
    let head=0, tail=0;
    function enq(x,y){ if(x<0||x>=W2||y<0||y>=H2) return; const idx=y*W2+x; if(visited[idx]) return; visited[idx]=1; queue[tail++]=idx; }
    enq(0,0); enq(W2-1,0); enq(0,H2-1); enq(W2-1,H2-1);
    while(head<tail){
      const idx=queue[head++];
      const pi=idx*4;
      // Remove: close to bg colour OR already transparent OR near-white border line
      const nearBg  = Math.max(Math.abs(d[pi]-br),Math.abs(d[pi+1]-bg2),Math.abs(d[pi+2]-bb2))<=tolerance;
      const nearWhite = d[pi]>200 && d[pi+1]>200 && d[pi+2]>200;
      if(nearBg || d[pi+3]===0 || nearWhite){
        d[pi+3]=0;
        const x=idx%W2, y=(idx/W2)|0;
        enq(x-1,y); enq(x+1,y); enq(x,y-1); enq(x,y+1);
      }
    }
    ox.putImageData(id, 0, 0);
    return oc;
  }

  // checkerboard flood: handles backgrounds with TWO alternating colours
  // (dark ~[38,36,47] and light grey ~[107-158]).  Removes a pixel if it:
  //   • is already transparent, OR
  //   • is close to the dark corner colour (tolDark), OR
  //   • is a desaturated grey in the medium luminance band (the light checker tiles), OR
  //   • is near-white (border/label text)
  // All removals are gate-kept by a corner flood-fill so interior dark
  // pixels of the character that happen to match bg colours are protected.
  function removeBgCheckerboard(img, tolDark) {
    const oc = document.createElement('canvas');
    oc.width = img.naturalWidth; oc.height = img.naturalHeight;
    const ox = oc.getContext('2d');
    ox.drawImage(img, 0, 0);
    const W2 = oc.width, H2 = oc.height;
    const id = ox.getImageData(0, 0, W2, H2);
    const d  = id.data;
    // Sample dark bg colour from top-left corner area
    let br=0,bg2=0,bb2=0;
    for(let cy=0;cy<4;cy++) for(let cx=0;cx<4;cx++){
      const i=(cy*W2+cx)*4; br+=d[i]; bg2+=d[i+1]; bb2+=d[i+2];
    }
    br=Math.round(br/16); bg2=Math.round(bg2/16); bb2=Math.round(bb2/16);

    const visited = new Uint8Array(W2*H2);
    const queue = new Int32Array(W2*H2);
    let head=0, tail=0;
    function enq(x,y){
      if(x<0||x>=W2||y<0||y>=H2) return;
      const idx=y*W2+x; if(visited[idx]) return;
      visited[idx]=1; queue[tail++]=idx;
    }
    enq(0,0); enq(W2-1,0); enq(0,H2-1); enq(W2-1,H2-1);
    while(head<tail){
      const idx=queue[head++];
      const pi=idx*4;
      const r=d[pi], g=d[pi+1], b=d[pi+2];
      const lum = r*0.3 + g*0.59 + b*0.11;
      const nearDark  = Math.max(Math.abs(r-br),Math.abs(g-bg2),Math.abs(b-bb2)) <= tolDark;
      // Light checker squares are desaturated grey: medium luminance, R≈G≈B
      const greyTile  = lum > 60 && lum < 190
                        && Math.abs(r-g) < 22 && Math.abs(r-b) < 28 && Math.abs(g-b) < 22;
      const nearWhite = r>200 && g>200 && b>200;
      // Near-black: catches black title/label text (lum≈0) left by the flood fill.
      // Character outline pixels are dark-coloured (~lum 30+) so they're safe.
      const nearBlack = lum < 10;
      if(nearDark || greyTile || nearWhite || nearBlack || d[pi+3]===0){
        d[pi+3]=0;
        const x=idx%W2, y=(idx/W2)|0;
        enq(x-1,y); enq(x+1,y); enq(x,y-1); enq(x,y+1);
      }
    }
    ox.putImageData(id, 0, 0);
    return oc;
  }

  // ── Sheet canvases (populated by loadSprites) ─────────────────────────────
  const SHEETS = { WD: null, SM: null, GR: null, BR: null, SP: null, LI: null, AP: null };
  let spritesReady = false;

  function loadSprites(cb) {
    let n = 0;
    const total = 7;
    function done() { if (++n === total) { spritesReady = true; if (cb) cb(); } }

    // Sheet WD — WolfDragon side profile, white bg
    const imgWD = new Image();
    imgWD.onload = () => { SHEETS.WD = removeBgGlobal(imgWD, 60); done(); };
    imgWD.onerror = done;
    imgWD.src = '/images/new image 4.png';

    // Sheet SM — Small demon front+side, white bg
    const imgSM = new Image();
    imgSM.onload = () => { SHEETS.SM = removeBgGlobal(imgSM, 60); done(); };
    imgSM.onerror = done;
    imgSM.src = '/images/new image 6.png';

    // Sheet GR — Grunt / red devil, white bg
    const imgGR = new Image();
    imgGR.onload = () => { SHEETS.GR = removeBgGlobal(imgGR, 60); done(); };
    imgGR.onerror = done;
    imgGR.src = '/images/new image 7.png';

    // Sheet BR — Brute, white bg
    const imgBR = new Image();
    imgBR.onload = () => { SHEETS.BR = removeBgGlobal(imgBR, 60); done(); };
    imgBR.onerror = done;
    imgBR.src = '/images/new image 5.png';

    // Sheet SP — Spider/Insectoid boss (dark corners + white sprite area)
    const imgSP = new Image();
    imgSP.onload = () => { SHEETS.SP = removeBgCheckerboard(imgSP, 15); done(); };
    imgSP.onerror = done;
    imgSP.src = '/images/new image 3.png';

    // Sheet LI — Lich/Ghost boss (dark corners + white sprite area)
    const imgLI = new Image();
    imgLI.onload = () => { SHEETS.LI = removeBgCheckerboard(imgLI, 15); done(); };
    imgLI.onerror = done;
    imgLI.src = '/images/new image 2.png';

    // Sheet AP — Apoc boss (dark corners + white sprite area)
    const imgAP = new Image();
    imgAP.onload = () => { SHEETS.AP = removeBgCheckerboard(imgAP, 15); done(); };
    imgAP.onerror = done;
    imgAP.src = '/images/new image 1.png';
  }

  // ── Core draw helper ──────────────────────────────────────────────────────
  // Draws a source-rect from a sheet into (ox,oy,dw,dh), optionally flipped.
  function drawSpr(rect, ox, oy, dw, dh, flipX) {
    const sheet = SHEETS[rect.sh];
    if (!sheet) return;
    ctx.save();
    if (flipX) {
      ctx.translate(ox + dw, oy);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, rect.sx, rect.sy, rect.sw, rect.sh_, 0, 0, dw, dh);
    } else {
      ctx.drawImage(sheet, rect.sx, rect.sy, rect.sw, rect.sh_, ox, oy, dw, dh);
    }
    ctx.restore();
  }

  // ── Character draw functions ──────────────────────────────────────────────
  // WolfDragon: side profile only (new image 4). Source faces LEFT, so invert
  // flipX so he faces RIGHT by default (PL.facing=1 = right).
  function drawWDSprite(ox, oy, flipX /*, atk unused — only side view exists */) {
    drawSpr(SRECTS.WD_SIDE, ox, oy, WD_W, WD_H, !flipX);
  }

  // Grunt uses new red-devil front sprite (new image 7)
  function drawGruntSprite(ox, oy, flipX) {
    drawSpr(SRECTS.GRUNT, ox, oy, GRUNT_W, GRUNT_H, flipX);
  }

  // Archer uses new small-demon side profile (new image 6, right sprite).
  // Source faces LEFT, so invert flipX so enemies face the correct direction.
  function drawArcherSprite(ox, oy, flipX) {
    drawSpr(SRECTS.DEM_SIDE, ox, oy, ARCH_W, ARCH_H, !flipX);
  }

  function drawBruteSprite(ox, oy, flipX) {
    drawSpr(SRECTS.BRUTE, ox, oy, BRUTE_W, BRUTE_H, flipX);
  }

  // Bosses switch to their profile/side view when attacking (atk=true).
  // Profile source faces LEFT, so invert flipX for the side pose so the boss
  // faces the same direction whether idle (front) or attacking (profile).
  function drawSpiderSprite(ox, oy, flipX, atk) {
    drawSpr(atk ? SRECTS.SPIDER_SIDE : SRECTS.SPIDER_FRONT, ox, oy, SPIDER_W, SPIDER_H, atk ? !flipX : flipX);
  }

  function drawLichSprite(ox, oy, flipX, atk) {
    drawSpr(atk ? SRECTS.LICH_SIDE : SRECTS.LICH_FRONT, ox, oy, LICH_W, LICH_H, atk ? !flipX : flipX);
  }

  function drawApocSprite(ox, oy, flipX, atk) {
    drawSpr(atk ? SRECTS.APOC_SIDE : SRECTS.APOC_FRONT, ox, oy, APOC_W, APOC_H, atk ? !flipX : flipX);
  }

  const ENEMY_TYPES = {
    grunt: {
      drawFn: drawGruntSprite, w: GRUNT_W, h: GRUNT_H,
      hp: 40, speed: 0.9, shootCd: 240, dmg: 10, score: 100,
      dropRate: 0.15, spellDrop: 0.04,
    },
    archer: {
      drawFn: drawArcherSprite, w: ARCH_W, h: ARCH_H,
      hp: 25, speed: 0.55, shootCd: 150, dmg: 8, score: 150,
      dropRate: 0.12, spellDrop: 0.10,  // archers drop spell refills more often
      minX: 420,
    },
    brute: {
      drawFn: drawBruteSprite, w: BRUTE_W, h: BRUTE_H,
      hp: 240, speed: 0.4, shootCd: 999, dmg: 22, score: 250,
      dropRate: 0.4, spellDrop: 0.20,
    },
    // ── BOSSES ──
    spider: {
      drawFn: drawSpiderSprite, w: SPIDER_W, h: SPIDER_H,
      hp: 500, speed: 0.6, shootCd: 110, dmg: 18, score: 1200,
      dropRate: 1.0, spellDrop: 1.0, isBoss: true,
    },
    lich: {
      drawFn: drawLichSprite, w: LICH_W, h: LICH_H,
      hp: 500, speed: 0.4, shootCd: 90, dmg: 22, score: 1800,
      dropRate: 1.0, spellDrop: 1.0, isBoss: true,
    },
    apocalyptic: {
      drawFn: drawApocSprite, w: APOC_W, h: APOC_H,
      hp: 1050, speed: 0.25, shootCd: 45, dmg: 30, score: 3000,
      dropRate: 1.0, spellDrop: 1.0, isBoss: true,
    },
  };

  // ─── game state ───────────────────────────────────────────────────────────
  const gs = {
    screen: 'title',
    score: 0, level: 1, wave: 1,
    hp: 140, maxHp: 140,
    spellUses: 3, maxSpell: 3,
    rewardChoice: 0,
    itemTier: 0,
    activeItem: null,
    rewardItemChoices: [],
    rewardItemChoice: 0,
  };

  // ─── player ───────────────────────────────────────────────────────────────
  const PL = {
    row: 0, x: 70,
    speed: 4, facing: 1,
    atkTimer: 0, atkDur: 14,
    atkRange: 100,
    slashTimer: 0,
    shTimer: 0, shDur: 999,
    iframes: 0,
    weapon: { name:'Dragon Claws', dmg: 25, slashColor:'#c8b8e8', slashStyle:'sweep' },
    spell:  { name:'Fire Breath',  dmg: 60 },
    shield: { name:'Scale Shield', block: 50 },
    itemAbility: null,
    itemCd: 0,
    itemCdMax: 0,
    shBroken: false,
    shHp: 3, shMaxHp: 3,
    soulDrainActive: false,
    deathMarkActive: false,
    mirrorActive: false,
    thornActive: false,
    explodeShieldActive: false,
    bloodlustT: 0,
    webbed: 0,
    get w()  { return WD_W; },
    get h()  { return WD_H; },
    get cx() { return this.x + this.w/2; },
    get cy() { return ROW_Y[this.row] + this.h/2; },
    get hb() { return { x:this.x+12, y:ROW_Y[this.row]+10, w:this.w-24, h:this.h-16 }; },
    get atk(){ return this.atkTimer > 0; },
    // Shield only active if holding C AND not currently attacking AND not broken
    get sh() { return K['KeyC'] === true && this.atkTimer <= 0 && !this.shBroken; },
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
  let enemies=[], projs=[], parts=[], drops=[], obstacles=[];
  let webZones=[], shockwaves=[], darknessT=0;

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
  const BOSS_SEQUENCE = ['spider','lich','apocalyptic'];

  function isBossWave() { return gs.wave % 3 === 0; }
  function bossTypeForWave() {
    return BOSS_SEQUENCE[Math.floor((gs.wave/3 - 1)) % BOSS_SEQUENCE.length];
  }

  function buildWaveQueue() {
    spawnQueue = [];
    if (isBossWave()) {
      spawnQueue.push(bossTypeForWave());
    } else {
      const wi = ((gs.wave-1)%3)+1;
      const count = 5 + wi*2 + gs.level;
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
    }
    leftToSpawn = spawnQueue.length;
  }

  function startWave() {
    buildWaveQueue();
    spawnRate = isBossWave() ? 0 : Math.max(50, 130 - gs.level*7);
    spawnT=0; cleared=false;
    generateObstacles();
    if (isBossWave()) {
      const name = bossTypeForWave().toUpperCase();
      msg = `⚠ BOSS: ${name} ⚠`; msgT = 200;
    } else {
      msg=`WAVE ${gs.wave}`; msgT=130;
    }
  }

  function spawnEnemy() {
    if(!spawnQueue.length) return;
    const type = spawnQueue.pop();
    leftToSpawn = spawnQueue.length;
    const def  = ENEMY_TYPES[type];

    if (def.isBoss) {
      // Boss enters from the right, targets the middle row vertically centred
      const row = CENTER_ROW;
      const totalH = ROW_Y[0] - ROW_Y[ROWS-1] + GRUNT_H;  // full arena height
      const arenaTop = ROW_Y[ROWS-1];
      const targetY = arenaTop + (totalH - def.h) / 2;
      const bossHp = def.hp + gs.level * 60;
      enemies.push({
        type, row,
        x: W + 20,                     // enters from right
        y: -def.h,
        targetY,
        phase: 'drop',
        dropSpd: 3,
        hp: bossHp, maxHp: bossHp,
        speed: def.speed,
        shootT: def.shootCd,
        flashT: 0,
        facing: -1,
        score: def.score + gs.level*50,
        minX: 0,
        bossPhase: 1,                  // escalating phases
        moveDir: 1,                    // for side-to-side patrol
        moveTimer: 0,
        teleTimer: 0,                  // lich teleport cooldown
        enrageT: 0,                    // apoc beam charge timer
        atkAnim: 0,                    // frames to show attack/profile pose
        attackIdx: 0,                  // position in attack pattern cycle
        meleeCd: 0,                    // cooldown between contact hits
        lungeT: 0,                     // spider lunge timer
        diveT: 0,          // spider ceiling-drop timer
        diveRow: 0,        // spider ceiling-drop target row
        soulPullT: 0,      // lich soul-vortex duration
        quakeWindupT: 0,   // apoc shockwave windup
      });
    } else {
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
        swingCd: 80,                   // brute: frames until next swing can start
        windupT: 0,                    // brute: wind-up animation frames
        swingT: 0,                     // brute: active swing hitbox frames
      });
    }
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
    if(PL.soulDrainActive){ PL.soulDrainActive=false; gs.hp=Math.min(gs.maxHp,gs.hp+15); burst(PL.cx,PL.cy,'#8800ff',10); }
    if(e.hp<=0) killEnemy(e);
  }

  function killEnemy(e) {
    if(PL.deathMarkActive){ PL.deathMarkActive=false; const kcx=e.x+ENEMY_TYPES[e.type].w/2,kcy=e.y+ENEMY_TYPES[e.type].h/2; enemies.forEach(e2=>{ if(e2!==e) hitEnemy(e2,80); }); burst(kcx,kcy,'#ff8800',50,14); }
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

  function hurtPlayer(dmg, isBoss) {
    if(PL.sh) {
      const cost = isBoss ? 2 : 1;
      PL.shHp = Math.max(0, PL.shHp - cost);
      burst(PL.cx, PL.cy, PL.shHp > 0 ? SB : '#ff8844', 18, 6);
      blockMsg = 40;
      if(PL.shHp <= 0) PL.shBroken = true;
      if(PL.thornActive){ PL.thornActive=false; enemies.forEach(e=>hitEnemy(e,35)); burst(PL.cx,PL.cy,'#44ff44',20); }
      if(PL.explodeShieldActive){ PL.explodeShieldActive=false; enemies.forEach(e=>hitEnemy(e,60)); burst(W/2,H/2,'#ff8800',50,14); }
      return;
    }
    if(PL.iframes>0) return;
    gs.hp=Math.max(0,gs.hp-dmg);
    PL.iframes=70;
    burst(PL.cx,PL.cy,'#ff3333',12);
    if(gs.hp<=0) gs.screen='gameover';
  }

  // ─── reward screen input ──────────────────────────────────────────────────
  function getRewards(){
    return [
      { icon:'⚔', label:'WEAPON UP',  desc:'+8 dmg  +25% range (max 300)',
        fn(){ PL.weapon.dmg+=8; PL.atkRange=Math.min(300,Math.round(PL.atkRange*1.25)); } },
      { icon:'✦', label:'+SPELL',     desc:'+1 spell charge  +10 spell dmg\n(max 6 charges)',
        fn(){ gs.maxSpell=Math.min(6,gs.maxSpell+1); gs.spellUses=gs.maxSpell; PL.spell.dmg+=10; } },
      { icon:'🛡', label:'FORTIFY',    desc:'+35 max HP\nFull heal',
        fn(){ gs.maxHp+=35; gs.hp=gs.maxHp; } },
    ];
  }

  const ITEM_POOLS = {
    weapon: [
      // tier 0
      { name:"Dragon's Fang",    icon:'🗡', desc:'+6 dmg / +10 max HP',     abilityName:'Lunge Strike', abDesc:'S: Dash+strike 1.5x dmg',   ability:'lunge',      cdMax:360, slashColor:'#cc88ff', slashStyle:'sweep', stat(){ PL.weapon.dmg+=6; gs.maxHp+=10; gs.hp=Math.min(gs.maxHp,gs.hp+10); } },
      { name:"Soul Reaper",       icon:'💀', desc:'+5 dmg / +1 spell slot',  abilityName:'Soul Drain',   abDesc:'S: Next hit heals 15 HP',   ability:'souldrain',  cdMax:300, slashColor:'#880033', slashStyle:'blade', stat(){ PL.weapon.dmg+=5; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Sundering Axe",     icon:'🪓', desc:'+8 dmg / +15% range',     abilityName:'Cleave',       abDesc:'S: Hit all enemies on row', ability:'cleave',     cdMax:420, slashColor:'#ff8800', slashStyle:'blade', stat(){ PL.weapon.dmg+=8; PL.atkRange=Math.min(300,Math.round(PL.atkRange*1.15)); } },
      { name:"Warblade",          icon:'⚔', desc:'+6 dmg / +15 max HP',     abilityName:'Lunge Strike', abDesc:'S: Dash+strike 1.5x dmg',   ability:'lunge',      cdMax:360, slashColor:'#ffcc44', slashStyle:'blade', stat(){ PL.weapon.dmg+=6; gs.maxHp+=15; gs.hp=Math.min(gs.maxHp,gs.hp+20); } },
      { name:"Hexfang",           icon:'🐍', desc:'+7 dmg / +1 spell slot',  abilityName:'Void Slash',   abDesc:'S: Cross-screen slash',     ability:'voidslash',  cdMax:480, slashColor:'#aa44ff', slashStyle:'void',  stat(){ PL.weapon.dmg+=7; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      // tier 1
      { name:"Thunderstrike",     icon:'⚡', desc:'+12 dmg / +15 max HP',    abilityName:'Chain Lightning',abDesc:'S: Lightning all enemies', ability:'lightning',  cdMax:480, slashColor:'#ffff44', slashStyle:'thunder', stat(){ PL.weapon.dmg+=12; gs.maxHp+=15; gs.hp=Math.min(gs.maxHp,gs.hp+20); } },
      { name:"Bloodfang Blade",   icon:'🩸', desc:'+10 dmg / +2 spell slots',abilityName:'Bloodlust',    abDesc:'S: Rapid strikes 5s',       ability:'bloodlust',  cdMax:600, slashColor:'#cc0033', slashStyle:'sweep',   stat(){ PL.weapon.dmg+=10; gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Voidblade",         icon:'🌑', desc:'+14 dmg / +20% range',    abilityName:'Void Slash',   abDesc:'S: Cross-screen slash',     ability:'voidslash',  cdMax:480, slashColor:'#6600cc', slashStyle:'void',    stat(){ PL.weapon.dmg+=14; PL.atkRange=Math.min(300,Math.round(PL.atkRange*1.2)); } },
      { name:"Soulbreaker",       icon:'👁', desc:'+12 dmg / +1 spell slot', abilityName:'Soul Drain',   abDesc:'S: Next hit heals 15 HP',   ability:'souldrain',  cdMax:300, slashColor:'#550077', slashStyle:'void',    stat(){ PL.weapon.dmg+=12; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Crimson Edge",      icon:'🔥', desc:'+13 dmg / +20 max HP',    abilityName:'Cleave',       abDesc:'S: Hit all enemies on row', ability:'cleave',     cdMax:420, slashColor:'#ff4400', slashStyle:'blade',   stat(){ PL.weapon.dmg+=13; gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+25); } },
      // tier 2
      { name:"Dragonfang Ancient",icon:'🐉', desc:'+20 dmg / +25 max HP',    abilityName:'Dragon Fury',  abDesc:'S: Massive claw all rows',  ability:'dragonfury', cdMax:600, slashColor:'#ff9900', slashStyle:'sweep',   stat(){ PL.weapon.dmg+=20; gs.maxHp+=25; gs.hp=Math.min(gs.maxHp,gs.hp+40); } },
      { name:"Reaper's Scythe",   icon:'⚰', desc:'+18 dmg / +2 spell slots',abilityName:'Death Mark',   abDesc:'S: Marked kill explodes',   ability:'deathmark',  cdMax:540, slashColor:'#330000', slashStyle:'blade',   stat(){ PL.weapon.dmg+=18; gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Worldbreaker",      icon:'💥', desc:'+22 dmg / +25% range',    abilityName:'Chain Lightning',abDesc:'S: Lightning hits all',    ability:'lightning',  cdMax:480, slashColor:'#ffee00', slashStyle:'thunder', stat(){ PL.weapon.dmg+=22; PL.atkRange=Math.min(300,Math.round(PL.atkRange*1.25)); } },
      { name:"Abyss Blade",       icon:'🕳', desc:'+20 dmg / +20 max HP',    abilityName:'Void Slash',   abDesc:'S: Cross-screen slash',     ability:'voidslash',  cdMax:480, slashColor:'#220066', slashStyle:'void',    stat(){ PL.weapon.dmg+=20; gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+30); } },
      { name:"Godslayer",         icon:'👑', desc:'+25 dmg / +3 spell slots',abilityName:'Dragon Fury',  abDesc:'S: Massive claw all rows',  ability:'dragonfury', cdMax:600, slashColor:'#ffaa00', slashStyle:'sweep',   stat(){ PL.weapon.dmg+=25; gs.maxSpell=Math.min(8,gs.maxSpell+3); gs.spellUses=gs.maxSpell; } },
    ],
    spell: [
      // tier 0
      { name:"Frost Tome",        icon:'❄', desc:'+7 spell dmg / +1 slot',   abilityName:'Ice Nova',     abDesc:'S: Freeze all enemies 3s',  ability:'icenova',    cdMax:480, stat(){ PL.spell.dmg+=7; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Firewall Scroll",   icon:'🔥', desc:'+6 spell dmg / +10 HP',    abilityName:'Firewall',     abDesc:'S: Spread fire all rows',   ability:'firewall',   cdMax:420, stat(){ PL.spell.dmg+=6; gs.maxHp+=10; gs.hp=Math.min(gs.maxHp,gs.hp+10); } },
      { name:"Tempest Rod",       icon:'🌪', desc:'+7 spell dmg / +1 slot',   abilityName:'Whirlwind',    abDesc:'S: Pull enemies to mid row',ability:'whirlwind',  cdMax:540, stat(){ PL.spell.dmg+=7; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Shadow Grimoire",   icon:'📖', desc:'+7 spell dmg / +15 HP',    abilityName:'Ice Nova',     abDesc:'S: Freeze all enemies',     ability:'icenova',    cdMax:480, stat(){ PL.spell.dmg+=7; gs.maxHp+=15; gs.hp=Math.min(gs.maxHp,gs.hp+15); } },
      { name:"Spirit Wand",       icon:'✨', desc:'+6 spell dmg / +1 slot',   abilityName:'Whirlwind',    abDesc:'S: Pull enemies to mid',    ability:'whirlwind',  cdMax:540, stat(){ PL.spell.dmg+=6; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      // tier 1
      { name:"Storm Codex",       icon:'⛈', desc:'+12 spell dmg / +2 slots', abilityName:'Chain Lightning',abDesc:'S: Lightning hits all',    ability:'lightning',  cdMax:480, stat(){ PL.spell.dmg+=12; gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Void Grimoire",     icon:'🌌', desc:'+10 spell dmg / +20 HP',   abilityName:'Firewall',     abDesc:'S: Spread fire all rows',   ability:'firewall',   cdMax:420, stat(){ PL.spell.dmg+=10; gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+20); } },
      { name:"Cataclysm Tome",    icon:'💫', desc:'+13 spell dmg / +1 slot',  abilityName:'Ice Nova',     abDesc:'S: Freeze all enemies',     ability:'icenova',    cdMax:480, stat(){ PL.spell.dmg+=13; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Runic Staff",       icon:'🔮', desc:'+12 spell dmg / +2 slots', abilityName:'Whirlwind',    abDesc:'S: Pull enemies to mid',    ability:'whirlwind',  cdMax:540, stat(){ PL.spell.dmg+=12; gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Soulfire Orb",      icon:'🔴', desc:'+14 spell dmg / +20 HP',   abilityName:'Chain Lightning',abDesc:'S: Lightning hits all',   ability:'lightning',  cdMax:480, stat(){ PL.spell.dmg+=14; gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+20); } },
      // tier 2
      { name:"Armageddon Tome",   icon:'☄', desc:'+20 spell dmg / +3 slots', abilityName:'Dragon Fury',  abDesc:'S: Massive claw all rows',  ability:'dragonfury', cdMax:600, stat(){ PL.spell.dmg+=20; gs.maxSpell=Math.min(8,gs.maxSpell+3); gs.spellUses=gs.maxSpell; } },
      { name:"World Ender Scroll",icon:'🌍', desc:'+18 spell dmg / +30 HP',   abilityName:'Firewall',     abDesc:'S: Spread fire all rows',   ability:'firewall',   cdMax:420, stat(){ PL.spell.dmg+=18; gs.maxHp+=25; gs.hp=Math.min(gs.maxHp,gs.hp+30); } },
      { name:"Eternal Grimoire",  icon:'♾', desc:'+22 spell dmg / +2 slots', abilityName:'Ice Nova',     abDesc:'S: Freeze all 3s',          ability:'icenova',    cdMax:480, stat(){ PL.spell.dmg+=22; gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Chaos Staff",       icon:'🌀', desc:'+20 spell dmg / +3 slots', abilityName:'Whirlwind',    abDesc:'S: Pull all enemies',       ability:'whirlwind',  cdMax:540, stat(){ PL.spell.dmg+=20; gs.maxSpell=Math.min(8,gs.maxSpell+3); gs.spellUses=gs.maxSpell; } },
      { name:"Divine Codex",      icon:'💎', desc:'+25 spell dmg / +40 HP',   abilityName:'Chain Lightning',abDesc:'S: Lightning all enemies', ability:'lightning', cdMax:480, stat(){ PL.spell.dmg+=25; gs.maxHp+=30; gs.hp=Math.min(gs.maxHp,gs.hp+40); } },
    ],
    shield: [
      // tier 0
      { name:"Spiked Buckler",    icon:'🛡', desc:'+20 max HP / +1 spell slot',abilityName:'Thorn Wall',    abDesc:'S: Next block deals 80 dmg outward', ability:'thornwall',    cdMax:480, stat(){ gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+20); gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Mirror Shield",     icon:'🔵', desc:'+25 max HP / +10 weapon dmg',abilityName:'Mirror',        abDesc:'S: Reflect next projectile', ability:'mirrorshield', cdMax:360, stat(){ gs.maxHp+=25; gs.hp=Math.min(gs.maxHp,gs.hp+25); PL.weapon.dmg+=10; } },
      { name:"Iron Wall",         icon:'🧱', desc:'+30 max HP / +15 weapon dmg',abilityName:'Holy Barrier',  abDesc:'S: Invincible for 3 seconds',ability:'holybarrier',  cdMax:600, stat(){ gs.maxHp+=30; gs.hp=Math.min(gs.maxHp,gs.hp+30); PL.weapon.dmg+=15; } },
      { name:"Ward Stone",        icon:'🪨', desc:'+20 max HP / +1 slot',       abilityName:'Thorn Wall',    abDesc:'S: Next block deals 80 dmg', ability:'thornwall',    cdMax:480, stat(){ gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+20); gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Scale Armor",       icon:'🦎', desc:'+35 max HP / +10 weapon dmg',abilityName:'Mirror',        abDesc:'S: Reflect next projectile', ability:'mirrorshield', cdMax:360, stat(){ gs.maxHp+=35; gs.hp=Math.min(gs.maxHp,gs.hp+35); PL.weapon.dmg+=10; } },
      // tier 1
      { name:"Explosion Shield",  icon:'💣', desc:'+30 max HP / +20 weapon dmg',abilityName:'Explode Shield',abDesc:'S: Next block = big explosion',ability:'explodeshield',cdMax:540, stat(){ gs.maxHp+=30; gs.hp=Math.min(gs.maxHp,gs.hp+30); PL.weapon.dmg+=20; } },
      { name:"Runic Aegis",       icon:'🔷', desc:'+40 max HP / +2 spell slots',abilityName:'Holy Barrier',  abDesc:'S: Invincible 3 seconds',    ability:'holybarrier',  cdMax:600, stat(){ gs.maxHp+=40; gs.hp=Math.min(gs.maxHp,gs.hp+40); gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Void Guard",        icon:'⬛', desc:'+45 max HP / +25 weapon dmg',abilityName:'Thorn Wall',    abDesc:'S: Next block explodes',     ability:'thornwall',    cdMax:480, stat(){ gs.maxHp+=45; gs.hp=Math.min(gs.maxHp,gs.hp+45); PL.weapon.dmg+=25; } },
      { name:"Spectral Wall",     icon:'👻', desc:'+35 max HP / +2 spell slots',abilityName:'Mirror',        abDesc:'S: Reflect next projectile', ability:'mirrorshield', cdMax:360, stat(){ gs.maxHp+=35; gs.hp=Math.min(gs.maxHp,gs.hp+35); gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Hellforged Plate",  icon:'🔱', desc:'+50 max HP / +20 weapon dmg',abilityName:'Explode Shield',abDesc:'S: Block = explosion',       ability:'explodeshield',cdMax:540, stat(){ gs.maxHp+=50; gs.hp=Math.min(gs.maxHp,gs.hp+50); PL.weapon.dmg+=20; } },
      // tier 2
      { name:"Divine Bulwark",    icon:'✝', desc:'+45 max HP / +3 spell slots',abilityName:'Holy Barrier',  abDesc:'S: Invincible 3 seconds',    ability:'holybarrier',  cdMax:600, stat(){ gs.maxHp+=45; gs.hp=Math.min(gs.maxHp,gs.hp+45); gs.maxSpell=Math.min(8,gs.maxSpell+3); gs.spellUses=gs.maxSpell; } },
      { name:"Titan Shield",      icon:'🏛', desc:'+50 max HP / +12 weapon dmg',abilityName:'Explode Shield',abDesc:'S: Massive block explosion', ability:'explodeshield', cdMax:540, stat(){ gs.maxHp+=50; gs.hp=Math.min(gs.maxHp,gs.hp+50); PL.weapon.dmg+=12; } },
      { name:"Eternal Aegis",     icon:'⚜', desc:'+40 max HP / +3 spell slots',abilityName:'Mirror',        abDesc:'S: Reflect projectile',      ability:'mirrorshield', cdMax:360, stat(){ gs.maxHp+=40; gs.hp=Math.min(gs.maxHp,gs.hp+40); gs.maxSpell=Math.min(8,gs.maxSpell+3); gs.spellUses=gs.maxSpell; } },
      { name:"Chaos Barrier",     icon:'🌪', desc:'+40 max HP / +14 weapon dmg',abilityName:'Thorn Wall',    abDesc:'S: Block deals 35 dmg out',  ability:'thornwall',    cdMax:480, stat(){ gs.maxHp+=40; gs.hp=Math.min(gs.maxHp,gs.hp+40); PL.weapon.dmg+=14; } },
      { name:"Godwall",           icon:'⭐', desc:'+55 max HP / +4 spell slots',abilityName:'Dragon Fury',  abDesc:'S: Claw hits all rows',       ability:'dragonfury',   cdMax:600, stat(){ gs.maxHp+=55; gs.hp=Math.min(gs.maxHp,gs.hp+55); gs.maxSpell=Math.min(8,gs.maxSpell+4); gs.spellUses=gs.maxSpell; } },
    ],
  };

  function doItemAbility(){
    PL.itemCd = PL.itemCdMax;
    switch(PL.itemAbility){
      case 'lunge': {
        const dashDir = PL.facing;
        PL.x = Math.max(0, Math.min(W-PL.w, PL.x + dashDir * 120));
        const box={x:PL.x-40,y:ROW_Y[PL.row]-6,w:PL.w+80,h:PL.h+12};
        enemies.forEach(e=>{ if(e.row===PL.row&&ov(box,ehb(e))) hitEnemy(e,PL.weapon.dmg*1.2); });
        burst(PL.cx,PL.cy,'#ffaa00',20,8);
        break;
      }
      case 'souldrain': {
        PL.soulDrainActive=true;
        burst(PL.cx,PL.cy,'#8800ff',16,6);
        break;
      }
      case 'cleave': {
        const box={x:0,y:ROW_Y[PL.row]-6,w:W,h:PL.h+12};
        enemies.forEach(e=>{ if(e.row===PL.row&&ov(box,ehb(e))) hitEnemy(e,PL.weapon.dmg*1.2); });
        burst(PL.cx,PL.cy,'#ff8800',24,7);
        break;
      }
      case 'lightning': {
        enemies.forEach(e=>{ hitEnemy(e,PL.spell.dmg*0.8); burst(e.x+ENEMY_TYPES[e.type].w/2,e.y,'#ffff00',8,4); });
        burst(PL.cx,PL.cy,'#ffff00',30,12);
        break;
      }
      case 'bloodlust': {
        PL.bloodlustT=300;
        burst(PL.cx,PL.cy,'#ff0044',20,7);
        break;
      }
      case 'voidslash': {
        projs.push({x:PL.cx,y:ROW_Y[PL.row],vx:PL.facing*18,vy:0,row:PL.row,
          dmg:PL.weapon.dmg*2,owner:'player',spr:SPR_SPELL,w:SP_W*2,h:SP_H*2,life:120});
        burst(PL.cx,PL.cy,'#cc00ff',20,8);
        break;
      }
      case 'dragonfury': {
        enemies.forEach(e=>hitEnemy(e,PL.weapon.dmg*1.8));
        burst(W/2,H/2,'#ff4400',50,12);
        break;
      }
      case 'icenova': {
        enemies.forEach(e=>{ e.frozen=(e.frozen||0)+90; burst(e.x+ENEMY_TYPES[e.type].w/2,e.y,'#88ccff',8,3); });
        burst(PL.cx,PL.cy,'#aaddff',30,8);
        break;
      }
      case 'firewall': {
        for(let r=0;r<ROWS;r++){
          projs.push({x:PL.cx,y:ROW_Y[r],vx:PL.facing*6,vy:0,row:r,
            dmg:PL.spell.dmg*1.2,owner:'player',spr:SPR_SPELL,w:SP_W,h:SP_H,life:200});
        }
        burst(PL.cx,PL.cy,'#ff6600',25,10);
        break;
      }
      case 'deathmark': {
        PL.deathMarkActive=true;
        burst(PL.cx,PL.cy,'#880000',20,8);
        break;
      }
      case 'whirlwind': {
        enemies.forEach(e=>{
          if(e.row!==CENTER_ROW){ e.row=CENTER_ROW; e.y=ROW_Y[CENTER_ROW]; e.targetY=ROW_Y[CENTER_ROW]; }
          e.frozen=(e.frozen||0)+60;
        });
        burst(W/2,H/2,'#88ffff',30,10);
        break;
      }
      case 'mirrorshield': {
        PL.mirrorActive=true;
        burst(PL.cx,PL.cy,'#aaddff',20,8);
        break;
      }
      case 'thornwall': {
        PL.thornActive=true;
        burst(PL.cx,PL.cy,'#44ff44',16,6);
        break;
      }
      case 'holybarrier': {
        PL.iframes=180;
        burst(PL.cx,PL.cy,'#ffffff',30,10);
        break;
      }
      case 'explodeshield': {
        PL.explodeShieldActive=true;
        burst(PL.cx,PL.cy,'#ff8800',20,8);
        break;
      }
    }
  }

  function applyReward(i){
    const r=getRewards()[i];
    r.fn();
    const cat=i===0?'weapon':i===1?'spell':'shield';
    const tier=Math.min(2,gs.itemTier);
    const tierStart=tier*5;
    const pool=ITEM_POOLS[cat].slice(tierStart,tierStart+5);
    const shuffled=pool.slice().sort(()=>Math.random()-0.5);
    gs.rewardItemChoices=shuffled.slice(0,3);
    gs.rewardItemChoice=0;
    gs.screen='itemreward';
  }

  function applyItemReward(i){
    const item=gs.rewardItemChoices[i];
    item.stat();
    PL.itemAbility=item.ability;
    PL.itemCd=0;
    PL.itemCdMax=item.cdMax;
    if(item.slashColor){ PL.weapon.slashColor=item.slashColor; PL.weapon.slashStyle=item.slashStyle||'sweep'; }
    gs.activeItem=item;
    gs.itemTier++;
    gs.screen='playing';
    gs.wave++;
    startWave();
  }

  // ─── overlap helper ───────────────────────────────────────────────────────
  function xOverlap(px,pw,ox,ow){ return Math.max(0, Math.min(px+pw,ox+ow)-Math.max(px,ox)); }

  // ─── update ───────────────────────────────────────────────────────────────
  function update() {
    if(gs.screen==='itemreward'){
      if(eat('ArrowLeft')&&gs.rewardItemChoice>0) gs.rewardItemChoice--;
      if(eat('ArrowRight')&&gs.rewardItemChoice<2) gs.rewardItemChoice++;
      if(eat('Digit1')) applyItemReward(0);
      if(eat('Digit2')) applyItemReward(1);
      if(eat('Digit3')) applyItemReward(2);
      if(eat('KeyW')||eat('KeyZ')) applyItemReward(gs.rewardItemChoice);
      return;
    }
    if(gs.screen==='reward'){
      if(eat('ArrowLeft')&&gs.rewardChoice>0) gs.rewardChoice--;
      if(eat('ArrowRight')&&gs.rewardChoice<2) gs.rewardChoice++;
      if(eat('Digit1')) applyReward(0);
      if(eat('Digit2')) applyReward(1);
      if(eat('Digit3')) applyReward(2);
      if(eat('KeyW')||eat('KeyZ')) applyReward(gs.rewardChoice);
      return;
    }
    if(gs.screen!=='playing') return;

    // movement
    if(eat('ArrowUp')   && PL.row<ROWS-1) PL.row++;
    if(eat('ArrowDown') && PL.row>0)      PL.row--;
    if(K['ArrowLeft'])  {
      PL.facing=-1;
      const nx=PL.x-(PL.webbed>0 ? PL.speed*0.4 : PL.speed);
      const curOverlap=obstacles.filter(o=>o.row===PL.row).reduce((s,o)=>s+xOverlap(PL.x,PL.w,o.x,o.w),0);
      const newOverlap=obstacles.filter(o=>o.row===PL.row).reduce((s,o)=>s+xOverlap(nx,PL.w,o.x,o.w),0);
      if(!obstacles.some(o=>o.row===PL.row&&nx<o.x+o.w&&nx+PL.w>o.x)||newOverlap<curOverlap) PL.x=nx;
    }
    if(K['ArrowRight']) {
      PL.facing=1;
      const nx=PL.x+(PL.webbed>0 ? PL.speed*0.4 : PL.speed);
      const curOverlap=obstacles.filter(o=>o.row===PL.row).reduce((s,o)=>s+xOverlap(PL.x,PL.w,o.x,o.w),0);
      const newOverlap=obstacles.filter(o=>o.row===PL.row).reduce((s,o)=>s+xOverlap(nx,PL.w,o.x,o.w),0);
      if(!obstacles.some(o=>o.row===PL.row&&nx<o.x+o.w&&nx+PL.w>o.x)||newOverlap<curOverlap) PL.x=nx;
    }
    PL.x = Math.max(0, Math.min(W-WD_W, PL.x));

    if(eat('KeyZ')||eat('Space')) doAttack();
    if(eat('KeyX')) doSpell();
    if(eat('KeyS') && PL.itemAbility && PL.itemCd===0) doItemAbility();

    if(PL.atkTimer  > 0) PL.atkTimer--;
    if(PL.slashTimer > 0) PL.slashTimer--;
    if(PL.iframes   > 0) PL.iframes--;
    if(blockMsg     > 0) blockMsg--;
    if(PL.itemCd    > 0) PL.itemCd--;
    if(PL.bloodlustT> 0) PL.bloodlustT--;
    if(!K['KeyC']){ PL.shBroken=false; PL.shHp=PL.shMaxHp; }

    // spawn
    if(spawnQueue.length>0){ spawnT++; if(spawnT>=spawnRate){spawnT=0;spawnEnemy();} }

    // ── Boss attack patterns & firing helper ─────────────────────────────────
    // Each boss cycles through a fixed pattern — players can memorise it.
    const BOSS_PATTERNS = {
      spider:      ['spread','spread','lunge','web','dive','spread','burst','lunge','webzone','spread'],
      lich:        ['orbs','wave','orbs','darkness','orbs','curse','soulpull','orbs','voidpull','wave'],
      apocalyptic: ['beam','focused','quake','nova','slam','beam','focused','quake','summon','nova'],
    };

    function fireBossAttack(e, def, atkType) {
      const dir = e.facing;          // –1 = toward player on left, +1 = toward player on right
      const cx  = e.x + def.w/2;
      const cy  = e.y + def.h/2;
      e.atkAnim = 30;

      switch (atkType) {
        /* ── SPIDER ─────────────────────────────────────────── */
        case 'spread': {
          const n = 3 + e.bossPhase * 2;
          for (let i=0;i<n;i++){
            const vy = (i-(n-1)/2)*0.7;
            projs.push({x:dir<0?e.x:e.x+def.w, y:cy-FB_H/2,
              vx:dir*4, vy, row:CENTER_ROW, dmg:def.dmg, owner:'enemy', isBoss:true,
              spr:SPR_FB, w:FB_W, h:FB_H, life:300});
          }
          burst(cx, cy, '#ff4400', 8);
          break;
        }
        case 'lunge': {
          e.lungeT = 45;
          burst(cx, cy, '#ff2200', 14, 5);
          break;
        }
        case 'web': {
          for (let r=Math.max(0,PL.row-1); r<=Math.min(ROWS-1,PL.row+1); r++){
            projs.push({x:dir<0?e.x:e.x+def.w, y:ROW_Y[r]+GRUNT_H/2-FB_H/2,
              vx:dir*2.2, vy:0, row:r, dmg:def.dmg*1.4, owner:'enemy', isBoss:true,
              spr:SPR_FB, w:FB_W*2, h:FB_H, life:420});
          }
          burst(cx, cy, '#884400', 10);
          break;
        }
        case 'burst': {
          for (let i=0;i<4;i++){
            setTimeout(()=>{
              if(gs.screen!=='playing') return;
              projs.push({x:dir<0?e.x:e.x+def.w, y:ROW_Y[PL.row]+GRUNT_H/2-FB_H/2,
                vx:dir*(4+i*0.5), vy:(Math.random()-0.5)*0.4, row:PL.row, dmg:def.dmg*0.7,
                owner:'enemy', isBoss:true, spr:SPR_FB, w:FB_W, h:FB_H, life:280});
            }, i*80);
          }
          burst(cx, cy, '#ff6600', 12);
          break;
        }
        /* ── LICH ───────────────────────────────────────────── */
        case 'orbs': {
          const shots = e.bossPhase + 1;
          for (let i=0;i<shots;i++){
            const targetVY = (ROW_Y[PL.row] - cy) * 0.015;
            projs.push({x:dir<0?e.x:e.x+def.w, y:cy-SP_H/2,
              vx:dir*(3.5+i*0.5), vy:targetVY+(i-Math.floor(shots/2))*0.4,
              row:e.row, dmg:def.dmg, owner:'enemy', isBoss:true,
              spr:SPR_SPELL, w:SP_W, h:SP_H, life:320});
          }
          burst(cx, cy, '#8800cc', 10);
          break;
        }
        case 'wave': {
          for (let r=0;r<ROWS;r++){
            projs.push({x:dir<0?e.x:e.x+def.w, y:ROW_Y[r]+GRUNT_H/2-SP_H/2,
              vx:dir*3.5, vy:0, row:r, dmg:def.dmg*0.8, owner:'enemy', isBoss:true,
              spr:SPR_SPELL, w:SP_W, h:SP_H, life:300});
          }
          burst(cx, cy, '#6600aa', 14);
          break;
        }
        case 'curse': {
          // Wide slow orbs on every row — hard to dodge all three
          for (let r=0;r<ROWS;r++){
            projs.push({x:dir<0?e.x:e.x+def.w, y:ROW_Y[r]+GRUNT_H/2-SP_H/2,
              vx:dir*1.8, vy:0, row:r, dmg:def.dmg*1.3,
              owner:'enemy', isBoss:true, spr:SPR_SPELL, w:Math.round(SP_W*1.4), h:Math.round(SP_H*1.4), life:400});
          }
          burst(cx, cy, '#4400ff', 16);
          break;
        }
        case 'voidpull': {
          // Rapid barrage — multiple orbs fired in quick succession at player
          for (let i=0;i<(e.bossPhase+2);i++){
            setTimeout(()=>{
              if(gs.screen!=='playing') return;
              const vY = (ROW_Y[PL.row] - cy) * 0.018;
              projs.push({x:dir<0?e.x:e.x+def.w, y:cy-SP_H/2,
                vx:dir*(4+i*0.3), vy:vY,
                row:e.row, dmg:def.dmg, owner:'enemy', isBoss:true,
                spr:SPR_SPELL, w:SP_W, h:SP_H, life:300});
            }, i*65);
          }
          burst(cx, cy, '#ff00ff', 20, 6);
          break;
        }
        /* ── APOC ───────────────────────────────────────────── */
        case 'beam': {
          for (let r=0;r<ROWS;r++){
            projs.push({x:dir<0?e.x:e.x+def.w, y:ROW_Y[r]+GRUNT_H/2-FB_H/2,
              vx:dir*5, vy:0, row:r, dmg:def.dmg, owner:'enemy', isBoss:true,
              spr:SPR_FB, w:FB_W, h:FB_H, life:300});
          }
          burst(cx, cy, '#cc0000', 20, 8);
          break;
        }
        case 'focused': {
          // 5 rapid shots locked to player's row
          for (let i=0;i<5;i++){
            setTimeout(()=>{
              if(gs.screen!=='playing') return;
              projs.push({x:dir<0?e.x:e.x+def.w, y:ROW_Y[PL.row]+GRUNT_H/2-FB_H/2,
                vx:dir*(5.5+i*0.3), vy:0, row:PL.row, dmg:def.dmg*0.8,
                owner:'enemy', isBoss:true, spr:SPR_FB, w:FB_W, h:FB_H, life:280});
            }, i*60);
          }
          burst(cx, cy, '#ff2200', 16, 5);
          break;
        }
        case 'nova': {
          // Radial burst in all directions
          const count = 8 + e.bossPhase * 2;
          for (let i=0;i<count;i++){
            const angle = (i/count)*Math.PI*2;
            projs.push({x:cx-FB_W/2, y:cy-FB_H/2,
              vx:Math.cos(angle)*4, vy:Math.sin(angle)*3,
              row:CENTER_ROW, dmg:def.dmg*0.8, owner:'enemy', isBoss:true,
              spr:SPR_FB, w:FB_W, h:FB_H, life:250});
          }
          burst(cx, cy, '#ff8800', 30, 10);
          break;
        }
        case 'summon': {
          spawnQueue.push('grunt','grunt');
          burst(cx, cy, '#660000', 25, 7);
          break;
        }
        case 'slam': {
          // V-shape: one shot per row angled to converge toward player
          for (let r=0;r<ROWS;r++){
            const vyTarget = (ROW_Y[r]+GRUNT_H/2 - cy) * 0.025;
            projs.push({x:dir<0?e.x:e.x+def.w, y:cy-FB_H/2,
              vx:dir*4.5, vy:vyTarget, row:r, dmg:def.dmg*1.1,
              owner:'enemy', isBoss:true, spr:SPR_FB, w:FB_W, h:FB_H, life:300});
          }
          burst(cx, cy, '#aa0000', 18, 6);
          break;
        }
        /* ── SPIDER new ──────────────────────────────────────────── */
        case 'webzone': {
          // Drop sticky web across 2 rows near player — slows on contact
          const rows = [PL.row, Math.max(0, PL.row-1)];
          rows.forEach(r => {
            webZones.push({ row:r, life:240, maxLife:240 });
            burst(W/2, ROW_Y[r]+40, '#ccccaa', 14, 4);
          });
          e.atkAnim = 40;
          break;
        }
        case 'dive': {
          // Spider disappears briefly, telegraphs crash-down on player's row
          e.diveT = 70;
          e.diveRow = PL.row;
          e.atkAnim = 50;
          burst(cx, cy, '#ff4400', 10, 5);
          break;
        }
        /* ── LICH new ────────────────────────────────────────────── */
        case 'darkness': {
          // Brief darkness overlay — screen dims, lich nearly invisible for 90 frames
          darknessT = 90;
          e.atkAnim = 50;
          burst(cx, cy, '#110022', 20, 6);
          break;
        }
        case 'soulpull': {
          // Vortex pulls player toward lich for 120 frames
          e.soulPullT = 120;
          e.atkAnim = 60;
          burst(cx, cy, '#aa00ff', 30, 8);
          break;
        }
        /* ── APOC new ────────────────────────────────────────────── */
        case 'quake': {
          // Telegraph then fire a shockwave that sweeps the full screen width
          e.quakeWindupT = 50;
          e.atkAnim = 60;
          burst(cx, cy, '#cc4400', 20, 6);
          break;
        }
      }
    }

    // enemy AI
    enemies.forEach(e=>{
      if(e.flashT>0) e.flashT--;
      if(e.atkAnim>0) e.atkAnim--;
      if((e.frozen||0)>0){ e.frozen--; return; }
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

      // ── BOSS AI ──────────────────────────────────────────────────────────
      if (def.isBoss) {
        const hpFrac = e.hp / e.maxHp;
        e.bossPhase = hpFrac > 0.6 ? 1 : hpFrac > 0.3 ? 2 : 3;
        const spd = def.speed * (1 + (e.bossPhase - 1) * 0.4);

        if (e.type === 'spider') {
          // Ceiling dive
          if (e.diveT > 0) {
            e.diveT--;
            if (e.diveT > 30) {
              // hiding phase — move off top of screen
              e.y = Math.max(e.y - 8, -def.h - 10);
            } else if (e.diveT === 30) {
              // start dropping onto target row
              e.y = -def.h;
              e.x = Math.max(W*0.1, Math.min(W - def.w - 8,
                PL.x + PL.w/2 - def.w/2));
            } else {
              // crashing down
              e.y += 18;
              const landY = ROW_Y[e.diveRow];
              if (e.y >= landY) {
                e.y = landY;
                // Area damage on landing row
                if (PL.row === e.diveRow) {
                  const impactBox = {x: e.x - 30, y: landY - 10, w: def.w + 60, h: def.h + 20};
                  if (ov(impactBox, PL.hb)) hurtPlayer(def.dmg * 1.4, true);
                }
                burst(e.x + def.w/2, landY, '#ff6600', 30, 9);
                e.diveT = 0;
                e.row = e.diveRow; // sync logical row so player can hit spider on landing row
                e.shootT = Math.max(55, def.shootCd - e.bossPhase*15);
              }
            }
            e.shootT--;
            return; // skip normal spider movement while diving
          }
          // Lunge state: rush toward player at high speed
          if (e.lungeT > 0) {
            e.lungeT--;
            e.x += e.facing * spd * 4.5;
            e.x = Math.max(W*0.1, Math.min(W - def.w - 8, e.x));
          } else {
            // Normal patrol in right portion
            e.moveTimer++;
            if (e.moveTimer > 90 / e.bossPhase) { e.moveDir *= -1; e.moveTimer = 0; }
            e.x += e.moveDir * spd * 1.2;
            e.x = Math.max(W*0.35, Math.min(W - def.w - 8, e.x));
          }
          e.shootT--;
          if (e.shootT <= 0) {
            const pat = BOSS_PATTERNS.spider;
            const atk = pat[e.attackIdx % pat.length];
            e.attackIdx++;
            e.shootT = atk === 'lunge' ? 60 : Math.max(55, def.shootCd - e.bossPhase * 15);
            fireBossAttack(e, def, atk);
          }

        } else if (e.type === 'lich') {
          e.y += Math.sin(Date.now()/400) * 0.6; // gentle bob
          // Clamp y every frame to stay on screen
          const lichYMin = ROW_Y[2] - 10, lichYMax = ROW_Y[0] + def.h;
          e.y = Math.max(lichYMin, Math.min(lichYMax, e.y));
          // Teleport rows periodically
          e.teleTimer++;
          if (e.teleTimer > 100 / e.bossPhase) {
            e.teleTimer = 0;
            const newRow = Math.floor(Math.random()*ROWS);
            e.row = newRow;
            e.targetY = ROW_Y[newRow] + (GRUNT_H - def.h)/2;
            e.x = W*0.25 + Math.random()*(W*0.65 - W*0.25);
            burst(eCX, e.y+def.h/2, '#aa44ff', 16, 5);
            e.flashT = 15;
            e.atkAnim = 0;
          }
          const targY = e.targetY !== undefined ? e.targetY : ROW_Y[CENTER_ROW];
          e.y += (targY - e.y) * 0.04;
          // Chase player but maintain a safe melee distance
          const playerDist = Math.abs(eCX - (PL.x + PL.w/2));
          if (playerDist < 170) {
            e.x -= dirToPlayer * spd * 1.2; // flee when player too close
          } else {
            e.x = Math.max(W*0.35, Math.min(W - def.w - 8, e.x + dirToPlayer * spd * 0.35));
          }
          // Soul vortex pull
          if (e.soulPullT > 0) {
            e.soulPullT--;
            // Pull player slightly toward lich
            const pullDir = eCX > PL.cx ? 1 : -1;
            const pullStrength = 0.6;
            PL.x = Math.max(0, Math.min(W - PL.w, PL.x + pullDir * pullStrength));
          }
          e.shootT--;
          if (e.shootT <= 0) {
            const pat = BOSS_PATTERNS.lich;
            const atk = pat[e.attackIdx % pat.length];
            e.attackIdx++;
            e.shootT = Math.max(60, def.shootCd - e.bossPhase * 10);
            fireBossAttack(e, def, atk);
          }

        } else if (e.type === 'apocalyptic') {
          // Slowly advance toward player from either side
          e.x = Math.max(W*0.2, Math.min(W - def.w - 5, e.x + dirToPlayer * spd));
          // Shockwave windup + fire
          if (e.quakeWindupT > 0) {
            e.quakeWindupT--;
            if (e.quakeWindupT % 8 === 0) {
              burst(e.x + def.w/2, e.y + def.h, '#cc4400', 8, 4);
            }
            if (e.quakeWindupT === 0) {
              // Fire the shockwave from apoc's side
              const swDir = e.facing; // toward player
              shockwaves.push({
                x: swDir > 0 ? e.x + def.w : e.x,
                vx: swDir * 7,
                life: 130,
                dmg: def.dmg * 1.3,
                isBoss: true,
              });
              burst(e.x + def.w/2, e.y + def.h/2, '#ff4400', 25, 10);
            }
            e.enrageT++;
            return; // pause normal apoc movement during windup
          }
          e.enrageT++;
          const chargeTime = Math.max(70, 140 - e.bossPhase * 25);
          if (e.enrageT >= chargeTime) {
            e.enrageT = 0;
            const pat = BOSS_PATTERNS.apocalyptic;
            const atk = pat[e.attackIdx % pat.length];
            e.attackIdx++;
            fireBossAttack(e, def, atk);
          }
        }

        // Contact damage with cooldown — row proximity + horizontal overlap
        // (pixel-perfect Y check misses player standing 1 row above boss)
        if (e.meleeCd > 0) e.meleeCd--;
        const rowDist   = Math.abs(PL.row - e.row);
        const horizOvlp = PL.x + PL.w - 10 > e.x + def.w * 0.2 &&
                          PL.x + 10       < e.x + def.w * 0.8;
        if (e.meleeCd === 0 && rowDist <= 1 && horizOvlp) {
          hurtPlayer(def.dmg * 0.5, true);
          e.meleeCd = 60;
        }
        return;
      }
      // ── NORMAL ENEMY AI ───────────────────────────────────────────────────

      // Brute: telegraphed swing attack ─────────────────────────────────────
      if (e.type === 'brute') {
        if (e.windupT > 0) {
          // Wind-up phase: flash warning, no movement
          e.windupT--;
          if (e.windupT % 6 === 0) burst(e.x + def.w/2, e.y + def.h/2, '#ff8800', 5, 3);
          if (e.windupT === 0) e.swingT = 20; // start active swing
          // still count down shoot timer but skip movement
          e.shootT--;
          return;
        }
        if (e.swingT > 0) {
          // Active swing: large hitbox in facing direction
          e.swingT--;
          const swX = e.facing > 0 ? e.x + def.w - 10 : e.x - 130;
          if (e.row === PL.row && ov({x:swX,y:ROW_Y[e.row]-10,w:150,h:def.h+20}, PL.hb)) {
            hurtPlayer(def.dmg * 1.6, false);
          }
          if (e.swingT === 0) { e.swingCd = 260; burst(e.x+def.w/2,e.y+def.h/2,'#cc4400',18,6); }
          e.shootT--;
          return;
        }
        if (e.swingCd > 0) e.swingCd--;
        const distToPlayer = Math.abs((e.x+def.w/2) - (PL.x+PL.w/2));
        if (e.swingCd === 0 && distToPlayer < 200 && e.row === PL.row) {
          e.windupT = 38;
          burst(e.x+def.w/2, e.y+def.h/2, '#ff6600', 16, 5);
        }
      }

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
        e.shootT = Math.max(70, def.shootCd - gs.wave*5);
        const rowDist = Math.abs(e.row - PL.row);
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
        hurtPlayer(def.dmg, false);
      }
    });

    enemies = enemies.filter(e=>e.hp>0 && e.x>-80 && e.x<W+120);

    // projectiles
    projs.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.life--;
      if(p.owner==='player'){
        enemies.forEach(e=>{
          if(e.phase!=='charge') return;
          const def2 = ENEMY_TYPES[e.type];
          // Bosses can be hit from any row; normal enemies same-row only
          if(!def2.isBoss){
            if(Math.abs(e.row - p.row) > 0) return;
          }
          const hitbox = def2.isBoss
            ? {x:e.x+10, y:e.y+8, w:def2.w-20, h:def2.h-16}
            : ehb(e);
          if(ov({x:p.x,y:p.y,w:p.w,h:p.h}, hitbox)){
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
        if(PL.mirrorActive && hitRow===PL.row && ov({x:p.x,y:p.y,w:p.w,h:p.h},PL.hb)){
          PL.mirrorActive=false; p.vx=-p.vx; p.owner='player'; p.dmg*=2;
          burst(PL.cx,PL.cy,'#aaddff',16,6);
          return;
        }
        if(hitRow===PL.row && ov({x:p.x,y:p.y,w:p.w,h:p.h}, PL.hb)){
          hurtPlayer(p.dmg, !!p.isBoss); p.life=0;
        }
      }
    });
    // Obstacle collision for projectiles
    projs=projs.filter(p=>{
      if(p.life<=0||p.x<=-40||p.x>=W+40) return false;
      if(obstacles.some(o=>o.row===p.row&&p.x<o.x+o.w&&p.x+p.w>o.x&&
          p.y<o.y+o.h&&p.y+p.h>o.y)){
        burst(p.x,p.y,'#887766',6,3); return false;
      }
      return true;
    });

    // drops
    drops.forEach(d=>{
      d.life--;
      const dSize = (d.type==='bighealth'||d.type==='fullspell') ? 36 : 22;
      if(d.row===PL.row&&ov({x:d.x,y:ROW_Y[d.row],w:dSize,h:dSize},PL.hb)){
        if(d.type==='health'){
          gs.hp=Math.min(gs.maxHp,gs.hp+35);
          burst(d.x,ROW_Y[d.row],HG,12);
        } else if(d.type==='bighealth'){
          gs.hp=Math.min(gs.maxHp, gs.hp + Math.ceil(gs.maxHp*0.5));
          burst(d.x,ROW_Y[d.row],'#00ffaa',24,9);
        } else if(d.type==='spell' && gs.spellUses < gs.maxSpell){
          gs.spellUses=Math.min(gs.maxSpell, gs.spellUses+1);
          burst(d.x,ROW_Y[d.row],'#aa44ff',14,6);
        } else if(d.type==='fullspell'){
          gs.spellUses = gs.maxSpell;
          burst(d.x,ROW_Y[d.row],'#ff44ff',20,8);
        }
        d.life=0;
      }
    });
    drops=drops.filter(d=>d.life>0);

    // particles
    parts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.18; p.life--; });
    parts=parts.filter(p=>p.life>0);

    // shockwaves
    shockwaves.forEach(sw => {
      sw.x += sw.vx;
      sw.life--;
      // Hit player if shockwave sweeps through their x position on any row
      if (sw.life > 0) {
        const swLeft = Math.min(sw.x, sw.x - sw.vx);
        const swRight = Math.max(sw.x, sw.x - sw.vx);
        if (PL.x < swRight + 12 && PL.x + PL.w > swLeft - 12) {
          hurtPlayer(sw.dmg, sw.isBoss);
        }
      }
    });
    shockwaves = shockwaves.filter(sw => sw.life > 0 && sw.x > -60 && sw.x < W + 60);

    // web zones — slow player if on same row
    if (PL.webbed > 0) PL.webbed--;
    webZones.forEach(wz => {
      wz.life--;
      if (wz.row === PL.row) PL.webbed = Math.max(PL.webbed, 4); // keep refreshing while on row
    });
    webZones = webZones.filter(wz => wz.life > 0);

    // wave complete
    if(!cleared&&spawnQueue.length===0&&enemies.length===0){
      cleared=true; msgT=0;
      // Guarantee 1–2 spell refill orbs
      const spellCount = 1 + Math.floor(Math.random()*2);
      for(let i=0;i<spellCount;i++){
        const row = Math.floor(Math.random()*ROWS);
        drops.push({x: 150 + Math.random()*(W-300), y: ROW_Y[row],
          row, type:'spell', life:500});
      }
      if(isBossWave()){
        // Boss cleared — advance level, big fanfare + loot drops
        msg = '★ BOSS DEFEATED ★'; msgT = 220;
        burst(W/2, H/2, '#ffcc00', 40, 10);
        gs.level++;
        // Instant loot drops (collect while reward screen shows)
        drops.push({x: W/2 - 40, y: ROW_Y[0], row: 0, type:'bighealth', life:900});
        drops.push({x: W/2 + 20, y: ROW_Y[0], row: 0, type:'fullspell', life:900});
        // After brief fanfare, show the upgrade choice screen (or victory if all bosses done)
        if(gs.level > 3){
          msg='★ WOLFDRAGON VICTORIOUS ★'; msgT=220;
          burst(W/2,H/2,'#ffcc00',60,12);
          setTimeout(()=>{ gs.screen='victory'; setTimeout(()=>{ gs.screen='title'; }, 7000); }, 3000);
        } else {
          setTimeout(()=>{ gs.screen='reward'; gs.rewardChoice=0; }, 2800);
        }
      } else {
        setTimeout(()=>{ gs.wave++; startWave(); },2200);
      }
    }
    if(msgT>0) msgT--;
  }

  // ─── BG themes (one per level, cycling) ──────────────────────────────────
  const BG_THEMES = [
    // 1 — Hellfire
    { sky0:'#08000f', sky1:'#180020', sky2:'#280010',
      mtn:'#120008', glowRgb:'180,20,0', ember:'#ff6600',
      ground:'#180404', crack:'#bb2200', line:'#cc2200',
      vignRgb:'200,0,30', rowA:'rgba(110,0,0,0.08)', rowB:'rgba(70,0,50,0.07)' },
    // 2 — Void Ruins
    { sky0:'#06001a', sky1:'#0a0030', sky2:'#100025',
      mtn:'#08001a', glowRgb:'90,0,200', ember:'#9933ff',
      ground:'#0a0018', crack:'#550099', line:'#8800ff',
      vignRgb:'120,0,220', rowA:'rgba(60,0,130,0.09)', rowB:'rgba(40,0,80,0.07)' },
    // 3 — Lava Cavern
    { sky0:'#0f0400', sky1:'#1e0800', sky2:'#2e0a00',
      mtn:'#1a0400', glowRgb:'220,70,0', ember:'#ff9900',
      ground:'#200500', crack:'#ff4400', line:'#ff6600',
      vignRgb:'220,60,0', rowA:'rgba(160,40,0,0.09)', rowB:'rgba(100,20,0,0.07)' },
    // 4 — Frozen Tomb
    { sky0:'#000a12', sky1:'#001525', sky2:'#002035',
      mtn:'#001020', glowRgb:'0,100,200', ember:'#00ccff',
      ground:'#001525', crack:'#0066bb', line:'#00aaff',
      vignRgb:'0,100,200', rowA:'rgba(0,80,160,0.08)', rowB:'rgba(0,50,100,0.06)' },
    // 5 — Cosmic Abyss
    { sky0:'#020008', sky1:'#050010', sky2:'#080008',
      mtn:'#030008', glowRgb:'180,0,180', ember:'#ff00ff',
      ground:'#060008', crack:'#880088', line:'#cc00cc',
      vignRgb:'160,0,160', rowA:'rgba(100,0,100,0.08)', rowB:'rgba(60,0,80,0.07)' },
  ];

  let bgOff=0;
  function drawBG(){
    bgOff=(bgOff+0.4)%W;
    const th = BG_THEMES[(gs.level-1) % BG_THEMES.length];
    const sky=ctx.createLinearGradient(0,0,0,GROUND_Y);
    sky.addColorStop(0,th.sky0); sky.addColorStop(0.5,th.sky1); sky.addColorStop(1,th.sky2);
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,GROUND_Y);

    ctx.fillStyle=th.mtn;
    for(let i=0;i<7;i++){
      const mx=((i*130-bgOff*0.2)%(W+40))-20;
      const mh=55+(i%3)*35;
      ctx.beginPath(); ctx.moveTo(mx,GROUND_Y);
      ctx.lineTo(mx+60,GROUND_Y-mh); ctx.lineTo(mx+120,GROUND_Y); ctx.fill();
    }

    const hg=ctx.createLinearGradient(0,GROUND_Y-35,0,GROUND_Y);
    hg.addColorStop(0,`rgba(${th.glowRgb},0)`); hg.addColorStop(1,`rgba(${th.glowRgb},0.42)`);
    ctx.fillStyle=hg; ctx.fillRect(0,GROUND_Y-35,W,35);

    ROW_Y.forEach((ry,i)=>{
      ctx.fillStyle=i%2===0?th.rowA:th.rowB;
      ctx.fillRect(0,ry,W,68);
    });

    const t=Date.now()/1000;
    for(let i=0;i<18;i++){
      const ex=((i*53+t*30*(i%3===0?1:-0.5))%W+W)%W;
      const ey=GROUND_Y-20-((t*(15+i%5)+i*37)%200);
      if(ey<0||ey>GROUND_Y) continue;
      ctx.globalAlpha=0.25+(i%3)*0.12;
      ctx.fillStyle=th.ember; ctx.fillRect(ex,ey,2,2);
    }
    ctx.globalAlpha=1;

    ctx.fillStyle=th.ground; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    ctx.strokeStyle=th.crack; ctx.lineWidth=1;
    for(let i=0;i<10;i++){
      const gx=((i*87-bgOff*0.6)%(W+40))-20;
      ctx.globalAlpha=0.65;
      ctx.beginPath(); ctx.moveTo(gx,GROUND_Y+1);
      ctx.lineTo(gx+9,GROUND_Y+9); ctx.lineTo(gx+14,H); ctx.stroke();
    }
    ctx.globalAlpha=1;
    ctx.fillStyle=th.line; ctx.fillRect(0,GROUND_Y,W,3);

    const tg=ctx.createLinearGradient(0,0,0,50);
    tg.addColorStop(0,`rgba(${th.vignRgb},0.55)`); tg.addColorStop(1,`rgba(${th.vignRgb},0)`);
    ctx.fillStyle=tg; ctx.fillRect(0,0,W,50);
  }

  // ─── obstacles ────────────────────────────────────────────────────────────
  function generateObstacles(){
    obstacles=[];
    if(gs.wave<=1 && gs.level===1) return; // gentle intro
    const count=Math.min(4, 1+Math.floor((gs.wave-1)/2));
    for(let attempt=0; attempt<count*5; attempt++){
      if(obstacles.length>=count) break;
      const row  = Math.floor(Math.random()*ROWS);
      const type = Math.random()<0.55 ? 'boulder' : 'ruin';
      const w    = type==='boulder' ? 52 : 46;
      const h    = type==='boulder' ? 42 : 55;
      const x    = 180 + Math.random()*380;
      // Avoid overlap with existing obstacles in same row
      if(obstacles.some(o=>o.row===row&&Math.abs(o.x-x)<90)) continue;
      obstacles.push({ x, y:ROW_Y[row]+WD_H-h, w, h, row, type });
    }
  }

  function drawObstacles(){
    const th = BG_THEMES[(gs.level-1) % BG_THEMES.length];
    obstacles.forEach(o=>{
      ctx.save();
      if(o.type==='boulder'){
        const cx=o.x+o.w/2, cy=o.y+o.h*0.58;
        const g=ctx.createRadialGradient(cx-o.w*0.12,cy-o.h*0.15,2,cx,cy,o.w*0.6);
        g.addColorStop(0,'#706868'); g.addColorStop(0.55,'#383030'); g.addColorStop(1,'#1a1515');
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.ellipse(cx,cy,o.w*0.5,o.h*0.48,0,0,Math.PI*2); ctx.fill();
        // crack
        ctx.strokeStyle='#111'; ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(cx-o.w*0.08,cy-o.h*0.22); ctx.lineTo(cx+o.w*0.06,cy+o.h*0.08);
        ctx.lineTo(cx+o.w*0.18,cy+o.h*0.22); ctx.stroke();
        // highlight
        ctx.strokeStyle='rgba(255,255,255,0.13)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(cx-o.w*0.1,cy-o.h*0.14,o.w*0.26,Math.PI*1.1,Math.PI*1.85); ctx.stroke();
        // Colour tint from theme (subtle)
        ctx.globalAlpha=0.18;
        ctx.fillStyle=th.line;
        ctx.beginPath(); ctx.ellipse(cx,cy,o.w*0.5,o.h*0.48,0,0,Math.PI*2); ctx.fill();
      } else {
        // Stone ruin pillar
        const g2=ctx.createLinearGradient(o.x,o.y,o.x+o.w,o.y);
        g2.addColorStop(0,'#444'); g2.addColorStop(0.35,'#565656'); g2.addColorStop(1,'#222');
        ctx.fillStyle=g2; ctx.fillRect(o.x,o.y,o.w,o.h);
        // horizontal mortar lines
        ctx.strokeStyle='#1e1e1e'; ctx.lineWidth=1;
        for(let by=o.y+10;by<o.y+o.h;by+=13){
          ctx.beginPath(); ctx.moveTo(o.x,by); ctx.lineTo(o.x+o.w,by); ctx.stroke();
        }
        // vertical mortar (offset each row)
        for(let row2=0,by=o.y;by<o.y+o.h;by+=13,row2++){
          const off=row2%2===0?0:10;
          for(let bx=o.x+off;bx<o.x+o.w;bx+=20){
            ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx,by+13); ctx.stroke();
          }
        }
        // broken top cap
        ctx.fillStyle='#666'; ctx.fillRect(o.x,o.y,o.w,5);
        ctx.fillStyle='#333';
        ctx.fillRect(o.x+6,o.y-5,9,5); ctx.fillRect(o.x+o.w-17,o.y-5,11,5);
        // Colour tint
        ctx.globalAlpha=0.15; ctx.fillStyle=th.line;
        ctx.fillRect(o.x,o.y,o.w,o.h);
      }
      ctx.restore();
    });
  }

  // ─── victory screen ───────────────────────────────────────────────────────
  function drawVictory(){
    ctx.fillStyle='rgba(0,0,0,0.92)'; ctx.fillRect(0,0,W,H);
    const t = Date.now()/1000;
    ctx.shadowColor = `rgba(255,200,0,${0.6+Math.sin(t*2)*0.4})`;
    ctx.shadowBlur = 40;
    ctx.fillStyle='#ffcc00'; ctx.font='bold 42px monospace'; ctx.textAlign='center';
    ctx.fillText('VICTORY', W/2, 160);
    ctx.shadowBlur = 0;
    ctx.fillStyle='#cc0000'; ctx.font='bold 18px monospace';
    ctx.fillText('You have slain the demon army.', W/2, 220);
    ctx.fillStyle='#ffaa00'; ctx.font='bold 22px monospace';
    ctx.fillText('Bask in the glory of Wolfdragon!', W/2, 262);
    drawWDSprite(W/2 - WD_W/2, 290, false, false);
    ctx.fillStyle='#888'; ctx.font='13px monospace';
    ctx.fillText(`FINAL SCORE: ${gs.score}`, W/2, 420);
    ctx.textAlign='left';
  }

  // ─── item reward screen ───────────────────────────────────────────────────
  function drawItemReward(){
    ctx.fillStyle='rgba(0,0,0,0.92)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#aa44ff'; ctx.font='bold 22px monospace'; ctx.textAlign='center';
    ctx.fillText('✦  CHOOSE YOUR ITEM  ✦',W/2,65);
    ctx.fillStyle='#666'; ctx.font='13px monospace';
    ctx.fillText('← → navigate   Z / W confirm   or press 1 / 2 / 3',W/2,90);
    if(gs.activeItem){
      ctx.fillStyle='#555'; ctx.font='11px monospace';
      ctx.fillText(`Current: ${gs.activeItem.name} — V: ${gs.activeItem.abilityName}`,W/2,112);
    }
    const items=gs.rewardItemChoices||[];
    const cardW=200,cardH=240,gap=20;
    const totalW=cardW*3+gap*2;
    const startX=(W-totalW)/2;
    items.forEach((item,i)=>{
      const cx=startX+i*(cardW+gap),cy=125;
      const sel=gs.rewardItemChoice===i;
      ctx.fillStyle=sel?'rgba(170,68,255,0.20)':'rgba(255,255,255,0.05)';
      ctx.fillRect(cx,cy,cardW,cardH);
      ctx.strokeStyle=sel?'#aa44ff':'#444'; ctx.lineWidth=sel?2.5:1;
      ctx.strokeRect(cx,cy,cardW,cardH);
      ctx.fillStyle=sel?'#aa44ff':'#666'; ctx.font='bold 12px monospace'; ctx.textAlign='center';
      ctx.fillText(`[${i+1}]`,cx+cardW/2,cy+18);
      ctx.font='34px sans-serif'; ctx.fillText(item.icon,cx+cardW/2,cy+64);
      ctx.fillStyle=sel?'#ffffff':'#cccccc'; ctx.font='bold 13px monospace';
      ctx.fillText(item.name,cx+cardW/2,cy+90);
      ctx.fillStyle='#999'; ctx.font='10px monospace';
      const dlines=item.desc.split('/');
      dlines.forEach((l,li)=>ctx.fillText(l.trim(),cx+cardW/2,cy+108+li*14));
      ctx.fillStyle=sel?'#ffcc00':'#888'; ctx.font='bold 11px monospace';
      ctx.fillText('★ '+item.abilityName,cx+cardW/2,cy+145);
      ctx.fillStyle='#777'; ctx.font='10px monospace';
      const words=item.abDesc.split(' '); let line='',ly=cy+162;
      words.forEach(w=>{
        if((line+w).length>22){ ctx.fillText(line.trim(),cx+cardW/2,ly); line=''; ly+=13; }
        line+=w+' ';
      });
      if(line) ctx.fillText(line.trim(),cx+cardW/2,ly);
    });
    ctx.textAlign='left';
  }

  // ─── reward screen ────────────────────────────────────────────────────────
  function drawReward(){
    ctx.fillStyle='rgba(0,0,0,0.88)'; ctx.fillRect(0,0,W,H);
    // title
    ctx.fillStyle='#ffcc00'; ctx.font='bold 26px monospace'; ctx.textAlign='center';
    ctx.fillText('★  BOSS DEFEATED — CHOOSE YOUR REWARD  ★',W/2,70);
    ctx.fillStyle='#888'; ctx.font='13px monospace';
    ctx.fillText('← → navigate   Z / W confirm   or press 1 / 2 / 3',W/2,98);
    const rewards=getRewards();
    const cardW=200, cardH=180, gap=20;
    const totalW=cardW*3+gap*2;
    const startX=(W-totalW)/2;
    rewards.forEach((r,i)=>{
      const cx=startX+i*(cardW+gap), cy=140;
      const sel=gs.rewardChoice===i;
      // Card bg
      ctx.fillStyle=sel?'rgba(255,200,0,0.18)':'rgba(255,255,255,0.06)';
      ctx.fillRect(cx,cy,cardW,cardH);
      ctx.strokeStyle=sel?'#ffcc00':'#555'; ctx.lineWidth=sel?2.5:1;
      ctx.strokeRect(cx,cy,cardW,cardH);
      // Number
      ctx.fillStyle=sel?'#ffcc00':'#777'; ctx.font=`bold 12px monospace`; ctx.textAlign='center';
      ctx.fillText(`[${i+1}]`,cx+cardW/2,cy+18);
      // Icon
      ctx.font=`38px sans-serif`;
      ctx.fillText(r.icon,cx+cardW/2,cy+70);
      // Label
      ctx.fillStyle=sel?'#ffffff':'#cccccc'; ctx.font=`bold 15px monospace`;
      ctx.fillText(r.label,cx+cardW/2,cy+102);
      // Desc (two lines)
      ctx.fillStyle='#999'; ctx.font=`11px monospace`;
      const lines=r.desc.split('\n');
      lines.forEach((ln,li)=>ctx.fillText(ln,cx+cardW/2,cy+122+li*16));
    });
    ctx.textAlign='left';
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
    // Shield pips now drawn near player in drawPlayer() — nothing needed here
    ctx.fillStyle='#cc0000'; ctx.font='bold 13px monospace';
    ctx.textAlign='center'; ctx.fillText('SCORE '+String(gs.score).padStart(7,'0'),W/2,22);
    ctx.textAlign='left';
    ctx.fillStyle='#cc8800'; ctx.font='11px monospace';
    ctx.fillText(`LVL ${gs.level}   WAVE ${gs.wave}`,W-155,22);
    // (controls shown above the canvas in HTML)

    // Active item V ability
    if(gs.activeItem){
      const cdFrac=PL.itemCd/Math.max(1,PL.itemCdMax);
      const vReady=PL.itemCd===0;
      ctx.fillStyle=vReady?'#ffcc00':'#666';
      ctx.font='bold 10px monospace'; ctx.textAlign='right';
      ctx.fillText(`S: ${gs.activeItem.abilityName}${vReady?' ✓':' ('+(Math.ceil(PL.itemCd/60))+'s)'}`,W-12,38);
      if(!vReady){
        ctx.fillStyle='#333'; ctx.fillRect(W-120,28,100,4);
        ctx.fillStyle='#aa44ff'; ctx.fillRect(W-120,28,Math.round(100*(1-cdFrac)),4);
      }
      ctx.textAlign='left';
    }

    // Boss health bar — shown below HUD when a boss is on screen
    const boss = enemies.find(e=>ENEMY_TYPES[e.type].isBoss);
    if(boss){
      const bdef = ENEMY_TYPES[boss.type];
      const bw = W - 40, bx2 = 20, by2 = 46;
      const bfrac = boss.hp / boss.maxHp;
      // Background
      ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(0,44,W,20);
      ctx.fillStyle='#1a0000'; ctx.fillRect(bx2,by2,bw,10);
      // Bar colour shifts red→orange→yellow as boss takes damage
      const barCol = boss.bossPhase===3?'#ff6600':boss.bossPhase===2?'#cc0000':'#880000';
      ctx.fillStyle = barCol;
      ctx.fillRect(bx2, by2, Math.floor(bw*bfrac), 10);
      // Pulse overlay when enraged
      if(boss.bossPhase===3){
        ctx.fillStyle=`rgba(255,100,0,${0.15+Math.sin(Date.now()/60)*0.12})`;
        ctx.fillRect(bx2, by2, Math.floor(bw*bfrac), 10);
      }
      ctx.strokeStyle='#440000'; ctx.lineWidth=1; ctx.strokeRect(bx2,by2,bw,10);
      // Label
      const bname = boss.type.toUpperCase();
      ctx.fillStyle='#ff4400'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
      ctx.fillText(`⚡ ${bname} — ${Math.ceil(boss.hp)}/${boss.maxHp} ⚡`, W/2, by2+8);
      ctx.textAlign='left';
    }
  }

  // ─── draw player ──────────────────────────────────────────────────────────
  function drawPlayer(){
    const wy = ROW_Y[PL.row];

    // Shield aura (behind player) + pip bar above head
    if(PL.sh){
      const t     = Date.now();
      const pulse = 0.55 + Math.sin(t / 80) * 0.45;
      const brokenColor = '#ff6622';
      const baseColor   = PL.shBroken ? brokenColor : '#55bbff';
      const glowColor   = PL.shBroken ? '#ff4400'   : '#4499ff';

      const ecx = PL.cx;
      const ecy = wy + PL.h * 0.5;
      const erx = PL.w * 0.72;   // horizontal radius — slightly wider than player
      const ery = PL.h * 0.62;   // vertical radius   — slightly taller than player

      ctx.save();

      // Outer glow ellipse
      ctx.shadowColor = glowColor;
      ctx.shadowBlur  = 24;
      ctx.globalAlpha = pulse * 0.5;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth   = 10;
      ctx.beginPath();
      ctx.ellipse(ecx, ecy, erx + 10, ery + 10, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner crisp ellipse
      ctx.shadowBlur  = 8;
      ctx.globalAlpha = pulse * 0.88;
      ctx.lineWidth   = 2;
      ctx.strokeStyle = PL.shBroken ? '#ffaa66' : '#cceeff';
      ctx.beginPath();
      ctx.ellipse(ecx, ecy, erx, ery, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      // Shield pip bar above player's head
      const pipW = 10, pipH = 7, pipGap = 4;
      const totalPipW = PL.shMaxHp * (pipW + pipGap) - pipGap;
      const pipStartX = PL.cx - totalPipW / 2;
      const pipY = wy - 18;
      for(let i = 0; i < PL.shMaxHp; i++){
        const filled = i < PL.shHp;
        const px = pipStartX + i * (pipW + pipGap);
        ctx.save();
        ctx.shadowColor = filled ? glowColor : 'transparent';
        ctx.shadowBlur  = filled ? 6 : 0;
        ctx.fillStyle   = filled ? (PL.shBroken ? '#ff6622' : '#55bbff') : 'rgba(20,30,60,0.7)';
        ctx.beginPath();
        ctx.roundRect(px, pipY, pipW, pipH, 2);
        ctx.fill();
        ctx.strokeStyle = filled ? (PL.shBroken ? '#ffaa55' : '#aaddff') : '#334';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Player sprite
    if(PL.iframes>0 && Math.floor(PL.iframes/4)%2===0) return;
    drawWDSprite(PL.x, wy, PL.facing < 0, PL.atk);

    // Weapon slash arc — style varies by PL.weapon.slashStyle
    if(PL.slashTimer > 0){
      const prog     = 1 - (PL.slashTimer / PL.atkDur);
      const alpha    = Math.max(0, 1 - prog * 1.4);
      const slashX   = PL.facing > 0 ? PL.x + PL.w - 6 : PL.x - PL.atkRange + 6;
      const slashCX  = slashX + PL.atkRange / 2;
      const slashCY  = wy + PL.h * 0.45;
      const baseR    = PL.atkRange * 0.55 * (0.4 + prog * 0.6);
      const startA   = PL.facing > 0 ? -Math.PI * 0.65 : -Math.PI * 0.35;
      const endA     = PL.facing > 0 ?  Math.PI * 0.25 : Math.PI + Math.PI * 0.65;
      const ccw      = PL.facing < 0;
      const SC       = PL.weapon.slashColor || '#c8b8e8';
      const style    = PL.weapon.slashStyle  || 'sweep';

      ctx.save();

      if(style === 'sweep'){
        // Wide claw sweep — thick primary arc + thin white inner arc
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = SC;
        ctx.lineWidth   = 5;
        ctx.beginPath(); ctx.arc(slashCX, slashCY, baseR, startA, endA, ccw); ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 2;
        ctx.globalAlpha = alpha * 0.65;
        ctx.beginPath(); ctx.arc(slashCX, slashCY, baseR * 0.82, startA, endA, ccw); ctx.stroke();

      } else if(style === 'blade'){
        // Sharp dual-line blade — two thin arcs + bright leading-edge flash
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = SC;
        ctx.lineWidth   = 2;
        ctx.beginPath(); ctx.arc(slashCX, slashCY, baseR,     startA, endA, ccw); ctx.stroke();
        ctx.beginPath(); ctx.arc(slashCX, slashCY, baseR + 7, startA, endA, ccw); ctx.stroke();
        // bright white flash at the leading edge, fades as swing ends
        ctx.globalAlpha = alpha * (1 - prog) * 1.2;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 3;
        ctx.beginPath(); ctx.arc(slashCX, slashCY, baseR + 3, startA, endA, ccw); ctx.stroke();

      } else if(style === 'thunder'){
        // Glowing arc + 3 jagged lightning bolts radiating outward
        ctx.globalAlpha = alpha;
        ctx.shadowColor = SC;
        ctx.shadowBlur  = 14;
        ctx.strokeStyle = SC;
        ctx.lineWidth   = 3;
        ctx.beginPath(); ctx.arc(slashCX, slashCY, baseR, startA, endA, ccw); ctx.stroke();
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.arc(slashCX, slashCY, baseR, startA, endA, ccw); ctx.stroke();
        // lightning bolts (deterministic via prog to avoid flicker each frame)
        const seed = Math.floor(prog * 8);
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = SC;
        ctx.lineWidth   = 1.5;
        for(let li = 0; li < 3; li++){
          const ang = startA + (endA - startA) * ((li + 0.5) / 3);
          const ex  = slashCX + Math.cos(ang) * baseR;
          const ey  = slashCY + Math.sin(ang) * baseR;
          const jx  = (slashCX + ex) / 2 + ((seed * 7 + li * 13) % 30 - 15);
          const jy  = (slashCY + ey) / 2 + ((seed * 11 + li * 17) % 30 - 15);
          ctx.beginPath();
          ctx.moveTo(slashCX, slashCY);
          ctx.lineTo(jx, jy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }

      } else if(style === 'void'){
        // Wide dark void slash — extra-thick outer glow + ghost reverse arc
        const voidR = baseR * 1.3;
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = SC;
        ctx.lineWidth   = 7;
        ctx.beginPath(); ctx.arc(slashCX, slashCY, voidR, startA, endA, ccw); ctx.stroke();
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = '#aa00ff';
        ctx.lineWidth   = 14;
        ctx.beginPath(); ctx.arc(slashCX, slashCY, voidR * 1.12, startA, endA, ccw); ctx.stroke();
        // thin white core
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = '#ddbbff';
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.arc(slashCX, slashCY, voidR * 0.88, startA, endA, ccw); ctx.stroke();
      }

      ctx.restore();
    }

    // Armed-ability + timed-ability indicators (stacked icons above head)
    {
      const inds = [];
      if(PL.soulDrainActive)     inds.push('💀');
      if(PL.deathMarkActive)     inds.push('☠');
      if(PL.mirrorActive)        inds.push('🔵');
      if(PL.thornActive)         inds.push('🌿');
      if(PL.explodeShieldActive) inds.push('💣');
      if(PL.bloodlustT > 0)      inds.push('🩸');
      if(inds.length > 0){
        const pulse   = 0.7 + Math.sin(Date.now()/150)*0.3;
        const spacing = 20;
        const startX  = PL.cx - (inds.length - 1) * spacing / 2;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.font        = '15px serif';
        ctx.textAlign   = 'center';
        inds.forEach((ic, i) => ctx.fillText(ic, startX + i * spacing, wy - 30));
        ctx.restore();
      }
      // Bloodlust timer bar under indicator row
      if(PL.bloodlustT > 0){
        const barW = PL.w * (PL.bloodlustT / 300);
        ctx.save();
        ctx.fillStyle   = '#ff0044';
        ctx.globalAlpha = 0.75;
        ctx.fillRect(PL.x, wy - 22, barW, 3);
        ctx.restore();
      }
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
      def.drawFn(e.x, e.y, e.facing < 0, e.atkAnim > 0);
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
      // Brute wind-up warning
      if(e.type==='brute' && e.windupT > 0){
        const pulse = Math.floor(e.windupT / 4) % 2 === 0;
        ctx.globalAlpha = pulse ? 0.9 : 0.4;
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!!', e.x + def.w/2, e.y - 14);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }
      // Brute swing arc
      if(e.type==='brute' && e.swingT > 0){
        const prog = 1 - e.swingT / 20;
        const arcX = e.facing > 0 ? e.x + def.w - 10 : e.x + 10;
        const arcDir = e.facing > 0 ? 1 : -1;
        ctx.save();
        ctx.globalAlpha = 0.75 * (1 - prog * 0.5);
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const startAngle = arcDir > 0 ? -Math.PI*0.55 : -Math.PI*0.45;
        const endAngle   = arcDir > 0 ? Math.PI*0.15  : Math.PI + Math.PI*0.55;
        const radius = 80 + prog * 60;
        ctx.arc(arcX, e.y + def.h * 0.4, radius,
                arcDir > 0 ? startAngle : Math.PI - Math.PI*0.15,
                arcDir > 0 ? endAngle   : Math.PI + Math.PI*0.55);
        ctx.stroke();
        // bright leading edge
        ctx.globalAlpha = 1 - prog * 0.4;
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      }
      // Spider dive target marker
      if (e.type === 'spider' && e.diveT > 30) {
        const ry = ROW_Y[e.diveRow];
        const pulse = Math.floor(Date.now() / 80) % 2 === 0;
        ctx.save();
        ctx.globalAlpha = pulse ? 0.9 : 0.4;
        ctx.strokeStyle = '#ff3300';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(e.x - 10, ry, def.w + 20, def.h);
        ctx.setLineDash([]);
        ctx.fillStyle = '#ff3300';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', e.x + def.w/2, ry - 8);
        ctx.textAlign = 'left';
        ctx.restore();
      }
      // Lich soul vortex
      if (e.type === 'lich' && e.soulPullT > 0) {
        const vcx = e.x + def.w/2, vcy = e.y + def.h/2;
        const t = Date.now() / 200;
        ctx.save();
        ctx.globalAlpha = Math.min(1, e.soulPullT / 30) * 0.7;
        for (let i = 0; i < 3; i++) {
          const r = 35 + i * 22;
          const gr = ctx.createRadialGradient(vcx, vcy, 2, vcx, vcy, r);
          gr.addColorStop(0, 'rgba(180,0,255,0.8)');
          gr.addColorStop(1, 'rgba(80,0,160,0)');
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(vcx, vcy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        // Spiral arms
        ctx.strokeStyle = '#cc44ff';
        ctx.lineWidth = 2;
        for (let arm = 0; arm < 3; arm++) {
          ctx.beginPath();
          for (let step = 0; step < 30; step++) {
            const angle = (arm * Math.PI * 2 / 3) + step * 0.25 + t;
            const rad = step * 2.5;
            const px2 = vcx + Math.cos(angle) * rad;
            const py2 = vcy + Math.sin(angle) * rad;
            step === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      // Apoc quake windup
      if (e.type === 'apocalyptic' && e.quakeWindupT > 0) {
        const pulse = Math.floor(e.quakeWindupT / 5) % 2 === 0;
        ctx.save();
        ctx.globalAlpha = pulse ? 0.95 : 0.4;
        ctx.fillStyle = '#ff4400';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('QUAKE!', e.x + def.w/2, e.y - 16);
        ctx.textAlign = 'left';
        // Ground crack preview
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        const crackDir = e.facing > 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(e.x + def.w/2, ROW_Y[0] + WD_H);
        ctx.lineTo(e.x + def.w/2 + crackDir * 300, ROW_Y[ROWS-1]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    });
  }

  function drawWebZones() {
    webZones.forEach(wz => {
      const alpha = (wz.life / wz.maxLife) * 0.55;
      const ry = ROW_Y[wz.row];
      ctx.save();
      ctx.globalAlpha = alpha;
      // Silky web fill
      ctx.fillStyle = '#ccccaa';
      ctx.fillRect(0, ry + 20, W, 50);
      // Web strand lines
      ctx.strokeStyle = '#ddddbb';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, ry + 20);
        ctx.lineTo(x + 20, ry + 50);
        ctx.lineTo(x + 40, ry + 20);
        ctx.stroke();
      }
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, ry + 35);
        ctx.lineTo(x + 40, ry + 35);
        ctx.stroke();
      }
      ctx.restore();
    });
    // Web slow indicator on player
    if ((PL.webbed || 0) > 0) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ccddaa';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('WEB', PL.cx, ROW_Y[PL.row] - 14);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  function drawShockwaves() {
    shockwaves.forEach(sw => {
      const alpha = Math.min(1, sw.life / 20) * 0.9;
      ctx.save();
      ctx.globalAlpha = alpha;
      // Glowing vertical bar
      const grd = ctx.createLinearGradient(sw.x - 20, 0, sw.x + 20, 0);
      grd.addColorStop(0, 'rgba(255,80,0,0)');
      grd.addColorStop(0.5, 'rgba(255,180,50,0.95)');
      grd.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(sw.x - 20, ROW_Y[ROWS-1] - 10, 40, ROW_Y[0] - ROW_Y[ROWS-1] + WD_H + 20);
      ctx.restore();
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
        // Small glowing purple orb
        const cx = d.x + 11, cy = ROW_Y[d.row] + 8;
        const glow = ctx.createRadialGradient(cx,cy,1,cx,cy,11);
        glow.addColorStop(0,'rgba(200,100,255,0.9)');
        glow.addColorStop(0.4,'rgba(140,40,220,0.7)');
        glow.addColorStop(1,'rgba(80,0,160,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx,cy,11,0,Math.PI*2); ctx.fill();
        const core = ctx.createRadialGradient(cx,cy,0,cx,cy,5);
        core.addColorStop(0,'#ffffff'); core.addColorStop(0.4,'#dd88ff'); core.addColorStop(1,'#8800cc');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffffff';
        [[cx-7,cy-3],[cx+6,cy-5],[cx+2,cy+7]].forEach(([sx,sy])=>{
          ctx.beginPath(); ctx.arc(sx+Math.sin(t+sx)*1.5,sy,1.2,0,Math.PI*2); ctx.fill();
        });
      } else if(d.type==='bighealth'){
        // Large golden-green boss health orb
        const cx = d.x + 18, cy = ROW_Y[d.row] + 10;
        const g1 = ctx.createRadialGradient(cx,cy,2,cx,cy,18);
        g1.addColorStop(0,'rgba(180,255,160,1)');
        g1.addColorStop(0.4,'rgba(0,220,120,0.85)');
        g1.addColorStop(1,'rgba(0,80,40,0)');
        ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill();
        const g2 = ctx.createRadialGradient(cx-4,cy-4,0,cx,cy,9);
        g2.addColorStop(0,'#ffffff'); g2.addColorStop(0.5,'#88ffcc'); g2.addColorStop(1,'#00aa66');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx,cy,9,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ccffdd'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
        ctx.fillText('+HP',cx,cy+4); ctx.textAlign='left';
      } else if(d.type==='fullspell'){
        // Large bright magenta full-spell orb
        const cx = d.x + 18, cy = ROW_Y[d.row] + 10;
        const g1 = ctx.createRadialGradient(cx,cy,2,cx,cy,18);
        g1.addColorStop(0,'rgba(255,180,255,1)');
        g1.addColorStop(0.4,'rgba(220,0,220,0.85)');
        g1.addColorStop(1,'rgba(80,0,80,0)');
        ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill();
        const g2 = ctx.createRadialGradient(cx-4,cy-4,0,cx,cy,9);
        g2.addColorStop(0,'#ffffff'); g2.addColorStop(0.5,'#ff88ff'); g2.addColorStop(1,'#cc00cc');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx,cy,9,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffccff'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
        ctx.fillText('SP',cx,cy+4); ctx.textAlign='left';
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
    // (controls shown above the canvas in HTML)
    const blink=Math.floor(t*2)%2===0;
    ctx.fillStyle=blink?'#cc0000':'#550000'; ctx.font='bold 15px monospace';
    ctx.fillText('PRESS  W  TO  BEGIN',W/2,435);
    ctx.textAlign='left';
  }

  function drawGameOver(){
    ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#cc0000'; ctx.font='bold 50px monospace'; ctx.textAlign='center';
    ctx.fillText('GAME OVER',W/2,H/2-44);
    ctx.fillStyle='#888'; ctx.font='18px monospace';
    ctx.fillText(`SCORE: ${gs.score}`,W/2,H/2+12);
    ctx.fillStyle='#444'; ctx.font='13px monospace';
    ctx.fillText('PRESS W TO RETRY',W/2,H/2+52);
    ctx.textAlign='left';
  }

  // ─── reset ────────────────────────────────────────────────────────────────
  function reset(){
    Object.assign(gs,{screen:'playing',score:0,level:1,wave:1,
      hp:140,maxHp:140,spellUses:3,maxSpell:3,rewardChoice:0,
      itemTier:0,activeItem:null,rewardItemChoices:[],rewardItemChoice:0});
    PL.x=70; PL.row=0; PL.facing=1;
    PL.atkTimer=0; PL.shTimer=0; PL.iframes=0;
    PL.weapon.dmg=25; PL.atkRange=100;
    PL.spell.dmg=60;
    PL.itemAbility=null; PL.itemCd=0; PL.itemCdMax=0;
    PL.shBroken=false; PL.shHp=PL.shMaxHp; PL.soulDrainActive=false; PL.deathMarkActive=false;
    PL.mirrorActive=false; PL.thornActive=false; PL.explodeShieldActive=false;
    PL.bloodlustT=0;
    enemies=[]; projs=[]; parts=[]; drops=[]; obstacles=[]; bgOff=0;
    webZones=[]; shockwaves=[]; darknessT=0;
    PL.webbed=0;
    startWave();
  }

  // ─── loop ─────────────────────────────────────────────────────────────────
  function frame(){
    ctx.clearRect(0,0,W,H);
    if(gs.screen==='title'){
      drawTitle();
      if(eat('KeyW')||eat('Space')) reset();
    } else if(gs.screen==='gameover'){
      drawBG(); drawWebZones(); drawObstacles(); drawDrops(); drawEnemies(); drawShockwaves(); drawProjs();
      drawPlayer(); drawParts(); drawHUD(); drawGameOver();
      if(darknessT>0){ darknessT--; const dA=Math.min(darknessT+1,30)/30*0.82; ctx.fillStyle=`rgba(0,0,5,${dA})`; ctx.fillRect(0,0,W,H); }
      if(eat('KeyW')||eat('Space')) reset();
    } else if(gs.screen==='reward'){
      update();
      drawBG(); drawWebZones(); drawObstacles(); drawDrops(); drawEnemies(); drawShockwaves(); drawProjs();
      drawPlayer(); drawParts(); drawHUD(); drawReward();
      if(darknessT>0){ darknessT--; const dA=Math.min(darknessT+1,30)/30*0.82; ctx.fillStyle=`rgba(0,0,5,${dA})`; ctx.fillRect(0,0,W,H); }
    } else if(gs.screen==='itemreward'){
      update();
      drawBG(); drawWebZones(); drawShockwaves(); drawItemReward();
      if(darknessT>0){ darknessT--; const dA=Math.min(darknessT+1,30)/30*0.82; ctx.fillStyle=`rgba(0,0,5,${dA})`; ctx.fillRect(0,0,W,H); }
    } else if(gs.screen==='victory'){
      drawBG(); drawVictory();
    } else {
      update();
      drawBG(); drawWebZones(); drawObstacles(); drawDrops(); drawEnemies(); drawShockwaves(); drawProjs();
      drawPlayer(); drawParts(); drawWaveMsg(); drawHUD();
      if(darknessT>0){ darknessT--; const dA=Math.min(darknessT+1,30)/30*0.82; ctx.fillStyle=`rgba(0,0,5,${dA})`; ctx.fillRect(0,0,W,H); }
    }
    requestAnimationFrame(frame);
  }

  if(overlay) overlay.classList.add('hidden');

  // Load sprite sheets first, then kick off the game loop
  loadSprites(function() {
    frame();
  });

  // Show a brief loading screen while sprites load
  (function waitLoop() {
    if (spritesReady) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0015';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#aa44ff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Loading sprites…', W/2, H/2);
    requestAnimationFrame(waitLoop);
  })();

})();
