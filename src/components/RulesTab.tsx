import { useMemo, useState, type ReactNode } from 'react';
import categoriesJson from '../../rules/categories.json';
import { QA_CODES } from '../engine';
import { key } from '../engine/normalize';
import { createSingle } from '../lib/createNames';
import { GUIDE_FILE_NAME, downloadGuide } from '../lib/guide';
import { toGuideItems } from '../lib/sheet';
import { useGuide } from '../lib/useGuide';
import { ExcelViewer, RunsText } from './ExcelViewer';
import { DownloadIcon, ExcelIcon, EyeIcon, SearchIcon } from './icons';
import { StatusBadge } from './ui';

const EXTRA_EXAMPLES = [
  'LAPTOP DELL INSPIRON 15 3520 I5-1235U 8GB 512GB MỚI 100%',
  'Chuột không dây Logitech M190 đen',
  'abc xyz',
];

const CATEGORIES = (categoriesJson as { categories: { id: string; label: string; formula: boolean }[] }).categories;

function Section({ n, title, children, open = false, right }: { n: number; title: string; children: ReactNode; open?: boolean; right?: ReactNode }) {
  return (
    <details open={open} className="group card overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-semibold text-slate-800 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm font-bold text-brand">{n}</span>
        {title}
        <span className="ml-auto flex items-center gap-3">
          {right}
          <span className="text-slate-400 transition group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-5 py-5 text-sm leading-relaxed text-slate-700">{children}</div>
    </details>
  );
}

const Code = ({ children }: { children: ReactNode }) => <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-800">{children}</code>;

function GuideDocCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-[#217346]" />
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#217346]"><ExcelIcon className="h-7 w-7" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">Tài liệu chuẩn đặt tên: {GUIDE_FILE_NAME}</p>
          <p className="text-sm text-slate-500">Công thức SEO chuẩn cho WEB 1 / WEB 2 theo từng ngành hàng, kèm ví dụ và tên hàng trên S1.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onOpen} className="btn-primary py-2!"><EyeIcon className="h-4 w-4" /> Xem file</button>
          <button onClick={downloadGuide} className="btn-secondary py-2!"><DownloadIcon className="h-4 w-4" /> Tải về</button>
        </div>
      </div>
    </div>
  );
}

