import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rig = require('../dual-mascot-rig.js');

test('dual-mascot-rig aligns strictly with official Claude Clawd PX=3 TICK=100 DOZE_TICK=400 open geometry', () => {
  assert.equal(rig.PX, 3);
  assert.equal(rig.TICK, 100);
  assert.equal(rig.DOZE_TICK, 400);
  const grid = rig.resolveClawdStandGrid();
  assert.deepEqual(grid, rig.OFFICIAL_OPEN_REF);
});

test('Gemini purple cat shares official blocky grammar without outlines or highlight noise', () => {
  const allowedChars = new Set(['#', 's', 'o', '.', ' ']);
  for (const partName of ['ears', 'body', 'eyes', 'legs', 'paws', 'tail']) {
    const group = rig.CAT_PARTS[partName];
    assert.ok(group && typeof group === 'object', `Expected CAT_PARTS.${partName}`);
    for (const [poseKey, layer] of Object.entries(group)) {
      if (!layer || !Array.isArray(layer.rows)) continue;
      for (const row of layer.rows) {
        for (const ch of row) {
          assert.ok(
            allowedChars.has(ch),
            `Unexpected char '${ch}' in CAT_PARTS.${partName}.${poseKey}`
          );
        }
      }
    }
  }
  assert.strictEqual(rig.CAT_PARTS.legs, rig.CLAWD_PARTS.legs);
});

test('buildClipLayers supports full theater, eggs, poke/sulk, and punctuation reactions', () => {
  const theaterPoses = [
    'idle',
    'happy',
    'groom',
    'pet',
    'write',
    'peek',
    'flat',
    'polish',
    'eat',
    'eatFish',
    'chaseDot',
    'catStretch',
    'letter',
    'plant',
    'butterfly',
    'stretch',
    'spinHop',
    'chatGreet',
    'tilt',
    'wow',
    'sulk',
    'onFire',
    'cheerSticks',
    'rickroll',
    'siren',
  ];
  for (const kind of ['clawd', 'cat']) {
    for (const pose of theaterPoses) {
      const layers = rig.buildClipLayers(kind, pose, 6, { clipTick: 6, dir: 'right', blink: false });
      assert.ok(Array.isArray(layers) && layers.length >= 3, `Expected rich layers for ${kind}:${pose}`);
    }
  }

  const fireLayers = rig.buildClipLayers('clawd', 'onFire', 12, { clipTick: 12 });
  assert.ok(fireLayers.includes(rig.PROPS.mug), 'onFire should include coffee mug');
  assert.ok(fireLayers.some((l) => l && l.grounded === true && l.rows.length > 5), 'onFire should include back fire layer');

  const cheerLayers = rig.buildClipLayers('cat', 'cheerSticks', 5, { clipTick: 5 });
  assert.ok(
    cheerLayers.some((l) => l === rig.PROPS.stickLT || l === rig.PROPS.stickUp || l === rig.PROPS.stickRT),
    'cheerSticks should include glowing stick prop'
  );

  const sirenLayers = rig.buildClipLayers('clawd', 'siren', 1, { clipTick: 1 });
  assert.ok(sirenLayers.includes(rig.PROPS.sirenF), 'siren phase 1 should mount front red siren');

  assert.deepEqual(Object.keys(rig.MINI_SPRITES).sort(), ['cowboy', 'shades', 'wizard']);
  for (const id of ['cowboy', 'shades', 'wizard']) {
    assert.ok(rig.MINI_ANIM_FRAMES[id]?.walkB?.rows?.length >= 6, `Missing walkB for ${id}`);
    assert.ok(rig.MINI_ANIM_FRAMES[id]?.trick?.rows?.length >= 6, `Missing trick for ${id}`);
  }
});

test('ecosystem poses, orchestrator ice crystal, doze Zzz, and mouth layers follow blocky grammar', () => {
  const allowedChars = new Set(['#', 's', 'o', '.', ' ']);
  for (const group of [rig.CLAWD_PARTS.mouth, rig.CAT_PARTS.mouth]) {
    assert.ok(group && typeof group === 'object', 'Expected mouth parts');
    for (const layer of Object.values(group)) {
      for (const row of layer.rows) {
        for (const ch of row) {
          assert.ok(allowedChars.has(ch), `Unexpected mouth char '${ch}'`);
        }
      }
    }
  }
  assert.ok(rig.PROPS.iceCrystal?.rows?.length >= 5, 'Expected iceCrystal prop');
  assert.ok(rig.SYMS.dozeZ1?.rows?.length >= 3, 'Expected dozeZ1 symbol');

  for (const pose of ['yawn', 'wave', 'salute', 'worry', 'carry']) {
    for (const kind of ['clawd', 'cat']) {
      const layers = rig.buildClipLayers(kind, pose, 4, { clipTick: 4, crystal: kind === 'clawd' });
      assert.ok(Array.isArray(layers) && layers.length >= 3, `Expected layers for ${kind}:${pose}`);
    }
  }
  const idleCrystal = rig.buildClipLayers('clawd', 'idle', 2, { crystal: true });
  assert.ok(idleCrystal.includes(rig.PROPS.iceCrystal), 'Clawd idle with crystal=true should mount iceCrystal');
});

test('classifyPairEncounter and stepMiniCrabCorridor model bump and pass-by mechanics deterministically', () => {
  assert.equal(typeof rig.classifyPairEncounter, 'function');
  assert.equal(typeof rig.stepMiniCrabCorridor, 'function');

  const headOn = rig.classifyPairEncounter({
    xA: 100,
    yA: 0,
    walkingA: true,
    dirA: 1,
    xB: 130,
    yB: 0,
    walkingB: true,
    dirB: -1,
    contactDist: 42,
  });
  assert.deepEqual(headOn, { kind: 'bump', sign: 1 });

  const soloPass = rig.classifyPairEncounter({
    xA: 100,
    yA: 0,
    walkingA: true,
    dirA: 1,
    xB: 126,
    yB: 0,
    walkingB: false,
    dirB: -1,
    contactDist: 42,
  });
  assert.deepEqual(soloPass, { kind: 'passBy', mover: 'A', stationary: 'B', dir: 1 });

  const overtake = rig.classifyPairEncounter({
    xA: 110,
    yA: 0,
    walkingA: true,
    dirA: 1,
    xB: 124,
    yB: 0,
    walkingB: true,
    dirB: 1,
    contactDist: 42,
  });
  assert.deepEqual(overtake, { kind: 'passBy', mover: 'A', stationary: 'B', dir: 1 });

  assert.equal(
    rig.classifyPairEncounter({ xA: 100, yA: 0, walkingA: true, dirA: 1, xB: 200, yB: 0, walkingB: true, dirB: -1 }),
    null
  );

  const boundaryCrabs = [{ id: 'cowboy', x: 3, px: 3, dir: -1, speed: 5 }];
  rig.stepMiniCrabCorridor(boundaryCrabs, { minX: 2, maxX: 120, nowTick: 1 });
  assert.equal(boundaryCrabs[0].px, 2);
  assert.equal(boundaryCrabs[0].dir, 1);

  const pairCrabs = [
    { id: 'cowboy', px: 50, dir: 1, speed: 2, blinkAt: -99 },
    { id: 'shades', px: 70, dir: -1, speed: 2, blinkAt: -99 },
  ];
  const ev1 = rig.stepMiniCrabCorridor(pairCrabs, { minX: 2, maxX: 220, contactDist: 26, nowTick: 10 });
  assert.equal(ev1.length, 1);
  assert.equal(ev1[0].type, 'crabBump');

  pairCrabs[0].px = 50;
  pairCrabs[0].dir = 1;
  pairCrabs[0].cooldownTick = -1;
  pairCrabs[0].bumpUntilTick = -1;
  pairCrabs[1].px = 70;
  pairCrabs[1].dir = -1;
  pairCrabs[1].cooldownTick = -1;
  pairCrabs[1].bumpUntilTick = -1;
  const ev2 = rig.stepMiniCrabCorridor(pairCrabs, { minX: 2, maxX: 220, contactDist: 26, nowTick: 25 });
  assert.equal(ev2.length, 1);
  assert.equal(ev2[0].type, 'crabPass');
});

test('static frame cache & adaptive heartbeat: skips redundant clearRect + style.transform writes, widens doze timer to 400ms, and pauses 100% when document.hidden', async () => {
  let clearRectCount = 0;
  let transformAssignCount = 0;
  const docListeners = new Map();

  function makeElem(tag, docRef) {
    const attrs = new Map();
    const listeners = new Map();
    const children = [];
    let _transform = '';
    const style = {
      display: '',
      zIndex: '',
      get transform() {
        return _transform;
      },
      set transform(v) {
        _transform = String(v);
        transformAssignCount += 1;
      },
    };
    const el = {
      tagName: String(tag).toUpperCase(),
      ownerDocument: docRef,
      clientWidth: 720,
      width: 96,
      height: 84,
      className: '',
      dataset: {},
      style,
      children,
      get firstChild() {
        return children[0] || null;
      },
      setAttribute(k, v) {
        attrs.set(k, String(v));
      },
      getAttribute(k) {
        return attrs.get(k) ?? null;
      },
      appendChild(ch) {
        children.push(ch);
        return ch;
      },
      removeChild(ch) {
        const i = children.indexOf(ch);
        if (i >= 0) children.splice(i, 1);
        return ch;
      },
      getBoundingClientRect() {
        return { left: 0, top: 0, right: 96, bottom: 84, width: 720, height: 84 };
      },
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(fn);
      },
      removeEventListener(type, fn) {
        listeners.get(type)?.delete(fn);
      },
      dispatch(type, evt = {}) {
        for (const fn of [...(listeners.get(type) || [])]) fn({ type, button: 0, preventDefault() {}, stopPropagation() {}, ...evt });
      },
      getContext(kind) {
        if (kind !== '2d') return null;
        return {
          imageSmoothingEnabled: false,
          fillStyle: '',
          save() {},
          restore() {},
          setTransform() {},
          clearRect() {
            clearRectCount += 1;
          },
          beginPath() {},
          rect() {},
          clip() {},
          translate() {},
          scale() {},
          rotate() {},
          fillRect() {},
          drawImage() {},
        };
      },
    };
    return el;
  }

  const mockDoc = {
    hidden: false,
    defaultView: {
      devicePixelRatio: 1,
      matchMedia: () => ({ matches: false }),
    },
    createElement(tag) {
      return makeElem(tag, mockDoc);
    },
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, new Set());
      docListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      docListeners.get(type)?.delete(fn);
    },
    dispatchDoc(type) {
      for (const fn of [...(docListeners.get(type) || [])]) fn({ type });
    },
  };

  const host = makeElem('div', mockDoc);
  const stage = rig.mountDualMascotStage(host, {
    camp: 'gemini',
    streaming: false,
    reducedMotion: false, // 挂载后前 2.4s 内无随机眨眼/微抖，直接测试活跃 100ms 心跳下的静态帧缓存命中
  });

  try {
    const snap0 = stage.getLayoutSnapshot();
    assert.equal(snap0.perf.timerIntervalMs, 100, 'Active heartbeat must run at 100ms');
    assert.equal(clearRectCount, 3, 'Initial mount draws both mascots + 1 static habitat prop once');
    assert.equal(transformAssignCount, 2, 'Initial mount writes initial style.transform once per mascot');

    // 等待 260ms（跨过 2 拍心跳）：因姿态、帧签名与坐标完全未变，必须 0 次 clearRect、0 次 style.transform 写入！
    await new Promise((r) => setTimeout(r, 260));
    const snapIdle = stage.getLayoutSnapshot();
    assert.equal(clearRectCount, 3, 'Unchanged idle frames must completely skip Canvas clearRect/redraw');
    assert.equal(transformAssignCount, 2, 'Stationary mascots must completely skip DOM style.transform writes');
    assert.ok(snapIdle.perf.canvasSkips >= 2, 'Must record skipped canvas redraws');
    assert.ok(snapIdle.perf.domTransformSkips >= 2, 'Must record skipped DOM transform writes');

    // 进入 dozing 打盹态 -> 定时器自动拉宽至 400ms！
    stage.triggerDemo('doze');
    const snapDoze = stage.getLayoutSnapshot();
    assert.equal(snapDoze.dozing, true);
    assert.equal(snapDoze.perf.timerIntervalMs, 400, 'Dozing state must widen heartbeat timer to 400ms');

    // 鼠标靠近舞台 -> 0ms 立即唤醒恢复 100ms 灵敏心跳！
    host.dispatch('pointerenter');
    const snapWoke = stage.getLayoutSnapshot();
    assert.equal(snapWoke.dozing, false);
    assert.equal(snapWoke.perf.timerIntervalMs, 100, 'Pointer approach must restore 100ms heartbeat in 0ms');

    // 再次进入打盹，验证打字同样瞬间唤醒 100ms
    stage.triggerDemo('doze');
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 400);
    stage.onUserType('hello!');
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 100, 'User typing must restore 100ms heartbeat in 0ms');

    // document.hidden = true -> 100% 暂停定时器（timerIntervalMs === 0）
    mockDoc.hidden = true;
    mockDoc.dispatchDoc('visibilitychange');
    const snapHidden = stage.getLayoutSnapshot();
    assert.equal(snapHidden.perf.timerPaused, true, 'document.hidden must pause heartbeat 100%');
    assert.equal(snapHidden.perf.timerIntervalMs, 0);

    const tickAtHide = snapHidden.actors[0].tick;
    await new Promise((r) => setTimeout(r, 240));
    assert.equal(stage.getLayoutSnapshot().actors[0].tick, tickAtHide, 'Zero ticks may fire while document.hidden');

    // 标签页恢复可见 -> 自动重启心跳
    mockDoc.hidden = false;
    mockDoc.dispatchDoc('visibilitychange');
    assert.equal(stage.getLayoutSnapshot().perf.timerPaused, false);
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 100);
  } finally {
    stage.dispose();
  }
});

