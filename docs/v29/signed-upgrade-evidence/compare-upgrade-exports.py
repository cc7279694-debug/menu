"""Read-only comparison of actual UI exports; writes only a public JSON receipt."""
import datetime
import argparse
import hashlib
import json
from pathlib import Path
import sys
import zipfile

BASE = Path(__file__).resolve().parent
COLLECTIONS = ('recipes', 'ingredients', 'steps', 'preparations', 'keyTips', 'changes', 'cookingRecords')
ALLOWED_MANIFEST_CHANGES = {'createdAt', 'appVersionCode', 'appVersionName'}


def sha(payload):
    return hashlib.sha256(payload).hexdigest()


def strict_differences(before, after, path='$'):
    if type(before) is not type(after):
        return [{'path': path, 'reason': 'type_changed'}]
    if isinstance(before, dict):
        result = []
        for key in sorted(set(before) | set(after)):
            if key not in before or key not in after:
                result.append({'path': path + '.' + key, 'reason': 'key_added_or_removed'})
            else:
                result.extend(strict_differences(before[key], after[key], path + '.' + key))
        return result
    if isinstance(before, list):
        if len(before) != len(after):
            return [{'path': path, 'reason': 'array_length_changed'}]
        return [item for i, (left, right) in enumerate(zip(before, after))
                for item in strict_differences(left, right, f'{path}[{i}]')]
    return [] if before == after else [{'path': path, 'reason': 'value_changed'}]


def read_export(path):
    archive = path.read_bytes()
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        if len(names) != len(set(names)):
            raise ValueError('duplicate_zip_entry')
        if z.testzip() is not None:
            raise ValueError('zip_crc_failure')
        files = {name: z.read(name) for name in names}
    manifest = json.loads(files['manifest.json'])
    data = json.loads(files['data.json'])
    if manifest['format'] != 'recipio-backup' or manifest['formatVersion'] != 2 or manifest['databaseSchemaVersion'] != 4:
        raise ValueError('wrong_backup_contract')
    raw_data = files['data.json']
    if manifest['dataFile'] != {'path': 'data.json', 'size': len(raw_data), 'sha256': sha(raw_data)}:
        raise ValueError('data_size_or_hash_mismatch')
    media = manifest['media']
    expected_names = {'manifest.json', 'data.json'} | {entry['path'] for entry in media}
    if set(files) != expected_names or len(media) != len({entry['assetId'] for entry in media}):
        raise ValueError('unexpected_archive_entries_or_duplicate_media')
    counts = {name: len(data[name]) for name in COLLECTIONS}
    counts['media'] = len(media)
    if manifest['counts'] != counts:
        raise ValueError('manifest_counts_mismatch')
    for entry in media:
        payload = files[entry['path']]
        if len(payload) != entry['size'] or sha(payload) != entry['sha256'] or entry['assetId'] != entry['sha256']:
            raise ValueError('media_size_or_hash_mismatch')
    return {'path': str(path), 'bytes': len(archive), 'sha256': sha(archive), 'manifest': manifest,
            'data': data, 'files': files, 'counts': counts}


