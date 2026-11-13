import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import { File } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { sharedPhotoNames, snapshot, summarize } from '@/data/sharing';
import type { CoachTargets } from '@/data/types';
import { useStore } from '@/data/store';
import { pushToken, sendPush } from '@/notify';
import { photoUri } from '@/photos';

import { cloudEnabled, PHOTO_BUCKET, supabase } from './supabase';

/**
 * Optional coach link. Signed-out users (everyone, by default) get the app
 * exactly as before: nothing leaves the phone. Once someone signs in and joins
 * a coach, their summary and data are copied to their row in Supabase a few
 * seconds after each change, plus progress photos if they chose to share them.
 */

export type Membership = { coachId: string; coachName: string; name: string; sharePhotos: boolean };
export type CoachInfo = { name: string; code: string };
/** A chat message between the client and their coach. */
export type Note = { id: string; body: string; created_at: string; read_at: string | null; from_client: boolean };

/** One food the meal-photo AI recognised. */
export type MealGuessItem = { name: string; portion: string; calories: number; protein: number };
export type MealGuess = { items: MealGuessItem[]; confidence: 'high' | 'medium' | 'low'; note: string };

type Cloud = {
  /** False when the build has no Supabase project configured. */
  enabled: boolean;
  /** True once the saved sign-in (if any) has been restored. */
  ready: boolean;
  userId: string | null;
  membership: Membership | null;
  coach: CoachInfo | null;
  /** The conversation with the coach, newest first. */
  notes: Note[];
  lastSyncedAt: number | null;
  /** Sign in with Apple (iPhone). Resolves false if the user cancelled. */
  signIn: () => Promise<boolean>;
  /** Sign in with Google in a browser sheet (Android). Resolves false if the user cancelled. */
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  joinCoach: (code: string, name: string, sharePhotos: boolean) => Promise<string>;
  setSharePhotos: (on: boolean) => Promise<void>;
  leaveCoach: () => Promise<void>;
  becomeCoach: (name: string) => Promise<string>;
  deleteAccount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  /** Marks every coach message read (opening the chat). */
  markAllRead: () => Promise<void>;
  /** Sends a message to the coach (and a notification to their phone). */
  sendToCoach: (body: string) => Promise<void>;
  /** Estimates a meal from a photo (base64 JPEG). Works without an account. */
  analyzeMeal: (base64: string, diet?: string) => Promise<MealGuess>;
  /** Asks the AI assistant; works without an account. Resolves to its reply. */
  askAssistant: (turns: { role: 'user' | 'assistant'; content: string }[], context: string) => Promise<string>;
};

const Ctx = createContext<Cloud | null>(null);

const uploadedKey = (uid: string) => `fat2flat.uploaded.${uid}`;

async function removeAllPhotos(uid: string) {
  if (!supabase) return;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).list(uid, { limit: 1000 });
  if (data?.length) await supabase.storage.from(PHOTO_BUCKET).remove(data.map((f) => `${uid}/${f.name}`));
  await AsyncStorage.removeItem(uploadedKey(uid)).catch(() => {});
}

/** Uploads shared photos not yet in the cloud and removes ones no longer shared. */
async function syncPhotos(uid: string, names: string[]) {
  if (!supabase) return;
  const want = new Set(names);
  const raw = await AsyncStorage.getItem(uploadedKey(uid)).catch(() => null);
  const uploaded = new Set<string>(raw ? JSON.parse(raw) : []);
  for (const name of want) {
    if (uploaded.has(name)) continue;
    const file = new File(photoUri(name));
    if (!file.exists) continue;
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(`${uid}/${name}`, await file.arrayBuffer(), { contentType: 'image/jpeg', upsert: true });
    if (!error) uploaded.add(name);
  }
  const stale = [...uploaded].filter((n) => !want.has(n));
  if (stale.length) {
    await supabase.storage.from(PHOTO_BUCKET).remove(stale.map((n) => `${uid}/${n}`));
    stale.forEach((n) => uploaded.delete(n));
  }
  await AsyncStorage.setItem(uploadedKey(uid), JSON.stringify([...uploaded])).catch(() => {});
}

/**
 * Calls one of our edge functions. AI features work for everyone: without an
 * account, a guest session identifies the phone for fair-use limits.
 */
