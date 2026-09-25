import { useCallback, useRef, useState } from "react";

/**
 * Hook to manage transaction submission state and prevent double-submissions.
 */
export function useTransactionSubmission<TArgs extends any[], TResult>(
  submitFn: (...args: TArgs) => Promise<TResult>
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const submit = useCallback(
    async (...args: TArgs) => {
      // Prevent duplicate submissions
      if (isSubmittingRef.current) {
        return;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {
        return await submitFn(...args);
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [submitFn]
  );

  return { submit, isSubmitting };
}
