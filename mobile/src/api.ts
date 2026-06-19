import { API_URL } from './config';
import type { ChatMessage, Results, Scenario } from './types';

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function getScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${API_URL}/api/scenarios`);
  const data = await asJson<{ scenarios: Scenario[] }>(res);
  return data.scenarios;
}

export interface ChatReply {
  reply: string;
  correction: string | null;
  has_mistake: boolean;
}

export async function sendChat(
  scenario: string,
  level: string,
  messages: ChatMessage[]
): Promise<ChatReply> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario,
      level,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  return asJson<ChatReply>(res);
}

/** Upload a recorded audio file (file:// uri) and get back the transcript. */
export async function transcribe(uri: string): Promise<string> {
  const form = new FormData();
  // React Native FormData accepts this { uri, name, type } shape.
  form.append('file', {
    uri,
    name: 'speech.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);

  const res = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    body: form,
  });
  const data = await asJson<{ text: string }>(res);
  return data.text;
}

/** Returns a remote URL the player can stream for the spoken reply. */
export function ttsUrl(): string {
  return `${API_URL}/api/tts`;
}

export async function getResults(
  scenario: string,
  level: string,
  messages: ChatMessage[]
): Promise<Results> {
  const res = await fetch(`${API_URL}/api/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario,
      level,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  return asJson<Results>(res);
}
