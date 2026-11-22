// 공평한 종 자리 찾기: 세 친구 A, B, C에게서 같은 거리인 곳(외심)에 종을 놓는다.
// 교사 요청 (2026-11-22): 팥빙수 외심 게임을 '세 사람이 공평하게 종을 치는' 게임으로 변형.
// 6판 = 예각·직각·둔각 삼각형 각 2판. 할 때마다 새 삼각형. 정확도 90점 이상이면 ○.
(function () {
  const W = 100, H = 75;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rad = d => d * Math.PI / 180;
  const r1 = n => Math.round(n * 10) / 10;

  const EXPLAIN = {
    acute: '<b>예각삼각형</b>의 외심은 삼각형 <b>안</b>에 있어요. 세 변의 수직이등분선이 한 점 O에서 만나고, O에서 세 꼭짓점까지의 거리는 모두 같아요.',
    right: '<b>직각삼각형</b>의 외심은 <b>빗변의 중점</b>이에요. 빗변이 외접원의 지름이 되기 때문이에요.',
    obtuse: '<b>둔각삼각형</b>의 외심은 삼각형 <b>밖</b>에 있어요. 그래도 세 변의 수직이등분선은 한 점 O에서 만나요.'
  };

  // 외접원 위에 세 점을 고른다. 두 점 사이 호의 크기로 삼각형 종류를 정한다.
  // (어떤 호가 180°보다 크면 둔각, 180°면 직각, 모두 180°보다 작으면 예각)
  function triangle(kind) {
    const R = rnd(21, 30);
    const O = { x: rnd(R + 3, W - R - 3), y: rnd(R + 3, H - R - 3) };
    const a0 = rnd(0, 360);
    let gaps;
    if (kind === 'right') {
      const g = rnd(55, 125);
      gaps = [180, g];
    } else if (kind === 'acute') {
      let g1, g2, g3;
      do { g1 = rnd(75, 155); g2 = rnd(75, 155); g3 = 360 - g1 - g2; } while (g3 < 75 || g3 > 155);
      gaps = [g1, g2];
    } else {
      const g1 = rnd(205, 245);
      gaps = [g1, rnd(55, 360 - g1 - 55)];
    }
    const angs = [a0, a0 + gaps[0], a0 + gaps[0] + gaps[1]];
    const players = angs.map(a => ({ x: r1(O.x + R * Math.cos(rad(a))), y: r1(O.y + R * Math.sin(rad(a))) }));
    return {
      type: 'point',
      prompt: '세 친구 <b>A, B, C</b>가 종을 <b>똑같은 거리</b>에서 칠 수 있도록, 공평한 자리에 종을 놓아 보세요.',
      players, target: O, R,
      display: '세 변의 수직이등분선이 만나는 점 O (외심)',
      explain: EXPLAIN[kind]
    };
  }

  registerActivity('g2-fair-bell', {
    feedback: 'immediate',
    countUnit: '판',
    howto: `
      <ul>
        <li>세 친구 A, B, C가 종 하나로 게임을 해요. 누구에게도 유리하지 않게, <b>세 친구에게서 똑같은 거리</b>에 종을 놓아야 해요.</li>
        <li>판을 누르거나 끌어서 종을 옮기고 <b>[여기에 종 놓기]</b>를 눌러요.</li>
        <li>놓으면 정확도 점수(100점 만점)가 나오고, <b>90점 이상</b>이면 성공 ○이에요.</li>
        <li>모두 6판이고, 판마다 친구들의 자리가 바뀌어요.</li>
        <li>끝까지 하면 결과가 선생님께 자동으로 전송돼요. 중간에 나가면 전송되지 않아요.</li>
      </ul>`,
    generate: () => ['acute', 'right', 'obtuse', 'acute', 'right', 'obtuse'].map(triangle)
  });
})();
