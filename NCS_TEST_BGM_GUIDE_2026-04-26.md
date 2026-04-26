# NCS 테스트 BGM 적용 가이드

작성일: 2026-04-26

## 원칙

NCS 곡은 영상/스트리밍 사용과 게임 삽입 사용의 조건이 다르다. NCS 공식 정책상 게임에 BGM 파일로 포함해 배포하려면 commercial licensing 문의가 필요하다. 따라서 NCS 음원을 GitHub Pages 공개 빌드에 포함하지 않는다.

## 테스트 방식

로컬 테스트용으로만 `public/ncs-test.mp3` 파일을 사용할 수 있게 했다.

1. NCS 공식 사이트에서 테스트하고 싶은 곡을 직접 다운로드한다.
2. 파일명을 `ncs-test.mp3`로 바꾼다.
3. 프로젝트의 `public/ncs-test.mp3`에 둔다.
4. `npm run build`
5. `npm run export:direct`
6. `play-direct.html?ncs=1` 또는 로컬 서버 주소 뒤에 `?ncs=1`을 붙여 실행한다.

예:

```text
http://192.168.0.14:4173/play-direct.html?ncs=1
```

## 안전장치

- `public/ncs-test.mp3`는 `.gitignore`에 추가했다.
- 따라서 실수로 GitHub에 커밋되지 않는다.
- `?ncs=1`이 없으면 기존 오리지널 procedural BGM이 재생된다.
- `?ncs=1`이 있고 `ncs-test.mp3` 파일이 있을 때만 로컬 테스트 BGM을 시도한다.

## 추천 테스트 후보

- Elektronomia - Sky High
- Spektrem - Shine
- JJD - Adventure
- Tobu - Hope

이 곡들은 NCS 스타일 레퍼런스로는 좋지만, 게임 정식 배포용으로 쓰려면 별도 라이선스 확인이 필요하다.
