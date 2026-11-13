// App entry. Before handing over to Expo Router, install a last-resort error
// handler: errors are reported (src/errorReport), and if one would close the
// app its message is shown first, then React Native closes the app as usual.
import { Alert } from 'react-native';

const ErrorUtils = global.ErrorUtils;
const previous = ErrorUtils?.getGlobalHandler?.();
let shown = false;

ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  try {
    require('./src/errorReport').reportError(error, !!isFatal);
  } catch {
    // reporting is best-effort
  }
  if (!isFatal || shown || !previous) {
    previous?.(error, isFatal);
    return;
  }
  shown = true;
  const message = String(error?.message ?? error).slice(0, 400);
  const where = String(error?.stack ?? '').split('\n').slice(0, 3).join('\n').slice(0, 300);
  try {
    Alert.alert('Fat2Flat needs to close', `Sorry, something went wrong. The problem has been reported.\n\n${message}\n\n${where}`, [
      { text: 'Close', onPress: () => previous(error, isFatal) },
    ]);
  } catch {
    previous(error, isFatal);
  }
});

require('expo-router/entry');
