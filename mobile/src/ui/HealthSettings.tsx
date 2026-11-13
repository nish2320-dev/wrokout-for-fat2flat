import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { timeAgo } from '@/data/sharing';
import { useStore } from '@/data/store';
import { useHealth } from '@/health/HealthProvider';
import { C } from '@/theme';
import { Btn, Card, CardTitle, Meta, Row } from '@/ui/kit';

const READS = 'steps, active calories, workouts, weight, body fat, sleep and resting heart rate';

/** Profile: connect Apple Health / Health Connect, choose whether the coach sees it, disconnect. */
export function HealthSettings() {
  const health = useHealth();
  const cloud = useCloud();
  const { state, updateHealth } = useStore();
  const [busy, setBusy] = useState(false);
  if (!health.appName) return null;

  const connect = async () => {
    setBusy(true);
    try {
      const ok = await health.connect();
      if (!ok) {
        Alert.alert(
          `${health.appName} isn’t available`,
          Platform.OS === 'android'
            ? 'Install or update Health Connect from the Play Store, then try again.'
            : 'Apple Health isn’t available on this device.',
        );
      }
    } catch {
      Alert.alert('Could not connect', `Please try again, or check ${health.appName}’s settings.`);
    } finally {
      setBusy(false);
    }
  };

  const confirmDisconnect = () =>
    Alert.alert(
      `Disconnect ${health.appName}?`,
      `Fat2Flat stops reading from ${health.appName} and removes the steps, sleep, heart rate and scale weigh-ins it imported. Your own logs stay. To revoke access completely, also turn it off in ${health.appName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: health.disconnect },
      ],
    );

  if (!health.connected) {
    return (
      <Card>
        <Row style={{ justifyContent: 'flex-start', gap: 10 }}>
          <View style={s.icon}>
            <Ionicons name="heart" size={16} color={C.red} />
          </View>
          <View style={{ flex: 1 }}>
            <CardTitle>Connect {health.appName}</CardTitle>
            <Meta>
              Bring in your {READS} from your {Platform.OS === 'ios' ? 'Apple Watch, iPhone' : 'watch, phone'} and smart scale. Your workouts and
              meals are saved there too.
            </Meta>
          </View>
        </Row>
        <Btn label={busy ? 'Connecting…' : `Connect ${health.appName}`} icon="link" onPress={connect} disabled={busy} style={{ marginTop: 12 }} />
        <Meta style={{ marginTop: 8 }}>You choose exactly what to share on the next screen. Health data stays on your phone.</Meta>
      </Card>
    );
  }

  const h = state.health!;
  return (
    <Card>
      <Row>
        <View style={{ flex: 1 }}>
          <CardTitle>{health.appName}</CardTitle>
          <Meta>
            Connected{h.lastSyncAt ? ` · updated ${timeAgo(h.lastSyncAt, Date.now())}` : ''}
            {health.syncing ? ' · syncing…' : ''}
          </Meta>
        </View>
        <Ionicons name="checkmark-circle" size={20} color={C.green} />
      </Row>
      {cloud.membership ? (
        <Row style={{ marginTop: 12 }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={s.item}>Share with {cloud.membership.coachName}</Text>
            <Meta>Steps, sleep, heart rate and watch workouts from the last two weeks.</Meta>
          </View>
          <Switch value={h.shareWithCoach} onValueChange={(on) => updateHealth({ shareWithCoach: on })} trackColor={{ true: C.red, false: C.line }} />
        </Row>
      ) : null}
      <Row style={{ marginTop: 12, gap: 9 }}>
        <Btn label="Sync now" icon="refresh" ghost onPress={health.sync} style={{ flex: 1 }} />
        <Btn label="Permissions" icon="settings-outline" ghost onPress={health.openSettings} style={{ flex: 1 }} />
      </Row>
      <Btn label="Disconnect" icon="close" ghost onPress={confirmDisconnect} style={{ marginTop: 9 }} />
      {Platform.OS === 'ios' ? (
        <Meta style={{ marginTop: 8 }}>To change what Fat2Flat can read, open the Health app → your profile → Apps → Fat2Flat Fitness.</Meta>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  icon: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.redWash, alignItems: 'center', justifyContent: 'center' },
  item: { fontSize: 14, fontWeight: '600', color: C.ink },
});
