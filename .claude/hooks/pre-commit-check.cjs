#!/usr/bin/env node
/**
 * 프리커밋 검증 훅 (PreToolUse, Bash 매처)
 *
 * Claude가 `git commit`을 실행하려 할 때 가로채서 lint → build → test 를 돌린다.
 * 스마트 감지: package.json 과 각 npm 스크립트(lint/build/test)의 존재를 확인해
 * 정의된 것만 실행하고, 없으면 건너뛴다. 하나라도 실패하면 커밋을 차단한다.
 *
 * 입력: stdin 으로 PreToolUse 훅 JSON
 * 출력: stdout 으로 훅 결정 JSON (실패 시 permissionDecision: "deny")
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * stdin 전체를 동기적으로 읽어 문자열로 반환한다.
 * @returns {string} stdin 내용
 */
function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch (e) {
    return "";
  }
}

/**
 * 커밋을 허용하고(개입 없이) 종료한다. 메시지가 있으면 컨텍스트로 전달한다.
 * @param {string} [message] Claude에게 보여줄 시스템 메시지
 */
function allow(message) {
  if (message) {
    process.stdout.write(JSON.stringify({ systemMessage: message }));
  }
  process.exit(0);
}

/**
 * 커밋을 차단하고 사유를 전달한다.
 * @param {string} reason 차단 사유
 */
function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

/**
 * 주어진 명령 문자열이 git 커밋 실행인지 판별한다.
 * @param {string} command 셸 명령 문자열
 * @returns {boolean} git commit 여부
 */
function isGitCommit(command) {
  if (!command) return false;
  // `git commit`, `git -C path commit`, `git -c k=v commit` 등 허용
  return /\bgit\b(?:\s+-[^\s]+|\s+--[^\s]+)*\s+commit\b/.test(command);
}

/**
 * package.json 을 읽어 정의된 scripts 객체를 반환한다.
 * @param {string} dir 프로젝트 디렉터리
 * @returns {Object|null} scripts 객체 또는 null
 */
function readScripts(dir) {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return pkg.scripts || {};
  } catch (e) {
    return null;
  }
}

/**
 * npm 스크립트를 동기 실행한다.
 * @param {string} script 스크립트 이름 (lint/build/test)
 * @param {string} dir 실행 디렉터리
 * @returns {{ ok: boolean, output: string }} 실행 결과
 */
function runScript(script, dir) {
  try {
    execSync(`npm run ${script} --silent`, {
      cwd: dir,
      stdio: "pipe",
      encoding: "utf8",
      timeout: 1000 * 60 * 4,
    });
    return { ok: true, output: "" };
  } catch (e) {
    const out = `${e.stdout || ""}${e.stderr || ""}`.trim();
    // 출력이 길면 마지막 부분만 남긴다.
    const tail = out.length > 1500 ? "...\n" + out.slice(-1500) : out;
    return { ok: false, output: tail };
  }
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin() || "{}");
  } catch (e) {
    allow(); // 입력 파싱 실패 시 개입하지 않음
    return;
  }

  // Bash 도구의 git commit 만 대상으로 한다.
  const toolName = input.tool_name || "";
  const command = (input.tool_input && input.tool_input.command) || "";
  if (toolName !== "Bash" || !isGitCommit(command)) {
    allow();
    return;
  }

  const dir = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const scripts = readScripts(dir);

  // package.json 이 없으면 검증 대상이 아님 — 안내만 하고 통과.
  if (scripts === null) {
    allow(
      "프리커밋 훅: package.json 이 없어 lint/build/test 검증을 건너뜁니다. (정적 프로젝트)"
    );
    return;
  }

  // 정의된 스크립트만 순서대로 실행한다.
  const order = ["lint", "build", "test"];
  const present = order.filter((s) => typeof scripts[s] === "string");

  if (present.length === 0) {
    allow(
      "프리커밋 훅: package.json 에 lint/build/test 스크립트가 없어 검증을 건너뜁니다."
    );
    return;
  }

  const passed = [];
  for (const script of present) {
    const result = runScript(script, dir);
    if (!result.ok) {
      deny(
        `프리커밋 검증 실패: \`npm run ${script}\` 가 실패했습니다. ` +
          `커밋을 중단합니다. 아래 출력을 확인하고 수정한 뒤 다시 커밋하세요.\n\n` +
          `--- ${script} 출력 ---\n${result.output || "(출력 없음)"}\n` +
          (passed.length ? `\n(통과한 단계: ${passed.join(", ")})` : "")
      );
      return;
    }
    passed.push(script);
  }

  allow(`프리커밋 검증 통과 ✅ (${passed.join(" → ")}). 커밋을 진행합니다.`);
}

main();
