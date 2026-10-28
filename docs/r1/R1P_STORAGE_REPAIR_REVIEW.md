# R1-P storage diagnostics — BLOCKED with partial changes

Date: 2026-10-28. Branch: `fix/recipio-r1p-storage-diagnostics`, based on
`68da0918fda8ce9ec85cf4f224f6b3a8e8f45d0c`.

The current failure is `R1P_OWNER_PRIVATE_STORAGE_UNEXPECTED`; its precise
operation and root cause remain UNKNOWN. The user authorized this focused
repair but explicitly did not authorize another real owner-signing operation.
No actual keystore, password, backup contents, phone or personal data were
accessed during this repair. The public owner tool at E:/RECIPIO-Signing was not
updated. No successful owner receipt or signed APK is asserted.

## Verified partial changes

- New passwords use case-sensitive character classes. The existing source,
  personal-copy and encrypted-backup passwords retain the previous nonempty
  printable-ASCII compatibility rule; actual secret/password validation and
  certificate checks remain required. Prompt counts remain unchanged.
- `Assert-R1BackupState` stops if backup presence changes between the prompt
  decision and backup handling. Presence alone cannot identify replacement at
  the same path; no claim is made that all replacement races are solved.
- Public errors use a fixed allowlist plus fixed tool/stage combinations;
  arbitrary new `R1P_...` strings no longer become public categories. This
  string-only allowlist cannot distinguish an external exception that exactly
  mimics an existing known category.
- The experimental branch's `Invoke-R1OwnerSigning` fails closed with
  `R1P_STORAGE_REPAIR_NOT_VERIFIED` before its console, file, password or
  signing operations. The separate launcher may still check logging policy and
  write a sanitized public failure record before/after this function. Only
  synthetic test fixtures mock this gate; the delivered public tool bundle
  remains unchanged and must not be run for this task.

## Verification performed on the final partial implementation

| Check | Result and scope |
|---|---|
| Password compatibility and secret prompts | 29 PASS, pure in-memory synthetic SecureStrings; real secret or key NOT_RUN |
| Failure-category allowlist | 16 PASS, pure in-memory synthetic strings |
| Fail-closed signing entry | 1 PASS, in-memory fake console, no file access |
| Statically enumerated literal error labels | 110 occurrences mapped; 0 missing |
| PowerShell AST and diff checks | PASS for all changed PowerShell source and tests; `git diff --check` PASS |
| Historical 135 tests | NOT_RUN in this round; not claimed as current evidence |
| Windows ACL, directory creation and cleanup tests | BLOCKED / NOT_RUN |
| Same-user owner read-only diagnostic including fixed leaf metadata | NOT_RUN; prior independent Console only checked two directory metadata records |
| Actual owner signing, encrypted backup recovery and Android tests | NOT_RUN |

RED was observed before fixes: password tests 12 PASS / 11 FAIL, then added
owner/backup-state tests 23 PASS / 6 FAIL; category tests 10 PASS / 5 FAIL;
the release gate failed before its implementation. No historical test count is
reused as fresh evidence. Synthetic-only test failures contained no real data.

## Outstanding security work

1. Separate paths, fixed-leaf metadata, root validation/creation, source
   routing, two session operations and cleanup into fixed error stages.
2. Verify existing root directories without rewriting ACLs; reject unsafe or
   unrecognized descriptors without mutation.
3. Prove secure exclusive creation, parent/object identity and owned cleanup
   under Windows. .NET `FileSystemAclExtensions.CreateDirectory` can return an
   existing directory, so existence checks alone do not prove ownership. Do not
   implement an unverified replacement or use GUID alone as deletion authority.
4. Put session creation under ownership-aware `try/finally`, independently
   attempt all confirmed cleanups and preserve failure priority.
5. Implement the no-password read-only diagnostic and run it only with the
   approved scope and same-user context; do not open/hash/list private files.
6. Rerun all required non-sensitive tests, including real Windows synthetic ACL
   scenarios when their execution is allowed. Only after that can the gate be
   reconsidered and any separately authorized owner action be proposed.

Automatic approval previously rejected the synthetic storage probe with
`blocked by policy` and provided no further reason. The rejected scope was not
retried through a different path, host, API or tool. No product code, SQLite,
backup format, Android application or main branch was changed.

`R1P_STORAGE_DIAGNOSTICS_BLOCKED`
