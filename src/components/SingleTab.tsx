import { useState } from 'react';
import { createSingle, type NameOutput } from '../lib/createNames';
import { STATUS_TEXT } from '../lib/warningText';
import { CopyButton, StatusBadge, WarningList } from './ui';

function NameCard({ title, value, max, empty }: { title: string; value: string; max?: number; empty: string }) {
  const over = max !== undefined && value.length > max;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        <div className="flex items-center gap-3">
          {max !== undefined && value && (
            <span className={`text-xs font-medium ${over ? 'text-red-600' : 'text-slate-500'}`}>{value.length}/{max} ký tự</span>
          )}
          <CopyButton text={value} />
        </div>
      </div>
      {value ? (
        <p className="break-words rounded-lg bg-slate-50 px-3 py-2 text-lg font-medium text-slate-900">{value}</p>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-400">{empty}</p>
      )}
    </div>
  );
}

export function SingleTab() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<NameOutput | null>(null);
  const [error, setError] = useState('');

  const run = () => {
    if (!input.trim()) {
      setError('Vui lòng nhập tên hàng hóa / tên gốc của sản phẩm.');
      setResult(null);
      return;
    }
    setError('');
    setResult(createSingle(input));
  };

  const problems = result?.warnings.filter((w) => w.level !== 'info') ?? [];
  const notes = result?.warnings.filter((w) => w.level === 'info') ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="src" className="mb-2 block font-semibold text-slate-700">Nhập tên hàng hóa / tên gốc của sản phẩm</label>
        <textarea
          id="src"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run(); }}
          placeholder="Ví dụ: LAPTOP DELL INSPIRON 15 3520 I5-1235U 8GB 512GB MỚI 100%"
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
        <div className="mt-3 flex items-center gap-3">
          <button onClick={run} className="rounded-lg bg-accent px-6 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-700">Tạo tên</button>
          <button onClick={() => { setInput(''); setResult(null); setError(''); }} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-800">Xóa</button>
          <span className="ml-auto text-xs text-slate-400">Ctrl + Enter để tạo nhanh</span>
        </div>
      </section>

      {result && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={result.status} />
            <span className="text-sm text-slate-600">{STATUS_TEXT[result.status].hint}</span>
            <span className="ml-auto text-sm text-slate-500">Nhóm hàng nhận diện: <b className="text-slate-700">{result.category}</b></span>
          </div>
          <NameCard title="Tên trên WEB 1" value={result.web1} max={70} empty="Không tạo được tên WEB 1." />
          <NameCard title="Tên trên WEB 2" value={result.web2} empty="Không có thông số kỹ thuật để ghi cho WEB 2." />
          {problems.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-slate-700">Cần lưu ý ({problems.length})</h3>
              <WarningList warnings={problems} />
              <p className="mt-2 text-xs text-slate-500">Đây chỉ là cảnh báo, bạn vẫn có thể sao chép và sử dụng tên nếu thấy phù hợp.</p>
            </div>
          )}
          {notes.length > 0 && (
            <details className="text-sm text-slate-600">
              <summary className="cursor-pointer font-medium">Tool đã tự xử lý ({notes.length})</summary>
              <div className="mt-2"><WarningList warnings={notes} compact /></div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
