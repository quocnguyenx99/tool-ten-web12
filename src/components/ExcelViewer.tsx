import { useEffect, useMemo, useState } from 'react';
import { key } from '../engine/normalize';
import { GUIDE_FILE_NAME, downloadGuide } from '../lib/guide';
import type { Run, SheetCell } from '../lib/sheet';
import { useGuide } from '../lib/useGuide';
import { DownloadIcon, ExcelIcon, SearchIcon, XIcon } from './icons';

const PROMPT_COL = 7;

export function RunsText({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <span key={i} style={{ color: r.color && r.color !== '#1A1C1E' && r.color !== '#000000' ? r.color : undefined }} className={`${r.bold ? 'font-semibold' : ''} ${r.italic ? 'italic' : ''}`}>
          {r.text}
        </span>
      ))}
    </>
  );
}

/** Màu chữ của ô: bỏ qua đen/trắng mặc định để hợp nền sáng. */
const cellStyle = (c: SheetCell, width: number) => ({
  minWidth: width,
  maxWidth: width,
  backgroundColor: c.bg && c.bg !== '#FFFFFF' ? c.bg : undefined,
  color: c.bg && c.bg !== '#FFFFFF' && c.color ? c.color : undefined,
  textAlign: c.align,
});

export function ExcelViewer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, error } = useGuide();
  const [q, setQ] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const hidden = useMemo(() => new Set(showPrompt ? [] : [PROMPT_COL]), [showPrompt]);
  const px = (w: number) => Math.round(w * 6.5);
  const widthOf = (c: SheetCell) => {
    let w = 0;
    for (let i = c.col; i < c.col + c.colSpan; i++) if (!hidden.has(i)) w += px(data?.widths[i - 1] ?? 12);
    return w;
  };
  const visible = (cells: SheetCell[]) =>
    cells
      .map((c) => {
        let span = 0;
        for (let i = c.col; i < c.col + c.colSpan; i++) if (!hidden.has(i)) span++;
        return { ...c, colSpan: span };
      })
      .filter((c) => c.colSpan > 0);

  const head = data?.rows.filter((r) => r.index <= data.headerRows) ?? [];
  const body = useMemo(() => {
    const rows = data?.rows.filter((r) => r.index > data.headerRows) ?? [];
    const k = key(q.trim());
    return k ? rows.filter((r) => r.cells.some((c) => !hidden.has(c.col) && key(c.text).includes(k))) : rows;
  }, [data, q, hidden]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 backdrop-blur-sm sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={GUIDE_FILE_NAME} className="flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white"><ExcelIcon className="h-5 w-5" /></span>
            <div>
              <p className="font-semibold text-slate-900">{GUIDE_FILE_NAME}</p>
              <p className="text-xs text-slate-500">Chuẩn đặt tên theo ngành hàng{data ? ` · ${body.length} ngành hàng` : ''}</p>
            </div>
          </div>
          <div className="relative ml-auto">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm ngành hàng, công thức..." className="w-56 rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showPrompt} onChange={(e) => setShowPrompt(e.target.checked)} className="accent-brand" />
            Hiện cột Prompt cho AI
          </label>
          <button onClick={downloadGuide} className="btn-secondary"><DownloadIcon className="h-4 w-4" /> Tải về</button>
          <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><XIcon className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-50">
          {error && <p className="p-6 text-red-600">{error}</p>}
          {!data && !error && <p className="p-6 text-slate-500">Đang mở file Excel...</p>}
          {data && (
            <table className="border-separate border-spacing-0 bg-white text-[13px] leading-snug">
              <thead className="sticky top-0 z-20">
                {head.map((r) => (
                  <tr key={r.index}>
                    {visible(r.cells).map((c) => (
                      <th key={c.col} rowSpan={c.rowSpan} colSpan={c.colSpan} style={{ ...cellStyle(c, widthOf(c)), textAlign: 'center' }}
                        className={`border-b border-r border-slate-300 px-3 py-2 font-semibold whitespace-pre-wrap text-slate-900 ${c.col === 1 ? 'sticky left-0 z-10' : ''}`}>
                        {c.text}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {body.map((r) => (
                  <tr key={r.index} className="group">
                    {visible(r.cells).map((c) => (
                      <td key={c.col} rowSpan={c.rowSpan} colSpan={c.colSpan} style={cellStyle(c, widthOf(c))}
                        className={`border-b border-r border-slate-200 px-3 py-2 align-middle whitespace-pre-wrap break-words ${c.col === 1 ? 'sticky left-0 z-10 bg-white font-semibold' : 'group-hover:bg-blue-50/60'}`}>
                        <RunsText runs={c.runs} />
                      </td>
                    ))}
                  </tr>
                ))}
                {!body.length && <tr><td colSpan={99} className="px-4 py-8 text-center text-slate-400">Không tìm thấy dòng nào khớp "{q}".</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
