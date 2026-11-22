// 활동 목록 (학생 화면에 보이는 정보).
// 활동 내용(문제)은 activities/<id>.js 에 활동마다 따로 둔다.
// 단원 안에서는 이 목록에 적힌 순서(= 추가한 순서)대로 나열된다.
//
// 형식 예:
// { id: 'g1-int-add', code: '1101', title: '정수 덧셈 마스터', grade: 1, unit: '정수와 유리수',
//   type: '퀴즈', desc: '부호가 다른 수의 덧셈 10문제', visible: true, added: '2026-11-22' },
// code: 학생이 홈 화면에서 입력하는 수업 코드 (숫자 4자리, 활동마다 다르게)
window.ACTIVITIES = [
  { id: 'g1-mean-game', code: '1101', title: '대푯값 퀴즈: 평균에 가장 가까운 수는?', grade: 1,
    unit: '자료의 정리와 해석', type: '게임', kind: 'mean-game',
    desc: '반 전체가 1~100 중 수를 내고, 평균에 가장 가까운 사람이 이겨요', visible: true, added: '2026-11-22' },
];
