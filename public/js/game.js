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
  let musicStarted=false, musicMuted=false;
  function tryStartMusic(){
    if(musicStarted) return;
    bgMusic.play().then(()=>{ musicStarted=true; }).catch(()=>{ /* will retry on next interaction */ });
  }
  function toggleMusic(){
    musicMuted=!musicMuted;
    if(musicMuted){ bgMusic.pause(); } else { bgMusic.play().catch(()=>{}); }
  }
  window.addEventListener('keydown', e=>{ if(e.code==='KeyM') toggleMusic(); });
  window.addEventListener('keydown',tryStartMusic);
  canvas.addEventListener('click',tryStartMusic);
  document.addEventListener('touchstart', tryStartMusic, {passive:true});

  // ─── SFX Engine (Web Audio synthesis — no files needed) ───────────────────
  const SFX = (function(){
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const resume = ()=>{ if(ac.state==='suspended') ac.resume(); };
    window.addEventListener('keydown', resume, {passive:true});
    canvas.addEventListener('click', resume, {passive:true});
    const mast = ac.createGain(); mast.gain.value = 0.48; mast.connect(ac.destination);

    function osc(freq, type, dur, vol, freqEnd){
      try {
        const g=ac.createGain(); g.gain.setValueAtTime(Math.min(vol,1),ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+dur);
        const o=ac.createOscillator(); o.type=type; o.frequency.setValueAtTime(freq,ac.currentTime);
        if(freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd,10),ac.currentTime+dur);
        o.connect(g); g.connect(mast); o.start(ac.currentTime); o.stop(ac.currentTime+dur);
      } catch(e){}
    }
    function noise(dur, vol, bpFreq, bpFreqEnd, bpQ){
      try {
        const len=Math.ceil(ac.sampleRate*Math.min(dur,2));
        const buf=ac.createBuffer(1,len,ac.sampleRate); const d=buf.getChannelData(0);
        for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
        const src=ac.createBufferSource(); src.buffer=buf;
        const f=ac.createBiquadFilter(); f.type='bandpass';
        f.frequency.setValueAtTime(bpFreq,ac.currentTime);
        if(bpFreqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(bpFreqEnd,20),ac.currentTime+dur);
        f.Q.value=bpQ||1;
        const g=ac.createGain(); g.gain.setValueAtTime(Math.min(vol,1),ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+dur);
        src.connect(f); f.connect(g); g.connect(mast); src.start(ac.currentTime); src.stop(ac.currentTime+dur);
      } catch(e){}
    }
    const at = (ms,fn)=>setTimeout(fn,ms);
    return {
      // Player
      attack(){ noise(0.14,0.65,4500,800,0.35); osc(900,'sawtooth',0.10,0.5,120); at(30,()=>noise(0.08,0.4,3000,600,0.5)); },
      block(){ osc(420,'square',0.10,0.6,900); osc(210,'square',0.14,0.5,420); noise(0.08,0.45,2200,4000,3); },
      hurt(){ osc(160,'sawtooth',0.28,0.7,55); noise(0.14,0.4,450,150,1); },
      spell(){ osc(240,'sawtooth',0.28,0.45,900); noise(0.22,0.3,1600,3000,1.2); },
      pickup(){ osc(523,'sine',0.12,0.35,784); at(90,()=>osc(784,'sine',0.12,0.3,1047)); },
      // Active abilities
      lunge(){ noise(0.07,0.4,2500,500,0.4); at(75,()=>{ osc(90,'sawtooth',0.22,0.8,25); noise(0.14,0.5,500,200,1); }); },
      souldrain(){ osc(110,'sawtooth',0.55,0.6,55); osc(220,'sine',0.45,0.35,110); noise(0.4,0.3,800,200,2); },
      cleave(){ noise(0.28,0.6,1400,300,0.5); osc(280,'sawtooth',0.22,0.4,55); },
      lightning(){ for(let i=0;i<6;i++) at(i*50,()=>{ noise(0.06,0.55,3500+Math.random()*2500,6000,0.25); osc(500+Math.random()*500,'square',0.05,0.4); }); },
      bloodlust(){ osc(55,'sine',0.18,0.9,35); at(200,()=>osc(55,'sine',0.12,0.6,35)); noise(0.12,0.3,300,100,1); },
      voidball(){ osc(70,'sawtooth',0.50,0.65,25); osc(380,'sine',0.32,0.3,750); noise(0.22,0.3,650,200,1.8); },
      dragonfury(){ osc(55,'sawtooth',0.70,1.0,18); osc(165,'square',0.45,0.55,35); noise(0.40,0.65,700,200,0.5); },
      icenova(){ for(let i=0;i<7;i++) at(i*38,()=>osc(1100+i*180,'sine',0.20,0.28,1600+i*90)); noise(0.32,0.25,5000,2000,3); },
      firewall(){ noise(0.45,0.55,550,1800,0.6); osc(180,'sawtooth',0.38,0.45,600); },
      deathmark(){ osc(95,'sawtooth',0.55,0.55,145); osc(48,'sine',0.65,0.45,75); },
      whirlwind(){ for(let i=0;i<4;i++) at(i*80,()=>noise(0.22,0.4,600+i*250,900+i*150,0.5)); osc(260,'sine',0.55,0.35,80); },
      mirrorshield(){ osc(880,'sine',0.25,0.45,1320); at(60,()=>osc(1100,'sine',0.20,0.35,1760)); },
      thornwall(){ noise(0.14,0.4,1900,600,2); osc(380,'sawtooth',0.14,0.3,760); },
      holybarrier(){ osc(523,'sine',0.65,0.55,1047); osc(659,'sine',0.55,0.4,1047); at(80,()=>osc(784,'sine',0.45,0.3,1047)); },
      explodeshield(){ osc(75,'sawtooth',0.45,0.9,18); noise(0.45,0.75,380,100,0.4); at(110,()=>noise(0.22,0.5,200,80,0.3)); },
      // Enemies
      enemyHit(){ noise(0.07,0.28,900,400,1.2); },
      enemyDie(){ noise(0.20,0.45,280,80,0.8); osc(200,'sawtooth',0.16,0.3,35); },
      gruntShoot(){ osc(280,'sawtooth',0.08,0.35,80); noise(0.06,0.25,1200,400,1); },
      archerShoot(){ osc(340,'sawtooth',0.09,0.38,90); noise(0.05,0.22,2400,900,2); },
      bruteSwing(){ osc(75,'sawtooth',0.16,0.75,22); noise(0.20,0.55,380,150,0.7); },
      gruntMelee(){ osc(1050,'square',0.07,0.5,880); at(85,()=>osc(1050,'square',0.07,0.45,880)); },
      // Spider boss
      spiderAttack(){ noise(0.28,0.5,2800,500,0.4); osc(750,'sawtooth',0.22,0.45,1100); },
      spiderDive(){ osc(380,'sawtooth',0.35,0.55,850); noise(0.18,0.35,1200,400,1); },
      spiderLunge(){ noise(0.10,0.45,2000,400,0.5); at(90,()=>{ osc(100,'sawtooth',0.25,0.8,28); noise(0.15,0.5,500,180,1); }); },
      // Lich boss
      lichAttack(){ osc(115,'sawtooth',0.55,0.65,55); osc(230,'sawtooth',0.42,0.4,80); noise(0.25,0.3,900,300,2); },
      lichTeleport(){ osc(800,'sine',0.28,0.45,95); at(80,()=>osc(180,'sine',0.28,0.5,600)); },
      lichSoulpull(){ osc(80,'sawtooth',0.6,0.55,40); noise(0.5,0.4,600,200,1.5); },
      lichDarkness(){ osc(60,'sine',0.8,0.5,30); noise(0.6,0.35,400,100,2); },
      // Apocalyptic boss
      apocAttack(){ osc(38,'sawtooth',0.85,1.0,18); osc(75,'square',0.65,0.7,28); noise(0.55,0.65,280,80,0.3); },
      apocQuake(){ osc(45,'sawtooth',0.55,0.9,20); noise(0.45,0.7,180,60,0.3); at(200,()=>{ osc(35,'sawtooth',0.35,0.8,15); noise(0.3,0.6,150,50,0.3); }); },
      apocLunge(){ noise(0.12,0.5,2200,400,0.4); at(100,()=>{ osc(55,'sawtooth',0.3,0.9,18); noise(0.25,0.7,350,100,0.7); }); },
    };
  })();

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
  const FRIEND_H = 88;                    // draw height (matches Wolfdragon)
  // Per-frame draw widths (aspect-correct at FRIEND_H=88)
  const FR_RUN_DW  = [28, 35, 49, 39];  // running frames 1-4
  const FR_THR_DW  = [54, 51, 59, 53];  // throwing frames 1-4
  const FRIEND_W   = 60;                 // logical width for positioning
  // Tiki cocktail – per-frame widths at TIKI_H=41 (−15% from original 48)
  const TIKI_H = 41;
  const TK_DW  = [26, 30, 27, 20, 26, 31]; // spin frames 1-6 (−15%)
  const TIKI_W = 27;                    // logical width for hitbox (−15%)
  const TIKI_BREAK_H = 48, TIKI_BREAK_W = 74; // splat −25%
  const CAR_W    = 280, CAR_H    = 104;  // scaled for canvas
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
    // Crop starts at y=160 (sprite begins at y=177 in original; 177-160=17)
    SPIDER_FRONT: { sh:'SP', sx:28,  sy:38,  sw:481, sh_:483 },
    SPIDER_SIDE:  { sh:'SP', sx:573, sy:73,  sw:413, sh_:578 },
    // Lich boss — front + profile (new image 2)
    // Crop starts at y=120 (sprite begins at y=136 in original; 136-120=16)
    LICH_FRONT:   { sh:'LI', sx:56,  sy:71,  sw:430, sh_:493 },
    LICH_SIDE:    { sh:'LI', sx:655, sy:69,  sw:260, sh_:475 },
    // Apoc boss — front + profile (new image 1)
    // Crop starts at y=80 (sprite begins ~here); sy=0 maps to crop origin
    APOC_FRONT:   { sh:'AP', sx:13,  sy:43,  sw:499, sh_:490 },
    APOC_SIDE:    { sh:'AP', sx:512, sy:26,  sw:491, sh_:510 },
    // Friend ally — running frames (sheet 'FR')
    // Friend ally — running frames (individual sheets FR1-FR4, facing RIGHT → flip to face LEFT)
    FR_RUN_0: { sh:'FR1', sx:0, sy:0, sw:115, sh_:356 },
    FR_RUN_1: { sh:'FR2', sx:0, sy:0, sw:142, sh_:355 },
    FR_RUN_2: { sh:'FR3', sx:0, sy:0, sw:198, sh_:354 },
    FR_RUN_3: { sh:'FR4', sx:0, sy:0, sw:155, sh_:354 },
    // Friend ally — throwing frames (individual sheets FT1-FT4)
    FR_THR_0: { sh:'FT1', sx:0, sy:0, sw:204, sh_:330 },
    FR_THR_1: { sh:'FT2', sx:0, sy:0, sw:191, sh_:330 },
    FR_THR_2: { sh:'FT3', sx:0, sy:0, sw:222, sh_:330 },  // arm extended = launch frame
    FR_THR_3: { sh:'FT4', sx:0, sy:0, sw:197, sh_:330 },
    // Tiki cocktail — individual spin frames (TK1-TK6) + break frame (TKB)
    TK_0: { sh:'TK1', sx:0, sy:0, sw:166, sh_:254 },
    TK_1: { sh:'TK2', sx:0, sy:0, sw:178, sh_:248 },
    TK_2: { sh:'TK3', sx:0, sy:0, sw:166, sh_:247 },
    TK_3: { sh:'TK4', sx:0, sy:0, sw:109, sh_:233 },
    TK_4: { sh:'TK5', sx:0, sy:0, sw:144, sh_:228 },
    TK_5: { sh:'TK6', sx:0, sy:0, sw:178, sh_:234 },
    TK_BREAK: { sh:'TKB', sx:0, sy:0, sw:379, sh_:245 }, // splash on impact
    // Car (sheet 'CR')
    CAR: { sh:'CR', sx:0, sy:0, sw:513, sh_:191 },
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
    const [NW, NH] = _srcDims(img);
    const oc = document.createElement('canvas');
    oc.width = NW; oc.height = NH;
    const ox = oc.getContext('2d');
    ox.drawImage(img, 0, 0);
    const W2 = NW, H2 = NH;
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
      // Light checker squares: desaturated grey, extended upper bound to catch near-white greys
      const greyTile  = lum > 60 && lum < 200
                        && Math.abs(r-g) < 22 && Math.abs(r-b) < 28 && Math.abs(g-b) < 22;
      // Near-black: raised to 30 to catch dark anti-aliased label/header fuzz
      // that was slipping past the original lum<10 threshold.
      const nearBlack = lum < 30;
      if(nearDark || greyTile || nearBlack || d[pi+3]===0){
        d[pi+3]=0;
        const x=idx%W2, y=(idx/W2)|0;
        enq(x-1,y); enq(x+1,y); enq(x,y-1); enq(x,y+1);
      }
    }

    // Pass 2 — pure-white sweep.
    // Removes pixels that are literal uncoloured background white (R,G,B all ≥ 245).
    // This catches enclosed white pockets the flood can't reach (e.g. spider's chest
    // cavity) without touching cream skulls, off-white bones, or tinted teeth —
    // all of which have at least one channel below 245.
    for(let i = 0; i < d.length; i += 4){
      if(d[i+3] === 0) continue;
      if(d[i] >= 245 && d[i+1] >= 245 && d[i+2] >= 245) d[i+3] = 0;
    }

    ox.putImageData(id, 0, 0);
    return oc;
  }

  // removeSmallClusters: connected-component analysis — removes any opaque island
  // smaller than minSize pixels.  Handles multi-pixel dark scatter dots that
  // survive per-pixel despeckle (they have internal neighbours but are isolated
  // from the main character body).  O(N) BFS, runs once on load.
  function removeSmallClusters(oc, minSize) {
    const ox = oc.getContext('2d');
    const W2 = oc.width, H2 = oc.height;
    const id = ox.getImageData(0, 0, W2, H2);
    const d  = id.data;
    const label = new Int32Array(W2 * H2); // 0=unvisited opaque, -1=transparent
    for(let i = 0; i < W2*H2; i++) label[i] = d[i*4+3] > 0 ? 0 : -1;

    const bfsQ = new Int32Array(W2 * H2);
    const comps = []; // each entry = array of pixel indices in that component

    for(let seed = 0; seed < W2*H2; seed++){
      if(label[seed] !== 0) continue;
      const comp = [];
      const cid  = comps.length + 1;
      let head = 0, tail = 0;
      bfsQ[tail++] = seed;
      label[seed] = cid;
      while(head < tail){
        const idx = bfsQ[head++];
        comp.push(idx);
        const x = idx % W2, y = (idx / W2) | 0;
        const nb = [x>0?idx-1:-1, x<W2-1?idx+1:-1, y>0?idx-W2:-1, y<H2-1?idx+W2:-1];
        for(let k = 0; k < 4; k++){
          const ni = nb[k];
          if(ni < 0 || label[ni] !== 0) continue;
          label[ni] = cid;
          bfsQ[tail++] = ni;
        }
      }
      comps.push(comp);
    }

    for(const comp of comps){
      if(comp.length < minSize)
        for(const idx of comp) d[idx*4+3] = 0;
    }

    ox.putImageData(id, 0, 0);
    return oc;
  }

  // ── Sheet canvases (populated by loadSprites) ─────────────────────────────
  const SHEETS = { WD: null, SM: null, GR: null, BR: null, SP: null, LI: null, AP: null };
  let spritesReady = false;

  // Crop a source image to a canvas containing only the specified rectangle.
  // Used to discard small-sprite animation rows and title text before bg removal.
  function cropToCanvas(img, sx, sy, sw, sh) {
    const oc = document.createElement('canvas');
    oc.width = sw; oc.height = sh;
    oc.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return oc;
  }

  // Allow removeBgCheckerboard to accept a pre-cropped canvas (has .width/.height)
  // as well as a raw Image (has .naturalWidth/.naturalHeight).
  function _srcDims(src){ return [src.naturalWidth||src.width, src.naturalHeight||src.height]; }

  function loadSprites(cb) {
    let n = 0;
    const total = 23;
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

    // Boss sheets: pre-cropped clean RGBA PNGs (transparent background).
    // No background removal needed — just draw to canvas and reference via SRECTS.

    // Sheet SP — Spider/Insectoid boss
    const imgSP = new Image();
    imgSP.onload = () => {
      SHEETS.SP = cropToCanvas(imgSP, 0, 0, imgSP.naturalWidth, imgSP.naturalHeight);
      done();
    };
    imgSP.onerror = done;
    imgSP.src = '/images/boss-spider.png';

    // Sheet LI — Lich/Ghost boss
    const imgLI = new Image();
    imgLI.onload = () => {
      SHEETS.LI = cropToCanvas(imgLI, 0, 0, imgLI.naturalWidth, imgLI.naturalHeight);
      done();
    };
    imgLI.onerror = done;
    imgLI.src = '/images/boss-lich.png';

    // Sheet AP — Apoc boss
    const imgAP = new Image();
    imgAP.onload = () => {
      SHEETS.AP = cropToCanvas(imgAP, 0, 0, imgAP.naturalWidth, imgAP.naturalHeight);
      done();
    };
    imgAP.onerror = done;
    imgAP.src = '/images/boss-apoc.png';

    // Friend ally — individual running frames (facing right in source; flipped in-game)
    [['FR1','friend-run-1'],['FR2','friend-run-2'],['FR3','friend-run-3'],['FR4','friend-run-4'],
     ['FT1','friend-throw-1'],['FT2','friend-throw-2'],['FT3','friend-throw-3'],['FT4','friend-throw-4'],
     ['TK1','tiki-1'],['TK2','tiki-2'],['TK3','tiki-3'],
     ['TK4','tiki-4'],['TK5','tiki-5'],['TK6','tiki-6'],
     ['TKB','tiki-break'],
    ].forEach(([key, file]) => {
      const img = new Image();
      img.onload = () => { SHEETS[key] = cropToCanvas(img, 0, 0, img.naturalWidth, img.naturalHeight); done(); };
      img.onerror = done;
      img.src = `/images/${file}.png`;
    });

    // Sheet CR — Victory car
    const imgCR = new Image();
    imgCR.onload = () => { SHEETS.CR = cropToCanvas(imgCR, 0, 0, imgCR.naturalWidth, imgCR.naturalHeight); done(); };
    imgCR.onerror = done;
    imgCR.src = '/images/driving-off.png';
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

  // ─── friend ally sprite draw ──────────────────────────────────────────────
  const FR_RUN_SRECTS = [SRECTS.FR_RUN_0, SRECTS.FR_RUN_1, SRECTS.FR_RUN_2, SRECTS.FR_RUN_3];
  const FR_THR_SRECTS = [SRECTS.FR_THR_0, SRECTS.FR_THR_1, SRECTS.FR_THR_2, SRECTS.FR_THR_3];
  const TK_SPIN_SRECTS = [SRECTS.TK_0,SRECTS.TK_1,SRECTS.TK_2,SRECTS.TK_3,SRECTS.TK_4,SRECTS.TK_5];

  // Sprites face RIGHT in source.
  // flipX=true → faces left (toward boss on left). flipX=false → faces right.
  // ox is the anchor: when flipX=true, sprite draws to the left of ox; when false, to the right.
  function drawFriendSprite(state, runFrame, throwFrame, flipX, ox, oy) {
    if (state === 'throwing') {
      const fi = Math.min(throwFrame, 3);
      const dw = FR_THR_DW[fi];
      drawSpr(FR_THR_SRECTS[fi], flipX ? ox - dw : ox, oy, dw, FRIEND_H, flipX);
    } else {
      const fi = runFrame % 4;
      const dw = FR_RUN_DW[fi];
      drawSpr(FR_RUN_SRECTS[fi], flipX ? ox - dw : ox, oy, dw, FRIEND_H, flipX);
    }
  }

  function drawTikiProj(p) {
    if (p.tkBreaking) {
      if (!SHEETS.TKB) return;
      drawSpr(SRECTS.TK_BREAK, p.x, p.y, TIKI_BREAK_W, TIKI_BREAK_H, false);
    } else {
      const fi = p.tkFrame % 6;
      if (!SHEETS['TK'+(fi+1)]) return;
      drawSpr(TK_SPIN_SRECTS[fi], p.x, p.y, TK_DW[fi], TIKI_H, false);
    }
  }

  // ─── admin config ─────────────────────────────────────────────────────────
  const WD_DEFAULTS = {
    playerHp:140, playerSpeed:4, weaponDmg:25, spellDmg:60, atkRange:100, shMaxHp:3,
    spiderHp:625, spiderDmg:18, spiderSpeed:0.6, spiderCd:110,
    lichHp:750,   lichDmg:22,   lichSpeed:0.4,  lichCd:90,
    apocHp:1575,  apocDmg:38,   apocSpeed:0.25, apocCd:45,
    bossHpScaling:60,
    gruntHp:40,  gruntDmg:10, gruntSpeed:0.9,
    archerHp:25, archerDmg:8, archerSpeed:0.55,
    bruteHp:240, bruteDmg:22, bruteSpeed:0.4,
    cdLunge:360, cdSouldrain:300, cdCleave:420, cdLightning:480, cdBloodlust:600,
    cdVoidslash:480, cdDragonfury:600, cdIcenova:480, cdFirewall:420, cdDeathmark:540,
    cdWhirlwind:540, cdMirrorshield:360, cdThornwall:480, cdHolybarrier:600, cdExplodeshield:540,
    multLunge:2.0, multCleave:1.2, multLightning:0.35, multVoidslash:2.0,
    multDragonfury:1.8, multFirewall:1.2,
    lungeIframes:120,
    healSouldrain:15, bloodlustDuration:300, bloodlustAtkMult:0.38, dmgDeathmark:80,
    dmgThornwall:35, dmgExplodeshield:60, freezeIcenova:180,
    holyBarrierDur:180,
    whirlwindHpPct:0.05, whirlwindFreeze:60,
    flameshieldOrbs:4, flameshieldDmgPct:0.30,
    sprayDmgPct:0.45, novaDmgPct:0.28,
    mirrorDmgMult:2.0,
    shieldPipT1:1, shieldPipT2:2,
    friendCocktailDmgPct: 2,   // % of apoc total HP per tiki hit
    friendMinionDmgPct: 40,    // % of minion HP per tiki hit (post-Apoc)
    friendThrowRate: 180,       // frames between throws (~3 s)
  };
  const _wdSaved = JSON.parse(localStorage.getItem('wolfdragon_config') || '{}');
  const CFG = Object.assign({}, WD_DEFAULTS, _wdSaved);
  // Reload CFG in-place (used by cheat codes to switch config presets).
  // Baby config stores only its *delta* on top of main config, so main
  // changes always flow through automatically for non-overridden keys.
  function reloadCFG(key) {
    const mainSaved  = JSON.parse(localStorage.getItem('wolfdragon_config') || '{}');
    const extraSaved = key !== 'wolfdragon_config'
      ? JSON.parse(localStorage.getItem(key) || '{}')
      : {};
    Object.assign(CFG, WD_DEFAULTS, mainSaved, extraSaved);
  }

  const ENEMY_TYPES = {
    grunt: {
      drawFn: drawGruntSprite, w: GRUNT_W, h: GRUNT_H,
      hp: CFG.gruntHp, speed: CFG.gruntSpeed, shootCd: 240, dmg: CFG.gruntDmg, score: 100,
      dropRate: 0.15, spellDrop: 0.04,
    },
    archer: {
      drawFn: drawArcherSprite, w: ARCH_W, h: ARCH_H,
      hp: CFG.archerHp, speed: CFG.archerSpeed, shootCd: 150, dmg: CFG.archerDmg, score: 150,
      dropRate: 0.12, spellDrop: 0.10,  // archers drop spell refills more often
      minX: 420,
    },
    brute: {
      drawFn: drawBruteSprite, w: BRUTE_W, h: BRUTE_H,
      hp: CFG.bruteHp, speed: CFG.bruteSpeed, shootCd: 999, dmg: CFG.bruteDmg, score: 250,
      dropRate: 0.4, spellDrop: 0.20,
    },
    // ── BOSSES ──
    spider: {
      drawFn: drawSpiderSprite, w: SPIDER_W, h: SPIDER_H,
      hp: CFG.spiderHp, speed: CFG.spiderSpeed, shootCd: CFG.spiderCd, dmg: CFG.spiderDmg, score: 1200,
      dropRate: 1.0, spellDrop: 1.0, isBoss: true,
    },
    lich: {
      drawFn: drawLichSprite, w: LICH_W, h: LICH_H,
      hp: CFG.lichHp, speed: CFG.lichSpeed, shootCd: CFG.lichCd, dmg: CFG.lichDmg, score: 1800,
      dropRate: 1.0, spellDrop: 1.0, isBoss: true,
    },
    apocalyptic: {
      drawFn: drawApocSprite, w: APOC_W, h: APOC_H,
      hp: CFG.apocHp, speed: CFG.apocSpeed, shootCd: CFG.apocCd, dmg: CFG.apocDmg, score: 3000,
      dropRate: 1.0, spellDrop: 1.0, isBoss: true,
    },
  };

  // ─── game state ───────────────────────────────────────────────────────────
  const gs = {
    screen: 'title',
    score: 0, level: 1, wave: 1,
    hp: CFG.playerHp, maxHp: CFG.playerHp,
    spellUses: 3, maxSpell: 3, spellUpgrades: 0,
    rewardChoice: 0,
    itemTier: 0,
    activeItem: null,
    rewardItemChoices: [],
    rewardItemChoice: 0,
  };

  // ─── player ───────────────────────────────────────────────────────────────
  const PL = {
    row: 0, x: 70,
    speed: CFG.playerSpeed, facing: 1,
    atkTimer: 0, atkDur: 14,
    atkRange: CFG.atkRange,
    slashTimer: 0,
    shTimer: 0, shDur: 999,
    iframes: 0,
    weapon: { name:'Dragon Claws', dmg: CFG.weaponDmg, slashColor:'#c8b8e8', slashStyle:'sweep' },
    spell:  { name:'Fire Breath',  dmg: CFG.spellDmg },
    shield: { name:'Scale Shield', block: 50 },
    itemAbility: null,
    itemCd: 0,
    itemCdMax: 0,
    shBroken: false,
    shHp: CFG.shMaxHp, shMaxHp: CFG.shMaxHp,
    soulDrainActive: false,
    deathMarkActive: false,
    mirrorActive: false,
    thornActive: false,
    explodeShieldActive: false,
    bloodlustT: 0,
    holyBarrierT: 0,
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
  window._WD_K = K; window._WD_J = J; // exposed for mobile touch controls
  window.addEventListener('keydown', e=>{
    if(!K[e.code]) J[e.code]=true;
    K[e.code]=true;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e=>{ K[e.code]=false; });
  function eat(c){ if(J[c]){J[c]=false;return true;} return false; }

  // ─── cheat codes ──────────────────────────────────────────────────────────
  // "bryan"   within first 10s → god mode (invincible)
  // "baby"    within first 10s → baby mode (loads wolfdragon_config_baby settings)
  // "simon"   within first 10s → skip to Spider boss
  // "bea"     within first 10s → skip to Lich boss
  // "cecilia" within first 10s → skip to Apocalyptic boss
  // "67"      any time during play → deactivates all active codes
  let friendAlly = null;   // active friend state object, or null
  let victoryCarX = 0;     // x position of car on victory screen
  let victoryCarDelay = 0; // countdown before car starts driving
  let godMode  = false;
  let babyMode = false;
  let godCheatBuf = '';
  let deact67Buf  = '';
  let godCheatDeadline = 0; // performance.now() timestamp
  window.addEventListener('keydown', e => {
    if(gs.screen !== 'playing' && gs.screen !== 'reward' && gs.screen !== 'itemreward') return;
    const ch = e.key.toLowerCase();
    if(ch.length !== 1) return; // ignore shift, ctrl, arrows etc.

    // ── 67 deactivate (always active, no deadline) ──────────────────────────
    deact67Buf = (deact67Buf + ch).slice(-2);
    if(deact67Buf === '67') {
      deact67Buf = '';
      if(godMode || babyMode) {
        godMode = false;
        if(babyMode) { babyMode = false; reloadCFG('wolfdragon_config'); }
        burst(PL.cx, PL.cy, '#888888', 20, 5);
        msg = '✕ CODES OFF'; msgT = 150;
      }
      return;
    }

    // ── Timed cheats (within first 10s of game start) ───────────────────────
    if(performance.now() > godCheatDeadline) { godCheatBuf = ''; return; }
    godCheatBuf = (godCheatBuf + ch).slice(-7); // keep last 7 chars (max code length = "cecilia")
    if(godCheatBuf.endsWith('bryan')) {
      godMode = true; godCheatBuf = '';
      burst(PL.cx, PL.cy, '#ffdd00', 40, 10);
      msg = '✦ BRYAN MODE ✦'; msgT = 180;
    } else if(godCheatBuf.endsWith('baby')) {
      babyMode = true; godCheatBuf = '';
      reloadCFG('wolfdragon_config_baby');
      burst(PL.cx, PL.cy, '#66ccff', 35, 8);
      msg = '🍼 BABY MODE'; msgT = 180;
    } else if(godCheatBuf.endsWith('simon')) {
      godCheatBuf = ''; skipToBoss('spider', 3, 1);
    } else if(godCheatBuf.endsWith('bea')) {
      godCheatBuf = ''; skipToBoss('lich', 6, 2);
    } else if(godCheatBuf.endsWith('cecilia')) {
      godCheatBuf = ''; skipToBoss('apocalyptic', 9, 3);
    }
  });

  function skipToBoss(type, wave, level) {
    // Clear all active entities and jump straight to a boss wave
    enemies=[]; projs=[]; parts=[]; drops=[]; obstacles=[]; flameshields=[];
    webZones=[]; shockwaves=[]; darknessT=0;
    gs.wave=wave; gs.level=level;
    gs.friendTriggered=false; friendAlly=null;
    cleared=false; spawnQueue=[];
    startWave();
    const name = type.toUpperCase();
    burst(W/2, H/2, '#ff4400', 50, 12);
    msg = `⚡ SKIP → ${name}`; msgT = 180;
  }

  // ─── entity lists ─────────────────────────────────────────────────────────
  let enemies=[], projs=[], parts=[], drops=[], obstacles=[], flameshields=[];
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
      const bossHp = def.hp + gs.level * CFG.bossHpScaling;
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
        diveX: 0,          // spider ceiling-drop target X (set at trigger)
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
    const dur = PL.bloodlustT > 0 ? Math.ceil(PL.atkDur * CFG.bloodlustAtkMult) : PL.atkDur;
    PL.atkTimer  = dur;
    PL.slashTimer = dur;
    SFX.attack();
    const box = {
      x: PL.facing>0 ? PL.x+PL.w-10 : PL.x-PL.atkRange+10,
      y: ROW_Y[PL.row]-6,
      w: PL.atkRange, h: PL.h+12,
    };
    enemies.forEach(e=>{
      if(e.phase!=='charge') return;
      const def = ENEMY_TYPES[e.type];
      if(def.isBoss){
        // Boss: allow hit if player Y-center is within ~1 row of boss Y-center
        const plCY = ROW_Y[PL.row] + PL.h / 2;
        const bsCY = e.y + def.h / 2;
        if(Math.abs(plCY - bsCY) >= 88) return;
      } else {
        if(e.row !== PL.row) return;
      }
      if(ov(box, ehb(e))) hitEnemy(e, PL.weapon.dmg);
    });
  }

  function doSpell() {
    if(gs.spellUses<=0) return;
    gs.spellUses--;
    SFX.spell();
    const tier = gs.spellUpgrades || 0;
    const spY  = ROW_Y[PL.row] + PL.h/2 - SP_H/2;

    // Always: main fireball
    projs.push({x:PL.cx, y:spY, vx:PL.facing*12, vy:0, row:PL.row,
      dmg:PL.spell.dmg, owner:'player', spr:SPR_SPELL, w:SP_W, h:SP_H, life:160});

    // Tier 1+: +Spray — side fireballs aimed at adjacent rows
    if(tier >= 1){
      [-1, 1].forEach(off => {
        const tr = Math.max(0, Math.min(ROWS-1, PL.row + off));
        projs.push({x:PL.cx, y:ROW_Y[tr]+PL.h/2-SP_H/2,
          vx:PL.facing*10, vy:off*1.5, row:tr,
          dmg:Math.round(PL.spell.dmg*CFG.sprayDmgPct), owner:'player',
          spr:SPR_SPELL, w:SP_W, h:SP_H, life:140});
      });
    }

    // Tier 2+: Flameshield — orbiting fire orbs (don't stack)
    if(tier >= 2 && flameshields.length === 0){
      const n = Math.max(1, Math.round(CFG.flameshieldOrbs));
      for(let i=0;i<n;i++){
        flameshields.push({angle:(i/n)*Math.PI*2, dmg:Math.round(PL.spell.dmg*CFG.flameshieldDmgPct)});
      }
    }

    // Tier 3+: Nova burst — fire a fireball on every row
    if(tier >= 3){
      for(let r=0;r<ROWS;r++){
        if(r===PL.row) continue; // already fired above
        projs.push({x:PL.cx, y:ROW_Y[r]+PL.h/2-SP_H/2,
          vx:PL.facing*9, vy:0, row:r,
          dmg:Math.round(PL.spell.dmg*CFG.novaDmgPct), owner:'player',
          spr:SPR_SPELL, w:SP_W, h:SP_H, life:150});
      }
    }

    burst(PL.cx, PL.cy, '#aa44ff', tier>=2?24:16);
  }

  function hitEnemy(e,dmg) {
    SFX.enemyHit();
    e.hp-=dmg; e.flashT=9;
    burst(e.x+ENEMY_TYPES[e.type].w/2, e.y+ENEMY_TYPES[e.type].h/2, '#ff4422', 9);
    if(PL.soulDrainActive){ PL.soulDrainActive=false; gs.hp=Math.min(gs.maxHp,gs.hp+CFG.healSouldrain); burst(PL.cx,PL.cy,'#8800ff',10); }
    if(e.hp<=0) killEnemy(e);
  }

  function killEnemy(e) {
    SFX.enemyDie();
    if(PL.deathMarkActive){ PL.deathMarkActive=false; const kcx=e.x+ENEMY_TYPES[e.type].w/2,kcy=e.y+ENEMY_TYPES[e.type].h/2; enemies.forEach(e2=>{ if(e2!==e) hitEnemy(e2,CFG.dmgDeathmark); }); burst(kcx,kcy,'#ff8800',50,14); }
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

  function hurtPlayer(dmg, isBoss, shieldCost) {
    if(godMode) return; // invincible
    if(PL.sh || PL.iframes > 0 && PL.shBroken) {
      // Shield is active OR shield just broke this volley (iframes grace period).
      // Either way: fully absorb — no HP damage.
      if(PL.sh) {
        const cost = shieldCost !== undefined ? shieldCost : (isBoss ? 2 : 1);
        PL.shHp = Math.max(0, PL.shHp - cost);
        burst(PL.cx, PL.cy, PL.shHp > 0 ? SB : '#ff8844', 18, 6);
        SFX.block();
        blockMsg = 40;
        if(PL.shHp <= 0) PL.shBroken = true;
        // Grace period: prevents the same volley dealing HP damage after shield breaks.
        PL.iframes = Math.max(PL.iframes, 30);
        if(PL.thornActive){ PL.thornActive=false; enemies.forEach(e=>hitEnemy(e,CFG.dmgThornwall)); burst(PL.cx,PL.cy,'#44ff44',20); }
        if(PL.explodeShieldActive){ PL.explodeShieldActive=false; enemies.forEach(e=>hitEnemy(e,CFG.dmgExplodeshield)); burst(W/2,H/2,'#ff8800',50,14); }
      }
      return;
    }
    if(PL.iframes>0) return;
    gs.hp=Math.max(0,gs.hp-dmg);
    PL.iframes=70;
    SFX.hurt();
    burst(PL.cx,PL.cy,'#ff3333',12);
    if(gs.hp<=0) gs.screen='gameover';
  }

  // ─── reward screen input ──────────────────────────────────────────────────
  // Build a fresh reward list — called once per wave end, stored in gs.rewardChoices.
  function makeRewards(){
    // Shield pip modifier on FORTIFY — randomly added when available (up to 2× per run)
    const pipTier = gs.shieldPipUpgrades||0;
    const fortifyHasPip = pipTier < 2 && Math.random() < 0.6;
    const pipAmt = pipTier === 0 ? CFG.shieldPipT1 : CFG.shieldPipT2;
    return [
      { icon:'⚔', label:'WEAPON UP', desc:'+8 dmg  +25% range (max 300)',
        fn(){ PL.weapon.dmg+=8; PL.atkRange=Math.min(300,Math.round(PL.atkRange*1.25)); } },
      { icon:'✦', label:'+SPELL',
        get desc(){
          const t=gs.spellUpgrades||0;
          const hint=[
            `✦ Unlocks: Spray (${Math.round(CFG.sprayDmgPct*100)}% side fire)`,
            `✦ Unlocks: Flameshield (${CFG.flameshieldOrbs} orbs)`,
            `✦ Unlocks: Nova burst all rows`,
          ];
          return '+1 charge  +10 spell dmg\n(max 6 charges)'+(t<hint.length?'\n'+hint[t]:'');
        },
        fn(){ gs.maxSpell=Math.min(6,gs.maxSpell+1); gs.spellUses=gs.maxSpell; PL.spell.dmg+=10; gs.spellUpgrades=(gs.spellUpgrades||0)+1; } },
      { icon:'🛡', label:'FORTIFY',
        desc: fortifyHasPip
          ? `+35 max HP  Full heal\n+${pipAmt} shield pip${pipAmt>1?'s':''}`
          : '+35 max HP\nFull heal',
        fn(){ gs.maxHp+=35; gs.hp=gs.maxHp;
          if(fortifyHasPip){ PL.shMaxHp+=pipAmt; PL.shHp=PL.shMaxHp; gs.shieldPipUpgrades=(gs.shieldPipUpgrades||0)+1; }
        } },
    ];
  }
  // Returns the stored choices for the current reward screen (stable across draw calls).
  function getRewards(){ return gs.rewardChoices || (gs.rewardChoices=makeRewards()); }

  const ITEM_POOLS = {
    weapon: [
      // tier 0
      { name:"Dragon's Fang",    icon:'🗡', desc:'+6 dmg / +10 max HP',     abilityName:'Lunge Strike',   abDesc:'S: Dash+strike 2× dmg, brief invuln',   ability:'lunge',      cdMax:360, slashColor:'#cc88ff', slashStyle:'sweep', stat(){ PL.weapon.dmg+=6; gs.maxHp+=10; gs.hp=Math.min(gs.maxHp,gs.hp+10); } },
      { name:"Soul Reaper",       icon:'💀', desc:'+5 dmg / +1 spell slot',  abilityName:'Soul Drain',     abDesc:'S: Next hit heals HP',        ability:'souldrain',  cdMax:300, slashColor:'#880033', slashStyle:'blade', stat(){ PL.weapon.dmg+=5; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Sundering Axe",     icon:'🪓', desc:'+8 dmg / +15% range',     abilityName:'Cleave',         abDesc:'S: Axe hits all enemies on row',  ability:'cleave',     cdMax:420, slashColor:'#ff8800', slashStyle:'blade', stat(){ PL.weapon.dmg+=8; PL.atkRange=Math.min(300,Math.round(PL.atkRange*1.15)); } },
      { name:"Warblade",          icon:'⚔', desc:'+6 dmg / +15 max HP',     abilityName:'Lunge Strike',   abDesc:'S: Dash+strike 2× dmg, brief invuln',   ability:'lunge',      cdMax:360, slashColor:'#ffcc44', slashStyle:'blade', stat(){ PL.weapon.dmg+=6; gs.maxHp+=15; gs.hp=Math.min(gs.maxHp,gs.hp+20); } },
      { name:"Hexfang",           icon:'🐍', desc:'+7 dmg / +1 spell slot',  abilityName:'Void Ball',      abDesc:'S: Piercing purple orb, full row',   ability:'voidslash',  cdMax:480, slashColor:'#aa44ff', slashStyle:'void',  stat(){ PL.weapon.dmg+=7; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      // tier 1
      { name:"Thunderstrike",     icon:'⚡', desc:'+12 dmg / +15 max HP',    abilityName:'Chain Lightning',abDesc:'S: Lightning zaps all enemies on screen', ability:'lightning',  cdMax:480, slashColor:'#ffff44', slashStyle:'thunder', stat(){ PL.weapon.dmg+=12; gs.maxHp+=15; gs.hp=Math.min(gs.maxHp,gs.hp+20); } },
      { name:"Bloodfang Blade",   icon:'🩸', desc:'+10 dmg / +2 spell slots',abilityName:'Bloodlust',      abDesc:'S: Hold Z to rapid-attack (auto-swing)',  ability:'bloodlust',  cdMax:600, slashColor:'#cc0033', slashStyle:'sweep',   stat(){ PL.weapon.dmg+=10; gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Voidblade",         icon:'🌑', desc:'+14 dmg / +20% range',    abilityName:'Void Ball',      abDesc:'S: Piercing purple orb, full row',   ability:'voidslash',  cdMax:480, slashColor:'#6600cc', slashStyle:'void',    stat(){ PL.weapon.dmg+=14; PL.atkRange=Math.min(300,Math.round(PL.atkRange*1.2)); } },
      { name:"Soulbreaker",       icon:'👁', desc:'+12 dmg / +1 spell slot', abilityName:'Soul Drain',     abDesc:'S: Next hit heals HP',        ability:'souldrain',  cdMax:300, slashColor:'#550077', slashStyle:'void',    stat(){ PL.weapon.dmg+=12; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Crimson Edge",      icon:'🔥', desc:'+13 dmg / +20 max HP',    abilityName:'Cleave',         abDesc:'S: Axe hits all enemies on row', ability:'cleave',     cdMax:420, slashColor:'#ff4400', slashStyle:'blade',   stat(){ PL.weapon.dmg+=13; gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+25); } },
      // tier 2
      { name:"Dragonfang Ancient",icon:'🐉', desc:'+20 dmg / +25 max HP',    abilityName:'Dragon Fury',    abDesc:'S: Massive claw strike hits all rows',  ability:'dragonfury', cdMax:600, slashColor:'#ff9900', slashStyle:'sweep',   stat(){ PL.weapon.dmg+=20; gs.maxHp+=25; gs.hp=Math.min(gs.maxHp,gs.hp+40); } },
      { name:"Reaper's Scythe",   icon:'⚰', desc:'+18 dmg / +2 spell slots',abilityName:'Death Mark',     abDesc:'S: Mark enemy — kill triggers explosion, hits all',  ability:'deathmark',  cdMax:540, slashColor:'#330000', slashStyle:'blade',   stat(){ PL.weapon.dmg+=18; gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Worldbreaker",      icon:'💥', desc:'+22 dmg / +25% range',    abilityName:'Chain Lightning',abDesc:'S: Lightning zaps all enemies on screen', ability:'lightning',  cdMax:480, slashColor:'#ffee00', slashStyle:'thunder', stat(){ PL.weapon.dmg+=22; PL.atkRange=Math.min(300,Math.round(PL.atkRange*1.25)); } },
      { name:"Abyss Blade",       icon:'🕳', desc:'+20 dmg / +20 max HP',    abilityName:'Void Ball',      abDesc:'S: Piercing purple orb, full row',   ability:'voidslash',  cdMax:480, slashColor:'#220066', slashStyle:'void',    stat(){ PL.weapon.dmg+=20; gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+30); } },
      { name:"Godslayer",         icon:'👑', desc:'+25 dmg / +3 spell slots',abilityName:'Dragon Fury',    abDesc:'S: Massive claw strike hits all rows',  ability:'dragonfury', cdMax:600, slashColor:'#ffaa00', slashStyle:'sweep',   stat(){ PL.weapon.dmg+=25; gs.maxSpell=Math.min(8,gs.maxSpell+3); gs.spellUses=gs.maxSpell; } },
    ],
    spell: [
      // tier 0
      { name:"Frost Tome",        icon:'❄', desc:'+7 spell dmg / +1 slot',   abilityName:'Ice Nova',       abDesc:'S: Freeze all enemies for 3s',  ability:'icenova',    cdMax:480, stat(){ PL.spell.dmg+=7; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Firewall Scroll",   icon:'🔥', desc:'+6 spell dmg / +10 HP',    abilityName:'Firewall',       abDesc:'S: Fire spreads across all rows',   ability:'firewall',   cdMax:420, stat(){ PL.spell.dmg+=6; gs.maxHp+=10; gs.hp=Math.min(gs.maxHp,gs.hp+10); } },
      { name:"Tempest Rod",       icon:'🌪', desc:'+7 spell dmg / +1 slot',   abilityName:'Whirlwind',      abDesc:'S: Pull all to center, 5% HP dmg, freeze 1s',ability:'whirlwind',  cdMax:540, stat(){ PL.spell.dmg+=7; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Shadow Grimoire",   icon:'📖', desc:'+7 spell dmg / +15 HP',    abilityName:'Ice Nova',       abDesc:'S: Freeze all enemies for 3s',  ability:'icenova',    cdMax:480, stat(){ PL.spell.dmg+=7; gs.maxHp+=15; gs.hp=Math.min(gs.maxHp,gs.hp+15); } },
      { name:"Spirit Wand",       icon:'✨', desc:'+6 spell dmg / +1 slot',   abilityName:'Whirlwind',      abDesc:'S: Pull all to center, 5% HP dmg, freeze 1s', ability:'whirlwind',  cdMax:540, stat(){ PL.spell.dmg+=6; gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      // tier 1
      { name:"Storm Codex",       icon:'⛈', desc:'+8 spell dmg / +2 slots',  abilityName:'Chain Lightning',abDesc:'S: Lightning zaps all enemies on screen', ability:'lightning',  cdMax:480, stat(){ PL.spell.dmg+=8;  gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Void Grimoire",     icon:'🌌', desc:'+8 spell dmg / +20 HP',    abilityName:'Firewall',       abDesc:'S: Fire spreads across all rows',  ability:'firewall',   cdMax:420, stat(){ PL.spell.dmg+=8;  gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+20); } },
      { name:"Cataclysm Tome",    icon:'💫', desc:'+9 spell dmg / +1 slot',   abilityName:'Ice Nova',       abDesc:'S: Freeze all enemies for 3s',  ability:'icenova',    cdMax:480, stat(){ PL.spell.dmg+=9;  gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Runic Staff",       icon:'🔮', desc:'+8 spell dmg / +2 slots',  abilityName:'Whirlwind',      abDesc:'S: Pull all to center, 5% HP dmg, freeze 1s', ability:'whirlwind',  cdMax:540, stat(){ PL.spell.dmg+=8;  gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Soulfire Orb",      icon:'🔴', desc:'+10 spell dmg / +20 HP',   abilityName:'Chain Lightning',abDesc:'S: Lightning zaps all enemies on screen', ability:'lightning',  cdMax:480, stat(){ PL.spell.dmg+=10; gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+20); } },
      // tier 2
      { name:"Armageddon Tome",   icon:'☄', desc:'+14 spell dmg / +3 slots', abilityName:'Dragon Fury',    abDesc:'S: Massive claw strike hits all rows', ability:'dragonfury', cdMax:600, stat(){ PL.spell.dmg+=14; gs.maxSpell=Math.min(8,gs.maxSpell+3); gs.spellUses=gs.maxSpell; } },
      { name:"World Ender Scroll",icon:'🌍', desc:'+12 spell dmg / +30 HP',   abilityName:'Firewall',       abDesc:'S: Fire spreads across all rows', ability:'firewall',   cdMax:420, stat(){ PL.spell.dmg+=12; gs.maxHp+=25; gs.hp=Math.min(gs.maxHp,gs.hp+30); } },
      { name:"Eternal Grimoire",  icon:'♾', desc:'+15 spell dmg / +2 slots', abilityName:'Ice Nova',       abDesc:'S: Freeze all enemies for 3s', ability:'icenova',    cdMax:480, stat(){ PL.spell.dmg+=15; gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Chaos Staff",       icon:'🌀', desc:'+14 spell dmg / +3 slots', abilityName:'Whirlwind',      abDesc:'S: Pull all to center, 5% HP dmg, freeze 1s', ability:'whirlwind',  cdMax:540, stat(){ PL.spell.dmg+=14; gs.maxSpell=Math.min(8,gs.maxSpell+3); gs.spellUses=gs.maxSpell; } },
      { name:"Divine Codex",      icon:'💎', desc:'+16 spell dmg / +40 HP',   abilityName:'Chain Lightning',abDesc:'S: Lightning zaps all enemies on screen', ability:'lightning', cdMax:480, stat(){ PL.spell.dmg+=16; gs.maxHp+=30; gs.hp=Math.min(gs.maxHp,gs.hp+40); } },
    ],
    shield: [
      // tier 0
      { name:"Spiked Buckler",    icon:'🛡', desc:'+20 max HP / +1 spell slot',abilityName:'Thorn Wall',    abDesc:'S: Arm — next blocked hit spikes all enemies', ability:'thornwall',    cdMax:480, stat(){ gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+20); gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Mirror Shield",     icon:'🔵', desc:'+25 max HP / +10 weapon dmg',abilityName:'Mirror',        abDesc:'S: Reflect next projectile (2× dmg)', ability:'mirrorshield', cdMax:360, stat(){ gs.maxHp+=25; gs.hp=Math.min(gs.maxHp,gs.hp+25); PL.weapon.dmg+=10; } },
      { name:"Iron Wall",         icon:'🧱', desc:'+30 max HP / +15 weapon dmg',abilityName:'Holy Barrier',  abDesc:'S: Divine shield — invincible for 3s',ability:'holybarrier',  cdMax:600, stat(){ gs.maxHp+=30; gs.hp=Math.min(gs.maxHp,gs.hp+30); PL.weapon.dmg+=15; } },
      { name:"Ward Stone",        icon:'🪨', desc:'+20 max HP / +1 slot',       abilityName:'Thorn Wall',    abDesc:'S: Arm — next blocked hit spikes all enemies', ability:'thornwall',    cdMax:480, stat(){ gs.maxHp+=20; gs.hp=Math.min(gs.maxHp,gs.hp+20); gs.maxSpell=Math.min(8,gs.maxSpell+1); gs.spellUses=gs.maxSpell; } },
      { name:"Scale Armor",       icon:'🦎', desc:'+35 max HP / +10 weapon dmg',abilityName:'Mirror',        abDesc:'S: Reflect next projectile (2× dmg)', ability:'mirrorshield', cdMax:360, stat(){ gs.maxHp+=35; gs.hp=Math.min(gs.maxHp,gs.hp+35); PL.weapon.dmg+=10; } },
      // tier 1
      { name:"Explosion Shield",  icon:'💣', desc:'+30 max HP / +20 weapon dmg',abilityName:'Explode Shield',abDesc:'S: Arm — next blocked hit explodes, hits all enemies',ability:'explodeshield',cdMax:540, stat(){ gs.maxHp+=30; gs.hp=Math.min(gs.maxHp,gs.hp+30); PL.weapon.dmg+=20; } },
      { name:"Runic Aegis",       icon:'🔷', desc:'+40 max HP / +2 spell slots',abilityName:'Holy Barrier',  abDesc:'S: Divine shield — invincible for 3s', ability:'holybarrier',  cdMax:600, stat(){ gs.maxHp+=40; gs.hp=Math.min(gs.maxHp,gs.hp+40); gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Void Guard",        icon:'⬛', desc:'+45 max HP / +25 weapon dmg',abilityName:'Thorn Wall',    abDesc:'S: Arm — next blocked hit spikes all enemies', ability:'thornwall',    cdMax:480, stat(){ gs.maxHp+=45; gs.hp=Math.min(gs.maxHp,gs.hp+45); PL.weapon.dmg+=25; } },
      { name:"Spectral Wall",     icon:'👻', desc:'+35 max HP / +2 spell slots',abilityName:'Mirror',        abDesc:'S: Reflect next projectile (2× dmg)', ability:'mirrorshield', cdMax:360, stat(){ gs.maxHp+=35; gs.hp=Math.min(gs.maxHp,gs.hp+35); gs.maxSpell=Math.min(8,gs.maxSpell+2); gs.spellUses=gs.maxSpell; } },
      { name:"Hellforged Plate",  icon:'🔱', desc:'+50 max HP / +20 weapon dmg',abilityName:'Explode Shield',abDesc:'S: Arm — next blocked hit explodes, hits all enemies',ability:'explodeshield',cdMax:540, stat(){ gs.maxHp+=50; gs.hp=Math.min(gs.maxHp,gs.hp+50); PL.weapon.dmg+=20; } },
      // tier 2
      { name:"Divine Bulwark",    icon:'✝', desc:'+45 max HP / +3 spell slots',abilityName:'Holy Barrier',  abDesc:'S: Divine shield — invincible for 3s', ability:'holybarrier',  cdMax:600, stat(){ gs.maxHp+=45; gs.hp=Math.min(gs.maxHp,gs.hp+45); gs.maxSpell=Math.min(8,gs.maxSpell+3); gs.spellUses=gs.maxSpell; } },
      { name:"Titan Shield",      icon:'🏛', desc:'+50 max HP / +12 weapon dmg',abilityName:'Explode Shield',abDesc:'S: Arm — next blocked hit explodes, hits all enemies', ability:'explodeshield', cdMax:540, stat(){ gs.maxHp+=50; gs.hp=Math.min(gs.maxHp,gs.hp+50); PL.weapon.dmg+=12; } },
      { name:"Eternal Aegis",     icon:'⚜', desc:'+40 max HP / +3 spell slots',abilityName:'Mirror',        abDesc:'S: Reflect next projectile (2× dmg)', ability:'mirrorshield', cdMax:360, stat(){ gs.maxHp+=40; gs.hp=Math.min(gs.maxHp,gs.hp+40); gs.maxSpell=Math.min(8,gs.maxSpell+3); gs.spellUses=gs.maxSpell; } },
      { name:"Chaos Barrier",     icon:'🌪', desc:'+40 max HP / +14 weapon dmg',abilityName:'Thorn Wall',    abDesc:'S: Arm — next blocked hit spikes all enemies', ability:'thornwall',    cdMax:480, stat(){ gs.maxHp+=40; gs.hp=Math.min(gs.maxHp,gs.hp+40); PL.weapon.dmg+=14; } },
      { name:"Godwall",           icon:'⭐', desc:'+55 max HP / +4 spell slots',abilityName:'Dragon Fury',  abDesc:'S: Massive claw strike hits all rows', ability:'dragonfury',   cdMax:600, stat(){ gs.maxHp+=55; gs.hp=Math.min(gs.maxHp,gs.hp+55); gs.maxSpell=Math.min(8,gs.maxSpell+4); gs.spellUses=gs.maxSpell; } },
    ],
  };

  function doItemAbility(){
    PL.itemCd = PL.itemCdMax;
    switch(PL.itemAbility){
      case 'lunge': {
        SFX.lunge();
        const dashDir = PL.facing;
        PL.x = Math.max(0, Math.min(W-PL.w, PL.x + dashDir * 120));
        const box={x:PL.x-40,y:ROW_Y[PL.row]-6,w:PL.w+80,h:PL.h+12};
        enemies.forEach(e=>{ if(e.row===PL.row&&ov(box,ehb(e))) hitEnemy(e,PL.weapon.dmg*CFG.multLunge); });
        PL.iframes = CFG.lungeIframes;
        burst(PL.cx,PL.cy,'#ffaa00',20,8);
        break;
      }
      case 'souldrain': {
        SFX.souldrain();
        PL.soulDrainActive=true;
        burst(PL.cx,PL.cy,'#8800ff',16,6);
        break;
      }
      case 'cleave': {
        SFX.cleave();
        const box={x:0,y:ROW_Y[PL.row]-6,w:W,h:PL.h+12};
        enemies.forEach(e=>{ if(e.row===PL.row&&ov(box,ehb(e))) hitEnemy(e,PL.weapon.dmg*CFG.multCleave); });
        burst(PL.cx,PL.cy,'#ff8800',24,7);
        // Visual axe sweep — flies across the full row, no damage (already applied)
        const axeSpd = PL.facing * 22;
        projs.push({x:PL.cx-18, y:ROW_Y[PL.row]+PL.h/2-18, vx:axeSpd, vy:0,
          row:PL.row, dmg:0, owner:'player', axe:true, w:36, h:36, life:52,
          spin:0, spinDir:PL.facing});
        break;
      }
      case 'lightning': {
        SFX.lightning();
        enemies.forEach(e=>{ hitEnemy(e,PL.spell.dmg*CFG.multLightning); burst(e.x+ENEMY_TYPES[e.type].w/2,e.y,'#ffff00',8,4); });
        burst(PL.cx,PL.cy,'#ffff00',30,12);
        break;
      }
      case 'bloodlust': {
        SFX.bloodlust();
        PL.bloodlustT=CFG.bloodlustDuration;
        burst(PL.cx,PL.cy,'#ff0044',20,7);
        break;
      }
      case 'voidslash': {
        SFX.voidball();
        projs.push({x:PL.cx,y:ROW_Y[PL.row]+PL.h/2-SP_H,vx:PL.facing*16,vy:0,row:PL.row,
          dmg:PL.weapon.dmg*CFG.multVoidslash,owner:'player',spr:SPR_SPELL,w:SP_W*2,h:SP_H*2,
          life:180, pierce:true, color:'#aa00ff'});
        burst(PL.cx,PL.cy,'#cc00ff',20,8);
        break;
      }
      case 'dragonfury': {
        SFX.dragonfury();
        enemies.forEach(e=>hitEnemy(e,PL.weapon.dmg*CFG.multDragonfury));
        burst(W/2,H/2,'#ff4400',50,12);
        break;
      }
      case 'icenova': {
        SFX.icenova();
        enemies.forEach(e=>{ e.frozen=(e.frozen||0)+CFG.freezeIcenova; burst(e.x+ENEMY_TYPES[e.type].w/2,e.y,'#88ccff',8,3); });
        burst(PL.cx,PL.cy,'#aaddff',30,8);
        break;
      }
      case 'firewall': {
        SFX.firewall();
        for(let r=0;r<ROWS;r++){
          projs.push({x:PL.cx,y:ROW_Y[r],vx:PL.facing*6,vy:0,row:r,
            dmg:PL.spell.dmg*CFG.multFirewall,owner:'player',spr:SPR_SPELL,w:SP_W,h:SP_H,life:200});
        }
        burst(PL.cx,PL.cy,'#ff6600',25,10);
        break;
      }
      case 'deathmark': {
        SFX.deathmark();
        PL.deathMarkActive=true;
        burst(PL.cx,PL.cy,'#880000',20,8);
        break;
      }
      case 'whirlwind': {
        SFX.whirlwind();
        const wCX = W / 2;
        enemies.forEach(e=>{
          const def = ENEMY_TYPES[e.type];
          const wpDmg = Math.max(1, Math.floor(e.hp * CFG.whirlwindHpPct));
          hitEnemy(e, wpDmg);
          if(!def.isBoss){
            // Non-boss: snap to center row and center X, freeze
            e.row = CENTER_ROW;
            e.y = ROW_Y[CENTER_ROW];
            e.targetY = ROW_Y[CENTER_ROW];
            e.x = wCX - def.w / 2;
            e.frozen = (e.frozen||0) + CFG.whirlwindFreeze;
          } else {
            // Boss: pull X toward screen center (partial), no row change
            e.x = Math.max(W*0.15, Math.min(W - def.w - 5,
              e.x + (wCX - (e.x + def.w/2)) * 0.5));
          }
        });
        burst(W/2, H/2, '#88ffff', 40, 12);
        break;
      }
      case 'mirrorshield': {
        SFX.mirrorshield();
        PL.mirrorActive=true;
        burst(PL.cx,PL.cy,'#aaddff',20,8);
        break;
      }
      case 'thornwall': {
        SFX.thornwall();
        PL.thornActive=true;
        burst(PL.cx,PL.cy,'#44ff44',16,6);
        break;
      }
      case 'holybarrier': {
        SFX.holybarrier();
        PL.iframes=CFG.holyBarrierDur;
        PL.holyBarrierT=CFG.holyBarrierDur;
        burst(PL.cx,PL.cy,'#ffffff',30,10);
        break;
      }
      case 'explodeshield': {
        SFX.explodeshield();
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
    // Deduplicate by ability — no two choices should share the same ability
    const seen=new Set(), choices=[];
    for(const item of shuffled){
      if(!seen.has(item.ability)){ seen.add(item.ability); choices.push(item); if(choices.length===3) break; }
    }
    // Fallback: if tier pool has fewer than 3 distinct abilities, fill with remainder
    if(choices.length<3){ for(const item of shuffled){ if(!choices.includes(item)){ choices.push(item); if(choices.length===3) break; } } }
    gs.rewardItemChoices=choices;
    gs.rewardItemChoice=0;
    gs.screen='itemreward';
  }

  const _CDMAP={lunge:'cdLunge',souldrain:'cdSouldrain',cleave:'cdCleave',lightning:'cdLightning',bloodlust:'cdBloodlust',voidslash:'cdVoidslash',dragonfury:'cdDragonfury',icenova:'cdIcenova',firewall:'cdFirewall',deathmark:'cdDeathmark',whirlwind:'cdWhirlwind',mirrorshield:'cdMirrorshield',thornwall:'cdThornwall',holybarrier:'cdHolybarrier',explodeshield:'cdExplodeshield'};
  function applyItemReward(i){
    const item=gs.rewardItemChoices[i];
    item.stat();
    PL.itemAbility=item.ability;
    PL.itemCd=0;
    PL.itemCdMax = (_CDMAP[item.ability] && CFG[_CDMAP[item.ability]] !== undefined) ? CFG[_CDMAP[item.ability]] : item.cdMax;
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
      if(eat('KeyS')) applyItemReward(gs.rewardItemChoice);
      return;
    }
    if(gs.screen==='reward'){
      if(eat('ArrowLeft')&&gs.rewardChoice>0) gs.rewardChoice--;
      if(eat('ArrowRight')&&gs.rewardChoice<2) gs.rewardChoice++;
      if(eat('Digit1')) applyReward(0);
      if(eat('Digit2')) applyReward(1);
      if(eat('Digit3')) applyReward(2);
      if(eat('KeyS')) applyReward(gs.rewardChoice);
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

    if(PL.bloodlustT > 0 ? (K['KeyZ']||K['Space']) : (eat('KeyZ')||eat('Space'))) doAttack();
    if(eat('KeyX')) doSpell();
    if(eat('KeyS') && PL.itemAbility && PL.itemCd===0) doItemAbility();

    if(PL.atkTimer  > 0) PL.atkTimer--;
    if(PL.slashTimer > 0) PL.slashTimer--;
    if(PL.iframes     > 0) PL.iframes--;
    if(PL.holyBarrierT > 0) PL.holyBarrierT--;
    // Flameshield orb update — orbit player and damage enemies on contact
    if(flameshields.length > 0){
      flameshields = flameshields.filter(fs=>{
        fs.angle += 0.06;
        const fx = PL.cx + Math.cos(fs.angle) * 40;
        const fy = ROW_Y[PL.row] + PL.h/2 + Math.sin(fs.angle) * 26;
        for(const e of enemies){
          const def=ENEMY_TYPES[e.type];
          if(Math.hypot(fx-(e.x+def.w/2), fy-(e.y+def.h/2)) < def.w/2 + 12){
            hitEnemy(e, fs.dmg);
            burst(fx, fy, '#ff6600', 8, 4);
            return false; // orb expended
          }
        }
        return true;
      });
    }
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

    // Clamp projectile spawn x so it's always ≥ minDist pixels from player —
    // prevents boss attacks spawning on top of the player after a dive/lunge.
    function safeSpawnX(rawX, dir, minDist) {
      if(dir < 0) return Math.max(rawX, PL.cx + minDist); // firing left: must start right of player
      return Math.min(rawX, PL.cx - minDist);              // firing right: must start left of player
    }

    function fireBossAttack(e, def, atkType) {
      const dir = e.facing;          // –1 = toward player on left, +1 = toward player on right
      const cx  = e.x + def.w/2;
      const cy  = e.y + def.h/2;
      e.atkAnim = 30;

      switch (atkType) {
        /* ── SPIDER ─────────────────────────────────────────── */
        case 'spread': {
          const n = 3 + e.bossPhase * 2;
          const sx = safeSpawnX(dir<0?e.x:e.x+def.w, dir, 160);
          for (let i=0;i<n;i++){
            const vy = (i-(n-1)/2)*0.7;
            projs.push({x:sx, y:cy-FB_H/2,
              vx:dir*4, vy, row:CENTER_ROW, dmg:def.dmg, owner:'enemy', isBoss:true,
              spr:SPR_FB, w:FB_W, h:FB_H, life:300});
          }
          burst(cx, cy, '#ff4400', 8);
          break;
        }
        case 'lunge': {
          SFX.spiderLunge();
          e.lungeT = 45;
          burst(cx, cy, '#ff2200', 14, 5);
          break;
        }
        case 'web': {
          SFX.spiderAttack();
          const wx = safeSpawnX(dir<0?e.x:e.x+def.w, dir, 160);
          for (let r=Math.max(0,PL.row-1); r<=Math.min(ROWS-1,PL.row+1); r++){
            projs.push({x:wx, y:ROW_Y[r]+GRUNT_H/2-FB_H/2,
              vx:dir*2.2, vy:0, row:r, dmg:def.dmg*1.4, owner:'enemy', isBoss:true,
              spr:SPR_FB, w:FB_W*2, h:FB_H, life:420});
          }
          burst(cx, cy, '#884400', 10);
          break;
        }
        case 'burst': {
          SFX.spiderAttack();
          // Spawn from spider's row; angle vy to track toward player's row.
          // safeSpawnX ensures ≥160px travel distance even after a dive.
          const bx  = safeSpawnX(dir<0?e.x:e.x+def.w, dir, 160);
          const bSpiderRow = e.row;
          const bTargetRow = PL.row; // snapshot player row for targeting
          const bBaseVY = (ROW_Y[bTargetRow] - ROW_Y[bSpiderRow]) * 0.012;
          for (let i=0;i<4;i++){
            setTimeout(()=>{
              if(gs.screen!=='playing') return;
              projs.push({x:bx, y:ROW_Y[bSpiderRow]+GRUNT_H/2-FB_H/2,
                vx:dir*(4+i*0.5), vy:bBaseVY+(Math.random()-0.5)*0.3,
                row:bSpiderRow, dmg:def.dmg*0.7,
                owner:'enemy', isBoss:true, spr:SPR_FB, w:FB_W, h:FB_H, life:300});
            }, i*80);
          }
          burst(cx, cy, '#ff6600', 12);
          break;
        }
        /* ── LICH ───────────────────────────────────────────── */
        case 'orbs': {
          SFX.lichAttack();
          const shots = e.bossPhase + 1;
          for (let i=0;i<shots;i++){
            const targetVY = (ROW_Y[PL.row] - cy) * 0.015;
            projs.push({x:dir<0?e.x:e.x+def.w, y:cy-SP_H/2,
              vx:dir*(3.5+i*0.5), vy:targetVY+(i-Math.floor(shots/2))*0.4,
              row:e.row, dmg:def.dmg, owner:'enemy', isBoss:true, shieldCost:3,
              spr:SPR_SPELL, w:SP_W, h:SP_H, life:320});
          }
          burst(cx, cy, '#8800cc', 10);
          break;
        }
        case 'wave': {
          for (let r=0;r<ROWS;r++){
            projs.push({x:dir<0?e.x:e.x+def.w, y:ROW_Y[r]+GRUNT_H/2-SP_H/2,
              vx:dir*3.5, vy:0, row:r, dmg:def.dmg*0.8, owner:'enemy', isBoss:true, shieldCost:3,
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
              owner:'enemy', isBoss:true, shieldCost:3,
              spr:SPR_SPELL, w:SP_W, h:SP_H, life:400});
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
                row:e.row, dmg:def.dmg, owner:'enemy', isBoss:true, shieldCost:3,
                spr:SPR_SPELL, w:SP_W, h:SP_H, life:300});
            }, i*65);
          }
          burst(cx, cy, '#ff00ff', 20, 6);
          break;
        }
        /* ── APOC ───────────────────────────────────────────── */
        case 'beam': {
          SFX.apocAttack();
          const beamX = safeSpawnX(dir<0?e.x:e.x+def.w, dir, 160);
          for (let r=0;r<ROWS;r++){
            projs.push({x:beamX, y:ROW_Y[r]+GRUNT_H/2-FB_H/2,
              vx:dir*5, vy:0, row:r, dmg:def.dmg, owner:'enemy', isBoss:true,
              spr:SPR_FB, w:FB_W, h:FB_H, life:300});
          }
          burst(cx, cy, '#cc0000', 20, 8);
          break;
        }
        case 'focused': {
          SFX.apocAttack();
          // 5 rapid shots locked to player's row, always start far side from player
          const focX = safeSpawnX(dir<0?e.x:e.x+def.w, dir, 160);
          for (let i=0;i<5;i++){
            setTimeout(()=>{
              if(gs.screen!=='playing') return;
              projs.push({x:focX, y:ROW_Y[PL.row]+GRUNT_H/2-FB_H/2,
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
          // V-shape: one shot per row angled to converge toward player, always starts far side
          const slamX = safeSpawnX(dir<0?e.x:e.x+def.w, dir, 160);
          for (let r=0;r<ROWS;r++){
            const vyTarget = (ROW_Y[r]+GRUNT_H/2 - cy) * 0.025;
            projs.push({x:slamX, y:cy-FB_H/2,
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
          SFX.spiderDive();
          // Spider disappears briefly, telegraphs crash-down on player's row
          e.diveT = 70;
          e.diveRow = PL.row;
          e.diveX = Math.max(W*0.1, Math.min(W - ENEMY_TYPES.spider.w - 8,
            PL.x + PL.w/2 - ENEMY_TYPES.spider.w/2));
          e.atkAnim = 50;
          burst(cx, cy, '#ff4400', 10, 5);
          break;
        }
        /* ── LICH new ────────────────────────────────────────────── */
        case 'darkness': {
          SFX.lichDarkness();
          // Brief darkness overlay — screen dims, lich nearly invisible for 90 frames
          darknessT = 90;
          e.atkAnim = 50;
          burst(cx, cy, '#110022', 20, 6);
          break;
        }
        case 'soulpull': {
          SFX.lichSoulpull();
          // Vortex pulls player toward lich for 120 frames
          e.soulPullT = 120;
          e.atkAnim = 60;
          burst(cx, cy, '#aa00ff', 30, 8);
          break;
        }
        /* ── APOC new ────────────────────────────────────────────── */
        case 'quake': {
          SFX.apocQuake();
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
              e.x = e.diveX;
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
            // Pick a row different from the player's current row
            const rowChoices = [...Array(ROWS).keys()].filter(r => r !== PL.row);
            const newRow = rowChoices[Math.floor(Math.random()*rowChoices.length)];
            e.row = newRow;
            e.targetY = ROW_Y[newRow] + (GRUNT_H - def.h)/2;
            // Teleport to the opposite side of the screen from the player
            const farSide = PL.x < W/2
              ? W*0.62 + Math.random()*(W*0.28)   // player left → lich appears right
              : W*0.10 + Math.random()*(W*0.28);  // player right → lich appears left
            e.x = farSide;
            burst(eCX, e.y+def.h/2, '#aa44ff', 16, 5);
            SFX.lichTeleport();
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

        // Contact damage — Y-center distance + horizontal overlap
        // Avoids relying on e.row which isn't kept in sync for all bosses
        if (e.meleeCd > 0) e.meleeCd--;
        const plCY    = ROW_Y[PL.row] + PL.h / 2;
        const bsCY    = e.y + def.h / 2;
        const yClose  = Math.abs(plCY - bsCY) < 88; // ~1 row gap = 72px; 88 gives a little tolerance
        const horizOvlp = PL.x + PL.w - 10 > e.x + def.w * 0.2 &&
                          PL.x + 10       < e.x + def.w * 0.8;
        if (e.meleeCd === 0 && yClose && horizOvlp) {
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
          SFX.bruteSwing();
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
            SFX.archerShoot();
            [-0.5,0,0.5].forEach((yo,i)=>{
              setTimeout(()=>{
                if(gs.screen!=='playing') return;
                projs.push({x:e.x+(e.facing>0?def.w:0), y:e.y+def.h/2-FB_H/2,
                  vx:shotVX, vy:yo, row:e.row, dmg:def.dmg*0.7,
                  owner:'enemy', spr:SPR_FB, w:FB_W, h:FB_H, life:260});
              }, i*110);
            });
          } else {
            SFX.gruntShoot();
            projs.push({x:e.x+(e.facing>0?def.w:0), y:e.y+def.h/2-FB_H/2,
              vx:shotVX, vy:0, row:e.row, dmg:def.dmg,
              owner:'enemy', spr:SPR_FB, w:FB_W, h:FB_H, life:260});
          }
        }
      }

      // melee touch — ONLY hurts player, never damages enemy
      if(e.row===PL.row && ov(ehb(e), PL.hb)){
        SFX.gruntMelee();
        hurtPlayer(def.dmg, false);
      }
    });

    enemies = enemies.filter(e=>e.hp>0 && e.x>-80 && e.x<W+120);

    // ─── friend ally ─────────────────────────────────────────────────────────
    const apocE = enemies.find(e => e.type === 'apocalyptic');
    if (apocE && !gs.friendTriggered && apocE.phase === 'charge') {
      if (apocE.hp <= apocE.maxHp * 0.5) {
        gs.friendTriggered = true;
        // Enter from right side
        friendAlly = { x: W + FRIEND_W + 10, y: ROW_Y[0], row: 0, targetRow: 0,
          state: 'entering', runFrame: 0, throwFrame: 0, frameTimer: 0,
          throwTimer: CFG.friendThrowRate, targetX: W - 140,
          facing: -1,  // starts running left
          wanderT: 0 };
        msg = '✦ A FRIEND ARRIVES! ✦'; msgT = 160;
        burst(W - 60, ROW_Y[0] + FRIEND_H/2, '#ff9900', 24, 7);
      }
    }

    if (friendAlly && apocE) {
      const fa = friendAlly;
      fa.frameTimer++;

      const apocCX = apocE.x + APOC_W / 2;

      // Rows where a thrown cocktail will actually land on Apoc's hitbox
      const apocHitTop = apocE.y + 8;
      const apocHitBot = apocE.y + APOC_H - 16;
      const validRows = [];
      for (let r = 0; r < ROWS; r++) {
        const ckY    = ROW_Y[r] + FRIEND_H * 0.28;
        const ckBot  = ckY + TIKI_H;
        if (ckBot > apocHitTop && ckY < apocHitBot) validRows.push(r);
      }
      const safeValidRows = validRows.length > 0 ? validRows : [apocE.row];

      // Ensure targetRow is always inside a valid row; re-anchor if it drifted out
      if (fa.targetRow === undefined || !safeValidRows.includes(fa.targetRow)) {
        // Pick the valid row closest to the current one
        fa.targetRow = safeValidRows.reduce((best, r) =>
          Math.abs(r - (fa.targetRow ?? apocE.row)) < Math.abs(best - (fa.targetRow ?? apocE.row)) ? r : best
        , safeValidRows[0]);
      }

      // Smoothly slide y toward target row
      fa.y += (ROW_Y[fa.targetRow] - fa.y) * 0.08;
      fa.row = fa.targetRow;

      if (fa.state === 'entering') {
        // Run left onto screen toward initial position
        fa.x -= 3.5;
        fa.facing = -1;
        if (fa.frameTimer % 8 === 0) fa.runFrame = (fa.runFrame + 1) % 4;
        if (fa.x <= fa.targetX) { fa.x = fa.targetX; fa.state = 'idle'; fa.wanderT = 80; }

      } else if (fa.state === 'idle') {
        // Move toward current targetX (wander)
        const dx = fa.targetX - fa.x;
        if (Math.abs(dx) > 4) {
          const spd = 2.8;
          fa.x += dx > 0 ? spd : -spd;
          fa.facing = dx > 0 ? 1 : -1;           // face direction of movement
          if (fa.frameTimer % 8 === 0) fa.runFrame = (fa.runFrame + 1) % 4;
        } else {
          fa.x = fa.targetX;
          fa.facing = apocCX < fa.x ? -1 : 1;   // face the boss while standing
          if (fa.frameTimer % 28 === 0) fa.runFrame = (fa.runFrame + 1) % 4;
          // Periodically pick a new random wander position
          fa.wanderT--;
          if (fa.wanderT <= 0) {
            // Stay on the opposite side of the screen from Apoc when possible
            const apocOnLeft = apocCX < W / 2;
            const minX = apocOnLeft ? Math.round(W * 0.55) : 50;
            const maxX = apocOnLeft ? W - 50 : Math.round(W * 0.45);
            fa.targetX = minX + Math.random() * (maxX - minX);
            fa.wanderT = 70 + Math.random() * 60 | 0;
          }
        }
        fa.throwTimer--;
        if (fa.throwTimer <= 0) {
          const throwFacing = apocCX < fa.x ? -1 : 1;
          // Check line-of-sight: any obstacle in this row between friend and boss?
          const throwMinX = Math.min(fa.x, apocCX);
          const throwMaxX = Math.max(fa.x, apocCX);
          const blocked = obstacles.some(o =>
            o.row === fa.row && o.x < throwMaxX && o.x + o.w > throwMinX
          );
          if (!blocked) {
            fa.facing = throwFacing;
            fa.state = 'throwing'; fa.throwFrame = 0; fa.frameTimer = 0;
            // timer reset happens when throw ENDS so idle wait = exactly friendThrowRate frames
          } else {
            // Obstacle in the way — try a different valid row with a clear shot
            const throwMinX = Math.min(fa.x, apocCX);
            const throwMaxX = Math.max(fa.x, apocCX);
            const clearRows = [];
            for (const r of safeValidRows) {
              if (!obstacles.some(o => o.row === r && o.x < throwMaxX && o.x + o.w > throwMinX)) {
                clearRows.push(r);
              }
            }
            if (clearRows.length > 0) {
              // Switch to a clear row immediately
              fa.targetRow = clearRows[Math.floor(Math.random() * clearRows.length)];
              fa.throwTimer = 30; // short wait to finish sliding to new row
            } else {
              // All rows blocked — reposition x and try again soon
              const apocOnLeft = apocCX < W / 2;
              fa.targetX = apocOnLeft
                ? Math.round(W * 0.55) + Math.random() * (W * 0.35)
                : 50 + Math.random() * (W * 0.35);
              fa.wanderT = 20 + Math.random() * 20 | 0;
              fa.throwTimer = 40;
            }
          }
        }

      } else if (fa.state === 'throwing') {
        if (fa.frameTimer % 7 === 0) {
          fa.throwFrame++;
          // Frame 2 = arm fully extended = launch
          if (fa.throwFrame === 2) {
            const dmg = apocE.maxHp * (CFG.friendCocktailDmgPct / 100);
            const throwDW = FR_THR_DW[2];
            // Facing left → arm exits on the left side of the sprite (flipX anchor = fa.x)
            // Facing right → arm exits on the right side (fa.x + throwDW)
            const ckX = fa.facing < 0 ? fa.x - TIKI_W : fa.x + throwDW;
            const ckY = fa.y + FRIEND_H * 0.28;
            projs.push({
              x: ckX, y: ckY, vx: fa.facing < 0 ? -7 : 7, vy: 0,
              row: fa.row, dmg, owner: 'friend', isTiki: true,
              tkFrame: 0, tkTimer: 0, tkBreaking: false, tkBreakTimer: 0,
              w: TIKI_W, h: TIKI_H, life: 500
            });
          }
          if (fa.throwFrame >= 4) {
            fa.throwFrame = 0; fa.state = 'idle'; fa.frameTimer = 0;
            fa.throwTimer = CFG.friendThrowRate; // reset 3s countdown after throw completes
            // Pick new wander target after throw
            fa.targetX = 60 + Math.random() * (W - 180);
            fa.wanderT = 40 + Math.random() * 40 | 0;
          }
        }
      }

    } else if (friendAlly && !apocE && enemies.length > 0) {
      // Apoc dead but minions remain — throw at nearest enemy, track its row
      const fa = friendAlly;
      fa.frameTimer++;

      // Find closest enemy as the throw target
      let minionTarget = enemies[0];
      for (const en of enemies) {
        if (Math.abs(en.x - fa.x) < Math.abs(minionTarget.x - fa.x)) minionTarget = en;
      }
      const minionCX = minionTarget.x + ENEMY_TYPES[minionTarget.type].w / 2;

      // Stay in the target's row
      fa.targetRow = minionTarget.row;
      fa.y += (ROW_Y[fa.targetRow] - fa.y) * 0.08;
      fa.row = fa.targetRow;

      if (fa.state === 'throwing') {
        if (fa.frameTimer % 7 === 0) {
          fa.throwFrame++;
          if (fa.throwFrame === 2) {
            // Deal 40% of the minion's actual HP per throw
            const dmg = minionTarget.maxHp * (CFG.friendMinionDmgPct / 100);
            const throwDW = FR_THR_DW[2];
            const ckX = fa.facing < 0 ? fa.x - TIKI_W : fa.x + throwDW;
            const ckY = fa.y + FRIEND_H * 0.28;
            projs.push({
              x: ckX, y: ckY, vx: fa.facing < 0 ? -7 : 7, vy: 0,
              row: fa.row, dmg, owner: 'friend', isTiki: true, isTikiMinion: true,
              tkFrame: 0, tkTimer: 0, tkBreaking: false, tkBreakTimer: 0,
              w: TIKI_W, h: TIKI_H, life: 500
            });
          }
          if (fa.throwFrame >= 4) {
            fa.throwFrame = 0; fa.state = 'idle'; fa.frameTimer = 0;
            fa.throwTimer = CFG.friendThrowRate;
          }
        }
      } else {
        fa.state = 'idle';
        const dx = fa.targetX - fa.x;
        if (Math.abs(dx) > 4) {
          fa.x += dx > 0 ? 2.8 : -2.8;
          fa.facing = dx > 0 ? 1 : -1;
          if (fa.frameTimer % 8 === 0) fa.runFrame = (fa.runFrame + 1) % 4;
        } else {
          fa.x = fa.targetX;
          fa.facing = minionCX < fa.x ? -1 : 1;
          if (fa.frameTimer % 28 === 0) fa.runFrame = (fa.runFrame + 1) % 4;
        }
        fa.wanderT--;
        if (fa.wanderT <= 0) {
          fa.targetX = 60 + Math.random() * (W - 180);
          fa.wanderT = 60 + Math.random() * 40 | 0;
        }
        fa.throwTimer--;
        if (fa.throwTimer <= 0) {
          const mThrowFacing = minionCX < fa.x ? -1 : 1;
          const mThrowMinX = Math.min(fa.x, minionCX);
          const mThrowMaxX = Math.max(fa.x, minionCX);
          const mBlocked = obstacles.some(o =>
            o.row === fa.row && o.x < mThrowMaxX && o.x + o.w > mThrowMinX
          );
          if (!mBlocked) {
            fa.facing = mThrowFacing;
            fa.state = 'throwing'; fa.throwFrame = 0; fa.frameTimer = 0;
          } else {
            // Blocked — try a different row that has a clear shot in this x range
            const mClearRows = [];
            for (let r = 0; r < ROWS; r++) {
              if (!obstacles.some(o => o.row === r && o.x < mThrowMaxX && o.x + o.w > mThrowMinX)) {
                mClearRows.push(r);
              }
            }
            if (mClearRows.length > 0) {
              fa.targetRow = mClearRows[Math.floor(Math.random() * mClearRows.length)];
              fa.throwTimer = 30;
            } else {
              // All rows blocked — reposition x
              fa.targetX = 60 + Math.random() * (W - 180);
              fa.wanderT = 20 + Math.random() * 20 | 0;
              fa.throwTimer = 40;
            }
          }
        }
      }
    } else if (friendAlly && !apocE && enemies.length === 0) {
      // All enemies cleared — friend runs off to the right
      const fa = friendAlly;
      fa.facing = 1;
      fa.x += 4;
      if (fa.frameTimer % 8 === 0) fa.runFrame = (fa.runFrame + 1) % 4;
      fa.frameTimer++;
      if (fa.x > W + FRIEND_W + 20) friendAlly = null;
    }

    // projectiles
    projs.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.life--;

      // Tiki cocktail — friend ally projectile
      if (p.isTiki) {
        // Animate spin frames
        p.tkTimer++;
        if (p.tkTimer % 5 === 0) p.tkFrame = (p.tkFrame + 1) % 8;
        if (p.tkBreaking) {
          p.tkBreakTimer++;
          if (p.tkBreakTimer > 20) p.life = 0;
          return; // no movement while breaking
        }
        // Check hit vs Apoc (priority) or any enemy for minion-phase tikis
        const apocTarget = enemies.find(e => e.type === 'apocalyptic' && e.phase === 'charge');
        if (apocTarget) {
          const hitbox = { x: apocTarget.x + 10, y: apocTarget.y + 8,
                           w: APOC_W - 20, h: APOC_H - 16 };
          if (ov({ x: p.x, y: p.y, w: p.w, h: p.h }, hitbox)) {
            hitEnemy(apocTarget, p.dmg);
            burst(p.x + p.w/2, p.y + p.h/2, '#cc4400', 16, 5);
            p.tkBreaking = true; p.vx = 0; p.vy = 0;
            p.x -= TIKI_W / 2; p.y -= TIKI_H / 2;
          }
        } else if (p.isTikiMinion) {
          // Post-Apoc: hit any enemy in the same row
          for (const e of enemies) {
            if (e.phase !== 'charge') continue;
            if (ov({ x: p.x, y: p.y, w: p.w, h: p.h }, ehb(e))) {
              hitEnemy(e, p.dmg);
              burst(p.x + p.w/2, p.y + p.h/2, '#ff8800', 14, 5);
              p.tkBreaking = true; p.vx = 0; p.vy = 0;
              p.x -= TIKI_W / 2; p.y -= TIKI_H / 2;
              break;
            }
          }
        }
        return; // skip regular projectile collision for tiki
      }

      if(p.owner==='player' && !p.axe){
        enemies.forEach(e=>{
          if(e.phase!=='charge') return;
          const def2 = ENEMY_TYPES[e.type];
          if(p.reflected){
            // Reflected projectiles hit by physical Y overlap — no row restriction,
            // so they hit the first enemy they actually pass through.
            const hitbox = def2.isBoss ? {x:e.x+10,y:e.y+8,w:def2.w-20,h:def2.h-16} : ehb(e);
            if(ov({x:p.x,y:p.y,w:p.w,h:p.h}, hitbox)){
              hitEnemy(e,p.dmg); burst(p.x,p.y,FO,10);
              p.life=0; // stop on first hit
            }
            return;
          }
          // Bosses can be hit from any row; normal enemies same-row only
          if(!def2.isBoss){
            if(Math.abs(e.row - p.row) > 0) return;
          }
          const hitbox = def2.isBoss
            ? {x:e.x+10, y:e.y+8, w:def2.w-20, h:def2.h-16}
            : ehb(e);
          if(ov({x:p.x,y:p.y,w:p.w,h:p.h}, hitbox)){
            hitEnemy(e,p.dmg); burst(p.x,p.y,FO,10);
            if(!p.pierce) p.life=0;
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
          PL.mirrorActive=false; p.vx=-p.vx; p.owner='player'; p.dmg*=CFG.mirrorDmgMult;
          p.reflected=true; // bypass row restriction — hits first enemy it physically touches
          burst(PL.cx,PL.cy,'#aaddff',16,6);
          return;
        }
        if(hitRow===PL.row && ov({x:p.x,y:p.y,w:p.w,h:p.h}, PL.hb)){
          hurtPlayer(p.dmg, !!p.isBoss, p.shieldCost); p.life=0;
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
        SFX.pickup();
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
          setTimeout(()=>{ gs.screen='victory'; }, 3000);
        } else {
          setTimeout(()=>{ gs.screen='reward'; gs.rewardChoice=0; gs.rewardChoices=makeRewards(); }, 2800);
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
    // Car drives across at Wolfdragon's position; WD shown only after car has passed
    const carY = 290;
    const carOnScreen = SHEETS.CR && victoryCarX > -CAR_W - 10;
    if (carOnScreen) {
      if (victoryCarDelay > 0) { victoryCarDelay--; }
      else { victoryCarX -= 2.5; }
      drawSpr(SRECTS.CAR, victoryCarX, carY, CAR_W, CAR_H, false);
    } else {
      drawWDSprite(W/2 - WD_W/2, carY, false, false);
    }
    ctx.fillStyle='#888'; ctx.font='13px monospace';
    ctx.fillText(`FINAL SCORE: ${gs.score}`, W/2, 420);
    const blink = Math.floor(Date.now()/600)%2===0;
    ctx.fillStyle = blink ? '#ffcc00' : '#aa7700';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('Press W to Play Again', W/2, 455);
    ctx.textAlign='left';
  }

  // ─── item reward screen ───────────────────────────────────────────────────
  function drawItemReward(){
    ctx.fillStyle='rgba(0,0,0,0.92)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#aa44ff'; ctx.font='bold 22px monospace'; ctx.textAlign='center';
    ctx.fillText('✦  CHOOSE YOUR ITEM  ✦',W/2,65);
    ctx.fillStyle='#666'; ctx.font='13px monospace';
    ctx.fillText('← → navigate   S confirm   or press 1 / 2 / 3',W/2,90);
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

      // Clip all text to card bounds so nothing overflows
      ctx.save();
      ctx.beginPath(); ctx.rect(cx+1,cy+1,cardW-2,cardH-2); ctx.clip();

      ctx.fillStyle=sel?'#aa44ff':'#666'; ctx.font='bold 12px monospace'; ctx.textAlign='center';
      ctx.fillText(`[${i+1}]`,cx+cardW/2,cy+18);
      ctx.font='34px sans-serif'; ctx.fillText(item.icon,cx+cardW/2,cy+60);
      // Name — shrink font if too wide
      ctx.fillStyle=sel?'#ffffff':'#cccccc';
      ctx.font='bold 13px monospace';
      const nameFontSz = ctx.measureText(item.name).width > cardW-16 ? 10 : 13;
      ctx.font=`bold ${nameFontSz}px monospace`;
      ctx.fillText(item.name,cx+cardW/2,cy+86);
      // Stat desc lines
      ctx.fillStyle='#999'; ctx.font='10px monospace';
      item.desc.split('/').forEach((l,li)=>ctx.fillText(l.trim(),cx+cardW/2,cy+102+li*13));
      // Ability name
      ctx.fillStyle=sel?'#ffcc00':'#888'; ctx.font='bold 11px monospace';
      ctx.fillText('★ '+item.abilityName,cx+cardW/2,cy+140);
      // Ability desc — word-wrapped, clipped to bottom of card
      ctx.fillStyle='#777'; ctx.font='10px monospace';
      const maxW=cardW-16, cardBottom=cy+cardH-8;
      const words=item.abDesc.split(' '); let line='',ly=cy+156;
      words.forEach(w=>{
        const test=line ? line+' '+w : w;
        if(ctx.measureText(test).width>maxW){
          if(ly<=cardBottom) ctx.fillText(line.trim(),cx+cardW/2,ly);
          line=w; ly+=13;
        } else { line=test; }
      });
      if(line && ly<=cardBottom) ctx.fillText(line.trim(),cx+cardW/2,ly);

      ctx.restore();
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
    ctx.fillText('← → navigate   S confirm   or press 1 / 2 / 3',W/2,98);
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
      // Clip card contents
      ctx.save();
      ctx.beginPath(); ctx.rect(cx+1,cy+1,cardW-2,cardH-2); ctx.clip();

      // Label
      ctx.fillStyle=sel?'#ffffff':'#cccccc'; ctx.font=`bold 15px monospace`;
      ctx.fillText(r.label,cx+cardW/2,cy+102);
      // Desc — word-wrap each \n-separated chunk so nothing escapes the card
      ctx.fillStyle='#999'; ctx.font=`10px monospace`;
      const descMaxW = cardW - 20;
      let dy = cy + 122;
      r.desc.split('\n').forEach(chunk => {
        const words = chunk.split(' ');
        let line = '';
        words.forEach(w => {
          const test = line ? line + ' ' + w : w;
          if (ctx.measureText(test).width > descMaxW && line) {
            ctx.fillText(line, cx+cardW/2, dy); dy += 13; line = w;
          } else { line = test; }
        });
        if (line) { ctx.fillText(line, cx+cardW/2, dy); dy += 13; }
      });

      ctx.restore();
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
    // Cheat mode badges
    if(godMode){
      const gp = 0.7 + Math.sin(Date.now()/180)*0.3;
      ctx.save(); ctx.globalAlpha = gp; ctx.fillStyle = '#ffe033';
      ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right';
      ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8;
      ctx.fillText('✦ BRYAN ✦', W - 4, 38);
      ctx.restore(); ctx.textAlign = 'left';
    }
    if(babyMode){
      const bp = 0.7 + Math.sin(Date.now()/200)*0.3;
      ctx.save(); ctx.globalAlpha = bp; ctx.fillStyle = '#88ddff';
      ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right';
      ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 8;
      ctx.fillText('🍼 BABY', W - 4, godMode ? 52 : 38);
      ctx.restore(); ctx.textAlign = 'left';
    }
    // (controls shown above the canvas in HTML)

    // Active item ability — drawn near player in drawPlayer(), nothing here

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

  // draw flameshield orbs orbiting the player
  function drawFlameshields(){
    flameshields.forEach(fs=>{
      const fx = PL.cx + Math.cos(fs.angle) * 40;
      const fy = ROW_Y[PL.row] + PL.h/2 + Math.sin(fs.angle) * 26;
      const p  = 0.8 + Math.sin(Date.now()/90)*0.2;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 12;
      ctx.fillStyle   = '#ff4400';
      ctx.beginPath(); ctx.arc(fx, fy, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle   = '#ffcc00';
      ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  function drawFriendAlly() {
    if (!friendAlly || !SHEETS.FR1) return;
    const fa = friendAlly;
    const flipX = (fa.facing || -1) < 0; // facing=-1 means left → flipX=true
    drawFriendSprite(fa.state, fa.runFrame, fa.throwFrame, flipX, fa.x, fa.y);
  }

  // ─── draw player ──────────────────────────────────────────────────────────
  function drawPlayer(){
    const wy = ROW_Y[PL.row];

    // Shield aura (behind player) + pip bar above head
    if(PL.sh){
      const t     = Date.now();
      const pulse = 0.55 + Math.sin(t / 80) * 0.45;
      const glowColor = PL.shBroken ? '#ff4400' : '#4499ff';
      const boltColor = PL.shBroken ? '#ff8844' : '#88ddff';
      const coreColor = PL.shBroken ? '#ffcc88' : '#ffffff';

      const ecx = PL.cx;
      const ecy = wy + PL.h * 0.5;
      const erx = PL.w * 0.72;
      const ery = PL.h * 0.62;

      // Lightning crackle helper — draws a jagged ellipse with per-frame jitter
      const drawCrackle = (rxOff, ryOff, jAmt, lw, color, alpha) => {
        const N = 36;
        // Seed changes ~12× per second so it "crackles" without being too jittery
        const seed = Math.floor(t / 85) * 6271 + Math.round(rxOff * 100);
        const jr = i => { let v=(seed+i*2654435761)|0; v=((v>>>16)^v)*0x45d9f3b|0; return ((v>>>16)^v&0xffff)/0xffff - 0.5; };
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur  = lw * 3;
        ctx.lineWidth   = lw;
        ctx.beginPath();
        for(let i = 0; i <= N; i++){
          const a  = (i / N) * Math.PI * 2;
          const jx = jr(i * 2)     * jAmt;
          const jy = jr(i * 2 + 1) * jAmt * 0.7;
          const px = ecx + Math.cos(a) * (erx + rxOff + jx);
          const py = ecy + Math.sin(a) * (ery + ryOff + jy);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      };

      // Outer corona — wide, heavy jitter, translucent
      drawCrackle(12, 10, 9, 8,  boltColor, pulse * 0.40);
      // Mid arc — medium jitter
      drawCrackle(4,  3,  5, 3,  boltColor, pulse * 0.70);
      // Inner core — tight, bright
      drawCrackle(0,  0,  2, 1.2,coreColor, pulse * 0.90);

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
    // Holy Barrier: player never blinks invisible — draw golden divine aura instead
    if(PL.holyBarrierT > 0){
      const t   = Date.now();
      const ecx = PL.cx;
      const ecy = wy + PL.h * 0.5;
      // Pulse: faster flicker near expiry
      const flickerRate = PL.holyBarrierT < 60 ? 60 : 120;
      const pulse = 0.6 + Math.sin(t / flickerRate * Math.PI) * 0.4;

      // Outer radiant ring
      ctx.save();
      ctx.globalAlpha = pulse * 0.55;
      ctx.strokeStyle = '#ffe066';
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur  = 22;
      ctx.lineWidth   = 5;
      ctx.beginPath();
      ctx.ellipse(ecx, ecy, PL.w * 0.78, PL.h * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Inner golden glow fill
      ctx.save();
      ctx.globalAlpha = pulse * 0.18;
      const grad = ctx.createRadialGradient(ecx, ecy, 4, ecx, ecy, PL.w * 0.78);
      grad.addColorStop(0,   '#ffffff');
      grad.addColorStop(0.4, '#ffe566');
      grad.addColorStop(1,   'rgba(255,200,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(ecx, ecy, PL.w * 0.78, PL.h * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Radiating star points (8 spikes)
      const spikes = 8;
      const angOff = (t / 1800) % (Math.PI * 2); // slow rotate
      ctx.save();
      ctx.globalAlpha = pulse * 0.70;
      ctx.strokeStyle = '#fff5aa';
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur  = 14;
      ctx.lineWidth   = 1.8;
      for(let i = 0; i < spikes; i++){
        const a   = angOff + (i / spikes) * Math.PI * 2;
        const r0  = PL.w * 0.82;
        const r1  = PL.w * 0.82 + 14 + Math.sin(t / 90 + i) * 5;
        ctx.beginPath();
        ctx.moveTo(ecx + Math.cos(a) * r0 * 0.5, ecy + Math.sin(a) * r0 * 0.4);
        ctx.lineTo(ecx + Math.cos(a) * r1 * 0.82, ecy + Math.sin(a) * r1 * 0.60);
        ctx.stroke();
      }
      ctx.restore();

      // Bright inner cross-flash
      const crossAlpha = pulse * 0.35;
      ctx.save();
      ctx.globalAlpha = crossAlpha;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#fffabb';
      ctx.shadowBlur  = 18;
      ctx.lineWidth   = 2.5;
      ctx.beginPath(); ctx.moveTo(ecx - 22, ecy); ctx.lineTo(ecx + 22, ecy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ecx, ecy - 28); ctx.lineTo(ecx, ecy + 28); ctx.stroke();
      ctx.restore();

      // Draw player (never invisible during Holy Barrier)
      drawWDSprite(PL.x, wy, PL.facing < 0, PL.atk);

      // "DIVINE SHIELD" label above when > half duration
      if(PL.holyBarrierT > 90){
        const labelAlpha = Math.min(1, (PL.holyBarrierT - 90) / 30);
        ctx.save();
        ctx.globalAlpha = labelAlpha * pulse * 0.9;
        ctx.font = 'bold 11px "Metal Mania", serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffe566';
        ctx.shadowColor = '#aa8800';
        ctx.shadowBlur  = 8;
        ctx.fillText('✦ DIVINE SHIELD ✦', ecx, wy - 24);
        ctx.restore();
      }
      // still fall through to draw the slash arc below
    } else {
    // Normal damage iframes: blink invisible
    if(PL.iframes>0 && Math.floor(PL.iframes/4)%2===0) return;
    drawWDSprite(PL.x, wy, PL.facing < 0, PL.atk);
    }

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

    // Active ability cooldown bar — horizontal bar below player feet
    if(gs.activeItem){
      const cdFrac  = PL.itemCd / Math.max(1, PL.itemCdMax);
      const ready   = PL.itemCd === 0;
      const barW    = 72;
      const barH    = 5;
      const barX    = PL.cx - barW / 2;
      const barY    = wy + PL.h + 6;
      ctx.save();
      // BG track
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(barX, barY, barW, barH);
      // Fill (orange while recharging, gold when ready)
      const fillW = ready ? barW : (1 - cdFrac) * barW;
      if(ready){ ctx.shadowColor='#ffcc00'; ctx.shadowBlur=8; }
      ctx.fillStyle = ready ? '#ffcc00' : '#ff7700';
      ctx.fillRect(barX, barY, fillW, barH);
      ctx.shadowBlur = 0;
      // "SP" label to the left
      ctx.fillStyle   = ready ? '#ffcc00' : '#ff9933';
      ctx.font        = 'bold 7px monospace';
      ctx.textAlign   = 'right';
      ctx.fillText('SP', barX - 3, barY + barH);
      // Time text
      ctx.textAlign   = 'center';
      ctx.fillStyle   = ready ? '#ffcc00' : '#aaaaaa';
      ctx.font        = 'bold 7px monospace';
      ctx.fillText(ready ? 'READY' : Math.ceil(PL.itemCd / 60) + 's', PL.cx, barY + barH + 9);
      // Ability name
      const shortName = gs.activeItem.abilityName.split(' ')[0];
      ctx.fillStyle   = '#666';
      ctx.font        = '7px monospace';
      ctx.fillText('[S] ' + shortName, PL.cx, barY + barH + 17);
      ctx.textAlign   = 'left';
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
        ctx.strokeRect(e.diveX - 10, ry, def.w + 20, def.h);
        ctx.setLineDash([]);
        ctx.fillStyle = '#ff3300';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', e.diveX + def.w/2, ry - 8);
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
    projs.forEach(p=>{
      if(p.isTiki) { drawTikiProj(p); return; }
      if(p.pierce){
        // Void Ball: glowing purple sphere that pierces enemies
        const cx = p.x + p.w/2, cy = p.y + p.h/2, r = p.w * 0.55;
        const pulse = 0.75 + Math.sin(Date.now()/80) * 0.25;
        const grd = ctx.createRadialGradient(cx,cy,r*0.1,cx,cy,r);
        grd.addColorStop(0,'rgba(220,140,255,'+pulse+')');
        grd.addColorStop(0.4,'rgba(150,0,255,'+pulse*0.85+')');
        grd.addColorStop(1,'rgba(60,0,120,0)');
        ctx.save();
        ctx.shadowColor='#cc00ff'; ctx.shadowBlur=18;
        ctx.fillStyle=grd;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
        ctx.restore();
      } else if(p.axe){
        // Cleave axe: spinning axe head flying across the row
        p.spin = (p.spin||0) + 0.38 * p.spinDir;
        const cx = p.x + p.w/2, cy = p.y + p.h/2;
        const fade = Math.min(1, p.life / 12); // fade out near end
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(cx, cy);
        ctx.rotate(p.spin);
        ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 14;
        // Axe head (crescent blade)
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.arc(0, 0, 15, -0.9, Math.PI + 0.9); // outer arc
        ctx.arc(0, 0, 7,  Math.PI + 0.9, -0.9, true); // inner cutout
        ctx.closePath(); ctx.fill();
        // Bright edge highlight
        ctx.strokeStyle = '#ffdd88'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 14, -0.8, Math.PI + 0.8); ctx.stroke();
        // Handle
        ctx.fillStyle = '#7a3a00';
        ctx.fillRect(-3, 4, 6, 16);
        // Handle grip wrap
        ctx.fillStyle = '#4a2000';
        ctx.fillRect(-3, 10, 6, 3);
        ctx.restore();
      } else {
        spr(p.spr,p.x,p.y,SC2,p.owner==='enemy');
      }
    });
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
      hp:CFG.playerHp,maxHp:CFG.playerHp,spellUses:3,maxSpell:3,spellUpgrades:0,rewardChoice:0,
      itemTier:0,activeItem:null,rewardItemChoices:[],rewardItemChoice:0,
      shieldPipUpgrades:0,rewardChoices:null,
      friendTriggered:false});
    PL.x=70; PL.row=0; PL.facing=1;
    PL.atkTimer=0; PL.shTimer=0; PL.iframes=0;
    PL.weapon.dmg=CFG.weaponDmg; PL.atkRange=CFG.atkRange;
    PL.spell.dmg=CFG.spellDmg;
    PL.speed=CFG.playerSpeed;
    PL.shMaxHp=CFG.shMaxHp; PL.shHp=CFG.shMaxHp;
    PL.itemAbility=null; PL.itemCd=0; PL.itemCdMax=0;
    PL.shBroken=false; PL.shHp=PL.shMaxHp; PL.soulDrainActive=false; PL.deathMarkActive=false;
    PL.mirrorActive=false; PL.thornActive=false; PL.explodeShieldActive=false;
    PL.bloodlustT=0; PL.holyBarrierT=0;
    godMode=false; babyMode=false; godCheatBuf=''; deact67Buf=''; godCheatDeadline = performance.now() + 10000;
    reloadCFG('wolfdragon_config'); // restore normal config (in case baby mode was active)
    enemies=[]; projs=[]; parts=[]; drops=[]; obstacles=[]; flameshields=[]; bgOff=0;
    webZones=[]; shockwaves=[]; darknessT=0;
    PL.webbed=0;
    friendAlly = null;
    victoryCarX = W + 20;  // just off right edge — appears within ~0.1s
    victoryCarDelay = 0;   // no delay
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
      drawPlayer(); drawFriendAlly(); drawParts(); drawHUD(); drawReward();
      if(darknessT>0){ darknessT--; const dA=Math.min(darknessT+1,30)/30*0.82; ctx.fillStyle=`rgba(0,0,5,${dA})`; ctx.fillRect(0,0,W,H); }
    } else if(gs.screen==='itemreward'){
      update();
      drawBG(); drawWebZones(); drawShockwaves(); drawItemReward();
      if(darknessT>0){ darknessT--; const dA=Math.min(darknessT+1,30)/30*0.82; ctx.fillStyle=`rgba(0,0,5,${dA})`; ctx.fillRect(0,0,W,H); }
    } else if(gs.screen==='victory'){
      drawBG(); drawVictory();
      if(eat('KeyW')||eat('Space')) reset();
    } else {
      update();
      drawBG(); drawWebZones(); drawObstacles(); drawDrops(); drawEnemies(); drawShockwaves(); drawProjs();
      drawFlameshields(); drawPlayer(); drawFriendAlly(); drawParts(); drawWaveMsg(); drawHUD();
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
