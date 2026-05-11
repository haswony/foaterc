import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'warning' | 'info';
};

export default function ConfirmDialog({
  open,
  options,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onConfirm, onCancel]);

  if (!open || !options) return null;
  const tone = options.tone || 'danger';
  const tones = {
    danger: { btn: 'bg-red-600 hover:bg-red-700', icon: 'text-red-600 bg-red-50' },
    warning: { btn: 'bg-amber-600 hover:bg-amber-700', icon: 'text-amber-600 bg-amber-50' },
    info: { btn: 'bg-brand-600 hover:bg-brand-700', icon: 'text-brand-600 bg-brand-50' },
  } as const;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${tones[tone].icon}`}>
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-1">{options.title}</h3>
            {options.message && <p className="text-slate-600 text-[15px] leading-relaxed">{options.message}</p>}
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-2 border-t">
          <button onClick={onCancel} className="btn-ghost">
            {options.cancelText || 'إلغاء'}
          </button>
          <button onClick={onConfirm} className={`btn text-white ${tones[tone].btn}`}>
            {options.confirmText || 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  );
}
