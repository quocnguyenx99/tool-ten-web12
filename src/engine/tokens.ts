import { hasVietnamese, key, sentenceCase } from './normalize';
import type { BrandHit } from './extract';
import type { Rules } from './rules';

export interface Tok {
  text: string;
  start: number;
  /** Token kết thúc bằng dấu phân cách cứng (",", ";", "|", "/") */
  hardStopAfter: boolean;
}

/** Tách token theo khoảng trắng, ghi lại vị trí để đối chiếu với vị trí hãng. */
export function tokenize(text: string): Tok[] {
  const out: Tok[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const word = m[0];
    // Điểm cắt trong một cụm không có khoảng trắng:
    //  - dấu phẩy: "AIO -24IRH9,23.8\"", "265,16GB" (trừ thập phân kiểu Việt "1,5TB") -> phân cách cứng
    //  - "(" dính liền: "H1(3" -> "H1" + "(3"
    let segStart = 0;
    const push = (end: number, hard: boolean) => {
      let t = word.slice(segStart, end);
      if (/[;|]+$/.test(t)) {
        t = t.replace(/[;|]+$/, '');
        hard = true;
      }
      if (t) out.push({ text: t, start: m!.index + segStart, hardStopAfter: hard });
    };
    for (let i = 0; i < word.length; i++) {
      const c = word[i];
      if (c === ',') {
        const left = word.slice(segStart, i);
        if (/^\d{1,2}$/.test(left) && /\d/.test(word[i + 1] ?? '')) continue;
        push(i, true);
        segStart = i + 1;
      } else if (c === '(' && i > segStart && word[i - 1] !== '(') {
        push(i, false);
        segStart = i;
      }
    }
    push(word.length, false);
  }
  return out;
}

/** Âm tiết tiếng Việt không dấu: chỉ coi là tiếng Việt khi đứng cạnh một từ có dấu ("VI TÍNH", "GẮN TRONG", "THU PHÁT"). */
const VN_SYLL = new Set([
  'VI', 'TRONG', 'THU', 'GHI', 'CUNG', 'MINH', 'THANH', 'BA', 'QUY', 'IN', 'THEO', 'MAY', 'GAN', 'BO', 'DAY', 'CAP', 'HOP',
  'KHAY', 'MAT', 'PHAT', 'LUU', 'TRU', 'DEN', 'XAM', 'BAC', 'VANG', 'HONG', 'XANH', 'DO', 'TIM', 'CHUYEN', 'HANG', 'TAI', 'NGHE',
  'BAN', 'PHIM', 'CHUOT', 'SAC', 'NHAN', 'HINH', 'TINH', 'DI', 'DONG', 'LOA', 'MANG', 'CHO', 'VAN', 'PHONG', 'THONG',
  'RUNG', 'TRUNG', 'TAY', 'XACH', 'TREO', 'TUONG', 'BONG', 'QUAN', 'SAT', 'KIEM', 'TRA', 'TAM', 'XA', 'TU', 'KHOI', 'LAP', 'NGOAI', 'GIAN', 'NHA', 'CUA', 'SO', 'DIEN', 'NUOC', 'CHAN', 'DE', 'GIA', 'THE',
]);

export function isVnToken(toks: Tok[], i: number): boolean {
  const t = toks[i]?.text.replace(/[()]/g, '') ?? '';
  if (hasVietnamese(t)) return true;
  if (!VN_SYLL.has(key(t))) return false;
  const near = (j: number) => !!toks[j] && (hasVietnamese(toks[j].text) || (key(t) === 'THANH' && key(toks[j].text) === 'RAM'));
  return near(i - 1) || near(i + 1) || (VN_SYLL.has(key(toks[i + 1]?.text ?? '')) && near(i + 2));
}

