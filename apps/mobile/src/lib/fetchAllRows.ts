// PostgREST caps every response at the project's max-rows (1000 on hosted
// Supabase) without signalling truncation, so an unpaged list of a growing
// table silently loses its oldest rows. Fetch page by page until a short
// page arrives. `fetchPage` must build a fresh query per call with a total
// ordering (a unique tie-breaker column) so pages neither overlap nor skip.
const PAGE_SIZE = 1000;

export async function fetchAllRows<TRow>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: TRow[] | null; error: unknown }>
) {
  const rows: TRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}
