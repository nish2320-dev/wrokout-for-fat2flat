import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { useStore } from '@/data/store';
import { useHealth } from '@/health/HealthProvider';
import { askNotifications } from '@/notify';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Label, Meta, Row, Screen } from '@/ui/kit';
import { SignInButton } from '@/ui/SignIn';

const SHARED = [
  { icon: 'barbell-outline', text: 'Workouts you finish' },
  { icon: 'scale-outline', text: 'Weigh-ins and waist, hips and chest' },
  { icon: 'restaurant-outline', text: 'Meals and calories you log' },
  { icon: 'flag-outline', text: 'Your Transformation plan and targets' },
] as const;

/** A client links up with their coach: sign in, enter the coach's code, choose about photos. */
export default function JoinCoach() {
  const router = useRouter();
  const { state, updateHealth } = useStore();
  const cloud = useCloud();
  const health = useHealth();
  const [shareHealth, setShareHealth] = useState(true);
  const [name, setName] = useState(state.profile.name);
  const params = useLocalSearchParams<{ code?: string }>();
  // an invite link fills the code in
  const [code, setCode] = useState(String(params.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  const [photos, setPhotos] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!cloud.enabled) {
    return (
      <Screen>
        <Card>
          <CardTitle>Coming soon</CardTitle>
          <Meta>Coach sharing isn’t switched on in this version of the app yet.</Meta>
        </Card>
      </Screen>
    );
  }

  if (cloud.membership) {
    return (
      <Screen>
        <Card>
          <CardTitle>You’re connected to {cloud.membership.coachName}</CardTitle>
          <Meta>Your progress is shared automatically. You can change photo sharing or stop sharing in Profile.</Meta>
          <Btn label="Done" icon="checkmark" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ marginTop: 12 }} />
        </Card>
      </Screen>
    );
  }

  const join = async () => {
    setBusy(true);
    try {
      const coachName = await cloud.joinCoach(code, name.trim(), photos);
      if (health.connected) updateHealth({ shareWithCoach: shareHealth });
      // ask now, while it's obvious why: notes from the coach and plan reminders
      await askNotifications();
      Alert.alert(`You’re connected to ${coachName}`, 'Your progress will now be shared with them automatically.', [
        { text: 'Great', onPress: () => (router.canGoBack() ? router.back() : router.replace('/')) },
      ]);
    } catch (e) {
      Alert.alert('Could not join', errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const ready = name.trim().length > 0 && code.replace(/\s/g, '').length === 6 && !busy;

  return (
    <Screen>
      <View style={{ gap: 4, paddingHorizontal: 2 }}>
        <Text style={s.h1}>Share your progress with your coach</Text>
        <Meta>Your coach sees how your week is going and can send you tips and encouragement.</Meta>
      </View>

      <Card>
        <CardTitle>What your coach will see</CardTitle>
        <View style={{ gap: 9, marginTop: 10 }}>
          {SHARED.map((x) => (
            <Row key={x.text} style={{ justifyContent: 'flex-start', gap: 10 }}>
              <Ionicons name={x.icon} size={17} color={C.red} />
              <Text style={s.item}>{x.text}</Text>
            </Row>
          ))}
          <Row style={{ justifyContent: 'flex-start', gap: 10 }}>
            <Ionicons name="images-outline" size={17} color={C.muted} />
            <Text style={[s.item, { color: C.muted }]}>Progress photos only if you turn it on below</Text>
          </Row>
          {health.connected ? (
            <Row style={{ justifyContent: 'flex-start', gap: 10 }}>
              <Ionicons name="heart-outline" size={17} color={C.muted} />
              <Text style={[s.item, { color: C.muted }]}>{health.appName} data only if you turn it on below</Text>
            </Row>
          ) : null}
        </View>
        <Meta style={{ marginTop: 10 }}>Only your coach can see it. You can stop sharing or delete your account at any time in Profile.</Meta>
      </Card>

      {!cloud.userId ? (
        <Card>
          <CardTitle>Step 1: Sign in</CardTitle>
          <Meta style={{ marginBottom: 12 }}>So your coach knows it’s you. We never post anything or email you.</Meta>
          <SignInButton />
        </Card>
      ) : (
        <Card>
          <CardTitle>Step 2: Enter your coach’s code</CardTitle>
          <View style={{ gap: 6, marginTop: 10 }}>
            <Label>Your name (as your coach knows you)</Label>
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={C.faint} style={s.input} maxLength={60} />
            <Label style={{ marginTop: 6 }}>Coach code</Label>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="e.g. K7Q2MX"
              placeholderTextColor={C.faint}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[s.input, s.code]}
              accessibilityLabel="Coach code"
            />
          </View>
          <Row style={{ marginTop: 12 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={s.item}>Share progress photos</Text>
              <Meta>Front and side photos from your check-ins.</Meta>
            </View>
            <Switch value={photos} onValueChange={setPhotos} trackColor={{ true: C.red, false: C.line }} />
          </Row>
          {health.connected ? (
            <Row style={{ marginTop: 12 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={s.item}>Share {health.appName} data</Text>
                <Meta>Steps, sleep, heart rate and watch workouts.</Meta>
              </View>
              <Switch value={shareHealth} onValueChange={setShareHealth} trackColor={{ true: C.red, false: C.line }} />
            </Row>
          ) : null}
          <Btn label={busy ? 'Connecting…' : 'Join my coach'} icon="people" onPress={join} disabled={!ready} style={{ marginTop: 14 }} />
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', letterSpacing: -0.75, color: C.ink },
  item: { fontSize: 14, fontWeight: '600', color: C.ink, flexShrink: 1 },
  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: C.wash,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: C.ink,
  },
  code: { fontSize: 20, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
});
