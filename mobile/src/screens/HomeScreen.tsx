import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, levels, type Level } from '../theme';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [level, setLevel] = useState<Level>('A1');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🎙️</Text>
        <Text style={styles.title}>Speakly AI</Text>
        <Text style={styles.subtitle}>
          Practice real English conversations with an AI partner.
        </Text>
      </View>

      <View style={styles.levelSection}>
        <Text style={styles.levelLabel}>Your level</Text>
        <View style={styles.levelRow}>
          {levels.map((lv) => {
            const active = lv === level;
            return (
              <TouchableOpacity
                key={lv}
                style={[styles.levelChip, active && styles.levelChipActive]}
                onPress={() => setLevel(lv)}
              >
                <Text style={[styles.levelText, active && styles.levelTextActive]}>
                  {lv}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.levelHint}>
          A1 = beginner · A2 = elementary · B1 = intermediate
        </Text>
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={() => navigation.navigate('Scenarios', { level })}
        activeOpacity={0.85}
      >
        <Text style={styles.startButtonText}>Start Speaking</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    justifyContent: 'space-between',
  },
  hero: { alignItems: 'center', marginTop: 48 },
  logo: { fontSize: 72, marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '800', color: colors.text },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  levelSection: { alignItems: 'center' },
  levelLabel: { fontSize: 14, color: colors.muted, marginBottom: 12 },
  levelRow: { flexDirection: 'row', gap: 12 },
  levelChip: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  levelText: { fontSize: 18, fontWeight: '700', color: colors.text },
  levelTextActive: { color: '#fff' },
  levelHint: { fontSize: 12, color: colors.muted, marginTop: 12 },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
