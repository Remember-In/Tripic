# @tripic/api 개발 원칙

이 규칙은 **apps/api에만** 적용된다 (mobile/shared는 별도).

## TDD

- 새 기능·버그픽스는 **실패하는 테스트를 먼저** 작성한다 (red → green → refactor).
- 단위 테스트: 애플리케이션 서비스는 **port의 in-memory fake**로 테스트한다 (mock 라이브러리 최소화).
- e2e 테스트: Testcontainers Postgres + PactumJS. 외부 API(카카오)는 port 교체로 stub.
- 테스트 없는 프로덕션 코드 변경을 만들지 않는다.

## 아키텍처: 경량 헥사고날 (Ports & Adapters)

NestJS 모듈 = bounded context. 모듈 내부 구조:

```txt
<module>/
  <module>.controller.ts     # inbound adapter — 검증(zod pipe)과 위임만, 로직 금지
  <module>.service.ts        # application core — 유스케이스/도메인 정책 (I/O 세부사항 금지)
  ports/*.port.ts            # interface + DI 토큰(Symbol). 사용처 기준 최소 계약(ISP)
  adapters/*.adapter.ts      # outbound adapter — Prisma/fetch 등 실제 I/O는 여기에만
```

- **외부 I/O(DB, 외부 HTTP)는 반드시 port 뒤로** 감춘다. 서비스가 Prisma/fetch를 직접 만지지 않는다.
- 트랜잭션·unique 경합 등 **영속성 세부사항은 adapter가 흡수**하고, port는 도메인 언어로 계약을 표현한다.
- 프레임워크 유틸(JwtService, ConfigService 등 이미 DI 가능한 것)은 실용적으로 직접 주입해도 된다.
- port 주입: `@Inject(PORT_TOKEN)` + `{ provide: PORT_TOKEN, useClass: Adapter }`.

## SOLID 체크리스트

- **S**: 서비스 하나 = 유스케이스 묶음 하나. 컨트롤러에 로직이 생기면 분리 신호.
- **O**: 동작 확장은 adapter 교체/추가로. 서비스 수정 없이 provider 배선만 바꿔 확장 가능해야 한다.
- **L**: adapter는 port 계약(에러 의미 포함)을 지킨다. 계약은 테스트로 고정한다.
- **I**: port는 사용하는 쪽이 필요한 메서드만. 범용 repository 인터페이스 금지.
- **D**: 서비스는 구체 클래스가 아닌 port(interface)에 의존한다.

## 계약/검증

- 요청/응답 계약과 zod 스키마는 `@tripic/shared`에 두고 앱과 공유한다.
- 검증은 라우트에서 `ZodValidationPipe`로, 도메인 규칙은 서비스에서.

## 금지 사항 (PRD 제약)

- GPS 좌표·EXIF 원본·KTO 원천 데이터를 수신/저장하는 코드를 만들지 않는다.
- 방문 관광지(record_places) API는 위치정보지원센터 사전 검토 전까지 노출하지 않는다.
  기록 콘텐츠(제목·일기·해시태그)와 EXIF 제거 사진 API는 검토 대상이 아니며 이미 구현돼 있다 —
  docs/11-records-api-design.md 참고.
- AI 일기 생성은 구현하지 않기로 결정했다 (docs/11 §3.2). `features.aiDiary` 는 상시 `false` 이고,
  서버가 LLM 을 호출하거나 관광지명·메모를 수신하는 코드를 만들지 않는다.
