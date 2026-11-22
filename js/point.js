// '점 놓기' 문제 유형: 판 위에 종(점)을 끌어다 놓는다. (예: 삼각형의 외심 찾기)
// 문제 형식: { type: 'point', prompt, players: [{x,y}×3], target: {x,y}, R, explain }
// 판 좌표는 가로 100 × 세로 75, 모눈 한 칸 = 5 = 10mm. 거리는 mm로 보여 준다 (좌표 1 = 2mm).
(function () {
  const W = 100, H = 75, U = 5, MM = 2;
  const LABELS = ['A', 'B', 'C'];
  const FACES = ['#ffd7b5', '#f3c29b', '#e7ad80']; // 세 친구 얼굴색
  const HAIR = ['#3b2f2a', '#6b3f22', '#24282c'];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const mm = d => Math.round(d * MM);

  // 사람 얼굴 (가운데가 친구의 자리). B는 여자 친구: 뒤로 묶은 머리
  const GIRL = 1;
  const face = (p, k) => `
    <g transform="translate(${p.x} ${p.y})" class="pb-person">
      ${k === GIRL ? `<ellipse cx="3.9" cy="-1.6" rx="1.3" ry="1.9" transform="rotate(35 3.9 -1.6)" fill="${HAIR[k]}" class="pb-tail"/>` : ''}
      <circle r="3.3" fill="${FACES[k]}" class="pb-face"/>
      <path d="M-3.2 -0.6 A3.3 3.3 0 0 1 3.2 -0.6 Q1.6 -2.2 0 -1.6 Q-1.6 -2.2 -3.2 -0.6Z" fill="${HAIR[k]}"/>
      <circle cx="-1.15" cy="0.2" r="0.42" class="pb-eye"/>
      <circle cx="1.15" cy="0.2" r="0.42" class="pb-eye"/>
      <path d="M-1.2 1.35 Q0 2.4 1.2 1.35" class="pb-smile"/>
      ${k === GIRL ? `<circle cx="3" cy="-2.3" r="0.5" class="pb-tie"/>` : ''}
    </g>`;

  // 정확도 = 100 × (1 − 정답까지 거리 ÷ (R × scale)). scale이 클수록 너그럽다 (기본 0.8).
  // 예: scale 1.5면 R의 15% 안쪽이 90점 이상
  function accuracy(q, p) {
    // 소수 첫째 자리까지 (예: 94.3)
    return Math.max(0, Math.round(1000 * (1 - dist(p, q.target) / ((q.scale || 0.8) * q.R))) / 10);
  }

  function svg(q, o) {
    o = o || {};
    const P = q.players;
    const G = { x: (P[0].x + P[1].x + P[2].x) / 3, y: (P[0].y + P[1].y + P[2].y) / 3 };
    let s = `<rect x="0" y="0" width="${W}" height="${H}" class="pb-bg"/>`;
    for (let x = U; x < W; x += U) s += `<line x1="${x}" x2="${x}" y1="0" y2="${H}" class="pb-grid"/>`;
    for (let y = U; y < H; y += U) s += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" class="pb-grid"/>`;

    // 정답: 점 O에서 세 친구까지 (모두 같은 거리)
    if (o.reveal) P.forEach(p => { s += `<line x1="${q.target.x}" y1="${q.target.y}" x2="${p.x}" y2="${p.y}" class="pb-oline"/>`; });
    s += `<polygon points="${P.map(p => `${p.x},${p.y}`).join(' ')}" class="pb-tri"/>`;

    // 놓은 종에서 세 친구까지의 거리 (mm). 숫자는 얼굴·종에 가리지 않게 맨 마지막에, 선 옆으로 비켜 그린다.
    let distLabels = '';
    if ((o.reveal || o.dist) && o.bell) {
      P.forEach(p => {
        const dx = p.x - o.bell.x, dy = p.y - o.bell.y, len = Math.hypot(dx, dy) || 1;
        let nx = -dy / len, ny = dx / len;
        if (ny > 0) { nx = -nx; ny = -ny; } // 위쪽으로 비키기
        const mx = o.bell.x + dx / 2 + nx * 3, my = o.bell.y + dy / 2 + ny * 3 + 1;
        s += `<line x1="${o.bell.x}" y1="${o.bell.y}" x2="${p.x}" y2="${p.y}" class="pb-reach"/>`;
        distLabels += `<text x="${mx}" y="${my}" class="pb-dist" text-anchor="middle">${mm(len)}mm</text>`;
      });
    }

    P.forEach((p, k) => {
      const dx = p.x - G.x, dy = p.y - G.y, len = Math.hypot(dx, dy) || 1;
      const lx = p.x + dx / len * 6.2, ly = p.y + dy / len * 6.2 + 1.3;
      s += face(p, k);
      s += `<text x="${lx}" y="${ly}" class="pb-label" text-anchor="middle">${LABELS[k]}</text>`;
    });

    if (o.reveal) {
      s += `<circle cx="${q.target.x}" cy="${q.target.y}" r="1.3" class="pb-o"/>`;
      s += `<text x="${q.target.x + 2}" y="${q.target.y - 2}" class="pb-olabel">O</text>`;
    }

    const b = o.bell || { x: W / 2, y: H / 2 };
    s += `<g class="pb-bell" transform="translate(${b.x} ${b.y})" ${o.bell ? '' : 'style="display:none"'}>
            <circle r="3.4"/><text y="1.5" text-anchor="middle">🔔</text></g>`;
    s += distLabels;
    if (o.cards && o.bell) P.forEach((p, k) => { s += cardMarkup(p, k, o.bell); });

    return `<svg class="pboard${o.small ? ' small' : ''}" viewBox="${o.viewBox || `0 0 ${W} ${H}`}" role="img"
      ${o.interactive ? 'tabindex="0" aria-label="종을 놓을 판. 누르거나 끌어서 종을 옮기고, 화살표 키로도 옮길 수 있어요."' : 'aria-label="삼각형과 종의 위치"'}>${s}</svg>`;
  }

  // 판에 끌기·누르기·화살표 키를 붙인다. onChange(위치)가 불린다.
  function attach(el, onChange) {
    const svgEl = el.querySelector('svg');
    const bell = svgEl.querySelector('.pb-bell');
    let pos = null, dragging = false;
    const set = p => {
      pos = { x: Math.min(W, Math.max(0, p.x)), y: Math.min(H, Math.max(0, p.y)) };
      bell.setAttribute('transform', `translate(${pos.x} ${pos.y})`);
      bell.style.display = '';
      onChange(pos);
    };
    const toSvg = e => {
      const pt = svgEl.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(svgEl.getScreenCTM().inverse());
    };
    svgEl.addEventListener('pointerdown', e => {
      e.preventDefault();
      dragging = true;
      svgEl.setPointerCapture(e.pointerId);
      set(toSvg(e));
    });
    svgEl.addEventListener('pointermove', e => { if (dragging) set(toSvg(e)); });
    const stop = () => { dragging = false; };
    svgEl.addEventListener('pointerup', stop);
    svgEl.addEventListener('pointercancel', stop);
    svgEl.addEventListener('keydown', e => {
      const step = e.shiftKey ? 2 : 0.5;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      const p = pos || { x: W / 2, y: H / 2 };
      set({ x: p.x + d[0], y: p.y + d[1] });
    });
  }

  const LEGEND = `
    <ul class="pb-legend">
      <li><span class="sw line reach"></span>내 종에서 세 친구까지 거리</li>
      <li><span class="sw dot"></span><span class="sw line circ"></span>점 O와 세 친구 (모두 같은 거리)</li>
    </ul>`;

  // 할리갈리 카드 (친구 얼굴 바로 앞, 종 쪽)
  const FRUITS = ['🍓', '🍌', '🍋'];
  const CARD = k => `<rect x="-2.6" y="-3.6" width="5.2" height="7.2" rx="0.8"/><text y="1.4" text-anchor="middle">${FRUITS[k]}</text>`;
  function cardPlace(p, k, bell) {
    const dx = bell.x - p.x, dy = bell.y - p.y, len = Math.hypot(dx, dy) || 1;
    return { x: p.x + dx / len * 7.5, y: p.y + dy / len * 7.5, tilt: (k - 1) * 12 };
  }
  function cardMarkup(p, k, bell) {
    const c = cardPlace(p, k, bell);
    return `<g class="pb-card" transform="translate(${c.x} ${c.y}) rotate(${c.tilt})">${CARD(k)}</g>`;
  }

  // 성공 기념: 종이 울리고, 종 자리에서 세 친구에게 카드가 한 장씩 날아간다.
  function celebrate(el, q, bell) {
    const svgEl = el.querySelector('svg');
    if (!svgEl || !bell) return;
    const NS = 'http://www.w3.org/2000/svg';
    const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canAnimate = !still && typeof Element.prototype.animate === 'function';

    const ring = svgEl.querySelector('.pb-bell text');
    if (ring && canAnimate) {
      ring.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-18deg)' }, { transform: 'rotate(16deg)' },
                    { transform: 'rotate(-10deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }],
                   { duration: 600, easing: 'ease-out' });
    }

    q.players.forEach((p, k) => {
      const end = cardPlace(p, k, bell);
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'pb-card');
      g.innerHTML = CARD(k);
      const to = `translate(${end.x}px, ${end.y}px) rotate(${end.tilt}deg) scale(1)`;
      g.style.transform = to;
      svgEl.appendChild(g);
      if (canAnimate) {
        g.animate([
          { transform: `translate(${bell.x}px, ${bell.y}px) rotate(0deg) scale(0.2)`, opacity: 0 },
          { opacity: 1, offset: 0.2 },
          { transform: to, opacity: 1 }
        ], { duration: 700, delay: 350 + k * 200, easing: 'cubic-bezier(.2,.8,.3,1.15)', fill: 'backwards' });
      }
    });
  }

  window.PointBoard = { svg, attach, accuracy, LEGEND, mm, celebrate };
})();
