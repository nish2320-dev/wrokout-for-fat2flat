import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/**
 * Google sign-in finishes by opening fat2flat://auth. The browser sheet already
 * hands that link to the sign-in code; on Android the router also receives it,
 * so this screen just steps back to wherever the user was.
 */
export default function AuthReturn() {
  const router = useRouter();
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);
  return null;
}
