// 학생 화면과 교사용 화면이 함께 쓰는 것들

window.UNITS = {
  1: ['소인수분해', '정수와 유리수', '문자와 식', '일차방정식', '좌표평면과 그래프',
      '기본 도형', '작도와 합동', '평면도형', '입체도형', '자료의 정리와 해석'],
  2: ['유리수와 순환소수', '식의 계산', '일차부등식', '연립일차방정식', '일차함수',
      '삼각형의 성질', '사각형의 성질', '도형의 닮음', '피타고라스 정리', '확률']
};

window.esc = function (s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

// 서버(구글 앱스 스크립트) 호출. text/plain으로 보내야 브라우저 사전 확인 없이 전송된다.
window.api = async function (payload) {
  if (!CONFIG.API_URL) throw new Error('NO_API');
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'ERROR');
  return data;
};

window.ERROR_TEXT = {
  NO_API: '저장 주소가 아직 설정되지 않았어요. (js/config.js 의 API_URL)',
  WRONG_PASSWORD: '비밀번호가 맞지 않아요.',
  NO_PASSWORD_SET: '앱스 스크립트에 비밀번호가 설정되지 않았어요. 설치 안내서를 확인하세요.',
  BUSY: '지금 제출이 몰려 있어요. 잠시 뒤 다시 시도해 주세요.',
  CLOSED: '결과가 이미 공개됐어요. 선생님이 새 판을 시작하면 다시 낼 수 있어요.',
  EMPTY: '아직 제출한 학생이 없어요.'
};
// 페이지 안 확인 창. 브라우저 기본 confirm/alert는 일부 환경(앱 안 브라우저 등)에서 뜨지 않아 직접 만든다.
// opt: { ok: '버튼 글자', danger: true, cancel: false(취소 버튼 없음), typeWord: '입력해야 할 낱말' }
window.ask = function (message, opt) {
  opt = opt || {};
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <p class="ask-msg">${esc(message).replace(/\n/g, '<br>')}</p>
        ${opt.typeWord ? `<input class="text-input" id="askIn" autocomplete="off" placeholder="${esc(opt.typeWord)}">
                          <p class="hint" id="askHint"></p>` : ''}
        <div class="t-actions">
          ${opt.cancel === false ? '' : '<button class="btn" id="askNo">취소</button>'}
          <button class="btn ${opt.danger ? 'danger-fill' : 'primary'}" id="askYes">${esc(opt.ok || '확인')}</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const done = v => { ov.remove(); resolve(v); };
    const input = ov.querySelector('#askIn');
    ov.querySelector('#askYes').onclick = () => {
      if (input && input.value.trim() !== opt.typeWord) {
        ov.querySelector('#askHint').textContent = `'${opt.typeWord}'라고 정확히 입력해 주세요.`;
        return input.focus();
      }
      done(true);
    };
    const no = ov.querySelector('#askNo');
    if (no) no.onclick = () => done(false);
    ov.onclick = e => { if (e.target === ov) done(false); };
    (input || ov.querySelector('#askYes')).focus();
  });
};

window.errorText = function (e) {
  return ERROR_TEXT[e && e.message] || '연결에 실패했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
};
