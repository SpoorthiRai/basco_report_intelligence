export function isAllFilter(value?: string | null, ...labels: string[]): boolean {
  const text = String(value ?? '').trim();
  if (!text) return true;
  const lowered = text.toLowerCase();
  if (lowered === 'all') return true;
  return labels.some((label) => String(label).trim().toLowerCase() === lowered);
}

export function pickValidOption(value: string, options: string[], fallback: string): string {
  if (options.includes(value)) return value;
  return options.includes(fallback) ? fallback : options[0] || fallback;
}

export function filtersAreActive(values: Array<string | undefined | null>, allLabels: string[]): boolean {
  return values.some((value) => !isAllFilter(value, ...allLabels));
}
