import { useState } from 'react';
import type { PageNotice, PageNoticeTone } from '../shared/types/page-notice';
import { getErrorMessage } from '../shared/utils/error';

export function usePageNotice(initialNotice: PageNotice | null = null) {
  const [notice, setNotice] = useState<PageNotice | null>(initialNotice);

  function showNotice(tone: PageNoticeTone, message: string, title?: string) {
    setNotice({ tone, message, title });
  }

  return {
    notice,
    setNotice,
    clearNotice() {
      setNotice(null);
    },
    showNotice,
    showSuccess(message: string, title?: string) {
      showNotice('success', message, title);
    },
    showWarning(message: string, title?: string) {
      showNotice('warning', message, title);
    },
    showMuted(message: string, title?: string) {
      showNotice('muted', message, title);
    },
    showError(error: unknown, fallback: string, title?: string) {
      showNotice('danger', getErrorMessage(error, fallback), title);
    },
  };
}
