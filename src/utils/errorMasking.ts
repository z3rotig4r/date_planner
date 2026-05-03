import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

/**
 * Masks detailed database errors to prevent system information leakage.
 * Logs the full error to the console only in development mode.
 */
export const handleSupabaseError = (error: PostgrestError | Error | null, customMessage: string) => {
  if (!error) return;

  // Log full error for developers
  if (import.meta.env.DEV) {
    console.error(`[Security Debug] ${customMessage}:`, error);
  }

  // Provide a generic, safe message to the user
  const safeMessage = customMessage || '요청을 처리하는 중 오류가 발생했습니다.';
  toast.error(safeMessage);

  return safeMessage;
};
