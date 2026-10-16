import { key } from './normalize';
import type { BrandRule, Rules } from './rules';
import type { Extracted } from './types';

export interface BrandHit {
  brand: BrandRule;
  /** Vị trí trong chuỗi key. */
  index: number;
  length: number;
  implied: boolean;
}

/** Tìm hãng xuất hiện sớm nhất trong tên (ưu tiên alias dài hơn khi cùng vị trí). */
export function findBrand(text: string, rules: Rules): BrandHit | undefined {
  const k = key(text);
  let best: BrandHit | undefined;
  for (const p of rules.compiled.brandPatterns) {
    const m = p.re.exec(k);
    if (!m) continue;
    const index = m.index + m[1].length;
    const length = m[2].length;
    if (!best || index < best.index || (index === best.index && length > best.length)) {
      best = { brand: p.brand, index, length, implied: p.implied };
    }
  }
  return best;
}

export function brandFromMhh(mhh: string, rules: Rules): BrandRule | undefined {
  const m = /^[A-Z]{2}([A-Z]{2})_/.exec(mhh.toUpperCase());
  if (!m) return undefined;
  const hits = rules.brands.filter((b) => b.mhh?.includes(m[1]));
  return hits.length === 1 ? hits[0] : undefined;
}

const num = String.raw`\d+(?:[.,]\d+)?`;

function first(re: RegExp, s: string): RegExpExecArray | null {
  re.lastIndex = 0;
  return re.exec(s);
}

/** CPU: Core i5-1335U, Core Ultra 7 265, U7-155H, Core 7-240H, Xeon Silver 4310, Ryzen 5 7600X... */
export function extractCpu(k: string): string | undefined {
  let m: RegExpExecArray | null;
  k = k.replace(/[™®]/g, ' ').replace(/\bPROCESSOR\b/g, ' ').replace(/\s+/g, ' ');
  if ((m = first(/\b(?:CORE\s*)?ULTRA\s*X([579])\s*-?\s*(\d{3}[A-Z]{0,2})\b/, k))) return `Core Ultra X${m[1]} ${m[2]}`;
  if ((m = first(/\b(?:INTEL\s*)?(?:CORE\s*)?ULTRA\s*-?\s*([579])\s*[- ]?\s*(\d{3}[A-Z]{0,2})\b/, k))) return `Core Ultra ${m[1]} ${m[2]}`;
  if ((m = first(/\bU([579])\s*-\s*(\d{3}[A-Z]{1,2})\b/, k))) return `Core Ultra ${m[1]} ${m[2]}`;
  if ((m = first(/\bI([3579])\s*[- ]\s*(\d{4,5}[A-Z]{0,2})\b/, k)) || (m = first(/\bCORE\s*I([3579])\s*[- ]?\s*(\d{4,5}[A-Z]{0,2})\b/, k)))
    return `Core i${m[1]}-${m[2]}`;
  if ((m = first(/\bCORE\s*([3579])\s*[- ]\s*(\d{3}[A-Z]{0,2})\b/, k))) return `Core ${m[1]} ${m[2]}`;
  if ((m = first(/\bXEON[\s-]*(SILVER|GOLD|BRONZE|PLATINUM|S)\s*[- ]?\s*(\d{4}[A-Z]?)\b/, k))) {
    const tier = m[1] === 'S' ? 'Silver' : m[1].charAt(0) + m[1].slice(1).toLowerCase();
    return `Xeon ${tier} ${m[2]}`;
  }
  if ((m = first(/\b(?:XEON\s*)?(E-\d{4}[A-Z]?)\b/, k))) return `Xeon ${m[1]}`;
  if ((m = first(/\b(?:XEON\s*)?(W[3579]-\d{4}[A-Z]?)\b/, k))) return `Xeon ${m[1]}`;
  if ((m = first(/\bXEON\s+(\d{4}[A-Z]?)\b/, k)) || (m = first(/\bS(\d{4}R)\b/, k))) return `Xeon ${m[1]}`;
  if ((m = first(/\bRYZEN\s*([3579])\s*(?:PRO\s*)?(\d{4}[A-Z]{0,3})\b/, k))) return `Ryzen ${m[1]} ${m[2]}`;
  if ((m = first(/\b(PENTIUM|CELERON)\s*([A-Z]?\d{4}[A-Z]?)\b/, k))) return `${m[1].charAt(0)}${m[1].slice(1).toLowerCase()} ${m[2]}`;
  return undefined;
}