function createInteractiveStageHarness(opts = {}) {
  const store = new Map(Object.entries(opts.initialStore || {}));
  const fillColors = new Map();

  function makeElem(tag, docRef) {
    const attrs = new Map();
    const listeners = new Map();
    const children = [];
    const style = {
      display: '',
      zIndex: '',
      transform: '',
      pointerEvents: '',
      cursor: '',
      touchAction: '',
    };
    const el = {
      tagName: String(tag).toUpperCase(),
      ownerDocument: docRef,
      clientWidth: opts.width || 720,
      width: 96,
      height: 84,
      className: '',
      dataset: {},
      style,
      children,
      get firstChild() {
        return children[0] || null;
      },
      setAttribute(k, v) {
        attrs.set(k, String(v));
      },
      getAttribute(k) {
        return attrs.get(k) ?? null;
      },
      appendChild(ch) {
        children.push(ch);
        return ch;
      },
      removeChild(ch) {
        const i = children.indexOf(ch);
        if (i >= 0) children.splice(i, 1);
        return ch;
      },
      getBoundingClientRect() {
        return { left: 0, top: 0, right: 96, bottom: 84, width: opts.width || 720, height: 84 };
      },
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(fn);
      },
      removeEventListener(type, fn) {
        listeners.get(type)?.delete(fn);
      },
      dispatch(type, evt = {}) {
        for (const fn of [...(listeners.get(type) || [])]) {
          fn({ type, button: 0, pointerId: 1, preventDefault() {}, stopPropagation() {}, ...evt });
        }
      },
      getContext(kind) {
        if (kind !== '2d') return null;
        return {
          imageSmoothingEnabled: false,
          _fill: '',
          get fillStyle() {
            return this._fill;
          },
          set fillStyle(v) {
            this._fill = String(v);
          },
          save() {},
          restore() {},
          setTransform() {},
          clearRect() {},
          beginPath() {},
          rect() {},
          clip() {},
          translate() {},
          scale() {},
          rotate() {},
          fillRect() {
            const key = el.dataset.miniCrab || el.className || 'canvas';
            if (!fillColors.has(key)) fillColors.set(key, new Set());
            fillColors.get(key).add(this._fill);
          },
          drawImage() {},
        };
      },
    };
    return el;
  }

  const localStorage = {
    getItem(k) {
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      store.set(String(k), String(v));
    },
    removeItem(k) {
      store.delete(String(k));
    },
  };

  const mockDoc = {
    hidden: false,
    defaultView: {
      devicePixelRatio: 1,
      localStorage,
      matchMedia: () => ({ matches: false }),
    },
    createElement(tag) {
      return makeElem(tag, mockDoc);
    },
    addEventListener() {},
    removeEventListener() {},
  };

  const host = makeElem('div', mockDoc);
  const stage = rig.mountDualMascotStage(host, {
    camp: 'gemini',
    miniPileEnabled: opts.miniPileEnabled ?? true,
    reducedMotion: opts.reducedMotion ?? false,
  });

  const findActorEl = (id) => host.children.find((c) => c.getAttribute?.('data-mascot-id') === id);
  const findMiniEl = (id) => {
    const group = host.children.find((c) => c.className === 'ag-v2-mini-pile');
    return group?.children.find((c) => c.dataset?.miniCrab === id) || null;
  };

  return { host, stage, store, fillColors, findActorEl, findMiniEl };
}

test('resolveGroundSeparation enforces >= 6px rigid-body clear gap across all 5 pets without overlap', () => {
  const crowded = [
    { id: 'cat', cx: 300, halfW: 22 },
    { id: 'clawd', cx: 300, halfW: 22 },
    { id: 'cowboy', cx: 300, halfW: 13 },
    { id: 'shades', cx: 301, halfW: 13 },
    { id: 'wizard', cx: 299, halfW: 13 },
  ];
  rig.resolveGroundSeparation(crowded, 14, 706, 6);
  const sorted = [...crowded].sort((a, b) => a.cx - b.cx);
  for (let i = 0; i < sorted.length; i++) {
    assert.ok(sorted[i].cx - sorted[i].halfW >= 13.99, 'Must stay inside left stage bound');
    assert.ok(sorted[i].cx + sorted[i].halfW <= 706.01, 'Must stay inside right stage bound');
    if (i < sorted.length - 1) {
      const gap = sorted[i + 1].cx - sorted[i].cx - (sorted[i].halfW + sorted[i + 1].halfW);
      assert.ok(gap >= 5.95, `Expected >= 6px clear gap between ${sorted[i].id} and ${sorted[i + 1].id}, got ${gap}`);
    }
  }

  // 验证真实 5 宠舞台拖拽同位松手后自动刚体推挤防重叠
  const { stage, findActorEl } = createInteractiveStageHarness({ miniPileEnabled: true, reducedMotion: true });
  try {
    const snap0 = stage.getLayoutSnapshot();
    const clawdCx = snap0.actors.find((a) => a.id === 'clawd').worldCx;
    const catCx = snap0.actors.find((a) => a.id === 'cat').worldCx;
    const catEl = findActorEl('cat');
    // 将 cat 直接拖到与 clawd 完全重合的地面位置松手
    catEl.dispatch('pointerdown', { clientX: catCx, clientY: 80 });
    catEl.dispatch('pointermove', { clientX: clawdCx, clientY: 80 });
    catEl.dispatch('pointerup', { clientX: clawdCx, clientY: 80 });

    const snap1 = stage.getLayoutSnapshot();
    const grounded = [
      ...snap1.actors.map((a) => ({ id: a.id, cx: a.worldCx, hw: 22 })),
      ...snap1.minis.map((m) => ({ id: m.id, cx: m.worldCx, hw: 13 })),
    ].sort((a, b) => a.cx - b.cx);
    for (let i = 0; i < grounded.length - 1; i++) {
      const clearGap = grounded[i + 1].cx - grounded[i].cx - (grounded[i].hw + grounded[i + 1].hw);
      assert.ok(clearGap >= 5.5, `Grounded pets ${grounded[i].id} & ${grounded[i + 1].id} must not overlap (gap=${clearGap})`);
    }
  } finally {
    stage.dispose();
  }
});

test('obstacle encounters support parabolic leapfrog (~26px peak), autoPerch hitchhike, and greetTurn reversal', async () => {
  assert.equal(rig.chooseObstacleAction({ canLeap: true, canPerch: true, roll: 0.2 }), 'leapfrog');
  assert.equal(rig.chooseObstacleAction({ canLeap: true, canPerch: true, roll: 0.55 }), 'autoPerch');
  assert.equal(rig.chooseObstacleAction({ canLeap: true, canPerch: true, roll: 0.9 }), 'greetTurn');
  assert.equal(rig.chooseObstacleAction({ canLeap: false, canPerch: false, roll: 0.1 }), 'greetTurn');

  const { stage } = createInteractiveStageHarness({ miniPileEnabled: true, reducedMotion: false });
  try {
    // (a) 抛物线撑跳越过（leapfrog）：跃起峰值约 ~26px，落地到伙伴另一侧
    stage.triggerDemo('leapfrog');
    let minArcY = 0;
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 95));
      const cat = stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat');
      if (cat.y < minArcY) minArcY = cat.y;
    }
    assert.ok(minArcY <= -20 && minArcY >= -30, `Leapfrog parabolic arc peak should be ~26px, observed ${-minArcY}px`);
    const afterLeap = stage.getLayoutSnapshot();
    const catAfter = afterLeap.actors.find((a) => a.id === 'cat');
    const clawdAfter = afterLeap.actors.find((a) => a.id === 'clawd');
    assert.ok(catAfter.worldCx > clawdAfter.worldCx + 44, 'Cat must land cleanly on the far side of Clawd after leapfrog');

    // (b) 顺势跳上头顶搭便车（autoPerch）：底座散步驮着上层同步位移
    stage.triggerDemo('autoPerch');
    await new Promise((r) => setTimeout(r, 680));
    const perched = stage.getLayoutSnapshot();
    const catP = perched.actors.find((a) => a.id === 'cat');
    const clawdP = perched.actors.find((a) => a.id === 'clawd');
    assert.equal(catP.stackedOn, 'clawd', 'AutoPerch must land cat onto Clawd head');
    const startBaseCx = clawdP.worldCx;
    await new Promise((r) => setTimeout(r, 320));
    const movedSnap = stage.getLayoutSnapshot();
    const catMoved = movedSnap.actors.find((a) => a.id === 'cat');
    const clawdMoved = movedSnap.actors.find((a) => a.id === 'clawd');
    assert.notEqual(clawdMoved.worldCx, startBaseCx, 'Walking base must carry the stack forward');
    assert.equal(catMoved.worldCx, clawdMoved.worldCx, 'Perched rider must move in lockstep with walking base');

    // (c) 驻足礼貌互动后转身（greetTurn）
    stage.triggerDemo('unstack');
    const act = stage.triggerObstacle('cowboy', 'clawd', 'greetTurn');
    assert.equal(act, 'greetTurn');
    assert.equal(stage.getLayoutSnapshot().lastInteraction.type, 'greetTurn');
  } finally {
    stage.dispose();
  }
});

