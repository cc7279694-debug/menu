# R1 verification

2026-10-26 — IN_PROGRESS, no-key segment. Results below distinguish execution
from planned coverage. Final commit/run receipts will be added after cloud CI.

| Scope | Current result | Evidence/limit |
|---|---|---|
| S01-R three-job signing isolation | Previously accepted; main/feature workflow blob matches | User acceptance + current remote readback |
| Environment | READBACK PASS;0 Secrets | Exact feature branch, owner review, admin bypass=false |
| Permanent signing key/certificate | NOT_RUN | Two offline media unavailable; owner gate |
| Encrypted offline backups and actual decrypt | NOT_RUN | No real key or two offline devices |
| Secret provisioning / real signing | NOT_RUN | No placeholder/debug key substitution |
| v1 → nonempty independent SQLite | Targeted3tests PASS | Real frozen ZIP and SQLite; Native port emulated |
| Cloud fixture safety guards | Targeted4tests PASS | Actual Bash with fake SDK/non-APK fixtures; no real adb |
| Combined final local targeted run |2files /7tests PASS,33.43s | Direct ESLint, Bash syntax and Actions syntax also PASS |
| Modern AES256 backup tool preflight | Synthetic PASS | No password argv, two internal test copies decrypt, wrong password refused; NOT offline key custody |
| Complete v2 ZIP/staging/reference bytes | Test added, JVM NOT_RUN yet | Actual archive test, no database/device claim |
| Native Android backup/storage | NOT_RUN pending cloud | Only generated fixtures, fresh API36 AVD |
| Same permanent-signature `.next` upgrade | NOT_RUN | Requires owner key + two increasing signed versions |
| Real personal data migration/phone | NOT_RUN | No owner approval for actual data operations |
| Formal candidate delivery | NOT_BUILT | Long-term signing prerequisites unmet |

Historical1163-test cloud run is source evidence for the earlier freeze, not
the new tests. Current no-key cloud run and fresh test numbers must be recorded
before claiming this segment verified. G4/physical-phone/TalkBack/performance
acceptance is not manufactured by this table.
