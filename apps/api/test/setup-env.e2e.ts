import { inject } from "vitest";

// 테스트 파일(및 AppModule) 이 import 되기 전에 실행된다.
// globalSetup 이 provide 한 컨테이너 URL 을 주입해 로컬 .env 의 dev DB 를 가리지 않도록 한다.
process.env.DATABASE_URL = inject("DATABASE_URL");
