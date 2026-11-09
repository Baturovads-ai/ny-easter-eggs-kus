(() => {
  // Все тайминги в одном месте, в мс. Пара «один тайминг»: сдвиг нижнего блока ↔ высота карточки (S.move).
  const T = {
    autostart: 1000,
    G: { stagger: 320, pop: 800, counterAt: 300 },
    F: { freezeIn: 500, demoAt: 2200, demoDur: 2600, idleMelt: 9000, meltDur: 1200, doneShare: 0.55, brush: 34 },
    S: { press: 300, loader: 1500, success: 700, sweepAt: 150, sweepDur: 700, spark: 500, hold: 2200, move: 600 },
  };
  const C = { litA: '#8dff9a', litB: '#00d93a', litC: '#00a82d', flake: '#ffffff' };
  const EASE = 'cubic-bezier(.4,0,.2,1)';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (s) => document.querySelector(s);
  const layer = $('#layer'), info = $('#info');
  let run = 0, current = 'G';
  const log = [];
  const mark = (name) => log.push([name, Math.round(performance.now())]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);

  function el(tag, css, parent = layer) {
    const n = document.createElement(tag);
    n.style.position = 'absolute';
    Object.assign(n.style, css);
    parent.appendChild(n);
    return n;
  }
  function img(name, css = {}, parent = layer) {
    const n = $('#assets [data-n="' + name + '"]').cloneNode();
    n.removeAttribute('data-n');
    n.style.position = 'absolute';
    Object.assign(n.style, { left: '0', top: '0', width: '360px', height: '800px', maxWidth: 'none', display: 'block' }, css);
    parent.appendChild(n);
    return n;
  }
  const star4 = (x, y, size, parent = layer) => el('div', {
    left: x - size / 2 + 'px', top: y - size / 2 + 'px', width: size + 'px', height: size + 'px', opacity: '0',
    background: 'radial-gradient(circle, #fff 0 18%, rgba(255,255,255,0) 20%), conic-gradient(from 0deg, transparent 0 40deg, #fff 45deg 50deg, transparent 55deg 130deg, #fff 135deg 140deg, transparent 145deg 220deg, #fff 225deg 230deg, transparent 235deg 310deg, #fff 315deg 320deg, transparent 325deg)',
  }, parent);

  /* ---------- 1. Гирлянда прогресса ---------- */
  // Центры 15 лампочек, снято с макета. Лампочки рисуем сами, чтобы все были одинаковые.
  const BULBS = [[20, 252], [41.1, 242.9], [62.9, 252.8], [87.8, 242.2], [105.2, 258.2], [128.2, 251.6], [150.4, 242.7], [171.9, 252.6], [199.6, 242.6], [216.6, 258.3], [240.2, 251.6], [262.4, 242.7], [283.9, 252.6], [310.6, 242.6], [327.6, 258.3]];
  const LIT_BEFORE = 5, LIT_AFTER = 8;
  async function playG(id) {
    const p = T.G, R = 7;
    img('g_off');
    el('div', { left: '296px', top: '202px', width: '50px', height: '17px', background: '#fff' });
    const cnt = el('div', { left: '296px', top: '203px', width: '47px', height: '15px', textAlign: 'right', font: '400 12px/15px Arial, sans-serif', color: '#9ea5a9' });
    const set = (n) => { cnt.textContent = n + ' из 6'; };
    set(2);
    const bulbs = BULBS.map(([x, y], i) => {
      const w = el('div', { left: x - R + 'px', top: y - R + 'px', width: R * 2 + 'px', height: R * 2 + 'px' });
      el('div', { inset: '0', borderRadius: '50%', background: 'radial-gradient(circle at 36% 30%, #f6f7f8, #d9dde0 60%, #c2c8cc)' }, w);
      const lit = el('div', { inset: '0', borderRadius: '50%', opacity: i < LIT_BEFORE ? '1' : '0', background: `radial-gradient(circle at 36% 30%, ${C.litA}, ${C.litB} 55%, ${C.litC})`, boxShadow: '0 0 8px 2px rgba(0,230,80,.45)' }, w);
      return lit;
    });
    if (reduced) { set(3); bulbs.forEach((b, i) => { if (i < LIT_AFTER) b.style.opacity = '1'; }); return; }
    await sleep(T.autostart); if (id !== run) return;
    mark('G:start');
    cnt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, delay: p.counterAt, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
      if (id !== run) return; set(3);
      cnt.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: 'ease-out', fill: 'forwards' });
    };
    bulbs.slice(LIT_BEFORE, LIT_AFTER).forEach((b, i) => {
      b.animate([
        { opacity: 0, transform: 'scale(.82)', boxShadow: '0 0 0 0 rgba(0,230,80,0)' },
        { opacity: 1, transform: 'scale(1.1)', boxShadow: '0 0 14px 5px rgba(0,230,80,.7)', offset: .55 },
        { opacity: 1, transform: 'scale(1)', boxShadow: '0 0 8px 2px rgba(0,230,80,.45)' },
      ], { delay: i * p.stagger, duration: p.pop, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    });
    await sleep((LIT_AFTER - LIT_BEFORE - 1) * p.stagger + p.pop); if (id !== run) return;
    mark('G:end');
  }

  /* ---------- 2. Замёрзший экран ---------- */
  const CARD = { x: 16, y: 159, w: 328, h: 563 };
  function makeFrost(src) {
    const dpr = Math.min(devicePixelRatio || 1, 2), { w, h } = CARD;
    const cv = el('canvas', { left: CARD.x + 'px', top: CARD.y + 'px', width: w + 'px', height: h + 'px', borderRadius: '20px', touchAction: 'none', pointerEvents: 'auto', cursor: 'grab' });
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    // размытая копия экрана: уменьшение и растяжение
    const small = document.createElement('canvas'); small.width = Math.ceil(w / 9); small.height = Math.ceil(h / 9);
    small.getContext('2d').drawImage(src, CARD.x, CARD.y, w, h, 0, 0, small.width, small.height);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(small, 0, 0, w, h);
    g.fillStyle = 'rgba(236,246,252,.62)'; g.fillRect(0, 0, w, h);
    // иней гуще по краям
    const edge = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); return gr; };
    g.fillStyle = edge(0, 0, 0, 90); g.fillRect(0, 0, w, 90);
    g.fillStyle = edge(0, h, 0, h - 90); g.fillRect(0, h - 90, w, 90);
    g.fillStyle = edge(0, 0, 70, 0); g.fillRect(0, 0, 70, h);
    g.fillStyle = edge(w, 0, w - 70, 0); g.fillRect(w - 70, 0, 70, h);
    // крупинки
    for (let i = 0; i < 3200; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const d = Math.min(x, w - x, y, h - y), k = Math.max(.2, 1 - d / 120);
      g.fillStyle = `rgba(255,255,255,${(.25 + Math.random() * .5) * k})`;
      g.beginPath(); g.arc(x, y, .4 + Math.random() * 1.5, 0, 6.283); g.fill();
    }
    // ледяные папоротники от краёв
    const fern = (x, y, a, len, depth) => {
      if (depth < 0 || len < 4) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      g.strokeStyle = `rgba(255,255,255,${.25 + depth * .12})`; g.lineWidth = .5 + depth * .35;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      for (const s of [-1, 1]) { fern(x + (x2 - x) * .45, y + (y2 - y) * .45, a + s * .95, len * .5, depth - 1); fern(x2, y2, a + s * .5, len * .55, depth - 1); }
    };
    for (let i = 0; i < 46; i++) {
      const side = i % 4, t = Math.random();
      const [x, y, a] = side === 0 ? [t * w, 0, 1.57] : side === 1 ? [t * w, h, -1.57] : side === 2 ? [0, t * h, 0] : [w, t * h, 3.14];
      fern(x, y, a + rand(-.35, .35), rand(40, 95), 3);
    }
    return { cv, g };
  }
  async function playF(id) {
    const p = T.F;
    const src = img('frost');
    if (reduced) return;
    await src.decode().catch(() => {});
    if (id !== run) return;
    const { cv, g } = makeFrost(src);
    const hint = el('div', { left: '0', width: '360px', top: '420px', textAlign: 'center', pointerEvents: 'none' });
    hint.innerHTML = '<span style="display:inline-block;padding:10px 18px;border-radius:999px;background:rgba(255,255,255,.7);color:#33423a;font:500 14px/20px system-ui,Arial,sans-serif">Протрите экран варежкой</span>';
    const mit = img('mitten', { width: '64px', height: '64px', left: '0', top: '0', opacity: '0', pointerEvents: 'none', transformOrigin: '50% 50%' });
    const putMitten = (x, y, tilt) => { mit.style.transform = `translate(${CARD.x + x - 32}px, ${CARD.y + y - 26}px) rotate(${tilt}deg)`; };
    cv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: p.freezeIn, easing: 'ease-out' });
    hint.animate([{ opacity: 0 }, { opacity: 1 }], { duration: p.freezeIn, easing: 'ease-out' });
    mark('F:frozen');
    const probe = document.createElement('canvas'); probe.width = 41; probe.height = 70;
    const pg = probe.getContext('2d', { willReadFrequently: true });
    let idle = 0, melted = false, interacted = false;
    const cleared = () => {
      pg.clearRect(0, 0, 41, 70); pg.drawImage(cv, 0, 0, 41, 70);
      const d = pg.getImageData(0, 0, 41, 70).data; let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] < 40) n++;
      return n / (41 * 70);
    };
    const melt = (dur) => {
      if (melted) return; melted = true; clearTimeout(idle);
      mark('F:melt'); mit.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
      cv.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease-out', fill: 'forwards' }).onfinish = () => cv.remove();
    };
    const resetIdle = () => { clearTimeout(idle); idle = setTimeout(() => { if (id === run) melt(p.meltDur); }, p.idleMelt); };
    const stamp = (x, y) => {
      const r = p.brush, gr = g.createRadialGradient(x, y, r * .35, x, y, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over';
    };
    let last = null;
    const stroke = (x, y, demo) => {
      if (!interacted && !demo) { interacted = true; hint.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }); }
      if (last) { const dx = x - last[0], dy = y - last[1], n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6)); for (let i = 1; i <= n; i++) stamp(last[0] + dx * i / n, last[1] + dy * i / n); } else stamp(x, y);
      last = [x, y];
    };
    const pos = (e) => { const r = cv.getBoundingClientRect(), k = r.width / CARD.w; return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };
    let down = false, checkAt = 0;
    cv.addEventListener('pointerdown', (e) => { down = true; last = null; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'none'; mit.getAnimations().forEach((a) => a.cancel()); mit.style.opacity = '1'; stroke(...pos(e)); putMitten(...pos(e), -12); resetIdle(); });
    cv.addEventListener('pointermove', (e) => {
      if (!down) return; const q = pos(e); stroke(...q); putMitten(q[0], q[1], -12 + Math.max(-18, Math.min(18, (e.movementX || 0) * 1.5))); resetIdle();
      const now = performance.now();
      if (now - checkAt > 250) { checkAt = now; if (cleared() >= p.doneShare) melt(500); }
    });
    const up = () => { down = false; last = null; cv.style.cursor = 'grab'; mit.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }); if (!melted && cleared() >= p.doneShare) melt(500); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    resetIdle();
    window.NY.wipe = (pts) => pts.forEach(([x, y]) => stroke(x, y, true));
    window.NY.cleared = cleared;
    // демонстрация движения пальцем, если никто не трогал
    await sleep(p.demoAt); if (id !== run || interacted) return;
    mit.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: 'forwards' });
    const t0 = performance.now();
    await new Promise((resolve) => {
      const frame = (now) => {
        if (id !== run || interacted) { return resolve(); }
        const u = Math.min(1, (now - t0) / p.demoDur), e = u * u * (3 - 2 * u);
        const x = 60 + 210 * e + 40 * Math.sin(e * 9), y = 120 + 330 * e + 70 * Math.sin(e * 5.5);
        stroke(x, y, true); putMitten(x, y, -12 + 14 * Math.cos(e * 9));
        if (u < 1) requestAnimationFrame(frame); else { last = null; mit.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); resolve(); }
      };
      requestAnimationFrame(frame);
    });
  }

  /* ---------- 3. Шаг и праздничная кнопка ---------- */
  const BTN = { x: 32, y: 341, w: 295, h: 39 };
  function flakes(cx, cy, n, dur, spread) {
    for (let i = 0; i < n; i++) {
      const f = el('div', { left: cx + 'px', top: cy + 'px', fontSize: rand(9, 13) + 'px', color: C.flake, lineHeight: '1', opacity: '0', pointerEvents: 'none' });
      f.textContent = '❄';
      f.animate([{ opacity: 1, transform: 'translate(0,0)' }, { opacity: 0, transform: `translate(${rand(-spread, spread)}px, ${rand(-34, -12)}px)` }], { duration: dur, easing: 'ease-out' });
      setTimeout(() => f.remove(), dur + 30);
    }
  }
  async function playS(id) {
    const p = T.S, cx = BTN.x + BTN.w / 2, cy = BTN.y + BTN.h / 2;
    img('t4');
    const l1 = img('t1');
    const l3 = img('t3', { clipPath: 'inset(253px 16px 403px 16px)', opacity: reduced ? '1' : '0' });
    if (reduced) { l1.remove(); l3.style.clipPath = 'none'; return; }
    const cover = el('div', { left: cx - 29 + 'px', top: cy - 10 + 'px', width: '58px', height: '20px', background: '#009e36', opacity: '0' });
    const spin = el('div', { left: cx - 11 + 'px', top: cy - 11 + 'px', width: '22px', height: '22px', opacity: '0' });
    spin.innerHTML = '<svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="8.5" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="2.5"/><path d="M11 2.5 A8.5 8.5 0 0 1 19.5 11" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>';
    const clip = el('div', { left: BTN.x + 'px', top: BTN.y + 'px', width: BTN.w + 'px', height: BTN.h + 'px', borderRadius: '10px', overflow: 'hidden' });
    const sweep = el('div', { left: '0', top: '-10px', width: '56px', height: BTN.h + 20 + 'px', transform: 'translateX(-90px) skewX(-20deg)', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.3), rgba(255,255,255,0))' }, clip);
    await sleep(T.autostart); if (id !== run) return;
    mark('S:press');
    // нажатие: кольцо и снежинки, переход не ждёт
    const ring = el('div', { left: cx - 15 + 'px', top: cy - 15 + 'px', width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,.25)', opacity: '0' });
    ring.animate([{ opacity: 1 }, { opacity: 0 }], { duration: p.press, easing: 'ease-out' });
    // морозные снежинки по краям кнопки на всё время лоадера
    const frost = [];
    const edge = [[0, 0], [.14, 1], [.3, 0], [.46, 1], [.6, 0], [.76, 1], [.9, 0], [1, .5], [0, .55], [.2, .5], [.82, .5]];
    edge.forEach(([u, v], i) => {
      const f = el('div', { left: BTN.x + u * BTN.w + 'px', top: BTN.y + v * BTN.h + 'px', marginLeft: '-10px', marginTop: '-10px', fontSize: (15 + (i % 3) * 3) + 'px', lineHeight: '20px', width: '20px', textAlign: 'center', color: '#fff', textShadow: '0 0 5px rgba(150,215,255,1), 0 0 2px #fff', opacity: '0', pointerEvents: 'none' });
      f.textContent = '❄';
      f.animate([{ opacity: 0, transform: 'scale(.3) rotate(-40deg)' }, { opacity: 1, transform: 'scale(1) rotate(0deg)' }], { delay: i * 110, duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      frost.push(f);
    });
    cover.style.opacity = '1'; spin.style.opacity = '1';
    const rot = spin.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 900, iterations: Infinity, easing: 'linear' });
    await sleep(p.loader); if (id !== run) return;
    mark('S:success');
    frost.forEach((f, i) => f.animate([{ opacity: 1 }, { opacity: 0 }], { delay: i * 20, duration: 350, easing: 'ease-out', fill: 'forwards' }));
    rot.cancel(); spin.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }); cover.style.opacity = '0';
    l3.animate([{ opacity: 0 }, { opacity: 1 }], { duration: p.success, easing: 'ease', fill: 'forwards' });
    // праздничный блик, искры и снежинки на успехе
    setTimeout(() => {
      if (id !== run) return;
      mark('S:sweep');
      sweep.animate([{ transform: 'translateX(-90px) skewX(-20deg)' }, { transform: `translateX(${BTN.w + 40}px) skewX(-20deg)` }], { duration: p.sweepDur, easing: 'ease-in-out' });
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * 6.283 + .3, d = rand(30, 52), s = star4(cx, cy, rand(8, 13));
        s.animate([{ opacity: 0, transform: 'translate(0,0) rotate(0deg)' }, { opacity: 1, transform: `translate(${Math.cos(a) * d * .5}px, ${Math.sin(a) * d * .5}px) rotate(45deg)`, offset: .35 }, { opacity: 0, transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) rotate(90deg)` }], { duration: p.spark, delay: i * 25, easing: 'ease-out' });
        setTimeout(() => s.remove(), p.spark + 300);
      }
      flakes(cx, BTN.y + 4, 6, p.success, 40);
    }, p.sweepAt);
    await sleep(p.success + p.hold); if (id !== run) return;
    // переход к следующему шагу: карточка 160→140 и нижний блок вверх на 20 px, один тайминг
    mark('S:move');
    const D = 20, SPLIT = 413, TOP = 205, FOOT = 722;
    const B = el('div', { left: '0', top: TOP + 'px', width: '360px', height: SPLIT - TOP + 'px', overflow: 'hidden' });
    img('t3', { top: -TOP + 'px' }, B);
    const Cc = el('div', { left: '0', top: SPLIT + 'px', width: '360px', height: FOOT - SPLIT + 'px', overflow: 'hidden' });
    img('t3', { top: -SPLIT + 'px' }, Cc);
    l1.remove(); l3.remove(); cover.remove(); spin.remove(); clip.remove();
    const opt = { duration: p.move, easing: EASE, fill: 'forwards' };
    B.animate([{ height: SPLIT - TOP + 'px', opacity: 1 }, { height: SPLIT - TOP - D + 'px', opacity: 0 }], opt);
    Cc.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-D}px)` }], opt);
    await sleep(p.move + 50); if (id !== run) return;
    B.remove(); Cc.remove();
    mark('S:end');
  }

  /* ---------- Каркас ---------- */
  const SCENES = {
    G: { fn: playG, title: '1 · Гирлянда прогресса' },
    F: { fn: playF, title: '2 · Замёрзший экран' },
    S: { fn: playS, title: '3 · Шаг и праздничная кнопка' },
  };
  function renderInfo(key) {
    info.innerHTML = `<h2>${SCENES[key].title}</h2><button class="replay" id="replay" type="button">Повторить</button>`;
    $('#replay').addEventListener('click', () => play(key));
  }
  function play(key) {
    const id = ++run; current = key;
    layer.replaceChildren();
    log.length = 0;
    SCENES[key].fn(id);
  }
  function select(key) {
    document.querySelectorAll('.tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.scene === key)));
    renderInfo(key); play(key);
  }
  document.querySelectorAll('.tabs [role=tab]').forEach((b) => b.addEventListener('click', () => select(b.dataset.scene)));
  function fit() {
    const s = Math.min(1, (document.documentElement.clientWidth - 32) / 360);
    document.documentElement.style.setProperty('--s', String(s));
    $('#pw').style.height = 800 * s + 'px';
  }
  addEventListener('resize', fit);
  window.NY = { T, log, play: (k) => play(k || current), get run() { return run; } };
  fit();
  select('G');
})();
