# Toss Comet Rush BGM 후보 리서치 및 적용 결정

작성일: 2026-04-26

## 결론

NCS 곡은 레퍼런스로는 좋지만, 게임 안에 음원 파일로 넣어 배포하려면 공식적으로 commercial licensing form 문의가 필요하다. 따라서 현재 배포 빌드에는 NCS 곡을 직접 삽입하지 않는다.

대신 이번 빌드에는 NCS 스타일의 밝은 EDM 에너지를 참고한 오리지널 procedural loop를 넣었다. 킥, 스네어, 하이햇, 베이스, 리드 아르페지오가 첫 터치 후 Web Audio로 생성된다. 외부 음원 파일을 포함하지 않으므로 저작권 리스크가 없다.

## NCS 판단

공식 Usage Policy:
- YouTube/Twitch 영상과 스트리밍은 크레딧 조건으로 무료 사용 가능.
- 게임 사용은 NCS가 commercial licensing form으로 문의하라고 안내한다.

출처:
- https://ncs.io/usage-policy/1/faqs-us...
- https://ncs.io/usage-policy/terms
- https://ncs.io/contact

판단:
- GitHub Pages 웹게임에 mp3/ogg 파일로 포함하는 것은 영상 UGC 사용과 다르다.
- 명시 라이선스 없이 바로 삽입하지 않는다.

## 안전 후보

### 1. TehEmlo - FREE Game music

URL: https://tehemlo.itch.io/music-asset

장점:
- Loopable Game Music Pack.
- 개인/상업 프로젝트 사용 가능.
- 수정 가능.
- 크레딧 필수 아님.
- `Speed King Disco`, `Retro Hopper`가 이 게임 템포에 맞는다.

주의:
- itch.io 다운로드는 외부 파일 포함과 크레딧 관리가 필요하다.
- 실제 적용 전 파일을 내려받아 루프 품질과 파일 크기를 확인해야 한다.

### 2. tubelesshalo - FREE Music Loop Pack for Game Jam and Prototype

URL: https://tubelesshalo.itch.io/free-music-loop-pack

장점:
- EDM 포함.
- 개인/상업 프로젝트 사용 가능.
- 한국 작곡가라 크레딧/문의 대응이 비교적 수월할 수 있다.
- `DogFight`, `FutureChips`, `RetroRide`, `Runway`, `RetryPunk`가 후보.

주의:
- 크레딧 요청이 있다.
- 수정 후 상업 프로젝트 재사용 관련 문구가 애매하므로 원본 사용 중심이 안전하다.

### 3. PixelLoops Studio - FREE Game Audio Starter Pack

URL: https://pixelloops.itch.io/free-game-audio-starter-pack-music-sfx-for-games

장점:
- Royalty Free, Commercial Use 명시.
- WAV/MP3/OGG 포함.
- 게임용 SFX까지 포함.

주의:
- zip이 68MB라 현재 단일 HTML 웹게임에는 무겁다.
- AI Assisted 표기가 있어 브랜드 방향에 따라 호불호가 있을 수 있다.

### 4. Pixabay - Video Game Trance (EDM)

URL: https://pixabay.com/music/techno-trance-video-game-trance-edm-3592/

장점:
- Happy, Trance, Electronic, Energetic, Catchy 태그.
- Pixabay Content License.

주의:
- Pixabay 음원은 향후 Content ID나 권리 증명 이슈가 생길 수 있으므로, 게임 BGM으로는 itch.io 게임 전용 라이선스보다 보수적으로 보는 것이 좋다.
- 4분 4초로 웹게임 루프치고 길고 무겁다.

## 이번 적용 내용

- 외부 음원 파일 없음.
- 오리지널 Web Audio 루프 강화.
- 170ms 스텝 기반 리듬.
- 킥: 4스텝마다 저역 펀치.
- 스네어: 8스텝 중간에 노이즈 스냅.
- 하이햇: 홀수 스텝에 짧은 high-pass 노이즈.
- 베이스: 16스텝 패턴.
- 리드: 밝은 EDM식 아르페지오.
- 월급각성 중 리드가 한 옥타브 반 위로 올라가고 파형이 더 강해진다.

## 다음 추천

현재 배포는 오리지널 procedural BGM으로 유지한다. 이후 더 높은 품질이 필요하면 TehEmlo `Speed King Disco` 또는 `Retro Hopper`를 우선 구매/다운로드 후보로 보고, 크레딧 파일과 설정 화면에 출처를 추가한 뒤 mp3/ogg 로더를 붙인다.
