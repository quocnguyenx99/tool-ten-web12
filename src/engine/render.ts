import { key } from './normalize';
import type { Rules } from './rules';
import { applyCasing } from './tokens';
import type { Extracted } from './types';

/** P0 không bao giờ bỏ; P1 giữ nếu được; P2 bỏ trước (mục 12 guide). */
export interface Part {
  text: string;
  p: 0 | 1 | 2;
}

export interface RenderInput {
  renderer: string;
  categoryId?: string;
  typeLabel: string;
  cleanedKey: string;
  modelTokens: string[];
  ex: Extracted;
  rules: Rules;
}

export interface RenderOutput {
  parts: Part[];
  web2: string;
}

export const WEB1_MAX = 70;

export function joinParts(parts: Part[]): string {
  return parts
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+,/g, ',')
    .replace(/\s+-\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Bước S10: bỏ token P2 rồi P1 (từ cuối lên) tới khi <= 70; không bao giờ cắt P0. */
export function fitTo70(parts: Part[]): { text: string; dropped: string[]; fits: boolean } {
  const work = [...parts];
  const dropped: string[] = [];
  for (const level of [2, 1] as const) {
    for (let i = work.length - 1; i >= 0 && joinParts(work).length > WEB1_MAX; i--) {
      if (work[i].p === level) {
        dropped.push(work[i].text);
        work.splice(i, 1);
      }
    }
  }
  const text = joinParts(work);
  return { text, dropped, fits: text.length <= WEB1_MAX };
}

function pnPart(ex: Extracted, model: string): Part | null {
  if (!ex.pn) return null;
  const k = key(model).replace(/[^A-Z0-9]/g, '');
  const pk = key(ex.pn).replace(/[^A-Z0-9]/g, '');
  if (k.includes(pk)) return null;
  return { text: `(${ex.pn})`, p: 0 };
}

function casedModel(tokens: string[], rules: Rules): string {
  return tokens.map((t) => applyCasing(t, rules)).join(' ');
}

const months = (m?: number) => (m ? `${m} tháng` : '');

/** Nối các trường Web 2, bỏ trường trống, không tạo "/ /". */
function slash(fields: (string | undefined)[], sep = '/ '): string {
  return fields.filter((f) => f && f.trim()).join(sep);
}

function screenText(ex: Extracted): string | undefined {
  if (!ex.screenSize) return undefined;
  return [`${ex.screenSize} inch`, ex.resolution, ex.panel === 'OLED' ? 'OLED' : undefined].filter(Boolean).join(' ');
}

function vgaOrOnboard(ex: Extracted): string | undefined {
  if (ex.vga) return ex.vga;
  return ex.cpu ? 'VGA onboard' : undefined;
}

function features(k: string, list: [RegExp, string][]): Part[] {
  return list.filter(([re]) => re.test(k)).slice(0, 2).map(([, v]) => ({ text: v, p: 1 as const }));
}

export function render(input: RenderInput): RenderOutput {
  const { renderer, typeLabel, cleanedKey: k, modelTokens, ex, rules } = input;
  const model = casedModel(modelTokens, rules);
  const brand = ex.brand ?? '';
  const pn = pnPart(ex, model);
  const base = (label: string, extra: Part[] = [], tail: Part[] = []): Part[] =>
    [{ text: label, p: 0 as const }, ...extra, { text: brand, p: 0 as const }, { text: model, p: 0 as const }, ...(pn ? [pn] : []), ...tail];

  switch (renderer) {
    case 'laptop': {
      const feat = features(k, [[/\bGAMING\b/, 'Gaming'], [/\bTOUCH\b(?!\s*ID)|CAM UNG/, 'Cảm ứng'], [/\bX360\b|2 IN 1|2-IN-1/, '2-in-1']]);
      const parts: Part[] = [{ text: 'Laptop', p: 0 }, { text: brand, p: 0 }, { text: model, p: 0 }, ...feat, ...(pn ? [pn] : [])];
      if (feat.some((f) => f.text === 'Gaming')) {
        parts.splice(0, 1, { text: 'Laptop Gaming', p: 0 });
        parts.splice(parts.findIndex((p) => p.text === 'Gaming'), 1);
      }
      return { parts, web2: slash([screenText(ex), ex.cpu, ex.ram, ex.storage.join(' + ') || undefined, vgaOrOnboard(ex), ex.os, months(ex.warrantyMonths)]) };
    }
    case 'pc':
    case 'nuc':
    case 'workstation': {
      let label = typeLabel;
      if (renderer === 'nuc') label = /KHONG CO O CUNG|NO RAM|BAREBONE|\bKIT\b/.test(k) ? 'Barebone NUC' : 'Mini PC';
      const parts = base(label);
      let ram = ex.ram;
      let storage = ex.storage.join(' + ') || undefined;
      if (renderer === 'nuc' && /KHONG CO O CUNG, RAM|KHONG CO O CUNG VA RAM|KHONG CO O CUNG, RAM VA/.test(k)) {
        ram = ram ?? 'No RAM';
        storage = storage ?? 'No ổ cứng';
      }
      return { parts, web2: slash([ex.cpu, ram, storage, vgaOrOnboard(ex), ex.os, months(ex.warrantyMonths)]) };
    }
    case 'aio': {
      return { parts: base('PC AIO'), web2: slash([screenText(ex), ex.cpu, ex.ram, ex.storage.join(' + ') || undefined, vgaOrOnboard(ex), ex.os, months(ex.warrantyMonths)]) };
    }
    case 'server': {
      const form = /\bRACK\b|\bR\d{3}/.test(k) && !/\bTOWER\b/.test(k) ? 'Rack' : /\bTOWER\b|\bT\d{3}\b|\bML\d{2,3}\b/.test(k) ? 'Tower' : '';
      const parts: Part[] = [{ text: 'Server', p: 0 }, { text: brand, p: 0 }, { text: model, p: 0 }, ...(form && !model.includes(form) ? [{ text: form, p: 1 as const }] : []), ...(pn ? [pn] : [])];
      return { parts, web2: slash([ex.cpu, ex.ram, ex.storage.join(' + ') || undefined, ex.watt, ex.os, months(ex.warrantyMonths)]) };
    }
    case 'monitor': {
      const label = renderer === 'monitor' && typeLabel === 'Tivi' ? 'Tivi' : 'Màn hình';
      const feat = features(k, [[/\bGAMING\b|\bLEGION\b|\bROG\b|\bODYSSEY\b/, 'Gaming'], [/\bCONG\b|CURVED/, 'Cong'], [/CAM UNG|\bTOUCH\b(?!\s*ID)/, 'Cảm ứng']]);
      const parts: Part[] = [{ text: label, p: 0 }, ...feat, { text: brand, p: 0 }, { text: model, p: 0 }];
      if (ex.screenSize) parts.push({ text: `${ex.screenSize}"`, p: 1 });
      if (ex.resolution) parts.push({ text: ex.resolution, p: 2 });
      if (ex.hz) parts.push({ text: ex.hz, p: 2 });
      if (pn) parts.push(pn);
      const w2 = slash([ex.screenSize ? `${ex.screenSize} inch` : undefined, ex.resolution, ex.responseMs, ex.hz, ex.brightness, ex.panel], ' / ');
      return { parts, web2: w2 };
    }
    case 'storage': {
      const iface = /\bNVME\b/.test(k) ? 'NVMe' : /\bNLSAS\b|NEAR ?LINE SAS/.test(k) ? 'NL-SAS' : /\bSAS\b/.test(k) ? 'SAS' : /\bSATA\b/.test(k) ? 'SATA' : '';
      const rpm = /\b(\d{1,2}(?:\.\d)?K)\b(?:\s*RPM)?/.exec(k)?.[1] ?? (/\b(\d{4,5})\s*RPM\b/.exec(k)?.[1] ? `${/\b(\d{4,5})\s*RPM\b/.exec(k)![1]}rpm` : '');
      const form = /\b2[.,]5\s*(?:"|IN|INCH|INCHE)?\b|\bSFF\b/.test(k) ? '2.5"' : /\b3[.,]5\s*(?:"|IN|INCH)?\b|\bLFF\b/.test(k) ? '3.5"' : /\bM\.2\b/.test(k) ? 'M.2' : '';
      const label = typeLabel === 'SSD' || /\bSSD\b/.test(k) ? 'SSD' : 'HDD';
      const parts: Part[] = [{ text: label, p: 0 }, { text: brand, p: 0 }, { text: model, p: 0 }];
      if (ex.capacity && !model.includes(ex.capacity)) parts.push({ text: ex.capacity, p: 0 });
      if (iface && !model.toUpperCase().includes(iface.toUpperCase())) parts.push({ text: iface, p: 1 });
      if (rpm) parts.push({ text: rpm, p: 2 });
      if (form) parts.push({ text: form, p: 2 });
      if (pn) parts.push(pn);
      return { parts, web2: '' };
    }
    case 'ram': {
      const laptop = /SODIMM|\bNB\b|LAPTOP|XACH TAY/.test(k);
      const gen = /\b(?:TRU)?DDR([345])L?\b|\bD([345])\b|\bPC([345])L?\b|\bD([345])-/.exec(k);
      const speed = /\b(?:DDR[345]-?|PC[345]-?|BUS\s*)?(\d{4})\s*(?:MHZ|MT\/S|AA|V|B)?\b/.exec(k.replace(/\b(1[0-9]{4}|2[0-9]{4})\b/g, ''));
      const ecc = /\bRDIMM\b|REGISTERED|-R\b/.test(k) ? 'ECC RDIMM' : /\bECC\b/.test(k) ? 'ECC' : '';
      const parts: Part[] = [{ text: laptop ? 'RAM Laptop' : 'RAM', p: 0 }, { text: brand, p: 0 }, { text: model, p: 0 }];
      if (ex.capacity && !model.includes(ex.capacity)) parts.push({ text: ex.capacity, p: 0 });
      const g = gen && (gen[1] ?? gen[2] ?? gen[3] ?? gen[4]);
      if (g) parts.push({ text: `DDR${g}`, p: 1 });
      if (speed && Number(speed[1]) >= 1066 && Number(speed[1]) <= 9600) parts.push({ text: `${speed[1]}MHz`, p: 2 });
      if (ecc) parts.push({ text: ecc, p: 2 });
      if (pn) parts.push(pn);
      return { parts, web2: '' };
    }
    case 'cpu': {
      const name = ex.cpu ?? model;
      const parts: Part[] = [{ text: 'CPU', p: 0 }, { text: ex.cpu ? brand || (/XEON|CORE/.test(ex.cpu.toUpperCase()) ? 'Intel' : /RYZEN/i.test(ex.cpu) ? 'AMD' : '') : brand, p: 0 }, { text: name, p: 0 }];
      if (/\bTRAY\b/.test(k)) parts.push({ text: 'Tray', p: 2 });
      if (pn) parts.push(pn);
      return { parts, web2: '' };
    }
    case 'psu': {
      const label = /MAY CHU|SERVER|HOT[- ]?PLUG|FLEX SLOT|POWEREDGE|THINKSYSTEM|R\d{3}\b/.test(k) ? 'Nguồn máy chủ' : 'Nguồn máy tính';
      const parts: Part[] = [{ text: label, p: 0 }, { text: brand, p: 0 }, { text: model, p: 0 }];
      if (ex.watt && !model.includes(ex.watt)) parts.push({ text: ex.watt, p: 0 });
      const cert = /80\s*PLUS\s*(BRONZE|GOLD|PLATINUM|TITANIUM)|\b(PLATINUM|PLATIUM|GOLD|BRONZE)\b/.exec(k);
      if (cert) parts.push({ text: (cert[1] ?? cert[2]).replace('PLATIUM', 'PLATINUM').replace(/^(\w)(\w+)$/, (_, a, b) => a + b.toLowerCase()), p: 2 });
      if (pn) parts.push(pn);
      return { parts, web2: '' };
    }
    case 'ink': {
      let label = typeLabel;
      if (/HOP MUC|TONER/.test(k)) label = 'Hộp mực';
      else if (/LO MUC|BOTTLE/.test(k)) label = 'Mực in';
      else if (/RUY BANG/.test(k)) label = 'Ruy băng mực';
      else if (/TRONG|DRUM/.test(k)) label = 'Drum';
      else if (/PHOTOCOPY/.test(k)) label = 'Mực photocopy';
      else label = 'Mực in';
      const parts: Part[] = [{ text: label, p: 0 }, { text: brand, p: 0 }, { text: model, p: 0 }];
      if (pn) parts.push(pn);
      if (ex.color) parts.push({ text: `- ${ex.color}`, p: 1 });
      return { parts, web2: '' };
    }
    case 'printer': {
      const tech = /\bLASER\b/.test(k) ? 'laser' : /\bPHUN\b|INKJET|\bINK TANK\b/.test(k) ? 'phun' : /\bBILL\b|POS PRINTER/.test(k) ? 'bill' : /MA VACH|\bTEM\b/.test(k) ? 'mã vạch' : '';
      const fn = /DA NANG|DA CHUC NANG|\bMFP\b/.test(k) ? 'đa năng' : '';
      const color = /\bMAU\b|\bCOLOR\b/.test(k) && tech === 'phun' ? 'màu' : '';
      const label = /PHOTOCOPY/.test(k) ? 'Máy photocopy' : ['Máy in', tech, color, fn].filter(Boolean).join(' ');
      const parts: Part[] = [{ text: label, p: 0 }, { text: brand, p: 0 }, { text: model, p: 0 }];
      if (pn) parts.push(pn);
      return { parts, web2: '' };
    }
    case 'scanner': {
      const kind = /TAI LIEU/.test(k) ? 'Máy scan tài liệu' : 'Máy scan';
      return { parts: base(kind), web2: '' };
    }
    case 'ups': {
      const va = /\b(\d+(?:[.,]\d+)?)\s*K?VA\b/.exec(k);
      const tail: Part[] = [];
      const pw = [va ? va[0].replace(/\s+/g, '') : '', ex.watt ?? ''].filter(Boolean).join('/');
      if (pw) tail.push({ text: `- ${pw}`, p: 1 });
      if (/\bONLINE\b|ON-LINE/.test(k)) tail.push({ text: pw ? ', Online' : '- Online', p: 2 });
      return { parts: base(/^ON AP/.test(k) ? 'Ổn áp' : 'Bộ lưu điện UPS', [], tail), web2: '' };
    }
    case 'power_station': {
      const spec = [ex.watt, ex.wh].filter(Boolean).join(', ');
      const parts: Part[] = [{ text: 'Nguồn điện di động', p: 0 }, { text: brand, p: 0 }, { text: model, p: 0 }];
      if (spec) parts.push({ text: `– ${spec}`, p: 1 });
      if (pn) parts.push(pn);
      return { parts, web2: '' };
    }
    case 'software': {
      const dur = softwareDuration(k);
      const parts = base('Phần mềm', [], [...keySpecs('software', k, model), ...(dur ? [{ text: dur, p: 1 as const }] : [])]);
      return { parts, web2: '' };
    }
    default: {
      const tail = keySpecs(input.categoryId ?? '', k, model);
      if (ex.color && !key(model).includes(key(ex.color))) tail.push({ text: ex.color, p: 1 });
      // thông số/màu đứng trước P/N
      const parts = base(typeLabel);
      const pnIdx = pn ? parts.indexOf(pn) : parts.length;
      parts.splice(pnIdx, 0, ...tail);
      return { parts, web2: '' };
    }
  }
}

/** Thông số nhận diện tối thiểu cho nhóm chưa có công thức riêng: dung lượng VGA, chiều dài cáp, công suất sạc... */
function keySpecs(categoryId: string, k: string, model: string): Part[] {
  const mk = key(model);
  const add = (v: string | undefined): Part[] => (v && !mk.includes(key(v)) ? [{ text: v, p: 1 }] : []);
  let m: RegExpExecArray | null;
  switch (categoryId) {
    case 'vga':
      return add((m = /\b(\d{1,2})\s*GB?\b(?!\s*\/S)/.exec(k)) ? `${m[1]}GB` : undefined);
    case 'cable':
      return add((m = /\b(\d{1,2}(?:[.,]\d)?)\s*M\b/.exec(k)) ? `${m[1].replace(',', '.')}m` : undefined);
    case 'charger':
    case 'adapter':
      return add((m = /\b(\d{2,3})\s*W\b/.exec(k)) ? `${m[1]}W` : undefined);
    case 'powerbank': {
      const cap = (m = /\b(\d{4,5})\s*MAH\b/.exec(k)) ? `${m[1]}mAh` : undefined;
      return add(cap);
    }
    case 'software':
      return add((m = /\b(\d{1,4}(?:\s*-\s*\d{1,4})?)\s*(?:USERS?|NGUOI DUNG)\b/.exec(k)) ? `${m[1].replace(/\s+/g, '')} User` : undefined);
    case 'battery':
      return add((m = /\b(\d{2,3}(?:\.\d)?)\s*WH\b/.exec(k)) ? `${m[1]}Wh` : undefined);
    default:
      return [];
  }
}

export function softwareDuration(k: string): string {
  let m: RegExpExecArray | null;
  if ((m = /\b(\d{1,2})\s*-?\s*(?:MONTHS?|THANG)\b/.exec(k))) return `${m[1]} tháng`;
  if ((m = /\b(\d)\s*-?\s*(?:YEARS?|Y|NAM)\b/.exec(k))) return `${m[1]} năm`;
  if (/\bANNUAL\b|\bAN NUAL\b/.test(k)) return '1 năm';
  if (/\bPERPETUAL\b|\bVINH VIEN\b/.test(k)) return 'Vĩnh viễn';
  return '';
}
