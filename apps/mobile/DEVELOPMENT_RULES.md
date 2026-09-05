# 모바일 개발 규칙

Tripic React Native 앱의 구조와 import 규칙을 정리한다.
새로 작성하거나 수정하는 코드는 이 문서를 기본 기준으로 삼는다.
에이전트가 반드시 따라야 하는 명령형 규칙은 [AGENTS.md](./AGENTS.md)에 정의한다.

## 1. 아키텍처: FSD (Feature-Sliced Design)

Tripic 모바일 앱은 **FSD를 Expo Router 환경에 맞게 적용**한다.

FSD는 코드를 기술 종류별로 한곳에 모으는 방식이 아니라, 제품에서 맡는 역할과 기능을 기준으로 나누는 구조다.
예를 들어 모든 컴포넌트를 `components/`에 모으지 않고, 사진 기록 기능은 `features/photo-record/`, 방문 정보는 `entities/visit/`처럼 배치한다.

### 기본 구조

```text
apps/mobile/
├── app/                         # Expo Router 진입점
│   ├── _layout.tsx              # 전역 Provider와 내비게이션 설정
│   └── index.tsx                # 실제 page를 연결하는 얇은 파일
└── src/
    ├── pages/                   # 하나의 완성된 화면
    │   └── home/
    ├── widgets/                 # 여러 feature/entity를 조합한 큰 화면 블록
    │   └── travel-map/
    ├── features/                # 사용자가 수행하는 행동과 유스케이스
    │   └── photo-record/
    ├── entities/                # 핵심 비즈니스 개념
    │   ├── visit/
    │   └── tourist-place/
    └── shared/                  # 특정 도메인에 종속되지 않는 공통 코드
        ├── api/
        ├── assets/
        ├── config/
        ├── lib/
        ├── types/
        └── ui/
```

`app/`은 FSD의 화면 구현 폴더가 아니라 Expo Router가 요구하는 라우팅 진입점이다.
화면 구현은 `src/pages/`에 두고 `app/`에서는 연결만 한다.

```tsx
// app/index.tsx
export { HomePage as default } from "@/pages/home";
```

### 계층별 책임

| 계층       | 역할                                   | 예시                                     |
| ---------- | -------------------------------------- | ---------------------------------------- |
| `app/`     | 라우팅, 전역 Provider, 앱 초기화       | Expo Router, QueryClientProvider         |
| `pages`    | 한 화면을 완성하고 하위 계층을 조합    | 홈, 사진 선택 결과, 관광지 확인 화면     |
| `widgets`  | 화면에서 독립적인 큰 UI 블록           | 여행 지도, 방문 현황 패널                |
| `features` | 사용자의 구체적인 행동                 | 사진 선택, 관광지 확정, 방문 기록 삭제   |
| `entities` | 서비스의 핵심 데이터와 표현            | 방문, 관광지, 행정구역                   |
| `shared`   | 어느 도메인에서도 쓸 수 있는 공통 코드 | 버튼, 색상, SQLite 유틸, HTTP 클라이언트 |

### 의존성 방향

상위 계층은 하위 계층을 사용할 수 있지만, 하위 계층은 상위 계층을 알면 안 된다.

```text
app → pages → widgets → features → entities → shared
```

예시:

- `pages`에서 `features`와 `entities`를 import할 수 있다.
- `features`에서 `entities`와 `shared`를 import할 수 있다.
- `entities`에서 `features`, `widgets`, `pages`를 import하면 안 된다.
- `shared`에서 Tripic의 특정 feature나 entity를 import하면 안 된다.

계층을 건너뛰는 것은 가능하다. 예를 들어 `pages`가 `shared/ui`를 직접 사용하는 것은 정상이다.
중요한 것은 화살표의 방향을 거꾸로 만들지 않는 것이다.

### Slice와 Segment

각 계층 아래의 기능 단위를 **slice**라고 부른다.
slice 내부는 필요할 때 다음 segment로 나눈다.

