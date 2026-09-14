// Data model per PLAN.md section 7. Meeting/ChatMessage are added in later
// phases (persistence, AI features) — only what Phase 3 needs lives here.

export type SpeakerId = string; // stable app-generated id, e.g. "spk_0"

export interface Speaker {
  id: SpeakerId;
  label: string; // user-editable display name, defaults to "Speaker 1"
  colorIndex: number; // index into the fixed palette, assigned on creation
}

export interface Word {
  text: string; // punctuated_word from Deepgram
  start: number; // seconds from session start
  end: number;
  speakerId: SpeakerId;
}
