export function normalizeRegulatoryTitle(title: string): string {
  return title.replace(/\s*[–-]\s*\[Title Not Specified\]\s*$/i, '').trim()
}
