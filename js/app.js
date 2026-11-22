// 학생 화면: 메인 → 학년 → 활동(안내·풀이) → 결과
// 주소: #/  ·  #/grade/1  ·  #/activity/<id>
(function () {
  const app = document.getElementById('app');
  const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
  const loaded = {};
  let lastName = '';

  // 활동 파일(activities/<id>.js)이 자기 내용을 등록할 때 부른다.
  window.registerActivity = function (id, content) { loaded[id] = content; };

  const visibleActs = g => ACTIVITIES.filter(a => a.grade === g && a.visible !== false);
  const isNew = a => (Date.now() - new Date(a.added + 'T00:00:00')) / 86400000 < CONFIG.NEW_DAYS;
  const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.trim(); };
  const norm = s => String(s).replace(/\s+/g, '').replace(/[−–]/g, '-').toLowerCase();

  // ---------- 메인 ----------
  function renderHome() {
    document.title = CONFIG.SITE_TITLE;
    app.innerHTML = `
      <section class="home">
        <h1>${esc(CONFIG.SITE_TITLE)}</h1>
        <p class="lead">학년을 골라 주세요</p>
        <div class="grade-pick">
          ${[1, 2].map(g => `
            <a class="grade-btn g${g}" href="#/grade/${g}">
              <span class="big">${g}학년</span>
              <span class="sub">활동 ${visibleActs(g).length}개</span>
            </a>`).join('')}
        </div>
        <form class="code-form" id="cf">
          <label class="field-label" for="code">수업 코드로 바로 가기</label>
          <div class="code-row">
            <input id="code" class="text-input" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="코드 입력">
            <button class="btn primary">들어가기</button>
          </div>
          <p class="hint" id="cfHint" role="alert"></p>
        </form>
        <footer class="home-foot"><a class="teacher-link" href="teacher.html">교사용</a></footer>
      </section>`;
    const code = document.getElementById('code');
    document.getElementById('cf').onsubmit = e => {
      e.preventDefault();
      const v = norm(code.value);
      if (!v) return code.focus();
      const a = ACTIVITIES.find(x => x.visible !== false && x.code && norm(x.code) === v);
      if (a) location.hash = '#/activity/' + encodeURIComponent(a.id);
      else document.getElementById('cfHint').textContent = '그런 코드가 없어요. 선생님이 알려 준 코드를 다시 확인해 주세요.';
    };
  }

  // ---------- 학년 화면 ----------
  function renderGrade(g) {
    if (g !== 1 && g !== 2) return renderHome();
    document.title = `${g}학년 · ${CONFIG.SITE_TITLE}`;
    const acts = visibleActs(g);
    const units = UNITS[g].filter(u => acts.some(a => a.unit === u));
    acts.forEach(a => { if (!units.includes(a.unit)) units.push(a.unit); });
    const card = a => `
      <a class="card g${a.grade}" href="#/activity/${encodeURIComponent(a.id)}">
        <div class="card-top"><span class="tag">${esc(a.type)}</span>${isNew(a) ? '<span class="new">새 활동</span>' : ''}</div>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.desc)}</p>
      </a>`;
    app.innerHTML = `
      <header class="topbar g${g}"><a class="btn-back" href="#/">← 처음으로</a><h1>${g}학년</h1></header>
      <section class="page">
        ${units.length ? units.map(u => `
          <div class="unit"><h2>${esc(u)}</h2>
            <div class="cards">${acts.filter(a => a.unit === u).map(card).join('')}</div>
          </div>`).join('') : '<p class="empty">아직 등록된 활동이 없어요.</p>'}
      </section>`;
  }

  // ---------- 활동 화면 ----------
  const topbar = m => `
    <header class="topbar g${m.grade}">
      <a class="btn-back" href="#/grade/${m.grade}">← 학년 화면으로</a>
      <span class="crumb">${esc(m.unit)}</span>
    </header>`;
  const body = (m, html) => { app.innerHTML = topbar(m) + `<section class="page">${html}</section>`; window.scrollTo(0, 0); };

  function loadScript(meta) {
    if (loaded[meta.id]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `activities/${encodeURIComponent(meta.id)}.js?v=${encodeURIComponent(meta.added || '')}`;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function renderActivity(id) {
    const meta = ACTIVITIES.find(a => a.id === id && a.visible !== false);
    if (!meta) {
      app.innerHTML = `<section class="page"><p class="empty">찾는 활동이 없어요.</p><a class="btn big" href="#/">처음으로</a></section>`;
      return;
    }
    document.title = `${meta.title} · ${CONFIG.SITE_TITLE}`;
    const hash = location.hash;
    body(meta, '<p class="empty">불러오는 중…</p>');
    try { await loadScript(meta); } catch (e) { /* 아래에서 처리 */ }
    if (location.hash !== hash) return;
    if (!loaded[id]) return body(meta, '<p class="empty">활동을 불러오지 못했어요. 새로 고침해 보세요.</p>');
    showIntro(meta, loaded[id]);
  }

  function showIntro(meta, c) {
    if (c.generate) c.questions = c.generate(); // 할 때마다 새 문제
    const howto = c.howto || `
      <ul>
        <li>한 화면에 한 문제씩 나와요.</li>
        <li>${c.feedback === 'end' ? '정답은 끝까지 푼 뒤에 한꺼번에 알려 줘요.' : '답을 내면 바로 정답인지 알려 줘요.'}</li>
        <li>끝까지 풀면 결과가 선생님께 자동으로 전송돼요.</li>
        <li>중간에 나가면 푼 내용이 사라지고 전송되지 않아요.</li>
      </ul>`;
    body(meta, `
      <div class="intro">
        <h1>${esc(meta.title)}</h1>
        <dl class="info">
          <div><dt>단원</dt><dd>${esc(meta.unit)}</dd></div>
          ${c.kind === 'mean-game'
            ? '<div><dt>방식</dt><dd>반 전체 게임</dd></div>'
            : `<div><dt>${c.countUnit === '판' ? '판 수' : '문항 수'}</dt><dd>${c.questions.length}${c.countUnit || '문항'}</dd></div>`}
        </dl>
        <div class="howto"><h2>하는 방법</h2>${howto}</div>
        <label class="field-label" for="nm">이름</label>
        <input id="nm" class="text-input" maxlength="20" autocomplete="off" placeholder="이름을 입력하세요" value="${esc(lastName)}">
        <p class="hint" id="nmHint" role="alert"></p>
        <button class="btn primary big" id="startBtn">시작하기</button>
      </div>`);
    const nm = document.getElementById('nm');
    const start = () => {
      const name = nm.value.trim();
      if (!name) { document.getElementById('nmHint').textContent = '이름을 먼저 입력해 주세요.'; nm.focus(); return; }
      lastName = name;
      c.kind === 'mean-game' ? gameEntry(meta, c, name) : runQuiz(meta, c, name);
    };
    document.getElementById('startBtn').onclick = start;
    nm.onkeydown = e => { if (e.key === 'Enter') start(); };
  }

  const correctText = q => q.type === 'choice' ? `${NUMS[q.answer]} ${q.choices[q.answer]}`
    : q.type === 'point' ? (q.display || '점 O')
    : (q.display || esc([].concat(q.answer)[0]));

  function runQuiz(meta, c, name) {
    const qs = c.questions, rec = [], immediate = c.feedback !== 'end';
    let i = 0;

    function show() {
      const q = qs[i];
      body(meta, `
        <div class="quiz">
          <div class="progress" aria-label="진행">
            <span class="count">${i + 1} / ${qs.length}</span>
            <div class="bar"><div style="width:${i / qs.length * 100}%"></div></div>
          </div>
          <div class="q-prompt">${q.prompt}</div>
          <div id="ans"></div>
          <div id="fb" aria-live="polite"></div>
        </div>`);
      const ans = document.getElementById('ans');
      if (q.type === 'choice') {
        ans.innerHTML = `<div class="choices">${q.choices.map((ch, k) =>
          `<button class="choice" data-k="${k}"><span class="num">${NUMS[k]}</span><span>${ch}</span></button>`).join('')}</div>`;
        ans.querySelectorAll('.choice').forEach(b => b.onclick = () => answer(+b.dataset.k));
      } else if (q.type === 'point') {
        ans.innerHTML = `
          <div id="pb">${PointBoard.svg(q, { interactive: true })}</div>
          <p class="pb-help" id="pbHelp">판을 눌러 종을 놓고, 끌어서 옮겨 보세요.</p>
          <button class="btn primary big" id="placeBtn" disabled>여기에 종 놓기</button>`;
        let pos = null;
        const pb = document.getElementById('placeBtn');
        PointBoard.attach(document.getElementById('pb'), p => { pos = p; pb.disabled = false; });
        pb.onclick = () => { if (pos) answer(pos); };
      } else {
        ans.innerHTML = `
          <form class="short" id="sf">
            <input id="si" class="text-input" autocomplete="off" inputmode="${q.inputmode || 'text'}" placeholder="답을 입력하세요">
            <button class="btn primary">제출</button>
          </form>`;
        const si = document.getElementById('si');
        si.focus();
        document.getElementById('sf').onsubmit = e => {
          e.preventDefault();
          if (si.value.trim()) answer(si.value.trim());
        };
      }
    }

    function answer(v) {
      const q = qs[i];
      let ok, shown, acc;
      if (q.type === 'choice') { ok = v === q.answer; shown = `${NUMS[v]} ${plain(q.choices[v])}`; }
      else if (q.type === 'point') { acc = PointBoard.accuracy(q, v); ok = acc >= 90; shown = `정확도 ${acc.toFixed(1)}점`; }
      else { ok = [].concat(q.answer).some(a => norm(a) === norm(v)); shown = v; }
      rec.push({ n: i + 1, correct: ok, answer: shown, pos: q.type === 'point' ? v : undefined, acc });
      if (!immediate) return next();

      document.querySelectorAll('#ans button, #ans input').forEach(el => el.disabled = true);
      if (q.type === 'choice') {
        const btns = document.querySelectorAll('.choice');
        btns[q.answer].classList.add('is-correct');
        if (!ok) btns[v].classList.add('is-wrong');
      }
      const last = i === qs.length - 1;
      let fb;
      if (q.type === 'point') {
        // 놓은 종과 세 친구까지의 거리를 그린다. 정답(점 O)은 q.reveal이 true일 때만.
        const ansEl = document.getElementById('ans');
        ansEl.innerHTML = PointBoard.svg(q, { bell: v, dist: true, reveal: !!q.reveal }) + (q.reveal ? PointBoard.LEGEND : '');
        if (ok && c.celebrate) PointBoard.celebrate(ansEl, q, v);
        fb = `<div class="fb ${ok ? 'ok' : 'ng'}"><span class="mark">${ok ? '○' : '✕'}</span>
                ${ok ? '공평해요!' : '아쉬워요.'} 정확도 ${acc.toFixed(1)}점</div>
              ${q.explain ? `<div class="explain">${q.explain}</div>` : ''}`;
      } else {
        fb = ok ? '<div class="fb ok"><span class="mark">○</span> 정답이에요!</div>'
                : `<div class="fb ng"><span class="mark">✕</span> 틀렸어요. 정답: ${correctText(q)}</div>`;
      }
      document.getElementById('fb').innerHTML = `${fb}
        <button class="btn primary big" id="nextBtn">${last ? '결과 보기' : '다음 문제'}</button>`;
      const nb = document.getElementById('nextBtn');
      nb.onclick = next; nb.focus();
    }

    function next() { i++; i < qs.length ? show() : showResult(meta, c, name, rec); }
    show();
  }

  // ---------- 결과 화면 ----------
  function showResult(meta, c, name, rec) {
    const correct = rec.filter(r => r.correct).length, total = rec.length;
    const wrong = rec.filter(r => !r.correct);
    const avg = rec.some(r => r.acc != null) ? Math.round(rec.reduce((s, r) => s + (r.acc || 0), 0) / total * 10) / 10 : null; // 소수 첫째 자리
    body(meta, `
      <div class="result">
        <p class="who">${esc(name)}</p>
        <h1>${esc(meta.title)}</h1>
        ${avg == null
          ? `<div class="score"><span class="num">${correct}</span> / ${total}</div>`
          : `<p class="send">${total}판 평균 점수</p>
             <div class="score"><span class="num">${avg.toFixed(1)}</span>점</div>
             <p class="send">성공 ○ ${correct} / ${total}판</p>`}
        <div id="sendStatus" class="send">결과를 보내는 중…</div>
        ${wrong.length ? `<h2>${avg != null ? '아쉬운 판 다시 보기 (90점 미만)' : '틀린 문제 다시 보기'}</h2>` + wrong.map(r => {
          const q = c.questions[r.n - 1];
          return `
            <div class="review">
              <div class="rv-head"><span class="mark ng">✕</span> ${r.n}번</div>
              ${q.type === 'point' ? PointBoard.svg(q, { bell: r.pos, dist: true, reveal: !!q.reveal, small: true })
                                   : `<div class="q-prompt small">${q.prompt}</div>`}
              <p>${q.type === 'point' ? '' : '내 답: '}${esc(r.answer)}</p>
              ${q.type === 'point' && !q.reveal ? '' : `<p>정답: ${correctText(q)}</p>`}
              ${q.explain ? `<div class="explain"><b>풀이</b> ${q.explain}</div>` : ''}
            </div>`;
        }).join('') : '<p class="perfect"><span class="mark ok">○</span> 모두 맞혔어요!</p>'}
        <div class="actions">
          <button class="btn primary big" id="again">다시 하기</button>
          <a class="btn big" href="#/grade/${meta.grade}">목록으로</a>
        </div>
      </div>`);
    document.getElementById('again').onclick = () => showIntro(meta, c);
    submit({
      action: 'submit', name, grade: meta.grade, unit: meta.unit,
      activityId: meta.id, title: meta.title, correct, total, items: rec,
      rankScore: c.ranking && avg != null ? avg : undefined
    });
  }

  async function submit(payload) {
    const el = () => document.getElementById('sendStatus');
    let err;
    for (let t = 0; t < 3; t++) {
      try {
        const d = await api(payload);
        if (el()) el().innerHTML = `<span class="mark ok">○</span> 결과를 선생님께 보냈어요. (${d.attempt}번째 시도)` +
          (d.rank ? `<div class="rank-badge">반 랭킹 <b>${d.rank}위</b> / ${d.count}명</div>` : '');
        return;
      } catch (e) {
        err = e;
        if (e.message === 'NO_API') break;
        await new Promise(r => setTimeout(r, 1500 * (t + 1)));
      }
    }
    if (!el()) return;
    el().className = 'send fail';
    el().innerHTML = `<span class="mark ng">✕</span> 결과를 보내지 못했어요. ${esc(errorText(err))}
      ${err.message === 'NO_API' ? '' : '<button class="btn" id="resend">다시 보내기</button>'}`;
    const rb = document.getElementById('resend');
    if (rb) rb.onclick = () => { el().className = 'send'; el().textContent = '결과를 보내는 중…'; submit(payload); };
  }

  // ---------- 반 전체 게임: 숫자 하나 내기 ----------
  function gameEntry(meta, c, name, prev) {
    body(meta, `
      <div class="quiz">
        <p class="who">${esc(name)}</p>
        <div class="q-prompt">${c.prompt}</div>
        <form class="short" id="gf">
          <input id="gv" class="text-input" inputmode="numeric" autocomplete="off"
                 placeholder="${c.min}~${c.max}" value="${prev == null ? '' : prev}">
          <button class="btn primary" id="gb">제출</button>
        </form>
        <p class="hint" id="gh" role="alert"></p>
      </div>`);
    const gv = document.getElementById('gv'), gh = document.getElementById('gh'), gb = document.getElementById('gb');
    gv.focus();
    document.getElementById('gf').onsubmit = async e => {
      e.preventDefault();
      const raw = gv.value.trim();
      const v = Number(raw);
      if (!/^-?\d+$/.test(raw) || v < c.min || v > c.max) {
        gh.textContent = `${c.min}부터 ${c.max}까지의 정수를 입력하세요.`;
        return gv.focus();
      }
      gb.disabled = true; gb.textContent = '보내는 중…'; gh.textContent = '';
      try {
        await api({ action: 'gameSubmit', name, grade: meta.grade, unit: meta.unit,
                    activityId: meta.id, title: meta.title, value: v });
        gameDone(meta, c, name, v);
      } catch (err) {
        gh.textContent = errorText(err);
        gb.disabled = false; gb.textContent = '제출';
      }
    };
  }

  function gameDone(meta, c, name, v) {
    body(meta, `
      <div class="result">
        <p class="who">${esc(name)}</p>
        <h1><span class="mark ok">○</span> 제출 완료!</h1>
        <p class="send">내가 낸 수</p>
        <div class="score"><span class="num">${v}</span></div>
        <p class="send">선생님 화면에서 결과를 함께 확인해요.<br>결과 공개 전에는 숫자를 바꿀 수 있어요.</p>
        <div class="actions">
          <button class="btn big" id="change">숫자 바꾸기</button>
          <a class="btn big" href="#/grade/${meta.grade}">목록으로</a>
        </div>
      </div>`);
    document.getElementById('change').onclick = () => gameEntry(meta, c, name, v);
  }

  // ---------- 주소에 따라 화면 고르기 ----------
  function route() {
    const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
    if (page === 'grade') renderGrade(Number(arg));
    else if (page === 'activity') renderActivity(decodeURIComponent(arg || ''));
    else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