test('multi-tier totem stack (up to 5 tiers), pointer drag stacking, pull-out gravity settle, and vigorous side-hop dismount', async () => {
  const { stage, findMiniEl } = createInteractiveStageHarness({ miniPileEnabled: true, reducedMotion: false });
  try {
    // 1. 构建 4 层混搭图腾塔：clawd -> cowboy -> cat -> shades，再用鼠标指针拖拽 wizard 叠上第 5 层！
    assert.equal(stage.stackOnto('cowboy', 'clawd'), true);
    assert.equal(stage.stackOnto('cat', 'cowboy'), true);
    assert.equal(stage.stackOnto('shades', 'cat'), true);

    const snap4 = stage.getLayoutSnapshot();
    const shadesSnap = snap4.minis.find((m) => m.id === 'shades');
    const wizSnap0 = snap4.minis.find((m) => m.id === 'wizard');
    const wizEl = findMiniEl('wizard');

    // 模拟真实鼠标拖拽第 5 只迷你蟹 wizard 到塔顶 shades 头顶（perchY = shades.y - 16）悬停稳放松手
    const targetDropY = shadesSnap.y - 16;
    wizEl.dispatch('pointerdown', { clientX: wizSnap0.worldCx, clientY: 100 });
    wizEl.dispatch('pointermove', { clientX: shadesSnap.worldCx, clientY: 100 + targetDropY });
    await new Promise((r) => setTimeout(r, 45));
    wizEl.dispatch('pointerup', { clientX: shadesSnap.worldCx, clientY: 100 + targetDropY });

    const snap5 = stage.getLayoutSnapshot();
    assert.deepEqual(snap5.towers, [['clawd', 'cowboy', 'cat', 'shades', 'wizard']], '5-pet mode must support full 5-tier mixed totem stack');

    // 2. 抽走中间层 'cowboy'：上方 ['cat', 'shades', 'wizard'] 受重力顺滑下落补位，扣合在 'clawd' 头顶重组为 4 层塔！
    stage.pullFromStack('cowboy', 'settle');
    await new Promise((r) => setTimeout(r, 340));
    const snapSettledMid = stage.getLayoutSnapshot();
    assert.deepEqual(
      snapSettledMid.towers,
      [['clawd', 'cat', 'shades', 'wizard']],
      'Upper sub-tower must smoothly gravity-settle onto lower holder after middle pet is pulled out'
    );

    // 3. 抽走最底层底座 'clawd'：上方子塔 ['cat', 'shades', 'wizard'] 顺滑落回地面 y=0！
    stage.pullFromStack('clawd', 'settle');
    await new Promise((r) => setTimeout(r, 360));
    const snapSettledBottom = stage.getLayoutSnapshot();
    assert.deepEqual(
      snapSettledBottom.towers,
      [['cat', 'shades', 'wizard']],
      'Upper sub-tower must remain intact and settle smoothly onto ground when base is pulled out'
    );
    const catBase = snapSettledBottom.actors.find((a) => a.id === 'cat');
    assert.equal(catBase.y, 0, 'New root cat must settle cleanly on ground y=0');

    // 4. 剧烈动作（如 onFire）触发上方骑乘者轻巧侧跳落地解绑
    stage.triggerDemo('fire');
    await new Promise((r) => setTimeout(r, 450));
    const snapAfterFire = stage.getLayoutSnapshot();
    assert.deepEqual(snapAfterFire.towers, [], 'Vigorous action on base must dismount riders safely to ground');
  } finally {
    stage.dispose();
  }
});

