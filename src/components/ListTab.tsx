import { useMemo, useRef, useState } from 'react';
import type { Status } from '../engine';
import { copyText } from '../lib/copy';
import { createList, type NameOutput } from '../lib/createNames';
import { downloadTemplate, exportResult, readList } from '../lib/excel';
import { STATUS_TEXT } from '../lib/warningText';
import { CopyButton, StatusBadge, WarningList } from './ui';

/** Hình mô phỏng file Excel mẫu (không cần ảnh ngoài). */
function ExcelSample() {
  const rows = [
    ['LAPTOP_DELL_15', 'LAPTOP DELL INSPIRON 15 3520 I5-1235U 8GB 512GB MỚI 100%'],
    ['CHUOT_LOGI_M190', 'Chuột không dây Logitech M190 đen'],
    ['SSD_SAM_970_1TB', 'Ổ CỨNG SSD SAMSUNG 970 EVO PLUS 1TB MZ-V7S1T0BW'],
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white text-xs shadow-sm select-none">
      <div className="flex items-center gap-2 bg-emerald-700 px-3 py-1 text-white">
        <span className="font-bold">X</span> File-mau-ten-hang-hoa.xlsx
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100 text-center text-slate-500">
            <th className="w-8 border border-slate-300" />
            <th className="w-2/5 border border-slate-300 py-0.5 font-normal">A</th>
            <th className="border border-slate-300 py-0.5 font-normal">B</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-300 bg-slate-100 text-center text-slate-500">1</td>
            <td className="border border-slate-300 bg-emerald-50 px-2 py-1 font-bold">MãHH</td>
            <td className="border border-slate-300 bg-emerald-50 px-2 py-1 font-bold">TênHH</td>
          </tr>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border border-slate-300 bg-slate-100 text-center text-slate-500">{i + 2}</td>
              <td className="border border-slate-300 px-2 py-1">{r[0]}</td>
              <td className="border border-slate-300 px-2 py-1">{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FILTERS: { id: 'ALL' | Status; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PASS', label: 'Đạt' },
  { id: 'REVIEW', label: 'Cần xem lại' },
  { id: 'REJECT', label: 'Có vấn đề' },
];

export function ListTab() {
  const [rows, setRows] = useState<NameOutput[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'ALL' | Status>('ALL');
  const [open, setOpen] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!/\.xlsx$/i.test(file.name)) {
      setError('Chỉ hỗ trợ file Excel .xlsx. Hãy lưu file ở định dạng .xlsx rồi thử lại.');
      return;
    }
    setBusy(true);
    try {
      const input = await readList(file);
      setRows(createList(input));
      setFileName(file.name);
      setFilter('ALL');
      setOpen(null);
    } catch (e) {
      setRows(null);
      setError(e instanceof Error ? e.message : 'Không đọc được file Excel.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const counts = useMemo(() => {
    const c = { ALL: rows?.length ?? 0, PASS: 0, REVIEW: 0, REJECT: 0 };
    rows?.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);

  const shown = useMemo(() => (rows ?? []).map((r, i) => ({ r, i })).filter(({ r }) => filter === 'ALL' || r.status === filter), [rows, filter]);
  const col = (f: (r: NameOutput) => string) => shown.map(({ r }) => f(r)).join('\n');
  const tsv = shown.map(({ r }) => [r.mhh, r.web1, r.web2].join('\t')).join('\n');

  return (
    <div className="space-y-5">
      <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Hướng dẫn nhanh</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
            <li>Chuẩn bị file Excel <b>.xlsx</b> có đúng 2 cột <b>MãHH</b> và <b>TênHH</b> (dòng 1 là tiêu đề), như hình mẫu.</li>
            <li>Tải file lên (kéo thả hoặc bấm chọn file).</li>
            <li>Nhận bảng <b>MãHH | Tên Web 1 | Tên Web 2</b>, sao chép cả cột để dán hàng loạt hoặc xuất Excel.</li>
          </ol>
          <button onClick={downloadTemplate} className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-accent hover:text-accent">⬇ Tải file mẫu</button>
        </div>
        <ExcelSample />
      </section>

      <section
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? 'border-accent bg-blue-50' : 'border-slate-300 bg-white'}`}
      >
        <p className="text-slate-600">{busy ? 'Đang xử lý...' : 'Kéo thả file Excel vào đây hoặc'}</p>
        <button disabled={busy} onClick={() => fileRef.current?.click()} className="mt-2 rounded-lg bg-accent px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Chọn file Excel</button>
        <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </section>

      {rows && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">{fileName}</span>
            <div className="flex gap-1">
              {FILTERS.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-full px-3 py-1 text-sm ${filter === f.id ? 'bg-accent text-white' : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:ring-accent'}`}>
                  {f.label} ({counts[f.id]})
                </button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <CopyButton text={col((r) => r.web1)} label="Sao chép cột Web 1" />
              <CopyButton text={col((r) => r.web2)} label="Sao chép cột Web 2" />
              <CopyButton text={tsv} label="Sao chép cả bảng" />
              <button onClick={() => exportResult(shown.map(({ r }) => r))} className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700">Xuất Excel</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[4%]" /><col className="w-[16%]" /><col className="w-[28%]" /><col className="w-[34%]" /><col className="w-[18%]" />
              </colgroup>
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-2 py-2">#</th><th className="px-2 py-2">MãHH</th><th className="px-2 py-2">Tên Web 1</th><th className="px-2 py-2">Tên Web 2</th><th className="px-2 py-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ r, i }) => {
                  const problems = r.warnings.filter((w) => w.level !== 'info');
                  return (
                    <RowView key={i} index={i} r={r} problems={problems} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
                  );
                })}
                {!shown.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Không có dòng nào.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function RowView({ index, r, problems, open, onToggle }: { index: number; r: NameOutput; problems: NameOutput['warnings']; open: boolean; onToggle: () => void }) {
  const cell = 'break-words whitespace-normal px-2 py-2 align-top';
  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-slate-50">
        <td className={`${cell} text-slate-400`}>{index + 1}</td>
        <td className={`${cell} font-mono text-xs`}>{r.mhh}</td>
        <td className={cell}>
          <div>{r.web1 || <span className="text-slate-400">—</span>}</div>
          {r.web1 && <CellCopy text={r.web1} />}
        </td>
        <td className={cell}>
          <div>{r.web2 || <span className="text-slate-400">—</span>}</div>
          {r.web2 && <CellCopy text={r.web2} />}
        </td>
        <td className={cell}>
          <StatusBadge status={r.status} />
          {problems.length > 0 && (
            <button onClick={onToggle} className="mt-1 block text-xs text-accent hover:underline">{open ? 'Ẩn cảnh báo' : `Xem ${problems.length} cảnh báo`}</button>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50">
          <td />
          <td colSpan={4} className="px-2 pb-3">
            <p className="mb-2 text-xs text-slate-500">Tên gốc: {r.source || '(trống)'} — {STATUS_TEXT[r.status].hint}</p>
            <WarningList warnings={problems} />
          </td>
        </tr>
      )}
    </>
  );
}

function CellCopy({ text }: { text: string }) {
  return (
    <button onClick={() => copyText(text)} className="mt-0.5 text-xs text-slate-400 hover:text-accent" title="Sao chép ô này">⧉ chép</button>
  );
}
