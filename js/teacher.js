// 교사용 화면: 비밀번호 → 결과 목록·골라 보기·학생별 상세·문항별 정답률·내려받기·삭제
// 비밀번호는 서버(앱스 스크립트)에서 확인한다. 이 페이지는 비밀번호를 메모리에만 들고 있다.
(function () {
  const app = document.getElementById('app');
  let pw = '', rows = [];
  const f = { grade: '', act: '', from: '', to: '' };

  // ---------- 로그인 ----------
  function login(msg) {
    app.innerHTML = `
      <section class="page narrow">
        <h1>교사용 화면</h1>
        <form id="lf">
          <label class="field-label" for="pw">비밀번호</label>
          <input type="password" id="pw" class="text-input" autocomplete="current-password">
          <p class="hint" id="lh" role="alert">${esc(msg || '')}</p>
          <button class="btn primary big" id="lb">들어가기</button>
        </form>
        <p><a href="index.html">← 학생 화면으로</a></p>
      </section>`;
    const input = document.getElementById('pw');
    input.focus();
    document.getElementById('lf').onsubmit = async e => {
      e.preventDefault();
      if (!input.value) return;
      const lb = document.getElementById('lb');
      lb.disabled = true; lb.textContent = '확인 중…';
      pw = input.value;
      try { await load(); render(); }
      catch (err) { pw = ''; login(errorText(err)); }
    };
  }

  async function load() {
    const d = await api({ action: 'list', password: pw });
    rows = d.rows; // 최신순
  }

  // ---------- 골라 보기 ----------
  function filtered() {
    return rows.filter(r =>
      (!f.grade || String(r.grade) === f.grade) &&
      (!f.act || r.activityId === f.act) &&
      (!f.from || r.time.slice(0, 10) >= f.from) &&
      (!f.to || r.time.slice(0, 10) <= f.to));
  }

  function activityList() {
    const m = new Map();
    rows.forEach(r => { if (!f.grade || String(r.grade) === f.grade) m.set(r.activityId, r); });
    return [...m.values()].sort((a, b) => a.grade - b.grade || a.title.localeCompare(b.title, 'ko'));
  }

  // ---------- 화면 ----------
  function render() {
    const list = filtered();
    const acts = activityList();
    if (f.act && !acts.some(a => a.activityId === f.act)) f.act = '';
    const actTitle = f.act ? (acts.find(a => a.activityId === f.act) || {}).title : '';

    app.innerHTML = `
      <header class="t-head">
        <h1>교사용 화면</h1>
        <button class="btn" id="reload">새로 고침</button>
        <button class="btn" id="logout">나가기</button>
      </header>
      <section class="t-page">
        ${linksPanel()}
        <div class="panel">
          <div class="filters">
            <label>학년
              <select id="fGrade">
                <option value="">전체</option>
                <option value="1" ${f.grade === '1' ? 'selected' : ''}>1학년</option>
                <option value="2" ${f.grade === '2' ? 'selected' : ''}>2학년</option>
              </select></label>
            <label>활동
              <select id="fAct">
                <option value="">전체</option>
                ${acts.map(a => `<option value="${esc(a.activityId)}" ${f.act === a.activityId ? 'selected' : ''}>${a.grade}학년 · ${esc(a.title)}</option>`).join('')}
              </select></label>
            <label>시작 날짜 <input type="date" id="fFrom" value="${f.from}"></label>
            <label>끝 날짜 <input type="date" id="fTo" value="${f.to}"></label>
          </div>
          <div class="t-actions">
            <button class="btn" id="dl" ${list.length ? '' : 'disabled'}>엑셀로 내려받기 (${list.length}건)</button>
            <button class="btn danger" id="delAct" ${f.act ? '' : 'disabled'} title="활동을 먼저 고르세요">이 활동 결과 삭제</button>
            <button class="btn danger" id="delAll" ${rows.length ? '' : 'disabled'}>전체 삭제</button>
          </div>
        </div>

        ${f.act ? statsPanel(list, actTitle) : ''}

        <div class="panel">
          <p class="summary">결과 ${list.length}건 · 줄을 누르면 문항별 답을 볼 수 있어요.</p>
          ${list.length ? `
          <div class="table-wrap"><table>
            <thead><tr><th>제출 시각</th><th>이름</th><th>활동</th><th>점수</th><th>시도</th></tr></thead>
            <tbody>${list.map(r => `
              <tr data-i="${rows.indexOf(r)}">
                <td>${esc(r.time.slice(0, 16))}</td>
                <td>${esc(r.name)}</td>
                <td><span class="gtag g${r.grade}">${r.grade}</span> ${esc(r.title)}</td>
                <td>${r.total ? `${r.correct} / ${r.total}` : '참여'}</td>
                <td>${r.attempt}번째</td>
              </tr>`).join('')}
            </tbody></table></div>` : '<p class="empty">결과가 없어요.</p>'}
        </div>
      </section>`;

    const on = (id, ev, fn) => document.getElementById(id)[ev] = fn;
    on('fGrade', 'onchange', e => { f.grade = e.target.value; render(); });
    on('fAct', 'onchange', e => { f.act = e.target.value; render(); });
    on('fFrom', 'onchange', e => { f.from = e.target.value; render(); });
    on('fTo', 'onchange', e => { f.to = e.target.value; render(); });
    on('reload', 'onclick', refresh);
    on('logout', 'onclick', () => { pw = ''; rows = []; login(); });
    on('dl', 'onclick', () => download(list));
    on('delAct', 'onclick', () => removeActivity(actTitle));
    on('delAll', 'onclick', removeAll);
    app.querySelectorAll('tbody tr').forEach(tr => tr.onclick = () => detail(rows[+tr.dataset.i]));
    const lp = document.getElementById('links');
    if (lp) lp.ontoggle = () => { linksOpen = lp.open; };
    app.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copyLink(b));
    app.querySelectorAll('[data-qr]').forEach(b => b.onclick = () => showQR(ACTIVITIES.find(a => a.id === b.dataset.qr)));
    app.querySelectorAll('[data-board]').forEach(b => b.onclick = () => {
      const a = ACTIVITIES.find(x => x.id === b.dataset.board);
      openBoard({ app, password: pw, activity: a, link: linkOf(a), onBack: refresh });
    });
  }

  // ---------- 활동 링크·QR ----------
  let linksOpen = false;
  const siteBase = () => location.href.split('#')[0].replace(/teacher\.html.*$/, '');
  const linkOf = a => `${siteBase()}#/activity/${encodeURIComponent(a.id)}`;

  function linksPanel() {
    const acts = (window.ACTIVITIES || []).slice().sort((a, b) => a.grade - b.grade);
    return `
      <details class="panel links" id="links" ${linksOpen ? 'open' : ''}>
        <summary><h2>활동 링크 · QR · 수업 코드 (${acts.length}개)</h2></summary>
        ${acts.length ? acts.map(a => `
          <div class="link-row">
            <div class="link-info">
              <span class="gtag g${a.grade}">${a.grade}</span>
              <b>${esc(a.title)}</b>
              ${a.visible === false ? '<span class="tag">숨김 · 학생 접속 안 됨</span>' : ''}
              <div class="link-sub">${a.code ? `코드 <b class="code">${esc(a.code)}</b> · ` : ''}${esc(a.unit)}</div>
            </div>
            <div class="link-btns">
              ${a.kind === 'mean-game' ? `<button class="btn primary" data-board="${esc(a.id)}">게임 진행</button>` : ''}
              <button class="btn" data-copy="${esc(linkOf(a))}">링크 복사</button>
              <button class="btn" data-qr="${esc(a.id)}">QR 크게 보기</button>
            </div>
          </div>`).join('') : '<p class="summary">아직 등록된 활동이 없어요.</p>'}
      </details>`;
  }

  async function copyLink(btn) {
    const url = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(url);
      const old = btn.textContent;
      btn.textContent = '복사했어요 ✓';
      setTimeout(() => { btn.textContent = old; }, 1500);
    } catch (e) {
      prompt('아래 링크를 복사하세요.', url);
    }
  }

  function showQR(a) {
    if (!a) return;
    const url = linkOf(a);
    let svg = '<p class="hint">QR 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>';
    if (window.qrcode) {
      const q = qrcode(0, 'M');
      q.addData(url);
      q.make();
      svg = q.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    }
    const ov = document.createElement('div');
    ov.className = 'overlay qr-overlay';
    ov.innerHTML = `
      <div class="modal qr-modal" role="dialog" aria-modal="true">
        <h2>${esc(a.title)}</h2>
        <div class="qr-box">${svg}</div>
        ${a.code ? `<p class="qr-code">수업 코드 <b>${esc(a.code)}</b></p>` : ''}
        <p class="qr-url">${esc(url)}</p>
        <div class="t-actions"><button class="btn primary big" id="qrClose">닫기</button></div>
      </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.onclick = e => { if (e.target === ov) close(); };
    ov.querySelector('#qrClose').onclick = close;
  }

  function statsPanel(list, title) {
    const n = Math.max(0, ...list.map(r => r.total));
    if (!n) return ''; // 점수가 없는 활동(게임)
    const stat = Array.from({ length: n }, () => ({ ok: 0, all: 0 }));
    list.forEach(r => r.items.forEach(it => {
      const s = stat[it.n - 1];
      if (s) { s.all++; if (it.correct) s.ok++; }
    }));
    return `
      <div class="panel">
        <h2>문항별 정답률 · ${esc(title)} (${list.length}회 응시)</h2>
        ${stat.map((s, k) => {
          const p = s.all ? Math.round(s.ok / s.all * 100) : 0;
          return `<div class="stat-row"><b>${k + 1}번</b>
            <div class="stat-bar"><div style="width:${p}%"></div></div>
            <span>${p}% (${s.ok}/${s.all})</span></div>`;
        }).join('')}
      </div>`;
  }

  function detail(r) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h2>${esc(r.name)} · ${esc(r.title)}</h2>
        <p class="summary">${esc(r.time)} · ${r.attempt}번째 시도 · ${r.total ? `${r.correct} / ${r.total}` : '참여'}</p>
        <table>
          <thead><tr><th>문항</th><th>정오</th><th>낸 답</th></tr></thead>
          <tbody>${r.items.map(it => `
            <tr><td>${it.n}번</td>
              <td>${it.correct == null ? '-' : it.correct ? '<span class="mark ok">○</span>' : '<span class="mark ng">✕</span>'}</td>
              <td>${esc(it.answer)}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="t-actions"><button class="btn primary" id="close">닫기</button></div>
      </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.onclick = e => { if (e.target === ov) close(); };
    ov.querySelector('#close').onclick = close;
    ov.querySelector('#close').focus();
  }

  // ---------- 내려받기 (엑셀에서 바로 열리는 CSV) ----------
  function download(list) {
    const n = Math.max(0, ...list.map(r => r.total));
    const head = ['제출시각', '이름', '학년', '단원', '활동', '맞힌 수', '전체', '시도'];
    for (let k = 1; k <= n; k++) head.push(`${k}번 정오`, `${k}번 답`);
    const lines = [head].concat(list.map(r => {
      const row = [r.time, r.name, r.grade, r.unit, r.title, r.correct, r.total, r.attempt];
      for (let k = 1; k <= n; k++) {
        const it = r.items.find(x => x.n === k);
        row.push(it && it.correct != null ? (it.correct ? 'O' : 'X') : '', it ? it.answer : '');
      }
      return row;
    }));
    const cell = v => {
      let s = String(v == null ? '' : v);
      if (/^[=@]|^[+\-](?![\d.])/.test(s)) s = "'" + s; // 수식으로 실행되지 않게
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '﻿' + lines.map(l => l.map(cell).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const d = new Date();
    a.download = `수학활동결과_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- 삭제 ----------
  async function removeActivity(title) {
    const n = rows.filter(r => r.activityId === f.act).length;
    if (!await ask(`'${title}' 결과 ${n}건을 모두 삭제할까요?\n삭제하면 되돌릴 수 없어요.`, { ok: '삭제', danger: true })) return;
    await doDelete({ scope: 'activity', activityId: f.act });
  }
  async function removeAll() {
    if (!await ask(`저장된 결과 ${rows.length}건을 모두 삭제합니다. 되돌릴 수 없어요.\n계속하려면 아래에 '전체삭제'라고 입력하세요.`,
                   { ok: '전체 삭제', danger: true, typeWord: '전체삭제' })) return;
    await doDelete({ scope: 'all' });
  }
  const notice = msg => ask(msg, { cancel: false });
  async function doDelete(opt) {
    try {
      const d = await api(Object.assign({ action: 'delete', password: pw }, opt));
      await refresh();
      notice(`${d.deleted}건을 삭제했어요.`);
    } catch (err) { notice(errorText(err)); }
  }

  async function refresh() {
    try { await load(); render(); }
    catch (err) {
      if (err.message === 'WRONG_PASSWORD') { pw = ''; login(errorText(err)); }
      else notice(errorText(err));
    }
  }

  login();
})();
