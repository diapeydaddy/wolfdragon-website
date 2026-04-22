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
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

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
  // Sized to showcase the high-res sprite art while fitting within row height
  const WD_W    = 88,  WD_H    = 88;
  const GRUNT_W = 80,  GRUNT_H = 88;
  const ARCH_W  = 72,  ARCH_H  = 80;
  const BRUTE_W = 100, BRUTE_H = 100;
  const SPIDER_W= 140, SPIDER_H= 100;
  const LICH_W  = 96,  LICH_H  = 120;
  const APOC_W  = 180, APOC_H  = 150;
  const FB_W    = SPR_FB[0].length    * SC2;
  const FB_H    = SPR_FB.length       * SC2;
  const SP_W    = SPR_SPELL[0].length * SC2;
  const SP_H    = SPR_SPELL.length    * SC2;

  // ═══════════════════════════════════════════════════════════════════════════
  //  SPRITE SHEET SYSTEM
  //  Sheet R (ref):   1na7pu — 4-up reference art, GREY bg (~150,150,150)
  //                   WolfDragon front+side, Demon front+side — clean, no labels
  //  Sheet B (boss):  oajbktoajb — Brute + 3 bosses, DARK bg (~38,35,54)
  //  Background pixels are flood-filled from corners to preserve character
  //  dark-interior pixels (shadow, black outlines etc.).
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Source rectangles ────────────────────────────────────────────────────
  // Sheet R = 1na7pu1na7pu1na7.png  (reference 4-up, grey bg)
  // Sheet B = oajbktoajbktoajb.png  (boss sheet, dark bg)
  const SRECTS = {
    WD_FRONT:  { sh:'R', sx:19,  sy:512, sw:493, sh_:494 }, // wolfdragon front  (bottom-left)
    WD_SIDE:   { sh:'R', sx:512, sy:512, sw:493, sh_:494 }, // wolfdragon side   (bottom-right)
    DEM_FRONT: { sh:'R', sx:19,  sy:18,  sw:493, sh_:494 }, // demon front       (top-left)
    DEM_SIDE:  { sh:'R', sx:512, sy:18,  sw:493, sh_:494 }, // demon side        (top-right)
    BRUTE:     { sh:'B', sx:16,  sy:51,  sw:489, sh_:423 }, // brute demon
    SPIDER:    { sh:'B', sx:16,  sy:560, sw:313, sh_:326 }, // spider boss
    LICH:      { sh:'B', sx:342, sy:561, sw:340, sh_:341 }, // lich boss
    APOC:      { sh:'B', sx:682, sy:561, sw:332, sh_:341 }, // apocalyptic boss
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
      if(Math.max(Math.abs(d[pi]-br),Math.abs(d[pi+1]-bg2),Math.abs(d[pi+2]-bb2))<=tolerance){
        d[pi+3]=0;
        const x=idx%W2, y=(idx/W2)|0;
        enq(x-1,y); enq(x+1,y); enq(x,y-1); enq(x,y+1);
      }
    }
    ox.putImageData(id, 0, 0);
    return oc;
  }

  // ── Sheet canvases (populated by loadSprites) ─────────────────────────────
  const SHEETS = { R: null, B: null };
  let spritesReady = false;

  function loadSprites(cb) {
    let n = 0;
    const total = 2;
    function done() { if (++n === total) { spritesReady = true; if (cb) cb(); } }
    const imgR = new Image();
    imgR.onload = () => { SHEETS.R = removeBgGlobal(imgR, 35); done(); };
    imgR.onerror = done;
    imgR.src = '/images/Gemini_Generated_Image_1na7pu1na7pu1na7.png';
    const imgB = new Image();
    imgB.onload = () => { SHEETS.B = removeBgFlood(imgB, 48); done(); };
    imgB.onerror = done;
    imgB.src = '/images/Gemini_Generated_Image_oajbktoajbktoajb.png';
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
  // WolfDragon: use profile (side view) — natural for a side-scroller.
  // Front view used during attack for dramatic look.
  function drawWDSprite(ox, oy, flipX, atk) {
    const r = atk ? SRECTS.WD_FRONT : SRECTS.WD_SIDE;
    drawSpr(r, ox, oy, WD_W, WD_H, atk ? !flipX : flipX);
  }

  function drawGruntSprite(ox, oy, flipX) {
    drawSpr(SRECTS.DEM_FRONT, ox, oy, GRUNT_W, GRUNT_H, flipX);
  }

  // Archer uses the side-profile demon (distinct look from grunt)
  function drawArcherSprite(ox, oy, flipX) {
    drawSpr(SRECTS.DEM_SIDE, ox, oy, ARCH_W, ARCH_H, flipX);
  }

  function drawBruteSprite(ox, oy, flipX) {
    drawSpr(SRECTS.BRUTE, ox, oy, BRUTE_W, BRUTE_H, flipX);
  }

  function drawSpiderSprite(ox, oy, flipX) {
    drawSpr(SRECTS.SPIDER, ox, oy, SPIDER_W, SPIDER_H, flipX);
  }

  function drawLichSprite(ox, oy, flipX) {
    drawSpr(SRECTS.LICH, ox, oy, LICH_W, LICH_H, flipX);
  }

  function drawApocSprite(ox, oy, flipX) {
    drawSpr(SRECTS.APOC, ox, oy, APOC_W, APOC_H, flipX);
  }

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
    // ── BOSSES ──
    spider: {
      drawFn: drawSpiderSprite, w: SPIDER_W, h: SPIDER_H,
      hp: 500, speed: 0.6, shootCd: 70, dmg: 18, score: 1200,
      dropRate: 1.0, spellDrop: 1.0, isBoss: true,
    },
    lich: {
      drawFn: drawLichSprite, w: LICH_W, h: LICH_H,
      hp: 400, speed: 0.4, shootCd: 55, dmg: 22, score: 1800,
      dropRate: 1.0, spellDrop: 1.0, isBoss: true,
    },
    apocalyptic: {
      drawFn: drawApocSprite, w: APOC_W, h: APOC_H,
      hp: 700, speed: 0.25, shootCd: 45, dmg: 30, score: 3000,
      dropRate: 1.0, spellDrop: 1.0, isBoss: true,
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
      const row = 1;
      const totalH = ROW_Y[0] - ROW_Y[2] + GRUNT_H;  // full arena height
      const arenaTop = ROW_Y[2];
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

      // ── BOSS AI ──────────────────────────────────────────────────────────
      if (def.isBoss) {
        // Update boss phase based on HP fraction
        const hpFrac = e.hp / e.maxHp;
        e.bossPhase = hpFrac > 0.6 ? 1 : hpFrac > 0.3 ? 2 : 3;
        const spd = def.speed * (1 + (e.bossPhase - 1) * 0.4);

        if (e.type === 'spider') {
          // Patrol left-right in right half of screen, occasionally lunge
          e.moveTimer++;
          if (e.moveTimer > 90 / e.bossPhase) {
            e.moveDir *= -1;
            e.moveTimer = 0;
          }
          e.x += e.moveDir * spd * 1.2;
          e.x = Math.max(W*0.35, Math.min(W - def.w - 8, e.x));

          // Spider fires spread shot across all rows
          e.shootT--;
          if(e.shootT <= 0){
            e.shootT = Math.max(25, def.shootCd - e.bossPhase * 15);
            const numShots = 3 + e.bossPhase * 2;
            for(let i=0;i<numShots;i++){
              const vy = (i - (numShots-1)/2) * 0.7;
              projs.push({x:e.x, y:e.y+def.h/2-FB_H/2,
                vx:-4, vy, row:1, dmg:def.dmg,
                owner:'enemy', spr:SPR_FB, w:FB_W, h:FB_H, life:300});
            }
            burst(e.x, e.y+def.h/2, '#ff4400', 8);
          }

        } else if (e.type === 'lich') {
          // Float in place, teleport between rows, fire homing orbs
          e.y += Math.sin(Date.now()/400) * 0.6; // gentle bob

          e.teleTimer++;
          if(e.teleTimer > 180 / e.bossPhase){
            e.teleTimer = 0;
            const newRow = Math.floor(Math.random()*ROWS);
            e.row = newRow;
            e.targetY = ROW_Y[newRow] + (GRUNT_H - def.h)/2;
            burst(eCX, e.y+def.h/2, '#aa44ff', 16, 5);
          }
          // Drift toward target row Y
          const targY = e.targetY !== undefined ? e.targetY : ROW_Y[1];
          e.y += (targY - e.y) * 0.04;
          // Slow drift leftward
          e.x = Math.max(W*0.45, Math.min(W - def.w - 8, e.x - spd * 0.3));

          e.shootT--;
          if(e.shootT <= 0){
            e.shootT = Math.max(30, def.shootCd - e.bossPhase * 10);
            const shots = e.bossPhase + 1;
            for(let i=0;i<shots;i++){
              const targetVY = (ROW_Y[PL.row] - (e.y+def.h/2)) * 0.015;
              projs.push({x:e.x, y:e.y+def.h/2-FB_H/2,
                vx:-3.5 - i*0.5, vy: targetVY + (i-Math.floor(shots/2))*0.4,
                row:e.row, dmg:def.dmg,
                owner:'enemy', spr:SPR_SPELL, w:SP_W, h:SP_H, life:320});
            }
            burst(e.x, e.y+def.h/2, '#8800cc', 10);
          }

        } else if (e.type === 'apocalyptic') {
          // Slow menacing advance, fires sweeping beam + calls minions at phase 3
          e.x = Math.max(W*0.38, Math.min(W - def.w - 5, e.x - spd));

          e.enrageT++;
          const chargeTime = Math.max(50, 110 - e.bossPhase * 25);
          if(e.enrageT >= chargeTime){
            e.enrageT = 0;
            // Beam: fire projectiles across ALL rows
            for(let r=0;r<ROWS;r++){
              projs.push({x:e.x, y:ROW_Y[r]+GRUNT_H/2-FB_H/2,
                vx:-5, vy:0, row:r, dmg:def.dmg,
                owner:'enemy', spr:SPR_FB, w:FB_W, h:FB_H, life:300});
            }
            burst(e.x+def.w/2, e.y+def.h/2, '#cc0000', 20, 8);
            // Phase 3: also spawn a grunt minion
            if(e.bossPhase === 3 && Math.random()<0.5){
              spawnQueue.push('grunt');
            }
          }
        }

        // Boss melee — if it reaches the player
        for(let r=0;r<ROWS;r++){
          const plHb = {x:PL.x+12, y:ROW_Y[r]+10, w:PL.w-24, h:PL.h-16};
          if(r===PL.row && ov({x:e.x,y:e.y,w:def.w,h:def.h}, plHb)){
            hurtPlayer(def.dmg * 0.5);
          }
        }
        return;
      }
      // ── NORMAL ENEMY AI ───────────────────────────────────────────────────

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
      // Guarantee 1–2 spell refill orbs
      const spellCount = 1 + Math.floor(Math.random()*2);
      for(let i=0;i<spellCount;i++){
        const row = Math.floor(Math.random()*ROWS);
        drops.push({x: 150 + Math.random()*(W-300), y: ROW_Y[row],
          row, type:'spell', life:500});
      }
      if(isBossWave()){
        // Boss cleared — advance level, big fanfare
        msg = '★ BOSS DEFEATED ★'; msgT = 260;
        burst(W/2, H/2, '#ffcc00', 40, 10);
        gs.level++;
        // Also restore all spells as a reward
        gs.spellUses = gs.maxSpell;
        setTimeout(()=>{ gs.wave++; startWave(); },3200);
      } else {
        setTimeout(()=>{ gs.wave++; startWave(); },2200);
      }
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
