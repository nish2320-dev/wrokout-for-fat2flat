import type { ClientSummary, SharedSnapshot } from '@/data/sharing';
import { sendPush } from '@/notify';

import { PHOTO_BUCKET, supabase } from './supabase';

/** What the coach screens read. Row-level security limits every query to the coach's own clients. */

export type ClientRow = {
  user_id: string;
  name: string;
  share_photos: boolean;
  push_token: string | null;
  summary: ClientSummary | Record<string, never>;
  updated_at: string;
  joined_at: string;
};

export type ClientDetail = ClientRow & { snapshot: SharedSnapshot | Record<string, never> };

export type SentNote = { id: string; body: string; created_at: string; read_at: string | null };

const sb = () => {
  if (!supabase) throw new Error('Coach features are not set up in this version.');
  return supabase;
};

/** True once the client's phone has uploaded at least one summary. */
export const hasSummary = (s: ClientRow['summary']): s is ClientSummary => (s as ClientSummary).v === 1;

export async function listClients(coachId: string): Promise<ClientRow[]> {
  const { data, error } = await sb()
    .from('clients')
    .select('user_id, name, share_photos, push_token, summary, updated_at, joined_at')
    .eq('coach_id', coachId);
  if (error) throw error;
  return (data ?? []) as ClientRow[];
}

export async function getClient(clientId: string): Promise<ClientDetail | null> {
  const { data, error } = await sb()
    .from('clients')
    .select('user_id, name, share_photos, push_token, summary, snapshot, updated_at, joined_at')
    .eq('user_id', clientId)
    .maybeSingle();
  if (error) throw error;
  return data as ClientDetail | null;
}

export async function clientNotes(clientId: string): Promise<SentNote[]> {
  const { data, error } = await sb()
    .from('messages')
    .select('id, body, created_at, read_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as SentNote[];
}

export async function sendNote(coachId: string, coachName: string, client: Pick<ClientRow, 'user_id' | 'push_token'>, body: string) {
  const text = body.trim();
  const { error } = await sb().from('messages').insert({ coach_id: coachId, client_id: client.user_id, body: text });
  if (error) throw error;
  if (client.push_token) await sendPush(client.push_token, coachName, text);
}

export async function removeClient(clientId: string) {
  const { error } = await sb().from('clients').delete().eq('user_id', clientId);
  if (error) throw error;
}

/** Temporary links to a client's shared photos, keyed by file name. */
export async function photoUrls(clientId: string, names: string[]): Promise<Record<string, string>> {
  if (names.length === 0) return {};
  const { data } = await sb()
    .storage.from(PHOTO_BUCKET)
    .createSignedUrls(names.map((n) => `${clientId}/${n}`), 3600);
  const out: Record<string, string> = {};
  data?.forEach((d, i) => {
    if (d.signedUrl) out[names[i]] = d.signedUrl;
  });
  return out;
}