test('three-stage chromaResonance state machine, diagonal spectrum flow, crystal ear glints, persistence, and 4-tap toggle', () => {
  // 验证对角线色相梯度与暗部体块阴影插值
  const cA = rig.evalChromaColorAt(2, 2, 0.1, false);
  const cB = rig.evalChromaColorAt(9, 6, 0.1, false);
  const cShadow = rig.evalChromaColorAt(2, 2, 0.1, true);
  assert.match(cA, /^#[0-9a-f]{6}$/);
  assert.notEqual(cA, cB, 'Chroma coat must vary diagonally across (gx + gy)');
  assert.notEqual(cA, cShadow, 'Shadow pixels must use darkened matching hue for blocky volume');

  const h1 = createInteractiveStageHarness({ miniPileEnabled: true, reducedMotion: false });
  try {
    // 搭起 3 层塔（clawd -> cowboy -> cat），但在前置编码门禁达成前连点 4 次绝不误触发
    h1.stage.stackOnto('cowboy', 'clawd');
    h1.stage.stackOnto('cat', 'cowboy');
    for (let i = 0; i < 4; i++) h1.stage.poke('cat');
    assert.equal(h1.stage.getLayoutSnapshot().chromaResonance.active, false, 'Must not awaken before both session gates');

    // 达成 Gate 1（算力调谐）+ Gate 2（编码锻造）
    h1.stage.notify('model-shift');
    h1.stage.notify('code-copied');
    const gated = h1.stage.getLayoutSnapshot().chromaResonance;
    assert.equal(gated.tuned, true);
    assert.equal(gated.forged, true);
    assert.equal(gated.active, false);

    // Gate 3：在 >=3 层叠塔态 1.8s 内连点小紫猫 4 次 -> 迸发 12 粒棱镜像素星屑并觉醒！
    for (let i = 0; i < 4; i++) h1.stage.poke('cat');
    const awakened = h1.stage.getLayoutSnapshot();
    assert.equal(awakened.chromaResonance.active, true, '4 taps in 3-tier tower after gates must awaken chromaResonance');
    assert.ok(awakened.chromaResonance.sparkCount >= 12, 'Awakening must burst >= 12 four-color prismatic sparks');
    assert.equal(h1.store.get('__op_chroma_v1'), '1', 'Must persist unlocked state to __op_chroma_v1');

    const catCanvasColors = h1.fillColors.get('ag-v2-mascot-canvas') || new Set();
    assert.ok(
      [...catCanvasColors].some((c) => c.toUpperCase() === '#FFFFFF'),
      'Chroma cat must paint pure #FFFFFF crystal ear glints'
    );

    // 验证跨会话重挂载自动恢复炫彩形态，且叠塔连点 4 次可自由切回原色紫猫
    const h2 = createInteractiveStageHarness({
      miniPileEnabled: false,
      reducedMotion: false,
      initialStore: { __op_chroma_v1: '1' },
    });
    try {
      assert.equal(h2.stage.getLayoutSnapshot().chromaResonance.active, true, 'Saved __op_chroma_v1=1 must restore on mount');
      // 双宠模式下叠成 2 层塔，连点 4 次切回原色紫猫
      h2.stage.stackOnto('cat', 'clawd');
      for (let i = 0; i < 4; i++) h2.stage.poke('cat');
      assert.equal(h2.stage.getLayoutSnapshot().chromaResonance.active, false, '4 taps in tower must toggle off back to classic purple coat');
      assert.equal(h2.store.has('__op_chroma_v1'), false, 'Toggling off must clear __op_chroma_v1');
    } finally {
      h2.stage.dispose();
    }
  } finally {
    h1.stage.dispose();
  }
});

test('high-rate pointer dragging of mini-crabs and main actors disables CSS transition lag and writes subpixel GPU transforms directly', () => {
  const { host, stage, findMiniEl, findActorEl } = createInteractiveStageHarness({ miniPileEnabled: true, reducedMotion: false });
  try {
    let rectReadsDuringMove = 0;
    const origRect = host.getBoundingClientRect;
    host.getBoundingClientRect = () => {
      rectReadsDuringMove += 1;
      return origRect();
    };

    const miniEl = findMiniEl('cowboy');
    const snap0 = stage.getLayoutSnapshot().minis.find((m) => m.id === 'cowboy');
    miniEl.dispatch('pointerdown', { clientX: snap0.worldCx, clientY: 100 });
    rectReadsDuringMove = 0;

    // 模拟 1000Hz 电竞鼠标连续亚像素微移
    miniEl.dispatch('pointermove', { clientX: snap0.worldCx + 8.37, clientY: 91.64 });
    miniEl.dispatch('pointermove', { clientX: snap0.worldCx + 14.73, clientY: 84.28 });
    assert.equal(rectReadsDuringMove, 0, 'pointermove must perform 0 synchronous getBoundingClientRect reflows');
    assert.equal(miniEl.getAttribute('data-direct'), '1', 'Dragging mini-crab must lock data-direct="1" to bypass 180ms steps(2,end) CSS transition');
    assert.equal(miniEl.style.transition, 'none', 'Inline transition must be none during drag');
    assert.match(miniEl.style.transform, /\d+\.\d+px/, 'Subpixel coordinates must stream directly without coarse integer rounding lag');

    miniEl.dispatch('pointerup', { clientX: snap0.worldCx + 14.73, clientY: 84.28 });

    // Mascot elements must never expose hover title tooltips
    const clawdEl = findActorEl('clawd');
    const catEl = findActorEl('cat');
    assert.equal(clawdEl.getAttribute('title'), null, 'Clawd must never show hover title tooltip');
    assert.equal(catEl.getAttribute('title'), null, 'Cat must never show hover title tooltip');
    assert.equal(miniEl.getAttribute('title'), null, 'Mini crabs must never show hover title tooltip');

    // 主宠同步验证零重排与直通锁
    const catCx0 = stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat').worldCx;
    catEl.dispatch('pointerdown', { clientX: catCx0, clientY: 100 });
    rectReadsDuringMove = 0;
    catEl.dispatch('pointermove', { clientX: catCx0 - 12.42, clientY: 88.15 });
    assert.equal(rectReadsDuringMove, 0, 'Actor pointermove must also perform 0 getBoundingClientRect reflows');
    assert.equal(catEl.getAttribute('data-direct'), '1');
    assert.equal(catEl.style.transition, 'none');
    catEl.dispatch('pointerup', { clientX: catCx0 - 12.42, clientY: 88.15 });
  } finally {
    stage.dispose();
  }
});

test('reducedMotion pauses idle heartbeat to 0fps (timerIntervalMs=0) and revives 100ms heartbeat on setState unfreeze', () => {
  const h = createInteractiveStageHarness({ miniPileEnabled: true, reducedMotion: false });
  try {
    assert.equal(h.stage.getLayoutSnapshot().perf.timerIntervalMs, 100);
    assert.equal(h.stage.getLayoutSnapshot().perf.timerPaused, false);

    // 切换全局禁动效 reducedMotion: true（非流式忙碌态）-> 立即停表至 0fps
    h.stage.setState({ reducedMotion: true });
    const pausedSnap = h.stage.getLayoutSnapshot();
    assert.equal(pausedSnap.reducedMotion, true);
    assert.equal(pausedSnap.perf.timerIntervalMs, 0, 'Idle reducedMotion must stop 100ms heartbeat to 0fps');
    assert.equal(pausedSnap.perf.timerPaused, true);

    // 在 reducedMotion (motionLevel='off') 下即使进入流式忙碌态，仍保持 0fps 停摆并同步一次单帧姿态
    h.stage.setState({ streaming: true });
    assert.equal(h.stage.getLayoutSnapshot().perf.timerIntervalMs, 0);
    assert.equal(h.stage.getLayoutSnapshot().perf.timerPaused, true);
    h.stage.setState({ streaming: false });
    assert.equal(h.stage.getLayoutSnapshot().perf.timerIntervalMs, 0);

    // 从 reducedMotion: true 解冻切回 false -> 立即复活 100ms 心跳，绝不僵死！
    h.stage.setState({ reducedMotion: false });
    const revivedSnap = h.stage.getLayoutSnapshot();
    assert.equal(revivedSnap.reducedMotion, false);
    assert.equal(revivedSnap.perf.timerIntervalMs, 100, 'Unfreezing reducedMotion must revive 100ms heartbeat immediately');
    assert.equal(revivedSnap.perf.timerPaused, false);
  } finally {
    h.stage.dispose();
  }
});

test('OP-1 & OP-3 regressions: streamDone error worry pose, window blur drag release, dynamic DPR resize & clean DOM dispose', () => {
  const winListeners = new Map();
  const mockWin = {
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, new Set());
      winListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      winListeners.get(type)?.delete(fn);
    },
    dispatch(type) {
      for (const fn of [...(winListeners.get(type) || [])]) fn({ type });
    },
  };
  const makeNode = (tag) => {
    const listeners = new Map();
    const attrs = new Map();
    const children = [];
    return {
      tagName: tag.toUpperCase(),
      ownerDocument: null,
      clientWidth: 720,
      width: 96,
      height: 84,
      className: '',
      dataset: {},
      style: {},
      children,
      get firstChild() { return children[0] || null; },
      setAttribute(k, v) { attrs.set(k, String(v)); },
      getAttribute(k) { return attrs.get(k) ?? null; },
      removeAttribute(k) { attrs.delete(k); },
      appendChild(c) { children.push(c); return c; },
      removeChild(c) { const i = children.indexOf(c); if (i >= 0) children.splice(i, 1); return c; },
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 720, bottom: 84, width: 720, height: 84 }),
      addEventListener(t, f) { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(f); },
      removeEventListener(t, f) { listeners.get(t)?.delete(f); },
      dispatch(t, ev = {}) { for (const fn of [...(listeners.get(t) || [])]) fn({ type: t, button: 0, preventDefault() {}, stopPropagation() {}, ...ev }); },
      getContext: (k) => k === '2d' ? { save() {}, restore() {}, setTransform() {}, clearRect() {}, beginPath() {}, rect() {}, clip() {}, translate() {}, scale() {}, rotate() {}, fillRect() {}, drawImage() {} } : null,
    };
  };
  const doc = {
    hidden: false,
    defaultView: mockWin,
    createElement(tag) {
      const n = makeNode(tag);
      n.ownerDocument = doc;
      return n;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const hostEl = doc.createElement('div');
  const stage = rig.mountDualMascotStage(hostEl, { miniPileEnabled: true, reducedMotion: true });

  // 1. Error termination sets 'worry' + 'sweat' instead of celebrating
  stage.notify('streamDone', { error: true });
  const errSnap = stage.getLayoutSnapshot();
  assert.ok(errSnap.actors.every((a) => a.pose === 'worry' && a.sym === 'sweat'));

  // 2. Dynamic multi-monitor DPR change resizes actor & mini-crab canvases on next render
  const catActorEl = hostEl.children.find((n) => n.getAttribute('data-mascot-id') === 'cat');
  assert.equal(catActorEl.children[0].width, 96);
  mockWin.devicePixelRatio = 2;
  stage.notify('activity');
  stage.setState({ camp: 'claude' });
  assert.equal(catActorEl.children[0].width, 192, 'Actor canvas must rescale to 2x DPR when moved across displays');

  // 3. Window blur during active drag releases dragging state and settles back to ground
  catActorEl.dispatch('pointerdown', { clientX: 600, clientY: 80 });
  catActorEl.dispatch('pointermove', { clientX: 120, clientY: 40 });
  assert.equal(catActorEl.getAttribute('data-dragging'), '1');
  mockWin.dispatch('blur');
  assert.equal(catActorEl.getAttribute('data-dragging'), null, 'Window blur must release mid-air drag lock');
  assert.equal(stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat').footY, 0);

  // 4. dispose() removes all mounted DOM subtrees from hostEl (includes .ag-v2-habitat-prop)
  assert.equal(hostEl.children.length, 5);
  stage.dispose();
  assert.equal(hostEl.children.length, 0, 'dispose() must detach all stage children from hostEl');
});

test('Issue #1 & perf guard: dual mascots (cat + clawd) track side-panel push/drag-snap/close-rebound via rAF, skip unaffected pets, and pulse bar uses 0-reflow ResizeObserver tiers', async () => {
  const winListeners = new Map();
  let roCb = null, roDisconnected = false, rafQueue = [], passiveCount = 0;
  const prevRO = globalThis.ResizeObserver;
  class FakeRO {
    constructor(cb) { roCb = cb; }
    observe() {}
    disconnect() { roDisconnected = true; }
  }
  globalThis.ResizeObserver = FakeRO;
  const mockWin = {
    devicePixelRatio: 1,
    ResizeObserver: FakeRO,
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; },
    cancelAnimationFrame() {},
    addEventListener(type, fn, opts) {
      if (opts && typeof opts === 'object' && opts.passive) passiveCount++;
      if (!winListeners.has(type)) winListeners.set(type, new Set());
      winListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { winListeners.get(type)?.delete(fn); },
    dispatch(type) { for (const fn of [...(winListeners.get(type) || [])]) fn({ type }); },
  };
  const flushRaf = () => { const q = rafQueue.splice(0); for (const fn of q) fn(performance.now()); };
  const makeNode = (tag) => {
    const listeners = new Map(), attrs = new Map(), children = [];
    const node = {
      nodeType: 1,
      tagName: tag.toUpperCase(),
      ownerDocument: null,
      width: 96,
      height: 84,
      className: '',
      dataset: {},
      style: {},
      children,
      get firstChild() { return children[0] || null; },
      setAttribute(k, v) { attrs.set(k, String(v)); },
      getAttribute(k) { return attrs.get(k) ?? null; },
      removeAttribute(k) { attrs.delete(k); },
      appendChild(c) { children.push(c); return c; },
      removeChild(c) { const i = children.indexOf(c); if (i >= 0) children.splice(i, 1); return c; },
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 720, bottom: 84, width: 720, height: 84 }),
      addEventListener(t, f) { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(f); },
      removeEventListener(t, f) { listeners.get(t)?.delete(f); },
      getContext: (k) => k === '2d' ? { save() {}, restore() {}, setTransform() {}, clearRect() {}, beginPath() {}, rect() {}, clip() {}, translate() {}, scale() {}, rotate() {}, fillRect() {}, drawImage() {} } : null,
    };
    return node;
  };
  const doc = { hidden: false, defaultView: mockWin, createElement(tag) { const n = makeNode(tag); n.ownerDocument = doc; return n; }, addEventListener() {}, removeEventListener() {} };
  const hostEl = doc.createElement('div');
  Object.setPrototypeOf(hostEl, { get clientWidth() { return 720; } });

  try {
    const stage = rig.mountDualMascotStage(hostEl, { miniPileEnabled: false, reducedMotion: true });
    assert.ok(roCb, 'Must attach ResizeObserver to stage host');
    assert.ok(passiveCount >= 3, 'Window pointer listeners must be passive');

    const snap0 = stage.getLayoutSnapshot();
    const cat0 = snap0.actors.find((a) => a.id === 'cat').x;
    const clawd0 = snap0.actors.find((a) => a.id === 'clawd').x;
    const draws0 = snap0.perf.canvasDraws;

    // 1) Side panel widens (stage shrinks 720 -> 360): BOTH cat & clawd get pushed left cleanly in a single rAF batch
    roCb([{ contentRect: { width: 520 } }]);
    roCb([{ contentRect: { width: 360 } }]);
    assert.equal(rafQueue.length, 1, 'Multiple ResizeObserver ticks in same frame must coalesce into 1 rAF');
    flushRaf();
    const snapNarrow = stage.getLayoutSnapshot();
    const catN = snapNarrow.actors.find((a) => a.id === 'cat').x;
    const clawdN = snapNarrow.actors.find((a) => a.id === 'clawd').x;
    assert.ok(catN < cat0 - 150 && clawdN < clawd0 - 150, `Both cat (${cat0}->${catN}) and clawd (${clawd0}->${clawdN}) must be pushed left`);
    assert.equal(snapNarrow.perf.canvasDraws, draws0, 'Side-panel push only updates GPU translate3d and must not trigger redundant canvasDraws');

    // 2) Dragging side panel back right (pointerdown active): BOTH follow right edge smoothly
    mockWin.dispatch('pointerdown');
    roCb([{ contentRect: { width: 500 } }]);
    flushRaf();
    const snapMid = stage.getLayoutSnapshot();
    assert.ok(snapMid.actors.find((a) => a.id === 'cat').x > catN + 80, 'cat must snap-follow right edge during drag');
    assert.ok(snapMid.actors.find((a) => a.id === 'clawd').x > clawdN + 80, 'clawd must snap-follow right edge during drag');
    assert.equal(snapMid.perf.canvasDraws, draws0, 'Side-panel drag-snap must not trigger redundant canvasDraws');

    // 3) Closing side panel (pointerup + wide jump to 720): BOTH rebound back to original right-side positions
    mockWin.dispatch('pointerup');
    roCb([{ contentRect: { width: 620 } }]);
    flushRaf();
    roCb([{ contentRect: { width: 720 } }]);
    flushRaf();
    await new Promise((r) => setTimeout(r, 340));
    const snapBack = stage.getLayoutSnapshot();
    assert.ok(Math.abs(snapBack.actors.find((a) => a.id === 'cat').x - cat0) <= 6, 'cat must rebound back to original right position');
    assert.ok(Math.abs(snapBack.actors.find((a) => a.id === 'clawd').x - clawd0) <= 6, 'clawd must rebound back to original right position');

    // 4) Clean dispose removes ResizeObserver & all passive window listeners
    stage.dispose();
    assert.equal(roDisconnected, true, 'dispose() must disconnect ResizeObserver');
    assert.equal((winListeners.get('pointerdown')?.size || 0), 0, 'dispose() must remove pointerdown listener');
  } finally {
    globalThis.ResizeObserver = prevRO;
  }

  // 5) Verify inline-fallback 5-tier 0-reflow ResizeObserver behavior
  const fbMod = require('../vendor/pulse-dashboard/inline-fallback.js');
  let ftRoCb = null, rectCalls = 0, ftRoDisc = false;
  class PulseRO {
    constructor(cb) { ftRoCb = cb; }
    observe() {}
    disconnect() { ftRoDisc = true; }
  }
  const ftAttrs = new Map(), barAttrs = new Map();
  const footer = {
    isConnected: true, className: 'agy-composer-footer', hidden: false, children: [],
    getAttribute: (k) => ftAttrs.get(k) ?? null,
    setAttribute: (k, v) => ftAttrs.set(k, String(v)),
    removeAttribute: (k) => ftAttrs.delete(k),
    getBoundingClientRect: () => { rectCalls++; return { width: 700, height: 30 }; },
    appendChild(c) { this.children.push(c); c.parentElement = this; },
    closest: () => null,
  };
  let injectedTierCss = '';
  const extBar = {
    id: 'ag-pulse-status-bar', isConnected: true, hidden: false,
    shadowRoot: { querySelector: () => null, appendChild(el) { if (el?.textContent) injectedTierCss = el.textContent; } },
    getAttribute: (k) => barAttrs.get(k) ?? null,
    setAttribute: (k, v) => barAttrs.set(k, String(v)),
    removeAttribute: (k) => barAttrs.delete(k),
    getBoundingClientRect: () => ({ width: 180, height: 24 }),
  };
  const pDoc = {
    hidden: false,
    documentElement: { getAttribute: () => 'zh-CN' },
    body: {},
    createElement: (tag) => ({ tagName: tag, setAttribute() {}, textContent: '' }),
    querySelector: (sel) => (sel.includes('agy-composer-footer') ? footer : sel.includes('conversation-view') ? {} : null),
    querySelectorAll: (sel) => (sel.includes('ag-pulse-status-bar') ? [extBar] : []),
    contains: () => true,
  };
  const pWin = {
    document: pDoc,
    location: { pathname: '/c/11111111-2222-3333-4444-555555555555' },
    ResizeObserver: PulseRO,
    addEventListener() {},
    removeEventListener() {},
  };
  const ctl = fbMod.createTelemetryController({ window: pWin, document: pDoc });
  ctl.sync({ telemetryModule: 'auto', language: 'zh-CN' });
  assert.equal(ftAttrs.get('data-t'), '0');
  const callsAfterInit = rectCalls;
  ftRoCb([{ contentRect: { width: 610 } }]);
  assert.equal(ftAttrs.get('data-t'), '1');
  ftRoCb([{ contentRect: { width: 340 } }]);
  assert.equal(ftAttrs.get('data-t'), '1 2 3 4 5');
  assert.equal(barAttrs.get('data-t'), '1 2 3 4 5');
  assert.equal(rectCalls, callsAfterInit, 'ResizeObserver path must use contentRect.width with 0 getBoundingClientRect reflows');
  assert.equal(/(?<![a-z-])width:0!important/.test(injectedTierCss), false, 'TIER_CSS must not use non-interpolable width:0!important');
  assert.equal(injectedTierCss.includes('flex:0 0 0!important'), false, 'TIER_CSS must not use non-interpolable flex:0 0 0!important');
  assert.ok(injectedTierCss.includes('transform:scale(1.27)'), 'Tier 5 context-ring must scale via GPU transform');
  ctl.destroy();
  assert.equal(ftRoDisc, true, 'destroy() must disconnect pulse ResizeObserver');
});

