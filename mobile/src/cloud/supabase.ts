import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

/**
 * The connection used by the optional coach features. The project URL and
 * publishable key live in app.json (extra.supabaseUrl / extra.supabaseKey);
 * both are meant to be public, and row-level security in supabase/schema.sql
 * decides what each signed-in user can read or write. Without them the app
 * works exactly as before and the coach features stay hidden.
 */

const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl?: string; supabaseKey?: string };

export const cloudEnabled = !!extra.supabaseUrl && !!extra.supabaseKey;

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(extra.supabaseUrl!, extra.supabaseKey!, {
      auth: {
        // static web rendering has no window; the session only matters on the phone
        storage: typeof window === 'undefined' && Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Google sign-in returns a one-time code to the app rather than tokens in the link
        flowType: 'pkce',
      },
    })
  : null;

// refresh the sign-in token only while the app is open
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => {
    if (s === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const PHOTO_BUCKET = 'progress-photos';

/** Turns a Postgres/Supabase error into a sentence for an alert. */
export const errorText = (e: unknown) => {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/network|fetch/i.test(msg)) return 'No internet connection. Try again in a moment.';
  return msg.replace(/^.*?ERROR:\s*/, '');
};
