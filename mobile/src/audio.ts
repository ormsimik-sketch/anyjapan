import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

import { API_URL } from './config';

/**
 * Fetch spoken audio for `text` from the backend TTS endpoint, save it to a
 * temp file and play it. Resolves when playback finishes.
 */
export async function speak(text: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error('TTS request failed');
  }

  // Convert the mp3 response into a base64 file expo-av can play.
  const buffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const path = `${FileSystem.cacheDirectory}speakly-tts-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  const { sound } = await Audio.Sound.createAsync({ uri: path }, { shouldPlay: true });

  return new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().finally(() => resolve());
      } else if (!status.isLoaded && status.error) {
        resolve();
      }
    });
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk))
    );
  }
  return globalThis.btoa(binary);
}

export const RECORDING_OPTIONS = Audio.RecordingOptionsPresets.HIGH_QUALITY;