function FormulaList() {
  const { data, error } = useGuide();
  const [q, setQ] = useState('');
  const items = useMemo(() => (data ? toGuideItems(data) : []), [data]);
  const shown = items.filter((x) => !q.trim() || key(`${x.category} ${x.formula1} ${x.formula2}`).includes(key(q.trim())));
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Đang đọc file Excel...</p>;
  return (
    <>
      <div className="relative max-w-xs">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Tìm trong ${items.length} ngành hàng...`} className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((x) => (
          <div key={x.category} className="rounded-xl border border-slate-200 p-4 transition hover:border-brand/40 hover:shadow-sm">
            <p className="mb-2 font-semibold text-brand">{x.category}</p>
            <dl className="space-y-1.5">
              <div><dt className="text-xs font-semibold uppercase text-slate-400">Web 1</dt><dd>{x.formula1}</dd></div>
              {x.formula2 && <div><dt className="text-xs font-semibold uppercase text-slate-400">Web 2</dt><dd>{x.formula2}</dd></div>}
              {x.example1.length > 0 && (
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase text-slate-400">Ví dụ</dt>
                  <dd className="text-slate-900"><RunsText runs={x.example1} /></dd>
                  {x.example2 && <dd className="text-slate-500">{x.example2}</dd>}
                </div>
              )}
            </dl>
          </div>
        ))}
      </div>
      {!shown.length && <p className="text-slate-400">Không có ngành hàng nào khớp.</p>}
    </>
  );
}

function Examples() {
  const { data } = useGuide();
  const fromFile = useMemo(
    () => (data ? toGuideItems(data).filter((x) => x.sourceName).map((x) => ({ source: x.sourceName, expected: x.example1.map((r) => r.text).join('').trim(), expected2: x.example2 })) : []),
    [data],
  );
  const list = [...fromFile, ...EXTRA_EXAMPLES.map((s) => ({ source: s, expected: '', expected2: '' }))];
  return (
    <div className="space-y-3">
      <p className="text-slate-500">Tên hàng trên S1 lấy từ file chuẩn, chạy qua tool để so sánh với tên chuẩn trong file.</p>
      {list.map(({ source, expected, expected2 }) => {
        const r = createSingle(source);
        return (
          <div key={source} className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Tên gốc</p>
            <p className="mb-3 break-words font-mono text-[13px] text-slate-700">{source}</p>
            <div className={`grid gap-3 ${expected ? 'md:grid-cols-2' : ''}`}>
              {expected && (
                <div className="rounded-lg bg-emerald-50/60 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase text-emerald-700">Tên chuẩn (file)</p>
                  <p className="font-medium">{expected}</p>
                  {expected2 && <p className="text-slate-600">{expected2}</p>}
                </div>
              )}
              <div className="rounded-lg bg-brand-soft/60 p-3">
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-brand">Tool tạo <StatusBadge status={r.status} /></p>
                <p className="font-medium">{r.web1 || '—'} <span className="text-xs font-normal text-slate-400">({r.web1.length}/70)</span></p>
                <p className="text-slate-600">{r.web2 || <span className="text-slate-400">(không có thông số)</span>}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RulesTab() {
  const [viewer, setViewer] = useState(false);
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <GuideDocCard onOpen={() => setViewer(true)} />
      <ExcelViewer open={viewer} onClose={() => setViewer(false)} />

      <Section n={1} title="Mỗi sản phẩm có 2 tên: WEB 1 và WEB 2" open>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-brand-soft/60 p-4">
            <p className="font-semibold text-brand">WEB 1 — Tên hiển thị</p>
            <p className="mt-1">Tối đa <b>70 ký tự</b>. Gồm <Code>Loại hàng + Hãng + Dòng/Model + (Part number)</Code>.</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-800">WEB 2 — Cấu hình / thông số</p>
            <p className="mt-1">Các thông số ngăn cách bằng <Code>/</Code>, ví dụ <Code>14 inch/ Core i5-1335U/ 8GB/ 512GB SSD</Code>.</p>
          </div>
        </div>
        <p>Tool chỉ dùng thông tin có trong tên gốc, <b>không tự bịa số liệu</b>. Nếu tên gốc thiếu thông tin, tool sẽ cảnh báo thay vì đoán.</p>
      </Section>

      <Section n={2} title="Cách tool dựng tên">
        <ol className="space-y-2">
          {[
            ['Làm sạch tên gốc', 'bỏ chữ thừa như "MỚI 100%", ký tự rác, ghi chú; chuẩn hóa chữ hoa/thường (ALL CAPS → viết đúng tên hãng, giữ nguyên mã model).'],
            ['Nhận diện nhóm hàng', 'theo từ khóa xuất hiện sớm nhất trong tên (Laptop, Màn hình, Chuột...).'],
            ['Tách thông tin', 'hãng, model, P/N, CPU, RAM, ổ cứng, VGA, màn hình, hệ điều hành, bảo hành...'],
            ['Ghép theo công thức', 'của nhóm hàng để ra WEB 1 và WEB 2.'],
            ['Rút gọn nếu quá 70 ký tự', 'bỏ phần phụ từ cuối lên; Loại hàng, Hãng, Model, P/N luôn được giữ.'],
            ['Kiểm tra', 'và gắn cảnh báo nếu thiếu hoặc nghi ngờ.'],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
              <span className="pt-0.5"><b>{t}</b>: {d}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section n={3} title="Công thức theo ngành hàng (từ file chuẩn)" open>
        <FormulaList />
      </Section>

      <Section n={4} title="Các nhóm hàng tool nhận diện">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <span key={c.id} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.formula ? 'bg-brand-soft text-brand' : 'bg-amber-50 text-amber-800'}`}>{c.label}</span>
          ))}
        </div>
        <p className="text-slate-500"><span className="rounded bg-brand-soft px-1.5 text-brand">Xanh</span>: đã có công thức đầy đủ. <span className="rounded bg-amber-50 px-1.5 text-amber-800">Vàng</span>: chưa có công thức chi tiết, luôn được đánh dấu "Cần xem lại".</p>
      </Section>

      <Section n={5} title="Trạng thái và mã cảnh báo">
        <div className="space-y-2">
          <p className="flex items-start gap-3"><StatusBadge status="PASS" /> <span>Đủ Loại + Hãng + Model/P-N, WEB 1 không quá 70 ký tự, không có số liệu lạ → dùng được.</span></p>
          <p className="flex items-start gap-3"><StatusBadge status="REVIEW" /> <span>Thiếu hãng/model, nhóm hàng chưa chắc, quá 70 ký tự, nhiều P/N... → nên xem lại.</span></p>
          <p className="flex items-start gap-3"><StatusBadge status="REJECT" /> <span>Tên gốc trống hoặc có số liệu không nằm trong tên gốc → nên sửa tên gốc rồi tạo lại.</span></p>
        </div>
        <p className="text-slate-500">Cảnh báo chỉ mang tính tham khảo, bạn vẫn quyết định có dùng tên hay không.</p>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-100">
              {Object.entries(QA_CODES).filter(([c]) => c !== 'EDIT').map(([code, text]) => (
                <tr key={code} className="hover:bg-slate-50"><td className="w-16 px-3 py-2 font-mono text-xs font-semibold text-brand">{code}</td><td className="px-3 py-2">{text}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section n={6} title="Ví dụ: tên gốc → WEB 1 / WEB 2">
        <Examples />
      </Section>
    </div>
  );
}
