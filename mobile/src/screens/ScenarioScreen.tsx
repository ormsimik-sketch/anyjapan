import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getScenarios } from '../api';
import { colors } from '../theme';
import type { RootStackParamList, Scenario } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Scenarios'>;

// Local fallback so the picker still renders if the network is unavailable.
const FALLBACK: Scenario[] = [
  { id: 'cafe', title: 'Cafe', emoji: '☕', description: 'Order drinks and chat with a barista.', opener: '' },
  { id: 'travel', title: 'Travel', emoji: '✈️', description: 'Ask for directions and travel tips.', opener: '' },
  { id: 'job_interview', title: 'Job Interview', emoji: '💼', description: 'Practice interview questions.', opener: '' },
  { id: 'daily_life', title: 'Daily Life', emoji: '😊', description: 'Casual everyday chat with a friend.', opener: '' },
];

export default function ScenarioScreen({ navigation, route }: Props) {
  const { level } = route.params;
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScenarios()
      .then(setScenarios)
      .catch(() => setScenarios(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Choose a scenario</Text>
      <Text style={styles.sub}>Level {level} · pick a situation to practice</Text>
      <FlatList
        data={scenarios}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Chat', { scenario: item, level })}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  sub: { fontSize: 15, color: colors.muted, marginBottom: 16, marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 34, marginRight: 16 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  cardDesc: { fontSize: 14, color: colors.muted, marginTop: 2 },
  chevron: { fontSize: 28, color: colors.muted, marginLeft: 8 },
});
