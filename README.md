# 월급 지키기 (Toss Comet Rush)

토스 WebView 안에서 바로 플레이되는 60초 세로형 아케이드 게임입니다. 플레이어는 월급 금고를 드래그해 현금봉투, 코인, 시간 쿠폰, PAYDAY 오브를 모으고 카드값, 월세, 세금, 구독료를 피하면서 잔고를 지킵니다.

현재 빌드는 `v17-premium-salary-keeper` 기준입니다. 핵심 목표는 “월급 지키기”라는 직관적인 브랜딩, 프리미엄 금융 앱형 랜딩, 첫 10초 이해도, 스테이지 맵/성장/결과 보상 루프, 그리고 앱인토스 WebView 안정성입니다.

공개 테스트 URL:

```text
https://0ssol1620-byte.github.io/toss-comet-rush/
https://0ssol1620-byte.github.io/toss-comet-rush/play-v17-premium-salary-keeper.html
```

## 핵심 개선

- 메인 메뉴를 `월급 지키기` 프리미엄 다크 카드 랜딩으로 재구성했습니다.
- 첫 화면에 현금/피해/아슬 3개 범례와 “경보: 50,000원마다 속도 상승” 룰을 노출합니다.
- `스테이지` 버튼은 단순 순환이 아니라 실제 스테이지 맵 화면을 열어 해금/잠김/목표/기록을 확인하고 선택합니다.
- 50,000점마다 `월급 경보 단계`가 올라가며 속도, 스폰 간격, 위험 비율, 보상 배율이 함께 상승합니다.
- Stage 1~6 진행 구조와 스테이지별 목표 점수/위험 가중치/보상 가중치를 제공합니다.
- 업그레이드 조합으로 `자동환급장`, `채무동결`, `13월의 월급` 진화가 발생합니다.
- 결과 화면에서 다음 스테이지/스킨/미션/신기록 기반 “한 판 더” 문구를 보여줍니다.
- 광고 2배 보상은 per-result 중복 수령, in-flight 중복 클릭, 일일 cap, 미지원 환경을 안전하게 차단합니다.
- delayed callback은 현재 phase와 scene active 상태를 확인해 라운드 종료 후 늦게 스폰/상태 변경되는 문제를 막습니다.
- 채무동결은 actor별 `baseSpeed/frozenUntil`을 사용해 중복 감속이 누적되지 않도록 보정했습니다.
- visibility listener는 scene shutdown/destroy 시 제거되어 WebView 재진입/재생성 누수를 줄입니다.
- Phaser 실행 실패 시 fallback 캔버스도 같은 저장 키와 `월급 지키기` 브랜딩을 사용합니다.

## 실행

```bash
npm install
npm run build
npm run export:direct
```

`npm run export:direct` 실행 후 `play-direct.html`을 열면 서버 없이 바로 확인할 수 있습니다. 일반 로컬 서버 확인은 아래처럼 실행합니다.

```bash
python -m http.server 4173 --directory dist
```

브라우저에서 `http://localhost:4173`을 열면 됩니다.

## 검증

릴리즈 전 아래 명령을 통과해야 합니다.

```bash
node scripts/test-progression.mjs
npm run typecheck
npm run build
npm run export:direct
npm run verify:layout
npm run verify:render
npm run ait:build
```

`verify:render`는 Chrome/Edge CDP가 있는 환경에서 `menu`, `growth`, `tutorial`, `playing`, `pause`, `upgrade`, `gameover`, `gameover stress` 화면을 캡처합니다. Chrome/Edge 실행 파일이 없는 CI/WSL 환경에서는 skip될 수 있으므로 결과 로그를 확인하세요.

## 주요 스크립트

- `node scripts/test-progression.mjs`: progression/보상/광고/freeze 순수 로직 회귀 테스트
- `npm run typecheck`: TypeScript 프로젝트 검사
- `npm run build`: TypeScript 검사 후 esbuild 번들 생성
- `npm run build:vite`: Vite 빌드 경로 확인
- `npm run export:direct`: 서버 없이 실행 가능한 단일 HTML 생성
- `npm run verify:layout`: 정적 레이아웃/번들/P0 안정화 마커 검증
- `npm run verify:render`: 실제 브라우저 스크린샷 렌더 검증
- `npm run ait:build`: Apps in Toss 제출 빌드

## Toss 연동

`src/lib/tossBridge.ts`는 Toss WebView 환경을 감지해 아래 기능을 사용합니다.

- `generateHapticFeedback`: 수집, 충돌, 월급각성 등 햅틱
- `eventLog`: 라운드 시작/종료, 성장 화면, 스테이지 맵, 광고 보상, 리더보드 등 주요 결과 로깅
- `getUserKeyForGame`: Game Center용 사용자 식별
- `getAnonymousKey`: 브라우저 단독 실행 시 로컬 익명 키 fallback
- `submitGameCenterLeaderBoardScore`: 식별 완료 후 라운드 종료 점수 제출
- `openGameCenterLeaderboard`: 리더보드 열기
- `requestReview`: 기록 갱신 이후 리뷰 요청
- `preloadRewardAd`/`showRewardAd`: 보상형 광고 추상화 레이어

브라우저 단독 실행에서는 Toss 기능이 안전하게 no-op 또는 local fallback으로 동작합니다.

## 제출 전 확인

- `play-direct.html` 단일 파일 실행 확인
- GitHub Pages 배포본에서 canvas 생성 및 `data-comet-ready="ready"` 확인
- 320×568, 390×844, 430×932 화면에서 메뉴/스테이지 맵/성장/결과 UI 겹침 확인
- 실제 Toss WebView에서 Safe Area, Android Back, 오디오 background pause/resume, 리더보드, 광고 테스트 ID QA 수행
