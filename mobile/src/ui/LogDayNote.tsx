import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { C } from '@/theme';
import { useLogDay } from '@/ui/logDay';

/** "Adding to Yesterday" on the food screens, when the Meals tab is set to an earlier day. */
export function LogDayNote() {
  const { isToday, label } = useLogDay();
  if (isToday) return null;
  return (
    <View style={s.note}>
      <Ionicons name="calendar-outline" size={15} color={C.red} />
      <Text style={s.text}>Adding to {label === 'Yesterday' ? 'yesterday' : label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: C.redWash, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  text: { fontSize: 13, fontWeight: '700', color: C.red },
});
