import { useState } from 'react';
import type { QaWarning, Status } from '../engine';
import { copyText } from '../lib/copy';
import { STATUS_TEXT, friendly } from '../lib/warningText';
import { CheckIcon, CopyIcon } from './icons';

const BADGE: Record<Status, string> = {
  PASS: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REVIEW: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  REJECT: 'bg-red-50 text-red-700 ring-red-600/20',
};
const DOT: Record<Status, string> = { PASS: 'bg-emerald-500', REVIEW: 'bg-amber-500', REJECT: 'bg-red-500' };

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGE[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-sm ${DOT[status]}`} />
      {STATUS_TEXT[status].label}
    </span>
  );
}

export function CopyButton({ text, label = 'Sao chép', variant = 'default' }: { text: string; label?: string; variant?: 'default' | 'primary' | 'ghost' }) {
  const [done, setDone] = useState(false);
  const styles = {
    default: 'btn-secondary whitespace-nowrap',
    primary: 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40',
    ghost: 'inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-slate-400 transition hover:bg-brand-soft hover:text-brand',
  }[variant];
  return (
    <button
      type="button"
      disabled={!text}
      title={label}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }
      }}
      className={`${styles} ${done ? 'border-emerald-500! bg-emerald-50! text-emerald-700!' : ''}`}
    >
      {done ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className={variant === 'ghost' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {done ? 'Đã chép' : label}
    </button>
  );
}

const LEVEL_STYLE: Record<QaWarning['level'], string> = {
  reject: 'border-l-red-500 bg-red-50/70 text-red-900',
  review: 'border-l-amber-500 bg-amber-50/70 text-amber-900',
  info: 'border-l-slate-300 bg-slate-50 text-slate-700',
};
const LEVEL_ICON = { reject: '⛔', review: '⚠️', info: 'ℹ️' } as const;

export function WarningList({ warnings, compact = false }: { warnings: QaWarning[]; compact?: boolean }) {
  if (!warnings.length) return null;
  return (
    <ul className="space-y-2">
      {warnings.map((w, i) => {
        const f = friendly(w);
        return (
          <li key={i} className={`rounded-lg border-l-4 px-3 py-2 text-sm ${LEVEL_STYLE[w.level]}`}>
            <div className="font-semibold">{LEVEL_ICON[w.level]} {f.title}</div>
            <div className="opacity-90">{f.detail}</div>
            {!compact && <div className="mt-1 text-[13px] opacity-75">👉 {f.tip}</div>}
          </li>
        );
      })}
    </ul>
  );
}
