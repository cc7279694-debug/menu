import { expect, it } from "vitest";
import { DataOperationCoordinator } from "./coordinator";

it("serializes writes, timer purge and exclusive restore without losing later work", async () => {
  const gate = new DataOperationCoordinator();
  const order: string[] = [];
  let release!: () => void;
  const wait = new Promise<void>(r => { release = r; });
  const restore = gate.withExclusive(async () => { order.push("safety"); await wait; order.push("replace"); });
  const save = gate.withDataAccess(async () => { order.push("save"); });
  const purge = gate.withDataAccess(async () => { order.push("purge"); });
  await Promise.resolve();
  expect(order).toEqual(["safety"]);
  release(); await Promise.all([restore, save, purge]);
  expect(order).toEqual(["safety", "replace", "save", "purge"]);
});
it("releases the gate even when the current operation fails", async () => {
  const gate = new DataOperationCoordinator();
  await expect(gate.withExclusive(async () => { throw new Error("IO"); })).rejects.toThrow("IO");
  expect(await gate.withDataAccess(async () => 42)).toBe(42);
});
