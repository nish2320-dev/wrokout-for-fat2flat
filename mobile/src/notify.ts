import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Reminder } from '@/data/sharing';

// While the app is open the workout screen buzzes for rest and the Home
// screen shows coach notes, so banners are suppressed except for a coach's
// note, which is worth seeing wherever you are in the app.
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const fromCoach = (n.request.content.data as { kind?: string } | undefined)?.kind === 'coach';
    return { shouldShowBanner: fromCoach, shouldShowList: fromCoach, shouldPlaySound: fromCoach, shouldSetBadge: false };
  },
});

/** Asks for notification permission if it hasn't been answered yet. */
export async function askNotifications() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return asked.granted;
  } catch {
    return false;
  }
}

const granted = async () => {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
};

/**
 * Schedules the "rest is over" alert for when the app is in the background or
 * the phone is locked. Permission is asked the first time this runs, which is
 * the first logged set. Resolves to null if the user said no.
 */
export async function scheduleRestEnd(endsAt: number): Promise<string | null> {
  try {
    if (!(await askNotifications()) || endsAt <= Date.now()) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest is over', body: 'Time for your next set.', sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(endsAt) },
    });
  } catch {
    return null;
  }
}

export function cancelRestEnd(id: string) {
  Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

const REMINDER_IDS = ['workout', 'checkin', 'weigh'];

/**
 * Replaces the scheduled Transformation reminders with this set. Never asks
 * for permission itself: it only schedules if the user already said yes.
 */
export async function syncReminders(reminders: Reminder[]) {
  if (Platform.OS === 'web') return;
  try {
    await Promise.all(REMINDER_IDS.map((id) => Notifications.cancelScheduledNotificationAsync(`reminder-${id}`).catch(() => {})));
    if (reminders.length === 0 || !(await granted())) return;
    for (const r of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: `reminder-${r.id}`,
        content: { title: r.title, body: r.body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.at) },
      });
    }
  } catch {
    // reminders are a nicety; never let them break the app
  }
}

/** This phone's address for coach notes, or null without permission. */
export async function pushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    if (!(await granted())) return null;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    return (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  } catch {
    return null;
  }
}

/** Sends a coach's note to a client's phone through Expo's push service. */
export async function sendPush(to: string, title: string, body: string) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to, title, body, sound: 'default', data: { kind: 'coach' } }),
    });
  } catch {
    // the note is saved either way; the client sees it next time they open the app
  }
}
