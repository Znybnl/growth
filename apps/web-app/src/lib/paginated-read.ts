// Counts must not depend on a single PostgREST response's row ceiling.
export async function readAllRows<T>(page: (offset: number, end: number) => PromiseLike<{
  data: T[] | null; error: { message: string } | null; count?: number | null;
}>) {
  const rows: T[] = [];
  let offset = 0;
  for (;;) {
    const result = await page(offset, offset + 499);
    if (result.error) return { data: null, error: result.error };
    const next = result.data ?? [];
    rows.push(...next);
    // An explicit count also supports servers configured below our page size.
    if (!next.length || (result.count != null && rows.length >= result.count) ||
      (result.count == null && next.length < 500)) return { data: rows, error: null };
    offset += next.length;
  }
}
