export const REACTION_TYPES = [
  'like',
  'love',
  'celebrate',
  'sad',
  'angry',
  'clap',
  'happy',
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];
