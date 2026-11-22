/**
 * 중학교 수학 활동 – 결과 저장 서버 (구글 앱스 스크립트)
 *
 * 이 코드는 결과를 저장할 구글 시트의 [확장 프로그램 → Apps Script]에 붙여 넣는다.
 * 교사 비밀번호는 코드에 쓰지 않고 [프로젝트 설정 → 스크립트 속성]에
 * 이름 TEACHER_PASSWORD 로 저장한다. (설치안내.md 참고)
 */

const SHEET_NAME = '결과';
const HEADERS = ['제출시각', '이름', '학년', '단원', '활동ID', '활동제목', '맞힌수', '전체', '시도', '문항별'];
const GAME_SHEET = '게임';
const GAME_HEADERS = ['제출시각', '활동ID', '판', '이름', '숫자'];
const TZ = 'Asia/Seoul';

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    switch (req.action) {
      case 'submit': out = submit_(req); break;
      case 'gameSubmit': out = gameSubmit_(req); break;
      case 'list': checkPassword_(req.password); out = list_(); break;
      case 'delete': checkPassword_(req.password); out = remove_(req); break;
      case 'gameState': checkPassword_(req.password); out = gameState_(req); break;
      case 'gameReveal': checkPassword_(req.password); out = gameReveal_(req); break;
      case 'gameReset': checkPassword_(req.password); out = gameReset_(req); break;
      default: throw new Error('BAD_ACTION');
    }
    out.ok = true;
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

// 주소가 살아 있는지 브라우저로 확인할 때
function doGet() {
  return ContentService.createTextOutput('OK');
}

function sheetOf_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
const sheet_ = () => sheetOf_(SHEET_NAME, HEADERS);
const gameSheet_ = () => sheetOf_(GAME_SHEET, GAME_HEADERS);

// 비밀번호 확인. 10분 동안 10번 넘게 틀리면 잠시 막는다.
function checkPassword_(pw) {
  const real = PropertiesService.getScriptProperties().getProperty('TEACHER_PASSWORD');
  if (!real) throw new Error('NO_PASSWORD_SET');
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('pwFails') || 0);
  if (fails >= 10) throw new Error('WRONG_PASSWORD');
  if (typeof pw !== 'string' || pw !== real) {
    cache.put('pwFails', String(fails + 1), 600);
    Utilities.sleep(1000);
    throw new Error('WRONG_PASSWORD');
  }
}

function text_(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function now_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('BUSY');
  try { return fn(); } finally { lock.releaseLock(); }
}

// 모든 칸을 '텍스트'로 저장해 이름 등이 수식으로 해석되지 않게 한다.
function appendRow_(sh, row) {
  const range = sh.getRange(sh.getLastRow() + 1, 1, 1, row.length);
  range.setNumberFormat('@');
  range.setValues([row.map(String)]);
}

function checkCommon_(req) {
  const name = text_(req.name, 20);
  const activityId = text_(req.activityId, 60);
  const grade = Number(req.grade);
  if (!name || !/^[\w-]+$/.test(activityId) || [1, 2, 3].indexOf(grade) < 0) throw new Error('BAD_DATA');
  return { name: name, activityId: activityId, grade: grade };
}

// 결과 시트에 한 줄 추가 (잠금 안에서 부른다). 시도 횟수를 돌려준다.
function appendResult_(c, req, correct, total, items) {
  const sh = sheet_();
  const last = sh.getLastRow();
  let attempt = 1;
  if (last > 1) {
    sh.getRange(2, 1, last - 1, 5).getValues().forEach(function (r) {
      if (r[1] === c.name && r[4] === c.activityId) attempt++;
    });
  }
  appendRow_(sh, [now_(), c.name, c.grade, text_(req.unit, 40), c.activityId, text_(req.title, 80),
    correct, total, attempt, JSON.stringify(items)]);
  return attempt;
}

// ---------- 퀴즈 결과 ----------
function submit_(req) {
  const c = checkCommon_(req);
  const total = Number(req.total);
  const correct = Number(req.correct);
  if (!(total >= 1 && total <= 200) || !(correct >= 0 && correct <= total)) throw new Error('BAD_DATA');
  const items = (Array.isArray(req.items) ? req.items.slice(0, 200) : []).map(function (it) {
    return { n: Number(it.n), correct: !!it.correct, answer: text_(it.answer, 100) };
  });
  return withLock_(function () {
    return { attempt: appendResult_(c, req, correct, total, items) };
  });
}

