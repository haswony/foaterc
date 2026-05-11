import { useState, useCallback } from 'react';
import ConfirmDialog, { ConfirmOptions } from './ConfirmDialog';

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions | null;
    resolve?: (v: boolean) => void;
  }>({ open: false, options: null });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state.resolve?.(true);
    setState({ open: false, options: null });
  };
  const handleCancel = () => {
    state.resolve?.(false);
    setState({ open: false, options: null });
  };

  const ConfirmUI = (
    <ConfirmDialog
      open={state.open}
      options={state.options}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmUI };
}
