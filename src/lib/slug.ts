export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uniqueSlug(base: string, suffix?: string): string {
  const slugBase = slugify(base);
  if (!suffix) return slugBase;
  return `${slugBase}-${suffix}`;
}