const UNIT = /^(GB|TB|G|T|MB|GHZ|MHZ|HZ|W|WH|MAH|V|AH|MS|K|RPM|M|CM|MM|L|PA|DPI|MP|INCH|INCHES|INCHE|IN|"|”|NITS|PORT|PORTS|CỔNG|USER|TỜ)$/;

export function isSpecToken(t: string, next?: string): boolean {
  const k = key(t).replace(/[()]/g, '');
  if (/^\d+([.,]\d+)?\s*(GB|TB|G|T|MB|GD\d|GHZ|MHZ|HZ|W|WH|MAH|V|AH|MS|K|RPM|M|CM|MM|L|PA|DPI|MP|INCH|IN|"|”|NITS|MT\/S)$/.test(k)) return true;
  if (/^\d+([.,]\d+)?$/.test(k) && next && UNIT.test(key(next))) return true;
  if (/^(I[3579]|U[579])-\d/.test(k) || /^I[3579]$/.test(k)) return true;
  if (/^\d+(\.\d+)?["”]/.test(k)) return true;
  if (/^(X?[3579]|X\dE)-\d{2,3}/.test(k)) return true; // "5-135H", "X7-358H", "X2E-88-100"
  if (k === 'ULTRA' && next && /^X?\d/.test(key(next))) return true;
  if (/^(CORE|XEON|XEON-S|XEON-SILVER|RYZEN|PENTIUM|CELERON|INTEL®?)$/.test(k)) return true;
  if (/^(W11\w*|WIN\d*|WINDOWS|NOOS|NO-OS|FREEDOS|UBUNTU|LINUX)$/.test(k)) return true;
  if (/^\d{3,4}X\d{3,4}/.test(k) || k.startsWith('@')) return true;
  if (/^(FHD\+?|WUXGA|QHD|UHD|2K|4K|IPS|OLED|DDR\d|PC\d-?\d*|RTX\d*|GTX\d*|SAS|SATA|NVME|ECC|RDIMM|UDIMM|SODIMM)$/.test(k)) return true;
  return false;
}

const STOP = new Set(['FOR', 'DUNG', 'CHO', 'KEM', '+', '-', '–', '&', 'W/', 'GOM', 'VOI', 'TU', 'SANG', 'TO', 'WITH']);

/** Từ tiếng Anh chỉ loại hàng: bỏ khỏi Model nhưng không dừng. */
const SKIP = new Set([
  'LCD', 'LED', 'MONITOR', 'PC', '(PC)', 'NB', 'SERVER', 'MODEL', 'DESKTOP', 'RAM', 'SSD', 'HDD', 'PRINTER', 'SCANNER',
  'HEADSET', '(HEADSET)', 'MOUSE', '(MOUSE)', 'KEYBOARD', '(KEYBOARD)', '(IPAD)', '(IPHONE)', '(LCD)', 'WEBCAM', 'CPU', 'VGA', 'CARD',
  'UPS', '(UPS)', 'PSU', 'NOTEBOOK', 'LAPTOP', 'TIVI', 'GN', 'GẮN', 'NGOÀI',
]);

/** Từ tiếng Việt không dấu vẫn thuộc cụm loại hàng. */
const VN_PLAIN = new Set(['CAMERA', 'PIN', 'LED', 'HUB', 'USB', 'HDMI', 'RAM', 'SSD', 'HDD', 'VGA', 'LCD', 'UPS', 'LAN']);

export function applyCasing(t: string, rules: Rules): string {
  const k = key(t);
  const bare = k.replace(/^[(\[]|[)\],.]$/g, '');
  if (rules.casingWords[bare]) return t.replace(new RegExp(escape(bare), 'i'), rules.casingWords[bare]);
  if (hasVietnamese(t)) return t.toLocaleLowerCase('vi');
  if (/[a-z]/.test(t) && /[A-Z]/.test(t)) return t; // đã có casing riêng trong nguồn (ThinkCentre, RNUC15...)
  if (rules.keepUpper.has(bare)) return t.toUpperCase();
  if (/\d/.test(t)) return t.toUpperCase().replace(/(\d)(TB|GB|MB)\b/g, '$1$2').replace(/(\d)HZ\b/g, '$1Hz').replace(/(\d)MHZ\b/g, '$1MHz');
  if (/^[A-Z][A-Z\-.]*$/.test(t) && t.length <= 2) return t;
  if (/^[A-Z]{3,}$/.test(t) && !/[AEIOUY]/.test(t)) return t; // mã không nguyên âm: GDDXD, BTB
  if (/^[A-Za-z][A-Za-z\-'.]*$/.test(t)) return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  return t;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Cụm loại hàng tiếng Việt ở đầu tên: "CẢM BIẾN CHUYỂN ĐỘNG P1 ..." -> "Cảm biến chuyển động". */
export function leadingTypePhrase(toks: Tok[]): { phrase: string; endIndex: number } {
  const words: string[] = [];
  let i = 0;
  for (; i < toks.length && words.length < 10; i++) {
    const t = toks[i].text.replace(/[()]/g, '');
    if (!t) continue;
    if (isVnToken(toks, i) || VN_PLAIN.has(key(t))) {
      words.push(t);
      if (toks[i].hardStopAfter) { i++; break; }
    } else break;
  }
  let phrase = words.join(' ');
  // bỏ đuôi nối: "dùng cho", "của", "hiệu", "máy vi tính"
  for (let n = 0; n < 4; n++) {
    const before = phrase;
    phrase = phrase
      .replace(/\s+(dùng cho|dùng|cho|của|loại|hiệu|máy vi tính|vi tính|máy tính|có|bằng)$/iu, '')
      .replace(/\s+vi tính(?=\s)/iu, '');
    if (before === phrase) break;
  }
  return { phrase: phrase ? sentenceCase(phrase) : '', endIndex: i };
}

export interface ModelOptions {
  maxTokens?: number;
  /** Cho phép giữ số trần (vd "3020", "14") trong model. */
  allowNumbers?: boolean;
  extraSkip?: Set<string>;
  /** Phần mềm: không dừng ở token spec (CORE, SERVER...) */
  noSpecStop?: boolean;
  /** Linh kiện/phụ kiện: bỏ qua thông số đứng ngay sau hãng ("Gigabyte 8GB GV-N5060...", "10M YC142M") */
  skipLeadingSpecs?: boolean;
}

/**
 * Model = các token Latin ngay sau hãng cho tới khi gặp spec / chữ tiếng Việt / dấu phân cách.
 * Nếu sau hãng không có gì, lấy cụm Latin đứng giữa loại hàng và hãng.
 */
export function modelTokens(toks: Tok[], brand: BrandHit | undefined, typeEnd: number, opts: ModelOptions = {}): string[] {
  const max = opts.maxTokens ?? 6;
  const brandWords = new Set(brand ? [brand.brand.name, ...brand.brand.aliases].map((a) => key(a)) : []);
  const collect = (from: number, until = toks.length): string[] => {
    const out: string[] = [];
    for (let i = from; i < until && out.length < max; i++) {
      let t = toks[i].text;
      // hãng ngầm trong ngoặc: "(IPHONE) APPLE 18 PRO" -> "IPHONE"
      if (i === from && brand?.implied && /^\([^()]+\)$/.test(t)) t = t.slice(1, -1);
      const k = key(t);
      if (brandWords.has(k) && !(brand?.implied && i === from)) continue;
      const vnAfterSlash = /^[^/]+\/./.test(t) && !hasVietnamese(t.split('/')[0]); // "WIRELESS/ĐEN"
      if (STOP.has(k) || t.startsWith('(') || (!vnAfterSlash && isVnToken(toks, i))) break;
      let stopAfter = toks[i].hardStopAfter;
      if (t.includes('/') && !/^[A-Z0-9]{4,}\/[A-Z]{1,2}$/i.test(t) && !/^[A-Z]{1,3}\d{2,4}[A-Z]?\/[A-Z]{1,3}\d{2,4}[A-Z]?$/i.test(t)) {
        t = t.split('/')[0];
        stopAfter = true;
        if (!t) break;
      }
      if (!opts.noSpecStop && isSpecToken(t, toks[i + 1]?.text)) {
        if (opts.skipLeadingSpecs && out.length === 0 && !stopAfter) {
          if (/^\d+([.,]\d+)?$/.test(t)) i++; // "10 M" -> bỏ cả đơn vị
          continue;
        }
        break;
      }
      if ((!opts.noSpecStop && SKIP.has(key(t))) || opts.extraSkip?.has(key(t))) {
        if (stopAfter) break;
        continue;
      }
      if (!opts.allowNumbers && /^\d+$/.test(t) && out.length === 0) break;
      out.push(t.replace(/[.,:;]+$/, ''));
      if (stopAfter) break;
    }
    return out;
  };

  if (brand) {
    const bi = toks.findIndex((t) => t.start + t.text.length > brand.index);
    if (bi >= 0) {
      // token chứa hãng: nếu là hãng "ngầm" (AutoCAD) thì giữ token đó trong model
      const brandEnd = brand.index + brand.length;
      let j = bi;
      while (j < toks.length && toks[j].start < brandEnd) j++;
      let after = collect(brand.implied ? bi : j);
      const before = typeEnd < bi ? collect(typeEnd, bi) : [];
      if (!after.length && !before.length) {
        // "Kaspersky dùng cho máy tính Next Foundation ..." -> nhảy qua cụm tiếng Việt ngắn rồi lấy tiếp
        let k = j;
        while (k < toks.length && k - j < 6 && (isVnToken(toks, k) || STOP.has(key(toks[k].text)))) k++;
        if (k > j && k < toks.length) after = collect(k);
      }
      return [...before, ...after].slice(0, max);
    }
  }
  return collect(typeEnd);
}
