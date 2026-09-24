import React, { useState } from "react";
import {
  Mic,
  MicOff,
  X,
  Volume2,
  AlertTriangle,
  Info,
  CheckCircle2,
  CornerDownLeft,
  ShieldAlert,
} from "lucide-react";
import { useVoiceContext } from "./VoiceContext";
import { VoiceState } from "./voiceTypes";
import { clsx } from "clsx";

export const VoiceCommandPanel: React.FC = () => {
  const {
    state,
    isSupported,
    transcript,
    recognizedCommand,
    pendingDestructiveCommand,
    availableCommands,
    panelOpen,
    togglePanel,
    toggleListening,
    confirmDestructiveAction,
    cancelDestructiveAction,
    processSpokenPhrase,
  } = useVoiceContext();

  const [testInput, setTestInput] = useState("");

  if (!panelOpen) return null;

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;
    processSpokenPhrase(testInput);
    setTestInput("");
  };

  const getStatusBadge = (currentState: VoiceState) => {
    switch (currentState) {
      case "listening":
        return {
          label: "Listening...",
          color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
          icon: Mic,
        };
      case "processing":
        return {
          label: "Processing...",
          color: "bg-blue-500/20 text-blue-400 border-blue-500/40",
          icon: Volume2,
        };
      case "command-recognized":
        return {
          label: "Recognized",
          color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
          icon: CheckCircle2,
        };
      case "command-unrecognized":
        return {
          label: "Not Recognized",
          color: "bg-amber-500/20 text-amber-400 border-amber-500/40",
          icon: AlertTriangle,
        };
      case "command-ambiguous":
        return {
          label: "Needs clarification",
          color: "bg-orange-500/20 text-orange-400 border-orange-500/40",
          icon: AlertTriangle,
        };
      case "confirming-destructive":
        return {
          label: "Confirmation Required",
          color: "bg-red-500/20 text-red-400 border-red-500/40",
          icon: ShieldAlert,
        };
      case "permission-denied":
        return {
          label: "Mic Denied",
          color: "bg-red-500/20 text-red-400 border-red-500/40",
          icon: MicOff,
        };
      case "unsupported-browser":
        return {
          label: "Unsupported",
          color: "bg-gray-500/20 text-gray-400 border-gray-500/40",
          icon: Info,
        };
      default:
        return {
          label: "Idle (Off)",
          color: "bg-[var(--surface-elevated)] text-[var(--text-muted)] border-[var(--border)]",
          icon: Mic,
        };
    }
  };

  const badge = getStatusBadge(state);
  const BadgeIcon = badge.icon;

  const categories = ["Navigation", "Action", "Destructive"] as const;

  return (
    <aside
      aria-label="Voice Command Reference & Controls"
      aria-live="polite"
      className={clsx(
        "fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-[var(--surface-base)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300",
        "max-h-[85vh] text-left"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-neutral)] bg-[var(--surface-sunken)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] flex items-center justify-center">
            <Mic size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-vivid)] leading-none">
              Voice Navigation
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Motor accessibility control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
              badge.color
            )}
          >
            <BadgeIcon size={12} className="animate-pulse" />
            {badge.label}
          </span>

          <button
            type="button"
            onClick={togglePanel}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-vivid)] hover:bg-[var(--surface-elevated)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Close voice command reference panel"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1">
        {/* Unsupported Browser Alert */}
        {!isSupported && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex gap-2.5 items-start">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">
                SpeechRecognition Unsupported
              </p>
              <p className="mt-0.5 opacity-90">
                Your browser doesn't natively support Web Speech API. You can still test voice commands using the manual command simulator below or standard keyboard navigation.
              </p>
            </div>
          </div>
        )}

        {/* Permission Denied Alert */}
        {state === "permission-denied" && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex gap-2.5 items-start">
            <MicOff size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">
                Microphone Permission Blocked
              </p>
              <p className="mt-0.5 opacity-90">
                Please enable microphone access in your browser site permissions to speak commands.
              </p>
            </div>
          </div>
        )}

        {state === "command-ambiguous" && (
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs flex gap-2.5 items-start">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <p>
              I heard more than one possible command. Nothing was executed;
              please repeat the complete command.
            </p>
          </div>
        )}

        {/* Destructive Action Confirmation Step Banner */}
        {state === "confirming-destructive" && pendingDestructiveCommand && (
          <div className="p-4 rounded-xl bg-red-500/15 border-2 border-red-500/50 text-red-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-red-400">
              <ShieldAlert size={18} />
              Confirmation Required
            </div>
            <p className="text-xs text-red-200/90 leading-relaxed">
              Voice command requested destructive action:{" "}
              <strong className="text-white">
                "{pendingDestructiveCommand.phrase}"
              </strong>
              . This will not fire blind.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={confirmDestructiveAction}
                className="flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Say / Click "Confirm"
              </button>
              <button
                type="button"
                onClick={cancelDestructiveAction}
                className="py-2 px-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Live Audio Transcript Display */}
        {(transcript || recognizedCommand) && (
          <div className="p-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
              <span>Live Transcript</span>
              {recognizedCommand && (
                <span className="text-emerald-400 font-mono text-[10px]">
                  ✓ Matched
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-vivid)] font-mono italic">
              "{transcript || recognizedCommand?.rawTranscript}"
            </p>
          </div>
        )}

        {/* Documented Command Reference Grammar */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Command Grammar Reference
          </h4>

          {categories.map((cat) => {
            const catCmds = availableCommands.filter(
              (c) => c.category === cat
            );
            return (
              <div key={cat} className="space-y-1.5">
                <div className="text-[11px] font-semibold text-[var(--color-accent-primary)] flex items-center gap-1.5">
                  <span>{cat} Commands</span>
                </div>
                <div className="space-y-1">
                  {catCmds.map((cmd) => (
                    <button
                      key={cmd.id}
                      type="button"
                      className={clsx(
                        "p-2 rounded-lg border text-xs flex flex-col gap-0.5 transition-all text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] hover:border-[var(--color-accent-primary)]/50",
                        recognizedCommand?.command.id === cmd.id
                          ? "bg-[var(--color-accent-primary)]/10 border-[var(--color-accent-primary)] text-[var(--text-vivid)]"
                          : "bg-[var(--surface-sunken)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      )}
                      onClick={() => processSpokenPhrase(cmd.phrase)}
                      title={`Click to test phrase "${cmd.phrase}"`}
                    >
                      <div className="flex items-center justify-between font-semibold text-[var(--text-vivid)]">
                        <span>"{cmd.phrase}"</span>
                        {cmd.requiresConfirmation && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-normal">
                            Requires Confirm
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {cmd.description}
                      </p>
                      <div className="text-[10px] text-[var(--text-disabled)] font-mono mt-0.5">
                        Aliases: {cmd.aliases.map((a) => `"${a}"`).join(", ")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Manual Command Simulator / Tester */}
        <form
          onSubmit={handleTestSubmit}
          className="pt-2 border-t border-[var(--border-neutral)] space-y-1.5"
        >
          <label
            htmlFor="voice-test-input"
            className="text-[11px] font-semibold text-[var(--text-muted)] block"
          >
            Voice Command Simulator (Keyboard Test)
          </label>
          <div className="flex gap-2">
            <input
              id="voice-test-input"
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="e.g. 'Go to streams' or 'Withdraw'"
              className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-neutral)] text-xs text-[var(--text-vivid)] placeholder:[var(--text-disabled)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-dark)] text-white text-xs font-semibold transition-colors flex items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <CornerDownLeft size={14} />
              Speak
            </button>
          </div>
        </form>
      </div>

      {/* Footer Controls */}
      <div className="px-5 py-3 border-t border-[var(--border-neutral)] bg-[var(--surface-sunken)] flex items-center justify-between">
        <button
          type="button"
          onClick={toggleListening}
          disabled={!isSupported}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
            state === "listening"
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-dark)] text-white"
          )}
        >
          <Mic size={14} />
          {state === "listening" ? "Stop Listening" : "Start Listening"}
        </button>

        <span className="text-[11px] text-[var(--text-muted)]">
          Opt-in Motor Aid
        </span>
      </div>
    </aside>
  );
};