// ---------- 반 전체 게임 (평균에 가장 가까운 수) ----------
function gameInfo_(id) {
  const raw = PropertiesService.getScriptProperties().getProperty('game_' + id);
  return raw ? JSON.parse(raw) : { round: 1, phase: 'open' };
}
function setGameInfo_(id, info) {
  PropertiesService.getScriptProperties().setProperty('game_' + id, JSON.stringify(info));
}

function gameSubmit_(req) {
  const c = checkCommon_(req);
  const value = Number(req.value);
  if (!Number.isInteger(value) || value < -100000 || value > 100000) throw new Error('BAD_DATA');
  return withLock_(function () {
    const info = gameInfo_(c.activityId);
    if (info.phase !== 'open') throw new Error('CLOSED');
    appendRow_(gameSheet_(), [now_(), c.activityId, info.round, c.name, value]);
    const attempt = appendResult_(c, req, '', '', [{ n: 1, correct: null, answer: '낸 수 ' + value }]);
    return { round: info.round, attempt: attempt };
  });
}

// 현재 판의 응답 (같은 이름은 마지막에 낸 수만)
function gameEntries_(id, round) {
  const sh = gameSheet_();
  const last = sh.getLastRow();
  const byName = {};
  if (last > 1) {
    sh.getRange(2, 1, last - 1, GAME_HEADERS.length).getValues().forEach(function (r) {
      if (String(r[1]) === id && Number(r[2]) === round) byName[String(r[3])] = Number(r[4]);
    });
  }
  return Object.keys(byName).map(function (name) { return { name: name, value: byName[name] }; });
}

function gameState_(req) {
  const id = text_(req.activityId, 60);
  const info = gameInfo_(id);
  return { round: info.round, phase: info.phase, entries: gameEntries_(id, info.round) };
}

function gameReveal_(req) {
  const id = text_(req.activityId, 60);
  return withLock_(function () {
    const info = gameInfo_(id);
    if (!gameEntries_(id, info.round).length) throw new Error('EMPTY');
    info.phase = 'revealed';
    setGameInfo_(id, info);
    return gameState_(req);
  });
}

function gameReset_(req) {
  const id = text_(req.activityId, 60);
  return withLock_(function () {
    const info = gameInfo_(id);
    setGameInfo_(id, { round: info.round + 1, phase: 'open' });
    return gameState_(req);
  });
}

// ---------- 교사용 ----------
function list_() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return { rows: [] };
  const vals = sh.getRange(2, 1, last - 1, HEADERS.length).getDisplayValues();
  const rows = vals.map(function (r) {
    let items = [];
    try { items = JSON.parse(r[9]); } catch (e) {}
    return {
      time: r[0], name: r[1], grade: Number(r[2]), unit: r[3], activityId: r[4], title: r[5],
      correct: Number(r[6]), total: Number(r[7]), attempt: Number(r[8]), items: items
    };
  });
  rows.reverse(); // 최신순
  return { rows: rows };
}

// 시트에서 조건에 맞는 줄을 지우고 지운 수를 돌려준다.
function deleteWhere_(sh, width, match) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const range = sh.getRange(2, 1, last - 1, width);
  const vals = range.getValues();
  const keep = vals.filter(function (r) { return !match(r); });
  const deleted = vals.length - keep.length;
  if (deleted) {
    range.clearContent();
    if (keep.length) {
      const k = sh.getRange(2, 1, keep.length, width);
      k.setNumberFormat('@');
      k.setValues(keep.map(function (r) { return r.map(String); }));
    }
  }
  return deleted;
}

function remove_(req) {
  return withLock_(function () {
    if (req.scope === 'all') {
      const deleted = deleteWhere_(sheet_(), HEADERS.length, function () { return true; });
      deleteWhere_(gameSheet_(), GAME_HEADERS.length, function () { return true; });
      return { deleted: deleted };
    }
    if (req.scope === 'activity') {
      const id = text_(req.activityId, 60);
      const deleted = deleteWhere_(sheet_(), HEADERS.length, function (r) { return String(r[4]) === id; });
      deleteWhere_(gameSheet_(), GAME_HEADERS.length, function (r) { return String(r[1]) === id; });
      return { deleted: deleted };
    }
    throw new Error('BAD_SCOPE');
  });
}
