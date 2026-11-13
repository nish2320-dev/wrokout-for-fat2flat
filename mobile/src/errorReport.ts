import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/cloud/supabase';

/**
 * Sends a JavaScript error to the app_errors table so problems can be fixed.
 * Only the message, stack, app version and phone type go: no names, emails or
 * user ids. At most a few per session, and it never throws.
 */

let sent = 0;

export function reportError(error: unknown, fatal: boolean, screen?: string) {
  if (!supabase || sent >= 5) return;
  sent += 1;
  try {
    const e = error as { message?: unknown; stack?: unknown } | null;
    supabase
      .from('app_errors')
      .insert({
        platform: Platform.OS,
        app_version: String(Constants.expoConfig?.version ?? '?').slice(0, 40),
        os_version: String(Platform.Version).slice(0, 40),
        fatal,
        message: String(e?.message ?? error ?? 'Unknown error').slice(0, 1000),
        stack: String(e?.stack ?? '').slice(0, 4000),
        ...(screen ? { screen: screen.slice(0, 200) } : {}),
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    // reporting must never cause a second problem
  }
}
