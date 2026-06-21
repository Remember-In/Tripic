# @tripic/mobile (placeholder)

React Native 모바일 앱 자리입니다. **이번 백엔드 우선 세팅 단계에서는 스캐폴딩하지 않았습니다.**

## 예정 스택 (PRD 10.2)

- React Native + Expo + Expo Router
- TypeScript
- TanStack Query — 한국관광공사 OpenAPI 호출의 loading/error/retry 관리
- Expo SQLite — 방문 기록 로컬 저장
- Zustand (선택) — 선택 사진·임시 작성 상태

## 책임 범위 (PRD 6.2 / 16)

- 사진 EXIF의 GPS·촬영일시는 **앱 내부에서만** 처리한다.
- 관광지 후보/상세 조회는 앱이 **한국관광공사 OpenAPI를 직접 호출**한다.
- GPS 좌표·EXIF 원본 사진을 백엔드 서버로 전송하지 않는다.
- 관광공사 원천 데이터를 로컬 DB에 저장/캐싱 서빙하지 않는다.

## 스캐폴딩 시 (예정)

```bash
# 예시 — 추후 확정
pnpm create expo-app apps/mobile
```

상세 화면/플로우는 [docs/05-screens.md](../../docs/05-screens.md), [docs/03-requirements-p0.md](../../docs/03-requirements-p0.md) 참고.
