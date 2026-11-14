import type { CoachWorkout, CoachWorkoutItem } from '@/data/coachWorkouts';
import type { ClientSummary, SharedSnapshot } from '@/data/sharing';
import type { CoachTargets } from '@/data/types';
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

export type ClientDetail = ClientRow & { snapshot: SharedSnapshot | Record<string, never>; coach_targets: CoachTargets | null };

export type SentNote = { id: string; body: string; created_at: string; read_at: string | null; from_client: boolean };

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
    .select('user_id, name, share_photos, push_token, summary, snapshot, coach_targets, updated_at, joined_at')
    .eq('user_id', clientId)
    .maybeSingle();
  if (error) throw error;
  return data as ClientDetail | null;
}

export async function clientNotes(clientId: string): Promise<SentNote[]> {
  const { data, error } = await sb()
    .from('messages')
    .select('id, body, created_at, read_at, from_client')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(60);
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

/** Clients with replies the coach hasn't read yet. */
export async function unreadReplies(coachId: string): Promise<Set<string>> {
  const { data } = await sb()
    .from('messages')
    .select('client_id')
    .eq('coach_id', coachId)
    .eq('from_client', true)
    .is('read_at', null);
  return new Set((data ?? []).map((r: { client_id: string }) => r.client_id));
}

export async function markRepliesRead(clientId: string) {
  await sb().from('messages').update({ read_at: new Date().toISOString() }).eq('client_id', clientId).eq('from_client', true).is('read_at', null);
}

/** Sets the client's daily calories, protein and (optionally) workouts per week; their app applies it on next open. */
export async function setTargets(clientId: string, t: { calorieGoal: number; proteinGoal: number; daysPerWeek: 3 | 4 | 5 | null; note: string }) {
  const { error } = await sb().rpc('set_client_targets', { p_client: clientId, p_targets: t });
  if (error) throw error;
}

/** Workouts the coach sent this client, newest first. */
export async function sentWorkouts(clientId: string): Promise<CoachWorkout[]> {
  const { data, error } = await sb()
    .from('coach_workouts')
    .select('id, name, note, items, created_at, done_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as CoachWorkout[];
}

/** Sends a workout to each client and lets their phones know. Returns how many got it. */
export async function sendWorkout(
  coachName: string,
  clients: Pick<ClientRow, 'user_id' | 'push_token'>[],
  w: { name: string; note: string; items: CoachWorkoutItem[] },
) {
  const { data, error } = await sb().rpc('send_coach_workout', {
    p_clients: clients.map((c) => c.user_id),
    p_name: w.name.trim(),
    p_note: w.note.trim(),
    p_items: w.items,
  });
  if (error) throw error;
  await Promise.all(
    clients.filter((c) => c.push_token).map((c) => sendPush(c.push_token!, coachName, `New workout for you: ${w.name.trim()} 💪`).catch(() => {})),
  );
  return data as number;
}

export async function deleteWorkout(id: string) {
  const { error } = await sb().from('coach_workouts').delete().eq('id', id);
  if (error) throw error;
}
