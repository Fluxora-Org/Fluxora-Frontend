/**
 * Voice Command Navigation Types & State Definitions
 * ─────────────────────────────────────────────────────────
 * Supports Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * as an opt-in motor accessibility control layer.
 */

export type VoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "command-recognized"
  | "command-unrecognized"
  | "command-ambiguous"
  | "unsupported-browser"
  | "permission-denied"
  | "confirming-destructive";

export type CommandCategory = "Navigation" | "Action" | "Destructive";

export interface VoiceCommandDef {
  id: string;
  phrase: string;
  aliases: string[];
  category: CommandCategory;
  description: string;
  requiresConfirmation?: boolean;
}

export interface RecognizedCommand {
  command: VoiceCommandDef;
  rawTranscript: string;
  timestamp: number;
}

export interface VoiceContextValue {
  state: VoiceState;
  isSupported: boolean;
  transcript: string;
  recognizedCommand: RecognizedCommand | null;
  pendingDestructiveCommand: VoiceCommandDef | null;
  availableCommands: VoiceCommandDef[];
  panelOpen: boolean;
  toggleListening: () => void;
  startListening: () => void;
  stopListening: () => void;
  togglePanel: () => void;
  confirmDestructiveAction: () => void;
  cancelDestructiveAction: () => void;
  processSpokenPhrase: (phrase: string) => boolean;
}
