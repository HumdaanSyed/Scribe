function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'meeting';
}

/** `{date}_{slugified-title}.pdf`, e.g. `2026-09-11_product-sync.pdf` (PLAN.md section 10). */
export function exportFilename(title: string, createdAt: number): string {
  const date = new Date(createdAt).toISOString().slice(0, 10);
  return `${date}_${slugify(title)}.pdf`;
}
