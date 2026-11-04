// Secondary data (names of guides, zones, agencies…) must not block a screen, but
// its absence must not go unnoticed either: the screen shows IDs or "Unknown"
// instead, and says why.

/** Resolves to `fallback` when `promise` fails and notes `label` in `missing`. */
export function withFallback<T>(promise: Promise<T>, fallback: T, label: string, missing: string[]): Promise<T> {
  return promise.catch(() => {
    if (!missing.includes(label)) missing.push(label);
    return fallback;
  });
}

/** "guides", "guides and zones", "guides, zones and agencies". */
export function describeMissing(labels: string[]) {
  const unique = [...new Set(labels)];
  if (unique.length <= 1) return unique.join("");
  return `${unique.slice(0, -1).join(", ")} and ${unique.at(-1)}`;
}
