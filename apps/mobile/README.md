# @tripic/mobile

Expo Router 기반 Tripic 모바일 앱입니다.

아키텍처와 import 기준은 [모바일 개발 규칙](./DEVELOPMENT_RULES.md)을 따릅니다.

## 실행

```bash
pnpm install
pnpm --filter @tripic/mobile start
pnpm --filter @tripic/mobile ios
pnpm --filter @tripic/mobile android
```

## 서버·TourAPI·카카오 로그인 환경 설정

`.env.example`을 참고해 로컬 전용 `.env.local`을 만든다.

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

- `EXPO_PUBLIC_API_BASE_URL`: Tripic API 주소. 실기기에서는 `localhost`가 기기 자신을
  가리키므로 HTTPS 운영 주소 또는 같은 네트워크에서 접근 가능한 Mac 주소를 사용한다.
- `EXPO_PUBLIC_KTO_SERVICE_KEY`: 공공데이터포털에서 발급한 한국관광공사 TourAPI 일반
  인증키. 디코딩 값을 권장하며, 앱 번들에 포함되는 공개 설정이므로 서버 비밀키를 넣지 않는다.
- `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`: Kakao Developers의 네이티브 앱 키. 공개 식별자이며
  REST API 키, Admin 키, 서버 secret을 넣지 않는다.

Kakao Developers의 같은 애플리케이션에 iOS 번들 ID `com.tripic.app`과 Android 패키지
`com.tripic.app`을 등록한다. Android 실기기는 EAS 서명 인증서의 키 해시도 등록해야 한다.
서버의 `KAKAO_APP_ID`는 이 네이티브 앱 키가 속한 Kakao 애플리케이션의 숫자 앱 ID와
일치해야 한다. 네이티브 설정 절차는
[React Native Kakao Expo 설정 문서](https://rnkakao.mjstudio.net/docs/install-expo)를 따른다.

카카오 로그인은 네이티브 SDK를 사용하므로 Expo Go에서는 실행되지 않는다. 환경 변수를
설정한 뒤 Development Build 또는 TestFlight 바이너리를 새로 빌드해야 config plugin이
적용된다. API base URL은 Expo public 환경 변수이므로 앱 바이너리에 포함된다는 점도
전제로 한다.

원격 EAS Build는 gitignore 된 `.env.local`을 받지 못하므로 EAS 프로젝트의
`development`·`preview`·`production` 환경에도 세 값을 등록한다. `eas.json`의 각 빌드
프로필은 같은 이름의 EAS 환경을 명시적으로 사용한다. 세 값 모두 앱 번들에 포함되는 공개
설정이며 서버 secret을 넣으면 안 된다.

```bash
cd apps/mobile
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_BASE_URL --value https://api.example.com --environment preview --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_KTO_SERVICE_KEY --value replace-with-data-go-kr-service-key --environment preview --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY --value replace-with-kakao-native-app-key --environment preview --visibility plaintext
npx eas-cli@latest env:list --environment preview
```

TestFlight용 `production` 빌드에는 위 명령의 환경만 `production`으로 바꿔 동일하게 등록한다.
대시보드에서는 Project settings → Environment variables에서도 관리할 수 있다. 자세한 기준은
[Expo EAS 환경 변수 문서](https://docs.expo.dev/eas/environment-variables/manage/)를 따른다.

현재 서버에서 실제 제공되는 범위는 카카오 토큰 교환, 세션 갱신·로그아웃, 내 프로필
조회·닉네임 변경이다. 기록·사진·AI·회원 탈퇴 API는 서버 구현 전까지 호출하지 않고 기존
로컬 기록 흐름을 유지한다.

## 구성

- `app/` — Expo Router route·layout·Provider 연결
- `src/pages/` — 화면 조합
- `src/widgets/` — 지도·일정·기록 편집기 등 큰 UI 블록
- `src/features/` — 인증 세션·카카오 로그인·기록 생성 세션 등 사용자 행동
- `src/entities/` — 사용자·운영 설정·여행 기록 계약과 표시 데이터
- `src/shared/` — 디자인 토큰·공용 UI·로컬 자산
- `src/shared/api/kto/` — 한국관광공사 OpenAPI 직접 호출 경계
- `src/shared/lib/storage/` — Expo SQLite 로컬 방문 기록 저장소

색상·타이포·간격·공용 컴포넌트 기준은 [디자인 시스템](./DESIGN_SYSTEM.md)에 정리했습니다.

사진 EXIF GPS와 원본 사진은 Tripic 서버 또는 SQLite에 저장하지 않습니다. 위치 기반 후보 조회를 실행하면 GPS 좌표만 한국관광공사 OpenAPI로 직접 전송하며, OpenAPI 응답은 영구 저장하지 않고 화면 표시에만 사용합니다.

Expo Go에서도 사진 선택, TourAPI 장소 검색, 로컬 기록 생성·수정·삭제와 지도 진행도를 확인할
수 있습니다. 카카오 로그인만 네이티브 모듈이 포함된 Development Build 또는 TestFlight가
필요합니다.
