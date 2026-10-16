import type { ReactNode } from 'react';
import categoriesJson from '../../rules/categories.json';
import { QA_CODES } from '../engine';
import { createSingle } from '../lib/createNames';
import { StatusBadge } from './ui';

const EXAMPLES = [
  'LAPTOP DELL INSPIRON 15 3520 I5-1235U 8GB 512GB MỚI 100%',
  'Màn hình Dell P2422H 24 inch FHD IPS',
  'Chuột không dây Logitech M190 đen',
  'Ổ CỨNG SSD SAMSUNG 970 EVO PLUS 1TB MZ-V7S1T0BW',
  'abc xyz',
];

const CATEGORIES = (categoriesJson as { categories: { id: string; label: string; formula: boolean }[] }).categories;

function Section({ n, title, children, open = false }: { n: number; title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 font-semibold text-slate-800">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs text-white">{n}</span>
        {title}
        <span className="ml-auto text-slate-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-700">{children}</div>
    </details>
  );
}

const Code = ({ children }: { children: ReactNode }) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-800">{children}</code>;

export function RulesTab() {
  const examples = EXAMPLES.map((s) => ({ s, r: createSingle(s) }));
  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <Section n={1} title="Mỗi sản phẩm có 2 tên: WEB 1 và WEB 2" open>
        <p><b>Tên WEB 1</b> là tên hiển thị chính, <b>tối đa 70 ký tự</b>, gồm: <Code>Loại hàng + Hãng + Model (+ P/N)</Code>.</p>
        <p><b>Tên WEB 2</b> là phần thông số kỹ thuật, các thông số ngăn cách bằng dấu <Code>/</Code>, ví dụ <Code>Core i5-1235U/ 8GB/ 512GB SSD</Code>.</p>
        <p>Tool chỉ dùng thông tin có trong tên gốc, <b>không tự bịa số liệu</b>. Nếu tên gốc không đủ thông tin, tool sẽ cảnh báo thay vì đoán.</p>
      </Section>

      <Section n={2} title="Cách tool dựng tên">
        <ol className="list-decimal space-y-1 pl-5">
          <li><b>Làm sạch</b> tên gốc: bỏ chữ thừa như "MỚI 100%", ký tự rác, ghi chú; chuẩn hóa chữ hoa/thường (ALL CAPS → viết đúng tên hãng, giữ nguyên mã model).</li>
          <li><b>Nhận diện nhóm hàng</b> theo từ khóa xuất hiện sớm nhất trong tên (Laptop, Màn hình, Chuột...).</li>
          <li><b>Tách thông tin</b>: hãng, model, P/N (part number), CPU, RAM, ổ cứng, VGA, màn hình, hệ điều hành, bảo hành...</li>
          <li><b>Ghép theo công thức của nhóm hàng</b> để ra WEB 1 và WEB 2.</li>
          <li><b>Rút gọn nếu quá 70 ký tự</b>: bỏ bớt phần phụ từ cuối lên; Loại hàng, Hãng, Model, P/N luôn được giữ lại.</li>
          <li><b>Kiểm tra</b> và gắn cảnh báo nếu thiếu hoặc nghi ngờ.</li>
        </ol>
      </Section>

      <Section n={3} title="Công thức theo nhóm hàng (ví dụ)">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="px-3 py-2">Nhóm</th><th className="px-3 py-2">WEB 1</th><th className="px-3 py-2">WEB 2</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td className="px-3 py-2">Laptop</td><td className="px-3 py-2">Laptop [Gaming] Hãng Model (P/N)</td><td className="px-3 py-2">Màn hình/ CPU/ RAM/ Ổ cứng/ VGA/ OS/ Bảo hành</td></tr>
              <tr><td className="px-3 py-2">PC, Mini PC, Workstation</td><td className="px-3 py-2">Loại Hãng Model (P/N)</td><td className="px-3 py-2">CPU/ RAM/ Ổ cứng/ VGA/ OS/ Bảo hành</td></tr>
              <tr><td className="px-3 py-2">Server</td><td className="px-3 py-2">Server Hãng Model [Rack/Tower] (P/N)</td><td className="px-3 py-2">CPU/ RAM/ Ổ cứng/ Công suất/ OS/ Bảo hành</td></tr>
              <tr><td className="px-3 py-2">Màn hình</td><td className="px-3 py-2">Màn hình [Gaming/Cong] Hãng Model Kích thước" (P/N)</td><td className="px-3 py-2">Kích thước/ Độ phân giải/ Tần số quét/ Tấm nền</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-slate-500">Các nhóm khác (chuột, bàn phím, SSD, RAM, camera...) cũng theo nguyên tắc Loại + Hãng + Model, thông số đặt ở WEB 2.</p>
      </Section>

      <Section n={4} title="Các nhóm hàng tool nhận diện">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <span key={c.id} className={`rounded-full px-2.5 py-0.5 text-xs ${c.formula ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}`}>{c.label}</span>
          ))}
        </div>
        <p className="text-slate-500"><span className="rounded bg-blue-50 px-1.5 text-blue-800">Xanh</span>: đã có công thức đầy đủ. <span className="rounded bg-amber-50 px-1.5 text-amber-800">Vàng</span>: chưa có công thức chi tiết, luôn được đánh dấu "Cần xem lại".</p>
      </Section>

      <Section n={5} title="Trạng thái và mã cảnh báo">
        <div className="space-y-1.5">
          <p><StatusBadge status="PASS" /> Đủ Loại + Hãng + Model/P-N, WEB 1 không quá 70 ký tự, không có số liệu lạ → dùng được.</p>
          <p><StatusBadge status="REVIEW" /> Thiếu hãng/model, nhóm hàng chưa chắc, quá 70 ký tự, nhiều P/N... → nên xem lại.</p>
          <p><StatusBadge status="REJECT" /> Tên gốc trống hoặc có số liệu không nằm trong tên gốc → nên sửa tên gốc rồi tạo lại.</p>
        </div>
        <p className="text-slate-500">Cảnh báo chỉ mang tính tham khảo, bạn vẫn quyết định có dùng tên hay không.</p>
        <table className="w-full text-left">
          <tbody className="divide-y divide-slate-100">
            {Object.entries(QA_CODES).filter(([c]) => c !== 'EDIT').map(([code, text]) => (
              <tr key={code}><td className="w-16 px-3 py-1.5 font-mono text-xs">{code}</td><td className="px-3 py-1.5">{text}</td></tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section n={6} title="Ví dụ: tên gốc → WEB 1 / WEB 2" open>
        <div className="space-y-3">
          {examples.map(({ s, r }) => (
            <div key={s} className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-500">Tên gốc: <span className="text-slate-800">{s}</span></p>
              <p className="mt-1"><b>WEB 1:</b> {r.web1} <span className="text-xs text-slate-400">({r.web1.length}/70)</span></p>
              <p><b>WEB 2:</b> {r.web2 || <span className="text-slate-400">(không có thông số)</span>}</p>
              <div className="mt-1.5 flex items-center gap-2"><StatusBadge status={r.status} /><span className="text-xs text-slate-500">{r.category}</span></div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