test('Red-team regressions: wide rebound (reducedMotion=false), narrower restore order, mini tower syncTower, TIER_CSS specificity, and late/rebuild ResizeObserver rebind', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { performance } = require('node:perf_hooks');

  // Helper to mount a stage with controllable ResizeObserver + rAF
  const createStageHarness = (initW, opts = {}) => {
    let roCb = null;
    let curW = initW;
    const rafQueue = [];
    const winListeners = new Map();
    const prevRO = globalThis.ResizeObserver;
    class TestRO {
      constructor(cb) { roCb = cb; }
      observe() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = TestRO;
    const mockWin = {
      devicePixelRatio: 1,
      ResizeObserver: TestRO,
      matchMedia: () => ({ matches: false }),
      requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; },
      cancelAnimationFrame() {},
      addEventListener(type, fn) {
        if (!winListeners.has(type)) winListeners.set(type, new Set());
        winListeners.get(type).add(fn);
      },
      removeEventListener(type, fn) { winListeners.get(type)?.delete(fn); },
    };
    const makeNode = (tag) => {
      const listeners = new Map(), attrs = new Map(), children = [];
      return {
        nodeType: 1,
        tagName: tag.toUpperCase(),
        ownerDocument: null,
        width: 96,
        height: 84,
        className: '',
        dataset: {},
        style: {},
        children,
        get firstChild() { return children[0] || null; },
        setAttribute(k, v) { attrs.set(k, String(v)); },
        getAttribute(k) { return attrs.get(k) ?? null; },
        removeAttribute(k) { attrs.delete(k); },
        appendChild(c) { children.push(c); return c; },
        removeChild(c) { const i = children.indexOf(c); if (i >= 0) children.splice(i, 1); return c; },
        getBoundingClientRect: () => ({ left: 0, top: 0, right: curW, bottom: 84, width: curW, height: 84 }),
        addEventListener(t, f) { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(f); },
        removeEventListener(t, f) { listeners.get(t)?.delete(f); },
        getContext: (k) => (k === '2d' ? { save() {}, restore() {}, setTransform() {}, clearRect() {}, beginPath() {}, rect() {}, clip() {}, translate() {}, scale() {}, rotate() {}, fillRect() {}, drawImage() {} } : null),
      };
    };
    const doc = {
      hidden: false,
      defaultView: mockWin,
      createElement(tag) { const n = makeNode(tag); n.ownerDocument = doc; return n; },
      addEventListener() {},
      removeEventListener() {},
    };
    const hostEl = doc.createElement('div');
    Object.setPrototypeOf(hostEl, { get clientWidth() { return curW; } });
    const stage = rig.mountDualMascotStage(hostEl, { miniPileEnabled: Boolean(opts.miniPileEnabled), reducedMotion: Boolean(opts.reducedMotion) });
    const resizeTo = (nextW) => {
      curW = nextW;
      roCb([{ contentRect: { width: nextW } }]);
      const q = rafQueue.splice(0);
      for (const fn of q) fn(performance.now());
    };
    const flushBallistic = async (steps = 90) => {
      let now = performance.now();
      for (let i = 0; i < steps && rafQueue.length > 0; i++) {
        now += 16.7;
        const q = rafQueue.splice(0);
        for (const fn of q) fn(now);
      }
    };
    const waitRebound = async (pred, maxMs = 1200) => {
      const deadline = Date.now() + maxMs;
      await new Promise((r) => setTimeout(r, 200));
      while (Date.now() < deadline) {
        await flushBallistic(100);
        if (!pred || pred(stage.getLayoutSnapshot())) return;
        await new Promise((r) => setTimeout(r, 25));
      }
      await flushBallistic(100);
    };
    const cleanup = () => {
      stage.dispose();
      globalThis.ResizeObserver = prevRO;
    };
    return { stage, resizeTo, flushBallistic, waitRebound, cleanup };
  };

  // ① reducedMotion: false wide screen (1100 -> 360 -> 1100) rebounds accurately without stalling at 351px
  {
    const h = createStageHarness(1100, { miniPileEnabled: false, reducedMotion: false });
    try {
      const snap0 = h.stage.getLayoutSnapshot();
      const cat0 = snap0.actors.find((a) => a.id === 'cat').x;
      const clawd0 = snap0.actors.find((a) => a.id === 'clawd').x;
      assert.ok(cat0 > 950 && clawd0 > 880, `Wide stage should place mascots near right edge (cat=${cat0}, clawd=${clawd0})`);

      h.resizeTo(360);
      const snapN = h.stage.getLayoutSnapshot();
      assert.ok(snapN.actors.find((a) => a.id === 'clawd').x <= 270, 'Clawd must push left at 360px');

      // Multi-step expand with debounce reset
      h.resizeTo(700);
      await new Promise((r) => setTimeout(r, 60));
      h.resizeTo(1100);
      await h.waitRebound((s) => {
        const cb = s.actors.find((a) => a.id === 'cat').x;
        const db = s.actors.find((a) => a.id === 'clawd').x;
        return Math.abs(cb - cat0) <= 2 && Math.abs(db - clawd0) <= 2;
      });

      const snapBack = h.stage.getLayoutSnapshot();
      const catBack = snapBack.actors.find((a) => a.id === 'cat').x;
      const clawdBack = snapBack.actors.find((a) => a.id === 'clawd').x;
      assert.ok(Math.abs(catBack - cat0) <= 2, `cat must rebound accurately on 1100px wide screen (${cat0} vs ${catBack})`);
      assert.ok(Math.abs(clawdBack - clawd0) <= 2, `clawd must rebound accurately on 1100px wide screen (${clawd0} vs ${clawdBack})`);
      assert.notEqual(snapBack.lastInteraction.type, 'ballisticBump', 'Rebound flights must not mid-air bump each other');
    } finally {
      h.cleanup();
    }
  }

  // ② Restore to narrower window (720 -> 360 -> 580): no overlap and no order inversion
  {
    const h = createStageHarness(720, { miniPileEnabled: false, reducedMotion: false });
    try {
      const snap0 = h.stage.getLayoutSnapshot();
      const cat0 = snap0.actors.find((a) => a.id === 'cat').x;
      const clawd0 = snap0.actors.find((a) => a.id === 'clawd').x;
      assert.ok(cat0 > clawd0, 'Baseline gemini camp puts cat right of clawd');

      h.resizeTo(360);
      const snapN = h.stage.getLayoutSnapshot();
      const clawdN = snapN.actors.find((a) => a.id === 'clawd').x;
      h.resizeTo(580);
      await h.waitRebound((s) => {
        const c1 = s.actors.find((a) => a.id === 'cat').x;
        const d1 = s.actors.find((a) => a.id === 'clawd').x;
        return d1 > clawdN + 60 && c1 - d1 >= 56;
      });

      const snap580 = h.stage.getLayoutSnapshot();
      const cat1 = snap580.actors.find((a) => a.id === 'cat').x;
      const clawd1 = snap580.actors.find((a) => a.id === 'clawd').x;
      assert.ok(cat1 - clawd1 >= 56, `Restoring to narrower 580px must preserve >= 56px gap without order flip (cat=${cat1}, clawd=${clawd1})`);
    } finally {
      h.cleanup();
    }
  }

  // ③ Mini-crab tower push/pull syncTower keeps exact worldCx without 16px left offset
  {
    const h = createStageHarness(720, { miniPileEnabled: true, reducedMotion: true });
    try {
      assert.equal(h.stage.stackOnto('cowboy', 'clawd'), true);
      h.resizeTo(360);
      const snapN = h.stage.getLayoutSnapshot();
      const clawdN = snapN.actors.find((a) => a.id === 'clawd');
      const cowboyN = snapN.minis.find((m) => m.id === 'cowboy');
      assert.ok(Math.abs(cowboyN.worldCx - clawdN.worldCx) <= 1, `Stacked mini crab worldCx (${cowboyN.worldCx}) must match clawd worldCx (${clawdN.worldCx}) during push`);

      h.resizeTo(720);
      await h.waitRebound((s) => s.actors.find((a) => a.id === 'clawd').x > clawdN.x + 100);
      const snapR = h.stage.getLayoutSnapshot();
      const clawdR = snapR.actors.find((a) => a.id === 'clawd');
      const cowboyR = snapR.minis.find((m) => m.id === 'cowboy');
      assert.ok(Math.abs(cowboyR.worldCx - clawdR.worldCx) <= 1, `Stacked mini crab worldCx (${cowboyR.worldCx}) must match clawd worldCx (${clawdR.worldCx}) after rebound`);
    } finally {
      h.cleanup();
    }
  }

  // ④ Verify TIER_CSS against real inline-widget.cjs CSS: never overrides .collection-label{display:none} or .card positioning
  {
    const widgetSrc = fs.readFileSync(require.resolve('../vendor/pulse-dashboard/compat/inline-widget.cjs'), 'utf8');
    assert.ok(widgetSrc.includes('.collection-label{display:none}'), 'Real inline-widget.cjs must hide .collection-label by default');
    assert.ok(widgetSrc.includes('.rounds,.group,.dot.live{display:none}'), 'Real inline-widget.cjs must hide .rounds/.group by default');
    assert.ok(widgetSrc.includes(':host(.icons-only) .chip>:not(svg):not(.context-ring){display:none}'), 'Real inline-widget.cjs must hide chip text in icons-only mode');

    const fbMod = require('../vendor/pulse-dashboard/inline-fallback.js');
    let injectedTierCss = '';
    const barAttrs = new Map();
    const ftAttrs = new Map();
    const extBar = {
      id: 'ag-pulse-status-bar',
      isConnected: true,
      hidden: false,
      shadowRoot: {
        querySelector: () => null,
        appendChild(el) { if (el?.textContent) injectedTierCss = el.textContent; },
      },
      getAttribute: (k) => barAttrs.get(k) ?? null,
      setAttribute: (k, v) => barAttrs.set(k, String(v)),
      removeAttribute: (k) => barAttrs.delete(k),
      getBoundingClientRect: () => ({ width: 180, height: 24 }),
    };
    const ft = {
      isConnected: true,
      getAttribute: (k) => ftAttrs.get(k) ?? null,
      setAttribute: (k, v) => ftAttrs.set(k, String(v)),
      removeAttribute: (k) => ftAttrs.delete(k),
      getBoundingClientRect: () => ({ width: 420, height: 30 }),
    };
    const pDoc = {
      hidden: false,
      documentElement: { getAttribute: () => 'zh-CN' },
      body: {},
      createElement: (tag) => ({ tagName: tag, setAttribute() {}, textContent: '' }),
      querySelector: (sel) => (sel.includes('agy-composer-footer') ? ft : sel.includes('conversation-view') ? {} : null),
      querySelectorAll: (sel) => (sel.includes('ag-pulse-status-bar') ? [extBar] : []),
      contains: () => true,
    };
    const pWin = {
      document: pDoc,
      location: { pathname: '/c/11111111-2222-3333-4444-555555555555' },
      ResizeObserver: class { observe() {} disconnect() {} },
      addEventListener() {},
      removeEventListener() {},
    };
    const ctl = fbMod.createTelemetryController({ window: pWin, document: pDoc });
    ctl.sync({ telemetryModule: 'auto', language: 'zh-CN' });
    assert.ok(injectedTierCss.includes(':where(.bar>.chip>*:not(.context-ring):not(svg))'), 'TIER_CSS must downgrade chip children with :where() (0,0,0 specificity)');
    assert.ok(injectedTierCss.includes('[hidden]{display:none!important}'), 'TIER_CSS must reinforce [hidden]{display:none!important}');
    assert.equal(injectedTierCss.includes('display:inline-flex'), false, 'TIER_CSS must not inject display:inline-flex onto external widget children');
    assert.equal(injectedTierCss.includes(':host([data-t~="4"]) .card'), false, 'TIER_CSS must not override external fixed .card positioning');
    ctl.destroy();
  }

  // ⑤ External bar late mount + SPA session switch rebuilding footer triggers ResizeObserver rebind & style[data-pt="1"] re-injection
  {
    const fbMod = require('../vendor/pulse-dashboard/inline-fallback.js');
    const observedEls = [];
    let disconnectedCount = 0;
    let moCb = null;
    class TrackRO {
      constructor(cb) { this.cb = cb; }
      observe(el) { observedEls.push(el); }
      disconnect() { disconnectedCount++; }
    }
    class FakeMO {
      constructor(cb) { moCb = cb; }
      observe() {}
      disconnect() {}
    }
    const mkFt = (w) => {
      const attrs = new Map();
      return {
        isConnected: true,
        className: 'agy-composer-footer',
        children: [],
        getAttribute: (k) => attrs.get(k) ?? null,
        setAttribute: (k, v) => attrs.set(k, String(v)),
        removeAttribute: (k) => attrs.delete(k),
        getBoundingClientRect: () => ({ width: w, height: 30 }),
        appendChild(c) { this.children.push(c); c.parentElement = this; },
        closest: () => null,
      };
    };
    const mkExtBar = (id) => {
      const attrs = new Map();
      let styleNode = null;
      return {
        id,
        isConnected: true,
        hidden: false,
        shadowRoot: {
          querySelector: (sel) => (sel.includes('data-pt') ? styleNode : null),
          appendChild(el) { styleNode = el; },
        },
        getAttribute: (k) => attrs.get(k) ?? null,
        setAttribute: (k, v) => attrs.set(k, String(v)),
        removeAttribute: (k) => attrs.delete(k),
        getBoundingClientRect: () => ({ width: 180, height: 24 }),
        hasStyle() { return Boolean(styleNode); },
      };
    };

    let activeFt = mkFt(500);
    let activeBar = null; // External bar not mounted yet at sync()!
    const pDoc = {
      hidden: false,
      documentElement: { getAttribute: () => 'zh-CN' },
      body: {},
      createElement: (tag) => ({ tagName: tag, setAttribute() {}, textContent: '' }),
      querySelector: (sel) => (sel.includes('agy-composer-footer') ? activeFt : sel.includes('conversation-view') ? {} : null),
      querySelectorAll: (sel) => (sel.includes('ag-pulse-status-bar') && activeBar ? [activeBar] : []),
      contains: () => true,
    };
    const pWin = {
      document: pDoc,
      location: { pathname: '/c/11111111-2222-3333-4444-555555555555' },
      ResizeObserver: TrackRO,
      MutationObserver: FakeMO,
      addEventListener() {},
      removeEventListener() {},
    };
    const ctl = fbMod.createTelemetryController({ window: pWin, document: pDoc });
    ctl.sync({ telemetryModule: 'auto', language: 'zh-CN', __fallbackDelayMs: 40 });
    // External bar mounts right before waitTimerDone fires
    activeBar = mkExtBar('ag-pulse-status-bar-1');
    await new Promise((r) => setTimeout(r, 70));
    assert.equal(observedEls[0], activeFt, 'waitTimerDone() yielding to late external bar must bind ResizeObserver to footer');
    assert.equal(activeBar.hasStyle(), true, 'Late external bar must receive TIER_CSS style[data-pt="1"]');

    // Simulate SPA conversation switch: old footer detached, new footer + fresh external bar mounted
    activeFt.isConnected = false;
    const newFt = mkFt(340);
    const newBar = mkExtBar('ag-pulse-status-bar-2');
    activeFt = newFt;
    activeBar = newBar;
    moCb([{ target: pDoc.body }]);
    await new Promise((r) => setTimeout(r, 80));

    assert.ok(disconnectedCount >= 1, 'Session switch rebuilding footer must disconnect stale ResizeObserver');
    assert.equal(observedEls[observedEls.length - 1], newFt, 'Session switch must rebind ResizeObserver to rebuilt footer');
    assert.equal(newBar.hasStyle(), true, 'Rebuilt external bar must receive style[data-pt="1"]');
    assert.equal(newFt.getAttribute('data-t'), '1 2 3 4 5', 'Rebuilt narrow footer must immediately compute tier 5');
    ctl.destroy();
  }
});

