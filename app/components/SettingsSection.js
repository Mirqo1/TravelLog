import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '../theme';

// Keep forms mounted when folded so drafts and in-flight operations survive.
export default function SettingsSection({ title, summary, icon, expanded, onPress, children }) {
  return <View style={styles.section}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
      accessibilityLabel={`${title}. ${summary || ''}`} onPress={onPress} style={styles.heading}>
      <MaterialIcons name={icon} size={24} color={theme.primary} />
      <View style={styles.body}><Text style={styles.title}>{title}</Text>
        {summary ? <Text numberOfLines={2} style={styles.summary}>{summary}</Text> : null}</View>
      <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={24} color={theme.muted} />
    </Pressable>
    <View style={!expanded && { display: 'none' }} accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}>{children}</View>
  </View>;
}
const styles = StyleSheet.create({
  section: { backgroundColor: theme.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  heading: { minHeight: 72, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  body: { flex: 1, gap: 4 }, title: { color: theme.text, fontSize: 16, fontWeight: '700' },
  summary: { color: theme.muted, lineHeight: 19, fontSize: 13 },
});
