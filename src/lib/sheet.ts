import ExcelJS from 'exceljs';

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
}

export interface SheetCell {
  col: number;
  runs: Run[];
  text: string;
  bg?: string;
  color?: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  rowSpan: number;
  colSpan: number;
}

export interface SheetRow {
  index: number;
  cells: SheetCell[];
}

export interface SheetData {
  name: string;
  widths: number[];
  headerRows: number;
  rows: SheetRow[];
}

/** Bảng màu theme mặc định của Office (bỏ qua tint). */
const THEME = ['#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'];

function toColor(c?: Partial<ExcelJS.Color>): string | undefined {
  if (!c) return undefined;
  if (c.argb && c.argb.length === 8) return `#${c.argb.slice(2)}`;
  if (typeof c.theme === 'number') return THEME[c.theme];
  return undefined;
}

function parseCell(cell: ExcelJS.Cell): { runs: Run[]; text: string } {
  const v = cell.value;
  if (v == null) return { runs: [], text: '' };
  if (typeof v === 'object' && 'richText' in v) {
    const runs = v.richText.map((r) => ({ text: r.text, bold: r.font?.bold, italic: r.font?.italic, color: toColor(r.font?.color) }));
    return { runs, text: runs.map((r) => r.text).join('') };
  }
  const text = typeof v === 'object' ? ('text' in v ? String(v.text) : 'result' in v ? String(v.result ?? '') : '') : String(v);
  return { runs: [{ text }], text };
}

/** Chuyển "B1:C1" -> toạ độ. */
function parseRange(r: string) {
  const [a, b] = r.split(':');
  const p = (s: string) => {
    const m = /^([A-Z]+)(\d+)$/.exec(s)!;
    const col = [...m[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    return { col, row: Number(m[2]) };
  };
  return { from: p(a), to: p(b ?? a) };
}

export async function parseSheet(buf: ArrayBuffer): Promise<SheetData> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  const colCount = ws.columnCount;
  const widths = Array.from({ length: colCount }, (_, i) => ws.getColumn(i + 1).width ?? 12);

  const spans = new Map<string, { rowSpan: number; colSpan: number }>();
  const covered = new Set<string>();
  let headerRows = 1;
  for (const m of ws.model.merges ?? []) {
    const { from, to } = parseRange(m);
    spans.set(`${from.row}:${from.col}`, { rowSpan: to.row - from.row + 1, colSpan: to.col - from.col + 1 });
    for (let r = from.row; r <= to.row; r++) for (let c = from.col; c <= to.col; c++) if (r !== from.row || c !== from.col) covered.add(`${r}:${c}`);
    if (from.row === 1) headerRows = Math.max(headerRows, to.row);
  }

  const rows: SheetRow[] = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const cells: SheetCell[] = [];
    for (let c = 1; c <= colCount; c++) {
      if (covered.has(`${r}:${c}`)) continue;
      const cell = row.getCell(c);
      const fill = cell.fill as ExcelJS.FillPattern | undefined;
      const span = spans.get(`${r}:${c}`) ?? { rowSpan: 1, colSpan: 1 };
      cells.push({
        col: c,
        ...parseCell(cell),
        bg: fill?.type === 'pattern' && fill.pattern === 'solid' ? toColor(fill.fgColor) : undefined,
        color: toColor(cell.font?.color),
        bold: cell.font?.bold,
        align: (cell.alignment?.horizontal as SheetCell['align']) ?? undefined,
        ...span,
      });
    }
    if (r > headerRows && cells.every((x) => !x.text.trim())) continue;
    rows.push({ index: r, cells });
  }
  return { name: ws.name, widths, headerRows, rows };
}

/** Dạng gọn để hiển thị: mỗi ngành hàng một dòng. Cột theo file: A ngành, B/C công thức, D/E ví dụ, F tên S1. */
export interface GuideItem {
  category: string;
  formula1: string;
  formula2: string;
  example1: Run[];
  example2: string;
  sourceName: string;
}

export function toGuideItems(data: SheetData): GuideItem[] {
  return data.rows
    .filter((r) => r.index > data.headerRows)
    .map((r) => {
      const at = (c: number) => r.cells.find((x) => x.col === c);
      return {
        category: (at(1)?.text ?? '').replace(/\s*\n\s*/g, ' ').trim(),
        formula1: at(2)?.text.trim() ?? '',
        formula2: at(3)?.text.trim() ?? '',
        example1: at(4)?.runs ?? [],
        example2: at(5)?.text.trim() ?? '',
        sourceName: at(6)?.text.trim() ?? '',
      };
    })
    .filter((x) => x.category);
}
