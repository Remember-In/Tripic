# @tripic/mobile

Expo Router 기반 Tripic 모바일 앱입니다.

## 실행

```bash
pnpm install
pnpm --filter @tripic/mobile start
pnpm --filter @tripic/mobile ios
pnpm --filter @tripic/mobile android
```

## 구성

- `app/` — Expo Router 화면과 전역 Query Provider
- `src/lib/kto/` — 한국관광공사 OpenAPI 직접 호출 경계
- `src/lib/storage/` — Expo SQLite 로컬 방문 기록 저장소

사진 EXIF GPS와 원본 사진은 서버 또는 SQLite에 저장하지 않습니다. 관광공사 OpenAPI 응답도 영구 저장하지 않고 화면 표시에만 사용합니다.
