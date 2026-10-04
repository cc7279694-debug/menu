import type { ArchivePort } from "./native-archive";
import type { BackupRepository } from "./repository";
import { collectImageReferences } from "./references";
export type RecoveryResult = { recoveredCommit: boolean };
/** No replay and no Replace. SQL facts, not stale phase, authorize native cleanup. */
export async function reconcileRestore(repository: BackupRepository, archive: ArchivePort): Promise<RecoveryResult> {
  return repository.exclusive(async locked => {
    const journal = await archive.readJournal();
    const source = await locked.snapshot();
    const committed = await locked.readRestoreCommit();
    await archive.verifyPaths(collectImageReferences(source));
    const recoveredCommit = !!journal && committed?.operationId === journal.operationId && committed.generationId === journal.generationId && committed.dataSha256 === journal.dataSha256;
    // Native cleanup independently re-reads SQL and full historical references.
    await archive.cleanupOrphans();
    return { recoveredCommit };
  });
}
