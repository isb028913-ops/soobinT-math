// 교사용: 반 전체 게임 진행 화면 (칠판에 띄우는 용도)
// 평균에 가장 가까운 수 게임 – 제출 인원 보기 → 결과 공개 → 새 판 시작
(function () {
  const POLL_MS = 3000;
  const fmt = x => String(Math.round(x * 100) / 100);

  // ---------- 대푯값 계산 ----------
  function analyze(entries) {
    const n = entries.length;
    const sorted = entries.map(e => e.value).sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const mid = Math.floor(n / 2);
    const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const byValue = new Map();
    entries.forEach(e => {
      if (!byValue.has(e.value)) byValue.set(e.value, []);
      byValue.get(e.value).push(e.name);
    });
    const maxCount = Math.max(...[...byValue.values()].map(v => v.length));
    // 서로 다른 값이 여럿인데 도수가 모두 같으면 최빈값은 없는 것으로 본다.
    const allSame = byValue.size > 1 && [...byValue.values()].every(v => v.length === maxCount);
    const modes = allSame ? [] : [...byValue].filter(([, v]) => v.length === maxCount).map(([k]) => k).sort((a, b) => a - b);

    // |값 - 평균| 대신 |값×n - 합|을 비교해 소수 오차 없이 순위를 정한다.
    const ranked = entries
      .map(e => ({ name: e.name, value: e.value, scaled: Math.abs(e.value * n - sum) }))
      .sort((a, b) => a.scaled - b.scaled || a.value - b.value || a.name.localeCompare(b.name, 'ko'));
    ranked.forEach((r, i) => {
      r.rank = i > 0 && ranked[i - 1].scaled === r.scaled ? ranked[i - 1].rank : i + 1;
      r.diff = r.scaled / n;
    });
    return { n, sum, mean, median, modes, maxCount, byValue, ranked, winners: ranked.filter(r => r.rank === 1) };
  }

  // ---------- 그래프 (0~100) ----------
  function chart(a) {
    const W = 720, H = 340, m = { l: 46, r: 16, t: 60, b: 46 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const x = v => m.l + (v / 101) * pw;
    const step = Math.max(1, Math.ceil(a.maxCount / 5));
    const yTop = step * Math.ceil(a.maxCount / step);
    const y = c => m.t + ph - (c / yTop) * ph;
    let s = '';
    for (let c = 0; c <= yTop; c += step) {
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(c)}" y2="${y(c)}" class="${c ? 'grid' : 'axis'}"/>`;
      s += `<text x="${m.l - 8}" y="${y(c) + 5}" text-anchor="end">${c}</text>`;
    }
    for (let v = 0; v <= 100; v += 10) {
      s += `<line x1="${x(v)}" x2="${x(v)}" y1="${y(0)}" y2="${y(0) + 5}" class="axis"/>`;
      s += `<text x="${x(v)}" y="${y(0) + 20}" text-anchor="middle">${v}</text>`;
    }
    s += `<text x="${m.l + pw / 2}" y="${H - 6}" text-anchor="middle">제출한 수</text>`;
    s += `<text x="4" y="16">인원(명)</text>`;
    const bw = (pw / 101) * 0.8;
    a.byValue.forEach((names, v) => {
      s += `<rect x="${x(v) - bw / 2}" y="${y(names.length)}" width="${bw}" height="${y(0) - y(names.length)}"
              class="${a.modes.includes(v) ? 'c-bar mode' : 'c-bar'}"><title>${v}: ${names.length}명</title></rect>`;
    });
    // 평균과 중앙값 이름표가 겹치지 않게 줄을 달리하고 서로 바깥쪽에 둔다.
    const lw = t => [...t].reduce((w, ch) => w + (ch > '⹿' ? 14 : 8), 0);
    const labels = [];
    const marker = (v, cls, label, ly, preferLeft) => {
      const lx = x(v), w = lw(label);
      let left = preferLeft;
      if (left && lx - 6 - w < 0) left = false;
      if (!left && lx + 6 + w > W) left = true;
      s += `<line x1="${lx}" x2="${lx}" y1="${ly - 12}" y2="${y(0)}" class="marker ${cls}"/>`;
      labels.push(`<text x="${left ? lx - 6 : lx + 6}" y="${ly}" text-anchor="${left ? 'end' : 'start'}" class="marker-label ${cls}">${label}</text>`);
    };
    const meanLeft = a.mean <= a.median;
    marker(a.mean, 'mean', `평균 ${fmt(a.mean)}`, m.t - 30, meanLeft);
    marker(a.median, 'median', `중앙값 ${fmt(a.median)}`, m.t - 10, !meanLeft);
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img"
      aria-label="제출한 수의 분포. 평균 ${fmt(a.mean)}, 중앙값 ${fmt(a.median)}">${s}${labels.join('')}</svg>`;
  }

  function resultHTML(entries) {
    const a = analyze(entries);
    const modeValue = a.modes.length ? a.modes.join(', ') : '없음';
    const modeHint = a.modes.length ? `${a.modes.length > 1 ? '각각 ' : ''}${a.maxCount}명이 고른 값` : '모든 값의 도수가 같음';
    const stat = (title, value, hint) =>
      `<div class="stat"><div class="stat-title">${title}</div><div class="stat-value">${value}</div><div class="stat-hint">${hint}</div></div>`;
    return `
      <div class="panel winner">
        <div class="winner-title">${a.winners.length > 1 ? '공동 우승' : '우승'} · ${a.winners.map(w => `${esc(w.name)} (${w.value})`).join(', ')}</div>
        <div class="summary">평균 ${fmt(a.mean)}에 가장 가까운 수예요. (평균과의 차이 ${fmt(a.winners[0].diff)})</div>
      </div>
      <div class="stats">
        ${stat('응답 수', `${a.n}명`, `합계 ${a.sum}`)}
        ${stat('평균', fmt(a.mean), `${a.sum} ÷ ${a.n}`)}
        ${stat('중앙값', fmt(a.median), '크기순으로 가운데 값')}
        ${stat('최빈값', modeValue, modeHint)}
      </div>
      <div class="panel">
        ${chart(a)}
        <ul class="legend">
          <li><span class="sw c-bar"></span>제출 인원</li>
          <li><span class="sw mode"></span>최빈값</li>
          <li><span class="sw line mean"></span>평균</li>
          <li><span class="sw line median"></span>중앙값</li>
        </ul>
      </div>
      <div class="panel">
        <div class="table-wrap"><table class="rank">
          <thead><tr><th>순위</th><th>이름</th><th>제출한 수</th><th>평균과의 차이</th></tr></thead>
          <tbody>${a.ranked.map(r => `
            <tr class="${r.rank === 1 ? 'top' : ''}"><td>${r.rank}</td><td>${esc(r.name)}</td><td>${r.value}</td><td>${fmt(r.diff)}</td></tr>`).join('')}
          </tbody></table></div>
      </div>`;
  }

  // ---------- 진행 화면 ----------
  // opt: { app, password, activity, link, onBack }
  window.openBoard = function (opt) {
    const { app, password, activity: a, link } = opt;
    let state = null, err = '', timer = null, lastText = '', busy = false, alive = true;
    const rankMode = !!a.ranking; // 점수 랭킹 (예: 공평한 종 자리 찾기)

    function rankTable(entries) {
      if (!entries.length) return '<div class="panel"><p class="empty">아직 기록이 없어요. 학생이 5판을 끝까지 하면 여기에 올라와요.</p></div>';
      const sorted = entries.slice().sort((x, y) => y.value - x.value || x.name.localeCompare(y.name, 'ko'));
      // 순위를 매기고 상위 10위까지만 보여 준다 (10위 동점자는 모두 포함)
      let rank = 0;
      const ranked = sorted.map((e, k) => {
        if (k === 0 || e.value !== sorted[k - 1].value) rank = k + 1;
        return Object.assign({ rank }, e);
      });
      const top = ranked.filter(e => e.rank <= 10);
      const rest = ranked.length - top.length;
      return `
        <div class="panel"><div class="table-wrap"><table class="rank">
          <thead><tr><th>순위</th><th>이름</th><th>평균 점수</th></tr></thead>
          <tbody>${top.map(e =>
            `<tr class="${e.rank <= 3 ? 'top' : ''}"><td>${e.rank}</td><td>${esc(e.name)}</td><td>${Number(e.value).toFixed(1)}점</td></tr>`).join('')}
          </tbody>
        </table></div>
        ${rest > 0 ? `<p class="summary rank-rest">상위 10위까지 보여 줘요. 그 밖에 ${rest}명이 참여했어요.</p>` : ''}</div>`;
    }

    function qrSVG() {
      if (!window.qrcode) return '';
      const q = qrcode(0, 'M'); q.addData(link); q.make();
      return q.createSvgTag({ cellSize: 4, margin: 1, scalable: true });
    }
    const qr = qrSVG();

    function draw() {
      const open = !state || state.phase === 'open';
      const entries = state ? state.entries : [];
      app.innerHTML = `
        <header class="t-head">
          <h1>${esc(a.title)}</h1>
          <button class="btn" id="bBack">← 교사용 화면</button>
        </header>
        <section class="t-page board">
          <div class="panel join">
            ${qr ? `<div class="join-qr">${qr}</div>` : ''}
            <div class="join-text">
              ${a.code ? `<div class="join-code">수업 코드 <b>${esc(a.code)}</b></div>` : ''}
              <div class="summary">홈 화면에서 수업 코드를 입력하거나 QR을 찍어 들어와요.</div>
              <div class="qr-url">${esc(link)}</div>
            </div>
          </div>
          ${rankMode ? `
          <div class="panel">
            <div class="board-status">
              <b>${state ? state.round : '-'}번째 판 랭킹</b>
              <span>참여 <b>${entries.length}</b>명 · 5판 평균 점수 상위 10명 (여러 번 하면 가장 높은 점수)</span>
            </div>
            <div class="t-actions"><button class="btn" id="bReset">새 판 시작</button></div>
            <p class="hint" role="alert">${esc(err)}</p>
          </div>
          ${rankTable(entries)}` : `
          <div class="panel">
            <div class="board-status">
              <b>${state ? state.round : '-'}번째 판</b>
              <span>${open ? '제출 받는 중' : '결과 공개됨'} · 제출 <b>${entries.length}</b>명</span>
            </div>
            ${open && entries.length ? `<ul class="chips">${entries.map(e => `<li>${esc(e.name)}</li>`).join('')}</ul>` : ''}
            <div class="t-actions">
              ${open ? `<button class="btn primary" id="bReveal" ${entries.length ? '' : 'disabled'}>결과 공개</button>` : ''}
              <button class="btn" id="bReset">새 판 시작</button>
            </div>
            <p class="hint" role="alert">${esc(err)}</p>
          </div>
          ${state && state.phase === 'revealed' && entries.length ? resultHTML(entries) : ''}`}
        </section>`;
      document.getElementById('bBack').onclick = () => { alive = false; clearTimeout(timer); opt.onBack(); };
      const rv = document.getElementById('bReveal');
      if (rv) rv.onclick = async () => {
        if (await ask('결과를 공개할까요?\n공개한 뒤에는 학생이 더 이상 제출할 수 없어요.', { ok: '결과 공개' })) act('gameReveal');
      };
      document.getElementById('bReset').onclick = async () => {
        if (await ask(`새 판을 시작할까요?\n지금 판의 ${rankMode ? '랭킹은 비워져요' : '응답은 순위 계산에서 빠져요'}. (교사용 결과 목록에는 그대로 남아요)`, { ok: '새 판 시작' })) act('gameReset');
      };
    }

    function apply(d) {
      const text = JSON.stringify([d.round, d.phase, d.entries]);
      state = d;
      if (text !== lastText) { lastText = text; draw(); }
    }

    async function act(action) {
      if (busy) return;
      busy = true; err = '';
      try { apply(await api({ action, password, activityId: a.id, best: rankMode })); lastText = ''; draw(); }
      catch (e) { err = errorText(e); draw(); }
      busy = false;
      poll();
    }

    async function poll() {
      clearTimeout(timer);
      if (!alive) return;
      try {
        const d = await api({ action: 'gameState', password, activityId: a.id, best: rankMode });
        if (!alive) return;
        if (err) { err = ''; lastText = ''; }
        apply(d);
      } catch (e) {
        if (!alive) return;
        err = errorText(e); lastText = ''; draw();
      }
      // 결과를 공개한 뒤에는 묻지 않는다. '새 판 시작'을 누르면 다시 시작.
      if (alive && (!state || state.phase === 'open')) timer = setTimeout(poll, POLL_MS);
    }

    draw();
    poll();
  };
})();
