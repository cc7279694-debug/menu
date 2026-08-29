import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const IMPORT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.createServerSupabaseClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  attachRecipeImportImagesAction,
  createRecipeImportAction,
  discardRecipeImportAction,
} from "@/features/recipe-imports/actions";

function builder(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const promise = Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
  const value: Record<string, unknown> = {
    select: vi.fn(() => value), eq: vi.fn(() => value), in: vi.fn(() => value), lt: vi.fn(() => value), neq: vi.fn(() => value),
    insert: vi.fn(() => value), update: vi.fn(() => value), delete: vi.fn(() => value), upsert: vi.fn(() => value),
    single: vi.fn(() => promise), maybeSingle: vi.fn(() => promise), then: promise.then.bind(promise), catch: promise.catch.bind(promise), finally: promise.finally.bind(promise),
  };
  return value;
}

function supabase(user: { id: string } | null = { id: USER_ID }) {
  const jobs = builder({ data: { id: IMPORT_ID, user_id: USER_ID, image_paths: [] }, error: null });
  const storageBucket = { remove: vi.fn().mockResolvedValue({ data: [], error: null }) };
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(() => jobs),
    storage: { from: vi.fn(() => storageBucket) },
    jobs,
    storageBucket,
  };
}

describe("recipe import lifecycle actions", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("requires authentication before creating an import", async () => {
    const client = supabase(null);
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    await expect(createRecipeImportAction({ sourceType: "url", sourceUrl: "https://example.com/r" })).resolves.toEqual({ ok: false, message: "请先登录后再导入菜谱" });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("creates a URL job and returns an owned upload folder", async () => {
    const client = supabase();
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    const result = await createRecipeImportAction({ sourceType: "url", sourceUrl: "https://example.com/r" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.uploadFolder).toMatch(new RegExp(`^${USER_ID}/[0-9a-f-]+$`));
    expect(client.jobs.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: USER_ID, source_type: "url", source_url: "https://example.com/r", status: "queued" }));
  });

  it("rejects image paths outside the job owner folder", async () => {
    const client = supabase();
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    await expect(attachRecipeImportImagesAction({ importId: IMPORT_ID, imagePaths: [`${USER_ID}/other/asset.webp`] })).resolves.toEqual({ ok: false, message: "图片路径无效" });
    expect(client.jobs.update).not.toHaveBeenCalled();
  });

  it("discards owned temporary objects before deleting the job", async () => {
    const client = supabase();
    client.jobs = builder({ data: { id: IMPORT_ID, user_id: USER_ID, image_paths: [`${USER_ID}/${IMPORT_ID}/a.webp`] }, error: null });
    client.from.mockImplementation(() => client.jobs);
    mocks.createServerSupabaseClient.mockResolvedValue(client);
    await expect(discardRecipeImportAction(IMPORT_ID)).resolves.toEqual({ ok: true, data: null });
    const remove = client.storageBucket.remove;
    expect(remove).toHaveBeenCalledWith([`${USER_ID}/${IMPORT_ID}/a.webp`]);
    expect(client.jobs.delete).toHaveBeenCalled();
  });
});
