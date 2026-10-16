import { collapse, hasVietnamese, key, nfc } from './normalize';
import type { QaWarning } from './types';

export interface CleanResult {
  /** Tên sau khi bỏ meta-text, P/N, SKU, bảo hành... dùng cho bước trích xuất. */
  text: string;
  pnCandidates: string[];
  modelField?: string;
  /** Model đứng đầu tên, kiểu "L1310 MÁY IN EPSON". */
  leadingModel?: string;
  warrantyMonths?: number;
  warrantyValues: number[];
  warnings: QaWarning[];
}

const CODE = String.raw`[A-Z0-9][A-Z0-9\-\/\.]*[A-Z0-9]`;

/** Chuẩn hóa P/N: bỏ khoảng trắng quanh '-', đổi '–' thành '-'. */
export function normalizePn(s: string): string {
  return s
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '')
    .replace(/^[-_.]+|[-_.]+$/g, '');
}

function hasDigitAndLetter(s: string): boolean {
  return /\d/.test(s) && /[A-Z]/i.test(s);
}

/** Một chuỗi trong ngoặc có phải P/N không (loại các spec như 1X16GB, 2+32G, 3.5IN). */
export function looksLikePn(raw: string): boolean {
  const s = normalizePn(raw).toUpperCase();
  if (s.length < 4 || s.length > 30) return false;
  if (hasVietnamese(raw)) return false;
  if (/\s/.test(raw.trim().replace(/\s*-\s*/g, '-'))) return false;
  if (!/\d/.test(s)) return false;
  if (/^\d+(\.\d+)?(GB|TB|G|T|MB|MHZ|GHZ|W|WH|V|AH|MAH|IN|INCH|HZ|MS|M|CM|MM|K|PCS|CAI|PORT|P)$/.test(s)) return false;
  if (/^\d+X\d+(GB|G|TB)?$/.test(s)) return false;
  if (/^\d+\+\d+G?B?$/.test(s)) return false;
  if (/^(1|2|3|4)(RX|R)\d+$/.test(s)) return false;
  if (/^\d{1,3}$/.test(s)) return false;
  if (/^(DDR|PC)\d/.test(s) && s.length < 12) return false;
  if (/^\d{2,4}N(ITS)?$/.test(s)) return false; // độ sáng "300N"
  // mã CPU (I5-13420H, W3-2435, U7-155H) không phải P/N sản phẩm
  if (/^(I[3579]|U[579]|R[3579]|W[3579]|M[13])-?\d{3,5}[A-Z]{0,3}$/.test(s)) return false;
  return hasDigitAndLetter(s) || /^\d{6,}$/.test(s) || /^\d+-\d+$/.test(s);
}

interface Ctx {
  text: string;
  pns: string[];
  warnings: QaWarning[];
}

function take(ctx: Ctx, re: RegExp, onMatch: (m: RegExpExecArray) => string | void) {
  ctx.text = ctx.text.replace(re, (...args) => {
    const m = args.slice(0, -2) as unknown as RegExpExecArray;
    const r = onMatch(m);
    return typeof r === 'string' ? r : ' ';
  });
}

function addPn(ctx: Ctx, raw: string | undefined) {
  if (!raw) return;
  const pn = normalizePn(raw);
  if (pn && !ctx.pns.some((p) => p.toUpperCase() === pn.toUpperCase())) ctx.pns.push(pn);
}

export interface CleanOptions {
  /** Dịch vụ/phần mềm: không bóc thời hạn ra khỏi tên (đó chính là sản phẩm). */
  keepDuration?: boolean;
}

