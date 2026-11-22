// '점 놓기' 문제 유형: 판 위에 종(점)을 끌어다 놓는다. (예: 삼각형의 외심 찾기)
// 문제 형식: { type: 'point', prompt, players: [{x,y}×3], target: {x,y}, R, explain }
// 판 좌표는 가로 100 × 세로 75, 모눈 한 칸 = 5.
(function () {
  const W = 100, H = 75, U = 5;
  const LABELS = ['A', 'B', 'C'];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const r1 = n => Math.round(n * 10) / 10;

  // 외심에서 외접원 반지름의 8% 안쪽이면 90점 이상
  function accuracy(q, p) {
    return Math.max(0, Math.round(100 * (1 - dist(p, q.target) / (0.8 * q.R))));
  }

  function svg(q, o) {
    o = o || {};
    const P = q.players;
    const G = { x: (P[0].x + P[1].x + P[2].x) / 3, y: (P[0].y + P[1].y + P[2].y) / 3 };
    let s = `<rect x="0" y="0" width="${W}" height="${H}" class="pb-bg"/>`;
    for (let x = U; x < W; x += U) s += `<line x1="${x}" x2="${x}" y1="0" y2="${H}" class="pb-grid"/>`;
    for (let y = U; y < H; y += U) s += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" class="pb-grid"/>`;

    if (o.reveal) {
      s += `<circle cx="${q.target.x}" cy="${q.target.y}" r="${q.R}" class="pb-circle"/>`;
      [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => {
        const M = { x: (P[a].x + P[b].x) / 2, y: (P[a].y + P[b].y) / 2 };
        const dx = P[b].x - P[a].x, dy = P[b].y - P[a].y, len = Math.hypot(dx, dy);
        const px = -dy / len * 200, py = dx / len * 200;
        s += `<line x1="${M.x - px}" y1="${M.y - py}" x2="${M.x + px}" y2="${M.y + py}" class="pb-bisector"/>`;
        // 변의 중점 표시
        s += `<circle cx="${M.x}" cy="${M.y}" r="0.7" class="pb-mid"/>`;
      });
    }
    s += `<polygon points="${P.map(p => `${p.x},${p.y}`).join(' ')}" class="pb-tri"/>`;

    if (o.reveal && o.bell) {
      P.forEach(p => {
        const d = dist(o.bell, p) / U;
        const mx = (o.bell.x + p.x) / 2, my = (o.bell.y + p.y) / 2;
        s += `<line x1="${o.bell.x}" y1="${o.bell.y}" x2="${p.x}" y2="${p.y}" class="pb-reach"/>`;
        s += `<text x="${mx}" y="${my - 1}" class="pb-dist" text-anchor="middle">${r1(d).toFixed(1)}칸</text>`;
      });
    }

    P.forEach((p, k) => {
      const dx = p.x - G.x, dy = p.y - G.y, len = Math.hypot(dx, dy) || 1;
      const lx = p.x + dx / len * 5, ly = p.y + dy / len * 5 + 1.3;
      s += `<circle cx="${p.x}" cy="${p.y}" r="2.4" class="pb-player"/>`;
      s += `<text x="${lx}" y="${ly}" class="pb-label" text-anchor="middle">${LABELS[k]}</text>`;
    });

    if (o.reveal) {
      s += `<circle cx="${q.target.x}" cy="${q.target.y}" r="1.3" class="pb-o"/>`;
      s += `<text x="${q.target.x + 2}" y="${q.target.y - 2}" class="pb-olabel">O</text>`;
    }

    const b = o.bell || { x: W / 2, y: H / 2 };
    s += `<g class="pb-bell" transform="translate(${b.x} ${b.y})" ${o.bell ? '' : 'style="display:none"'}>
            <circle r="3.4"/><text y="1.5" text-anchor="middle">🔔</text></g>`;

    return `<svg class="pboard${o.small ? ' small' : ''}" viewBox="0 0 ${W} ${H}" role="img"
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
      <li><span class="sw line bis"></span>각 변의 수직이등분선</li>
      <li><span class="sw line circ"></span>세 친구를 지나는 원 (외접원)</li>
      <li><span class="sw dot"></span>O: 외심</li>
    </ul>`;

  window.PointBoard = { svg, attach, accuracy, LEGEND };
})();
