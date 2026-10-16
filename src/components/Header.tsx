import logoChinhNhan from '../assets/logo-chinh-nhan.png';
import logoNguyenKim from '../assets/logo-nguyen-kim.png';

export type TabId = 'single' | 'list' | 'rules';

const TABS: { id: TabId; label: string }[] = [
  { id: 'single', label: 'Tạo tên' },
  { id: 'list', label: 'Tạo tên theo danh sách' },
  { id: 'rules', label: 'Quy tắc & ví dụ' },
];

export function Header({ tab, onTab }: { tab: TabId; onTab: (t: TabId) => void }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={logoNguyenKim} alt="Nguyên Kim" className="h-9 w-auto" />
          <img src={logoChinhNhan} alt="Chính Nhân" className="h-9 w-auto" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Tool đặt tên trên website</h1>
        <nav className="ml-auto flex gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                tab === t.id ? 'bg-white text-accent shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
