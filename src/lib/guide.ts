import guideUrl from '../../docs/CHUAN_DAT_TEN_TITLE.xlsx?url';
import { parseSheet, type SheetData } from './sheet';

export const GUIDE_URL = guideUrl;
export const GUIDE_FILE_NAME = 'CHUAN_DAT_TEN_TITLE.xlsx';

let cache: Promise<SheetData> | null = null;

/** Đọc file chuẩn đặt tên trong docs/ (chỉ tải 1 lần mỗi lần mở trang). */
export function loadGuide(): Promise<SheetData> {
  cache ??= fetch(GUIDE_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Không tải được file (${r.status}).`);
      return r.arrayBuffer();
    })
    .then(parseSheet)
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}

export function downloadGuide() {
  const a = document.createElement('a');
  a.href = GUIDE_URL;
  a.download = GUIDE_FILE_NAME;
  a.click();
}