```text
features/photo-record/
├── api/       # 이 기능에서 사용하는 API 요청
├── model/     # 상태, 타입, 비즈니스 로직
├── ui/        # 컴포넌트
├── lib/       # 기능 내부 보조 함수
└── index.ts   # 외부에 공개할 API
```

모든 폴더를 미리 만들지 않는다. 실제 코드가 생길 때 필요한 segment만 추가한다.

다른 slice에서는 내부 파일을 직접 참조하지 않고 `index.ts`에 공개된 항목만 사용한다.

```tsx
// 권장
import { PhotoRecordButton } from "@/features/photo-record";

// 지양: 다른 slice의 내부 구조에 의존
import { PhotoRecordButton } from "@/features/photo-record/ui/PhotoRecordButton";
```

## 2. Import 경로: 프로젝트 기준 경로를 우선한다

여기서 말하는 **절대경로**는 컴퓨터의 `/Users/...` 같은 실제 파일 경로가 아니다.
`src/`를 기준으로 하는 TypeScript 경로 별칭 `@/`를 뜻한다.

```tsx
// 권장: 파일 위치가 바뀌어도 의미를 알아보기 쉽다.
import { KoreaMap } from "@/widgets/travel-map";
import { selectPhoto } from "@/features/photo-record";

// 지양: 현재 파일 위치에 따라 ../ 개수가 계속 달라진다.
import { KoreaMap } from "../../../widgets/travel-map";
import { selectPhoto } from "../../../../features/photo-record";
```

이 프로젝트의 `@/*`는 `apps/mobile/src/*`를 가리킨다.

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 경로 선택 기준

1. 다른 slice나 다른 계층을 import할 때는 `@/`를 사용한다.
2. 같은 폴더 또는 같은 slice 내부의 가까운 파일은 `./` 상대경로를 사용해도 된다.
3. `../`가 필요한 import는 원칙적으로 `@/`로 바꾼다.
4. 워크스페이스 공통 패키지는 패키지 이름을 사용한다.
5. `/Users/...`처럼 특정 개발자 컴퓨터에서만 동작하는 경로는 절대 작성하지 않는다.

```tsx
// 같은 slice 내부: 허용
import { PhotoPreview } from "./PhotoPreview";

// 다른 계층: @/ 사용
import { Button } from "@/shared/ui";

// 모노레포 공통 패키지: 패키지 이름 사용
import type { Visit } from "@tripic/shared";
```

## 3. 적용 원칙

- 새 기능은 먼저 어느 FSD 계층과 slice에 속하는지 정한 뒤 파일을 만든다.
- `app/`의 route 파일과 `pages`는 가능한 한 조합 역할만 맡긴다.
- 재사용한다는 이유만으로 무조건 `shared`로 옮기지 않는다. 특정 도메인을 안다면 `features` 또는 `entities`에 둔다.
- 두 번 이상 사용된다는 사실보다 **비즈니스 의미와 책임**을 우선해 위치를 정한다.
- 기존 코드는 관련 기능을 수정할 때 점진적으로 이 구조로 이동한다. 구조 변경만을 위한 대규모 일괄 이동은 하지 않는다.

## 4. 빠른 판단 예시

| 코드                             | 위치                           |
| -------------------------------- | ------------------------------ |
| 공통 `Button`, `Card`            | `shared/ui`                    |
| 한국관광공사 HTTP 클라이언트     | `shared/api` 또는 `shared/lib` |
| 방문 데이터 타입과 방문 배지     | `entities/visit`               |
| 사진 선택 후 EXIF를 읽는 행동    | `features/photo-record`        |
| 방문 지역을 조합해 보여주는 지도 | `widgets/travel-map`           |
| 지도, 통계, CTA를 조합한 홈 화면 | `pages/home`                   |

위치가 애매하면 “이 코드는 특정 사용자 행동인가, 비즈니스 개념인가, 화면 조합인가, 완전히 공통인가?” 순서로 판단한다.
