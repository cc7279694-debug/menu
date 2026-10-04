# Backup Format v2

APK-3 writes formatVersion 2 / databaseSchemaVersion 4. The bounded `.recipio` ZIP, strict manifest/data JSON, media hash addressing, limits and validated staging/safety-copy/atomic Replace protocol inherit v1 unchanged.

Seven required business arrays: recipes, ingredients, steps, preparations, keyTips, changes, cookingRecords. `settings` remains an empty strict object. Manifest `counts` includes every array and media.

Each cooking record has required fields: `id`, `recipeId`, `cookedAt` (exact UTC milliseconds), `finishedPhotoAssetId`, `evaluation`, `note`. Last three may be null. Evaluation is `tasty | okay | adjust_next_time`; note maximum 2,000 characters. At most 100,000 records. IDs are unique, parent recipe must exist. Image closure includes current images, both change snapshots and finished photos; a shared image is one SHA-256 asset/file.

Unknown/missing fields, versions, wrong counts, invalid relationships and image closure reject before current data is modified. Container/media byte SHA-256 and sizes are independently checked by Android; TypeScript validates the complete formal data model.

## Compatibility

Frozen v1 remains format1/schema3, with all original required fields including `changes`. It is validated using the unchanged v1 validator before adding only `cookingRecords: []` internally. No existing field or original manifest/hash is rewritten. The original input SHA-256 remains the journal and database commit identity. A v1 Replace clears cooking records only after user confirmation and a complete v2 safety copy.

All new external exports and private pre-restore safety copies use v2. Older APK-2 readers cannot import v2. This is a forward format change, not a silent redefinition of v1.

## Media and atomicity

Normal export captures and pins the full image closure before releasing the short database gate. Pins stay through write/readback and release in finally. Concurrent deletion cannot unlink pinned media. Cleanup only removes proven unreferenced candidates; ambiguous/failed cleanup retains files or reports a warning.

Restore preserves immutable old media while staging new media. All seven tables and restore metadata replace in one SQLite transaction. Failed insertion rolls back all data; uncertain acknowledgments reconcile using original input hash and actual commit metadata. Startup cleanup independently checks cooking-only references, including soft-deleted recipes awaiting Undo.

## Verification status

Implementation and focused tests are in progress. Final full-suite and Android acceptance evidence belongs in the APK-3 checkpoint; this specification is not a completion claim.
