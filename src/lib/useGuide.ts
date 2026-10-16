import { useEffect, useState } from 'react';
import { loadGuide } from './guide';
import type { SheetData } from './sheet';

export function useGuide() {
  const [data, setData] = useState<SheetData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    loadGuide()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Không đọc được file Excel.'));
    return () => {
      alive = false;
    };
  }, []);
  return { data, error };
}