/** Bước S3 Raw cleaning của guide. */
export function cleanRaw(input: string, opts: CleanOptions = {}): CleanResult {
  // "GEN 6U5- 228V" (dính chữ trong nguồn) -> "GEN 6 U5-228V"
  const text0 = nfc(input).replace(/\b(GEN\s*\d{1,2})(U[579]-)\s*/giu, '$1 $2');
  const ctx: Ctx = { text: text0, pns: [], warnings: [] };
  let modelField: string | undefined;
  let leadingModel: string | undefined;
  const warrantyValues: number[] = [];

  // Q09: meta-text / prompt AI
  if (/dưới\s*70\s*ký\s*tự/iu.test(ctx.text) || /\b(prompt|chatgpt|viết lại|chuẩn seo)\b/iu.test(ctx.text)) {
    ctx.warnings.push({ code: 'Q09', level: 'info', message: 'Tên nguồn có note "Dưới 70 ký tự"/prompt; đã loại khỏi output.' });
    take(ctx, /\(?\s*dưới\s*70\s*ký\s*tự\s*\)?/giu, () => ' ');
    take(ctx, /\b(prompt|chatgpt|viết lại|chuẩn seo)\b[^,;|]*/giu, () => ' ');
  }
  // Q08: MỚI 100%, dấu *
  if (/mới\s*100\s*%/iu.test(ctx.text) || ctx.text.includes('*')) {
    ctx.warnings.push({ code: 'Q08', level: 'info', message: 'Đã bỏ ký tự rác/meta-text ("MỚI 100%", "*").' });
    take(ctx, /[,.\s-]*(hàng\s*)?mới\s*100\s*%\.?/giu, () => ' ');
    ctx.text = ctx.text.replace(/\*/g, ' ');
  }

  // [PART-NUMBER] ở đầu
  take(ctx, /^\s*\[([^\]]{3,40})\]\s*/u, (m) => addPn(ctx, m[1]));
  // "801882-B21: Ổ CỨNG..." / "RG-EG105GW-X: Thiết bị..."
  take(ctx, new RegExp(`^\\s*(${CODE}):\\s+`, 'u'), (m) => (hasDigitAndLetter(m[1]) || /\d{5,}/.test(m[1]) ? addPn(ctx, m[1]) : m[0]));
  // Mã đứng đầu rồi tới chữ tiếng Việt: "128S1-WW3740-L562N PHẦN MỀM", "EN49019_ Vỏ máy tính", "L1310 MÁY IN EPSON"
  take(ctx, /^\s*([A-Z0-9][A-Z0-9\-\/\.]{2,30})_?\s+(?=\S*[À-ỹ])/u, (m) => {
    const code = m[1];
    if (!/\d/.test(code)) return m[0];
    if (normalizePn(code).length >= 7) addPn(ctx, code);
    else leadingModel = code;
  });

  // P/N: X, (P/N X), PN: X
  take(ctx, new RegExp(`\\(?\\s*\\bP\\s*\\/\\s*N\\s*[:.]?\\s*(${CODE})\\s*\\)?`, 'giu'), (m) => addPn(ctx, m[1]));
  // SKU: X
  take(ctx, new RegExp(`[,(]?\\s*\\bSKU\\s*[:]?\\s*(${CODE})\\s*\\)?`, 'giu'), (m) => addPn(ctx, m[1]));
  // Mã hàng: X / MÃ X / CK X
  take(ctx, new RegExp(`[,(]?\\s*(?:\\bmã\\s*hàng|\\bmã|\\bCK)\\s*[:]?\\s*(${CODE})`, 'giu'), (m) =>
    hasDigitAndLetter(m[1]) || /\d{4,}/.test(m[1]) ? addPn(ctx, m[1]) : m[0],
  );
  // MODEL: X (Y)
  take(ctx, new RegExp(`[,]?\\s*\\bmodel\\s*[:]?\\s*(${CODE})(?:\\s*\\(\\s*(?:SKU\\s*[:]?\\s*)?(${CODE})\\s*\\))?`, 'giu'), (m) => {
    modelField = modelField ?? m[1];
    if (m[2]) addPn(ctx, m[2]);
  });

  // Bảo hành (không áp dụng cho dịch vụ/phần mềm)
  if (!opts.keepDuration) {
    const tail = String.raw`(?:\s*[-/,]?\s*(?:OSS|PRO|PREMIER|PRE|PS|ONSITE|ONSIT|WTY|WRT|WARRANTY|SUPPORT|PLUS|TC|BAS|SVC|BASIC|SC)\b)*`;
    take(ctx, new RegExp(String.raw`[-–,_/(\s]*\b(?:WARRANTY|WTY|BH|bảo\s*hành)?\s*0?([1-5])\s*(?:YEARS?|YRS?|Y|năm)(?:PRE(?:MIER)?)?\b${tail}\)?`, 'giu'), (m) => {
      warrantyValues.push(Number(m[1]) * 12);
    });
    take(ctx, new RegExp(String.raw`[-–,_/(\s]*\b(\d{1,2})\s*(?:MTHS|MONTHS|THÁNG)\b${tail}\)?`, 'giu'), (m) => {
      warrantyValues.push(Number(m[1]));
    });
  }

  // Mã cuối tên sau dấu '_' : "..._W2120X", "..._(872479-B21)", "..._(840757-091)_(815098-B21)"
  for (let i = 0; i < 3; i++) {
    const before = ctx.text;
    take(ctx, /_\s*\(?\s*([A-Z0-9][A-Z0-9\- \/\.]{2,30}?)\s*\)?\s*$/u, (m) => {
      if (looksLikePn(m[1])) addPn(ctx, m[1]);
      else return m[0];
    });
    if (before === ctx.text) break;
  }
  // Mã cuối tên sau " - ": "... HDD - P28352-B21", "... 4YR PRO - 70297359"
  take(ctx, /\s[-–]\s*([A-Z0-9][A-Z0-9\-]{4,29})\s*$/u, (m) => (looksLikePn(m[1]) ? addPn(ctx, m[1]) : m[0]));
  // Mã trong ngoặc ở bất kỳ đâu: "(76B17PA)", "( 658079 - B21)", "(UM.WE1SV.302)"
  take(ctx, /\(\s*([A-Z0-9][A-Z0-9\-\.\/ ]{2,30}?)\s*\)/gu, (m) => (looksLikePn(m[1]) ? addPn(ctx, m[1]) : m[0]));
  // "Mã" dính liền sau dấu '_' ở giữa tên: "21.5" FPT ELEAD_P22FVH"
  take(ctx, /_([A-Z0-9][A-Z0-9\-]{3,25})\b/gu, (m) => (looksLikePn(m[1]) ? addPn(ctx, m[1]) : ' ' + m[1]));

  // "HIỆU" chỉ là từ nối trước tên hãng
  ctx.text = ctx.text.replace(/\bhiệu\s*:?\s*/giu, ' ');
  ctx.text = ctx.text.replace(/[_]+/g, ' ');

  const distinct = [...new Set(warrantyValues)];
  if (distinct.length > 1) {
    ctx.warnings.push({
      code: 'Q06',
      level: 'review',
      message: `Nguồn có nhiều mức bảo hành/support (${distinct.map((v) => v + ' tháng').join(', ')}); cần chọn mức customer-facing.`,
    });
  }

  return {
    text: collapse(ctx.text.replace(/\(\s*\)/g, ' ').replace(/\s*,\s*,+/g, ',')),
    pnCandidates: ctx.pns,
    modelField: modelField ? normalizePn(modelField) : undefined,
    leadingModel,
    warrantyMonths: warrantyValues[0],
    warrantyValues,
    warnings: ctx.warnings,
  };
}

/** Bước S4: Web 2 cũ chỉ là số đơn lẻ / rỗng -> NULL. */
export function cleanPlaceholder(web2: string | null | undefined): { value: string; placeholder: boolean } {
  const v = nfc(web2);
  if (!v) return { value: '', placeholder: false };
  if (/^\d{1,2}$/.test(v) || /^[-.\s]*$/.test(v)) return { value: '', placeholder: true };
  return { value: v, placeholder: false };
}

export { key };
