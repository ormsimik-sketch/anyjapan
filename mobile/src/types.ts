import type { Level } from './theme';

export type Role = 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content: string;
  correction?: string | null;
}

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  description: string;
  opener: string;
}

export interface Mistake {
  original: string;
  corrected: string;
  explanation: string;
}

export interface Results {
  score: number;
  level_estimate: string;
  summary: string;
  mistakes: Mistake[];
}

export type RootStackParamList = {
  Home: undefined;
  Scenarios: { level: Level };
  Chat: { scenario: Scenario; level: Level };
  Results: {
    scenario: Scenario;
    level: Level;
    messages: ChatMessage[];
  };
};
