# G2 bounded engineering self-review

This is local Codex engineering review, not ChatGPT independent review or user
visual acceptance. No reviewer claimed to run Android or the implementation's
browser commands independently.

## Scope inspected

Approved G2 attachment/contract, diff from9a17b1c, current core components,
shared styling/extraction/build guard, existing save/complete/delete locks,
share and restore route gates. Follow-up inspection covered the two minimal
return/Sheet routing repairs after real browser failures.

## Findings and disposition

1. G1 row/recent-title hooks missing in real Home: confirmed by source and
   actual capture; existing shared classes restored, no data rewrite.
2. Short history/editor return lost detail position: three failing behavior
   cases plus browser evidence; original route now records/restores position.
3. Async image/history layout clamped the restored position: actual browser
   RED; real layout observation, cancelled by user interaction, repairs it.
4. Completion→edit could inherit an old detail anchor: explicitly resets its
   return anchor to0, preserving original completion adjustment semantics.
5. Chromium window-target listener order differed from jsdom: actual browser
   first Back closed both sheet/viewer before the repair. Root defers while a
   V2 sheet is mounted; the sheet consumes its own event. Browser GREEN retains
   the actual Guided step without a second cooking state or IME state machine.

Final bounded source review found no remaining Critical/Important issue in
these changes. Data models/Repository/Native implementations are unchanged.
No extra code change was requested for minor style preferences.

Final QA added actual48px target measurements and found two47px Home text
controls due the old #root min-height rule. One core-scoped override enforces48px
without affecting G1/G3 or the more-specific52px primary CTA. Browser RED→GREEN.
The earlier v20 APK is retained as an intermediate; final candidate is v21.
QA also tightened media evidence to real decoded blob img elements and checked
the DB's explicit completion from1 seeded record to2 unique records, rather
than relying on role=img placeholders or only a success heading.

## Set aside / limits

- G3 page redesign, persisted theme selection and final default theme are not
  approved; keep their existing renderers and the transient G1 candidates.
- Native/browser confirmation ownership was intentionally retained instead of
  adding a new confirmation state machine for a purely visual task.
- Actual Android IME, picker grants, SQLite runtime, OEM and phone acceptance
  cannot be established from this source/browser review. See device NOT_RUN.
- Final visual equivalence/acceptance belongs to the user and ChatGPT; local
  engineering review is not its substitute.
- Bundle threshold and five old Next image warnings are recorded, not hidden
  by unrelated performance/refactoring/dependency work.

Assessment: implementation may be handed off with fresh build/test evidence
and the explicit Android/independent-review gates. Do not merge or start G3.