test('Issue #2/#4/#5 regressions: RLE fillRect batching pixel-equivalence, tier-3 write animation, Cat sleep 100% static cache hit, and win-blur 0fps pause/wake', async () => {
  // 1) RLE batching significantly cuts fillRect & fillStyle calls while producing 100% identical per-pixel output
  const makeRaster = (w, h) => {
    const grid = Array.from({ length: h }, () => Array(w).fill(''));
    let fillRectCalls = 0;
    let fillStyleWrites = 0;
    let curFill = '';
    const ctx = {
      get fillStyle() { return curFill; },
      set fillStyle(v) { curFill = String(v); fillStyleWrites += 1; },
      fillRect(x, y, rw, rh) {
        fillRectCalls += 1;
        for (let py = y; py < y + rh; py++) {
          if (py < 0 || py >= h) continue;
          for (let px = x; px < x + rw; px++) {
            if (px >= 0 && px < w) grid[py][px] = curFill;
          }
        }
      },
    };
    return { grid, ctx, stats: () => ({ fillRectCalls, fillStyleWrites }) };
  };

  const drawNaive = (ctx, oxGrid, oyGrid, pxSize, palette, layers, colorResolver = null) => {
    for (const part of layers) {
      if (!part || !part.rows || !part.rows.length) continue;
      for (let ry = 0; ry < part.rows.length; ry++) {
        const row = part.rows[ry];
        for (let rx = 0; rx < row.length; rx++) {
          const ch = row[rx];
          if (ch === '.' || ch === ' ') continue;
          const gx = part.ox + rx;
          const gy = part.oy + ry;
          const color = colorResolver ? colorResolver(ch, gx, gy, palette) : palette[ch];
          if (!color) continue;
          ctx.fillStyle = color;
          ctx.fillRect((oxGrid + gx) * pxSize, (oyGrid + gy) * pxSize, pxSize, pxSize);
        }
      }
    }
  };

  let totalNaiveRects = 0;
  let totalRleRects = 0;
  let totalNaiveFills = 0;
  let totalRleFills = 0;
  for (const kind of ['clawd', 'cat']) {
    for (const pose of ['idle', 'write', 'sleep', 'walk', 'onFire', 'cheerSticks']) {
      const layers = rig.buildClipLayers(kind, pose, 3, { clipTick: 3 });
      const resolver =
        kind === 'cat' && pose === 'idle'
          ? (ch, gx, gy, pal) =>
              ch === '#'
                ? rig.evalChromaColorAt(gx, gy, 0.25, false)
                : ch === 's'
                  ? rig.evalChromaColorAt(gx, gy, 0.25, true)
                  : pal[ch]
          : null;
      const rNaive = makeRaster(96, 84);
      const rRle = makeRaster(96, 84);
      drawNaive(rNaive.ctx, 8, 17, 3, rig.PALETTES[kind], layers, resolver);
      rig.drawLayerSet(rRle.ctx, 8, 17, 3, rig.PALETTES[kind], layers, resolver);
      assert.deepEqual(rRle.grid, rNaive.grid, `RLE pixel grid must match cell-by-cell draw 100% for ${kind}:${pose}`);
      if (!resolver) {
        totalNaiveRects += rNaive.stats().fillRectCalls;
        totalRleRects += rRle.stats().fillRectCalls;
        totalNaiveFills += rNaive.stats().fillStyleWrites;
        totalRleFills += rRle.stats().fillStyleWrites;
      }
    }
  }
  for (const id of ['cowboy', 'shades', 'wizard']) {
    const layers = [rig.MINI_SPRITES[id]];
    const rNaive = makeRaster(40, 32);
    const rRle = makeRaster(40, 32);
    drawNaive(rNaive.ctx, 2, 5, 2, rig.PALETTES[id], layers);
    rig.drawLayerSet(rRle.ctx, 2, 5, 2, rig.PALETTES[id], layers);
    assert.deepEqual(rRle.grid, rNaive.grid, `RLE mini-crab pixel grid must match 100% for ${id}`);
    totalNaiveRects += rNaive.stats().fillRectCalls;
    totalRleRects += rRle.stats().fillRectCalls;
  }
  assert.ok(totalRleRects < totalNaiveRects * 0.35, `Expected >65% fillRect reduction (${totalRleRects} vs ${totalNaiveRects})`);
  assert.ok(totalRleFills < totalNaiveFills * 0.15, `Expected >85% fillStyle reduction (${totalRleFills} vs ${totalNaiveFills})`);

  // 2) Cat 'sleep' pose keeps static tail across all ticks so static frame cache hits 100%
  const sleepRef = rig.buildClipLayers('cat', 'sleep', 0);
  for (let t = 1; t <= 16; t++) {
    assert.deepEqual(
      rig.buildClipLayers('cat', 'sleep', t),
      sleepRef,
      `Cat sleep layers must not flip tail at tick=${t}`
    );
  }

  // 3) Live stage: Cached 2D context, write pose streamTier===3 frame alternation, Cat sleep 0 redraws, and win-blur 0fps pause/wake
  let getCtxCalls = 0;
  let catClears = 0;
  const winListeners = new Map();
  let moCb = null;
  let moDisconnected = false;
  const htmlAttrs = new Map();
  const mockHtml = {
    getAttribute: (k) => (htmlAttrs.has(k) ? htmlAttrs.get(k) : null),
    setAttribute(k, v) { htmlAttrs.set(k, String(v)); if (moCb) moCb([{ attributeName: k }]); },
    removeAttribute(k) { htmlAttrs.delete(k); if (moCb) moCb([{ attributeName: k }]); },
  };
  const mockWin = {
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    MutationObserver: class {
      constructor(cb) { moCb = cb; }
      observe() {}
      disconnect() { moDisconnected = true; }
    },
    addEventListener(t, fn) {
      if (!winListeners.has(t)) winListeners.set(t, new Set());
      winListeners.get(t).add(fn);
    },
    removeEventListener(t, fn) { winListeners.get(t)?.delete(fn); },
    dispatch(t) { for (const fn of [...(winListeners.get(t) || [])]) fn({ type: t }); },
  };
  const makeEl = (tag) => {
    const attrs = new Map();
    const listeners = new Map();
    const children = [];
    const el = {
      tagName: tag.toUpperCase(),
      ownerDocument: null,
      parentNode: null,
      clientWidth: 720,
      width: 96,
      height: 84,
      className: '',
      dataset: {},
      style: {},
      children,
      get firstChild() { return children[0] || null; },
      setAttribute(k, v) { attrs.set(k, String(v)); },
      getAttribute(k) { return attrs.get(k) ?? null; },
      removeAttribute(k) { attrs.delete(k); },
      appendChild(c) { c.parentNode = el; children.push(c); return c; },
      removeChild(c) { const i = children.indexOf(c); if (i >= 0) children.splice(i, 1); return c; },
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 720, bottom: 84, width: 720, height: 84 }),
      addEventListener(t, fn) { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(fn); },
      removeEventListener(t, fn) { listeners.get(t)?.delete(fn); },
      getContext(kind) {
        if (kind !== '2d') return null;
        getCtxCalls += 1;
        return {
          imageSmoothingEnabled: false,
          fillStyle: '',
          save() {}, restore() {}, setTransform() {},
          clearRect() {
            if (el.parentNode?.getAttribute?.('data-mascot-id') === 'cat') catClears += 1;
          },
          beginPath() {}, rect() {}, clip() {}, translate() {}, scale() {}, rotate() {}, fillRect() {}, drawImage() {},
        };
      },
    };
    return el;
  };
  const mockDoc = {
    hidden: false,
    documentElement: mockHtml,
    defaultView: mockWin,
    createElement(t) { const n = makeEl(t); n.ownerDocument = mockDoc; return n; },
    addEventListener() {},
    removeEventListener() {},
  };
  const host = mockDoc.createElement('div');
  const stage = rig.mountDualMascotStage(host, {
    camp: 'gemini',
    streaming: true,
    streamTier: 3,
    miniPileEnabled: true,
    reducedMotion: false,
  });

  try {
    const initialCtxCalls = getCtxCalls;
    assert.equal(initialCtxCalls, 6, 'Should acquire 2D context exactly once for 2 main actors + 3 mini crabs + 1 static habitat prop');

    // Verify streamTier === 3 write pose alternates frames across ticks instead of freezing on even localTick
    const seenWriteFrames = new Set([
      stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat').renderCache.frameIdx,
    ]);
    await new Promise((r) => setTimeout(r, 240));
    seenWriteFrames.add(stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat').renderCache.frameIdx);
    await new Promise((r) => setTimeout(r, 110));
    seenWriteFrames.add(stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat').renderCache.frameIdx);
    assert.ok(seenWriteFrames.size >= 2, 'write pose at streamTier===3 must alternate frames smoothly instead of freezing');
    assert.equal(getCtxCalls, initialCtxCalls, 'Cached _ctx must avoid redundant canvas.getContext("2d") calls across ticks');

    // Enter doze sleep (stop streaming) -> Cat sleep pose hits static frame cache 100% across consecutive doze ticks
    stage.setState({ streaming: false });
    stage.triggerDemo('doze');
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 400);
    const catClearsAtSleepStart = catClears;
    const skipsAtSleepStart = stage.getLayoutSnapshot().perf.canvasSkips;
    await new Promise((r) => setTimeout(r, 860)); // ~2 doze ticks within same Zzz phase
    assert.equal(catClears, catClearsAtSleepStart, 'Cat sleep must hit static frame cache with 0 Canvas clearRect redraws');
    assert.ok(stage.getLayoutSnapshot().perf.canvasSkips >= skipsAtSleepStart + 2, 'Cat & Clawd sleep must increment canvasSkips');

    // macOS data-ag-cs-win-blur="1" -> pauses heartbeat to 0fps even from doze state, and removal restores 100ms TICK!
    mockHtml.setAttribute('data-ag-cs-win-blur', '1');
    const blurSnap = stage.getLayoutSnapshot();
    assert.equal(blurSnap.perf.timerIntervalMs, 0, 'data-ag-cs-win-blur="1" must stop mascot timer to 0fps');
    assert.equal(blurSnap.perf.timerPaused, true);
    const tickAtBlur = blurSnap.actors[0].tick;
    await new Promise((r) => setTimeout(r, 230));
    assert.equal(stage.getLayoutSnapshot().actors[0].tick, tickAtBlur, 'Zero ticks may fire while data-ag-cs-win-blur="1"');

    mockHtml.removeAttribute('data-ag-cs-win-blur');
    const wokeSnap = stage.getLayoutSnapshot();
    assert.equal(wokeSnap.perf.timerIntervalMs, 100, 'Removing data-ag-cs-win-blur must immediately restore 100ms TICK');
    assert.equal(wokeSnap.perf.timerPaused, false);

    // Direct window.blur / window.focus events also pause to 0fps and wake back to 100ms TICK
    mockWin.dispatch('blur');
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 0);
    assert.equal(stage.getLayoutSnapshot().perf.timerPaused, true);
    mockWin.dispatch('focus');
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 100);
    assert.equal(stage.getLayoutSnapshot().perf.timerPaused, false);
  } finally {
    stage.dispose();
  }
  assert.equal(moDisconnected, true, 'dispose() must disconnect win-blur MutationObserver');
  assert.equal(winListeners.get('blur')?.size || 0, 0, 'dispose() must unbind window blur listeners');
  assert.equal(winListeners.get('focus')?.size || 0, 0, 'dispose() must unbind window focus listeners');
});

