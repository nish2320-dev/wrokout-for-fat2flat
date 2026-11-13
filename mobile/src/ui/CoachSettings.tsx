import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { timeAgo } from '@/data/sharing';
import { useStore } from '@/data/store';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Meta, Row } from '@/ui/kit';

const run = (title: string, fn: () => Promise<unknown>) => {
  fn().catch((e) => Alert.alert(title, errorText(e)));
};

/** Profile: the client's link to their coach, the way into coach tools, and the account itself. */
export function CoachSettings() {
  const router = useRouter();
  const cloud = useCloud();
  const { state, updateProfile } = useStore();
  if (!cloud.enabled) return null;
  const m = cloud.membership;

  const confirmLeave = () =>
    Alert.alert(`Stop sharing with ${m?.coachName}?`, 'Your coach will no longer see your progress, and any photos you shared are deleted from the cloud. Everything stays on your phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop sharing', style: 'destructive', onPress: () => run('Could not stop sharing', cloud.leaveCoach) },
    ]);

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and everything stored online for it: shared progress, photos, notes and, if you coach, your coach code and client list. Your workouts and meals on this phone stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => run('Could not delete your account', async () => {
            await cloud.deleteAccount();
            Alert.alert('Account deleted', 'Your account and online data have been deleted.');
          }),
        },
      ],
    );

  return (
    <>
      <Card>
        <CardTitle>Your coach</CardTitle>
        {m ? (
          <>
            <Meta>
              Sharing your progress with {m.coachName}
              {cloud.lastSyncedAt ? ` · updated ${timeAgo(cloud.lastSyncedAt, Date.now())}` : ''}
            </Meta>
            <Row style={{ marginTop: 12 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={s.item}>Share progress photos</Text>
                <Meta>Turning this off deletes them from the cloud.</Meta>
              </View>
              <Switch
                value={m.sharePhotos}
                onValueChange={(on) => run('Could not change photo sharing', () => cloud.setSharePhotos(on))}
                trackColor={{ true: C.red, false: C.line }}
              />
            </Row>
            <Row style={{ marginTop: 12 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={s.item}>Share AI assistant chats</Text>
                <Meta>Your recent questions to Ask Fat2Flat and its answers.</Meta>
              </View>
              <Switch
                value={!!state.profile.shareAssistant}
                onValueChange={(on) => updateProfile({ shareAssistant: on })}
                trackColor={{ true: C.red, false: C.line }}
              />
            </Row>
            <Btn label={`Message ${m.coachName}`} icon="chatbubble-outline" onPress={() => router.push('/chat')} style={{ marginTop: 12 }} />
            <Btn label="Stop sharing" icon="close" ghost onPress={confirmLeave} style={{ marginTop: 9 }} />
          </>
        ) : (
          <>
            <Meta>Working with a personal trainer? Enter their code to share your workouts, weight and meals so they can keep you on track.</Meta>
            <Btn label="Join my coach" icon="people" onPress={() => router.push('/coach/join')} style={{ marginTop: 12 }} />
          </>
        )}
        <Pressable onPress={() => router.push('/coach')} style={s.link} accessibilityRole="button">
          <Ionicons name="clipboard-outline" size={16} color={C.ink2} />
          <Text style={s.linkText}>{cloud.coach ? 'My clients' : 'I’m a coach'}</Text>
          <Ionicons name="chevron-forward" size={15} color={C.faint} />
        </Pressable>
      </Card>

      {cloud.userId ? (
        <Card>
          <CardTitle>Account</CardTitle>
          <Meta>Signed in with {Platform.OS === 'ios' ? 'Apple' : 'Google'}.</Meta>
          <Row style={{ marginTop: 12, gap: 9 }}>
            <Btn label="Sign out" icon="log-out-outline" ghost onPress={() => run('Could not sign out', cloud.signOut)} style={{ flex: 1 }} />
            <Btn label="Delete account" icon="trash-outline" ghost onPress={confirmDelete} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : null}
    </>
  );
}

const s = StyleSheet.create({
  item: { fontSize: 14, fontWeight: '600', color: C.ink },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  linkText: { flex: 1, fontSize: 14, fontWeight: '700', color: C.ink2 },
});
