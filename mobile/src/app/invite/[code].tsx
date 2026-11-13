import { Redirect, useLocalSearchParams } from 'expo-router';

/** fat2flat://invite/K7Q2MX (from the invite web page) opens Join my coach with the code filled in. */
export default function Invite() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const clean = String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return <Redirect href={{ pathname: '/coach/join', params: { code: clean } }} />;
}
