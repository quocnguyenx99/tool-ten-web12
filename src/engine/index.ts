import { cleanPlaceholder, cleanRaw, looksLikePn } from './clean';
import {
  brandFromMhh, extractCapacity, extractCpu, extractInkColor, extractOs, extractPower, extractRam, extractScreen,
  extractColor, extractStorage, extractVga, findBrand,
} from './extract';
import { isAllCaps, key, nfc } from './normalize';
import { checkLength, conflictingPns, findUnsourcedNumbers, statusOf } from './qa';
import { fitTo70, render } from './render';
import { routeCategory } from './route';
import { loadRules, type Rules } from './rules';
import { leadingTypePhrase, modelTokens, tokenize } from './tokens';
import type { Extracted, InputRow, NamingResult, QaWarning } from './types';

export * from './types';
export { QA_CODES } from './qa';
export { loadRules, type Rules } from './rules';

const SOFTWARE_JUNK = new Set([
  'COMMERCIAL', 'NEW', 'SINGLE-USER', 'ELD', 'ANNUAL', 'SUBSCRIPTION', 'ALL', 'MULTIPLE', 'PLATFORMS', 'MULTI', 'ASIAN', 'LANGUAGES',
  'MULTIASIAN', 'LIC', 'BSP1', 'BSPL', 'AN', 'NUAL', '-', 'FOR', 'TEAMS', 'DSP', 'OEI', 'DVD', 'ENG', 'INTL', '1PK', '64BIT',
  'USER', 'USERS', 'VNM',
]);

/** Nhóm phụ kiện/ngoại vi giữ màu trong tên (theo file 02: "Chuột Logitech M190 Wireless Đen"). */
const COLOR_CATEGORIES = new Set([
  'mouse', 'keyboard', 'kbm', 'headset', 'speaker', 'webcam', 'projector', 'projector_acc', 'smartwatch', 'cable', 'charger',
  'adapter', 'powerbank', 'phone', 'tablet', 'label', 'smarthome', 'case', 'cooler', 'psu', 'presenter', 'scooter', 'office', 'printer',
]);

const SYSTEM_RENDERERS = new Set(['laptop', 'pc', 'aio', 'nuc', 'workstation', 'server']);

