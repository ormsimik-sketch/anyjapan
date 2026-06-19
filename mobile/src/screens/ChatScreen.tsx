import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { sendChat, transcribe } from '../api';
import { RECORDING_OPTIONS, speak } from '../audio';
import { colors } from '../theme';
import type { ChatMessage, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

type Status = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking';

export default function ChatScreen({ navigation, route }: Props) {
  const { scenario, level } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Seed the conversation with the AI's opener and speak it aloud.
  useEffect(() => {
    const opener = scenario.opener || `Hi! Let's practice. ${scenario.description}`;
    setMessages([{ role: 'assistant', content: opener }]);
    setStatus('speaking');
    speak(opener)
      .catch(() => undefined)
      .finally(() => setStatus('idle'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={finish}
          disabled={messages.filter((m) => m.role === 'user').length === 0}
        >
          <Text
            style={[
              styles.finishBtn,
              messages.filter((m) => m.role === 'user').length === 0 &&
                styles.finishBtnDisabled,
            ]}
          >
            Finish
          </Text>
        </TouchableOpacity>
      ),
      title: `${scenario.emoji} ${scenario.title}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, messages]);

  function finish() {
    navigation.navigate('Results', { scenario, level, messages });
  }

  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone needed', 'Please allow microphone access to speak.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();
      recordingRef.current = recording;
      setStatus('recording');
    } catch (err) {
      Alert.alert('Recording error', String(err));
      setStatus('idle');
    }
  }

  async function stopRecording() {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    setStatus('transcribing');
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('No audio captured');

      const text = await transcribe(uri);
      if (!text.trim()) {
        Alert.alert('Hmm', "I didn't catch that. Try speaking again.");
        setStatus('idle');
        return;
      }
      await handleUserText(text);
    } catch (err) {
      Alert.alert('Error', String(err));
      setStatus('idle');
    }
  }

  async function handleUserText(text: string) {
    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setStatus('thinking');

    try {
      const reply = await sendChat(scenario.id, level, history);
      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: reply.reply,
        correction: reply.has_mistake ? reply.correction : null,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setStatus('speaking');
      await speak(reply.reply).catch(() => undefined);
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setStatus('idle');
    }
  }

  const busy = status !== 'idle' && status !== 'recording';
  const statusLabel: Record<Status, string> = {
    idle: 'Tap the mic and speak',
    recording: 'Listening… tap to stop',
    transcribing: 'Transcribing…',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => <Bubble message={item} />}
      />

      <View style={styles.controls}>
        <Text style={styles.status}>{statusLabel[status]}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={busy}
          onPress={status === 'recording' ? stopRecording : startRecording}
          style={[
            styles.micButton,
            status === 'recording' && styles.micButtonActive,
            busy && styles.micButtonDisabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.micIcon}>{status === 'recording' ? '⏹' : '🎤'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
        </Text>
      </View>
      {message.correction ? (
        <View style={styles.correction}>
          <Text style={styles.correctionLabel}>Correction</Text>
          <Text style={styles.correctionText}>{message.correction}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 24 },
  bubbleRow: { marginBottom: 14, maxWidth: '85%' },
  rowLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  rowRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { padding: 14, borderRadius: 18 },
  bubbleAi: {
    backgroundColor: colors.bubbleAi,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 4,
  },
  bubbleUser: { backgroundColor: colors.bubbleUser, borderTopRightRadius: 4 },
  bubbleText: { fontSize: 16, color: colors.text, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  correction: {
    marginTop: 6,
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  correctionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  correctionText: { fontSize: 14, color: colors.text },
  controls: {
    alignItems: 'center',
    paddingVertical: 18,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  status: { fontSize: 13, color: colors.muted, marginBottom: 12 },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: { backgroundColor: colors.danger },
  micButtonDisabled: { backgroundColor: colors.muted },
  micIcon: { fontSize: 30 },
  finishBtn: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  finishBtnDisabled: { color: colors.muted },
});
