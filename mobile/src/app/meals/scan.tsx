import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { lookupBarcode } from '@/data/food';
import { C } from '@/theme';
import { Btn, Empty, Screen } from '@/ui/kit';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [looking, setLooking] = useState(false);
  // the camera reports the same code many times a second; handle it once
  const busy = useRef(false);

  if (!permission) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={C.red} />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen scroll={false}>
        <Empty
          icon="barcode-outline"
          title="Scan food barcodes"
          body="Allow camera access to scan the barcode on packaged food and look up its calories. Nothing is recorded or saved."
        />
        {permission.canAskAgain ? (
          <Btn label="Allow camera" icon="camera-outline" onPress={requestPermission} />
        ) : (
          <Btn label="Open Settings" icon="settings-outline" onPress={() => Linking.openSettings()} />
        )}
      </Screen>
    );
  }

  const resume = () => {
    busy.current = false;
    setLooking(false);
  };

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (busy.current) return;
    busy.current = true;
    setLooking(true);
    try {
      const food = await lookupBarcode(data);
      if (food) {
        router.replace({ pathname: '/meals/portion', params: { food: JSON.stringify(food) } });
        return;
      }
      Alert.alert(
        'Product not found',
        "This barcode isn't in the food database yet. You can search by name or enter the calories yourself.",
        [
          { text: 'Scan again', onPress: resume },
          { text: 'Search by name', onPress: () => router.replace('/meals/search') },
          { text: 'Enter manually', style: 'cancel', onPress: () => router.back() },
        ],
      );
    } catch {
      Alert.alert("Couldn't reach the food database", 'Check your internet connection and try again.', [
        { text: 'Try again', onPress: resume },
        { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <View style={s.wrap}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={looking ? undefined : onScanned}
      />
      <View style={s.frame} pointerEvents="none" />
      <View style={s.hint} pointerEvents="none">
        {looking ? <ActivityIndicator color="#fff" /> : null}
        <Text style={s.hintText}>{looking ? 'Looking it up…' : 'Point the camera at a barcode'}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: '78%',
    aspectRatio: 1.6,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#fff',
  },
  hint: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  hintText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
