import { theme } from '../theme';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export default function MapTypeToggle({ value, onChange }) {
  return <View style={{ flexDirection: 'row', gap: 8 }}>
    {[['standard', 'Mapa'], ['hybrid', 'Satelit']].map(([type, label]) => (
      <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: value === type }}
        onPress={() => onChange(type)} style={{ paddingHorizontal: 16, paddingVertical: 10,
          borderRadius: 20, backgroundColor: value === type ? theme.primary : theme.border }}>
        <Text style={{ fontWeight: '600', color: value === type ? '#fff' : theme.text }}>{label}</Text>
      </Pressable>
    ))}
  </View>;
}
