# tourism — TourAPI 서버 프록시

`apps/mobile/src/shared/api/kto/` 의 **서버 이식본**이다. 두 사본은 의도적으로 분기해 있다.

|                    | 모바일 사본                                 | 서버 사본 (여기)              |
| ------------------ | ------------------------------------------- | ----------------------------- |
| 좌표 기반 주변검색 | 있음 (`fetchNearbyKtoPlaces`)               | **없음** — 좌표를 받지 않는다 |
| 서비스키           | `EXPO_PUBLIC_KTO_SERVICE_KEY` (번들에 노출) | `KTO_SERVICE_KEY` (서버 전용) |
| 실패 표현          | 사용자 문구를 담은 `KtoApiError`            | Nest 예외 (502·503·504)       |
| 지역코드 데이터    | `regionCodeMap.generated.json`              | `region-code-map.data.ts`     |
| 타입 단언          | `as unknown as` 사용                        | 없음                          |

## 왜 공유하지 않는가

- `packages/shared` 는 **계약 패키지**다. HTTP 클라이언트 구현을 넣으면 패키지 헌장에 어긋나고,
  RN Metro 가 소스를 직접 번들하므로 지역코드 맵과 파싱 로직이 모바일 번들에 무조건 실린다.
- 위 표처럼 두 사본의 요구가 실제로 다르다. 공유 모듈로 만들면 두 변종을 모두 품어야 한다.
- 지금 공유 위치로 올리면 서버 사정으로 코드가 바뀔 때마다 **앱 릴리스가 필요**해진다.

**응답 계약(zod + 타입)만** `packages/shared/src/schemas/tourism.ts` 에 두어 서버와 웹이 공유한다.
타입 이름은 모바일 사본과 같게 맞춰, 나중에 통합할 때 rename 이 없게 했다.

## 지켜야 할 것

- **좌표를 받지 않는다.** 서버가 좌표를 수신하는 순간 위치정보법 신고 요부 판단이 달라진다
  (docs/12 §3-②-1, docs/15 §4.2). 주변검색 요구가 오면 코드보다 docs/12 재검토가 먼저다.
- **응답을 저장하지 않는다.** DB·캐시·로그 어디에도 남기지 않는 순수 pass-through 다.
- **서비스키를 에러로 흘리지 않는다.** 상류의 `resultMsg`·본문에는 요청 쿼리가 섞여 올 수 있어
  진단에는 짧은 코드만 쓴다 (`kto-api.adapter.spec.ts` 가 회귀를 고정한다).

## region-code-map.data.ts

`apps/mobile/.../regionCodeMap.generated.json` 에서 변환한 생성 파일이다. 직접 수정하지 않는다.

JSON 이 아니라 `.ts` 인 이유: `apps/api/nest-cli.json` 에 `assets` 설정이 없어 swc 빌더가 `.json` 을
`dist` 로 복사하지 않고, Dockerfile 런타임 스테이지는 `dist` 만 담는다. `.json` 으로 두면 로컬
vitest 는 통과하고 **컨테이너에서만** `MODULE_NOT_FOUND` 로 죽는다.

원본이 갱신되면 같은 변환을 다시 수행하고 `region-code-map.spec.ts` 로 매핑이 유지되는지 확인한다.

## 후속

웹에서 프록시가 검증되면 모바일도 `/tourism/*` 호출로 전환하고, 모바일 사본과
`EXPO_PUBLIC_KTO_SERVICE_KEY` 를 제거한다. 그때 비로소 "번들에서 키를 추출할 수 있다"는
모바일 README 의 알려진 위험이 해소된다.
