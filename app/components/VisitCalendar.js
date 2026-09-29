import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { calendarDays, localDate, parseVisitDate } from '../utils/visitDate';
import { theme } from '../theme';
const months = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];
export default function VisitCalendar({ value, onSelect, markedDates, onlyMarked = false }) {
  const [month, setMonth] = useState(() => {
    const date = parseVisitDate(value) || localDate();
    return new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1, 12);
  });
  const move = (step) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + step, 1, 12));
  return <View style={styles.box}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Predchádzajúci mesiac" onPress={() => move(-1)} style={styles.arrow}><Text>‹</Text></Pressable>
      <Text style={styles.title}>{months[month.getMonth()]} {month.getFullYear()}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Nasledujúci mesiac" onPress={() => move(1)} style={styles.arrow}><Text>›</Text></Pressable>
    </View>
    <View style={styles.grid}>
      {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
      {calendarDays(month.getFullYear(), month.getMonth()).map((day, index) => {
        const date = day ? localDate(new Date(month.getFullYear(), month.getMonth(), day, 12)) : '';
        const selected = date && date === parseVisitDate(value);
        const count = markedDates?.[date] || 0;
        const disabled = !day || (onlyMarked && !count);
        return <Pressable key={index} disabled={disabled} accessibilityRole="button"
          accessibilityLabel={count ? `${date}, ${count} ${count === 1 ? 'návšteva' : 'návštevy'}` : date}
          accessibilityState={{ selected: Boolean(selected), disabled }} onPress={() => onSelect(date)}
          style={[styles.day, selected && styles.selected]}>
          <Text style={{ color: selected ? '#fff' : disabled ? theme.muted : theme.text }}>{day || ''}</Text>
          {!!count && <View style={[styles.mark, selected && styles.selectedMark]} />}
        </Pressable>;
      })}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '700', color: theme.text },
  arrow: { padding: 16 }, grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: theme.muted, paddingVertical: 8 },
  day: { width: '14.2857%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  mark: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.primary, marginTop: 3 },
  selectedMark: { backgroundColor: '#fff' },
  selected: { backgroundColor: theme.primary },
});
