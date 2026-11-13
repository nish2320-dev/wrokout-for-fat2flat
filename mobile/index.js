// App entry. Before handing over to Expo Router, install a last-resort error
// handler: if a JavaScript error would close the app, show its message first
// so it can be reported, then let React Native close the app as usual.
import { Alert } from 'react-native';

const ErrorUtils = global.ErrorUtils;
const previous = ErrorUtils?.getGlobalHandler?.();
let shown = false;

ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  if (!isFatal || shown || !previous) {
    previous?.(error, isFatal);
    return;
  }
  shown = true;
  const message = String(error?.message ?? error).slice(0, 400);
  const where = String(error?.stack ?? '').split('\n').slice(0, 3).join('\n').slice(0, 300);
  try {
    Alert.alert('Fat2Flat needs to close', `Please screenshot this and send it to support.\n\n${message}\n\n${where}`, [
      { text: 'Close', onPress: () => previous(error, isFatal) },
    ]);
  } catch {
    previous(error, isFatal);
  }
});

require('expo-router/entry');
