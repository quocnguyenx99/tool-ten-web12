/** Chuẩn hóa chuỗi: Unicode NFC, gộp khoảng trắng, trim. */
export function nfc(s: string | null | undefined): string {
  return String(s ?? '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '') // zero-width, soft hyphen
    .replace(/\u2011/g, '-') // non-breaking hyphen ("6‑core")
    .replace(/[   \t\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Bỏ dấu tiếng Việt, giữ nguyên độ dài ký tự (để map vị trí giữa 2 chuỗi). */
export function stripAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFC');
}

/** Khóa so khớp: bỏ dấu + IN HOA. Dùng cho regex nhận diện. */
export function key(s: string): string {
  return stripAccents(nfc(s)).toUpperCase();
}

/** Khóa so khớp tên file: bỏ dấu, chỉ giữ chữ + số. */
export function fileKey(s: string): string {
  return key(s).replace(/[^A-Z0-9]/g, '');
}

const VN_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

export function hasVietnamese(s: string): boolean {
  return VN_CHARS.test(s);
}

export function isAllCaps(s: string): boolean {
  const letters = s.replace(/[^A-Za-zÀ-ỹ]/g, '');
  return letters.length >= 6 && letters === letters.toUpperCase();
}

export function collapse(s: string): string {
  return s
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,;)\]])/g, '$1')
    .replace(/([(\[])\s+/g, '$1')
    .replace(/^[\s,;:\-–_/|]+|[\s,;:\-–_/|]+$/g, '')
    .trim();
}

/** "Ổ CỨNG MÁY CHỦ" -> "Ổ cứng máy chủ" (chỉ viết hoa chữ đầu). */
export function sentenceCase(s: string): string {
  const lower = s.toLocaleLowerCase('vi');
  return lower.charAt(0).toLocaleUpperCase('vi') + lower.slice(1);
}
