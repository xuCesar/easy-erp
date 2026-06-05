import { useState } from 'react';
import type { PageNotice } from '../shared/types/pageNotice';
import { usePageNotice } from './usePageNotice';

export function useSubmitState(initialNotice: PageNotice | null = null) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const noticeState = usePageNotice(initialNotice);

  return {
    ...noticeState,
    isSubmitting,
    setIsSubmitting,
    startSubmitting(message: string, title?: string) {
      setIsSubmitting(true);
      noticeState.showWarning(message, title);
    },
    submitSucceeded(message: string, title?: string) {
      setIsSubmitting(false);
      noticeState.showSuccess(message, title);
    },
    submitFailed(error: unknown, fallback: string, title?: string) {
      setIsSubmitting(false);
      noticeState.showError(error, fallback, title);
    },
    finishSubmitting() {
      setIsSubmitting(false);
    },
  };
}
