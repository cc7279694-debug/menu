type SignedUrlResult = {
  path: string | null;
  signedUrl: string | null;
};

type SignedUrlStorage = {
  createSignedUrls: (
    paths: string[],
    expiresIn: number,
  ) => Promise<{ data: SignedUrlResult[] | null; error: unknown }>;
};

export async function createSignedImageUrlMap(
  storage: SignedUrlStorage,
  paths: string[],
): Promise<Record<string, string | null>> {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const result: Record<string, string | null> = Object.fromEntries(
    uniquePaths.map((path) => [path, null]),
  );

  if (uniquePaths.length === 0) {
    return result;
  }

  const { data, error } = await storage.createSignedUrls(uniquePaths, 3600);
  if (error || !data) {
    return result;
  }

  for (const item of data) {
    if (item.path && Object.hasOwn(result, item.path)) {
      result[item.path] = item.signedUrl || null;
    }
  }

  return result;
}
