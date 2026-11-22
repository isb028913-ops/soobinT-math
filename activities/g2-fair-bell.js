// 공평한 종 자리 찾기: 세 친구 A, B, C에게서 같은 거리인 곳에 종을 놓는다. (외심 도입 활동)
// 교사 요청 (2026-11-22): 팥빙수 외심 게임을 '세 사람이 공평하게 종을 치는' 게임으로 변형.
// 도입 활동: 학생 화면에 '외심'이라는 용어를 쓰지 않고, 세 꼭짓점에서 같은 거리인 점만 다룬다.
// 정답 위치·수직이등분선·거리는 보여 주지 않고 놓은 종과 정확도만 보여 준다. 둔각삼각형은 다루지 않는다 (예각 3판, 직각 2판).
// 5판, 할 때마다 새 삼각형. 정확도 90점 이상이면 ○. 5판 평균 점수로 반 랭킹.
(function () {
  const W = 100, H = 75, U = 5;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rad = d => d * Math.PI / 180;
  const r1 = n => Math.round(n * 10) / 10;

  // 외접원 위에 세 점을 고른다. 두 점 사이 호의 크기로 삼각형 모양을 다양하게 한다.
  // 삼각형을 크게: 세 친구(얼굴·이름표)가 판 안에 들어오는 한에서 가장 큰 쪽으로 고른다.
  const EDGE = 8; // 판 가장자리에서 띄울 거리 (얼굴과 A·B·C 글자 자리)
  function triangle(kind) {
    for (let t = 0; t < 400; t++) {
      const T = triangleOnce(kind, t < 300 ? rnd(30, 36) : rnd(26, 30));
      if (T.players.every(p => p.x >= EDGE && p.x <= W - EDGE && p.y >= EDGE && p.y <= H - EDGE)) return T;
    }
    return triangleOnce(kind, 24, true);
  }

  function triangleOnce(kind, R, center) {
    const O = center ? { x: W / 2, y: H / 2 } : { x: rnd(EDGE, W - EDGE), y: rnd(EDGE, H - EDGE) };
    const a0 = rnd(0, 360);
    let gaps;
    if (kind === 'right') {
      gaps = [180, rnd(55, 125)];
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
      prompt: '세 친구 <b>A, B, C</b>가 <b>할리갈리</b>를 해요. 누구나 <b>똑같은 거리</b>에서 종을 칠 수 있도록, 공평한 자리에 종을 놓아 보세요.',
      players, target: O, R,  // 정답 그림(reveal)은 보여 주지 않고 정확도만 알려 준다 (교사 요청)
      scale: 1.5              // 점수 깎는 기준: 정답에서 OA의 15% 안쪽(약 10mm)이면 90점 이상 (교사 요청으로 너그럽게)
    };
  }

  // 하는 방법에 보여 줄 예시 그림 (공평한 자리에 놓은 모습). 실제 문제에는 나오지 않는 고정된 삼각형.
  const EXAMPLE = {
    players: [{ x: 45.1, y: 10.4 }, { x: 76.3, y: 47.6 }, { x: 28.6, y: 56.0 }],
    target: { x: 50, y: 38 }, R: 28
  };

  registerActivity('g2-fair-bell', {
    feedback: 'immediate',
    countUnit: '판',
    celebrate: true, // 90점 이상이면 종이 울리고 A·B·C에게 카드를 나눠 주는 모션
    ranking: true,
    howto: `
      <div class="howto-row">
        <ul>
          <li>세 친구 A, B, C가 <b>할리갈리</b>를 해요. 누구에게도 유리하지 않게, <b>세 친구에게서 똑같은 거리</b>에 종을 놓아야 해요.</li>
          <li>놓으면 정확도 점수(100점 만점)가 나와요. <b>90점 이상</b>이면 성공 ○이에요.</li>
          <li><b>5판 평균 점수</b>로 반 랭킹에 올라가요. 끝까지 해야 기록돼요.</li>
        </ul>
        <figure class="howto-ex">
          ${PointBoard.svg(EXAMPLE, { bell: EXAMPLE.target, dist: true, cards: true, viewBox: '20 2 64 60' })}
          <figcaption>예시) 세 친구까지 모두 56mm! 성공하면 카드를 받아요.</figcaption>
        </figure>
      </div>`,
    generate: () => ['acute', 'right', 'acute', 'right', 'acute'].map(triangle)
  });
})();
