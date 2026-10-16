import { useMemo, useRef, useState } from 'react';
import type { Status } from '../engine';
import { createList, type NameOutput } from '../lib/createNames';
import { downloadTemplate, exportResult, readList } from '../lib/excel';
import { STATUS_TEXT } from '../lib/warningText';
import { DownloadIcon, ExcelIcon, UploadIcon } from './icons';
import { CopyButton, StatusBadge, WarningList } from './ui';

/** Hình mô phỏng file Excel mẫu (không cần ảnh ngoài). */
function ExcelSample() {
  const rows = [
    ['LAPTOP_DELL_15', 'LAPTOP DELL INSPIRON 15 3520 I5-1235U 8GB 512GB MỚI 100%'],
    ['CHUOT_LOGI_M190', 'Chuột không dây Logitech M190 đen'],
    ['SSD_SAM_970_1TB', 'Ổ CỨNG SSD SAMSUNG 970 EVO PLUS 1TB MZ-V7S1T0BW'],
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white text-xs shadow-sm select-none">
      <div className="flex items-center gap-2 bg-[#217346] px-3 py-1.5 text-white">
        <ExcelIcon className="h-4 w-4" /> File-mau-ten-hang-hoa.xlsx
      </div>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-2 py-1 text-slate-500">
        <span className="rounded border border-slate-300 bg-white px-2">A1</span>
        <span className="italic">fx</span>
        <span className="text-slate-700">MãHH</span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100 text-center text-slate-500">
            <th className="w-8 border border-slate-200" />
            <th className="w-2/5 border border-slate-200 py-0.5 font-normal">A</th>
            <th className="border border-slate-200 py-0.5 font-normal">B</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-200 bg-slate-100 text-center text-slate-500">1</td>
            <td className="border-2 border-[#217346] bg-emerald-50 px-2 py-1 font-bold">MãHH</td>
            <td className="border border-slate-200 bg-emerald-50 px-2 py-1 font-bold">TênHH</td>
          </tr>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border border-slate-200 bg-slate-100 text-center text-slate-500">{i + 2}</td>
              <td className="border border-slate-200 px-2 py-1">{r[0]}</td>
              <td className="border border-slate-200 px-2 py-1">{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-px border-t border-slate-200 bg-slate-100 px-2 pt-1 text-slate-500">
        <span className="rounded-t border-x border-t border-slate-300 bg-white px-3 py-0.5 font-medium text-[#217346]">Sheet1</span>
      </div>
    </div>
  );
}

const FILTERS: { id: 'ALL' | Status; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PASS', label: 'Đạt' },
  { id: 'REVIEW', label: 'Cần xem lại' },
  { id: 'REJECT', label: 'Có vấn đề' },
];

const STEPS = [
  <>Chuẩn bị file Excel <b>.xlsx</b> có 2 cột <b>MãHH</b> và <b>TênHH</b> (dòng 1 là tiêu đề) như hình mẫu.</>,
  <>Kéo thả hoặc bấm <b>Chọn file Excel</b> để tải lên.</>,
  <>Sao chép cả cột <b>Tên Web 1 / Tên Web 2</b> để dán hàng loạt, hoặc <b>Xuất Excel</b>.</>,
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
      <section className="card grid gap-6 p-5 md:grid-cols-[1fr_1.15fr]">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tạo tên hàng loạt từ Excel</h2>
          <ol className="mt-4 space-y-3">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          <button onClick={downloadTemplate} className="btn-secondary mt-5"><DownloadIcon className="h-4 w-4" /> Tải file mẫu</button>
        </div>
        <ExcelSample />
      </section>

      <section
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${drag ? 'border-brand bg-brand-soft' : 'border-slate-300 bg-white/70 hover:border-brand/50'}`}
      >
        <UploadIcon className={`mx-auto h-10 w-10 ${drag ? 'text-brand' : 'text-slate-400'}`} />
        <p className="mt-2 text-slate-600">{busy ? 'Đang xử lý...' : 'Kéo thả file Excel (.xlsx) vào đây, hoặc'}</p>
        <button disabled={busy} onClick={() => fileRef.current?.click()} className="btn-primary mt-3">Chọn file Excel</button>
        <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        {error && <p className="mx-auto mt-4 max-w-xl rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
      </section>

      {rows && (
        <section className="animate-fade-up space-y-3">
          <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ExcelIcon className="h-4 w-4 text-[#217346]" />
              <span className="font-medium">{fileName}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`rounded-full px-3 py-1 text-sm transition ${filter === f.id ? 'bg-brand text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:ring-brand'}`}>
                  {f.label} <span className="opacity-70">{counts[f.id]}</span>
                </button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <CopyButton text={col((r) => r.web1)} label="Chép cột Web 1" />
              <CopyButton text={col((r) => r.web2)} label="Chép cột Web 2" />
              <CopyButton text={tsv} label="Chép cả bảng" />
              <button onClick={() => exportResult(shown.map(({ r }) => r))} className="inline-flex items-center gap-1.5 rounded-lg bg-[#217346] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1a5c38]">
                <DownloadIcon className="h-4 w-4" /> Xuất Excel
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[4%]" /><col className="w-[15%]" /><col className="w-[29%]" /><col className="w-[35%]" /><col className="w-[17%]" />
              </colgroup>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2.5">#</th><th className="px-3 py-2.5">MãHH</th><th className="px-3 py-2.5">Tên Web 1</th><th className="px-3 py-2.5">Tên Web 2</th><th className="px-3 py-2.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ r, i }) => (
                  <RowView key={i} index={i} r={r} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
                ))}
                {!shown.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Không có dòng nào.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-slate-400">Dữ liệu chỉ nằm trên trình duyệt — tải lại trang sẽ mất, hãy sao chép hoặc xuất Excel trước khi đóng.</p>
        </section>
      )}
    </div>
  );
}

function RowView({ index, r, open, onToggle }: { index: number; r: NameOutput; open: boolean; onToggle: () => void }) {
  const problems = r.warnings.filter((w) => w.level !== 'info');
  const cell = 'break-words whitespace-normal px-3 py-2.5 align-top';
  return (
    <>
      <tr className="border-t border-slate-100 transition hover:bg-brand-soft/40">
        <td className={`${cell} text-slate-400 tabular-nums`}>{index + 1}</td>
        <td className={`${cell} font-mono text-xs text-slate-700`}>{r.mhh || <span className="text-red-500">(trống)</span>}</td>
        <td className={cell}>
          <div className="font-medium text-slate-900">{r.web1 || <span className="text-slate-400">—</span>}</div>
          {r.web1 && (
            <div className="mt-1 flex items-center gap-2">
              <CopyButton text={r.web1} label="chép" variant="ghost" />
              <span className={`text-[11px] tabular-nums ${r.web1.length > 70 ? 'font-semibold text-red-600' : 'text-slate-400'}`}>{r.web1.length}/70</span>
            </div>
          )}
        </td>
        <td className={cell}>
          <div className="text-slate-700">{r.web2 || <span className="text-slate-400">—</span>}</div>
          {r.web2 && <div className="mt-1"><CopyButton text={r.web2} label="chép" variant="ghost" /></div>}
        </td>
        <td className={cell}>
          <StatusBadge status={r.status} />
          {problems.length > 0 && (
            <button onClick={onToggle} className="mt-1.5 block text-xs font-medium text-brand hover:underline">{open ? 'Ẩn cảnh báo' : `Xem ${problems.length} cảnh báo`}</button>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50/80">
          <td />
          <td colSpan={4} className="px-3 pb-4 pt-1">
            <p className="mb-2 text-xs text-slate-500">Tên gốc: <span className="text-slate-700">{r.source || '(trống)'}</span> — {STATUS_TEXT[r.status].hint}</p>
            <WarningList warnings={problems} />
          </td>
        </tr>
      )}
    </>
  );
}