async function callFunction(sb: NonNullable<typeof supabase>, name: string, body: unknown, fallback: string) {
  const { data: s } = await sb.auth.getSession();
  if (!s.session) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) throw new Error('This isn’t available right now. Please try again later.');
  }
  const { data, error } = await sb.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const msg = ctx ? ((await ctx.json().catch(() => null)) as { error?: string } | null)?.error : null;
    throw new Error(msg ?? fallback);
  }
  return data;
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const { state, ready: storeReady, applyCoachTargets } = useStore();
  const [ready, setReady] = useState(!cloudEnabled);
  const [userId, setUserId] = useState<string | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [coach, setCoach] = useState<CoachInfo | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const sentToken = useRef<string | null>(null);

  // restore the saved sign-in and follow changes to it
  useEffect(() => {
    if (!supabase) return;
    // a guest session (used only for meal photos) is not "signed in" for coach features
    const realUser = (u?: { id: string; is_anonymous?: boolean } | null) => (u && !u.is_anonymous ? u.id : null);
    supabase.auth.getSession().then(({ data }) => {
      setUserId(realUser(data.session?.user));
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUserId(realUser(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setMembership(null);
      setCoach(null);
      setNotes([]);
      return;
    }
    const [mine, coachRow, inbox] = await Promise.all([
      supabase.from('clients').select('coach_id, name, share_photos, coach_targets').eq('user_id', userId).maybeSingle(),
      supabase.from('coaches').select('name, code').eq('user_id', userId).maybeSingle(),
      supabase.from('messages').select('id, body, created_at, read_at, from_client').eq('client_id', userId).order('created_at', { ascending: false }).limit(60),
    ]);
    // a failed request (offline) keeps what we had rather than looking like "not joined"
    if (!mine.error) {
      if (mine.data) {
        const { data: c } = await supabase.from('coaches').select('name').eq('user_id', mine.data.coach_id).maybeSingle();
        setMembership({ coachId: mine.data.coach_id, coachName: c?.name ?? 'your coach', name: mine.data.name, sharePhotos: mine.data.share_photos });
        if (mine.data.coach_targets) applyCoachTargets(mine.data.coach_targets as CoachTargets);
      } else {
        setMembership(null);
      }
    }
    if (!coachRow.error) setCoach(coachRow.data ?? null);
    if (!inbox.error) setNotes((inbox.data ?? []) as Note[]);
  }, [userId, applyCoachTargets]);

  useEffect(() => {
    refresh().catch(() => {});
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh().catch(() => {});
    });
    return () => sub.remove();
  }, [refresh]);

  // keep the coach's copy current: a few seconds after any change
  useEffect(() => {
    if (!supabase || !userId || !membership || !storeReady) return;
    const sb = supabase;
    const timer = setTimeout(async () => {
      try {
        const now = Date.now();
        const snap = snapshot(state, now, membership.sharePhotos);
        const { data, error } = await sb
          .from('clients')
          .update({ summary: summarize(state, now), snapshot: snap, updated_at: new Date(now).toISOString() })
          .eq('user_id', userId)
          .select('user_id');
        if (error) return;
        if (!data?.length) {
          // the coach removed this client (or closed their account)
          setMembership(null);
          removeAllPhotos(userId).catch(() => {});
          return;
        }
        setLastSyncedAt(now);
        await syncPhotos(userId, membership.sharePhotos ? sharedPhotoNames(snap) : []);
      } catch {
        // offline: the next change or app open tries again
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [state, userId, membership, storeReady]);

  // let clients' replies reach the coach's phone
  const coachToken = useRef<string | null>(null);
  useEffect(() => {
    if (!supabase || !userId || !coach) return;
    pushToken().then((token) => {
      if (token && token !== coachToken.current) {
        coachToken.current = token;
        supabase!.from('coaches').update({ push_token: token }).eq('user_id', userId).then(() => {});
      }
    });
  }, [userId, coach]);

  // give the coach a way to reach this phone
  useEffect(() => {
    if (!supabase || !userId || !membership) return;
    pushToken().then((token) => {
      if (token && token !== sentToken.current) {
        sentToken.current = token;
        supabase!.from('clients').update({ push_token: token }).eq('user_id', userId).then(() => {});
      }
    });
  }, [userId, membership]);

  const value = useMemo<Cloud>(() => {
    const need = () => {
      if (!supabase) throw new Error('Coach features are not set up in this version.');
      return supabase;
    };
    const needUser = () => {
      if (!userId) throw new Error('Please sign in first.');
      return userId;
    };
    return {
      enabled: cloudEnabled,
      ready,
      userId,
      membership,
      coach,
      notes,
      lastSyncedAt,

      async signIn() {
        const sb = need();
        if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) {
          throw new Error('Sign in with Apple is available on iPhone.');
        }
        try {
          const cred = await AppleAuthentication.signInAsync({
            requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
          });
          if (!cred.identityToken) throw new Error('Apple did not return a sign-in token. Please try again.');
          const { error } = await sb.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
          if (error) throw error;
          return true;
        } catch (e) {
          if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
          throw e;
        }
      },

      async signInWithGoogle() {
        const sb = need();
        // Google signs in on Supabase's page, which hands back a one-time code
        // through the app's own link (fat2flat://auth); the code becomes a session here.
        const redirectTo = Linking.createURL('auth');
        const { data, error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
        });
        if (error) throw error;
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success') return false;
        const params = new URL(result.url).searchParams;
        const problem = params.get('error_description') ?? params.get('error');
        if (problem) throw new Error(problem);
        const code = params.get('code');
        if (!code) throw new Error('Google sign-in did not finish. Please try again.');
        const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        return true;
      },

      async signOut() {
        await need().auth.signOut();
        sentToken.current = null;
        setMembership(null);
        setCoach(null);
        setNotes([]);
      },

      refresh,

      async joinCoach(code, name, sharePhotos) {
        const sb = need();
        needUser();
        const { data, error } = await sb.rpc('join_coach', { p_code: code, p_name: name, p_share_photos: sharePhotos });
        if (error) throw error;
        sentToken.current = null; // re-send the push address for the new coach row
        await refresh();
        return data as string;
      },

      async setSharePhotos(on) {
        const sb = need();
        const uid = needUser();
        const { error } = await sb.from('clients').update({ share_photos: on }).eq('user_id', uid);
        if (error) throw error;
        if (!on) await removeAllPhotos(uid);
        setMembership((m) => (m ? { ...m, sharePhotos: on } : m));
      },

      async leaveCoach() {
        const sb = need();
        const uid = needUser();
        await removeAllPhotos(uid);
        const { error } = await sb.from('clients').delete().eq('user_id', uid);
        if (error) throw error;
        setMembership(null);
        setNotes([]);
      },

      async becomeCoach(name) {
        const sb = need();
        needUser();
        const { data, error } = await sb.rpc('become_coach', { p_name: name });
        if (error) throw error;
        await refresh();
        return data as string;
      },

      async deleteAccount() {
        const sb = need();
        const uid = needUser();
        await removeAllPhotos(uid);
        const { error } = await sb.rpc('delete_my_account');
        if (error) throw error;
        await sb.auth.signOut().catch(() => {});
        sentToken.current = null;
        setMembership(null);
        setCoach(null);
        setNotes([]);
      },

      async markAllRead() {
        const sb = need();
        const uid = needUser();
        const at = new Date().toISOString();
        setNotes((ns) => ns.map((n) => (!n.from_client && !n.read_at ? { ...n, read_at: at } : n)));
        await sb.from('messages').update({ read_at: at }).eq('client_id', uid).eq('from_client', false).is('read_at', null);
      },

      async sendToCoach(body) {
        const sb = need();
        const uid = needUser();
        if (!membership) throw new Error('Join your coach first.');
        const text = body.trim();
        const { data, error } = await sb
          .from('messages')
          .insert({ coach_id: membership.coachId, client_id: uid, body: text, from_client: true })
          .select('id, body, created_at, read_at, from_client')
          .single();
        if (error) throw error;
        setNotes((ns) => [data as Note, ...ns]);
        const { data: c } = await sb.rpc('my_coach');
        const token = (c as { push_token: string | null }[] | null)?.[0]?.push_token;
        if (token) await sendPush(token, membership.name, text);
      },

      async analyzeMeal(base64, diet) {
        const data = await callFunction(need(), 'analyze-meal', { image: base64, diet: diet ?? null }, 'Couldn’t read that photo. Check your connection and try again.');
        return data as MealGuess;
      },

      async askAssistant(turns, context) {
        const data = await callFunction(need(), 'assistant', { messages: turns, context }, 'Couldn’t reach the assistant. Check your connection and try again.');
        return String((data as { reply?: string }).reply ?? '');
      },

      async markRead(id) {
        const sb = need();
        const at = new Date().toISOString();
        setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, read_at: at } : n)));
        await sb.from('messages').update({ read_at: at }).eq('id', id);
      },
    };
  }, [ready, userId, membership, coach, notes, lastSyncedAt, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCloud() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCloud must be used inside <CloudProvider>');
  return v;
}
