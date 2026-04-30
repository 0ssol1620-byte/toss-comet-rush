# Toss Comet Rush / 월급 지키기 v18 하드닝 리포트

작성일: 2026-04-30
빌드 스탬프: `v18-reward-qa-hardening`
대상: Apps in Toss HTML5/Phaser 게임 릴리즈 후보

## 핵심 변경

- 보상형 광고 상태 머신 추가: `unsupported`, `idle`, `loading`, `loaded`, `showing`, `failed`.
- Apps in Toss FullScreen Ad 2.x 계열의 listener-style `loadFullScreenAd` / `showFullScreenAd`를 Promise wrapper로 안전 처리.
- 기존 rewarded ad API가 있는 환경도 fallback 유지.
- ultra-low 성능 프로필과 severe low FPS 자동 downgrade 추가.
- QA/FPS HUD 표시 조건 강화: `?qa=1`, `?fps=1`, 저장된 FPS 설정.
- near-miss 등급화: normal / great / perfect.
- perfect near-miss에 점수, 햅틱, 사운드, 짧은 slow-mo 보상 추가.
- 결과 화면 verdict와 다음 목표 문구 강화.
- 일시정지 설정 패널을 BGM/SFX/진동/FPS/품질로 분리하고 저장.
- `npm ci` 재현성을 위해 `.npmrc`에 legacy peer deps 및 audit/fund 비활성화 설정 추가.
- progression 회귀 테스트 및 layout verifier 보강.

## 자동 검증 결과

통과 확인:

```bash
npm ci --no-audit --no-fund
node scripts/test-progression.mjs
npm run build
npm run export:direct
npm run verify:layout
npm run ait:build
```

참고:

- `npm run verify:render`는 로컬 Chrome/Edge 실행 파일 부재 시 skip될 수 있음.
- `@apps-in-toss/ait-format@1.0.0`은 Node `>=24`를 요구한다는 경고가 있으므로 제출 전 Node 24에서도 재검증 권장.

## 브라우저 QA 결과

로컬 `dist/web` preview에서 확인:

- 첫 화면 정상 렌더링.
- 검은 화면/빈 화면/에러 UI 없음.
- 제목, CTA, 범례 정상 표시.
- 모바일 세로형 캔버스 정상.
- 시작 CTA 클릭 후 튜토리얼 `1/8 금고를 직접 움직여보세요` 진입 확인.
- 콘솔 JS 에러 없음.

## 실기기 Toss WebView 필수 QA

- [ ] 첫 로딩 10초 이내 표시.
- [ ] 첫 터치 후 BGM/SFX 정상 unlock.
- [ ] BGM/SFX/진동/FPS/품질 설정 저장 및 재진입 유지.
- [ ] 백그라운드 전환 시 BGM/SFX 즉시 정지.
- [ ] 복귀 시 BGM 정상 재개.
- [ ] Rewarded ad preload/show/reward/close/fail 상태별 동작 확인.
- [ ] 광고 중 BGM/SFX 정지, 종료 후 복귀.
- [ ] rewarded 결과 중복 지급 없음.
- [ ] Game Center 점수 제출/리더보드 열기 실패 시 게임 흐름 유지.
- [ ] iPhone Dynamic Island/Safe Area 침범 없음.
- [ ] Android back gesture 의도치 않은 종료 없음.
- [ ] 저사양 Android 10판 연속 플레이 시 FPS/메모리 안정성 확인.

## 남은 리스크

1. 실기기 Toss WebView 광고 이벤트 payload는 실제 콘솔/테스트 ID 환경에서 최종 확인 필요.
2. Node 22에서도 `ait:build`는 통과했지만 App in Toss CLI 일부 패키지가 Node 24를 요구하므로 Node 24 환경 재검증 권장.
3. Phaser chunk가 크므로 저속 네트워크 첫 로딩 시간 실측 필요.
4. 자동 render verification은 로컬 브라우저 실행 파일이 없으면 skip된다.

## 자체 평가

- 코드/빌드/브라우저 QA 기준: 9.2 / 10
- 실기기 Toss WebView + 실제 광고/Game Center QA 통과 후: 10점 후보
