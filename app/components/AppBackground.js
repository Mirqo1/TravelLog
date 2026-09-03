import React from 'react';
import { StyleSheet, View } from 'react-native';

export const APP_COLORS = {
  accent: '#F4C430',
  accentDark: '#7C5A00',
  accentSoft: '#FAE08A',
  background: '#F9F7F0',
  surface: 'rgba(255, 255, 255, 0.92)',
  border: 'rgba(209, 213, 219, 0.7)',
  text: '#111827',
  muted: '#4B5563',
};

const contourOffsets = [
  { top: -90, left: -110, width: 260, height: 260 },
  { top: 120, right: -120, width: 280, height: 280 },
  { bottom: 160, left: -80, width: 220, height: 220 },
  { bottom: -70, right: 40, width: 200, height: 200 },
];

const ContourCluster = ({ style }) => (
  <View pointerEvents="none" style={[styles.cluster, style]}>
    {[0, 1, 2].map((index) => (
      <View
        key={index}
        style={[
          styles.contour,
          {
            top: index * 16,
            right: index * 18,
            bottom: index * 16,
            left: index * 18,
          },
        ]}
      />
    ))}
  </View>
);

export default function AppBackground({ children, style }) {
  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {contourOffsets.map((offset, index) => (
          <ContourCluster key={index} style={offset} />
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  cluster: {
    position: 'absolute',
  },
  contour: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.18)',
    borderRadius: 999,
  },
});