test('WO-MAIN-001A pixel audit: all grounded poses have maxY=9 with zero row gaps, missing sprites filled, dead frames removed, peek/letter unoccluded', () => {
  assert.equal(rig.CLAWD_PARTS.clawL.low, undefined, 'Dead frame clawL.low must be removed');
  assert.equal(rig.CLAWD_PARTS.clawR.reach2, undefined, 'Dead frame clawR.reach2 must be removed');
  for (const k of ['laser0', 'laser1', 'laser2']) {
    assert.ok(rig.PROPS[k]?.rows?.length >= 2 && rig.PROPS[k].grounded === true, `Expected grounded PROPS.${k}`);
  }
  for (const k of ['fireSpark0', 'fireSpark1', 'fireSpark2']) {
    assert.ok(rig.SYMS[k]?.rows?.length >= 3, `Expected SYMS.${k}`);
  }
  assert.equal(rig.CLAWD_PARTS.clawL.peekGrip.ox, 1);
  assert.equal(rig.CLAWD_PARTS.clawR.peekGrip.ox, 13);
  assert.equal(rig.CAT_PARTS.paws.peekGrip.ox, 1);
  assert.ok(rig.PROPS.letter.ox >= 14, 'PROPS.letter must not occlude face/eyes');

  // Cowboy trick aligned to same ground baseline maxY=5 as cowboy/shades/wizard
  for (const id of ['cowboy', 'shades', 'wizard']) {
    const base = rig.MINI_SPRITES[id];
    const trick = rig.MINI_ANIM_FRAMES[id].trick;
    assert.equal(base.oy + base.rows.length - 1, 5, `${id} base must align maxY=5`);
    assert.equal(trick.oy + trick.rows.length - 1, 5, `${id} trick must align maxY=5`);
  }

  const propSet = new Set([...Object.values(rig.PROPS), ...Object.values(rig.SYMS)]);
  const groundedPoses = [
    'idle', 'squash', 'sleep', 'walk', 'write', 'pet', 'happy', 'jiggle', 'angry', 'tilt', 'wow', 'sulk',
    'polish', 'eat', 'eatFish', 'letter', 'plant', 'butterfly', 'stretch', 'spinHop', 'onFire',
    'cheerSticks', 'rickroll', 'siren', 'chatGreet', 'lookNod', 'readAlong', 'balance', 'yawn',
    'wave', 'gaze', 'worry', 'salute', 'carry', 'yawnStretch',
  ];
  for (const kind of ['clawd', 'cat']) {
    const poses = kind === 'cat' ? [...groundedPoses, 'loaf', 'groom', 'chaseDot', 'catStretch'] : groundedPoses;
    for (const pose of poses) {
      for (const tick of [0, 1, 2, 3, 5, 7, 10, 15, 22, 26, 32]) {
        const layers = rig.buildClipLayers(kind, pose, tick, { clipTick: tick, dir: 'right' });
        const ys = new Set();
        let minY = 99;
        let maxY = -99;
        for (const l of layers) {
          if (!l || l.grounded || propSet.has(l)) continue;
          for (let ry = 0; ry < l.rows.length; ry++) {
            if (/[^. ]/.test(l.rows[ry])) {
              const y = l.oy + ry;
              ys.add(y);
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        assert.equal(maxY, 9, `${kind}:${pose}@${tick} must touch ground y=9, got ${maxY}`);
        for (let y = minY; y <= maxY; y++) {
          assert.ok(ys.has(y), `${kind}:${pose}@${tick} has horizontal row gap at y=${y}`);
        }
      }
    }
  }
});

test('WO-MAIN-001A state-machine reset, poke-2 cancel, host-sleep/blur/chat 0fps halt, and workbench demo/inspect APIs', () => {
  const rootAttrs = new Map();
  const makeEl = (tag) => {
    const attrs = new Map();
    const listeners = new Map();
    const children = [];
    const ctx = {
      setTransform() {}, clearRect() {}, save() {}, restore() {}, translate() {},
      scale() {}, rotate() {}, beginPath() {}, rect() {}, clip() {}, fillRect() {}, drawImage() {},
    };
    return {
      tagName: String(tag).toUpperCase(),
      clientWidth: 720, width: 96, height: 84, className: '', dataset: {},
      style: { display: '', zIndex: '', transform: '', transition: '', cursor: '' },
      children,
      setAttribute(k, v) { attrs.set(k, String(v)); },
      getAttribute(k) { return attrs.get(k) ?? null; },
      hasAttribute(k) { return attrs.has(k); },
      removeAttribute(k) { attrs.delete(k); },
      appendChild(ch) { children.push(ch); ch.parentNode = this; return ch; },
      removeChild(ch) { const i = children.indexOf(ch); if (i >= 0) children.splice(i, 1); },
      addEventListener(t, fn) { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(fn); },
      removeEventListener(t, fn) { listeners.get(t)?.delete(fn); },
      getContext() { return ctx; },
      getBoundingClientRect() { return { left: 0, right: 96, top: 0, bottom: 84, width: 96, height: 84 }; },
    };
  };
  const doc = {
    hidden: false,
    documentElement: {
      setAttribute(k, v) { rootAttrs.set(k, String(v)); },
      getAttribute(k) { return rootAttrs.get(k) ?? null; },
      hasAttribute(k) { return rootAttrs.has(k); },
      removeAttribute(k) { rootAttrs.delete(k); },
    },
    defaultView: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {} },
    createElement(tag) { const n = makeEl(tag); n.ownerDocument = doc; return n; },
    addEventListener() {},
    removeEventListener() {},
  };
  const hostEl = doc.createElement('div');
  const stage = rig.mountDualMascotStage(hostEl, { miniPileEnabled: true, reducedMotion: false });

  try {
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 100);

    // 1. host-sleep pauses heartbeat to 0fps immediately
    stage.notify('host-sleep', { sleep: true });
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 0);
    assert.equal(stage.getLayoutSnapshot().perf.timerPaused, true);
    stage.notify('host-sleep', { sleep: false });
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 100);

    // 2. data-ag-cs-win-blur attribute forces 0fps on sync
    doc.documentElement.setAttribute('data-ag-cs-win-blur', '1');
    stage.notify('activity');
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 0);
    doc.documentElement.removeAttribute('data-ag-cs-win-blur');
    stage.notify('activity');
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 100);

    // 3. data-ag-prism-mode="chat" forces 0fps on sync
    doc.documentElement.setAttribute('data-ag-prism-mode', 'chat');
    stage.notify('activity');
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 0);
    doc.documentElement.removeAttribute('data-ag-prism-mode');
    stage.notify('activity');
    assert.equal(stage.getLayoutSnapshot().perf.timerIntervalMs, 100);

    // 4. Cross-interrupt cleanup & poke-2 jiggle cancels pending bounce
    stage.poke('cat');
    stage.poke('cat');
    assert.equal(stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat').pose, 'jiggle');
    stage.poke('cat');
    assert.equal(stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat').rot, -9);
    stage.triggerDemo('unstack');
    assert.equal(stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat').rot, 0);

    // 5. All workbench demo branches + inspectPose / stepTick / listPoses
    for (const cmd of ['campSwitch', 'streamDone', 'crabRide', 'bump', 'passBy', 'theater']) {
      assert.doesNotThrow(() => stage.triggerDemo(cmd), `triggerDemo(${cmd}) must not throw`);
    }
    assert.ok(stage.listPoses().includes('chaseDot') && stage.listPoses().includes('yawnStretch'));
    const st = stage.inspectPose({ pose: 'sulk', tick: 5, mirror: true, sqW: 1, sqH: -1, ruler: true });
    assert.equal(st.pose, 'sulk');
    assert.equal(stage.stepTick(1), 6);
    stage.inspectPose({ active: false });
  } finally {
    stage.dispose();
  }
});

