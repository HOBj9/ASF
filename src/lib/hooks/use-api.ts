/**
 * Custom hook for API calls
 * Reduces boilerplate and improves performance
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useApi<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    apiCall: () => Promise<Response>,
    options: UseApiOptions<T> = {}
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall();
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ط­ط¯ط« ط®ط·ط£');
      }

      if (options.successMessage) {
        toast.success(options.successMessage);
      }

      if (options.onSuccess) {
        options.onSuccess(data);
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.message || options.errorMessage || 'ط­ط¯ط« ط®ط·ط£';
      setError(errorMessage);
      
      if (options.onError) {
        options.onError(errorMessage);
      } else {
        toast.error(errorMessage);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

