import logoChinhNhan from '../assets/logo-chinh-nhan.png';
import logoNguyenKim from '../assets/logo-nguyen-kim.png';
import { BookIcon, ListIcon, PenIcon } from './icons';

export type TabId = 'single' | 'list' | 'rules';

const TABS = [
  { id: 'single', label: 'Tạo tên', Icon: PenIcon },
  { id: 'list', label: 'Tạo theo danh sách', Icon: ListIcon },
  { id: 'rules', label: 'Quy tắc & ví dụ', Icon: BookIcon },
] as const;

export function Header({ tab, onTab }: { tab: TabId; onTab: (t: TabId) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="h-1 bg-linear-to-r from-hot via-brand to-brand" />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <img src={logoNguyenKim} alt="Nguyên Kim" className="h-10 w-auto" />
          <span className="h-8 w-px bg-slate-200" />
          <img src={logoChinhNhan} alt="Chính Nhân" className="h-8 w-auto" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight text-slate-900 sm:text-xl">
            Tool đặt tên <span className="text-brand">trên website</span>
          </h1>
          <p className="text-xs text-slate-500">Chuẩn hóa tên WEB 1 / WEB 2 theo quy tắc đặt tên</p>
        </div>
        <nav className="ml-auto flex w-full gap-1 rounded-xl bg-slate-100 p-1 sm:w-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-medium transition sm:flex-none sm:px-4 sm:text-sm ${
                tab === id ? 'bg-white text-brand shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="hidden h-4 w-4 sm:block" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