test('WO-MAIN-001B: 9 Slash theaters, 4 contextual links, habitat 3-mode 0fps prop, feed donut/coffee sulk-reset, and all new poses maxY=9', () => {
  // 1. All 13 new poses grounded at maxY=9 with zero row gaps
  const propSet = new Set([...Object.values(rig.PROPS), ...Object.values(rig.SYMS)]);
  const newPoses = [
    'slashPlan', 'slashGoal', 'slashBoost', 'slashTeam', 'slashBrowser', 'slashCompact',
    'slashSchedule', 'slashGrill', 'slashLearnBook', 'slashLearnBulb',
    'nightSip', 'feedDonut', 'feedCoffee',
  ];
  for (const kind of ['clawd', 'cat']) {
    for (const pose of newPoses) {
      for (const tick of [0, 1, 5, 10, 16, 20]) {
        const layers = rig.buildClipLayers(kind, pose, tick, { clipTick: tick, dir: 'right' });
        const ys = new Set();
        let minY = 99, maxY = -99;
        for (const l of layers) {
          if (!l || l.grounded || propSet.has(l)) continue;
          for (let ry = 0; ry < l.rows.length; ry++) {
            if (/[^. ]/.test(l.rows[ry])) {
              const y = l.oy + ry;
              ys.add(y);
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        assert.equal(maxY, 9, `New pose ${kind}:${pose}@${tick} must touch y=9, got ${maxY}`);
        for (let y = minY; y <= maxY; y++) assert.ok(ys.has(y), `New pose ${kind}:${pose}@${tick} gap at y=${y}`);
      }
    }
  }

  // 2. Interactive test: all 9 slash cmds, feed donut/coffee clearing sulk, habitat 3 states, contextual notifications
  let habDraws = 0;
  const makeEl = (tag) => {
    const attrs = new Map();
    const listeners = new Map();
    const children = [];
    let isHab = false;
    const ctx = {
      setTransform() {}, clearRect() { if (isHab) habDraws += 1; }, save() {}, restore() {},
      translate() {}, scale() {}, rotate() {}, beginPath() {}, rect() {}, clip() {}, fillRect() {}, drawImage() {},
    };
    const node = {
      tagName: String(tag).toUpperCase(),
      clientWidth: 720, width: 96, height: 84, dataset: {},
      style: { display: '', zIndex: '', transform: '', transition: '', cursor: '' },
      children,
      set className(v) { this._cls = v; isHab = v === 'ag-v2-habitat-prop'; },
      get className() { return this._cls || ''; },
      setAttribute(k, v) { attrs.set(k, String(v)); },
      getAttribute(k) { return attrs.get(k) ?? null; },
      hasAttribute(k) { return attrs.has(k); },
      removeAttribute(k) { attrs.delete(k); },
      appendChild(ch) { children.push(ch); ch.parentNode = this; return ch; },
      removeChild(ch) { const i = children.indexOf(ch); if (i >= 0) children.splice(i, 1); },
      addEventListener(t, fn) { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(fn); },
      removeEventListener(t, fn) { listeners.get(t)?.delete(fn); },
      dispatch(t, ev = {}) {
        const e = { button: 0, altKey: false, preventDefault() {}, stopPropagation() {}, ...ev };
        for (const fn of listeners.get(t) || []) fn(e);
      },
      getContext() { return ctx; },
      getBoundingClientRect() { return { left: 0, right: 96, top: 0, bottom: 84, width: 96, height: 84 }; },
    };
    return node;
  };
  const doc = {
    hidden: false,
    documentElement: { getAttribute: () => null, hasAttribute: () => false },
    defaultView: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {} },
    createElement(tag) { const n = makeEl(tag); n.ownerDocument = doc; return n; },
    addEventListener() {},
    removeEventListener() {},
  };
  const hostEl = doc.createElement('div');
  const stage = rig.mountDualMascotStage(hostEl, { miniPileEnabled: true, reducedMotion: true });

  try {
    const habEl = hostEl.children.find((n) => n.className === 'ag-v2-habitat-prop');
    assert.ok(habEl, 'Expected .ag-v2-habitat-prop canvas mounted in stage');
    assert.equal(habDraws, 1, 'Habitat prop must draw exactly 1 static frame at mount (0fps idle)');

    // Test all 9 slash commands + /swarm alias
    for (const cmd of ['plan', 'goal', 'boost', 'teamwork', 'swarm', 'browser', 'compact', 'schedule', 'grill-me', 'learn']) {
      stage.notify('slash-cmd', { cmd });
      const snap = stage.getLayoutSnapshot();
      assert.ok(snap.lastInteraction.type.startsWith('slash:'), `Expected slash interaction for /${cmd}`);
    }
    // /schedule activates 30-min hourglass watch mode on habitat prop
    assert.equal(stage.getLayoutSnapshot().habitat.mode, 'hourglass');
    assert.equal(stage.getLayoutSnapshot().habitat.scheduleActive, true);
    assert.equal(stage.setHabitatPreview('lamp'), 'lamp');
    assert.equal(stage.setHabitatPreview('cactus'), 'cactus');
    assert.equal(stage.setHabitatPreview('auto'), 'hourglass');

    // Contextual notifications: effort-tier, vial-high, aura-complete
    stage.notify('effort-tier', { tier: 'high' });
    assert.equal(stage.getLayoutSnapshot().lastInteraction.type, 'effort-tier:high');
    stage.notify('vial-high', { fraction: 0.82 });
    assert.equal(stage.getLayoutSnapshot().lastInteraction.type, 'vial-high');
    stage.notify('aura-complete', { durationMs: 20000 });
    assert.equal(stage.getLayoutSnapshot().lastInteraction.type, 'aura-complete');

    // Feed donut (contextmenu) & coffee (Alt+pointerdown) immediately clear pokeCount & sulk
    const catEl = hostEl.children.find((n) => n.getAttribute('data-mascot-id') === 'cat');
    for (let i = 0; i < 5; i++) stage.poke('cat');
    assert.equal(stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat').pose, 'sulk');
    catEl.dispatch('contextmenu', { button: 2 });
    const afterDonut = stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat');
    assert.equal(afterDonut.pose, 'feedDonut');
    assert.equal(afterDonut.pokeCount, 0);

    stage.poke('cat');
    assert.equal(stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat').pokeCount, 1);
    catEl.dispatch('pointerdown', { button: 0, altKey: true });
    const afterCoffee = stage.getLayoutSnapshot().actors.find((a) => a.id === 'cat');
    assert.equal(afterCoffee.pose, 'feedCoffee');
    assert.equal(afterCoffee.pokeCount, 0);
  } finally {
    stage.dispose();
  }
});

test('Quad mascot mode: GPT White Dragon & DeepSeek Whale sprites, 4-camp handoff, 7-tier stacking, hot quad toggle, and config schema', () => {
  assert.ok(rig.DRAGON_PARTS?.body?.stand, 'DRAGON_PARTS should be exported with body.stand');
  assert.ok(rig.WHALE_PARTS?.body?.stand, 'WHALE_PARTS should be exported with body.stand');
  assert.ok(rig.PALETTES.dragon && rig.PALETTES.whale, 'PALETTES must include dragon and whale');

  // 1. Every pose across all 4 species resolves valid palette keys and grounded maxY <= 9
  const checkPoses = ['idle', 'walk', 'happy', 'sleep', 'loaf', 'squash', 'flat', 'peek', 'angry', 'dragonFlame', 'whaleSpout', 'slashBoost'];
  for (const kind of ['clawd', 'cat', 'dragon', 'whale']) {
    const pal = rig.PALETTES[kind];
    for (const pose of checkPoses) {
      for (let t = 0; t < 4; t++) {
        const layers = rig.buildClipLayers(kind, pose, t, { clipTick: t, noShadow: pose === 'peek' });
        assert.ok(layers.length > 0, `${kind}:${pose}@${t} must emit layers`);
        let maxY = -99;
        for (const l of layers) {
          for (let r = 0; r < (l.rows || []).length; r++) {
            const row = l.rows[r];
            for (let i = 0; i < row.length; i++) {
              const ch = row[i];
              if (ch === '.' || ch === ' ') continue;
              assert.ok(pal[ch], `Missing palette key '${ch}' for ${kind}:${pose}@${t}`);
              if (!l.grounded && l.oy + r > maxY) maxY = l.oy + r;
            }
          }
        }
        if (pose !== 'peek' && pose !== 'walk') {
          assert.ok(maxY <= 9, `${kind}:${pose}@${t} exceeded ground baseline maxY=${maxY}`);
        }
      }
    }
  }

  // 2. Quad mount, 4-camp leadership, 4-tier/7-tier stacking, and lossless hot toggle quad <-> dual
  const makeEl = (tag) => {
    const attrs = new Map();
    const listeners = new Map();
    const children = [];
    const ctx = {
      setTransform() {}, clearRect() {}, save() {}, restore() {},
      translate() {}, scale() {}, rotate() {}, beginPath() {}, rect() {}, clip() {}, fillRect() {}, drawImage() {},
    };
    const node = {
      tagName: String(tag).toUpperCase(),
      clientWidth: 760, width: 96, height: 84, dataset: {},
      style: { display: '', zIndex: '', transform: '', transition: '', cursor: '' },
      children,
      setAttribute(k, v) { attrs.set(k, String(v)); },
      getAttribute(k) { return attrs.get(k) ?? null; },
      hasAttribute(k) { return attrs.has(k); },
      removeAttribute(k) { attrs.delete(k); },
      appendChild(ch) { children.push(ch); ch.parentNode = this; return ch; },
      insertBefore(ch, ref) {
        const idx = children.indexOf(ref);
        if (idx >= 0) children.splice(idx, 0, ch);
        else children.push(ch);
        ch.parentNode = this;
        return ch;
      },
      removeChild(ch) { const i = children.indexOf(ch); if (i >= 0) children.splice(i, 1); },
      remove() { this.parentNode?.removeChild?.(this); },
      addEventListener(t, fn) { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(fn); },
      removeEventListener(t, fn) { listeners.get(t)?.delete(fn); },
      getContext() { return ctx; },
      getBoundingClientRect() { return { left: 0, right: 96, top: 0, bottom: 84, width: 96, height: 84 }; },
    };
    return node;
  };
  const doc = {
    hidden: false,
    documentElement: { getAttribute: () => null, hasAttribute: () => false },
    defaultView: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {} },
    createElement(tag) { const n = makeEl(tag); n.ownerDocument = doc; return n; },
    addEventListener() {},
    removeEventListener() {},
  };
  const hostEl = doc.createElement('div');
  const stage = rig.mountDualMascotStage(hostEl, { quadEnabled: true, miniPileEnabled: true, camp: 'gpt', reducedMotion: true });
  try {
    let snap = stage.getLayoutSnapshot();
    assert.equal(snap.quadEnabled, true);
    assert.equal(snap.camp, 'gpt');
    assert.deepEqual(snap.actors.map((a) => a.id), ['cat', 'clawd', 'dragon', 'whale']);
    const actorNodes = hostEl.children.filter((n) => n.className === 'ag-v2-mascot-actor');
    assert.equal(actorNodes.length, 4, 'Quad mode must mount 4 main actor DOM elements');

    // Camp switch to deepseek moves whale into leader slot
    stage.setState({ camp: 'deepseek' });
    snap = stage.getLayoutSnapshot();
    assert.equal(snap.camp, 'deepseek');

    // 7-tier totem stacking across 4 mains + 3 mini crabs
    assert.equal(stage.stackOnto('cat', 'clawd'), true);
    assert.equal(stage.stackOnto('dragon', 'cat'), true);
    assert.equal(stage.stackOnto('whale', 'dragon'), true);
    assert.equal(stage.stackOnto('cowboy', 'whale'), true);
    assert.equal(stage.stackOnto('shades', 'cowboy'), true);
    assert.equal(stage.stackOnto('wizard', 'shades'), true);
    snap = stage.getLayoutSnapshot();
    assert.equal(snap.towers[0].length, 7, 'Quad + minis must support up to 7-tier totem tower');

    // Hot toggle quadEnabled -> false cleanly unmounts dragon & whale DOM
    stage.setState({ quadEnabled: false, camp: 'claude' });
    snap = stage.getLayoutSnapshot();
    assert.equal(snap.quadEnabled, false);
    assert.deepEqual(snap.actors.map((a) => a.id), ['cat', 'clawd']);
    assert.equal(hostEl.children.filter((n) => n.className === 'ag-v2-mascot-actor').length, 2);

    // Hot toggle back to true remounts dragon & whale cleanly
    stage.setState({ quadEnabled: true });
    assert.equal(hostEl.children.filter((n) => n.className === 'ag-v2-mascot-actor').length, 4);
  } finally {
    stage.dispose();
  }
  assert.equal(hostEl.children.filter((n) => n.className === 'ag-v2-mascot-actor').length, 0);

  // 3. Model camp resolver + config schema validation
  const mgc = require('../model-glyph-crystal.js');
  assert.equal(mgc.resolveMascotCamp('Claude Sonnet 4.6'), 'claude');
  assert.equal(mgc.resolveMascotCamp('Gemini 2.5 Pro'), 'gemini');
  assert.equal(mgc.resolveMascotCamp('GPT-5.2 (低)'), 'gpt');
  assert.equal(mgc.resolveMascotCamp('o3-mini'), 'gpt');
  assert.equal(mgc.resolveMascotCamp('DeepSeek R1'), 'deepseek');
  assert.equal(mgc.resolveMascotCamp('深度求索 V3'), 'deepseek');
  assert.deepEqual(mgc.parseModelLabelInfo('GPT-5.2 (低)'), {
    brand: 'openai',
    tier: 'low',
    isOrchestrator: false,
    camp: 'gemini',
  });

  const cdp = require('../cdp.js');
  assert.equal(cdp.validateConfigEntry('mascot', 'quad'), true);
  assert.equal(cdp.validateConfigEntry('mascot', 'quad-minis'), true);
  const sp = require('../settings-panel.js');
  assert.deepEqual([...sp.PRISM_SETTINGS_SCHEMA.mascot.allowed], ['crab', 'minis', 'quad', 'quad-minis', 'off']);
  assert.equal(sp.validateImportedConfigJson(JSON.stringify({ mascot: 'quad' })).settings.mascot, 'quad');
  assert.equal(sp.validateImportedConfigJson(JSON.stringify({ mascot: 'quad-minis' })).settings.mascot, 'quad-minis');
  assert.equal(sp.validateImportedConfigJson(JSON.stringify({ mascot: 'dual' })).settings.mascot, 'crab');
});
