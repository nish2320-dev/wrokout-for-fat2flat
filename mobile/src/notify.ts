import * as Notifications from 'expo-notifications';

// Local notifications only — nothing is pushed from a server. While the app
// is open the workout screen buzzes instead, so the banner is suppressed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function allowed() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return asked.granted;
}

/**
 * Schedules the "rest is over" alert for when the app is in the background or
 * the phone is locked. Permission is asked the first time this runs, which is
 * the first logged set. Resolves to null if the user said no.
 */
export async function scheduleRestEnd(endsAt: number): Promise<string | null> {
  try {
    if (!(await allowed()) || endsAt <= Date.now()) return null;
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
