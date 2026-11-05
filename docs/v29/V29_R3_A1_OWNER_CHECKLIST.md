# V29-R3-A1 — owner actions and Xiaomi14 checklist

This is a preparation checklist, not an executed phone test or approval to
install now. Codex will not operate Xiaomi14 or personal data.

## First: existing-key signing only

Use only the new V29 launcher supplied in this handoff. It fixes code29,
`0.11.2-personal.1`, original package and the verified unsigned SHA, then checks
the actual signed V28 as the public certificate reference. Do not run any
V27/V28 launcher or create a keystore.

1. Double-click the new V29 launcher in your private desktop session.
2. Enter the **existing** formal key password once in the starred input box.
   Do not send the password or private-window screenshots to Codex/ChatGPT.
3. A success window must give the V29 candidate and public `OWNER_RESULT.json`.
   Close it and reply only “签名已完成”. On failure give only the error category;
   preserve the attempt and do not repeatedly retry or delete output.
4. Do **not** install on Xiaomi14 yet. Codex must verify the actual APK's hash,
   original package, code29/name, v2/v3 and exact existing certificate, then run
   the isolated synthetic V28→V29 upgrade when safe. ChatGPT reviews the evidence.

## Later: phone gate after independent review and explicit owner permission

- Confirm the installed original-package App is V28. If it is another identity
  or higher version, stop and report the displayed version; do not uninstall.
- Use the App's existing local backup export and keep your backup in a safe
  location under your control. Never send private backups, recipes or keys here.
- Confirm candidate `app.recipio.local`,code29,`0.11.2-personal.1` and published
  APK hash; expected certificate is
  `5a3f7cb866cdc15d0357e03a49d611204bd2df763c71a3e005656e416adc251d`.
- Perform a normal same-signature update **without uninstalling/clearing data**.
  Any installer signature/identity error is a stop, not a reason to wipe data.
- Compare recipe count and representative IDs/content, current/step/old/shared
  images, cooking/change history and non-default theme. Test cold launch,
  offline reading, search and a deliberate edit; record only intended changes.
- Only after separate permission for real public-link requests: paste the
  permitted link, press Read Webpage, check the target title/body and diagnostic.
  No AI should start from reading. Target prose can still be partial. Only title,
  login/challenge or media-only results must not be presented as complete.
- AI remains a separate deliberate operation with possible API cost. Real AI
  quality/Key access is not established by this candidate's Fake regression.
- If a DNS restriction occurs, record the error category and actual VPN/network
  state; do not loosen security or conclude it has the PC's Fake-IP cause.

On install failure, missing data/image/history, white screen or crash: stop,
preserve the existing App and backup, note version/error category/time. Do not
uninstall, clear data, restore over the current library or expose private data.

## Unexecuted until evidence exists

Owner signing, actual V29 v2/v3/certificate, isolated V28→V29 installation/data
retention and all Xiaomi14/OEM/IME/TalkBack/real AI/real-link tests remain
NOT_RUN until individually verified. R3's PC diagnostic DoH and offline replay
must not be relabelled as phone/default-DNS success. N2 stays paused.
