---
name: code-review
description: This skill should be used when the user asks to "코드 리뷰", "리뷰해줘", "review this code", "review my changes", "코드 검토", "PR 리뷰", or wants feedback on correctness, security, or code quality of recently written or changed code. Provides a structured review methodology with a prioritized checklist and severity-based reporting.
version: 0.1.0
---

# 코드 리뷰 (Code Review)

코드의 정확성·보안·품질·컨벤션을 체계적으로 점검하고, 심각도 순으로 정리된 리뷰 결과를 제공한다.
새로 작성했거나 변경된 코드에 집중하며, 확신이 높은 문제를 우선 보고한다.

## 언제 사용하는가

- 사용자가 "코드 리뷰", "리뷰해줘", "검토해줘", "review this"라고 요청할 때
- 기능 구현/버그 수정 직후 품질을 점검할 때
- 커밋·머지 전 변경분을 확인할 때

## 리뷰 절차

1. **범위 파악** — 무엇을 리뷰할지 확정한다.
   - 변경분 리뷰: `git diff`, `git diff --staged`로 변경된 코드만 본다.
   - git 저장소가 아니거나 특정 파일 요청이면 해당 파일을 직접 읽는다.
   - 리뷰 대상이 불명확하면 사용자에게 먼저 확인한다.

2. **컨텍스트 확보** — 프로젝트의 `CLAUDE.md`, 코딩 컨벤션, 주변 코드 패턴을 읽어 기준을 맞춘다.

3. **점검** — 아래 카테고리를 순서대로 점검한다. 상세 체크리스트는 `references/checklist.md` 참고.
   - 정확성(Correctness): 로직 오류, 엣지 케이스, off-by-one, null/undefined, 비동기 처리
   - 보안(Security): 입력 검증, 인젝션, 비밀정보 노출, 권한
   - 에러 처리(Error Handling): 예외 처리 누락, 조용한 실패
   - 품질/유지보수(Quality): 중복, 과한 복잡도, 네이밍, 재사용 가능 코드
   - 컨벤션(Conventions): 프로젝트 규칙(예: CLAUDE.md의 camelCase, JSDoc, 로깅 규칙) 준수 여부

4. **검증** — 보고 전 각 지적이 실제 문제인지 코드를 다시 확인한다. 추측성 지적은 제외하거나 "확인 필요"로 명시한다.

5. **보고** — 아래 출력 형식으로 심각도 순 정리한다.

## 심각도 기준

| 심각도 | 의미 | 예시 |
|--------|------|------|
| 🔴 Critical | 반드시 수정. 버그/보안 취약점/데이터 손상 | null 참조 크래시, SQL 인젝션 |
| 🟡 Major | 수정 권장. 잠재적 버그/설계 문제 | 처리 안 된 엣지 케이스, 누락된 에러 처리 |
| 🔵 Minor | 개선 제안. 가독성/컨벤션 | 네이밍, 중복, 주석 누락 |
| 💡 Nit | 선택적. 취향/사소함 | 포매팅 미세 조정 |

## 출력 형식

```
## 코드 리뷰 결과

**리뷰 범위**: <파일/변경분 요약>
**총평**: <1~2문장 요약 + 머지 가능 여부>

### 🔴 Critical
- `파일:줄` — <문제> → <해결 방법>

### 🟡 Major
- `파일:줄` — <문제> → <해결 방법>

### 🔵 Minor / 💡 Nit
- `파일:줄` — <제안>

### ✅ 잘된 점
- <긍정적 피드백>
```

## 핵심 원칙

- **확신 우선**: 확실한 문제만 높은 심각도로. 불확실하면 명시한다.
- **해결책 동반**: 문제만 지적하지 말고 구체적 수정 방향을 제시한다. (CLAUDE.md: "에러 발생 시 원인과 해결 방법을 함께 제시")
- **위치 명시**: 항상 `파일:줄` 형식으로 클릭 가능하게.
- **프로젝트 규칙 존중**: CLAUDE.md 등 프로젝트 컨벤션을 최우선 기준으로 삼는다.
- **응답 언어**: 한국어로 작성한다.

## 추가 리소스

- **`references/checklist.md`** — 카테고리별 상세 점검 항목과 언어별 흔한 버그 패턴
