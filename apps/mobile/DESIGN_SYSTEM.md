# Tripic 모바일 디자인 시스템

이 문서는 아래 Figma 스타일 가이드를 React Native 코드로 옮긴 기준을 기록한다.

- [컬러 스타일 가이드](https://www.figma.com/design/1EYPIVosaoi1OwvxWTAf3i/Design?node-id=3-1109&m=dev)
- [앱 타이포그래피 스타일 가이드](https://www.figma.com/design/1EYPIVosaoi1OwvxWTAf3i/Design?node-id=3-1319&m=dev)

## 코드 위치

```text
src/shared/
├── assets/fonts/       # Pretendard 400, 600, 700 및 OFL 라이선스
├── assets/icons/       # 화면 공통 SVG 아이콘
├── config/theme/       # 색상, 타이포, 간격, 라운드, 그림자 토큰
└── ui/                 # 텍스트, 헤더, CTA, 화면 컨테이너 등 공용 UI
```

다른 FSD 계층에서는 공개 경로만 사용한다.

```tsx
import { semanticColors } from "@/shared/config/theme";
import { AppText } from "@/shared/ui";

<AppText tone="secondary" variant="subtitle02">
  기록한 관광지
</AppText>;
```

## 색상

- `palette`: Figma의 Primary, Secondary, Gray, Feedback 원시값을 그대로 보존한다.
- `semanticColors`: 화면 코드가 색상 번호 대신 용도를 표현하도록 `brand`, `background`, `text`, `border`, `feedback`으로 연결한다.
- Figma의 `Deactivated`와 `Diactivated` 표기는 코드에서 의미가 분명한 `disabled`로 통일한다.
- Primary와 Secondary의 Main은 각각 `palette.primary[500]`, `palette.secondary[500]`이다.

## 타이포그래피

- 폰트: Pretendard v1.3.9
- 사용 굵기: Regular 400, SemiBold 600, Bold 700
- 자간: 전체 `0`
- 토큰 이름은 Figma 이름을 camelCase로 옮긴 `heading01`~`button06`을 사용한다.
- `lineHeight`는 Figma의 120%, 140%, 160%를 실제 픽셀 값으로 계산해 저장한다.

Figma의 Button 02 행은 보이는 명세가 `Bold / 18 / 140%`인 반면, 내부 텍스트 레이어에는 `SemiBold / 18 / 120%`가 적용돼 있다. 현재 코드는 스타일 가이드의 표기 명세를 기준으로 `Bold / 18 / 25.2`를 사용한다. 디자인 원본이 수정되면 이 토큰도 함께 맞춘다.

## 레이아웃과 공용 UI

`15:3` 화면 그룹에서 반복 검증된 값만 공용 토큰으로 추가했다.

- 앱 캔버스 배경은 `semanticColors.background.canvas` (`#F5F5F5`), 일반 페이지 배경은 기존 `page` (`#FAFAFA`)를 사용한다.
- 반복 간격은 `spacing`, 모서리는 `radii`, 부유 버튼과 시트는 `shadows`에서 가져온다.
- `Screen`은 safe area와 상태 표시줄, `PageHeader`는 뒤로가기/액션 헤더, `PrimaryButton`은 60pt 하단 CTA, `FloatingIconButton`은 44pt 원형 버튼을 담당한다.
- 화면 전용 크기·위치는 각 `pages`/`widgets`에 두고, 세 개 이상 화면에서 반복될 때만 `shared`로 올린다.

## 구현 범위

- 홈 지도 상태, 사진 선택과 방문 정보, 기록 스타일 설정, 기록 목록·상세·편집, 설정 화면에 본 토큰을 적용한다.
- 사진은 로컬 드래프트 상태에서만 다루고 route parameter에 EXIF/GPS 값을 넘기지 않는다.
- Figma의 사진 선택 sheet는 OS가 소유하는 영역으로 보고 `expo-image-picker`의 시스템 피커를 사용한다. 앱이 갤러리 전체 권한을 요청하는 커스텀 그리드로 복제하지 않는다.
- AI 일기 생성은 서버 미도입 결정에 따라 제공하지 않는다. 문체·여행 테마 선택은 사용자가 직접 작성하는 기록의 스타일 설정으로 유지한다.
- 지도 탭은 Figma의 대한민국 → 경상북도 → 대구광역시 → 수성구 상태를 확인하는 UI 프로토타입이다. 실제 좌표·polygon hit-test와 시군구 별 영역 판정은 지리 데이터를 연결하는 후속 범위다.

## 접근성 확인 사항

- 설정과 선택 행은 최소 44pt 터치 영역을 확보하고, 내용이 길어지는 화면은 스크롤할 수 있게 한다.
- 390pt보다 좁은 기기에서는 사진 셀이 72pt 이하로 유연하게 줄어 카드 안에 유지된다.
- Figma의 Primary/500 (`#99CB47`) 위 흰색 CTA 텍스트는 명암비가 약 1.91:1로 WCAG AA를 충족하지 않는다. 현재는 디자인 원본 충실도를 위해 유지하며, 배포 전 배경색을 Primary/900 수준으로 낮추거나 전경색을 어둡게 바꾸는 결정을 디자인 원본과 함께 반영해야 한다.
