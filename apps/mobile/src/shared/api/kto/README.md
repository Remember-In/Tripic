# TourAPI 클라이언트

이 디렉터리의 클라이언트는 앱에서 한국관광공사 OpenAPI를 직접 호출한다.

- 좌표는 후보 조회 요청을 위해서만 메모리에서 사용한다.
- OpenAPI 응답과 관광지 목록은 SQLite에 저장하지 않는다.
- `EXPO_PUBLIC_KTO_SERVICE_KEY`에는 공공데이터포털에서 발급한 일반 인증키를 넣는다.
- Expo public 환경 변수는 앱 번들에서 추출할 수 있으므로 비밀키로 취급할 수 없다.
- 키를 소스에 커밋하지 않고 사용량 한도와 키 교체 절차를 운영해야 한다.
- 사진, EXIF 원문, GPS 또는 TourAPI 원문 응답을 로그나 영구 저장소에 남기지 않는다.
- 확정 후에는 `contentId`와 행정구역 코드만 저장한다.

공식 API: `https://apis.data.go.kr/B551011/KorService2`
