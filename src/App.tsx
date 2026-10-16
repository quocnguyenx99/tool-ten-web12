import { useState } from 'react';
import { Header, type TabId } from './components/Header';
import { ListTab } from './components/ListTab';
import { RulesTab } from './components/RulesTab';
import { SingleTab } from './components/SingleTab';

/** Mọi tab luôn được mount để chuyển tab không mất dữ liệu đang làm; tải lại trang (F5) thì sạch hoàn toàn. */
export function App() {
  const [tab, setTab] = useState<TabId>('single');
  return (
    <div className="min-h-screen">
      <Header tab={tab} onTab={setTab} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div hidden={tab !== 'single'}><SingleTab /></div>
        <div hidden={tab !== 'list'}><ListTab /></div>
        <div hidden={tab !== 'rules'}><RulesTab /></div>
      </main>
    </div>
  );
}
