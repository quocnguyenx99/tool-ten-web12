import brandsJson from '../../rules/brands.json';
import categoriesJson from '../../rules/categories.json';
import casingJson from '../../rules/casing.json';
import { key } from './normalize';

export interface BrandRule {
  name: string;
  aliases: string[];
  implied?: string[];
  mhh?: string[];
}

export interface CategoryRule {
  id: string;
  label: string;
  renderer: string;
  formula: boolean;
  labelFromName?: boolean;
  kw: string[];
  mhh: string[];
  column?: string[];
  promote?: { to: string; when: string }[];
}

export interface Rules {
  brands: BrandRule[];
  categories: CategoryRule[];
  casingWords: Record<string, string>;
  keepUpper: Set<string>;
  /** Regex đã biên dịch, dùng lại cho mọi dòng. */
  compiled: {
    brandPatterns: { brand: BrandRule; re: RegExp; implied: boolean }[];
    categoryPatterns: { cat: CategoryRule; res: RegExp[] }[];
    promote: Map<string, { to: string; when: RegExp }[]>;
  };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Regex khớp nguyên từ trên chuỗi key (IN HOA không dấu). */
export function wordRe(alias: string): RegExp {
  return new RegExp(`(^|[^A-Z0-9])(${escapeRe(key(alias))})(?=$|[^A-Z0-9])`);
}

let cache: Rules | null = null;

export function loadRules(): Rules {
  if (cache) return cache;
  const brands = (brandsJson as unknown as { brands: BrandRule[] }).brands;
  const categories = (categoriesJson as unknown as { categories: CategoryRule[] }).categories;
  const casing = casingJson as unknown as { words: Record<string, string>; keepUpper: string[] };

  const brandPatterns: Rules['compiled']['brandPatterns'] = [];
  for (const b of brands) {
    for (const a of b.aliases) brandPatterns.push({ brand: b, re: wordRe(a), implied: false });
    for (const a of b.implied ?? []) brandPatterns.push({ brand: b, re: wordRe(a), implied: true });
  }
  const categoryPatterns = categories.map((cat) => ({ cat, res: cat.kw.map((k) => new RegExp(k)) }));
  const promote = new Map<string, { to: string; when: RegExp }[]>();
  for (const c of categories) {
    if (c.promote) promote.set(c.id, c.promote.map((p) => ({ to: p.to, when: new RegExp(p.when) })));
  }

  const rules: Rules = {
    brands,
    categories,
    casingWords: casing.words,
    keepUpper: new Set<string>(casing.keepUpper),
    compiled: { brandPatterns, categoryPatterns, promote },
  };
  cache = rules;
  return rules;
}

export function categoryById(rules: Rules, id: string): CategoryRule | undefined {
  return rules.categories.find((c) => c.id === id);
}
