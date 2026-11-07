#!/bin/bash
# Full test run for Gen AI Games: UI layout/overlap policy + gameplay/voice regressions. Run from scratchpad/pages.
set -u; cd "$(dirname "$0")/.."; fail=0
run(){ echo "=== $1"; if node "tests/$1" > "/tmp/t_$1.log" 2>&1; then tail -n ${2:-4} "/tmp/t_$1.log"; else echo "FAILED: $1"; tail -n 40 "/tmp/t_$1.log"; fail=1; fi; }
run ui_test.js 3
run talk_test.js 4
run agent2_test.js 12
run dodge_test.js 1
run mantra_test.js 2
run fort_test.js 2
run arena2_test.js 3
run auto_test.js 1
[ $fail = 0 ] && echo "ALL SUITES PASS" || { echo "SOME SUITES FAILED"; exit 1; }