/** Ổ lưu trữ trong cấu hình máy: "512GB SSD", "512GSSD", "SSD 512GB", "1TB HDD", "2TB HDD NLSAS". */
export function extractStorage(k: string): string[] {
  const out: string[] = [];
  const re = new RegExp(String.raw`\b(${num})\s*(GB|TB|G|T)\s*(?:SSD|SS\b|HDD|NVME|PCIE)|\b(SSD|HDD)\s*(${num})\s*(GB|TB|G|T)\b`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(k))) {
    const value = m[1] ?? m[4];
    const unit = (m[2] ?? m[5]).startsWith('T') ? 'TB' : 'GB';
    const typ = m[3] ?? (/HDD/.test(m[0]) ? 'HDD' : 'SSD');
    const s = `${value.replace(',', '.')}${unit} ${typ}`;
    if (!out.includes(s)) out.push(s);
  }
  // "/ 1TB/" ngay sau SSD trong chuỗi cấu hình workstation: "256GB SSD/ 1TB/" -> HDD
  return out;
}

/** RAM trong cấu hình máy: "16GD5", "8GB RAM", "1x16GB RAM", "16G RAM", "/ 8GB/". */
export function extractRam(k: string, storage: string[]): string | undefined {
  let m: RegExpExecArray | null;
  if ((m = first(/\b(?:\d\s*X\s*)?(\d{1,3})\s*G(?:B)?\s*(?:D(?:DR)?([345])|RAM|DDR([345]))/, k))) {
    const gen = m[2] ?? m[3];
    return `${m[1]}GB${gen ? ` DDR${gen}` : ''}`;
  }
  if ((m = first(/\bRAM\s*(?:DDR[345]\s*)?(\d{1,3})\s*GB?\b/, k))) return `${m[1]}GB`;
  // GB đầu tiên đứng một mình giữa các dấu '/', không phải ổ cứng
  const re = /(?:^|[\/,;\s])(\d{1,3})\s*GB?(?=\s*(?:[\/,;]|$))/g;
  while ((m = re.exec(k))) {
    const v = Number(m[1]);
    if ([4, 8, 12, 16, 24, 32, 48, 64, 96, 128].includes(v) && !storage.some((s) => s.startsWith(`${v}GB`))) return `${v}GB`;
  }
  return undefined;
}

export function extractVga(k: string): string | undefined {
  let m: RegExpExecArray | null;
  if ((m = first(/\b(RTX|GTX)\s*-?\s*(\d{4})\s*(TI|SUPER)?\b(?:\s*[\/ ]?\s*(\d{1,2})\s*GB?\b)?/, k)))
    return `${m[1]} ${m[2]}${m[3] ? ' ' + (m[3] === 'TI' ? 'Ti' : 'Super') : ''}${m[4] ? ' ' + m[4] + 'GB' : ''}`;
  if ((m = first(/\b(?:NVIDIA\s*)?(?:QUADRO\s*)?(?:RTX\s*)?([AT](?:400|600|1000|2000|4000|4500|5000))\b(?:\s*(\d{1,2})\s*GB)?/, k)))
    return `NVIDIA ${m[1]}${m[2] ? ' ' + m[2] + 'GB' : ''}`;
  if ((m = first(/\bINTEL\s*(ARC|IRIS XE|UHD|GRAPHICS)\b/, k))) return m[1] === 'GRAPHICS' ? 'Intel Graphics' : `Intel ${m[1].charAt(0)}${m[1].slice(1).toLowerCase()}`;
  if ((m = first(/\bRADEON\s*(\w+)?/, k))) return `Radeon${m[1] ? ' ' + m[1] : ''}`;
  return undefined;
}

