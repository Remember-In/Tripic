# @tripic/api Codex 작업 지침

이 지침은 `apps/api` 아래에서 작업하는 Codex에만 적용된다. `apps/mobile`과 `packages/shared`에는 별도 지침이 없는 한 적용하지 않는다.

## TDD

- 새 기능과 버그 수정은 실패하는 테스트를 먼저 작성한다(red → green → refactor).
- 애플리케이션 서비스 단위 테스트는 port의 in-memory fake를 사용하고, mock 라이브러리 사용은 최소화한다.
- e2e 테스트는 Testcontainers Postgres와 PactumJS를 사용한다. 카카오 같은 외부 API는 port를 교체해 stub으로 테스트한다.
- 테스트 없는 프로덕션 코드 변경을 만들지 않는다.

## 아키텍처: 경량 헥사고날(Ports & Adapters)

NestJS 모듈을 bounded context로 취급한다. 모듈 내부 구조는 다음을 따른다.

```txt
<module>/
  <module>.controller.ts     # inbound adapter — 검증(zod pipe)과 위임만, 로직 금지
  <module>.service.ts        # application core — 유스케이스/도메인 정책, I/O 세부사항 금지
  ports/*.port.ts            # interface + DI 토큰(Symbol), 사용처 기준 최소 계약(ISP)
  adapters/*.adapter.ts      # outbound adapter — Prisma/fetch 등 실제 I/O는 여기에만
```

- 외부 I/O(DB, 외부 HTTP)는 반드시 port 뒤로 감춘다. 서비스가 Prisma나 `fetch`를 직접 사용하지 않게 한다.
- 트랜잭션과 unique 경합 같은 영속성 세부사항은 adapter가 흡수하고, port는 도메인 언어로 계약을 표현한다.
- `JwtService`, `ConfigService`처럼 이미 DI 가능한 프레임워크 유틸은 실용적으로 직접 주입해도 된다.
- port는 `@Inject(PORT_TOKEN)`으로 주입하고 `{ provide: PORT_TOKEN, useClass: Adapter }`로 연결한다.

## SOLID 체크리스트

- **S**: 서비스 하나는 유스케이스 묶음 하나를 담당한다. 컨트롤러에 로직이 생기면 분리를 검토한다.
- **O**: 동작은 adapter 교체나 추가로 확장한다. 가능하면 서비스 수정 없이 provider 배선으로 확장한다.
- **L**: adapter는 에러 의미를 포함한 port 계약을 지키고, 계약을 테스트로 고정한다.
- **I**: port에는 사용하는 쪽이 필요한 메서드만 둔다. 범용 repository 인터페이스를 만들지 않는다.
- **D**: 서비스는 구체 클래스 대신 port(interface)에 의존한다.

## 계약과 검증

- 요청·응답 계약과 Zod 스키마는 `@tripic/shared`에 두고 앱과 공유한다.
- 입력 검증은 라우트의 `ZodValidationPipe`에서, 도메인 규칙은 서비스에서 처리한다.

## 금지 사항(PRD 제약)

- GPS 좌표, EXIF 원본, KTO 원천 데이터를 수신하거나 저장하는 코드를 만들지 않는다.
- 방문 관광지(record_places) API는 위치정보지원센터 사전 검토 전까지 노출하지 않는다.
  기록 콘텐츠(제목·일기·해시태그)와 EXIF 제거 사진 API는 검토 대상이 아니며 이미 구현돼 있다 —
  docs/11-records-api-design.md 참고.
