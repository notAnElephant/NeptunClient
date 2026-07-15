export function normalizeMessageLink(value: string): string | null {
  const link = value.trim();
  if (/^https?:\/\//i.test(link) || /^mailto:/i.test(link)) return link;
  if (link.startsWith('//')) return `https:${link}`;
  return null;
}