export function nameRow(row: InputRow, rules: Rules = loadRules()): NamingResult {
  const mhh = nfc(row.mhh);
  const raw = nfc(row.web1Old);
  const web2Old = cleanPlaceholder(row.web2Old);
  const warnings: QaWarning[] = [];
  const categoryColumn = nfc(row.category);

  const empty: Extracted = { pnCandidates: [], storage: [], features: [] };
  if (!mhh) {
    return {
      stt: row.stt, mhh, web1Old: raw, web2Old: web2Old.value, web1New: '', web2New: '',
      category: { id: 'unknown', label: 'Chưa xác định', confidence: 'low', source: 'unknown' }, categoryColumn,
      status: 'REJECT', warnings: [{ code: 'Q01', level: 'reject', message: 'MHH trống, không tạo output.' }], extracted: empty, cleaned: raw,
    };
  }
  if (!raw) {
    return {
      stt: row.stt, mhh, web1Old: raw, web2Old: web2Old.value, web1New: '', web2New: '',
      category: { id: 'unknown', label: 'Chưa xác định', confidence: 'low', source: 'unknown' }, categoryColumn,
      status: 'REJECT', warnings: [{ code: 'Q05', level: 'reject', message: 'Không có tên nguồn (WEB 1 CŨ trống).' }], extracted: empty, cleaned: raw,
    };
  }
  if (web2Old.placeholder) warnings.push({ code: 'Q04', level: 'info', message: 'WEB 2 cũ chỉ là số đơn lẻ, coi như trống.' });

  // S5 trước để biết có giữ thời hạn trong tên không (dịch vụ/phần mềm)
  const pre = cleanRaw(raw, { keepDuration: true });
  const route = routeCategory(pre.text, mhh, categoryColumn, rules);
  const keepDuration = route.id === 'software' || route.id === 'service';
  const cleaned = keepDuration ? pre : cleanRaw(raw);
  warnings.push(...cleaned.warnings);
  if (isAllCaps(raw)) warnings.push({ code: 'Q08', level: 'info', message: 'Tên nguồn ALL CAPS; đã chuẩn casing.' });

  const text = cleaned.text;
  const k = key(text);
  const renderer = route.rule?.renderer ?? 'generic';

  // Brand
  const hit = findBrand(text, rules);
  const ex: Extracted = { pnCandidates: cleaned.pnCandidates, storage: [], features: [] };
  if (hit) {
    ex.brand = hit.brand.name;
    ex.brandSource = 'name';
  } else {
    const b = brandFromMhh(mhh, rules);
    if (b) {
      ex.brand = b.name;
      ex.brandSource = 'mhh';
      warnings.push({ code: 'Q05', level: 'review', message: `Tên không có hãng; tạm lấy "${b.name}" theo mã hãng trong MHH, cần xác nhận.` });
    } else {
      warnings.push({ code: 'Q05', level: 'review', message: 'Không tìm thấy hãng (Brand) trong tên nguồn.' });
    }
  }

  // Specs (S6)
  ex.cpu = extractCpu(k);
  ex.storage = extractStorage(k);
  ex.ram = extractRam(k, ex.storage);
  ex.vga = extractVga(k);
  Object.assign(ex, extractScreen(k));
  const os = extractOs(k);
  ex.os = os.os;
  ex.osConflict = os.conflict;
  Object.assign(ex, extractPower(k));
  ex.warrantyMonths = cleaned.warrantyMonths;
  if (['storage', 'ram'].includes(renderer)) ex.capacity = extractCapacity(k);
  if (renderer === 'ink') ex.color = extractInkColor(k);
  else if (COLOR_CATEGORIES.has(route.id)) ex.color = extractColor(text);
  ex.modelField = cleaned.modelField;

  // Product type + Model
  const toks = tokenize(text);
  const lead = leadingTypePhrase(toks);
  let typeLabel = route.rule?.label ?? 'Sản phẩm';
  if ((route.rule?.labelFromName || route.id === 'unknown') && lead.phrase) typeLabel = lead.phrase;

  let mt0 = modelTokens(toks, hit, lead.endIndex, {
    allowNumbers: true,
    noSpecStop: renderer === 'software',
    extraSkip: renderer === 'software' ? SOFTWARE_JUNK : undefined,
    maxTokens: renderer === 'software' ? 7 : 6,
    skipLeadingSpecs: !SYSTEM_RENDERERS.has(renderer) && !['monitor', 'storage', 'ram', 'cpu', 'psu', 'ups', 'power_station'].includes(renderer),
  });
  // phần mềm: thời hạn và số user render riêng ("1 năm", "10-14 User")
  let mt = renderer === 'software' ? mt0.filter((t) => !/^\d+(Y|YR|YRS|M|MTH|MTHS)$/i.test(t) && !/^\d+-\d+$/.test(t)) : mt0;
  if (!SYSTEM_RENDERERS.has(renderer) && renderer !== 'monitor') {
    // linh kiện: bỏ token trùng thông số đã render riêng
    mt = mt.filter((t) => !/^\d+(\.\d+)?(GB|TB|W)$/i.test(t));
  }
  const modelField = cleaned.modelField ?? cleaned.leadingModel;
  if (modelField && !mt.some((t) => key(t).replace(/[^A-Z0-9]/g, '') === key(modelField).replace(/[^A-Z0-9]/g, ''))) {
    if (mt.length === 0 || route.rule?.labelFromName || !hit) mt.push(modelField);
  }
  // P/N
  const pns = conflictingPns(cleaned.pnCandidates);
  ex.pn = pns[0];
  if (pns.length > 1) {
    warnings.push({ code: 'Q06', level: 'review', message: `Tên có ${pns.length} P/N khác nhau: ${pns.join(', ')}. Engine dùng ${pns[0]}.` });
  }
  if (ex.pn) mt = mt.filter((t) => key(t).replace(/[^A-Z0-9]/g, '') !== key(ex.pn!).replace(/[^A-Z0-9]/g, ''));
  ex.model = mt.join(' ');

  // Tên không có Model/P-N: thử lấy đoạn cuối MHH nếu trông như P/N (file 02 cũng làm vậy: ASWD_1TB_WDS100T5G0A)
  if (!ex.model && !ex.pn) {
    const seg = mhh.split('_').slice(1).reverse().find((x) => x.length >= 6 && looksLikePn(x) && !/^\d+(GB|TB|W|M|CM)$/i.test(x));
    if (seg) {
      ex.pn = seg;
      warnings.push({ code: 'Q05', level: 'review', message: `Tên nguồn không có Model/P-N; tạm lấy "${seg}" từ MHH, cần xác nhận.` });
    }
  }
  if (!ex.model && !ex.pn && renderer !== 'cpu') {
    // linh kiện lưu trữ/RAM chỉ có thông số (dung lượng + chuẩn) vẫn định danh được; chỉ ghi chú
    const specOnly = ['storage', 'ram'].includes(renderer) && !!ex.capacity && /\b(SAS|SATA|NVME|DDR\d|\d+K\b|\d+MHZ)/.test(k);
    warnings.push({
      code: 'Q05',
      level: specOnly ? 'info' : 'review',
      message: specOnly ? 'Không có Model/P-N; tên dựng từ thông số (dung lượng, chuẩn giao tiếp).' : 'Không xác định được Model/P-N từ tên nguồn.',
    });
  }
  if (ex.osConflict) warnings.push({ code: 'Q06', level: 'review', message: `Nguồn có nhiều hệ điều hành: ${ex.osConflict.join(' + ')}.` });

  // S9 + S10
  const out = render({ renderer, categoryId: route.id, typeLabel, cleanedKey: k, modelTokens: mt, ex, rules });
  const fit = fitTo70(out.parts);
  const web1New = fit.text;
  const web2New = out.web2;
  if (fit.dropped.length) warnings.push({ code: 'S10', level: 'info', message: `Đã bỏ "${fit.dropped.join('", "')}" để WEB 1 <= 70 ký tự.` });
  const len = checkLength(web1New);
  if (len) warnings.push(len);

  // Q10 chống bịa số liệu
  const allowed = [ex.warrantyMonths ? String(ex.warrantyMonths) : '', '11', '2'].filter(Boolean); // "Windows 11", "2-in-1"
  const unsourced = findUnsourcedNumbers(`${web1New} ${web2New}`, ex.pn && !key(raw).includes(key(ex.pn)) ? `${raw} ${ex.pn}` : raw, allowed);
  if (unsourced.length) warnings.push({ code: 'Q10', level: 'reject', message: `Số liệu không có trong nguồn: ${unsourced.join(', ')}.` });

  // Q12
  if (route.id === 'unknown') warnings.push({ code: 'Q12', level: 'review', message: 'Không xác định được nhóm hàng từ tên, danh mục và MHH.' });
  else if (route.confidence === 'low') warnings.push({ code: 'Q12', level: 'review', message: `Nhóm "${route.label}" chỉ suy từ tiền tố MHH, độ tin cậy thấp.` });
  else if (route.rule && !route.rule.formula) warnings.push({ code: 'Q12', level: 'review', message: `Nhóm "${route.label}" chưa có công thức chi tiết trong guide; cần người duyệt.` });
  if (categoryColumn && route.rule?.column && !route.rule.column.some((c) => c.toLowerCase() === categoryColumn.toLowerCase()) && route.source === 'keyword') {
    warnings.push({ code: 'CAT', level: 'info', message: `Danh mục nguồn là "${categoryColumn}" nhưng tên cho thấy nhóm "${route.label}".` });
  }

  return {
    stt: row.stt, mhh, web1Old: raw, web2Old: web2Old.value, web1New, web2New,
    category: { id: route.id, label: route.label, confidence: route.confidence, source: route.source }, categoryColumn,
    status: statusOf(warnings), warnings, extracted: ex, cleaned: text,
  };
}

