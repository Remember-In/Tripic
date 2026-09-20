/** pg 가 지금은 `verify-full` 로 취급하지만 다음 메이저에서 뜻이 바뀌는 값들 */
const AMBIGUOUS_SSL_MODES: readonly string[] = [
  "require",
  "prefer",
  "verify-ca",
];

/**
 * 연결 문자열의 모호한 `sslmode` 를 현재 동작인 `verify-full` 로 고정한다.
 *
 * pg 는 `require`·`prefer`·`verify-ca` 를 현재 `verify-full`(인증서 + 호스트명 검증)로
 * 해석하지만, 다음 메이저부터 libpq 의미(검증 없이 암호화만)로 바꾸겠다고 부팅 때마다
 * 경고한다. 값을 그대로 두면 라이브러리 업그레이드만으로 TLS 검증이 조용히 사라진다.
 *
 * 경고에는 `uselibpqcompat=true` 를 붙이라는 안내도 있지만, 그건 약한 쪽 의미를 고르는
 * 것이라 채택하지 않는다.
 *
 * env 가 아니라 여기서 처리하는 이유: `DATABASE_URL` 은 Northflank 의 Postgres 애드온이
 * 생성해 주입하므로 콘솔에서 고쳐도 애드온이 재생성되면 되돌아간다.
 */
export function pinSslMode(connectionString: string): string {
  if (!URL.canParse(connectionString)) return connectionString;

  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  if (sslMode === null || !AMBIGUOUS_SSL_MODES.includes(sslMode)) {
    return connectionString;
  }

  // libpq 의미를 명시적으로 고른 설정은 존중한다 — 운영자의 결정을 몰래 뒤집지 않는다
  if (url.searchParams.has("uselibpqcompat")) return connectionString;

  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
