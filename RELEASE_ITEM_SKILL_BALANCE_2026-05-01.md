# v19 Item Skill Balance Hardening

빌드 스탬프: `v19-item-skill-balance`
작성일: 2026-05-01

## 목적

사용자 QA에서 확인된 “가만히 둬도 50만원 이상 / SSS 종료” 문제를 출시 전 차단하고, 월급 지키기를 단순 자동 수집형 러너가 아니라 아이템 타이밍과 직접 조작이 중요한 60초 생존 액션으로 강화했다.

## 적용 사항

- 보유형 파워 아이템을 최대 2개까지 저장하는 슬롯 A/B HUD 추가
- 파워 아이템은 즉시 발동이 아니라 슬롯 보관 후 사용 버튼으로 발동
- 슬롯이 가득 찬 경우 자동 교체하지 않고 `아이템 가득 참!` 피드백 표시
- AI 방어봇/오토파일럿 발동 중 충돌 무적 처리
- AI 방어봇 중 near-miss 점수 효율 50% 제한
- 직접 조작 입력이 거의 없는 라운드는 수집/near-miss 점수 배율을 낮춰 idle 고득점 방지
- SSS/SS/S 랭크는 단순 점수만으로 달성하지 못하고 near miss, 콤보, 수집량, 각성 횟수 등 실력 지표가 필요하도록 변경
- 회귀 테스트 추가: 아이템 슬롯, 오토 무적 정책, idle SSS 방지, 직접 조작 점수 배율

## 검증 명령

```bash
npm run typecheck
node scripts/test-progression.mjs
npm run build
npm run export:direct
npm run verify:layout
npm run ait:build
```

## 남은 실기기 QA

- Toss WebView에서 슬롯 A/B 터치 영역과 드래그 조작 충돌 없음 확인
- AI 방어봇 사용 중 장애물 충돌 무시 확인
- idle 60초 방치 시 SSS/50만원급 결과가 나오지 않는지 실제 플레이 확인
- 광고/백그라운드 전환 중 오디오 pause/resume 재확인