def main():
    before = read_export(BASE / 'before-v28.recipio')
    after = read_export(BASE / 'after-v29.recipio')
    blockers = strict_differences(before['data'], after['data'])
    if (before['manifest']['appVersionCode'], before['manifest']['appVersionName']) != (28, '0.11.1-personal.1'):
        blockers.append({'path': 'before.manifest', 'reason': 'unexpected_before_app_version'})
    if (after['manifest']['appVersionCode'], after['manifest']['appVersionName']) != (29, '0.11.2-personal.1'):
        blockers.append({'path': 'after.manifest', 'reason': 'unexpected_after_app_version'})
    bm = {key: value for key, value in before['manifest'].items() if key not in ALLOWED_MANIFEST_CHANGES}
    am = {key: value for key, value in after['manifest'].items() if key not in ALLOWED_MANIFEST_CHANGES}
    blockers.extend(strict_differences(bm, am, '$.manifest_except_allowed_metadata'))
    for item in (before, after):
        stamp = item['manifest']['createdAt']
        parsed = datetime.datetime.fromisoformat(stamp.replace('Z', '+00:00'))
        if not stamp.endswith('Z') or parsed.utcoffset() != datetime.timedelta(0):
            blockers.append({'path': 'manifest.createdAt', 'reason': 'export_timestamp_not_utc'})
    if set(before['files']) != set(after['files']):
        blockers.append({'path': 'zip.entries', 'reason': 'entry_set_changed'})
    media_checks = []
    for entry in before['manifest']['media']:
        path = entry['path']
        left = before['files'][path]
        right = after['files'].get(path, b'')
        equal = left == right
        media_checks.append({'assetId': entry['assetId'], 'path': path,
                             'beforeBytes': len(left), 'afterBytes': len(right),
                             'beforeSha256': sha(left), 'afterSha256': sha(right),
                             'actualBytesExactlyEqual': equal})
        if not equal:
            blockers.append({'path': path, 'reason': 'actual_media_bytes_changed'})
    canonical = json.dumps(before['data'], sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    result = {
        'status': 'PASS_SAME_KEY_UPGRADE_PORTABLE_CONTENT' if not blockers else 'BLOCKED_CONTENT_DIFFERENCE',
        'checkedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'before': {key: before[key] for key in ('path', 'bytes', 'sha256', 'counts')},
        'after': {key: after[key] for key in ('path', 'bytes', 'sha256', 'counts')},
        'actualUiExportInputsNotSeedArchives': True,
        'zipCrcAndDuplicateChecks': 'PASS',
        'allSevenCollectionsStrictFieldTypeValueAndArrayOrderEqual': not strict_differences(before['data'], after['data']),
        'collectionChecks': {key: {'count': before['counts'][key], 'allIdsUtcTimesPositionsAndValuesEqual': not strict_differences(before['data'][key], after['data'][key])} for key in COLLECTIONS},
        'settingsEqual': not strict_differences(before['data'].get('settings'), after['data'].get('settings')),
        'canonicalDataSha256': sha(canonical),
        'rawDataBytesExactlyEqual': before['files']['data.json'] == after['files']['data.json'],
        'manifestCountsSchemaDataFileAndMediaEqual': not strict_differences(bm, am),
        'allowedManifestChanges': {key: {'before': before['manifest'][key], 'after': after['manifest'][key]} for key in sorted(ALLOWED_MANIFEST_CHANGES)},
        'mediaChecks': media_checks,
        'blockers': blockers,
        'limits': {
            'rawSqliteFileAndPrivatePhysicalPaths': 'NOT_CHECKED',
            'theme': 'OUTSIDE_BACKUP_V2; separate controlled UI and cold-start evidence required',
            'installAndSourceOfExports': 'Recorded by root actual Android UI/installation evidence, not inferred solely from ZIP bytes',
            'deviceOemTalkBackImeRealPersonalData': 'NOT_CHECKED_BY_THIS_COMPARISON'
        },
        'actions': {'adbCalls': 0, 'signingCalls': 0, 'realAiCalls': 0, 'productSourceChanges': 0}
    }
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--receipt', type=Path, default=BASE / 'upgrade-content-recheck.json',
                        help='Fresh output path; existing evidence is never overwritten')
    receipt = parser.parse_args().receipt
    with receipt.open('x', encoding='utf-8', newline='\n') as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
        handle.write('\n')
    print(json.dumps({'status': result['status'], 'receipt': str(receipt), 'before': result['before'],
                      'after': result['after'], 'rawDataBytesExactlyEqual': result['rawDataBytesExactlyEqual'],
                      'manifestChanges': result['allowedManifestChanges'], 'blockers': blockers}, ensure_ascii=True))
    return 1 if blockers else 0


if __name__ == '__main__':
    raise SystemExit(main())
