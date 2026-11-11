import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, View } from 'react-native';

import { useCloud } from '@/cloud/CloudProvider';
import { errorText } from '@/cloud/supabase';
import { C } from '@/theme';
import { Btn } from '@/ui/kit';

/** Apple's own button on iPhone (App Review expects it); a plain one elsewhere. */
export function SignInButton() {
  const { signIn } = useCloud();
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      await signIn();
    } catch (e) {
      Alert.alert('Could not sign in', errorText(e));
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <View style={{ height: 48, justifyContent: 'center' }}>
        <ActivityIndicator color={C.red} />
      </View>
    );
  }
  if (Platform.OS === 'ios') {
    return (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12}
        style={{ height: 48, width: '100%' }}
        onPress={go}
      />
    );
  }
  return <Btn label="Continue with Apple" icon="logo-apple" onPress={go} />;
}
