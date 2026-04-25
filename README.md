# Toss Comet Rush

토스 WebView 안에서 바로 플레이되는 60초 세로형 아케이드 게임입니다. 플레이어는 월급 금고를 드래그해 보너스, 코인, 시간 쿠폰, 별 조각을 모으고 카드값, 월세, 현금 고갈, 구독료, 블랙홀을 피합니다.

현재 빌드는 v10 기준입니다. v10의 핵심 목표는 작은 화면 안정성, 5만원 단위 난이도 상승, 스테이지 체인, 런 중 조합 진화에 더해 첫 플레이어가 직접 눌러보며 배우는 인터랙티브 온보딩을 제공하는 것입니다.

## 핵심 개선

- 메인 메뉴를 시작, 성장 관리, 리더보드 중심으로 재배치했습니다.
- 50,000점마다 `월급 경보 단계`가 올라가며 속도, 스폰 간격, 위험 비율, 보상 배율이 함께 상승합니다.
- Stage 1~5 진행 구조와 스테이지별 목표 점수/위험 가중치/보상 가중치를 추가했습니다.
- 업그레이드 조합으로 `자동환급장`, `채무동결`, `13월의 월급` 진화가 발생합니다.
- 첫 플레이에서는 드래그, 수집, 회피, 아슬회피, 업그레이드를 직접 눌러보는 인터랙티브 온보딩이 실행됩니다.
- 성장 관리 화면에서 보유 코인, 영구 강화, 스킨 진행도를 한곳에서 확인하고 조작할 수 있습니다.
- 320px급 모바일, 일반 모바일, 데스크톱 중앙 캔버스까지 대응하는 반응형 캔버스 비율을 적용했습니다.
- HUD, 결과 화면, 업그레이드 카드, 버튼 문구에 텍스트 피팅을 적용했습니다.
- Phaser 실행 실패 시 fallback 캔버스도 같은 저장 키를 사용하도록 맞췄습니다.
- Windows native 빌드가 실패할 때 WSL 빌드로 자동 우회하는 빌드 스크립트를 추가했습니다.
- 실제 브라우저 스크린샷 기반 렌더 검증 스크립트를 추가했습니다.

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

이번 v10 정리 후 아래 명령을 통과했습니다.

```bash
npm run typecheck
npm run build
npm run export:direct
npm run verify:layout
npm run verify:render
```

렌더 검증은 Chrome/Edge CDP로 `menu`, `growth`, `tutorial`, `playing`, `pause`, `upgrade`, `gameover`, `gameover stress` 화면을 캡처합니다. 결과 이미지는 아래 경로에 생성됩니다.

```text
C:\Users\yspow\toss-comet-rush\artifacts\render-audit
```

## 같은 WiFi 폰 테스트

PC와 폰이 같은 공유기에 연결되어 있으면 아래처럼 프로젝트 루트를 서버로 열고 폰 브라우저에서 접속할 수 있습니다.

```bash
python -m http.server 4173 --bind 0.0.0.0 --directory C:\Users\yspow\toss-comet-rush
```

현재 PC의 공유기 대역 주소 예시는 아래입니다.

```text
http://192.168.0.14:4173/play-direct.html
```

## 주요 스크립트

- `npm run typecheck`: TypeScript 프로젝트 검사
- `npm run build`: TypeScript 검사 후 esbuild 번들 생성
- `npm run build:vite`: Vite 빌드 경로 확인
- `npm run export:direct`: 서버 없이 실행 가능한 단일 HTML 생성
- `npm run verify:layout`: 정적 레이아웃/번들 검증
- `npm run verify:render`: 실제 브라우저 스크린샷 렌더 검증
- `npm run ait:build`: Apps in Toss 제출 빌드

## Toss 연동

`src/lib/tossBridge.ts`는 Toss WebView 환경을 감지해 아래 기능을 사용합니다.

- `generateHapticFeedback`: 수집, 충돌, 월급각성 등 햅틱
- `eventLog`: 라운드 시작/종료, 성장 화면, 리더보드, 주요 결과 로깅
- `getUserKeyForGame`: Game Center용 사용자 식별
- `getAnonymousKey`: 브라우저 단독 실행 시 로컬 익명 키 fallback
- `submitGameCenterLeaderBoardScore`: 라운드 종료 점수 제출
- `openGameCenterLeaderboard`: 리더보드 열기
- `requestReview`: 기록 갱신 이후 리뷰 요청

브라우저 단독 실행에서는 Toss 기능이 안전하게 no-op 또는 local fallback으로 동작합니다.

## 제출 전 확인

- Toss CLI와 AIT 빌드는 Node 24 이상 환경에서 다시 확인하는 것이 안전합니다.
- Toss 콘솔의 Game Center 리더보드가 생성되어 있고 점수 타입이 숫자로 맞는지 확인해야 합니다.
- 실제 Toss WebView에서 햅틱, 이벤트 로그, 리더보드 열기, 점수 제출이 조용히 실패하지 않는지 최종 QA가 필요합니다.
- Windows 환경의 기존 native dependency 이슈는 빌드 스크립트의 WSL fallback으로 우회했지만, 제출 전 깨끗한 Node 24 환경에서 `npm install`을 다시 실행하는 것을 권장합니다.
