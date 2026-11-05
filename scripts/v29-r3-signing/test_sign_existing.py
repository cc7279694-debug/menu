"""Generated non-key ZIP fixtures and Fake official tools only; no real signing."""
import contextlib
import hashlib
import importlib.util
import io
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.find_spec('sign_existing')
signing = __import__('sign_existing') if spec else None


class V29ExistingIdentityTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(signing, 'V29 existing-identity helper not implemented')
        self.temporary = tempfile.TemporaryDirectory(prefix='recipio-v29-fake-tools-')
        self.addCleanup(self.temporary.cleanup)
        root = Path(self.temporary.name)
        unsigned = root / 'unsigned.fixture'
        previous = root / 'previous.fixture'
        for path in (unsigned, previous):
            with zipfile.ZipFile(path, 'w') as archive:
                archive.writestr('assets/public/index.html', 'SYNTHETIC NON-APK FIXTURE')
        self.key = root / 'existing-key.fixture'
        self.key.write_text('NOT A KEY')
        self.cfg = signing.Inputs(unsigned, previous, self.key, root / 'delivery',
                                  root / 'staging', root / 'java.fixture', root / 'sdk',
                                  self.sha(unsigned), self.sha(previous), 'a' * 64)
        self.password = 'SYNTHETIC_TEST_PASSWORD_ONLY'
        self.calls = []
        self.wrong_cert = False
        self.v2 = self.v3 = True
        self.debuggable = self.test_only = False
        self.wrong_version = False
        self.changed_payload = False
        self.sign_failure = False

    @staticmethod
    def sha(path):
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def fake_tool(self, args, payload=None):
        self.calls.append((args, payload))
        if 'badging' in args:
            code = 99 if self.wrong_version else 29
            return f"package: name='app.recipio.local' versionCode='{code}' versionName='0.11.2-personal.1'\n"
        if 'xmltree' in args:
            return '\n'.join([
                'E: manifest',
                '  A: android:debuggable(0x0101000f)=(type 0x12)' + ('0xffffffff' if self.debuggable else '0x0'),
                '  A: android:testOnly(0x01010272)=(type 0x12)' + ('0xffffffff' if self.test_only else '0x0'),
            ])
        if 'verify' in args:
            previous = args[-1] == str(self.cfg.previous)
            return '\n'.join([
                'Verified using v2 scheme (APK Signature Scheme v2): ' + str(previous or self.v2).lower(),
                'Verified using v3 scheme (APK Signature Scheme v3): ' + str(previous or self.v3).lower(),
                'Signer #1 certificate SHA-256 digest: ' + ('b' * 64 if self.wrong_cert and not previous else self.cfg.cert),
            ])
        if 'sign' in args:
            if self.sign_failure:
                raise RuntimeError('PRIVATE TOOL FAILURE ' + self.password)
            destination = Path(args[args.index('--out') + 1])
            with zipfile.ZipFile(self.cfg.unsigned) as original, zipfile.ZipFile(destination, 'w') as archive:
                for name in original.namelist():
                    archive.writestr(name, b'WRONG' if self.changed_payload else original.read(name))
                archive.writestr('META-INF/FAKE.SF', 'NOT A SIGNATURE')
            return ''
        return ''

    def run_sign(self):
        return signing.sign_existing(self.cfg, self.password, self.fake_tool)

    def test_success_fixed_v29_public_receipt_and_key_fixture_unchanged(self):
        before = self.key.read_bytes()
        result = self.run_sign()
        self.assertEqual(result['versionCode'], 29)
        self.assertEqual(result['versionName'], '0.11.2-personal.1')
        self.assertTrue(result['v2Verified'])
        self.assertTrue(result['v3Verified'])
        self.assertTrue((self.cfg.output / 'recipio-personal-v29.apk').is_file())
        self.assertTrue((self.cfg.output / 'OWNER_RESULT.json').is_file())
        self.assertEqual(self.key.read_bytes(), before)

    def test_preflight_uses_only_fake_existing_inputs(self):
        signing.preflight(self.cfg, self.fake_tool)
        self.assertFalse(any('sign' in args for args, _ in self.calls))

    def test_pending_build_hash_fails_before_tools_or_password(self):
        pending = signing.Inputs(**{**self.cfg.__dict__, 'sha': 'PENDING_BUILD_HASH'})
        with self.assertRaisesRegex(signing.Stop, 'UNSIGNED_HASH_NOT_FROZEN'):
            signing.preflight(pending, self.fake_tool)
        self.assertFalse(self.calls)

    def test_changed_unsigned_rejected(self):
        self.cfg.unsigned.write_bytes(b'CHANGED')
        with self.assertRaisesRegex(signing.Stop, 'UNSIGNED_HASH_MISMATCH'):
            self.run_sign()
        self.assertFalse(self.calls)

    def test_changed_previous_apk_rejected_before_tools(self):
        self.cfg.previous.write_bytes(b'CHANGED')
        with self.assertRaisesRegex(signing.Stop, 'PREVIOUS_APK_HASH_MISMATCH'):
            signing.preflight(self.cfg, self.fake_tool)
        self.assertFalse(self.calls)

    def test_existing_output_never_overwritten(self):
        self.cfg.output.mkdir()
        keep = self.cfg.output / 'keep.fixture'
        keep.write_text('KEEP')
        with self.assertRaisesRegex(signing.Stop, 'OUTPUT_EXISTS'):
            self.run_sign()
        self.assertEqual(keep.read_text(), 'KEEP')
        self.assertFalse(self.calls)

    def test_wrong_version_rejected_before_sign(self):
        self.wrong_version = True
        with self.assertRaisesRegex(signing.Stop, 'APK_IDENTITY_MISMATCH'):
            self.run_sign()
        self.assertFalse(any('sign' in args for args, _ in self.calls))

    def test_debuggable_rejected_before_sign(self):
        self.debuggable = True
        with self.assertRaisesRegex(signing.Stop, 'APK_NOT_RELEASE'):
            self.run_sign()
        self.assertFalse(any('sign' in args for args, _ in self.calls))

    def test_testonly_rejected_before_sign(self):
        self.test_only = True
        with self.assertRaisesRegex(signing.Stop, 'APK_NOT_RELEASE'):
            self.run_sign()
        self.assertFalse(any('sign' in args for args, _ in self.calls))

    def test_missing_v2_refuses_publication(self):
        self.v2 = False
        with self.assertRaisesRegex(signing.Stop, 'SIGNATURE_SCHEMES_MISMATCH'):
            self.run_sign()
        self.assertFalse(self.cfg.output.exists())

    def test_missing_v3_refuses_publication(self):
        self.v3 = False
        with self.assertRaisesRegex(signing.Stop, 'SIGNATURE_SCHEMES_MISMATCH'):
            self.run_sign()
        self.assertFalse(self.cfg.output.exists())

    def test_wrong_certificate_refuses_publication(self):
        self.wrong_cert = True
        with self.assertRaisesRegex(signing.Stop, 'CERTIFICATE_MISMATCH'):
            self.run_sign()
        self.assertFalse(self.cfg.output.exists())

    def test_payload_changes_refuse_publication(self):
        self.changed_payload = True
        with self.assertRaisesRegex(signing.Stop, 'APK_PAYLOAD_CHANGED'):
            self.run_sign()
        self.assertFalse(self.cfg.output.exists())

    def test_alignment_happens_before_signing_and_password_only_stdin(self):
        self.run_sign()
        index = next(i for i, item in enumerate(self.calls) if 'sign' in item[0])
        self.assertTrue(any('zipalign' in args[0] and '-c' in args for args, _ in self.calls[:index]))
        args, payload = self.calls[index]
        self.assertEqual(args[args.index('--v2-signing-enabled') + 1], 'true')
        self.assertEqual(args[args.index('--v3-signing-enabled') + 1], 'true')
        self.assertEqual(args[args.index('--v4-signing-enabled') + 1], 'false')
        self.assertNotIn(self.password, ' '.join(args))
        self.assertEqual(payload, (self.password + '\n' + self.password + '\n').encode())
        for path in self.cfg.output.rglob('*'):
            if path.is_file():
                self.assertNotIn(self.password.encode(), path.read_bytes())

    def test_tool_failure_redacted_and_no_retry(self):
        self.sign_failure = True
        capture = io.StringIO()
        with contextlib.redirect_stdout(capture), contextlib.redirect_stderr(capture):
            with self.assertRaisesRegex(signing.Stop, '^SIGN_FAILED$'):
                self.run_sign()
        self.assertNotIn(self.password, capture.getvalue())
        self.assertEqual(sum('sign' in args for args, _ in self.calls), 1)
        self.assertFalse(self.cfg.output.exists())

    def test_newline_password_never_reaches_tool(self):
        self.password = 'bad\nvalue'
        with self.assertRaisesRegex(signing.Stop, 'PASSWORD_TRANSPORT_INVALID'):
            self.run_sign()
        self.assertFalse(self.calls)


