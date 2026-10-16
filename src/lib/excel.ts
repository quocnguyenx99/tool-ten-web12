import ExcelJS from 'exceljs';
import { key } from '../engine/normalize';
import type { NameOutput } from './createNames';
import { STATUS_TEXT, friendly } from './warningText';

const cellText = (v: ExcelJS.CellValue): string => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((r) => r.text).join('').trim();
    if ('text' in v) return String(v.text).trim();
    if ('result' in v) return String(v.result ?? '').trim();
    return '';
  }
  return String(v).trim();
};

const norm = (s: string) => key(s).replace(/[^A-Z0-9]/g, '');

export async function readList(file: File): Promise<{ mhh: string; name: string }[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('File Excel không có sheet nào.');
  let headerRow = 0;
  let colMhh = 0;
  let colName = 0;
  for (let r = 1; r <= Math.min(ws.rowCount, 10) && !headerRow; r++) {
    ws.getRow(r).eachCell((cell, c) => {
      const n = norm(cellText(cell.value));
      if (n === 'MAHH' || n === 'MHH' || n === 'MAHANGHOA') colMhh = c;
      if (n === 'TENHH' || n === 'TENHANGHOA') colName = c;
    });
    if (colMhh && colName) headerRow = r;
    else colMhh = colName = 0;
  }
  if (!headerRow) throw new Error('Không tìm thấy 2 cột "MãHH" và "TênHH" ở dòng tiêu đề. Vui lòng dùng đúng file mẫu.');
  const rows: { mhh: string; name: string }[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const mhh = cellText(row.getCell(colMhh).value);
    const name = cellText(row.getCell(colName).value);
    if (!mhh && !name) continue;
    rows.push({ mhh, name });
  }
  if (!rows.length) throw new Error('File không có dòng dữ liệu nào bên dưới tiêu đề.');
  return rows;
}

function download(buf: ArrayBuffer | ExcelJS.Buffer, name: string) {
  const url = URL.createObjectURL(new Blob([buf as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.columns = [{ header: 'MãHH', width: 28 }, { header: 'TênHH', width: 70 }];
  ws.addRow(['LAPTOP_DELL_15', 'LAPTOP DELL INSPIRON 15 3520 I5-1235U 8GB 512GB MỚI 100%']);
  ws.addRow(['CHUOT_LOGI_M190', 'Chuột không dây Logitech M190 đen']);
  ws.getRow(1).font = { bold: true };
  download(await wb.xlsx.writeBuffer(), 'File-mau-ten-hang-hoa.xlsx');
}

export async function exportResult(rows: NameOutput[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Ten tren web');
  ws.columns = [
    { header: 'MãHH', width: 26 },
    { header: 'Tên Web 1', width: 60 },
    { header: 'Tên Web 2', width: 70 },
    { header: 'Trạng thái', width: 14 },
    { header: 'Cảnh báo', width: 70 },
  ];
  for (const r of rows) {
    ws.addRow([r.mhh, r.web1, r.web2, STATUS_TEXT[r.status].label, r.warnings.filter((w) => w.level !== 'info').map((w) => friendly(w).title).join('; ')]);
  }
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  download(await wb.xlsx.writeBuffer(), 'Ten-tren-web-1-2.xlsx');
}
