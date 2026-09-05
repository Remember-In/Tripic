# Tripic Mobile Agent Rules

이 파일의 규칙은 `apps/mobile/` 아래에서 작업하는 모든 에이전트에게 적용된다.
구현 전 [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)를 읽고 아래 규칙을 지킨다.

## Architecture

- 모바일 앱 아키텍처는 Feature-Sliced Design(FSD)을 사용한다.
- Expo Router가 요구하는 `app/`에는 route, layout, 전역 Provider 연결만 둔다.
- 실제 화면 구현은 `src/pages/`에 둔다. route 파일은 page를 연결하는 얇은 진입점으로 유지한다.
- FSD 계층은 `pages → widgets → features → entities → shared` 순서로 의존한다.
- 하위 계층에서 상위 계층을 import하지 않는다.
- 사용자 행동은 `features`, 비즈니스 개념은 `entities`, 큰 화면 블록은 `widgets`, 범용 코드는 `shared`에 둔다.
- 다른 slice를 사용할 때는 해당 slice의 `index.ts`에 공개된 API를 우선 사용한다. 다른 slice의 내부 파일을 직접 import하지 않는다.
- 모든 FSD 폴더를 미리 만들지 않는다. 기능 구현에 필요한 계층과 segment만 만든다.
- 기존 구조를 한 번에 대규모로 이동하지 않는다. 관련 코드를 수정할 때 FSD 구조로 점진적으로 옮긴다.

## Import paths

- `src/` 내부의 다른 계층이나 slice를 참조할 때 `@/` 경로 별칭을 사용한다.
- `../../`처럼 상위 폴더를 탐색하는 상대경로는 사용하지 않는다.
- 같은 폴더 또는 같은 slice 내부의 가까운 파일은 `./` 상대경로를 사용할 수 있다.
- 모노레포 공통 패키지는 `@tripic/shared`처럼 워크스페이스 패키지 이름으로 import한다.
- `/Users/...` 같은 개발자 컴퓨터의 실제 절대경로를 코드에 작성하지 않는다.
- `@/*` 별칭은 `apps/mobile/src/*`를 의미한다. 별칭 범위 밖의 자산이 필요하면 무리하게 `../`로 참조하지 말고 FSD에 맞는 `src/shared/assets` 배치를 우선 검토한다.

```tsx
// Good: 다른 계층 또는 slice
import { PhotoRecordButton } from "@/features/photo-record";
import { Button } from "@/shared/ui";

// Good: 같은 폴더 내부
import { PhotoPreview } from "./PhotoPreview";

// Bad: 상위 폴더 탐색
import { Button } from "../../../shared/ui/Button";
```

## Verification

- 변경 후 최소한 `pnpm --filter @tripic/mobile typecheck`와 `pnpm --filter @tripic/mobile lint`를 실행한다.
- FSD 의존 방향 또는 import 경로 규칙을 예외 처리해야 한다면 임의로 진행하지 말고 이유를 사용자에게 알린다.
