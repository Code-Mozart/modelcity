#!/usr/bin/env bash
# Work timer (^1141). Start it in the background (run_in_background) when beginning a piece of work:
#   scripts/timer.sh 1 "what I work on"   -> after 5 min: check you are not lost in details
#   scripts/timer.sh 2 "what I work on"   -> start it again after round 1; after another 5 min: status report, ask permission
set -euo pipefail
round="${1:?round 1 or 2}"
task="${2:-the current work}"
sleep "${TIMER_SECONDS:-300}"
if [ "$round" = "1" ]; then
  echo "TIMER 5 MIN: working on \"$task\" for 5 minutes. Check: am I lost in details? Is this the smallest next step? I may decide to continue; then start round 2 (scripts/timer.sh 2)."
else
  echo "TIMER 10 MIN: working on \"$task\" for 10 minutes. STOP. Give the user a status report (done, open, what is next, cost so far) and ASK PERMISSION before sinking in more time."
fi
