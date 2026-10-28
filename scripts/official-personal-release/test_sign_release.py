import importlib.util
import pathlib
import tempfile
import unittest
from unittest import mock

MODULE_PATH = pathlib.Path(__file__).with_name('sign_release.py')
spec = importlib.util.spec_from_file_location('personal_release', MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SigningSafetyTests(unittest.TestCase):
    def test_existing_target_stops_without_modifying_it(self):
        with tempfile.TemporaryDirectory() as root:
            target = pathlib.Path(root, 'identity')
            target.mkdir()
            marker = target / 'existing.txt'
            marker.write_text('preserve', encoding='utf-8')
            with self.assertRaises(module.SigningError):
                module.ensure_new_targets([target, pathlib.Path(root, 'backup')])
            self.assertEqual(marker.read_text(encoding='utf-8'), 'preserve')
            self.assertFalse(pathlib.Path(root, 'backup').exists())

    def test_password_rules_and_command_arguments_never_embed_secret(self):
        secret = 'Test-Only-Password-2026'
        self.assertTrue(module.password_is_valid(secret))
        for bad in ('short', 'has space but too short', '密码密码密码密码密码密码', 'x' * 200):
            self.assertFalse(module.password_is_valid(bad))
        args = module.keytool_generate_args('keytool', pathlib.Path('key.p12'))
        self.assertNotIn(secret, ' '.join(map(str, args)))
        self.assertIn('-storepass:env', args)
        self.assertIn('-keypass:env', args)

    def test_restore_roundtrip_requires_identical_bytes(self):
        self.assertTrue(module.backup_matches(b'synthetic-keystore-bytes', b'synthetic-keystore-bytes'))
        self.assertFalse(module.backup_matches(b'synthetic-keystore-bytes', b'tampered'))

    def test_certificate_mismatch_is_rejected(self):
        fp = 'A' * 64
        self.assertEqual(module.normalized_fingerprint(fp), fp.lower())
        with self.assertRaises(module.SigningError):
            module.ensure_new_certificate(fp, fp)
        with self.assertRaises(module.SigningError):
            module.normalized_fingerprint('invalid')

    def test_final_apk_wrong_package_and_debuggable_are_rejected(self):
        with mock.patch.object(module, 'run', return_value=b"package: name='wrong.package' versionCode='27' versionName='0.11.0-personal.2'"):
            with self.assertRaises(module.SigningError):
                module.verify_apk_metadata(pathlib.Path('candidate.apk'))

    def test_changed_input_stops_before_key_generation(self):
        with tempfile.TemporaryDirectory(prefix='recipio-input-test-') as root:
            root = pathlib.Path(root)
            changed = root / 'changed.apk'
            changed.write_bytes(b'synthetic-changed-apk')
            with mock.patch.multiple(module, ROOT=root, IDENTITY=root / 'identity',
                                     BACKUP=root / 'backup', DELIVERY=root / 'delivery',
                                     UNSIGNED=changed), mock.patch.object(module, 'check_private_directory'), \
                 mock.patch.object(module, 'run', side_effect=module.SigningError('UNEXPECTED_TOOL_CALL')) as runner:
                with self.assertRaises(module.SigningError):
                    module.create_release('Synthetic-Only-2026!')
                self.assertEqual(runner.call_count, 0)
        with mock.patch.object(module, 'run', side_effect=[b"package: name='app.recipio.local' versionCode='27' versionName='0.11.0-personal.2'", b'android:debuggable']):
            with self.assertRaises(module.SigningError):
                module.verify_apk_metadata(pathlib.Path('candidate.apk'))

    @unittest.skipUnless(module.sys.platform == 'win32', 'Windows Android tools required')
    def test_official_tools_sign_and_restore_synthetic_identity(self):
        # This disposable identity and password are synthetic; no user key is read.
        with tempfile.TemporaryDirectory(prefix='recipio-sign-test-') as root:
            root = pathlib.Path(root)
            with mock.patch.multiple(module, ROOT=root, IDENTITY=root / 'identity',
                                     BACKUP=root / 'backup', DELIVERY=root / 'delivery'), \
                 mock.patch.object(module, 'check_private_directory'):
                module.preflight()
                result = module.create_release('Synthetic-Only-2026!')
                self.assertEqual(result['package'], 'app.recipio.local')
                self.assertTrue(result['encryptedBackupVerified'])
                self.assertTrue(pathlib.Path(result['apk']).is_file())
                with self.assertRaises(module.SigningError):
                    module.preflight()
                with self.assertRaises(module.SigningError):
                    module.run([str(module.SEVEN_ZIP), 'x', '-so', result['backupArchive']],
                               'BAD_PASSWORD', stdin=b'Wrong-Synthetic-Password\n')

if __name__ == '__main__':
    unittest.main()