const RES_MAP: Record<string, string> = {
  '1920X1080': 'FHD', '1920X1200': 'WUXGA', '2560X1440': 'QHD', '2560X1600': 'WQXGA', '3840X2160': '4K UHD',
  '1366X768': 'HD', '1280X1024': 'SXGA', '3440X1440': 'UWQHD', '2880X1800': '2.8K', '1600X900': 'HD+',
};

export function extractScreen(k: string): Pick<Extracted, 'screenSize' | 'resolution' | 'panel' | 'hz' | 'responseMs' | 'brightness'> {
  const r: Pick<Extracted, 'screenSize' | 'resolution' | 'panel' | 'hz' | 'responseMs' | 'brightness'> = {};
  let m: RegExpExecArray | null;
  if ((m = first(new RegExp(String.raw`(?:^|[^\d.])(\d{2}(?:[.,]\d{1,2})?)\s*(?:"|”|''|INCHE?S?\b|INCH|IN\b|-INCH)`), k)) ||
      (m = first(/(?:^|[\/\s,])(\d{2}[.,]\d)\s*(?=FHD|WUXGA|QHD|UHD|WQXGA|2\.8K|3K|OLED|HD)/, k))) {
    const v = Number(m[1].replace(',', '.'));
    if (v >= 10 && v <= 100) r.screenSize = m[1].replace(',', '.');
  }
  if ((m = first(/\b(\d{4})\s*X\s*(\d{3,4})\b/, k))) r.resolution = RES_MAP[`${m[1]}X${m[2]}`] ?? `${m[1]}x${m[2]}`;
  else if ((m = first(/\b(FHD\+|FHD|WUXGA|WQXGA|WQHD|QHD|UHD|2\.8K|3K|2K|4K|HD\+)(?![A-Z0-9])/, k))) r.resolution = m[1] === 'UHD' ? '4K UHD' : m[1];
  if (/\bFULL\s*HD\b/.test(k) && !r.resolution) r.resolution = 'FHD';
  if ((m = first(/\b(IPS|VA|TN|OLED|QLED|MINI LED)\b/, k))) r.panel = m[1];
  if ((m = first(/@?\b(\d{2,3})\s*HZ\b/, k))) r.hz = `${m[1]}Hz`;
  if ((m = first(new RegExp(String.raw`\b(${num})\s*MS\b`), k))) r.responseMs = `${m[1].replace(',', '.')}ms`;
  if ((m = first(/\b(\d{3,4})\s*(?:NITS|CD\s*\/?\s*M2?|CD\/ M2)\b/, k))) r.brightness = `${m[1]} nits`;
  return r;
}

export function extractOs(k: string): { os?: string; conflict?: string[] } {
  const found: string[] = [];
  const add = (v: string) => { if (!found.includes(v)) found.push(v); };
  if (/\bW(?:IN(?:DOWS)?)?\s*-?\s*11\s*(?:H\b|HOME|SL\b|HOME SL)|\bW11(?:H|SL)\b|\bWIN11 ?HOME/.test(k)) add('Windows 11 Home');
  if (/\bW(?:IN(?:DOWS)?)?\s*-?\s*11\s*(?:P\b|PRO)|\bW11P\b/.test(k)) add('Windows 11 Pro');
  if (!found.length && /\bW(?:IN(?:DOWS)?)?\s*-?\s*11\b|\bWIN11\b/.test(k)) add('Windows 11');
  if (/\bNO\s*-?\s*OS\b|\bNOOS\b|\bNON\s*-?\s*OS\b|\bFREE\s*DOS\b|\bDOS\b/.test(k)) add('No OS');
  if (/\bUBUNTU\b/.test(k)) add('Ubuntu');
  else if (/\bLINUX\b/.test(k)) add('Linux');
  if (!found.length) return {};
  return { os: found[0], conflict: found.length > 1 ? found : undefined };
}

