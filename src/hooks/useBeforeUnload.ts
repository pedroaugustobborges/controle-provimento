import { useEffect } from 'react';

/**
 * Blocks tab close / refresh while there are unsaved changes.
 * Browsers show a generic native dialog (custom messages no longer supported).
 */
export function useBeforeUnload(hasUnsavedChanges: boolean, message = 'Você tem alterações não salvas. Deseja realmente sair?') {
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy support
      e.returnValue = message;
      return message;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges, message]);
}
