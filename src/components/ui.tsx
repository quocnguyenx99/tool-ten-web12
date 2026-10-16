import { useState } from 'react';
import type { Status } from '../engine';
import { copyText } from '../lib/copy';
import { STATUS_TEXT, friendly } from '../lib/warningText';
import type { QaWarning } from '../engine';

const BADGE: Record<Status, string> = {
  PASS: 'bg-emerald-100 text-emerald-800',
  REVIEW: 'bg-amber-100 text-amber-800',
  REJECT: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[status]}`}>{STATUS_TEXT[status].label}</span>;
}

export function CopyButton({ text, label = 'Sao chép', className = '' }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={!text}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }
      }}
      className={`rounded-md border px-3 py-1 text-sm font-medium transition disabled:opacity-40 ${
        done ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-700 hover:border-accent hover:text-accent'
      } ${className}`}
    >
      {done ? 'Đã chép ✓' : label}
    </button>
  );
}

const LEVEL_STYLE: Record<QaWarning['level'], string> = {
  reject: 'border-red-200 bg-red-50 text-red-900',
  review: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
};
const LEVEL_ICON = { reject: '⛔', review: '⚠️', info: 'ℹ️' } as const;

export function WarningList({ warnings, compact = false }: { warnings: QaWarning[]; compact?: boolean }) {
  if (!warnings.length) return null;
  return (
    <ul className="space-y-2">
      {warnings.map((w, i) => {
        const f = friendly(w);
        return (
          <li key={i} className={`rounded-lg border px-3 py-2 text-sm ${LEVEL_STYLE[w.level]}`}>
            <div className="font-semibold">{LEVEL_ICON[w.level]} {f.title}</div>
            <div>{f.detail}</div>
            {!compact && <div className="mt-0.5 opacity-80">→ {f.tip}</div>}
          </li>
        );
      })}
    </ul>
  );
}
