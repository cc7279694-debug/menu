import { openBackupRepository } from "../sqlite";
import { createNativeArchive } from "./native-archive";
import { reconcileRestore } from "./restore-recovery";
import { BackupService } from "./service";
let opening: Promise<BackupService> | null = null;
/** Lives outside React pages; remounting must not re-run a restore. */
export function openBackupService(): Promise<BackupService> {
  if (!opening) opening = (async () => {
    const repository = await openBackupRepository();
    const archive = createNativeArchive();
    await reconcileRestore(repository, archive);
    return new BackupService(repository, archive);
  })().catch(error => { opening = null; throw error; });
  return opening;
}