class V29SigningDiagnosticTests(unittest.TestCase):
    secret = b'SYNTHETIC_PRIVATE_DIAGNOSTIC_SENTINEL'
    sign_args = ['fake-java', '-jar', 'apksigner.jar', 'sign', 'fake-private-input']

    def assert_safe_error(self, expected, *, stderr=b'', side_effect=None, args=None,
                          stage='SIGN_FAILED', runner=None):
        captured = io.StringIO()
        fake_result = subprocess.CompletedProcess(self.sign_args, 1, self.secret, stderr + b'\n' + self.secret)
        with patch.object(subprocess, 'run', return_value=fake_result, side_effect=side_effect):
            with contextlib.redirect_stdout(captured), contextlib.redirect_stderr(captured):
                with self.assertRaises(signing.Stop) as caught:
                    signing.tool(runner or signing.official, args or self.sign_args, stage, self.secret)
        self.assertEqual(caught.exception.args, (expected,))
        self.assertIsNone(caught.exception.__cause__)
        self.assertIsNone(caught.exception.__context__)
        self.assertNotIn(self.secret.decode(), repr(caught.exception))
        self.assertEqual(captured.getvalue(), '')

    def test_store_provider_rejection_takes_priority_over_key_exception(self):
        self.assert_safe_error('SIGN_STORE_PASSWORD_REJECTED', stderr=(
            b'java.io.IOException: keystore password was incorrect\n'
            b'Caused by: java.security.UnrecoverableKeyException: failed to decrypt safe contents'))

    def test_key_provider_rejection_is_distinct(self):
        self.assert_safe_error('SIGN_KEY_PASSWORD_REJECTED', stderr=(
            b'Caused by: java.security.UnrecoverableKeyException: Cannot recover key'))

    def test_generic_wrong_password_hint_does_not_claim_password_error(self):
        self.assert_safe_error('SIGN_TOOL_UNKNOWN', stderr=b'Failed to obtain key with alias "fixture". Wrong password?')

    def test_alias_without_key_is_distinct(self):
        self.assert_safe_error('SIGN_ALIAS_MISSING', stderr=b'java.security.KeyStoreException: Keystore entry "fixture" does not contain a key')

    def test_rejected_options_are_distinct(self):
        self.assert_safe_error('SIGN_OPTIONS_REJECTED', stderr=b'Unsupported option: --fixture. See --help for supported options.')

    def test_missing_algorithm_or_provider_is_distinct(self):
        self.assert_safe_error('SIGN_KEYSTORE_FORMAT_OR_PROVIDER', stderr=b'Caused by: java.security.NoSuchAlgorithmException: fixture algorithm')

    def test_file_access_error_is_distinct(self):
        self.assert_safe_error('SIGN_FILE_ACCESS_OR_IO', stderr=b'java.nio.file.AccessDeniedException: fake-private-input')

    def test_closed_stdin_is_not_reported_as_bad_password(self):
        self.assert_safe_error('SIGN_STDIN_CLOSED', stderr=b'java.io.IOException: Failed to read password: standard input closed')

    def test_unknown_stderr_does_not_escape(self):
        self.assert_safe_error('SIGN_TOOL_UNKNOWN', stderr=b'Unrecognized synthetic tool failure')

    def test_timeout_never_retains_raw_exception_context(self):
        self.assert_safe_error('SIGN_TOOL_TIMEOUT', side_effect=subprocess.TimeoutExpired(
            self.sign_args, 120, output=self.secret, stderr=self.secret))

    def test_process_start_exception_is_redacted(self):
        self.assert_safe_error('SIGN_PROCESS_START_FAILED', side_effect=PermissionError(self.secret.decode()))

    def test_verify_stage_does_not_interpret_signing_stderr(self):
        self.assert_safe_error('SIGNED_VERIFY_FAILED', stderr=b'java.io.IOException: keystore password was incorrect',
                               args=['fake-java', '-jar', 'apksigner.jar', 'verify'], stage='SIGNED_VERIFY_FAILED')

    def test_generic_runner_exception_is_not_retained(self):
        def fail(_args, _payload):
            raise RuntimeError(self.secret.decode())
        self.assert_safe_error('SIGN_FAILED', runner=fail)

    def test_unapproved_diagnostic_category_is_not_propagated(self):
        def fail(_args, _payload):
            error = signing.SignToolFailure(self.secret.decode())
            self.assertEqual(error.args, ('SIGN_TOOL_UNKNOWN',))
            error.args = (self.secret.decode(),)
            raise error
        self.assert_safe_error('SIGN_TOOL_UNKNOWN', runner=fail)

    def test_allowlisted_sign_exception_cannot_cross_other_stage(self):
        def fail(_args, _payload):
            raise signing.SignToolFailure('SIGN_ALIAS_MISSING')
        self.assert_safe_error('V28_SIGNATURE_INVALID', stage='V28_SIGNATURE_INVALID', runner=fail)

    def test_successful_sign_does_not_return_tool_output(self):
        with patch.object(subprocess, 'run', return_value=subprocess.CompletedProcess(
                self.sign_args, 0, self.secret, self.secret)):
            self.assertEqual(signing.official(self.sign_args, self.secret), '')


if __name__ == '__main__':
    unittest.main()
