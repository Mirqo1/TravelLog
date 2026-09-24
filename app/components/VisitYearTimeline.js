import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { yearAtPosition } from '../utils/visitYears';

export default function VisitYearTimeline({ min, max, value, onSelect, onDragging }) {
  const [width, setWidth] = useState(0);
  const [year, setYear] = useState(value || max);
  const dragging = useRef(false), origin = useRef(0), latest = useRef(year);
  const clamp = n => Math.max(min, Math.min(max, n));
  useEffect(() => { if (!dragging.current) { latest.current = clamp(value || max); setYear(latest.current); } }, [value, min, max]);
  useEffect(() => () => onDragging(false), []);
  const update = x => { latest.current = yearAtPosition(x, width, min, max); setYear(latest.current); };
  const finish = commit => { dragging.current = false; onDragging(false); if (commit) onSelect(latest.current); };
  const position = 12 + (max === min ? 0 : (clamp(year) - min) / (max - min)) * Math.max(0, width - 24);
  return <View style={styles.container}>
    <Text style={styles.hint}>Preskočiť na rok · podľa dátumu návštevy</Text>
    <View accessible accessibilityRole="adjustable" accessibilityLabel="Rok návštev"
      accessibilityValue={{ min, max, now: clamp(year), text: String(clamp(year)) }}
      accessibilityActions={[{ name: 'increment', label: 'Ďalší rok' }, { name: 'decrement', label: 'Predošlý rok' }]}
      onAccessibilityAction={event => {
        const next = clamp(year + (event.nativeEvent.actionName === 'increment' ? 1 : -1));
        setYear(next); latest.current = next; onSelect(next);
      }} style={styles.touchArea} onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => width > 24}
      onResponderGrant={event => {
        dragging.current = true; onDragging(true);
        origin.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
        update(event.nativeEvent.locationX);
      }}
      onResponderMove={event => update(event.nativeEvent.pageX - origin.current)}
      onResponderRelease={() => finish(true)} onResponderTerminate={() => finish(false)}
      onResponderTerminationRequest={() => !dragging.current}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.bubble, { left: Math.max(0, Math.min(width - 48, position - 24)) }]}><Text style={styles.year}>{clamp(year)}</Text></View>
        <View style={styles.track} />
        <View style={[styles.thumb, { left: position - 10 }]} />
      </View>
    </View>
    <View style={styles.ends}><Text style={styles.hint}>{min}</Text><Text style={styles.hint}>{max}</Text></View>
  </View>;
}
const styles = StyleSheet.create({
  container: { paddingBottom: 16, gap: 2 }, hint: { color: theme.muted, fontSize: 12 },
  touchArea: { height: 66 }, track: { position: 'absolute', left: 12, right: 12, top: 45, height: 3, backgroundColor: theme.border, borderRadius: 2 },
  bubble: { position: 'absolute', top: 5, width: 48, alignItems: 'center', paddingVertical: 4, backgroundColor: theme.primarySoft, borderRadius: 8 },
  year: { color: theme.primary, fontWeight: '700' }, thumb: { position: 'absolute', top: 36, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.primary, borderWidth: 2, borderColor: theme.surface },
  ends: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
});
