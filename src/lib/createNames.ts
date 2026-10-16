import { nameBatch, nameRow, type NamingResult, type Status } from '../engine';

export interface NameOutput {
  mhh: string;
  source: string;
  web1: string;
  web2: string;
  status: Status;
  category: string;
  warnings: NamingResult['warnings'];
}

function toOutput(r: NamingResult): NameOutput {
  return {
    mhh: r.mhh,
    source: r.web1Old,
    web1: r.web1New,
    web2: r.web2New,
    status: r.status,
    category: r.category.label,
    warnings: r.warnings,
  };
}

/** Tab 1: không có MHH nên dùng mã tạm và bỏ các cảnh báo liên quan tới MHH. */
export function createSingle(source: string): NameOutput {
  const r = nameRow({ stt: 1, mhh: 'TMP', web1Old: source });
  const warnings = r.warnings.filter((w) => !['Q01', 'Q02', 'Q03'].includes(w.code));
  const status: Status = warnings.some((w) => w.level === 'reject') ? 'REJECT' : warnings.some((w) => w.level === 'review') ? 'REVIEW' : 'PASS';
  return { ...toOutput(r), warnings, status };
}

export function createList(rows: { mhh: string; name: string }[]): NameOutput[] {
  return nameBatch(rows.map((r, i) => ({ stt: i + 1, mhh: r.mhh, web1Old: r.name }))).map(toOutput);
}
