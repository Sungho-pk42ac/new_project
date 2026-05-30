# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**랜덤 식단 룰렛** — 버튼을 누르면 메뉴 이름이 슬롯머신처럼 돌다 멈추며 오늘의 메뉴 하나를 추첨해주는 웹앱.
빌드 도구·프레임워크·의존성 없이 **단일 `index.html`** 안에 HTML + CSS + 바닐라 JS가 모두 들어 있다.

## 실행 / 빌드 / 테스트

- **실행**: `index.html`을 브라우저로 연다 (`start index.html` 또는 더블클릭). 개발 서버 불필요.
- **빌드/린트/테스트 없음**: 이 프로젝트에는 `package.json`이 없다. 따라서 `npm run build/test/lint`는 동작하지 않는다. 전역 CLAUDE.md에 정의된 npm 명령어는 이 프로젝트에 적용되지 않으니 사용하지 말 것.
- 변경 검증은 브라우저에서 직접 동작을 확인하는 방식으로 한다 (돌리기, 카테고리 필터, 메뉴 추가/삭제, 새로고침 후 유지).

## 코드 아키텍처

### `index.html` (앱 본체)
하단 `<script>` 한 곳에 모든 로직이 있다. 핵심 구조:

- **상태**: 모듈 스코프 변수 `menus`(전체 메뉴 배열), `currentCategory`(필터), `isSpinning`(회전 중 플래그). 외부 상태관리 없음.
- **데이터 모델**: 메뉴 1건 = `{ name, category }`. 카테고리는 `CATEGORIES`(한식/중식/일식/양식) 상수로 고정.
- **영속성**: `localStorage` 키 `"menuRouletteData"`에 JSON 저장. 첫 실행 시 `defaultMenus`(20개)로 초기화. `loadMenus`/`saveMenus`가 입출구.
- **추첨 연출**: `spinRoulette`가 `setTimeout`을 재귀 호출하며 `delay`를 1.12배씩 늘려 감속하다 `maxDelay` 도달 시 `finishSpin`으로 당첨 확정. 후보는 `getCandidates`(현재 카테고리 기준 필터)에서 뽑는다.
- **렌더링 흐름**: 데이터 변경 → `saveMenus` → `renderMenuList`/`updateSpinAvailability` 순으로 DOM 갱신. 후보 0개면 돌리기 버튼 비활성화 + 안내 문구로 전환.

코드 컨벤션(camelCase, 함수별 한국어 JSDoc, 한국어 주석)은 전역 CLAUDE.md를 따른다. 단, 단일 정적 파일이라 외부 로깅 라이브러리는 도입하지 않고 `console` 사용을 최소화한다.

### `.claude/` (이 프로젝트 전용 Claude Code 도구)
이 저장소는 코드 검증용 Claude Code 컴포넌트를 자체적으로 갖고 있다. 이들은 서로 연결되어 동작한다:

- **`skills/code-review/`** — 정확성·보안·에러처리·품질·컨벤션을 심각도(🔴 Critical / 🟡 Major / 🔵 Minor / 💡 Nit)별로 점검하는 리뷰 방법론. 상세 점검 항목은 `references/checklist.md`.
- **`agents/code-reviewer.md`** — 코드 리뷰 서브에이전트. 호출되면 **가장 먼저 `code-review` 스킬을 로드**한 뒤 그 절차·출력 형식을 그대로 따르도록 설계됨. 읽기 전용(파일 수정 안 함). 리뷰 요청 시 이 에이전트를 사용한다.
- **`agents/code-fixer.md`** — 코드 수정 서브에이전트. 리뷰 결과를 받아 **기본적으로 🔴 Critical + 🟡 Major 만** 최소 변경으로 반영하고, 🔵 Minor/💡 Nit 은 제안으로만 남긴다. 시그니처 변경 시 호출부까지 일관 수정.
- **`commands/review-and-fix.md`** (`/review-and-fix`) — 오케스트레이터 슬래시 커맨드. `code-reviewer`로 리뷰 → 결과의 Critical+Major를 `code-fixer`로 자동 수정까지 순서대로 실행한다. **훅은 새 에이전트를 디스패치할 수 없으므로**, "리뷰 후 자동 수정" 흐름은 이 커맨드로 구현되어 있다.
- **`hooks/pre-commit-check.cjs` + `settings.json`** — `git commit`을 가로채는 `PreToolUse`(Bash) 훅. `package.json`과 lint/build/test 스크립트 존재를 **스마트 감지**해 정의된 것만 실행하고, 하나라도 실패하면 커밋을 차단(deny)한다. `package.json`이 없는 현재 상태에서는 "검증 건너뜀"으로 통과한다. Windows 호환을 위해 bash/jq 없이 Node.js로 작성됨.

> 훅은 **세션 시작 시 로드**된다. `settings.json`의 훅을 수정하면 Claude Code를 재시작해야 적용된다.
