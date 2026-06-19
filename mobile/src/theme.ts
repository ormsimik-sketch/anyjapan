export const colors = {
  primary: '#6C5CE7',
  primaryDark: '#5849c2',
  accent: '#00B894',
  danger: '#E17055',
  bg: '#F7F7FB',
  card: '#FFFFFF',
  text: '#2D3436',
  muted: '#8E8E93',
  border: '#E6E6EE',
  bubbleUser: '#6C5CE7',
  bubbleAi: '#FFFFFF',
};

export const levels = ['A1', 'A2', 'B1'] as const;
export type Level = (typeof levels)[number];
