// Matching for the pickers where a list is filtered as the user types.

/** Lower case, without accents and with single spaces: "  Kyōto  Station" → "kyoto station". */
export function normalizeForSearch(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export type SearchOption = { id: string; label: string; detail?: string | null };

/** The options matching the query: those starting with it first, then those containing it (also in `detail`). */
export function filterOptions<T extends SearchOption>(options: T[], query: string): T[] {
  const needle = normalizeForSearch(query);
  if (!needle) return options;
  const starts: T[] = [];
  const contains: T[] = [];
  for (const option of options) {
    const label = normalizeForSearch(option.label);
    if (label.startsWith(needle)) starts.push(option);
    else if (label.includes(needle) || normalizeForSearch(option.detail ?? "").includes(needle)) contains.push(option);
  }
  return [...starts, ...contains];
}

/** The option named exactly as the query (ignoring case, accents and spaces), if any. */
export function findExactOption<T extends SearchOption>(options: T[], query: string): T | undefined {
  const needle = normalizeForSearch(query);
  return needle ? options.find((option) => normalizeForSearch(option.label) === needle) : undefined;
}
