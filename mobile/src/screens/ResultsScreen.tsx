import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getResults } from '../api';
import { colors } from '../theme';
import type { Results, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export default function ResultsScreen({ navigation, route }: Props) {
  const { scenario, level, messages } = route.params;
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getResults(scenario.id, level, messages)
      .then(setResults)
      .catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Could not load results.</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <Home navigation={navigation} />
      </View>
    );
  }

  if (!results) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Scoring your conversation…</Text>
      </View>
    );
  }

  const scoreColor =
    results.score >= 75 ? colors.accent : results.score >= 50 ? colors.primary : colors.danger;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Your score</Text>
        <Text style={[styles.scoreValue, { color: scoreColor }]}>{results.score}</Text>
        <View style={styles.levelPill}>
          <Text style={styles.levelPillText}>Level: {results.level_estimate}</Text>
        </View>
      </View>

      <Text style={styles.summary}>{results.summary}</Text>

      <Text style={styles.sectionTitle}>
        {results.mistakes.length > 0
          ? `Corrections (${results.mistakes.length})`
          : 'No mistakes — great job! 🎉'}
      </Text>

      {results.mistakes.map((m, i) => (
        <View key={i} style={styles.mistakeCard}>
          <Text style={styles.mistakeOriginal}>“{m.original}”</Text>
          <Text style={styles.mistakeCorrected}>✓ {m.corrected}</Text>
          <Text style={styles.mistakeExplanation}>{m.explanation}</Text>
        </View>
      ))}

      <Home navigation={navigation} />
    </ScrollView>
  );
}

function Home({ navigation }: { navigation: Props['navigation'] }) {
  return (
    <TouchableOpacity
      style={styles.homeButton}
      onPress={() => navigation.popToTop()}
      activeOpacity={0.85}
    >
      <Text style={styles.homeButtonText}>Practice again</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 16, color: colors.muted },
  errorText: { fontSize: 18, fontWeight: '700', color: colors.text },
  errorDetail: { color: colors.muted, marginTop: 8, textAlign: 'center' },
  scoreCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreLabel: { fontSize: 14, color: colors.muted },
  scoreValue: { fontSize: 64, fontWeight: '800', marginVertical: 4 },
  levelPill: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  levelPillText: { fontSize: 14, fontWeight: '700', color: colors.text },
  summary: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  mistakeCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mistakeOriginal: {
    fontSize: 15,
    color: colors.danger,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  mistakeCorrected: { fontSize: 16, color: colors.accent, fontWeight: '600' },
  mistakeExplanation: { fontSize: 14, color: colors.muted, marginTop: 6 },
  homeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  homeButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
