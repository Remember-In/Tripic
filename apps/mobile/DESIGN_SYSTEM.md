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

- 홈 지도 상태, 사진 선택과 방문 정보, 기록 작성, 기록 목록·상세·편집, 설정 화면에 본 토큰을 적용한다.
- 사진은 로컬 드래프트 상태에서만 다루고 route parameter에 EXIF/GPS 값을 넘기지 않는다.
- Figma의 사진 선택 sheet는 OS가 소유하는 영역으로 보고 `expo-image-picker`의 시스템 피커를 사용한다. 앱이 갤러리 전체 권한을 요청하는 커스텀 그리드로 복제하지 않는다.
- AI 일기 생성과 문체·여행 테마 설정은 제공하지 않는다. 사용자가 제목·날짜별 메모·해시태그를 직접 작성하며, 새 로컬 기록의 `style`과 `theme`은 `null`로 저장한다.
- 대한민국 지도는 Figma 배치를 재현한 17개 시·도 개략도를 표시·방문 색칠·터치 판정에 사용한다. 실제 지역 판정에는 도형을 사용하지 않고 기록에 저장된 TourAPI 지역 코드를 사용한다.
- 모든 시·도에서 해당 시군구 상세 지도로 진입하고, 지역을 누르면 그 경계를 중심으로 한 단계 확대한다. 매우 넓거나 도서가 분산된 지역도 확대 변화를 명확히 보여주기 위해 선택 경계의 일부가 화면 밖으로 잘릴 수 있다. 하단 지역명을 누르거나 화면 뒤로가기를 사용하면 `시군구 → 시·도 → 대한민국` 순으로 실제 진입 경로를 되돌아간다. 단층제인 세종특별자치시는 시·도 상세까지만 제공한다.
- 상세 지도는 SGIS 기반 `admdongkor` 2026-07-01 경계를 화면용 SVG path로 생성해 앱에 내장한다. 256개 행정 시군구를 229개 선택 가능 지역과 세종 1개 단층제 영역으로 연결하며, 최신 인천 11개 구·군과 일반구를 가진 도시의 결합 경계를 포함한다. 상위 화면은 디자인의 17개 시·도를 유지하고, 법정동 시·도 코드가 합쳐진 광주와 전남은 5자리 시군구 코드로 각각 분리한다.
- 인천 옹진군, 경북 울릉군, 전남 신안군처럼 원격 도서 때문에 본토가 지나치게 작아지는 지역은 동일 카드에서 선택할 수 있도록 인셋으로 재배치한다. 지도는 실제 거리·위치 판정 용도가 아니라 방문 현황 표시와 단계 탐색 용도다.
- TourAPI가 구형 `areaCode/sigunguCode` 또는 신형 `lDongRegnCd/lDongSignguCd` 중 어느 체계로 응답해도 동일한 방문 지도 키로 정규화한다. 지역 탐색 요청은 신형 법정동 코드를 우선 사용한다.
- 방문 시・군 진행률은 현재 행정구역의 75개 시와 82개 군만 집계한다. 자치구, 제주 행정시, TourAPI에 남아 있는 폐지 지역 코드는 제외한다.

## 접근성 확인 사항

- 설정과 선택 행은 최소 44pt 터치 영역을 확보하고, 내용이 길어지는 화면은 스크롤할 수 있게 한다.
- 390pt보다 좁은 기기에서는 사진 셀이 72pt 이하로 유연하게 줄어 카드 안에 유지된다.
- Figma의 Primary/500 (`#99CB47`) 위 흰색 CTA 텍스트는 명암비가 약 1.91:1로 WCAG AA를 충족하지 않는다. 현재는 디자인 원본 충실도를 위해 유지하며, 배포 전 배경색을 Primary/900 수준으로 낮추거나 전경색을 어둡게 바꾸는 결정을 디자인 원본과 함께 반영해야 한다.
