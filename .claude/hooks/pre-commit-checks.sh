#!/usr/bin/env bash
# git commit 직전에 CI 검사 일부를 미리 돌린다 (.claude/settings.json 의 PreToolUse hook).
#
# 여기서 도는 것: pnpm audit --audit-level=high + pnpm typecheck
#   - lint/prettier 는 husky + lint-staged 가 커밋 시점에 이미 돌린다.
#   - 테스트(특히 e2e)는 Docker 가 필요하고 느려서 제외 — CI 에 맡긴다.
#
# 검사에 걸리면 JSON 으로 deny 를 돌려줘 커밋을 막는다. 스크립트 자체는 항상 0 으로 끝낸다.
set -uo pipefail

root=$(git rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR:-.}")
cd "$root" || exit 0

# 이 저장소가 아니면(다른 프로젝트에서 커밋) 그냥 통과시킨다
[ -f "$root/pnpm-workspace.yaml" ] || exit 0

reasons=""

add_reason() {
  reasons="${reasons}${reasons:+$'\n\n'}$1"
}

# 1) 의존성 취약점 — CI 의 "Audit dependencies" 와 동일한 명령
audit_out=$(pnpm audit --audit-level=high 2>&1)
if [ $? -ne 0 ] && printf '%s' "$audit_out" | grep -q "vulnerabilities found"; then
  add_reason "pnpm audit --audit-level=high 실패 — package.json 의 pnpm.overrides 에 패치 버전을 강제한 뒤 pnpm install 하세요.
$(printf '%s' "$audit_out" | grep -E "^Severity:|^│ (high|critical)" | head -20)"
fi

# 2) 타입 체크 — CI 의 "Typecheck" 와 동일 (@tripic/shared 는 dist 를 참조하므로 워크스페이스 전체)
if ! typecheck_out=$(pnpm typecheck 2>&1); then
  add_reason "pnpm typecheck 실패 — 타입 오류를 고친 뒤 커밋하세요. @tripic/shared 타입을 바꿨다면 pnpm --filter @tripic/shared build 가 먼저입니다.
$(printf '%s' "$typecheck_out" | grep -E "error|Failed" | head -20)"
fi

[ -z "$reasons" ] && exit 0

jq -n --arg reason "$reasons" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ("커밋 전 검사 실패 (CI 에서도 같은 이유로 막힙니다):\n\n" + $reason)
  }
}'
