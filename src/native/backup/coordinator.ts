/** One FIFO gate for the native library, including its deletion timer. */
export class DataOperationCoordinator {
  private tail: Promise<void> = Promise.resolve();
  withDataAccess<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(work);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
  withExclusive<T>(work: () => Promise<T>): Promise<T> {
    return this.withDataAccess(work);
  }
}
export const libraryDataCoordinator = new DataOperationCoordinator();
