import { key } from './normalize';
import { WEB1_MAX } from './render';
import type { QaWarning, Status } from './types';

/** Mô tả ngắn từng mã QA, hiển thị trên giao diện (mục 13 guide). */
export const QA_CODES: Record<string, string> = {
  Q01: 'MHH trống',
  Q02: 'MHH bị thay đổi',
  Q03: 'Trùng MHH trong batch',
  Q04: 'Web 2 cũ là placeholder (6/8/số đơn lẻ)',
  Q05: 'Thiếu Brand/Model bắt buộc',
  Q06: 'Xung đột Model/P-N/OS/bảo hành',
  Q07: 'Web 1 dài hơn 70 ký tự',
  Q08: 'Ký tự rác/MỚI 100%/ALL CAPS đã được làm sạch',
  Q09: 'Có note "Dưới 70 ký tự"/prompt trong nguồn',
  Q10: 'Có thông số không tìm thấy trong nguồn',
  Q11: 'Web 2 sai thứ tự',
  Q12: 'Nhóm hàng chưa chắc chắn / chưa có công thức',
  EDIT: 'Người duyệt đã sửa tay',
};

/**
 * Q10 chống bịa: mọi con số trong Web 1/Web 2 mới phải xuất hiện trong nguồn.
 * `allowed` là các giá trị engine tự quy đổi có căn cứ (vd 2Y -> 24 tháng).
 */
const numsOf = (s: string) => s.match(/\d+(?:\.\d+)?/g) ?? [];

/**
 * Giá trị engine quy đổi có căn cứ từ ký hiệu trong nguồn (guide S6/S7):
 * SFF -> 2.5", LFF -> 3.5", 3840x2160/UHD -> 4K, ANNUAL -> 1 năm, 7K2 -> 7.2K.
 */
export function derivedNumbers(source: string): string[] {
  const k = key(source);
  const out: string[] = [];
  if (/\bSFF\b|2IN5|2\.5/.test(k)) out.push('2.5');
  if (/\bLFF\b|3IN5|3\.5/.test(k)) out.push('3.5');
  if (/3840\s*X\s*2160|\bUHD\b|\b4K\b/.test(k)) out.push('4');
  if (/ANNUAL|AN\s?NUAL|\b1\s*(NAM|YEAR|Y|YR)\b/.test(k)) out.push('1');
  for (const m of k.matchAll(/(\d+)([KT])(\d+)/g)) out.push(`${m[1]}.${m[3]}`);
  return out;
}

/**
 * Q10 chống bịa: mọi con số trong Web 1/Web 2 mới phải xuất hiện trong nguồn.
 * `allowed` là các giá trị engine tự quy đổi có căn cứ (vd 2Y -> 24 tháng).
 */
export function findUnsourcedNumbers(output: string, source: string, allowed: string[] = []): string[] {
  const k = key(source);
  const srcNums = new Set(
    [...numsOf(k), ...(k.match(/\d+,\d+/g) ?? []).map((n) => n.replace(',', '.')), ...derivedNumbers(source)]
      .flatMap((n) => [n, n.replace(/^0+(?=\d)/, '')]),
  );
  const ok = new Set(allowed.flatMap(numsOf));
  const out: string[] = [];
  for (const n of numsOf(key(output))) {
    if (srcNums.has(n) || ok.has(n)) continue;
    out.push(n);
  }
  return [...new Set(out)];
}

export function checkLength(web1: string): QaWarning | null {
  if (web1.length <= WEB1_MAX) return null;
  return { code: 'Q07', level: 'review', message: `WEB 1 dài ${web1.length} ký tự (> ${WEB1_MAX}); không cắt được thêm mà vẫn giữ Type/Brand/Model/P-N.` };
}

export function statusOf(warnings: QaWarning[]): Status {
  if (warnings.some((w) => w.level === 'reject')) return 'REJECT';
  if (warnings.some((w) => w.level === 'review')) return 'REVIEW';
  return 'PASS';
}

/** P/N khác nhau thật sự (không phải cái này chứa cái kia, kiểu 805349 vs 805349-B21). */
export function conflictingPns(pns: string[]): string[] {
  const norm = pns.map((p) => key(p).replace(/[^A-Z0-9]/g, ''));
  const distinct: string[] = [];
  norm.forEach((n, i) => {
    if (!norm.some((o, j) => j !== i && o !== n && o.includes(n)) && !distinct.some((d) => key(d).replace(/[^A-Z0-9]/g, '') === n)) {
      distinct.push(pns[i]);
    }
  });
  return distinct;
}
