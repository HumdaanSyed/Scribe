import type { SpeakerId, Word } from './model';

export interface TranscriptTurn {
  speakerId: SpeakerId;
  words: Word[];
}

/**
 * Groups consecutive same-speaker words into turns. A new turn begins
 * whenever the speaker changes (PLAN.md section 8).
 */
export function groupWordsIntoTurns(words: Word[]): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];

  for (const word of words) {
    const lastTurn = turns[turns.length - 1];
    if (lastTurn && lastTurn.speakerId === word.speakerId) {
      lastTurn.words.push(word);
    } else {
      turns.push({ speakerId: word.speakerId, words: [word] });
    }
  }

  return turns;
}