export function nameBatch(rows: InputRow[], rules: Rules = loadRules()): NamingResult[] {
  const results = rows.map((r) => nameRow(r, rules));
  const seen = new Map<string, NamingResult[]>();
  for (const r of results) {
    if (!r.mhh) continue;
    const list = seen.get(r.mhh.toUpperCase()) ?? [];
    list.push(r);
    seen.set(r.mhh.toUpperCase(), list);
  }
  for (const list of seen.values()) {
    if (list.length < 2) continue;
    const sameContent = list.every((r) => key(r.web1Old) === key(list[0].web1Old));
    for (const r of list) {
      r.warnings.push({
        code: 'Q03',
        level: sameContent ? 'review' : 'reject',
        message: `MHH xuất hiện ${list.length} lần trong batch${sameContent ? ' (cùng nội dung)' : ' với nội dung khác nhau'}.`,
      });
      r.status = statusOf(r.warnings);
    }
  }
  // Q03: hai MHH khác nhau ra cùng một WEB 1 -> khách khó phân biệt trên web
  const byName = new Map<string, NamingResult[]>();
  for (const r of results) {
    if (!r.web1New) continue;
    const k = key(`${r.web1New}||${r.web2New}`); // máy bộ khác cấu hình (WEB 2) thì không tính trùng
    byName.set(k, [...(byName.get(k) ?? []), r]);
  }
  for (const list of byName.values()) {
    const mhhs = [...new Set(list.map((r) => r.mhh.toUpperCase()))];
    if (mhhs.length < 2) continue;
    for (const r of list) {
      r.warnings.push({ code: 'Q03', level: 'review', message: `WEB 1 trùng với ${mhhs.length - 1} MHH khác (${mhhs.filter((m) => m !== r.mhh.toUpperCase()).slice(0, 3).join(', ')}); cân nhắc thêm P/N hoặc đặc điểm phân biệt.` });
      r.status = statusOf(r.warnings);
    }
  }
  return results;
}

/** Chạy lại QA khi người duyệt sửa tay WEB 1/WEB 2 trên giao diện. */
export function revalidate(result: NamingResult, web1New: string, web2New: string): NamingResult {
  const keep = result.warnings.filter((w) => !['Q07', 'Q10', 'S10', 'EDIT'].includes(w.code));
  const warnings: QaWarning[] = [...keep];
  const len = checkLength(web1New);
  if (len) warnings.push(len);
  const unsourced = findUnsourcedNumbers(`${web1New} ${web2New}`, result.web1Old, [String(result.extracted.warrantyMonths ?? ''), '11']);
  if (unsourced.length) warnings.push({ code: 'Q10', level: 'review', message: `Số liệu không có trong tên nguồn: ${unsourced.join(', ')} (người duyệt tự xác nhận).` });
  warnings.push({ code: 'EDIT', level: 'info', message: 'Người duyệt đã sửa tay.' });
  return { ...result, web1New, web2New, warnings, status: statusOf(warnings) };
}
