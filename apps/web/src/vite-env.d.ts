/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_REST_API_KEY?: string;
  readonly VITE_KAKAO_REDIRECT_URI?: string;
  readonly VITE_VISIT_REGION_API_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
