const SEARCH_LOCALE = 'hu-HU';
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Normalizes search text for case- and accent-insensitive matching. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLocaleLowerCase(SEARCH_LOCALE);
}

export function matchesSearch(value: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query.trim());
  return normalizedQuery.length === 0 || normalizeSearchText(value).includes(normalizedQuery);
}
