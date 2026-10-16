import { key } from './normalize';
import { categoryById, type CategoryRule, type Rules } from './rules';
import type { CategoryMatch } from './types';

export interface RouteResult extends CategoryMatch {
  rule?: CategoryRule;
}

/**
 * Bước S5 Category routing: keyword sớm nhất trong tên -> cột danh mục -> tiền tố MHH -> Unknown.
 * Cột "Danh mục cấp 1" của file SAP hay sai (ổ cứng nằm trong "Laptop"), nên chỉ dùng khi tên không có keyword.
 */
export function routeCategory(text: string, mhh: string, categoryColumn: string, rules: Rules): RouteResult {
  const k = key(text);
  let best: { cat: CategoryRule; index: number; length: number } | undefined;
  for (const { cat, res } of rules.compiled.categoryPatterns) {
    for (const re of res) {
      const m = re.exec(k);
      if (!m) continue;
      if (!best || m.index < best.index || (m.index === best.index && m[0].length > best.length)) {
        best = { cat, index: m.index, length: m[0].length };
      }
    }
  }
  if (best) {
    let cat = best.cat;
    for (const p of rules.compiled.promote.get(cat.id) ?? []) {
      if (p.when.test(k)) {
        cat = categoryById(rules, p.to) ?? cat;
        break;
      }
    }
    // keyword ở quá xa đầu tên -> độ tin cậy vừa
    const confidence = best.index <= 12 ? 'high' : 'medium';
    return { id: cat.id, label: cat.label, confidence, source: 'keyword', rule: cat };
  }

  const col = (categoryColumn || '').trim();
  if (col) {
    const byCol = rules.categories.find((c) => c.column?.some((x) => x.toLowerCase() === col.toLowerCase()));
    if (byCol) return { id: byCol.id, label: byCol.label, confidence: 'medium', source: 'category-column', rule: byCol };
  }

  const prefix = mhh.toUpperCase().slice(0, 2);
  const byPrefix = rules.categories.find((c) => c.mhh.includes(prefix));
  if (byPrefix) return { id: byPrefix.id, label: byPrefix.label, confidence: 'low', source: 'mhh-prefix', rule: byPrefix };

  return { id: 'unknown', label: 'Chưa xác định', confidence: 'low', source: 'unknown' };
}
