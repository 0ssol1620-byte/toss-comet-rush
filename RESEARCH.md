# 리서치 요약

## 플랫폼 판단

- 앱인토스 공식 문서는 WebView 튜토리얼과 게임센터 개발 가이드를 제공합니다.
- 게임센터 점수 제출은 `submitGameCenterLeaderBoardScore({ score: string })` 형태이며, 리더보드는 `openGameCenterLeaderboard()`로 호출합니다.
- 게임센터 기능은 최소 지원 앱 버전이 낮으면 `undefined`가 반환될 수 있으므로, 게임 플레이 자체는 SDK 실패와 독립적으로 동작해야 합니다.
- 로컬/브라우저 검수에서는 앱인토스 SDK가 없기 때문에 `navigator.vibrate`와 no-op fallback으로 감각 피드백을 대체합니다.

## 라이브러리 선택

- npm에서 확인한 최신 버전: `phaser@4.0.0`, `@apps-in-toss/web-framework@2.4.7`, `react@19.2.5`, `vite@8.0.10`, `typescript@6.0.3`.
- Phaser 4는 ESM default export가 없어 `import * as Phaser from 'phaser'`로 사용합니다.
- Vite 8은 현재 환경에서 `Bus error`가 발생해 프로덕션 빌드는 esbuild 직접 번들로 우회했습니다.
- 2026년 4월 Phaser 공식 글 기준 Phaser 4는 WebGL 렌더러를 재구성했고, 모바일에서 context restoration과 draw/index-buffer 효율을 핵심 개선점으로 둡니다.
- Phaser 공식 FX/Particles 문서는 glow, bloom, shader FX, particle emitter가 강한 피드백을 만드는 핵심 도구라고 설명합니다. 현재 구현은 Phaser 4를 유지하면서 postFX glow를 안전 호출하고, 번들 호환성을 위해 수동 파티클 풀 형태의 burst를 사용합니다.

## 게임 설계 원칙

- 1판 60초로 충분히 몰입할 시간을 주되, 모바일 한 손 조작은 유지합니다.
- 손실 회피형 다크패턴 대신 실력 기반 보상, 아슬회피, 콤보, 월급각성으로 재도전 동기를 만듭니다.
- 점수, 최고기록, 일일 미션을 즉시 보여줘 다음 목표를 명확히 합니다.
- 에셋은 코드 생성형 벡터/글로우 텍스처로 만들어 초기 다운로드 크기와 외부 저작권 리스크를 줄였습니다.
- 최신 버전은 `월급 방어전` 세계관으로 전환하고, 월급 금고, 현금봉투, 카드값 블랙홀, PAYDAY 오브, 보너스 코인, 시간 쿠폰을 2.5D Canvas 텍스처로 재제작했습니다.
- 유료급 감각을 위해 위험 보상 루프를 강화했습니다: 카드값 블랙홀 아슬회피가 월급각성을 충전하고, 월급각성은 파산 방어와 점수 2.1배를 제공합니다.
- `v7`에서는 하이퍼캐주얼의 즉시성에 로그라이크 선택지를 결합했습니다. 45초, 30초, 15초에 3지선다 업그레이드를 띄워 한 판 안에서도 빌드가 달라지게 했습니다.
- 지출 위협은 카드값 하나에서 월세, 세금, 구독료까지 확장했습니다. 같은 회피 조작을 유지하면서도 실루엣과 낙하 리듬을 달리해 읽을거리를 늘렸습니다.
- 한 판 보상은 월급코인으로 저장하고 영구 강화와 스킨 순환에 연결했습니다. “한 판 더”의 이유를 최고점뿐 아니라 누적 성장으로 분산했습니다.
- 결과 화면은 점수만 보여주지 않고 백분위, 다음 목표, 보상, 리더보드 CTA를 함께 배치했습니다. 종료 직후 재시작 판단 시간을 짧게 만드는 것이 목적입니다.
- 앱인토스 식별은 게임센터용 `getUserKeyForGame()`을 우선 호출하고, 미지원 환경에서는 `getAnonymousKey()`와 로컬 ID로 내려갑니다.

## 공식 참고

- 앱인토스 문서: https://developers-apps-in-toss.toss.im/
- WebView 튜토리얼: https://developers-apps-in-toss.toss.im/tutorials/webview.html
- 게임센터 개발: https://developers-apps-in-toss.toss.im/game-center/develop.html
- Phaser 4 renderer: https://phaser.io/news/2026/04/phaser-4-renderer-faster-cleaner-and-built-for-modern-games
- Phaser FX: https://docs.phaser.io/phaser/concepts/fx
- Phaser Particles: https://docs.phaser.io/phaser/concepts/gameobjects/particles
- Apple HIG haptics: https://developer.apple.com/design/human-interface-guidelines/playing-haptics
