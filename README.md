# memory-store MCP Server

Claude Code용 로컬 SQLite 기반 크로스 세션 메모리 서버.
세션 간 데이터를 저장하고 필요할 때 검색해서 꺼내 쓸 수 있습니다.

## 특징

- SQLite 파일 하나로 동작 (별도 DB 서버 불필요)
- 필요할 때만 검색하므로 CLAUDE.md 비대화 없이 컨텍스트 절약
- 카테고리, 태그 기반 정리
- Docker 지원

## 설치

### Bun (로컬)

```bash
# 의존성 설치
bun install

# 실행 (Claude Code가 자동으로 실행하므로 수동 실행 불필요)
bun run src/index.ts
```

### Docker

```bash
# 빌드
docker build -t memory-store .

# 실행 (데이터 영속화를 위해 볼륨 마운트)
docker run -v memory-store-data:/data memory-store
```

## Claude Code 설정

`~/.claude/settings.json`의 `mcpServers`에 추가:

### 로컬 (Bun)

```json
{
  "mcpServers": {
    "memory-store": {
      "command": "bun",
      "args": ["run", "/path/to/memory-store/src/index.ts"]
    }
  }
}
```

### Docker

```json
{
  "mcpServers": {
    "memory-store": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "memory-store-data:/data", "memory-store"]
    }
  }
}
```

## 도구

| 도구 | 설명 |
|------|------|
| `memory_save` | 키-값 저장 (카테고리, 태그 지원). 키가 이미 있으면 업데이트 |
| `memory_get` | 키로 정확히 조회 |
| `memory_search` | 키워드로 검색 (키, 값, 태그 전체 대상) |
| `memory_list` | 카테고리별 목록 조회. 카테고리 미지정 시 전체 카테고리 통계 |
| `memory_delete` | 키로 삭제 |
| `memory_stats` | DB 통계 (전체 개수, 카테고리별 분포, 최근/최초 항목) |

## 사용 예시

```
# 의사결정 기록
memory_save(key="auth-method", value="JWT 대신 세션 쿠키 선택. 이유: ...", category="decision", tags="auth,security")

# 디버깅 히스토리
memory_save(key="cors-error-fix", value="프록시 설정 누락이 원인...", category="debug", tags="cors,nginx")

# 검색
memory_search(query="auth")
memory_list(category="decision")
```

## CLI (memory-tool)

MCP 서버 없이 직접 SQLite에 접근하는 CLI 도구. OpenClaw 에이전트 등 MCP 연결이 어려운 환경에서 사용.

```bash
# 저장
memory-tool save <key> <value> [--category <cat>] [--tags <tags>]

# 조회
memory-tool get <key>

# 검색
memory-tool search <query> [--category <cat>] [--limit <n>]

# 카테고리별 목록 (미지정 시 전체 통계)
memory-tool list [category]

# 삭제
memory-tool delete <key>

# DB 통계
memory-tool stats
```

### CLI 설치

```bash
# 실행 권한 부여
chmod +x bin/memory-tool

# PATH에 추가하거나 심볼릭 링크
ln -s /path/to/memory-store/bin/memory-tool ~/.local/bin/memory-tool
```

### OpenClaw 연동

exec allowlist에 추가:
```bash
openclaw approvals allowlist add --agent pochita "/path/to/memory-store/bin/memory-tool"
```

에이전트 TOOLS.md에 사용법 추가 후 `system.run`으로 호출:
```
system.run: ["memory-tool", "save", "key", "value", "--category", "cron"]
system.run: ["memory-tool", "search", "keyword"]
```

MCP 서버와 동일한 SQLite DB를 공유하므로 CLI로 저장한 데이터를 MCP로 검색하거나 그 반대도 가능.

## 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `MEMORY_STORE_DB_PATH` | `~/.claude/mcp-servers/memory-store/data/memory.db` | SQLite DB 파일 경로 |

## 기술 스택

- [Bun](https://bun.sh) + `bun:sqlite` (내장 SQLite)
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) (MCP 공식 SDK)

## 라이선스

MIT
