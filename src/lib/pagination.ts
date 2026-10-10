export const DATABASE_PAGE_SIZE = 1000;
export const DATABASE_MAX_PAGES = 200;

type QueryResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

/**
 * Fetch every PostgREST page instead of silently stopping at the project's
 * API max rows setting (commonly 1,000 rows).
 */
export async function fetchAllRows<T>(
  queryPage: (from: number, to: number) => PromiseLike<QueryResult<T>>,
  pageSize = DATABASE_PAGE_SIZE,
): Promise<QueryResult<T>> {
  const rows: T[] = [];

  for (let page = 0; page < DATABASE_MAX_PAGES; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const result = await queryPage(from, to);

    if (result.error) {
      return { data: rows, error: result.error };
    }

    const pageRows = (result.data ?? []) as T[];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      return { data: rows, error: null };
    }
  }

  return {
    data: rows,
    error: { message: `Pengambilan data melebihi ${DATABASE_MAX_PAGES * pageSize} baris.` },
  };
}