export function extractPower(k: string): { watt?: string; wh?: string } {
  const r: { watt?: string; wh?: string } = {};
  let m: RegExpExecArray | null;
  if ((m = first(new RegExp(String.raw`\b(${num})\s*W\b(?!H)`), k))) r.watt = `${m[1].replace(',', '.')}W`;
  if ((m = first(new RegExp(String.raw`\b(${num})\s*W?WH\b`), k))) r.wh = `${m[1].replace(',', '.')}Wh`;
  return r;
}

/** Dung lượng chính của linh kiện lưu trữ/RAM: "1.2TB", "1T2" -> giữ nguyên nguồn, "960GB". */
export function extractCapacity(k: string): string | undefined {
  const m = first(new RegExp(String.raw`\b(${num})\s*(TB|GB|T|G)\b(?!\s*\/S)`), k);
  if (!m) return undefined;
  return `${m[1].replace(',', '.')}${m[2].startsWith('T') ? 'TB' : 'GB'}`;
}

const COLORS: [RegExp, string][] = [
  [/\b(BLACK|DEN|BK|MK|PGBK|K)\b/, 'Màu Đen'],
  [/\b(CYAN|XANH|C)\b/, 'Màu Xanh'],
  [/\b(MAGENTA|DO|M)\b/, 'Màu Đỏ'],
  [/\b(YELLOW|VANG|Y)\b/, 'Màu Vàng'],
];

/** Màu mực: chỉ dùng cho nhóm mực/drum. */
export function extractInkColor(k: string): string | undefined {
  for (const [re, v] of COLORS) if (re.test(k)) return v;
  return undefined;
}

const VN_COLORS: [RegExp, string][] = [
  [/xanh dương/iu, 'Xanh dương'], [/xanh lá/iu, 'Xanh lá'], [/xanh đen/iu, 'Xanh đen'], [/xanh đêm/iu, 'Xanh đêm'],
  [/(?<![\p{L}])xanh(?![\p{L}])/iu, 'Xanh'], [/(?<![\p{L}])đen(?![\p{L}])/iu, 'Đen'], [/(?<![\p{L}])trắng(?![\p{L}])/iu, 'Trắng'],
  [/(?<![\p{L}])xám(?![\p{L}])/iu, 'Xám'], [/(?<![\p{L}])bạc(?![\p{L}])/iu, 'Bạc'], [/(?<![\p{L}])hồng(?![\p{L}])/iu, 'Hồng'],
  [/(?<![\p{L}])vàng(?![\p{L}])/iu, 'Vàng'], [/(?<![\p{L}])đỏ(?![\p{L}])/iu, 'Đỏ'], [/(?<![\p{L}])tím(?![\p{L}])/iu, 'Tím'],
];
const EN_COLOR = String.raw`(?:DARK |LIGHT |SPACE |MIDNIGHT |ROSE |SKY )?(?:WHITE|BLACK|GREY|GRAY|SILVER|PINK|YELLOW|BLUE|RED|GREEN|PURPLE|GOLD|NAVY|GRAPHITE|BEIGE|ORANGE|MINT|LAVENDER)(?:-(?:GREY|GRAY|WHITE|BLACK))?`;

/**
 * Màu sắc cho phụ kiện/thiết bị ngoại vi. Ưu tiên chữ tiếng Việt trong nguồn ("ĐEN (CHARCOAL)" -> "Đen");
 * không có thì giữ tên màu tiếng Anh, nhưng chỉ khi đứng sau dấu phân cách / trong ngoặc / sau "MÀU"
 * (tránh nhầm dòng sản phẩm "WD Blue", "Blue Switch").
 */
export function extractColor(text: string): string | undefined {
  // bỏ cụm "MÀU" đi kèm từ khác không phải màu (vd "MÀN HÌNH MÀU")
  for (const [re, v] of VN_COLORS) if (re.test(text)) return v;
  const k = key(text);
  const m = new RegExp(String.raw`(?:[,/(]\s*|\bMAU\s*:?\s*)(${EN_COLOR})\s*(?=[,/)]|$)`).exec(k);
  if (!m) return undefined;
  return m[1].toLowerCase().replace(/(^|[\s-])\w/g, (c) => c.toUpperCase());
}
