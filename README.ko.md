# memory-store

로컬 SQLite 기반 크로스 세션 메모리 저장소.
AI 에이전트, CLI, 스크립트 등 어디서든 세션 간 데이터를 저장하고 검색할 수 있습니다.

## 특징

- SQLite 파일 하나로 동작 (별도 DB 서버 불필요)
- CLI로 어디서든 사용 가능 (Claude Code, OpenClaw, 터미널, cron, 스크립트)
- 카테고리, 태그 기반 정리
- 검색할 때만 데이터를 가져오므로 컨텍스트 절약
- stdin 지원으로 긴 내용 저장 가능

## 요구사항

- [Bun](https://bun.sh) 1.0+

## 설치

```bash
git clone https://github.com/namekun/memory-store.git
cd memory-store

chmod +x bin/memory-tool

# PATH에 추가 (선택)
ln -s $(pwd)/bin/memory-tool ~/.local/bin/memory-tool
```

DB 파일은 첫 실행 시 자동 생성됩니다.

## 사용법

```bash
# 저장 (키가 이미 있으면 업데이트)
memory-tool save <key> <value> [--category <cat>] [--tags <tags>]

# 조회
memory-tool get <key>

# 검색 (키, 값, 태그 전체 대상)
memory-tool search <query> [--category <cat>] [--limit <n>]

# 카테고리별 목록 (미지정 시 전체 카테고리 통계)
memory-tool list [category]

# 삭제
memory-tool delete <key>

# DB 통계
memory-tool stats
```

## 사용 예시

```bash
# 의사결정 기록
memory-tool save auth-method "JWT 대신 세션 쿠키 선택. 이유: ..." --category decision --tags "auth,security"

# 디버깅 히스토리
memory-tool save cors-error-fix "프록시 설정 누락이 원인..." --category debug --tags "cors,nginx"

# 크론 잡 결과 저장
memory-tool save tech-news-2026-04-01 "오늘 주요 뉴스: ..." --category cron --tags "news,daily"

# 검색
memory-tool search auth
memory-tool search "프록시" --category debug

# 카테고리별 조회
memory-tool list decision

# stdin으로 긴 내용 저장
echo "긴 내용..." | memory-tool save my-key --category general
```

## AI 에이전트 연동

### Claude Code

CLAUDE.md에 추가:
```
세션 간 공유가 필요한 데이터는 memory-tool CLI를 사용할 것.
- 저장: Bash로 `memory-tool save <key> <value> --category <cat>`
- 검색: Bash로 `memory-tool search <query>`
```

### OpenClaw

exec allowlist에 추가:
```bash
openclaw approvals allowlist add --agent pochita "/path/to/memory-store/bin/memory-tool"
```

에이전트 TOOLS.md에 사용법 추가 후 `system.run`으로 호출:
```
system.run: ["memory-tool", "save", "key", "value", "--category", "cron"]
system.run: ["memory-tool", "search", "keyword"]
```

### 기타 AI 도구 (Codex, Gemini 등)

터미널 접근이 가능한 모든 AI 도구에서 동일하게 사용 가능.

## 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `MEMORY_STORE_DB_PATH` | `~/.claude/mcp-servers/memory-store/data/memory.db` | SQLite DB 파일 경로 |

## 기술 스택

- [Bun](https://bun.sh) + `bun:sqlite` (내장 SQLite)

## 라이선스

MIT
