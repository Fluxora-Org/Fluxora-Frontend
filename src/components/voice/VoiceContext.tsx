import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { useLiveAnnouncer } from "../../hooks/useLiveAnnouncer";
import { useI18n } from "../../i18n";
import {
  VoiceState,
  VoiceCommandDef,
  RecognizedCommand,
  VoiceContextValue,
} from "./voiceTypes";

const DEFAULT_COMMANDS: VoiceCommandDef[] = [
  {
    id: "nav-dashboard",
    phrase: "Go to dashboard",
    aliases: ["open dashboard", "dashboard", "home", "show dashboard"],
    category: "Navigation",
    description: "Navigate to the main capital streaming dashboard",
  },
  {
    id: "nav-streams",
    phrase: "Go to streams",
    aliases: ["open streams", "streams", "view streams", "stream list"],
    category: "Navigation",
    description: "Navigate to active and archived treasury streams",
  },
  {
    id: "nav-recipient",
    phrase: "Go to recipient",
    aliases: ["open recipient", "recipient", "view recipient", "recipient claims"],
    category: "Navigation",
    description: "Navigate to recipient claim and withdrawal view",
  },
  {
    id: "action-create-stream",
    phrase: "Create stream",
    aliases: ["new stream", "start stream", "add stream"],
    category: "Action",
    description: "Open the new stream creation modal",
  },
  {
    id: "action-withdraw",
    phrase: "Withdraw",
    aliases: ["withdraw funds", "claim funds", "withdraw capital"],
    category: "Action",
    description: "Initiate available capital withdrawal",
  },
  {
    id: "destructive-cancel-stream",
    phrase: "Cancel stream",
    aliases: ["delete stream", "stop stream", "terminate stream"],
    category: "Destructive",
    description: "Cancel an active streaming contract (Requires confirmation)",
    requiresConfirmation: true,
  },
];

const VoiceContext = createContext<VoiceContextValue | null>(null);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const { announce } = useLiveAnnouncer();
  const { locale } = useI18n();

  // Map i18n locale to a BCP-47 speech-recognition tag.
  const speechLang = locale === "es" ? "es-ES" : "en-US";

  const [state, setState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [transcript, setTranscript] = useState<string>("");
  const [recognizedCommand, setRecognizedCommand] =
    useState<RecognizedCommand | null>(null);
  const [pendingDestructiveCommand, setPendingDestructiveCommand] =
    useState<VoiceCommandDef | null>(null);
  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);

  // Feature detection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      setState("unsupported-browser");
    }
  }, []);

  // Match phrase to command dictionary.
  // Partial-match (substring) fallback is only applied to non-destructive
  // commands so that longer utterances that happen to contain the phrase
  // "Cancel stream" do not accidentally trigger the destructive confirmation
  // flow (Issue #938).
  const matchCommand = useCallback((spokenText: string): VoiceCommandDef | "ambiguous" | null => {
    const clean = spokenText.trim().toLowerCase();
    if (!clean) return null;

    // "stream" is a shared stem for navigation, creation, and cancellation.
    // It is never specific enough to select a safe target.
    if (clean === "stream") return "ambiguous";

    // Exact-match pass — check every command's phrase and aliases first.
    for (const cmd of DEFAULT_COMMANDS) {
      if (cmd.phrase.toLowerCase() === clean) return cmd;
      if (cmd.aliases.some((alias) => alias.toLowerCase() === clean)) return cmd;
    }

    // Partial matches must be unique. Returning the first match made phrases
    // such as "stream" silently choose whichever command appeared first.
    const partialMatches = DEFAULT_COMMANDS.filter((cmd) => {
      if (cmd.requiresConfirmation) return false;
      return (
        clean.includes(cmd.phrase.toLowerCase()) ||
        cmd.aliases.some((alias) => clean.includes(alias.toLowerCase()))
      );
    });

    if (partialMatches.length > 1) return "ambiguous";
    if (partialMatches.length === 1) return partialMatches[0];

    return null;
  }, []);

  // Execute recognized command
  const executeCommand = useCallback(
    (cmd: VoiceCommandDef, rawText: string) => {
      setRecognizedCommand({
        command: cmd,
        rawTranscript: rawText,
        timestamp: Date.now(),
      });

      if (cmd.requiresConfirmation) {
        setPendingDestructiveCommand(cmd);
        setState("confirming-destructive");
        announce(
          `Confirmation required to ${cmd.phrase}. Say confirm or click confirm button.`
        );
        return;
      }

      setState("command-recognized");
      announce(`Voice command recognized: ${cmd.phrase}. Navigating.`);

      switch (cmd.id) {
        case "nav-dashboard":
          navigate("/app");
          break;
        case "nav-streams":
          navigate("/app/streams");
          break;
        case "nav-recipient":
          navigate("/app/recipient");
          break;
        case "action-create-stream":
          navigate("/app/streams?action=create");
          break;
        case "action-withdraw":
          navigate("/app/recipient?action=withdraw");
          break;
        default:
          break;
      }

      setTimeout(() => {
        setState((prev) => (prev === "command-recognized" ? "listening" : prev));
      }, 2000);
    },
    [navigate, announce]
  );

  // Directly process spoken or typed text phrase (useful for manual testing & speech handler)
