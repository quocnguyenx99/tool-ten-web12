import { useState } from 'react';
import { createSingle, type NameOutput } from '../lib/createNames';
import { STATUS_TEXT } from '../lib/warningText';
import { SparkIcon } from './icons';
import { CopyButton, StatusBadge, WarningList } from './ui';

const SAMPLES = [
  'LAPTOP DELL INSPIRON 15 3520 I5-1235U 8GB 512GB MỚI 100%',
  'Chuột không dây Logitech M190 đen',
  'Màn hình Dell P2422H 24 inch FHD IPS',
];

function NameCard({ tag, title, value, max, empty }: { tag: string; title: string; value: string; max?: number; empty: string }) {
  const over = max !== undefined && value.length > max;
  const pct = max ? Math.min(100, (value.length / max) * 100) : 0;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-white">{tag}</span>
          <h3 className="font-semibold text-slate-700">{title}</h3>
        </div>
        <CopyButton text={value} variant="primary" />
      </div>
      <div className="px-4 py-4">
        {value ? (
          <p className="break-words text-lg font-medium leading-relaxed text-slate-900 select-all">{value}</p>
        ) : (
          <p className="text-slate-400 italic">{empty}</p>
        )}
        {max !== undefined && value && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-slate-100">
              <div className={`h-full rounded-sm transition-all ${over ? 'bg-red-500' : pct > 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-semibold tabular-nums ${over ? 'text-red-600' : 'text-slate-500'}`}>{value.length}/{max} ký tự</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SingleTab() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<NameOutput | null>(null);
  const [error, setError] = useState('');

  const run = (text = input) => {
    if (!text.trim()) {
      setError('Vui lòng nhập tên hàng hóa / tên gốc của sản phẩm.');
      setResult(null);
      return;
    }
    setError('');
    setResult(createSingle(text));
  };

  const problems = result?.warnings.filter((w) => w.level !== 'info') ?? [];
  const notes = result?.warnings.filter((w) => w.level === 'info') ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Tạo tên sản phẩm cho website</h2>
        <p className="mt-1 text-slate-500">Dán tên hàng hóa gốc, tool sẽ tạo tên <b className="text-brand">WEB 1</b> và <b className="text-brand">WEB 2</b> theo quy chuẩn.</p>
      </div>

      <section className="card p-4 sm:p-5">
        <label htmlFor="src" className="mb-2 block text-sm font-semibold text-slate-700">Tên hàng hóa / tên gốc của sản phẩm</label>
        <textarea
          id="src"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run(); }}
          placeholder="Ví dụ: LAPTOP DELL INSPIRON 15 3520 I5-1235U 8GB 512GB MỚI 100%"
          className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-[15px] outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
        />
        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={() => run()} className="btn-primary"><SparkIcon className="h-4 w-4" /> Tạo tên</button>
          {(input || result) && (
            <button onClick={() => { setInput(''); setResult(null); setError(''); }} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800">Xóa</button>
          )}
          <span className="ml-auto hidden text-xs text-slate-400 sm:inline"><kbd className="rounded border border-slate-300 bg-white px-1.5 font-sans">Ctrl</kbd> + <kbd className="rounded border border-slate-300 bg-white px-1.5 font-sans">Enter</kbd> để tạo nhanh</span>
        </div>
        {!result && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-medium text-slate-500">Thử nhanh với tên mẫu:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button key={s} onClick={() => { setInput(s); run(s); }} className="rounded-sm bg-brand-soft px-3 py-1 text-left text-xs text-brand transition hover:bg-brand hover:text-white">{s}</button>
              ))}
            </div>
          </div>
        )}
      </section>

      {result && (
        <section key={result.source} className="animate-fade-up space-y-4">
          <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <StatusBadge status={result.status} />
            <span className="text-sm text-slate-600">{STATUS_TEXT[result.status].hint}</span>
            <span className="ml-auto text-sm text-slate-500">Nhóm hàng: <b className="text-slate-800">{result.category}</b></span>
          </div>
          <NameCard tag="WEB 1" title="Tên hiển thị" value={result.web1} max={70} empty="Không tạo được tên WEB 1." />
          <NameCard tag="WEB 2" title="Cấu hình / thông số" value={result.web2} empty="Tên gốc không có thông số kỹ thuật để ghi cho WEB 2." />
          {problems.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-3 font-semibold text-slate-800">Cần lưu ý <span className="text-slate-400">({problems.length})</span></h3>
              <WarningList warnings={problems} />
              <p className="mt-3 text-xs text-slate-500">Đây chỉ là cảnh báo — bạn vẫn có thể sao chép và sử dụng tên nếu thấy phù hợp.</p>
            </div>
          )}
          {notes.length > 0 && (
            <details className="card px-4 py-3 text-sm text-slate-600">
              <summary className="cursor-pointer font-medium">Tool đã tự xử lý ({notes.length})</summary>
              <div className="mt-3"><WarningList warnings={notes} compact /></div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
