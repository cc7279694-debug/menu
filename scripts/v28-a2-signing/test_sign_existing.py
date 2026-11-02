import contextlib
import hashlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.find_spec('sign_existing')
signing = None
if spec:
    signing = __import__('sign_existing')


class SameIdentitySigningTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(signing, 'The existing-identity-only helper is not implemented')
        self.temp = tempfile.TemporaryDirectory(prefix='recipio-v28-fake-tools-')
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        source = root / 'unsigned.fixture'
        with zipfile.ZipFile(source, 'w') as z:
            z.writestr('assets/public/index.html', 'GENERATED TEST; NOT AN APK')
        self.key = root / 'existing-keystore.fixture'
        self.key.write_text('NOT A KEY; fake tool tests only')
        self.cfg = signing.Inputs(source, root / 'v27.fixture', self.key, root / 'delivery',
                                  root / 'staging', root / 'java.fixture', root / 'sdk',
                                  hashlib.sha256(source.read_bytes()).hexdigest(), 'a' * 64)
        self.password = 'SYNTHETIC_TEST_PASSWORD_ONLY'
        self.calls = []
        self.wrong_cert = False
        self.changed_payload = False
        self.sign_error = False
        self.identity_error = False

    def fake_tool(self, args, payload=None):
        self.calls.append((args, payload))
        if 'badging' in args:
            code = '99' if self.identity_error else '28'
            return f"package: name='app.recipio.local' versionCode='{code}' versionName='0.11.1-personal.1' "
        if 'sign' in args:
            if self.sign_error:
                raise RuntimeError('tool output ' + self.password)
            out = Path(args[args.index('--out') + 1])
            with zipfile.ZipFile(self.cfg.unsigned) as original, zipfile.ZipFile(out, 'w') as signed:
                for name in original.namelist():
                    signed.writestr(name, b'WRONG' if self.changed_payload else original.read(name))
                signed.writestr('META-INF/FAKE.SF', 'NOT A SIGNATURE')
            return ''
        if 'verify' in args:
            return 'Signer #1 certificate SHA-256 digest: ' + ('b' * 64 if self.wrong_cert else self.cfg.cert)
        return ''

    def run_sign(self):
        return signing.sign_existing(self.cfg, self.password, self.fake_tool)

    def test_success_publishes_one_candidate_and_public_receipt_with_unchanged_input(self):
        before = self.key.read_bytes()
        result = self.run_sign()
        self.assertTrue((self.cfg.output / 'recipio-personal-v28.apk').exists())
        self.assertEqual(result['certificateSha256'], 'a' * 64)
        self.assertEqual(self.key.read_bytes(), before)
        self.assertTrue((self.cfg.output / 'OWNER_RESULT.json').exists())

    def test_password_is_only_in_child_stdin_and_never_persisted(self):
        self.run_sign()
        call = next(item for item in self.calls if 'sign' in item[0])
        self.assertNotIn(self.password, ' '.join(call[0]))
        self.assertEqual(call[1], (self.password + '\n' + self.password + '\n').encode())
        self.assertIn('stdin', call[0])
        for file in self.cfg.output.rglob('*'):
            if file.is_file():
                self.assertNotIn(self.password.encode(), file.read_bytes())

    def test_changed_unsigned_stops_before_signing(self):
        self.cfg.unsigned.write_bytes(b'CHANGED')
        with self.assertRaisesRegex(signing.Stop, 'UNSIGNED_HASH_MISMATCH'):
            self.run_sign()
        self.assertFalse(any('sign' in args for args, _ in self.calls))

    def test_existing_delivery_is_preserved(self):
        self.cfg.output.mkdir()
        sentinel = self.cfg.output / 'keep.txt'
        sentinel.write_text('KEEP')
        with self.assertRaisesRegex(signing.Stop, 'OUTPUT_EXISTS'):
            self.run_sign()
        self.assertEqual(sentinel.read_text(), 'KEEP')
        self.assertFalse(self.calls)

    def test_wrong_certificate_never_publishes(self):
        self.wrong_cert = True
        with self.assertRaisesRegex(signing.Stop, 'CERTIFICATE_MISMATCH'):
            self.run_sign()
        self.assertFalse(self.cfg.output.exists())

    def test_wrong_version_stops_before_signing(self):
        self.identity_error = True
        with self.assertRaisesRegex(signing.Stop, 'APK_IDENTITY_MISMATCH'):
            self.run_sign()
        self.assertFalse(any('sign' in args for args, _ in self.calls))

    def test_changed_payload_never_publishes(self):
        self.changed_payload = True
        with self.assertRaisesRegex(signing.Stop, 'APK_PAYLOAD_CHANGED'):
            self.run_sign()
        self.assertFalse(self.cfg.output.exists())

    def test_tool_failure_cannot_expose_password_in_error_or_output(self):
        self.sign_error = True
        capture = io.StringIO()
        with contextlib.redirect_stdout(capture), contextlib.redirect_stderr(capture):
            with self.assertRaises(signing.Stop) as caught:
                self.run_sign()
        self.assertEqual(str(caught.exception), 'SIGN_FAILED')
        self.assertNotIn(self.password, capture.getvalue())
        self.assertFalse(self.cfg.output.exists())

    def test_newline_password_stops_without_tool_calls(self):
        self.password = 'bad\ninput'
        with self.assertRaisesRegex(signing.Stop, 'PASSWORD_TRANSPORT_INVALID'):
            self.run_sign()
        self.assertFalse(self.calls)


if __name__ == '__main__':
    unittest.main()
