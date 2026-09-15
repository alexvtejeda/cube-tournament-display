/**
 * hero-maze3d.js — TRUE 3D maze-FLOOR hero background (three.js / WebGL).
 *
 * The visual centerpiece of the CTF Interuniversitario hero, rebuilt on the
 * GPU. Renders into #hero-canvas a procedurally generated "perfect" maze laid
 * flat on the XZ ground plane, viewed by a LOW, angled camera so the maze
 * recedes toward a glowing horizon (synthwave-floor framing). Small emissive
 * spheres (the competitors) genuinely PATHFIND (BFS over the maze graph)
 * through the corridors toward glowing gold FLAG pillars. When a ball
 * captures the flag a bright capture pulse fires, the ball RESPAWNS at a
 * random start cell, and over time MORE balls are added (up to BALL_CAP).
 * The maze itself is NEVER reset (only rebuilds on resize).
 *
 *   • Maze: randomized recursive-backtracker (DFS) → one unique path per cell.
 *   • Pathfinding: BFS from each ball's start cell to its target flag cell.
 *   • Render: thin extruded neon wall boxes (emissive violet) standing on a
 *     dark floor; exponential fog (near --bg-deep) fades the far maze into the
 *     horizon — sells "endless," keeps it DIM, and saves GPU.
 *   • Balls: emissive spheres (gold/red/violet/cyan) + soft contact shadow,
 *     eased motion between cells; flags are emissive gold pillars + halos.
 *   • Multiple flags spread across X; each ball randomly targets one so paths
 *     visibly diverge across the maze width.
 *
 * Performance & accessibility guards (REQUIRED — mirror hero-maze.js):
 *   • prefers-reduced-motion: render ONE static frame (maze + balls placed +
 *     flag) — NO rAF loop.
 *   • Pause the loop when document.hidden OR #hero-canvas is off-screen (IO).
 *   • Cap pixelRatio at 1.5 (ambient bg — plenty), debounced resize.
 *   • Static maze geometry built ONCE per regen (merged into a couple of
 *     meshes); only balls/flag/pulse update per frame.
 *   • Guards a missing canvas / missing WebGL — falls back to CSS ambiance,
 *     never throws.
 *
 * Fallbacks (swap the <script> src in index.html to revert):
 *   • hero-maze.js — the original 2D-canvas maze.
 *   • hero3d.js    — the synthwave perspective grid.
 */

import * as THREE from '../vendor/three.module.js';

const canvas = document.getElementById('hero-canvas');
const hero = document.getElementById('inicio');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Detect WebGL availability up front; bail gracefully to CSS ambiance. */
function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
}

if (canvas && webglOK()) {
  init();
}