const processSpokenPhrase = useCallback(
  (phrase: string): boolean => {
    setTranscript(phrase);
    setState("processing");

    // Handle active confirmation step
    if (pendingDestructiveCommand) {
      const clean = phrase.trim().toLowerCase();

      if (clean === "confirm" || clean === "yes") {
        confirmDestructiveAction();
        return true;
      }

      if (clean === "cancel" || clean === "no" || clean === "abort") {
        cancelDestructiveAction();
        return true;
      }

      // Do not process other commands while confirmation is pending
      setState("confirming-destructive");
      return false;
    }

    const matched = matchCommand(phrase);

    if (matched) {
      executeCommand(matched, phrase);
      return true;
    }

    setState("command-unrecognized");
    announce(
      `Command not recognized for phrase: ${phrase}. Say 'Go to streams' or view command reference.`
    );

    setTimeout(() => {
      setState((prev) =>
        prev === "command-unrecognized" ? "listening" : prev
      );
    }, 3000);

    return false;
  },
  [
    matchCommand,
    executeCommand,
    pendingDestructiveCommand,
    confirmDestructiveAction,
    cancelDestructiveAction,
    announce,
  ]
);

      const matched = matchCommand(phrase);
      if (matched === "ambiguous") {
        setState("command-ambiguous");
        announce(
          `That voice command is ambiguous. Please say the complete command, such as 'Go to streams' or 'Create stream'.`,
        );
        setTimeout(() => {
          setState((prev) =>
            prev === "command-ambiguous" ? "listening" : prev,
          );
        }, 3000);
        return false;
      }
      if (matched) {
        executeCommand(matched, phrase);
        return true;
      } else {
        setState("command-unrecognized");
        announce(
          `Command not recognized for phrase: ${phrase}. Say 'Go to streams' or view command reference.`
        );
        setTimeout(() => {
          setState((prev) =>
            prev === "command-unrecognized" ? "listening" : prev
          );
        }, 3000);
        return false;
      }
    },
    [matchCommand, executeCommand, pendingDestructiveCommand, announce]
  );

  // Destructive confirmations
  const confirmDestructiveAction = useCallback(() => {
    if (!pendingDestructiveCommand) return;
    const cmd = pendingDestructiveCommand;
    setPendingDestructiveCommand(null);
    setState("command-recognized");
    announce(`Destructive action confirmed: ${cmd.phrase} executed.`);

    // Perform action (e.g. navigate to streams with cancel modal parameter)
    navigate("/app/streams?action=cancel");

    setTimeout(() => {
      setState("listening");
    }, 2000);
  }, [pendingDestructiveCommand, navigate, announce]);

  const cancelDestructiveAction = useCallback(() => {
    setPendingDestructiveCommand(null);
    setState("listening");
    announce("Destructive action cancelled.");
  }, [announce]);

  // Start SpeechRecognition
  const startListening = useCallback(() => {
    if (!isSupported) {
      setState("unsupported-browser");
      announce("Voice control is not supported by your current browser.");
      return;
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      setState("unsupported-browser");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* ignore */
        }
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setState("listening");
        announce("Voice navigation active. Listening for commands.");
      };

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const result = event.results[lastIndex];
        const spokenText = result[0].transcript;
        setTranscript(spokenText);

        if (result.isFinal) {
          processSpokenPhrase(spokenText);
        } else {
          setState("processing");
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setState("permission-denied");
          announce(
            "Microphone permission denied. Enable microphone access in browser settings."
          );
        } else {
          setState("idle");
        }
      };

      recognition.onend = () => {
        setState((prev) => (prev === "listening" ? "idle" : prev));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setState("idle");
    }
  }, [isSupported, processSpokenPhrase, announce]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    setState("idle");
    announce("Voice control deactivated.");
  }, [announce]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state === "listening" || state === "processing") {
      stopListening();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening]);

  // Toggle reference panel
  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => !prev);
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        state,
        isSupported,
        transcript,
        recognizedCommand,
        pendingDestructiveCommand,
        availableCommands: DEFAULT_COMMANDS,
        panelOpen,
        toggleListening,
        startListening,
        stopListening,
        togglePanel,
        confirmDestructiveAction,
        cancelDestructiveAction,
        processSpokenPhrase,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoiceContext = (): VoiceContextValue => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoiceContext must be used within a VoiceProvider");
  }
  return context;
};