function init() {
  /* Mark the hero so CSS can hide the static .hero__grid while the maze runs. */
  if (hero) hero.classList.add('hero--maze');

  /* ── Brand palette ── */
  const COL = {
    bgDeep: 0x050414,
    wall: 0x7c5cff,        // --violet
    wallEmissive: 0x5b3ff0,
    floor: 0x0b0826,       // --bg
    flag: 0xffb81c,        // --gold
    horizon: 0x7c5cff,
  };
  const BALL_COLORS = [0xffb81c /*gold*/, 0xee2737 /*red*/, 0x9c8cff /*violet*/, 0x38f0ff /*cyan*/];

  /* ── Ball lifecycle constants ── */
  const BALL_CAP = 14;        // max simultaneous balls
  let nextColorIdx = 0;       // cycles through BALL_COLORS

  /* ── Maze constants ── */
  // Wall bitmask per cell: 1=N open, 2=E open, 4=S open, 8=W open.
  const N = 1, E = 2, S = 4, WST = 8;
  const DX = { [N]: 0, [E]: 1, [S]: 0, [WST]: -1 };
  const DZ = { [N]: -1, [E]: 0, [S]: 1, [WST]: 0 };
  const OPP = { [N]: S, [E]: WST, [S]: N, [WST]: E };

  let GRID_C = 22;   // columns (X) — set in layoutGrid() to fill full width
  let GRID_R = 26;   // rows (Z, depth toward horizon)
  const CELL = 2.2;  // world units per cell
  const WALL_H = 0.60;  // wall height — balls still visible above
  const WALL_T = 0.32;  // wall thickness

  /* ── Flag placement — explicit world [x, z] coordinates ──
   * Defined in WORLD space (not grid fractions) so a flag lands where intended
   * regardless of depth: near-camera rows only show a narrow central X band, so
   * grid-fraction placement would push near flags off-screen. x≈0 is centre,
   * negative z is deeper (toward the horizon). Snapped to the nearest cell for
   * pathfinding; world position is preserved across any GRID_C. */
  // Positions chosen so the waving CLOTH (≈3.5 units up the pole) lands on the
  // intended screen spot — not the pole base.
  const FLAG_POS = [
    [-45, -50],   // deep-left, near horizon   (point light)
    [ 26, -40],   // mid-right                 (point light)
  ];
  /* Mobile/portrait gets a narrow FOV, so the desktop flags above (|x| up to 45)
   * fall outside the frame. On portrait we show ONLY these two flags (not the
   * desktop set) — positioned far apart on opposite edges, low on screen. */
  const FLAG_POS_MOBILE = [
    [-13,  -30],   // far lower-left
    [ 13,  -30],   // far lower-right
  ];
  let flagCells = [];    // array of { c, r }
  let flagGroups = [];   // array of THREE.Group

  /* ── Three.js core ── */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0); // transparent — CSS radial bg shows through
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  // Exponential fog fades the distant maze into the horizon (dim + endless + cheap).
  scene.fog = new THREE.FogExp2(COL.bgDeep, 0.028);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);

  /* Lights — kept low; the look is carried by emissive materials + fog. */
  const ambient = new THREE.AmbientLight(0x3a2f6e, 0.55);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0x8f7bff, 0.35);
  key.position.set(-6, 14, 10);
  scene.add(key);

  /* ── Shared geometry / materials (created once, reused across regens) ── */
  const wallMat = new THREE.MeshStandardMaterial({
    color: COL.wall,
    emissive: COL.wallEmissive,
    emissiveIntensity: 0.15,   // dim — wider maze, keep text dominant
    roughness: 0.55,
    metalness: 0.1,
    fog: true,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: COL.floor,
    emissive: 0x0a0820,
    emissiveIntensity: 0.25,
    roughness: 0.95,
    metalness: 0.0,
    fog: true,
  });
  const wallBoxGeo = new THREE.BoxGeometry(1, 1, 1); // unit box, scaled per wall

  /* Containers we can swap on regen. */
  let wallMesh = null;       // THREE.InstancedMesh of walls
  let floorMesh = null;
  let horizonMesh = null;

  /* World state */
  let maze = null;
  let balls = [];
  let pulses = [];        // array of { age, alive, fc }
  let pulseMeshPool = []; // reusable pulse meshes
  let drift = 0;          // slow floor drift phase
  let portrait = false;   // true when the hero is portrait (mobile) — set in layoutGrid

  /* ── World <-> grid coordinate helpers ──
   * Grid cell (c, r) center maps to world (x, z). The maze is centered on X,
   * and extends in -Z (away from camera toward the horizon). r=0 is FAR. */
  function worldX(c) { return (c - (GRID_C - 1) / 2) * CELL; }
  function worldZ(r) { return -(GRID_R - 1 - r) * CELL; } // r=GRID_R-1 is nearest (z~0)

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randint(n) { return (Math.random() * n) | 0; }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = randint(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ── Maze generation: recursive backtracker (iterative) ── */
  function genMaze(c, r) {
    const cells = new Uint8Array(c * r);
    const visited = new Uint8Array(c * r);
    const idx = (x, y) => y * c + x;
    const stack = [];
    let cx = randint(c), cy = randint(r);
    visited[idx(cx, cy)] = 1;
    stack.push([cx, cy]);
    const dirs = [N, E, S, WST];
    while (stack.length) {
      [cx, cy] = stack[stack.length - 1];
      const opts = [];
      for (const d of dirs) {
        const nx = cx + DX[d], ny = cy + DZ[d];
        if (nx >= 0 && nx < c && ny >= 0 && ny < r && !visited[idx(nx, ny)]) opts.push(d);
      }
      if (opts.length === 0) { stack.pop(); continue; }
      const d = opts[randint(opts.length)];
      const nx = cx + DX[d], ny = cy + DZ[d];
      cells[idx(cx, cy)] |= d;
      cells[idx(nx, ny)] |= OPP[d];
      visited[idx(nx, ny)] = 1;
      stack.push([nx, ny]);
    }
    return { cells, cols: c, rows: r };
  }

  /* ── BFS pathfinding from start cell to target cell ── */
  function bfsPath(m, sc, sr, tc, tr) {
    const c = m.cols, r = m.rows;
    const idx = (x, y) => y * c + x;
    const prev = new Int32Array(c * r).fill(-1);
    const seen = new Uint8Array(c * r);
    const q = [idx(sc, sr)];
    seen[idx(sc, sr)] = 1;
    let head = 0;
    const target = idx(tc, tr);
    const dirs = [N, E, S, WST];
    while (head < q.length) {
      const cur = q[head++];
      if (cur === target) break;
      const cxx = cur % c, cyy = (cur / c) | 0;
      const open = m.cells[cur];
      for (const d of dirs) {
        if (!(open & d)) continue;
        const nx = cxx + DX[d], ny = cyy + DZ[d];
        if (nx < 0 || nx >= c || ny < 0 || ny >= r) continue;
        const ni = idx(nx, ny);
        if (seen[ni]) continue;
        seen[ni] = 1;
        prev[ni] = cur;
        q.push(ni);
      }
    }
    const path = [];
    if (!seen[target]) return path;
    let cur = target;
    while (cur !== -1) {
      path.push({ c: cur % c, r: (cur / c) | 0 });
      cur = prev[cur];
    }
    path.reverse();
    return path;
  }

  /* ── Build the static maze geometry (walls + floor) as instanced/merged
   *    meshes. Called once per regen — never per frame. ── */
  function buildMazeMeshes() {
    if (wallMesh) { scene.remove(wallMesh); wallMesh.geometry.dispose?.(); wallMesh = null; }
    if (floorMesh) { scene.remove(floorMesh); floorMesh.geometry.dispose(); floorMesh = null; }

    const m = maze;
    // Collect wall segments. A wall exists where a direction is NOT open.
    const segs = [];
    const pushWall = (x, z, sx, sz) => segs.push({ x, z, sx, sz });
    const nearZ = worldZ(GRID_R - 1) + CELL / 2;
    const farZ = worldZ(0) - CELL / 2;

    for (let r = 0; r < GRID_R; r++) {
      for (let c = 0; c < GRID_C; c++) {
        const open = m.cells[r * GRID_C + c];
        const cx = worldX(c), cz = worldZ(r);
        if (!(open & N)) pushWall(cx, cz - CELL / 2, CELL + WALL_T, WALL_T);
        if (!(open & WST)) pushWall(cx - CELL / 2, cz, WALL_T, CELL + WALL_T);
      }
    }
    // Right + south outer borders.
    for (let r = 0; r < GRID_R; r++) {
      const cz = worldZ(r);
      pushWall(worldX(GRID_C - 1) + CELL / 2, cz, WALL_T, CELL + WALL_T);
    }
    for (let c = 0; c < GRID_C; c++) {
      const cx = worldX(c);
      pushWall(cx, worldZ(GRID_R - 1) + CELL / 2, CELL + WALL_T, WALL_T);
    }

    // Build an InstancedMesh of all wall boxes.
    wallMesh = new THREE.InstancedMesh(wallBoxGeo, wallMat, segs.length);
    wallMesh.frustumCulled = false;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      dummy.position.set(s.x, WALL_H / 2, s.z);
      dummy.scale.set(s.sx, WALL_H, s.sz);
      dummy.updateMatrix();
      wallMesh.setMatrixAt(i, dummy.matrix);
    }
    wallMesh.instanceMatrix.needsUpdate = true;
    scene.add(wallMesh);

    // Floor plane — very wide and deep to eliminate any dark corner triangles.
    // We extend far beyond the maze bounds so the floor fills the entire frustum.
    const fW = 400;   // world units — much wider than any possible frustum extent
    const fD = GRID_R * CELL + CELL * 20;  // extend far beyond the far edge
    const floorGeo = new THREE.PlaneGeometry(fW, fD);
    floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    // Center the floor plane to cover from near to well behind the horizon.
    floorMesh.position.set(0, 0, (nearZ + farZ) / 2 - CELL * 10);
    scene.add(floorMesh);
  }

  /* ── Horizon glow plane (a soft gradient band far back) ── */
  function buildHorizon() {
    if (horizonMesh) return;
    const geo = new THREE.PlaneGeometry(220, 70);
    const cvs = document.createElement('canvas');
    cvs.width = 8; cvs.height = 256;
    const g = cvs.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0.0, 'rgba(0, 0, 0, 0.9)');
    grd.addColorStop(0.52, 'rgba(0, 0, 0, 0.9)');
    grd.addColorStop(0.66, 'rgba(0, 0, 0, 0.9)');
    grd.addColorStop(0.74, 'rgba(0, 0, 0, 0.9)');
    grd.addColorStop(0.82, 'rgba(0, 0, 0, 0.9)');
    grd.addColorStop(1.0, 'rgba(0, 0, 0, 0.9)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 8, 256);
    const tex = new THREE.CanvasTexture(cvs);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending, opacity: 0.7,
    });
    horizonMesh = new THREE.Mesh(geo, mat);
    horizonMesh.position.set(0, 6, worldZ(0) - 28);
    scene.add(horizonMesh);
  }

  /* ── Flag cloth geometry storage: one entry per flag ── */
  // Each entry: { geo: BufferGeometry, posArr: Float32Array, segsX, segsY }
  let flagCloths = [];

  /* ── Flags: scattered at varied depths + waving cloth on a pole ── */
  function buildFlags() {
    // Remove old flags and dispose cloth geometries.
    for (const fg of flagGroups) scene.remove(fg);
    flagGroups = [];
    flagCells = [];
    flagCloths = [];

    /* Flags scattered across depth + width via explicit world [x, z] (FLAG_POS).
     * Convert each world position to its nearest maze cell for BFS targeting:
     *   worldX(c) = (c - (GRID_C-1)/2) * CELL  ⇒  c = x/CELL + (GRID_C-1)/2
     *   worldZ(r) = -(GRID_R-1 - r) * CELL     ⇒  r = (GRID_R-1) + z/CELL
     * Cells are clamped to the grid so a flag never falls outside the maze. */
    // In portrait (mobile) show ONLY the two spread-apart mobile flags;
    // in landscape show the desktop set.
    const positions = portrait ? FLAG_POS_MOBILE : FLAG_POS;
    for (let fi = 0; fi < positions.length; fi++) {
      const [fx, fz] = positions[fi];
      const fc = Math.max(0, Math.min(GRID_C - 1, Math.round(fx / CELL + (GRID_C - 1) / 2)));
      const fr = Math.max(0, Math.min(GRID_R - 1, Math.round((GRID_R - 1) + fz / CELL)));
      flagCells.push({ c: fc, r: fr });

      const fg = new THREE.Group();

      /* Pole — thin dark-gold metal cylinder */
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 4.4, 10),
        new THREE.MeshStandardMaterial({
          color: 0xc8920a, emissive: 0x7a5500, emissiveIntensity: 0.5,
          roughness: 0.55, metalness: 0.6,
        })
      );
      pole.position.y = 2.2;
      fg.add(pole);

      /* Fix 2 — Flag cloth: subdivided plane that waves each frame.
       * Cloth dimensions: 1.4 wide × 0.85 tall, 12 × 8 segments.
       * Left edge (x=0) is attached to the pole top; right edge is free. */
      const CLOTH_W = 1.4, CLOTH_H = 0.85;
      const SEGS_X = 12, SEGS_Y = 8;
      const clothGeo = new THREE.PlaneGeometry(CLOTH_W, CLOTH_H, SEGS_X, SEGS_Y);
      // PlaneGeometry in XY plane centered at origin; we'll offset it so left
      // edge (x = -CLOTH_W/2) aligns with the pole.
      // Translate so left edge is at x=0 (pole center) and top is at y=0.
      // We'll position the cloth mesh at pole-top.
      const clothMat = new THREE.MeshStandardMaterial({
        color: COL.flag, emissive: COL.flag, emissiveIntensity: 0.55,
        roughness: 0.65, metalness: 0.0, side: THREE.DoubleSide,
      });
      const clothMesh = new THREE.Mesh(clothGeo, clothMat);
      // Move left edge to pole: shift +CLOTH_W/2 so left edge is at x=0.
      clothMesh.position.set(CLOTH_W / 2 + 0.09, 4.0 - CLOTH_H / 2, 0);
      fg.add(clothMesh);

      // Snapshot original positions for wave math reference.
      const posAttr = clothGeo.attributes.position;
      const posArr = new Float32Array(posAttr.array);  // baseline copy (flat)
      flagCloths.push({ geo: clothGeo, posArr, segsX: SEGS_X, segsY: SEGS_Y,
                        clothW: CLOTH_W, clothH: CLOTH_H });

      /* Subtle halo at flag top — kept modest so it doesn't overpower text.
       * Flags A (deep) and B (mid) are farther from the heading text so they
       * can have a bit more glow; Flag C (shallower) is dimmed further. */
      const haloBright = fi < 2 ? 0.55 : 0.35;
      const haloSize   = fi < 2 ? 5.5  : 4.0;
      const halo = makeGlowSprite(COL.flag, haloSize, haloBright);
      // Center the glow on the flag cloth (offset to +x from the pole),
      // not on the pole — so the halo blooms behind the flag itself.
      halo.position.set(CLOTH_W / 2 + 0.09, 4.0 - CLOTH_H / 2, 0);
      fg.add(halo);

      /* Modest point light — only flags A & B (deeper) get one;
       * Flag C (shallower, near text) skips it to avoid overpowering the text. */
      if (fi < 2) {
        const pl = new THREE.PointLight(COL.flag, 4.5, 12, 1.8);
        pl.position.set(CLOTH_W / 2 + 0.09, 3.6, 0);
        fg.add(pl);
      }

      fg.position.set(worldX(fc), 0, worldZ(fr));
      scene.add(fg);
      flagGroups.push(fg);
    }
  }

  /* ── Animate flag cloth vertices each frame (wave ripple) ── */
  function updateFlagCloths(now) {
    const t = now * 0.001; // seconds
    for (let fi = 0; fi < flagCloths.length; fi++) {
      const { geo, posArr, segsX, segsY, clothW } = flagCloths[fi];
      const posAttr = geo.attributes.position;
      const verts = posAttr.array;
      const cols = segsX + 1;
      const rows = segsY + 1;
      // Wave params — tuned for a gentle natural flag wave.
      const freq  = 2.8;   // spatial frequency (radians per unit width)
      const speed = 2.2;   // wave travel speed
      const amp   = 0.22;  // max displacement amplitude at free edge
      const yPhase = 0.9;  // secondary Y phase for vertical undulation

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const vi = (row * cols + col) * 3;
          // Baseline X position in cloth-local space (left=-CLOTH_W/2, right=+CLOTH_W/2)
          const baseX = posArr[vi];     // original X (flat geometry)
          // Normalized 0→1 along cloth width: 0 at left/pole edge, 1 at free edge.
          // posArr[vi] ranges -clothW/2 .. +clothW/2; remap to 0..1.
          const xNorm = (baseX + clothW / 2) / clothW;
          // Wave displacement: zero at pole (xNorm=0), grows to amp at free edge.
          const baseY = posArr[vi + 1]; // original Y
          // Z displacement (toward/away camera) = main wave.
          const zDisp = Math.sin(xNorm * freq + t * speed + row * yPhase * 0.25) * amp * xNorm;
          // Slight Y displacement for flutter.
          const yDisp = Math.sin(xNorm * freq * 0.7 + t * speed * 0.8 + col * 0.15) * amp * 0.18 * xNorm;
          verts[vi]     = baseX;          // X stays (left edge stays on pole)
          verts[vi + 1] = baseY + yDisp;
          verts[vi + 2] = posArr[vi + 2] + zDisp;
        }
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }

  /* ── Static wave for reduced-motion: freeze cloth at a fixed time offset ── */
  function freezeFlagCloths() {
    const t = 1.3; // arbitrary frozen phase
    for (let fi = 0; fi < flagCloths.length; fi++) {
      const { geo, posArr, segsX, segsY, clothW } = flagCloths[fi];
      const posAttr = geo.attributes.position;
      const verts = posAttr.array;
      const cols = segsX + 1;
      const rows = segsY + 1;
      const freq = 2.8, amp = 0.22, yPhase = 0.9;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const vi = (row * cols + col) * 3;
          const baseX = posArr[vi];
          const xNorm = (baseX + clothW / 2) / clothW;
          const baseY = posArr[vi + 1];
          const zDisp = Math.sin(xNorm * freq + t * 2.2 + row * yPhase * 0.25) * amp * xNorm;
          const yDisp = Math.sin(xNorm * freq * 0.7 + t * 1.76 + col * 0.15) * amp * 0.18 * xNorm;
          verts[vi]     = baseX;
          verts[vi + 1] = baseY + yDisp;
          verts[vi + 2] = posArr[vi + 2] + zDisp;
        }
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }

  /* Radial glow sprite (used for ball + flag bloom-ish glow). */
  const glowTexCache = {};
  function glowTexture() {
    if (glowTexCache.t) return glowTexCache.t;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = 128;
    const g = cvs.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    glowTexCache.t = new THREE.CanvasTexture(cvs);
    return glowTexCache.t;
  }
  function makeGlowSprite(color, size, opacity) {
    const mat = new THREE.SpriteMaterial({
      map: glowTexture(), color, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity, fog: false,
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(size, size, 1);
    return s;
  }

  /* ── Balls ── */
  // Change 1: Ball radius 0.85 → 1.05 (bigger, crisper sphere).
  // Glow: was 2.4 * (BALL_R/0.5) = 4.08 at r=0.85 → now fixed tighter: 2.8
  const BALL_R = 1.05;
  const ballGeo = new THREE.SphereGeometry(0.5, 20, 16); // unit sphere, scaled by BALL_R
  const shadowTexCache = {};
  function shadowTexture() {
    if (shadowTexCache.t) return shadowTexCache.t;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = 64;
    const g = cvs.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(0,0,0,0.5)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    shadowTexCache.t = new THREE.CanvasTexture(cvs);
    return shadowTexCache.t;
  }

  /* Create a single ball object and add it to the scene. */
  function makeBall(color, path, startDelay) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.85,
      roughness: 0.3, metalness: 0.1,
    }));
    mesh.scale.setScalar(BALL_R);
    mesh.position.y = BALL_R;
    group.add(mesh);

    // Change 1: Tighter glow — fixed size 2.8, lower opacity so no "eye" artefact.
    const GLOW_SIZE = 2.8;
    const glow = makeGlowSprite(color, GLOW_SIZE, 0.40);
    glow.position.y = BALL_R;
    group.add(glow);

    // Contact shadow — proportional to ball radius.
    const shadowSize = 1.3 * (BALL_R / 0.5);  // ~2.73 at r=1.05
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(shadowSize, shadowSize),
      new THREE.MeshBasicMaterial({
        map: shadowTexture(), transparent: true, depthWrite: false, fog: true,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    scene.add(group);
    const b = {
      group, mesh, path,
      t: startDelay !== undefined ? startDelay : -rand(0, 1.6),
      // Change 3: Wider speed range so balls desync visibly.
      speed: rand(2.0, 4.2),   // cells/sec (was 2.6–3.6)
      bob: rand(0, Math.PI * 2),
      color,
      done: false,
    };
    positionBall(b);
    return b;
  }

  /* Change 2: Pick a fully random start cell across the FULL maze width.
   * Spawn in rows between ~25% and ~55% of depth (mid-field zone) so balls
   * always appear ON the visible maze floor — not at the near edge (too close
   * to camera → renders above text) nor at the far edge (near flags). */
  function randomStartCell() {
    const sc = randint(GRID_C);                          // full width
    // r=GRID_R-1 is nearest (screen-bottom), r=0 is farthest (horizon).
    // Mid-field in screen space: rows 40%–65% of GRID_R from the far end.
    const rMin = Math.round(GRID_R * 0.35);   // far-ish (but not at flags ~r=1-3)
    const rMax = Math.round(GRID_R * 0.62);   // mid — avoids near-edge blowup
    const sr = rMin + randint(Math.max(1, rMax - rMin + 1));
    return { sc, sr };
  }

  /* Change 3: Pick a random flag cell as the target for a ball. */
  function randomFlagCell() {
    return flagCells[randint(flagCells.length)];
  }

  function buildBalls() {
    // Dispose old.
    for (const b of balls) scene.remove(b.group);
    balls = [];
    nextColorIdx = 0;

    const initialCount = Math.min(6, BALL_CAP);
    for (let i = 0; i < initialCount; i++) {
      // Change 2: Fully random start positions, not evenly-spaced columns.
      const { sc, sr } = randomStartCell();
      const fc = randomFlagCell();
      const path = bfsPath(maze, sc, sr, fc.c, fc.r);
      const color = BALL_COLORS[nextColorIdx % BALL_COLORS.length];
      nextColorIdx++;
      // Spread start timing across a wider window so they start scattered.
      balls.push(makeBall(color, path, -rand(0, 2.5)));
    }
  }

  /* Interpolated world position of a ball along its path. */
  function ballCellPos(b) {
    const p = b.path;
    if (p.length === 0) return null;
    const tt = Math.max(0, b.t);
    const seg = Math.min(p.length - 1, Math.floor(tt));
    const frac = Math.min(1, tt - seg);
    const a = p[seg];
    const c2 = p[Math.min(p.length - 1, seg + 1)];
    const e = frac < 0.5 ? 2 * frac * frac : 1 - Math.pow(-2 * frac + 2, 2) / 2;
    return {
      c: a.c + (c2.c - a.c) * e,
      r: a.r + (c2.r - a.r) * e,
    };
  }
  function positionBall(b, now) {
    // Hide ball while it's still in pre-start countdown (t < 0).
    if (b.t < 0) { b.group.visible = false; return; }
    const cp = ballCellPos(b);
    if (!cp) { b.group.visible = false; return; }
    const x = worldX(cp.c), z = worldZ(cp.r);
    // Hide balls that are too close to the camera z (would appear above text).
    // Camera is at z = worldZ(GRID_R-1) + 11. Balls within 8 units in Z are
    // too close and render in the upper dark area of the viewport.
    const camZ = worldZ(GRID_R - 1) + 11.0;
    if (z > camZ - 8) { b.group.visible = false; return; }
    b.group.visible = true;
    const bob = now ? Math.sin(now * 0.005 + b.bob) * 0.12 : 0;
    b.group.position.set(x, bob, z);
  }

  /* ── Capture pulse (expanding ring at the flag) ── */
  function getPulseMesh() {
    // Reuse from pool or create new.
    for (const pm of pulseMeshPool) {
      if (!pm.visible) return pm;
    }
    const pm = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.95, 48),
      new THREE.MeshBasicMaterial({
        color: COL.flag, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      })
    );
    pm.rotation.x = -Math.PI / 2;
    scene.add(pm);
    pulseMeshPool.push(pm);
    return pm;
  }

  function startPulse(fc) {
    const pm = getPulseMesh();
    pm.position.set(worldX(fc.c), 0.06, worldZ(fc.r));
    pm.visible = true;
    pm.scale.set(1, 1, 1);
    pm.material.opacity = 0.9;
    pulses.push({ age: 0, mesh: pm });
  }

  function updatePulses(dt) {
    const life = 0.7;
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.age += dt;
      if (p.age > life) {
        p.mesh.visible = false;
        pulses.splice(i, 1);
        continue;
      }
      const k = p.age / life;
      const s = 1 + k * 9;
      p.mesh.scale.set(s, s, s);
      p.mesh.material.opacity = (1 - k) * 0.9;
    }
  }

  /* ── Respawn a captured ball at a random start cell targeting a random flag ── */
  function respawnBall(b) {
    const { sc, sr } = randomStartCell();
    const fc = randomFlagCell();
    const path = bfsPath(maze, sc, sr, fc.c, fc.r);
    b.path = path;
    b.t = -rand(0.2, 1.5);   // brief random delay
    b.speed = rand(2.0, 4.2);
    b.bob = rand(0, Math.PI * 2);
    b.done = false;
    positionBall(b);
  }

  /* ── Add a new ball (called when flag captured and below cap) ── */
  function addBall() {
    if (balls.length >= BALL_CAP) return;
    const color = BALL_COLORS[nextColorIdx % BALL_COLORS.length];
    nextColorIdx++;
    const { sc, sr } = randomStartCell();
    const fc = randomFlagCell();
    const path = bfsPath(maze, sc, sr, fc.c, fc.r);
    // Change 2: Random delay so new balls don't all appear at the same moment.
    const b = makeBall(color, path, -rand(0.3, 2.8));
    balls.push(b);
  }

  /* ── Layout: grid size + camera, responsive to aspect ──
   *
   * Change 4: ENDLESS-WIDE maze.
   * Compute the horizontal world-space extent that the frustum sees at the FAR
   * edge of the maze (z = worldZ(0)). The camera sits at (0, camY, camNearZ).
   * The frustum half-width at depth d from the camera centre is:
   *   halfW = tan(hFOV/2) * d
   * where hFOV is derived from vFOV and aspect via:
   *   tan(hFOV/2) = tan(vFOV/2) * aspect
   *
   * We need GRID_C * CELL >= 2 * halfW_at_far_edge + margin so maze walls
   * run off BOTH screen edges even at the horizon.
   *
   * We add a generous margin (1.6×) so the maze clears even at extreme
   * aspects (ultra-wide monitors, portrait phones).
   */
  function layoutGrid(w, h) {
    const aspect = w / h;
    const fov = aspect < 0.9 ? 70 : 58; // degrees
    portrait = aspect < 0.9;            // gates the mobile-only flags
    const camY = 11.5;

    // ── Endless-wide: compute GRID_C from the frustum half-width at the far edge.
    //
    // Camera sits at (0, camY=11.5, camZ=11) looking at (0,0,lookAtZ).
    // With GRID_R=26: worldZ(GRID_R-1)=0 → camera z = 11.
    //                 worldZ(0) = -(GRID_R-1)*CELL = -55 (far wall).
    //                 lookAt at worldZ(round(26*0.3))=worldZ(7)=-40.
    //
    // Camera forward direction: normalize(0−0, 0−11.5, −40−11) = normalize(0,−11.5,−51).
    // The far wall depth in camera-space: dot(forwardN, (0−0, 0−11.5, −55−11))
    //   = dot(normalize(0,−11.5,−51), (0,−11.5,−66))
    //   = (0 + 132.25 + 3366) / sqrt(132.25+2601) = 3498.25 / 52.3 ≈ 66.9
    //
    // Frustum half-width at that depth = tan(hFOV/2) * 66.9
    //   where tan(hFOV/2) = tan(vFOV/2) * aspect.
    // At aspect=2.1 (1440×685): tan(29°)*2.1 ≈ 0.554*2.1 ≈ 1.163.
    // halfWFar = 1.163 * 66.9 ≈ 77.8.
    // neededCols = ceil(77.8*2 / CELL) = ceil(155.6/2.2) = 71.
    //
    // We scale by aspect so portrait devices also get enough columns, and
    // add a fixed minimum of 50 to always cover 16:9.
    //
    // NOTE: GRID_R is kept fixed at 26 — only width scales.
    const vFovRad = (fov * Math.PI) / 180;
    const tanHFov = Math.tan(vFovRad / 2) * aspect;
    // Calibrated far-depth constant for our camera setup (≈66.9 at 16:9, camY=11.5).
    const camDepthFar = 67;   // close enough; doesn't need to be exact — min clamp handles it
    const halfWFar = tanHFov * camDepthFar;
    const neededCols = Math.ceil(halfWFar * 2 / CELL);

    // Clamp: min 80 (reliably fills horizon at 16:9+), max 100 (perf).
    // 80 cols × 2.2 = 176 world-width half=88 > frustumHalfW=78 at 16:9.
    GRID_C = Math.max(80, Math.min(100, neededCols % 2 === 0 ? neededCols : neededCols + 1));
    // Keep GRID_R fixed at 26 (depth unchanged).
    GRID_R = 26;

    camera.aspect = aspect;
    camera.fov = fov;
    const nearZ = worldZ(GRID_R - 1);   // = 0
    camera.position.set(0, camY, nearZ + 11.0);  // = (0, 11.5, 11)
    camera.lookAt(0, 0, worldZ(Math.round(GRID_R * 0.3)));
    camera.updateProjectionMatrix();
  }

  /* ── Build a fresh world ── */
  function buildWorld() {
    maze = genMaze(GRID_C, GRID_R);
    buildMazeMeshes();
    buildFlags();
    buildBalls();
    pulses = [];
    for (const pm of pulseMeshPool) pm.visible = false;
  }

  /* ── Resize ── */
  let cssW = 0, cssH = 0;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(cssW, cssH, false);
    layoutGrid(cssW, cssH);
  }
  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const prevC = GRID_C, prevR = GRID_R, prevPortrait = portrait;
      resize();
      // Rebuild when the grid resizes OR when crossing the portrait/landscape
      // boundary (so the mobile-only flags get added/removed).
      if (GRID_C !== prevC || GRID_R !== prevR || portrait !== prevPortrait) buildWorld();
    }, 180);
  }

  /* ── Per-frame update ── */
  function update(dt, now) {
    drift = (drift + dt * 0.05) % 1;
    for (const b of balls) {
      if (b.path.length === 0) continue;
      b.t += b.speed * dt;
      positionBall(b, now);
      const end = b.path.length - 1;
      if (b.t >= end && !b.done) {
        b.done = true;
        // Find the flag cell this ball targeted (last path cell).
        const lastCell = b.path[b.path.length - 1];
        const fc = lastCell || flagCells[0];
        startPulse(fc);
        // Respawn this ball at a new random start cell.
        const capturedBall = b;
        setTimeout(() => {
          respawnBall(capturedBall);
        }, 300);
        // Add a new ball with a random delay so they don't cluster.
        if (balls.length < BALL_CAP) {
          // Change 2: Random delay 0.4–2.5 s before adding the new ball.
          const addDelay = 400 + Math.random() * 2100;
          setTimeout(() => {
            addBall();
          }, addDelay);
        }
      }
    }
    updatePulses(dt);
    // Animate waving flag cloths each frame (no rotation — cloth waves only).
    updateFlagCloths(now);
    // Subtle vertical bob of the flag group (pole + cloth together).
    for (let fi = 0; fi < flagGroups.length; fi++) {
      flagGroups[fi].position.y = Math.sin(now * 0.0018 + fi * 1.9) * 0.08;
    }
  }

  /* ── Render loop ── */
  let rafId = 0, running = false, lastT = 0;
  function frame(now) {
    if (!running) return;
    const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016;
    lastT = now;
    update(dt, now);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    lastT = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* Combine visibility + on-screen: render only when both true. */
  let onScreen = true;
  function syncLoop() {
    if (onScreen && !document.hidden) start();
    else stop();
  }

  /* ── Static frame for reduced motion (no loop) ── */
  function renderStatic() {
    for (const b of balls) {
      if (b.path.length) b.t = Math.max(0, (b.path.length - 1) * (0.35 + Math.random() * 0.3));
      b.done = false;
      positionBall(b, 0);
    }
    // Freeze cloth at a static wave pose (reduced-motion: no per-frame update).
    freezeFlagCloths();
    renderer.render(scene, camera);
  }

  /* ── Wire up ── */
  resize();
  buildHorizon();  
  buildWorld();

  window.addEventListener('resize', onResize, { passive: true });

  if (reducedMotion) {
    renderStatic();
  } else {
    // Render one static frame immediately so the maze shows even if the tab
    // is initially hidden (e.g. opened in background) — the rAF loop starts
    // as soon as the tab becomes active.
    // Position balls at t=0 (show them at their start cells for the static frame).
    for (const b of balls) {
      const oldT = b.t;
      if (b.t < 0) b.t = 0;
      positionBall(b, 0);
      b.t = oldT; // restore so the countdown delay still works when loop starts
    }
    renderer.render(scene, camera);

    document.addEventListener('visibilitychange', syncLoop);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        onScreen = entries[0].isIntersecting;
        syncLoop();
      }, { threshold: 0.01 });
      io.observe(canvas);
    }
    syncLoop();
  }
}
