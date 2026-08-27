import { useState, useRef, useEffect, useCallback } from 'react';
import './CreateStreamModal.css';
import { InputField } from './InputField';
import { InputWithUnit } from './InputWithUnit';
import { InfoTooltip } from './InfoTooltip';
import { useModalAccessibility } from './useModalAccessibility';
import { useWallet } from './wallet-connect/Walletcontext';
import { useToast } from './toast/ToastProvider';
import { useTransactionStatus } from '../hooks/useTransactionStatus';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  enqueueAction,
  dequeueAction,
  getQueuePosition,
  getQueueLength,
  subscribeToQueue,
} from '../lib/offlineActionQueue';
import { createStream, getTransactionStatus } from '../lib/stellar/tx';
import { isValidStellarAddress, maskAddress } from '../lib/stellar';
import {
  computeStreamEndDate,
  validateCliffBeforeEnd,
  formatLocalDateTime,
  isBeforeLocalDateTime,
  isDateTimeInPast,
} from '../lib/createStreamDates';
import { useI18n } from '../i18n';
// ── Bulk CSV imports ──────────────────────────────────────────────────────────
import CsvDropZone from './csv-upload/CsvDropZone';
import ColumnMappingStep from './csv-upload/ColumnMappingStep';
import PreviewValidateStep from './csv-upload/PreviewValidateStep';
import { parseCsvNumber } from './csv-upload/csvParser';
import { CsvParseCancelledError, parseCsvAsync } from './csv-upload/csvParseClient';
import type { CsvParseTask } from './csv-upload/csvParseClient';
import type { CsvRow, ParseResult, ColumnMapping, BulkStep } from './csv-upload/types';
import {
  DEFAULT_STREAM_DRAFT_ACCRUAL_RATE,
  DEFAULT_STREAM_DRAFT_DURATION,
  type StreamDraftSnapshot,
} from '../lib/streamsSessionRecovery';
import {
  evaluateContrast,
  THEME_BACKGROUNDS,
} from '../utils/contrastUtils';
import { formatReceiptAmount } from '../utils/receiptGenerator';
import { amountToSmallestUnits } from '../lib/formatters';

/** Top-level flow mode: choose between single-stream or bulk-CSV. */
type FlowMode = 'choose' | 'single' | 'bulk';

export const LABEL_COLOR_SWATCHES = [
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#00a884', label: 'Teal' },
  { hex: '#8b5cf6', label: 'Purple' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#059669', label: 'Emerald' },
  { hex: '#dc2626', label: 'Red' },
  { hex: '#fef08a', label: 'Light Yellow' },
  { hex: '#94a3b8', label: 'Muted Slate' },
  { hex: '#ffffff', label: 'White' },
  { hex: '#0a0e17', label: 'Dark' },
];

const USDC_DECIMAL_PLACES = 7;

const STEPPER_TOTAL_STEPS = 3;
const STEPPER_LABEL_KEYS = [
  "createStream.steps.recipientAmount",
  "createStream.steps.rateSchedule",
  "createStream.steps.reviewCreate",
] as const;

export function sanitizeDepositAmountInput(value: string): string {
  const digitsAndDots = value.replace(/[^0-9.]/g, "");
  const [rawInteger = "", ...fractionParts] = digitsAndDots.split(".");
  const hasDecimal = digitsAndDots.includes(".");
  const integerPart = rawInteger.replace(/^0+(?=\d)/, "");
  const normalizedInteger = integerPart || (hasDecimal ? "0" : "");
  const fractionPart = fractionParts
    .join("")
    .slice(0, USDC_DECIMAL_PLACES);

  return hasDecimal ? `${normalizedInteger}.${fractionPart}` : normalizedInteger;
}

// Keep demo stream math below JS safe-integer territory while still allowing large institutional schedules.
export const MAX_ACCRUAL_RATE = 100_000;
export const MIN_DURATION_DAYS = 1;
export const MAX_DURATION_DAYS = 3_650;
export const MAX_REQUIRED_DEPOSIT = MAX_ACCRUAL_RATE * MAX_DURATION_DAYS;

/**
 * Converts a user-entered decimal string into the numeric value used by stream
 * rate, duration, and deposit calculations.
 */
function parseStreamNumber(value: string): number {
  return parseFloat(value.replace(/,/g, ""));
}

/**
 * Calculates the total USDC deposit required for a daily stream rate across the
 * entered duration in days.
 */
function calculateRequiredDeposit(
  dailyRate: string,
  durationDays: string,
): string {
  return (
    parseStreamNumber(dailyRate || "0") * parseStreamNumber(durationDays || "0")
  ).toFixed(2);
}

/**
 * Formats a validated deposit amount for the review step without substituting
 * fabricated placeholder values.
 */
function formatReviewDeposit(value: string): string {
  return parseStreamNumber(value).toFixed(2);
}

/** Formats the daily duration unit with singular/plural copy. */
function formatDurationUnit(value: string, t: any): string {
  const count = parseStreamNumber(value);
  return count === 1 ? t("createStream.duration.day_one") : t("createStream.duration.day_other", { count });
}

function validateAccrualRate(value: string, t: any): string | undefined {
  const numericValue = parseFloat(value);

  if (!value.trim() || isNaN(numericValue) || numericValue <= 0) {
    return t("createStream.validation.ratePositive");
  }

  if (numericValue > MAX_ACCRUAL_RATE) {
    return t("createStream.validation.rateMax", { max: MAX_ACCRUAL_RATE.toLocaleString() });
  }

  return undefined;
}

function validateDuration(value: string, t: any): string | undefined {
  const numericValue = parseFloat(value);

  if (!value.trim() || isNaN(numericValue) || numericValue <= 0) {
    return t("createStream.validation.durationPositive");
  }

  if (numericValue < MIN_DURATION_DAYS) {
    return t("createStream.validation.durationMin", { min: MIN_DURATION_DAYS });
  }

  if (numericValue > MAX_DURATION_DAYS) {
    return t("createStream.validation.durationMax", { max: MAX_DURATION_DAYS.toLocaleString() });
  }

  return undefined;
}

/** Snapshot of everything `createStream` needs, captured at submit time so a
 * queued (offline) submission replays with the exact values the user reviewed. */
/** Data passed to the parent when a stream is successfully created. Used by the
 * success modal to display a branded downloadable transaction receipt. */
export interface StreamCreatedData {
  txHash?: string | null;
  amount: string;
  rate: string;
  sender: string;
  recipient: string;
}

interface StreamSubmissionPayload {
  sender: string;
  recipient: string;
  amount: string;
  start: number;
  end: number;
  cliffTime?: number;
}

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user completes the flow and clicks "Create stream" on step 3. Use to show success modal.
   * Receives transaction data (txHash, amount, rate, sender, recipient) for the downloadable receipt. */
  onStreamCreated?: (data?: StreamCreatedData) => void | Promise<void>;
  /** Called when stream creation fails after the user confirms the review step. */
  onStreamError?: (err: unknown) => void;
  /**
   * Restores step 1/2 field values when the modal opens — used by the Streams
   * session-recovery banner to resume an unsubmitted draft. Never applied past
   * step 2 (see docs/STREAMS_SESSION_RECOVERY_SPEC.md §2).
   */
  initialDraft?: StreamDraftSnapshot | null;
  /**
   * Fires with the current safe-to-persist draft fields while the modal is
   * open on step 1/2, and with `null` the instant the modal closes (any path)
   * so a completed or abandoned draft is never left resumable.
   */
  onDraftChange?: (draft: StreamDraftSnapshot | null) => void;
}

export default function CreateStreamModal({
  isOpen,
  onClose,
  onStreamCreated,
  onStreamError,
  initialDraft,
  onDraftChange,
}: CreateStreamModalProps) {
  const wallet = useWallet();
  const { addToast } = useToast();
  const { t } = useI18n();

  // ── Flow mode ─────────────────────────────────────────────────────────────
  const [flowMode, setFlowMode] = useState<FlowMode>('choose');
  const [wizardMode, setWizardMode] = useState(true);

  // ── Bulk CSV state ────────────────────────────────────────────────────────
  const [bulkStep, setBulkStep] = useState<BulkStep>('upload');
  const [bulkParseResult, setBulkParseResult] = useState<ParseResult | null>(null);
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkRows, setBulkRows] = useState<CsvRow[]>([]);
  const [bulkMapping, setBulkMapping] = useState<Partial<ColumnMapping>>({});
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  // True while the worker re-parses the raw CSV after the user confirms a
  // column mapping; PreviewValidateStep renders its loading state meanwhile.
  const [isBulkReparsing, setIsBulkReparsing] = useState(false);
  const [bulkPreviewError, setBulkPreviewError] = useState<string | null>(null);
  const bulkReparseTaskRef = useRef<CsvParseTask | null>(null);
  const [bulkDryRunConfirmed, setBulkDryRunConfirmed] = useState(false);

  // Abort any in-flight worker re-parse when the modal unmounts.
  useEffect(() => {
    return () => {
      bulkReparseTaskRef.current?.cancel();
      bulkReparseTaskRef.current = null;
    };
  }, []);
  const [bulkDryRunTotals, setBulkDryRunTotals] = useState<{
    totalStreams: number;
    totalDeposit: string;
    estimatedFees: string;
  } | null>(null);

  // ── Single-stream state ───────────────────────────────────────────────────
  const [recipient, setRecipient] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [accrualRate, setAccrualRate] = useState(DEFAULT_STREAM_DRAFT_ACCRUAL_RATE);
  const [duration, setDuration] = useState(DEFAULT_STREAM_DRAFT_DURATION);
  const [startTimeOption, setStartTimeOption] = useState<"now" | "custom">(
    "now",
  );
  const [customStartDate, setCustomStartDate] = useState("");
  const [cliffEnabled, setCliffEnabled] = useState(false);
  const [cliffDate, setCliffDate] = useState("");

  // Stream Label Color & Live Contrast Check States
  const [labelColor, setLabelColor] = useState<string>("");
  const [customHexInput, setCustomHexInput] = useState<string>("");
  const [overrideContrast, setOverrideContrast] = useState<boolean>(false);
  const [targetTheme, setTargetTheme] = useState<'light' | 'dark'>('light');
  const [focusedSwatchIndex, setFocusedSwatchIndex] = useState<number>(0);

  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [streamError, setStreamError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);
  const [hasCompletedConfirmation, setHasCompletedConfirmation] =
    useState(false);
  const [queuedSubmission, setQueuedSubmission] = useState<
    { id: string; position: number } | null
  >(null);
  const [queueLength, setQueueLength] = useState(0);
  const [isFlushingQueue, setIsFlushingQueue] = useState(false);
  const [queueFlushError, setQueueFlushError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const submitInFlightRef = useRef(false);
  const pendingSubmissionRef = useRef<StreamSubmissionPayload | null>(null);
  const flushedFromQueueRef = useRef(false);
  const isOnline = useOnlineStatus();

  // Dynamic Contrast Evaluation against selected background theme
  const bgHex = targetTheme === 'dark' ? THEME_BACKGROUNDS.dark : THEME_BACKGROUNDS.light;
  const contrastEval = labelColor
    ? evaluateContrast(labelColor, bgHex)
    : { ratio: 0, passesAA: false, formattedRatio: '' };

  const contrastState: 'no-selection' | 'AA-pass' | 'AA-fail-blocked' | 'AA-fail-overridden' = !labelColor
    ? 'no-selection'
    : contrastEval.passesAA
    ? 'AA-pass'
    : overrideContrast
    ? 'AA-fail-overridden'
    : 'AA-fail-blocked';

  const handleSwatchKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % LABEL_COLOR_SWATCHES.length;
      setFocusedSwatchIndex(nextIndex);
      const swatch = LABEL_COLOR_SWATCHES[nextIndex];
      setLabelColor(swatch.hex);
      setCustomHexInput(swatch.hex);
      setOverrideContrast(false);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + LABEL_COLOR_SWATCHES.length) % LABEL_COLOR_SWATCHES.length;
      setFocusedSwatchIndex(prevIndex);
      const swatch = LABEL_COLOR_SWATCHES[prevIndex];
      setLabelColor(swatch.hex);
      setCustomHexInput(swatch.hex);
      setOverrideContrast(false);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedSwatchIndex(0);
      const swatch = LABEL_COLOR_SWATCHES[0];
      setLabelColor(swatch.hex);
      setCustomHexInput(swatch.hex);
      setOverrideContrast(false);
    } else if (e.key === 'End') {
      e.preventDefault();
      const lastIndex = LABEL_COLOR_SWATCHES.length - 1;
      setFocusedSwatchIndex(lastIndex);
      const swatch = LABEL_COLOR_SWATCHES[lastIndex];
      setLabelColor(swatch.hex);
      setCustomHexInput(swatch.hex);
      setOverrideContrast(false);
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };
  const userDeposit = 200.0;
  const accrualRateValue = parseFloat(accrualRate || "0");
  const durationValue = parseFloat(duration || "0");
  const requiredDepositValue = accrualRateValue * durationValue;
  const requiredDeposit = calculateRequiredDeposit(accrualRate, duration);
  const transactionStatus = useTransactionStatus(submittedTxHash, {
    enabled: currentStep === 3 && Boolean(submittedTxHash),
    getStatus: getTransactionStatus,
  });
  const isConfirmationPending = transactionStatus.status === "pending";
  const isQueued = Boolean(queuedSubmission);
  // Actively in-flight (network round trip or wallet signature); close/cancel
  // stay blocked here, same as today. `isQueued` alone does NOT block them —
  // a queued submission is just captured locally, nothing is in flight yet.
  const isActivelySubmitting =
    isSubmitting || isConfirmationPending || isFlushingQueue;
  const isBusyCreating = isActivelySubmitting || isQueued;
  const submitButtonLabel =
    currentStep === 3 && isQueued
      ? t("createStream.button.queued")
      : currentStep === 3 && isFlushingQueue
        ? t("createStream.button.flushing")
        : currentStep === 3 && isSubmitting
          ? t("createStream.button.submitting")
          : currentStep === 3 && isConfirmationPending
            ? t("createStream.button.confirming")
            : currentStep === 3 && transactionStatus.status === "failed"
              ? t("createStream.button.retry")
              : currentStep === 2
                ? t("createStream.button.next")
                : t("createStream.button.create");

  const guardedClose = useCallback(() => {
    if (isActivelySubmitting) return;
    onClose();
  }, [isActivelySubmitting, onClose]);

  useModalAccessibility({
    isOpen,
    onClose: guardedClose,
    modalRef,
    initialFocusRef: recipientInputRef,
  });

  // Apply a restored draft when the modal is opened for it. Capped at step 2 —
  // never resume directly into step 3 (review/create); see spec §2.
  useEffect(() => {
    if (!isOpen || !initialDraft) return;

    setRecipient(initialDraft.recipient);
    setDepositAmount(initialDraft.depositAmount);
    setAccrualRate(initialDraft.accrualRate);
    setDuration(initialDraft.duration);
    setStartTimeOption(initialDraft.startTimeOption);
    setCustomStartDate(initialDraft.customStartDate);
    setCliffEnabled(initialDraft.cliffEnabled);
    setCliffDate(initialDraft.cliffDate);
    setCurrentStep(initialDraft.step);
    // Only re-apply when the modal transitions open; initialDraft is a one-shot
    // seed, not a controlled value the modal should keep resyncing to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Report the safe-to-persist draft fields upward while unsubmitted (step 1/2
  // only). The parent clears this to null on every close path and on success —
  // see docs/STREAMS_SESSION_RECOVERY_SPEC.md §2.
  useEffect(() => {
    if (!isOpen || currentStep > 2 || !onDraftChange) return;

    onDraftChange({
      step: currentStep === 2 ? 2 : 1,
      recipient,
      depositAmount,
      accrualRate,
      duration,
      startTimeOption,
      customStartDate,
      cliffEnabled,
      cliffDate,
    });
  }, [
    isOpen,
    currentStep,
    recipient,
    depositAmount,
    accrualRate,
    duration,
    startTimeOption,
    customStartDate,
    cliffEnabled,
    cliffDate,
    onDraftChange,
  ]);

  const getStreamErrorMessage = (err: unknown): string => {
    if (err instanceof Error && err.message.trim()) {
      return err.message;
    }
    return t("createStream.error.generic");
  };

  const buildSubmissionPayload = (): StreamSubmissionPayload => {
    const sender = wallet.address!;
    // Scale the exact deposit string to smallest units with BigInt string
    // arithmetic — no Number conversion, so large/precise deposits are exact.
    const amount = amountToSmallestUnits(
      depositAmount,
      USDC_DECIMAL_PLACES,
    ).toString();

    const start = startTimeOption === "now"
      ? Math.floor(Date.now() / 1000)
      : Math.floor(new Date(customStartDate).getTime() / 1000);

    const durationDays = parseFloat(duration) || 0;
    const durationSeconds = Math.floor(durationDays * 24 * 60 * 60);
    const end = start + durationSeconds;

    const cliffTime = cliffEnabled && cliffDate
      ? Math.floor(new Date(cliffDate).getTime() / 1000)
      : undefined;

    return { sender, recipient: recipient.trim(), amount, start, end, cliffTime };
  };

  /** Submits a payload to the network. Identical for the immediate-online
   * path and a queue flush — the confirmation/success/error handling that
   * follows (polling, toast, onStreamCreated, onClose) is the same either way. */
  const submitPayload = async (payload: StreamSubmissionPayload) => {
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    try {
      const response = await createStream(
        payload.sender,
        payload.recipient,
        payload.amount,
        payload.start,
        payload.end,
        payload.cliffTime,
      );
      if (!response.txHash) {
        throw new Error("Missing transaction hash from Stellar RPC.");
      }
      setSubmittedTxHash(response.txHash);
    } catch (err) {
      const message = getStreamErrorMessage(err);
      setStreamError(message);
      addToast(t("createStream.error.failedWithMessage", { message }), "error");
      onStreamError?.(err);
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      transactionStatus.status !== "confirmed" ||
      hasCompletedConfirmation
    ) {
      return;
    }

    setHasCompletedConfirmation(true);

    const createdData: StreamCreatedData = {
      txHash: submittedTxHash,
      amount: formatReceiptAmount(
        amountToSmallestUnits(depositAmount, USDC_DECIMAL_PLACES),
        USDC_DECIMAL_PLACES,
        "USDC",
      ),
      rate: `${accrualRate} USDC/day`,
      sender: wallet.address ?? "",
      recipient,
    };

    if (flushedFromQueueRef.current) {
      flushedFromQueueRef.current = false;
      addToast(t("createStream.queue.flushSuccessToast"), "success", undefined, {
        label: t("createStream.queue.viewStreamAction"),
        onClick: () => onStreamCreated?.(createdData),
      });
    } else {
      addToast(t("createStream.success.message"), "success");
    }
    onStreamCreated?.(createdData);
    onClose();
  }, [
    addToast,
    hasCompletedConfirmation,
    onClose,
    onStreamCreated,
    transactionStatus.status,
    t,
    submittedTxHash,
    depositAmount,
    accrualRate,
    wallet.address,
    recipient,
  ]);

  useEffect(() => {
    if (transactionStatus.status !== "failed" || !submittedTxHash) {
      return;
    }

    const message =
      transactionStatus.error ??
      t("createStream.step3.statusFailed", {
        error: "Transaction confirmation failed. Please retry.",
      });
    setStreamError(message);
    setSubmittedTxHash(null);
    setHasCompletedConfirmation(false);
    flushedFromQueueRef.current = false;
    onStreamError?.(new Error(message));
  }, [
    onStreamError,
    submittedTxHash,
    t,
    transactionStatus.error,
    transactionStatus.status,
  ]);

  // Auto-flush a queued submission as soon as connectivity returns. Runs even
  // while the modal is closed (isOpen=false only skips rendering — this
  // component and its effects stay mounted for the lifetime of the parent).
  useEffect(() => {
    if (!isOnline || !queuedSubmission) return;

    const submission = queuedSubmission;
    const payload = pendingSubmissionRef.current;
    if (!payload) return;

    let cancelled = false;

    const flush = async () => {
      setIsFlushingQueue(true);
      try {
        const response = await createStream(
          payload.sender,
          payload.recipient,
          payload.amount,
          payload.start,
          payload.end,
          payload.cliffTime,
        );
        if (cancelled) return;
        if (!response.txHash) {
          throw new Error("Missing transaction hash from Stellar RPC.");
        }
        dequeueAction(submission.id);
        pendingSubmissionRef.current = null;
        flushedFromQueueRef.current = true;
        setQueuedSubmission(null);
        setQueueLength(getQueueLength());
        setSubmittedTxHash(response.txHash);
      } catch (err) {
        if (cancelled) return;
        dequeueAction(submission.id);
        setQueuedSubmission(null);
        setQueueLength(getQueueLength());
        setQueueFlushError(getStreamErrorMessage(err));
      } finally {
        if (!cancelled) setIsFlushingQueue(false);
      }
    };

    void flush();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on queuedSubmission.id via isOnline+id; the payload comes from a ref, not a dep.
  }, [isOnline, queuedSubmission?.id]);

  // Keeps the displayed queue position in sync if other queued actions ahead
  // of this one flush or get removed (multi-submission scenario).
  useEffect(() => {
    if (!queuedSubmission) return;
    return subscribeToQueue(() => {
      setQueuedSubmission((prev) =>
        prev ? { ...prev, position: getQueuePosition(prev.id) } : prev,
      );
      setQueueLength(getQueueLength());
    });
  }, [queuedSubmission?.id]);

  const resetTransactionState = () => {
    transactionStatus.reset();
    setSubmittedTxHash(null);
    setHasCompletedConfirmation(false);
    setQueueFlushError(null);
    flushedFromQueueRef.current = false;
  };

  const validateStep1 = (): boolean => {
    const fieldErrors: Record<string, string> = {};
    
    if (!recipient.trim()) {
      fieldErrors.recipient = t("createStream.validation.recipientRequired");
    } else {
      const normalizedRecipient = recipient.trim();
      
      if (wallet.connected && wallet.address && normalizedRecipient.toLowerCase() === wallet.address.toLowerCase()) {
        fieldErrors.recipient = "Recipient cannot be the same as the connected wallet address.";
      } else if (!isValidStellarAddress(normalizedRecipient)) {
        fieldErrors.recipient = t("createStream.validation.recipientInvalid");
      }
    }
    
    const amount = parseFloat(depositAmount.replace(/,/g, ""));
    if (!depositAmount.trim() || isNaN(amount) || amount <= 0) {
      fieldErrors.depositAmount = t("createStream.validation.depositPositive");
    }

    if (contrastState === 'AA-fail-blocked') {
      fieldErrors.labelColor = "Please select a high-contrast label color or check 'Use anyway' to proceed.";
    }

    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const validateStep2 = (): Record<string, string> => {
    // Mark all active step-2 fields as touched
    const touchedFields: Record<string, boolean> = {
      accrualRate: true,
      duration: true,
    };
    if (startTimeOption === 'custom') {
      touchedFields.customStartDate = true;
    }
    if (cliffEnabled) {
      touchedFields.cliffDate = true;
    }
    setTouched(prev => ({ ...prev, ...touchedFields }));

    const fieldErrors: Record<string, string> = {};

    const rateError = validateAccrualRate(accrualRate, t);
    if (rateError) {
      fieldErrors.accrualRate = rateError;
    }

    const durationError = validateDuration(duration, t);
    if (durationError) {
      fieldErrors.duration = durationError;
    }

    if (!Number.isFinite(requiredDepositValue) || requiredDepositValue > MAX_REQUIRED_DEPOSIT) {
      fieldErrors.deposits = "Required deposit exceeds maximum allowed amount.";
    }
    if (parseFloat(requiredDeposit) > userDeposit) {
      fieldErrors.deposits = "Required deposit exceeds available balance.";
    }

    if (startTimeOption === 'custom') {
      if (!customStartDate) {
        fieldErrors.customStartDate = t("createStream.validation.startDateRequired");
      } else if (isDateTimeInPast(customStartDate)) {
        fieldErrors.customStartDate = t("createStream.validation.startDateFuture");
      }
    }

    if (cliffEnabled) {
      if (!cliffDate) {
        fieldErrors.cliffDate = t("createStream.validation.cliffDateRequired");
      } else if (isDateTimeInPast(cliffDate)) {
        fieldErrors.cliffDate = t("createStream.validation.cliffDatePast");
      } else if (startTimeOption === 'custom' && customStartDate && isBeforeLocalDateTime(cliffDate, customStartDate)) {
        fieldErrors.cliffDate = t("createStream.validation.cliffDateAfterStart");
      } else {
        // Cross-field: cliff must not exceed stream end date
        const selectedCliffDate = new Date(cliffDate);
        const startMs = startTimeOption === 'custom' && customStartDate
          ? new Date(customStartDate).getTime()
          : Date.now();
        const endDate = computeStreamEndDate(new Date(startMs), parseFloat(duration));
        if (endDate && validateCliffBeforeEnd(selectedCliffDate, endDate) !== null) {
          fieldErrors.cliffDate = validateCliffBeforeEnd(selectedCliffDate, endDate) || "Cliff date must be before stream end date";
        }
      }
    }

    setErrors(prev => ({ ...prev, ...fieldErrors }));
    return fieldErrors;
  };

  /** Combined validation for Advanced mode: runs all field validators at once. */
  const validateAllFields = (): boolean => {
    setError(null);
    setTouched(prev => ({
      ...prev,
      recipient: true,
      depositAmount: true,
      accrualRate: true,
      duration: true,
      ...(startTimeOption === 'custom' ? { customStartDate: true } : {}),
      ...(cliffEnabled ? { cliffDate: true } : {}),
    }));

    const step1Errors: Record<string, string> = {};
    const step2Errors: Record<string, string> = {};

    // Step 1 validations
    if (!recipient.trim()) {
      step1Errors.recipient = t("createStream.validation.recipientRequired");
    } else {
      const normalizedRecipient = recipient.trim();
      
      if (wallet.connected && wallet.address && normalizedRecipient.toLowerCase() === wallet.address.toLowerCase()) {
        step1Errors.recipient = "Recipient cannot be the same as the connected wallet address.";
      } else if (!isValidStellarAddress(normalizedRecipient)) {
        step1Errors.recipient = t("createStream.validation.recipientInvalid");
      }
    }
    
    const amount = parseFloat(depositAmount.replace(/,/g, ""));
    if (!depositAmount.trim() || isNaN(amount) || amount <= 0) {
      step1Errors.depositAmount = t("createStream.validation.depositPositive");
    }

    // Step 2 validations
    const accrualRateError = validateAccrualRate(accrualRate, t);
    if (accrualRateError) {
      step2Errors.accrualRate = accrualRateError;
    }
    const durationError = validateDuration(duration, t);
    if (durationError) {
      step2Errors.duration = durationError;
    }
    if (!Number.isFinite(requiredDepositValue) || requiredDepositValue > MAX_REQUIRED_DEPOSIT) {
      step2Errors.deposits = "Required deposit exceeds maximum allowed amount.";
    }
    if (parseFloat(requiredDeposit) > userDeposit) {
      step2Errors.deposits = "Required deposit exceeds available balance.";
    }
    
    if (startTimeOption === 'custom') {
      if (!customStartDate) {
        step2Errors.customStartDate = t("createStream.validation.startDateRequired");
      } else if (isDateTimeInPast(customStartDate)) {
        step2Errors.customStartDate = t("createStream.validation.startDateFuture");
      }
    }
    
    if (cliffEnabled) {
      if (!cliffDate) {
        step2Errors.cliffDate = t("createStream.validation.cliffDateRequired");
      } else if (isDateTimeInPast(cliffDate)) {
        step2Errors.cliffDate = t("createStream.validation.cliffDatePast");
      } else if (startTimeOption === 'custom' && customStartDate && isBeforeLocalDateTime(cliffDate, customStartDate)) {
        step2Errors.cliffDate = t("createStream.validation.cliffDateAfterStart");
      } else {
        // Cross-field: cliff must not exceed stream end date
        const selectedCliffDate = new Date(cliffDate);
        const startMs = startTimeOption === 'custom' && customStartDate
          ? new Date(customStartDate).getTime()
          : Date.now();
        const endDate = computeStreamEndDate(new Date(startMs), parseFloat(duration));
        if (endDate && validateCliffBeforeEnd(selectedCliffDate, endDate) !== null) {
          step2Errors.cliffDate = validateCliffBeforeEnd(selectedCliffDate, endDate) || "Cliff date must be before stream end date";
        }
      }
    }

    const hasGeneralError = contrastState === 'AA-fail-blocked';
    
    setErrors(step1Errors);

    // Invalid recipient/deposit fields must block submission — otherwise a
    // malformed amount could silently reach the on-chain payload as 0.
    if (Object.keys(step1Errors).length > 0) return false;

    if (step2Errors.accrualRate || step2Errors.duration || step2Errors.deposits || step2Errors.customStartDate || step2Errors.cliffDate) {
      setErrors(prev => ({ ...prev, ...step2Errors }));
      return false;
    }

    if (hasGeneralError) {
      setError("Please select a high-contrast label color or check 'Use anyway' to proceed.");
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    if (isBusyCreating) return;

    // Advanced mode: validate all fields at once, then submit directly
    if (!wizardMode) {
      setError(null);
      if (!validateAllFields()) return;
      if (!wallet.connected) {
        setError(t("createStream.validation.walletNotConnected"));
        return;
      }
      if (wallet.isNetworkMismatch) {
        setError(t("createStream.validation.networkMismatch", {
          expected: wallet.expectedNetwork,
          actual: wallet.network?.toUpperCase() || "",
        }));
        return;
      }
      setStreamError(null);
      resetTransactionState();
      const payload = buildSubmissionPayload();
      if (!isOnline) {
        const entry = enqueueAction(payload);
        pendingSubmissionRef.current = payload;
        setQueuedSubmission({ id: entry.id, position: getQueuePosition(entry.id) });
        setQueueLength(getQueueLength());
        return;
      }
      await submitPayload(payload);
      return;
    }

    if (currentStep === 1) {
      setTouched(prev => ({ ...prev, recipient: true, depositAmount: true }));
      if (!validateStep1()) return;
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      const step2Errors = validateStep2();
      if (Object.keys(step2Errors).length > 0) return;
      resetTransactionState();
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (submitInFlightRef.current) return;

      if (!wallet.connected) {
        setError(t("createStream.validation.walletNotConnected"));
        return;
      }
      if (wallet.isNetworkMismatch) {
        setError(t("createStream.validation.networkMismatch", {
          expected: wallet.expectedNetwork,
          actual: wallet.network?.toUpperCase() || "",
        }));
        return;
      }

      setError(null);
      setStreamError(null);
      resetTransactionState();

      const payload = buildSubmissionPayload();

      if (!isOnline) {
        // Capture locally instead of hanging on a request that can't reach
        // the network. Flushed automatically by the effect above once the
        // `online` event fires.
        const entry = enqueueAction(payload);
        pendingSubmissionRef.current = payload;
        setQueuedSubmission({ id: entry.id, position: getQueuePosition(entry.id) });
        setQueueLength(getQueueLength());
        return;
      }

      // Unchanged online path.
      await submitPayload(payload);
    }
  };

  const handleRetryQueuedSubmission = async () => {
    const payload = pendingSubmissionRef.current;
    if (!payload) return;
    setQueueFlushError(null);

    if (!isOnline) {
      const entry = enqueueAction(payload);
      setQueuedSubmission({ id: entry.id, position: getQueuePosition(entry.id) });
      setQueueLength(getQueueLength());
      return;
    }

    await submitPayload(payload);
  };

  const handleEditQueuedSubmission = () => {
    setQueueFlushError(null);
    pendingSubmissionRef.current = null;
    setCurrentStep(1);
  };

  const handleBack = () => {
    if (isBusyCreating) return;

    if (currentStep === 3) {
      resetTransactionState();
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      onClose();
    }
  };

  /** Jumps back to a completed step via the stepper header. Mirrors the
   * review-card "Edit" buttons: only ever moves backward, and clears any
   * in-flight transaction state the same way leaving step 3 already does. */
  const handleStepClick = (step: number) => {
    if (isBusyCreating || step >= currentStep) return;
    if (currentStep === 3) {
      resetTransactionState();
    }
    setCurrentStep(step);
  };

  const handleCancel = () => {
    // Intentionally checks isActivelySubmitting, not isBusyCreating: a
    // queued-offline submission must not block Cancel from closing the modal.
    if (isActivelySubmitting) return;
    onClose();
  };

  const handleClose = () => {
    if (isActivelySubmitting) return;
    onClose();
  };

  // ── Bulk CSV handlers ─────────────────────────────────────────────────────

  const resetBulkState = () => {
    bulkReparseTaskRef.current?.cancel();
    bulkReparseTaskRef.current = null;
    setBulkStep('upload');
    setBulkParseResult(null);
    setBulkRawText('');
    setBulkRows([]);
    setBulkMapping({});
    setIsBulkSubmitting(false);
    setIsBulkReparsing(false);
    setBulkPreviewError(null);
  };

  const handleBulkParsed = (result: ParseResult, _fileName: string, rawText: string) => {
    setBulkParseResult(result);
    setBulkRawText(rawText);
    setBulkMapping(result.autoMapping);
    if (result.headersMatch) {
      setBulkRows(result.rows);
      setBulkStep('preview');
    } else {
      setBulkStep('mapping');
    }
  };

  const handleBulkMappingConfirmed = (mapping: ColumnMapping) => {
    setBulkMapping(mapping);
    if (!bulkRawText) {
      setBulkStep('preview');
      return;
    }
    // Re-parse the raw CSV with the user's mapping on the worker so the UI
    // stays responsive; PreviewValidateStep shows a loading state meanwhile.
    bulkReparseTaskRef.current?.cancel();
    setBulkPreviewError(null);
    setIsBulkReparsing(true);
    setBulkStep('preview');
    const task = parseCsvAsync(bulkRawText, mapping);
    bulkReparseTaskRef.current = task;
    void task.promise
      .then((result) => {
        setBulkRows(result.rows);
        setIsBulkReparsing(false);
      })
      .catch((err) => {
        if (err instanceof CsvParseCancelledError) return;
        setBulkPreviewError(
          'Failed to re-parse the CSV with the selected mapping. Please try again.',
        );
        setIsBulkReparsing(false);
      });
  };

  const handleBulkReplaceFile = () => {
    resetBulkState();
  };

  const handleBulkBack = () => {
    if (bulkStep === 'dryRun') {
      setBulkStep('preview');
    } else if (bulkStep === 'preview') {
      if (bulkParseResult && !bulkParseResult.headersMatch) {
        setBulkStep('mapping');
      } else {
        setBulkStep('upload');
      }
    } else if (bulkStep === 'mapping') {
      setBulkStep('upload');
    } else {
      resetBulkState();
      setFlowMode('choose');
    }
  };

  // ── Dry-run review: calculate aggregate totals and transition to dry‑run confirmation ──

  const handleBulkReview = useCallback(() => {
    const validRows = bulkRows.filter((r) => r.status === 'valid');
    if (validRows.length === 0) return;
    const totalDeposit = validRows.reduce((sum, r) => {
      return sum + (parseFloat(r.depositAmount.replace(/,/g, '')) || 0);
    }, 0);
    // Estimate fees as 100 micropoints (0.0001 XLM) per stream operation.
    const estimatedFees = validRows.length * 0.0001;
    setBulkDryRunTotals({
      totalStreams: validRows.length,
      totalDeposit: totalDeposit.toFixed(2),
      estimatedFees: estimatedFees.toFixed(4),
    });
    setBulkStep('dryRun');
  }, [bulkRows]);

  const renderDryRunStep = () => {
    const totals = bulkDryRunTotals;
    const validCount = bulkRows.filter((r) => r.status === 'valid').length;
    const errorCount = bulkRows.filter(
      (r) => r.status === 'needs-fix',
    ).length;
    const dupCount = bulkRows.filter(
      (r) => r.status === 'duplicate-recipient',
    ).length;
    const skippedCount = bulkRows.filter(
      (r) => r.status === 'skipped',
    ).length;

    return (
      <>
        <div className="modal-body-scroll">
          <hr className="divider" />
          <div className="section-header">
            <h3>
              {t("csvUpload.dryRun.title")}
            </h3>
            <p>
              {t("csvUpload.dryRun.subtitle")}
            </p>
          </div>

          {/* ── Aggregate summary card ── */}
          <div
            className="dry-run-summary"
            role="region"
            aria-labelledby="dry-run-summary-title"
          >
            <h4
              id="dry-run-summary-title"
              className="dry-run-summary__title"
            >
              {t("csvUpload.dryRun.outcome")}
            </h4>
            {totals ? (
              <div className="dry-run-summary__cards" aria-live="polite">
                <div className="dry-run-summary__card">
                  <span className="dry-run-summary__label">
                    {t("csvUpload.dryRun.totalStreams")}
                  </span>
                  <span className="dry-run-summary__value">
                    {totals.totalStreams}
                  </span>
                </div>
                <div className="dry-run-summary__card">
                  <span className="dry-run-summary__label">
                    {t("csvUpload.dryRun.totalDeposit")}
                  </span>
                  <span className="dry-run-summary__value">
                    {totals.totalDeposit} USDC
                  </span>
                </div>
                <div className="dry-run-summary__card">
                  <span className="dry-run-summary__label">
                    {t("csvUpload.dryRun.totalEstimatedFees")}
                  </span>
                  <span className="dry-run-summary__value">
                    ~{totals.estimatedFees} XLM
                  </span>
                </div>
              </div>
            ) : (
              <div className="dry-run-summary__calculating">
                {t("csvUpload.dryRun.calculating")}
              </div>
            )}
            <div className="dry-run-summary__counts">
              <span className="csv-preview-badge csv-preview-badge--valid">
                {t("csvUpload.dryRun.validRows")}: {validCount}
              </span>
              {skippedCount > 0 && (
                <span className="csv-preview-badge csv-preview-badge--skipped">
                  {t("csvUpload.dryRun.skippedRows")}: {skippedCount}
                </span>
              )}
              {errorCount > 0 && (
                <span className="csv-preview-badge csv-preview-badge--error">
                  {t("csvUpload.dryRun.errorRows")}: {errorCount}
                </span>
              )}
              {dupCount > 0 && (
                <span className="csv-preview-badge csv-preview-badge--warning">
                  {t("csvUpload.dryRun.duplicateRows")}: {dupCount}
                </span>
              )}
            </div>

            {/* ── Partial-failure risk preview ── */}
            {(errorCount > 0 || dupCount > 0) && (
              <div
                className="dry-run-partial-warning"
                role="alert"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>
                  {t("csvUpload.dryRun.partialFailureWarning", {
                    failed: errorCount + dupCount,
                    total: bulkRows.length,
                  })}
                </span>
              </div>
            )}
          </div>

          {/* ── Per-row outcome list ── */}
          <div
            className="csv-preview-scroll"
            role="region"
            aria-label="Dry-run outcome list. Scroll horizontally to see all rows."
            tabIndex={0}
          >
            <table
              className="csv-preview-table"
              role="table"
              aria-label="Dry-run outcome per row"
            >
              <thead>
                <tr>
                  <th scope="col" className="csv-th csv-th--num">
                    #
                  </th>
                  <th scope="col" className="csv-th csv-th--recipient">
                    Recipient
                  </th>
                  <th scope="col" className="csv-th csv-th--amount">
                    Deposit (USDC)
                  </th>
                  <th scope="col" className="csv-th csv-th--status">
                    {t("csvUpload.dryRun.outcome")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((row) => {
                  const statusLabel =
                    row.status === 'valid'
                      ? t("csvUpload.dryRun.statusSuccess")
                      : row.status === 'duplicate-recipient'
                        ? t("csvUpload.dryRun.statusWarning")
                        : row.status === 'skipped'
                          ? t("csvUpload.dryRun.skippedRows")
                          : t("csvUpload.dryRun.statusError");
                  return (
                    <tr key={row.id}>
                      <td className="csv-td csv-td--num">
                        {row.rowNumber}
                      </td>
                      <td className="csv-td csv-td--recipient">
                        <span
                          className="csv-address"
                          title={row.recipient}
                        >
                          {row.recipient
                            ? `${row.recipient.slice(0, 8)}…${row.recipient.slice(-6)}`
                            : <span className="csv-empty">—</span>}
                        </span>
                      </td>
                      <td className="csv-td">
                        {row.depositAmount || (
                          <span className="csv-empty">—</span>
                        )}
                      </td>
                      <td className="csv-td csv-td--status">
                        {statusLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Confirmation checkbox & submit ── */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-back"
            onClick={() => setBulkStep('preview')}
            disabled={isBulkSubmitting || bulkDryRunConfirmed}
          >
            {t("csvUpload.dryRun.back")}
          </button>
          <label
            className="dry-run-confirmation-checkbox"
            htmlFor="batch-confirm-checkbox"
          >
            <input
              type="checkbox"
              id="batch-confirm-checkbox"
              className="dry-run-confirmation-checkbox__input"
              checked={bulkDryRunConfirmed}
              onChange={(e) => setBulkDryRunConfirmed(e.target.checked)}
            />
            <span>
              {t("csvUpload.dryRun.confirmationLabel", {
                count: validCount,
              })}
            </span>
          </label>
          <button
            type="button"
            className="btn btn-next dry-run-submit-btn"
            disabled={!bulkDryRunConfirmed || isBulkSubmitting || validCount === 0}
            onClick={() => handleBulkSubmit(bulkRows)}
            aria-busy={isBulkSubmitting}
          >
            {isBulkSubmitting
              ? t("csvUpload.dryRun.submitting")
              : t("csvUpload.dryRun.submitBtn", { count: validCount })}
          </button>
        </div>
      </>
    );
  };

  const handleBulkSubmit = async (rows: CsvRow[]) => {
    const validRows = rows.filter((r) => r.status === 'valid');
    if (validRows.length === 0) return;
    if (!wallet.connected) {
      addToast(t('createStream.validation.walletNotConnected'), 'error');
      return;
    }
    if (wallet.isNetworkMismatch) {
      addToast(
        t('createStream.validation.networkMismatch', {
          expected: wallet.expectedNetwork,
          actual: wallet.network?.toUpperCase() || '',
        }),
        'error',
      );
      return;
    }
    setIsBulkSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      addToast(`Submitting stream ${i + 1} of ${validRows.length}…`, 'info');
      try {
        const sender = wallet.address!;
        const amountStr = Math.floor(
          (parseCsvNumber(row.depositAmount) || 0) * 10_000_000,
        ).toString();
        const start = Math.floor(Date.now() / 1000);
        const end = start + Math.floor(parseCsvNumber(row.durationDays) * 86_400);
        await createStream(sender, row.recipient.trim(), amountStr, start, end);
        successCount++;
      } catch {
        failCount++;
      }
    }
    setIsBulkSubmitting(false);
    if (failCount === 0) {
      addToast(`${successCount} of ${validRows.length} streams created successfully.`, 'success');
      onStreamCreated?.();
      onClose();
    } else {
      addToast(
        `${successCount} of ${validRows.length} streams created. ${failCount} failed.`,
        'error',
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay create-stream-overlay" onClick={handleClose}>
      <div
        className="modal-content create-stream-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-stream-title"
        aria-describedby="create-stream-description"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="create-stream-title">{t("createStream.title")}</h2>
            <p id="create-stream-description" className="modal-description">
              {flowMode === 'bulk'
                ? (bulkStep === 'upload'
                    ? 'Upload a CSV file with recipient addresses and stream details.'
                    : bulkStep === 'mapping'
                      ? "We couldn't auto-detect all required columns. Map each required field to a column in your file."
                      : `Reviewing ${bulkRows.length} stream${bulkRows.length !== 1 ? 's' : ''}`)
                : flowMode === 'single' && !wizardMode
                  ? 'All fields in a single view — configure recipient, rate, schedule, and cliff.'
                  : t("createStream.description")}
            </p>
          </div>
          {flowMode === 'single' && (
            <div
              className="mode-toggle"
              role="radiogroup"
              aria-label={t("createStream.modeToggle.ariaLabel", { mode: wizardMode ? 'wizard' : 'advanced' })}
            >
              <button
                type="button"
                role="radio"
                aria-checked={wizardMode}
                aria-label={t("createStream.modeToggle.wizardAria")}
                className={`mode-toggle__btn ${wizardMode ? 'mode-toggle__btn--active' : ''}`}
                onClick={() => setWizardMode(true)}
              >
                {t("createStream.modeToggle.wizardLabel")}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!wizardMode}
                aria-label={t("createStream.modeToggle.advancedAria")}
                className={`mode-toggle__btn ${!wizardMode ? 'mode-toggle__btn--active' : ''}`}
                onClick={() => setWizardMode(false)}
              >
                {t("createStream.modeToggle.advancedLabel")}
              </button>
            </div>
          )}
          <button
            type="button"
            className="close-button"
            onClick={handleClose}
            disabled={isActivelySubmitting || isBulkSubmitting}
            aria-label={t("createStream.accessibility.closeLabel")}
          >
            <svg
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ── Mode: choose ─────────────────────────────────────────────── */}
        {flowMode === 'choose' && (
          <>
            <hr className="divider" />
            <div className="section-header">
              <h3>How would you like to create streams?</h3>
            </div>
            <div className="mode-selection">
              <button
                type="button"
                className="mode-card"
                onClick={() => setFlowMode('single')}
                aria-label="Create a single stream: step through recipient, rate, and schedule"
              >
                <span className="mode-card__icon" aria-hidden="true">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <div className="mode-card__body">
                  <span className="mode-card__title">Create a single stream</span>
                  <span className="mode-card__desc">Step through recipient, rate, and schedule for one stream.</span>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="mode-card__chevron">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                className="mode-card"
                onClick={() => setFlowMode('bulk')}
                aria-label="Bulk create from CSV: upload a CSV file to create multiple streams at once"
              >
                <span className="mode-card__icon" aria-hidden="true">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <div className="mode-card__body">
                  <span className="mode-card__title">Bulk create from CSV</span>
                  <span className="mode-card__desc">Upload a CSV file to create multiple streams at once.</span>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="mode-card__chevron">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-cancel" onClick={handleCancel}>
                {t("createStream.button.cancel")}
              </button>
            </div>
          </>
        )}

        {/* ── Mode: bulk ───────────────────────────────────────────────── */}
        {flowMode === 'bulk' && (
          <>
            {/* Bulk progress tracker */}
            <div className="progress-tracker">
              <div className="progress-line">
                <div
                  className="progress-line-fill"
                  style={{
                    width: bulkStep === 'upload' ? '0%' : bulkStep === 'mapping' ? '50%' : '100%',
                  }}
                />
              </div>
              {(['upload', 'mapping', 'preview'] as BulkStep[]).map((step, idx) => {
                const labels = ['Upload', 'Map columns', 'Review'];
                const isActive = bulkStep === step;
                const isPast =
                  (step === 'upload' && (bulkStep === 'mapping' || bulkStep === 'preview')) ||
                  (step === 'mapping' && bulkStep === 'preview');
                return (
                  <div key={step} className={`step-item ${isActive ? 'active' : ''} ${isPast ? 'completed' : ''}`}>
                    <div className="step-circle">
                      {isPast ? (
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : idx + 1}
                    </div>
                    <div className="step-label">{labels[idx]}</div>
                  </div>
                );
              })}
            </div>

            <div className="modal-body-scroll">
              <hr className="divider" />
              <div className="section-header">
                <h3>
                  {bulkStep === 'upload' ? 'Upload recipient CSV'
                    : bulkStep === 'mapping' ? 'Map your columns'
                    : `Review ${bulkRows.length} stream${bulkRows.length !== 1 ? 's' : ''}`}
                </h3>
              </div>

              {bulkStep === 'upload' && (
                <CsvDropZone onParsed={handleBulkParsed} />
              )}

              {bulkStep === 'mapping' && bulkParseResult && (
                <ColumnMappingStep
                  detectedHeaders={bulkParseResult.detectedHeaders}
                  initialMapping={bulkMapping}
                  onMappingConfirmed={handleBulkMappingConfirmed}
                />
              )}

              {bulkStep === 'preview' && (
                  <PreviewValidateStep
                    rows={bulkRows}
                    onRowsChange={setBulkRows}
                    onReview={handleBulkReview}
                    onReplaceFile={handleBulkReplaceFile}
                    isLoading={isBulkReparsing}
                    error={bulkPreviewError}
                    onRetry={() => {
                      if (bulkMapping && Object.keys(bulkMapping).length > 0) {
                        handleBulkMappingConfirmed(bulkMapping as ColumnMapping);
                      }
                    }}
                  />
                )}

                {bulkStep === 'dryRun' && renderDryRunStep()}
            </div>

            {/* Bulk footer — hidden on preview step (PreviewValidateStep has its own) */}
            {bulkStep !== 'preview' && bulkStep !== 'dryRun' && (
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-back"
                  onClick={handleBulkBack}
                  disabled={isBulkSubmitting}
                >
                  {t("createStream.button.back")}
                </button>
                {bulkStep === 'upload' && (
                  <button
                    type="button"
                    className="btn btn-next"
                    disabled={!bulkParseResult || Boolean(bulkParseResult.parseError)}
                    onClick={() => {
                      if (!bulkParseResult) return;
                      if (bulkParseResult.headersMatch) {
                        setBulkRows(bulkParseResult.rows);
                        setBulkStep('preview');
                      } else {
                        setBulkStep('mapping');
                      }
                    }}
                  >
                    {t("createStream.button.next")}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Mode: single (existing 3-step flow) ──────────────────────── */}
        {flowMode === 'single' && (
          <>
        {wizardMode && (() => {
          const stepLabels = STEPPER_LABEL_KEYS.map((key) => t(key));
          const currentLabel = stepLabels[currentStep - 1];
          const trackFillPercent =
            ((currentStep - 1) / (STEPPER_TOTAL_STEPS - 1)) * 100;
          const renderStepLabel = (label: string) => {
            const [p1, p2] = label.split(" & ");
            return p2 ? <>{p1} &<br />{p2}</> : label;
          };

          return (
            <nav
              className="stepper"
              aria-label={t("createStream.stepper.navLabel")}
            >
              <div className="stepper-track-wrapper">
                <div className="stepper-track" aria-hidden="true">
                  <div
                    className="stepper-track-fill"
                    style={{ width: `${trackFillPercent}%` }}
                  />
                </div>
                <ol className="stepper-list">
                {stepLabels.map((label, index) => {
                  const step = index + 1;
                  const isCompleted = step < currentStep;
                  const isCurrent = step === currentStep;

                  if (isCompleted) {
                    return (
                      <li
                        key={step}
                        className="stepper-item stepper-item--completed"
                      >
                        <button
                          type="button"
                          className="stepper-step stepper-step--completed"
                          onClick={() => handleStepClick(step)}
                          disabled={isBusyCreating}
                          aria-label={t("createStream.stepper.jumpToStepAria", {
                            step,
                            label,
                          })}
                        >
                          <span className="stepper-circle" aria-hidden="true">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          <span className="stepper-label">{renderStepLabel(label)}</span>
                        </button>
                      </li>
                    );
                  }

                  return (
                    <li
                      key={step}
                      className={`stepper-item ${isCurrent ? "stepper-item--current" : "stepper-item--upcoming"}`}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      <span className="stepper-step">
                        <span className="stepper-circle" aria-hidden="true">
                          {step}
                        </span>
                        <span className="stepper-label">{renderStepLabel(label)}</span>
                      </span>
                    </li>
                  );
                })}
                </ol>
              </div>

              <div className="stepper-compact">
                <p className="stepper-compact-text">
                  {t("createStream.stepper.compactStatus", {
                    current: currentStep,
                    total: STEPPER_TOTAL_STEPS,
                    label: currentLabel,
                  })}
                </p>
                <div className="stepper-compact-track" aria-hidden="true">
                  <div
                    className="stepper-compact-fill"
                    style={{ width: `${trackFillPercent}%` }}
                  />
                </div>
              </div>
            </nav>
          );
        })()}

        <div className="modal-body-scroll">
          {error && (
            <div className="validation-message validation-message--error" style={{ margin: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 107, 107, 0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }} role="alert">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
                <path d="M6 3.5V6.5" stroke="currentColor" strokeLinecap="round" />
                <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {currentStep === 1 && (
          <>
            <hr className="divider" />
            <div className="section-header">
              <h3>{t("createStream.step1.header")}</h3>
              <p>{t("createStream.step1.subheader")}</p>
            </div>
            {(() => {
              // Derived per-field validation state (not stored, computed inline)
              const recipientError = touched.recipient
                ? (!recipient.trim()
                    ? t("createStream.validation.recipientRequired")
                    : (wallet.connected && wallet.address && recipient.trim().toLowerCase() === wallet.address.toLowerCase())
                    ? 'Recipient cannot be the same as the connected wallet address.'
                    : !isValidStellarAddress(recipient.trim())
                    ? t("createStream.validation.recipientInvalid")
                    : undefined)
                : undefined;
              const recipientSuccess = touched.recipient && !recipientError && recipient.trim().length > 0;

              const depositAmountNum = parseFloat(depositAmount.replace(/,/g, ''));
              const depositError = touched.depositAmount
                ? (!depositAmount.trim() || isNaN(depositAmountNum) || depositAmountNum <= 0
                    ? t("createStream.validation.depositPositive")
                    : undefined)
                : undefined;
              const depositSuccess = touched.depositAmount && !depositError && depositAmount.trim().length > 0;

              return (
                <>
                  <InputField
                    id="create-stream-recipient"
                    label={t("createStream.step1.recipientLabel")}
                    required
                    error={recipientError}
                    helperText={t("createStream.step1.recipientHelper")}
                    success={recipientSuccess}
                  >
                    <input
                      ref={recipientInputRef}
                      type="text"
                      className="input-field"
                      value={recipient}
                      onChange={(e) => {
                        setRecipient(e.target.value);
                        if (errors.recipient) setErrors(prev => ({ ...prev, recipient: undefined }));
                      }}
                      onBlur={() => handleBlur('recipient')}
                      placeholder={t("createStream.step1.recipientPlaceholder")}
                      autoComplete="off"
                    />
                  </InputField>

                  <InputField
                    id="create-stream-deposit"
                    label={t("createStream.step1.depositLabel")}
                    required
                    error={depositError}
                    helperText={t("createStream.step1.depositHelper")}
                    success={depositSuccess}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input-field"
                      value={depositAmount}
                      onChange={(e) => {
                        const v = sanitizeDepositAmountInput(e.target.value);
                        setDepositAmount(v);
                        if (errors.depositAmount) setErrors(prev => ({ ...prev, depositAmount: undefined }));
                      }}
                      onBlur={() => handleBlur('depositAmount')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleNext();
                        }
                      }}
                      placeholder={t("createStream.step1.depositPlaceholder")}
                    />
                  </InputField>

                  {/* Stream Label Color Swatch Picker & Live Contrast Check */}
                  <div className="label-color-section" role="region" aria-labelledby="label-color-heading">
                    <div className="label-color-header">
                      <label id="label-color-heading" className="label-color-title">
                        Stream Label Color <span style={{ color: 'var(--muted)', fontWeight: 'normal' }}>(Optional)</span>
                      </label>
                      <div className="swatch-theme-toggle" role="group" aria-label="Contrast background theme preview">
                        <span>Against:</span>
                        <button
                          type="button"
                          className={targetTheme === 'light' ? 'active' : ''}
                          onClick={() => setTargetTheme('light')}
                          aria-pressed={targetTheme === 'light'}
                        >
                          Light (#FFF)
                        </button>
                        <button
                          type="button"
                          className={targetTheme === 'dark' ? 'active' : ''}
                          onClick={() => setTargetTheme('dark')}
                          aria-pressed={targetTheme === 'dark'}
                        >
                          Dark (#0A0E17)
                        </button>
                      </div>
                    </div>

                    {/* Swatch Grid */}
                    <div
                      className="swatch-grid"
                      role="radiogroup"
                      aria-label="Stream label color swatches"
                    >
                      {LABEL_COLOR_SWATCHES.map((swatch, idx) => {
                        const isSelected = labelColor.toLowerCase() === swatch.hex.toLowerCase();
                        const isFocused = focusedSwatchIndex === idx;
                        const isLightSwatch = ['#ffffff', '#fef08a', '#94a3b8'].includes(swatch.hex.toLowerCase());

                        return (
                          <button
                            key={swatch.hex}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${swatch.label} (${swatch.hex})`}
                            tabIndex={isFocused || (focusedSwatchIndex === 0 && idx === 0) ? 0 : -1}
                            className={`swatch-btn ${isSelected ? 'selected' : ''} ${isLightSwatch ? 'swatch-btn--light' : ''}`}
                            style={{ backgroundColor: swatch.hex }}
                            onClick={() => {
                              setLabelColor(swatch.hex);
                              setCustomHexInput(swatch.hex);
                              setFocusedSwatchIndex(idx);
                              setOverrideContrast(false);
                              if (error) setError(null);
                            }}
                            onKeyDown={(e) => handleSwatchKeyDown(e, idx)}
                          >
                            {isSelected && (
                              <svg
                                className="swatch-btn-checkmark"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        );
                      })}

                      {labelColor && (
                        <button
                          type="button"
                          className="swatch-clear-btn"
                          onClick={() => {
                            setLabelColor('');
                            setCustomHexInput('');
                            setOverrideContrast(false);
                            if (error) setError(null);
                          }}
                          aria-label="Clear label color selection"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Custom Hex Row */}
                    <div className="swatch-custom-input-row">
                      <label htmlFor="custom-label-hex" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Custom Hex:
                      </label>
                      <input
                        id="custom-label-hex"
                        type="text"
                        className="swatch-custom-input"
                        placeholder="#3B82F6"
                        maxLength={7}
                        value={customHexInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomHexInput(val);
                          if (error) setError(null);
                          if (/^#?[0-9A-Fa-f]{6}$/.test(val)) {
                            const formatted = val.startsWith('#') ? val : `#${val}`;
                            setLabelColor(formatted);
                            setOverrideContrast(false);
                          }
                        }}
                      />
                    </div>

                    {/* Live Contrast Indicator Badge */}
                    <div
                      className="contrast-badge-container"
                      aria-live="polite"
                      aria-atomic="true"
                      id="label-color-contrast-status"
                    >
                      {contrastState === 'no-selection' && (
                        <span className="contrast-badge contrast-badge--none">
                          No color selected
                        </span>
                      )}
                      {contrastState === 'AA-pass' && (
                        <span className="contrast-badge contrast-badge--pass">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {contrastEval.formattedRatio} — Pass AA
                        </span>
                      )}
                      {contrastState === 'AA-fail-blocked' && (
                        <span className="contrast-badge contrast-badge--fail">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          {contrastEval.formattedRatio} — Fail AA
                        </span>
                      )}
                      {contrastState === 'AA-fail-overridden' && (
                        <span className="contrast-badge contrast-badge--overridden">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          {contrastEval.formattedRatio} — Fail AA (Overridden)
                        </span>
                      )}
                    </div>

                    {/* Blocked / Low Contrast Warning Alert with Override Affordance */}
                    {(contrastState === 'AA-fail-blocked' || contrastState === 'AA-fail-overridden') && (
                      <div
                        className="contrast-warning-box"
                        role={contrastState === 'AA-fail-blocked' ? 'alert' : 'region'}
                        aria-live={contrastState === 'AA-fail-blocked' ? 'assertive' : 'polite'}
                      >
                        <div className="contrast-warning-text">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          <span>
                            Low contrast label color ({contrastEval.formattedRatio}). May be unreadable against the surface.
                          </span>
                        </div>
                        <div className="contrast-override-row">
                          <input
                            type="checkbox"
                            id="override-contrast-checkbox"
                            className="contrast-override-checkbox"
                            checked={overrideContrast}
                            onChange={(e) => {
                              setOverrideContrast(e.target.checked);
                              if (error) setError(null);
                            }}
                          />
                          <label htmlFor="override-contrast-checkbox" className="contrast-override-label">
                            Use low-contrast color anyway (not recommended)
                          </label>
                        </div>
                      </div>
                    )}
                      </div>
                    </>
                  );
                })()}
            <div className="info-box" role="region" aria-labelledby="info-box-title">
              <div id="info-box-title" className="info-box-title">{t("createStream.step1.infoBoxTitle")}</div>
              <p className="info-box-text">
                {t("createStream.step1.infoBoxText")}
              </p>
            </div>
          </>
        )}
        {currentStep === 2 && (() => {
          // Derived per-field validation state for step 2
          const accrualRateError = touched.accrualRate
            ? validateAccrualRate(accrualRate, t)
            : undefined;
          const accrualRateSuccess = touched.accrualRate && !accrualRateError && accrualRate.trim().length > 0;

          const durationError = touched.duration
            ? validateDuration(duration, t)
            : undefined;
          const durationSuccess = touched.duration && !durationError && duration.trim().length > 0;

          const customStartDateError = (startTimeOption === 'custom' && touched.customStartDate)
            ? (!customStartDate
                ? t("createStream.validation.startDateRequired")
                : isDateTimeInPast(customStartDate)
                ? t("createStream.validation.startDateFuture")
                : undefined)
            : undefined;
          const customStartDateSuccess = startTimeOption === 'custom' && touched.customStartDate && !customStartDateError && Boolean(customStartDate);

          const cliffDateError = (cliffEnabled && touched.cliffDate)
            ? (!cliffDate
                ? t("createStream.validation.cliffDateRequired")
                : isDateTimeInPast(cliffDate)
                ? t("createStream.validation.cliffDatePast")
                : (startTimeOption === 'custom' && customStartDate && isBeforeLocalDateTime(cliffDate, customStartDate))
                ? t("createStream.validation.cliffDateAfterStart")
                : (() => {
                    // Cross-field: cliff must be on or before the stream end date.
                    const startMs = startTimeOption === 'custom' && customStartDate
                      ? new Date(customStartDate).getTime()
                      : Date.now();
                    const endDate = computeStreamEndDate(new Date(startMs), parseFloat(duration));
                    if (endDate) {
                      const msg = validateCliffBeforeEnd(new Date(cliffDate), endDate);
                      if (msg) return msg;
                    }
                    return undefined;
                  })())
            : undefined;
          const cliffDateSuccess = cliffEnabled && touched.cliffDate && !cliffDateError && Boolean(cliffDate);

          return (
          <>
            <hr className="divider" />

            <div className="section-header">
              <h3>{t("createStream.step2.header")}</h3>
              <p>{t("createStream.step2.subheader")}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {t("createStream.step2.timezoneNote")}
              </p>
            </div>

            {/* Stream Rate */}
            <div className="form-group">
              <label htmlFor="create-stream-accrual-rate" className="form-label">
                {t("createStream.step2.rateLabel")}
                {<span className="required" aria-hidden="true"> *</span>}
                <InfoTooltip
                  id="stream-rate-tooltip"
                  title={t("createStream.step2.rateTooltipTitle")}
                  ariaLabel={t("createStream.step2.rateTooltipAria")}
                  content={
                    <>
                      <p>
                        {t("createStream.step2.rateTooltipBody1")}
                      </p>
                      <p style={{ marginTop: '8px', fontWeight: 500 }}>
                        {t("createStream.step2.rateTooltipBody2")}
                      </p>
                    </>
                  }
                />
              </label>
              <div className={`input-container ${accrualRateError ? 'input-container--error' : accrualRateSuccess ? 'input-container--success' : ''}`.trim()}>
                <InputWithUnit
                  id="create-stream-accrual-rate"
                  unit="USDC / day"
                  type="text"
                  inputMode="decimal"
                  value={accrualRate}
                  onChange={(e) => setAccrualRate(e.target.value)}
                  onBlur={() => handleBlur('accrualRate')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('create-stream-duration')?.focus();
                    }
                  }}
                  placeholder="0.00"
                  hasError={Boolean(accrualRateError)}
                  aria-required="true"
                  aria-describedby={accrualRateError ? 'create-stream-accrual-rate-error' : 'create-stream-accrual-rate-hint'}
                  keyboardHint="Enter ↵"
                />
              </div>
              {accrualRateError && (
                <span id="create-stream-accrual-rate-error" className="validation-message validation-message--error" role="alert">
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
                    <path d="M6 3.5V6.5" stroke="currentColor" strokeLinecap="round" />
                    <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
                  </svg>
                  {accrualRateError}
                </span>
              )}
              {!accrualRateError && (
                <span id="create-stream-accrual-rate-hint" className="validation-message validation-message--hint" role="status">
                  {t("createStream.step2.rateHint")}
                </span>
              )}
            </div>

            {/* Stream Duration */}
            <div className="form-group">
              <label htmlFor="create-stream-duration" className="form-label">
                {t("createStream.step2.durationLabel")}
                {<span className="required" aria-hidden="true"> *</span>}
                <InfoTooltip
                  id="stream-duration-tooltip"
                  title={t("createStream.step2.durationTooltipTitle")}
                  ariaLabel={t("createStream.step2.durationTooltipAria")}
                  content={
                    <>
                      <p>
                        {t("createStream.step2.durationTooltipBody1")}
                      </p>
                      <p style={{ marginTop: '8px' }}>
                        {t("createStream.step2.durationTooltipBody2")}
                      </p>
                    </>
                  }
                />
              </label>
              <div className={`input-container ${durationError ? 'input-container--error' : durationSuccess ? 'input-container--success' : ''}`.trim()}>
                <InputWithUnit
                  id="create-stream-duration"
                  unit="days"
                  type="text"
                  inputMode="decimal"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  onBlur={() => handleBlur('duration')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNext();
                    }
                  }}
                  placeholder="1"
                  hasError={Boolean(durationError)}
                  aria-required="true"
                  aria-describedby={durationError ? 'create-stream-duration-error' : 'create-stream-duration-hint'}
                  keyboardHint="Enter ↵"
                />
              </div>
              {durationError && (
                <span id="create-stream-duration-error" className="validation-message validation-message--error" role="alert">
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
                    <path d="M6 3.5V6.5" stroke="currentColor" strokeLinecap="round" />
                    <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
                  </svg>
                  {durationError}
                </span>
              )}
              {!durationError && (
                <span id="create-stream-duration-hint" className="validation-message validation-message--hint" role="status">
                  {t("createStream.step2.durationHint")}
                </span>
              )}
            </div>

            {/* Start Time */}
            <div className="form-group">
              <label className="form-label">{t("createStream.step2.startTimeLabel")}</label>
              <div className="segmented-control">
                <button
                  className={`segment-btn ${startTimeOption === 'now' ? 'active' : ''}`}
                  onClick={() => setStartTimeOption('now')}
                >
                  {t("createStream.step2.startNowBtn")}
                </button>
                <button
                  className={`segment-btn ${startTimeOption === 'custom' ? 'active' : ''}`}
                  onClick={() => setStartTimeOption('custom')}
                >
                  {t("createStream.step2.customDateBtn")}
                </button>
              </div>
              {startTimeOption === 'custom' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <InputField
                    id="create-stream-custom-start-date"
                    label={t("createStream.step2.customStartDateLabel")}
                    required
                    error={customStartDateError}
                    helperText={t("createStream.step2.customStartDateHelper")}
                    success={customStartDateSuccess}
                  >
                    <input
                      type="datetime-local"
                      className="input-field"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      onBlur={() => handleBlur('customStartDate')}
                    />
                  </InputField>
                </div>
              )}
            </div>

            {/* Cliff Period */}
            <div className="form-group">
              <label className="form-label">
                {t("createStream.step2.cliffPeriodLabel")}{' '}
                <span style={{ color: 'var(--muted)', fontWeight: 'normal' }}>{t("createStream.step2.optionalLabel")}</span>
                <InfoTooltip
                  id="cliff-tooltip"
                  title={t("createStream.step2.cliffTooltipTitle")}
                  ariaLabel={t("createStream.step2.cliffTooltipAria")}
                  content={
                    <>
                      <p>
                        {t("createStream.step2.cliffTooltipBody1")}
                      </p>
                      <ul style={{ marginTop: '4px', marginLeft: '16px', listStyle: 'disc' }}>
                        <li>{t("createStream.step2.cliffTooltipList1")}</li>
                        <li>{t("createStream.step2.cliffTooltipList2")}</li>
                        <li>{t("createStream.step2.cliffTooltipList3")}</li>
                      </ul>
                      <p style={{ marginTop: '8px' }}>
                        {t("createStream.step2.cliffTooltipBody2")}
                      </p>
                      <p style={{ marginTop: '8px' }}>
                        {t("createStream.step2.cliffTooltipBody3")}
                      </p>
                    </>
                  }
                />
              </label>
              <div className="toggle-container" onClick={() => setCliffEnabled(!cliffEnabled)}>
                <div className={`toggle-switch ${cliffEnabled ? 'on' : ''}`}>
                  <div className="toggle-knob" />
                </div>
                <span>{t("createStream.step2.enableCliffLabel")}</span>
              </div>
              {cliffEnabled && (
                <div style={{ marginTop: '0.75rem' }}>
                  <InputField
                    id="create-stream-cliff-date"
                    label={t("createStream.step2.cliffDateLabel")}
                    required
                    error={cliffDateError}
                    helperText={t("createStream.step2.cliffDateHelper")}
                    success={cliffDateSuccess}
                  >
                    <input
                      type="datetime-local"
                      className="input-field"
                      value={cliffDate}
                      onChange={(e) => setCliffDate(e.target.value)}
                      onBlur={() => handleBlur('cliffDate')}
                    />
                  </InputField>
                </div>
              )}
            </div>

            {/* Deposit Summary */}
            <div className="deposit-summary">
              <div className="deposit-box">
                <div className="deposit-label">{t("createStream.step2.requiredDepositLabel")}</div>
                <div className={`deposit-value ${parseFloat(requiredDeposit) > userDeposit ? 'required' : ''}`}>
                  {requiredDeposit} USDC
                </div>
              </div>
              <div className="deposit-box">
                <div className="deposit-label">{t("createStream.step2.yourDepositLabel")}</div>
                <div className="deposit-value">{userDeposit.toFixed(2)} USDC</div>
              </div>
            </div>
          </>
          );
        })()}

          {currentStep === 3 &&
            (() => {
              const reviewRecipient = recipient.trim();
              const reviewDeposit = formatReviewDeposit(depositAmount);
              const durationUnit = formatDurationUnit(duration, t);
              return (
                <>
                  <hr className="divider" />
                  <div className="review-cards">
                    {/* Recipient card */}
                    <div className="review-card review-card-vertical">
                      <div className="review-card-header">
                        <span className="review-card-icon" aria-hidden="true">
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </span>
                        <div className="review-card-title">{t("createStream.step3.recipientCardTitle")}</div>
                        <button
                          type="button"
                          className="review-card-edit"
                          onClick={() => {
                            resetTransactionState();
                            setCurrentStep(1);
                          }}
                          disabled={isBusyCreating}
                          aria-label={t("createStream.step3.editRecipientAria")}
                        >
                          {t("createStream.step3.editBtn")}
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="review-card-content">
                        <div className="review-card-sublabel">{t("createStream.step3.addressLabel")}</div>
                        <div className="review-card-value">
                          {maskAddress(reviewRecipient)}
                        </div>
                      </div>
                    </div>

                    {/* Deposit card */}
                    <div className="review-card review-card-vertical">
                      <div className="review-card-header">
                        <span className="review-card-icon" aria-hidden="true">
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </span>
                        <div className="review-card-title">{t("createStream.step3.depositCardTitle")}</div>
                        <button
                          type="button"
                          className="review-card-edit"
                          onClick={() => {
                            resetTransactionState();
                            setCurrentStep(1);
                          }}
                          disabled={isBusyCreating}
                          aria-label={t("createStream.step3.editDepositAria")}
                        >
                          {t("createStream.step3.editBtn")}
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="review-card-content">
                        <div className="review-card-amount">
                          {reviewDeposit}{" "}
                          <span className="review-card-unit">USDC</span>
                        </div>
                      </div>
                    </div>

                    {/* Rate & schedule card */}
                    <div className="review-card review-card-schedule-card">
                      <div className="review-card-schedule-header">
                        <span className="review-card-icon" aria-hidden="true">
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            />
                          </svg>
                        </span>
                        <div className="review-card-title">{t("createStream.step3.rateScheduleCardTitle")}</div>
                        <button
                          type="button"
                          className="review-card-edit"
                          onClick={() => {
                            resetTransactionState();
                            setCurrentStep(2);
                          }}
                          disabled={isBusyCreating}
                          aria-label={t("createStream.step3.editRateScheduleAria")}
                        >
                          {t("createStream.step3.editBtn")}
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="review-card-rows">
                        <div className="review-card-row">
                          <span
                            className="review-card-row-icon"
                            aria-hidden="true"
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                              />
                            </svg>
                          </span>
                          <span className="review-card-row-label">{t("createStream.step3.rateLabel")}</span>
                          <span className="review-card-row-value">
                            {t("createStream.step3.rateValue", { accrualRate })}
                          </span>
                        </div>
                        <div className="review-card-row">
                          <span
                            className="review-card-row-icon"
                            aria-hidden="true"
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </span>
                          <span className="review-card-row-label">
                            {t("createStream.step3.durationLabel")}
                          </span>
                          <span className="review-card-row-value">
                            {t("createStream.step3.durationValue", { duration, unit: durationUnit })}
                          </span>
                        </div>
                        <div className="review-card-row">
                          <span
                            className="review-card-row-icon"
                            aria-hidden="true"
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </span>
                          <span className="review-card-row-label">{t("createStream.step3.startLabel")}</span>
                          <span className="review-card-row-value">
                            {startTimeOption === "now"
                              ? t("createStream.step3.startImmediately")
                              : customStartDate
                                ? formatLocalDateTime(customStartDate)
                                : "—"}
                          </span>
                        </div>
                        <div className="review-card-row">
                          <span
                            className="review-card-row-icon"
                            aria-hidden="true"
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path strokeLinecap="round" d="M12 6v6" />
                            </svg>
                          </span>
                          <span className="review-card-row-label">{t("createStream.step3.cliffLabel")}</span>
                          <span className="review-card-row-value">
                            {cliffEnabled && cliffDate
                              ? formatLocalDateTime(cliffDate)
                              : t("createStream.step3.cliffNotSet")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {streamError && (
                    <div className="review-error-box" role="alert">
                      <div>
                        <strong>{t("createStream.step3.errorTitle")}</strong>
                        <p>{streamError}</p>
                      </div>
                      <button
                        type="button"
                        className="review-error-retry"
                        onClick={handleNext}
                        disabled={isSubmitting}
                      >
                        {t("createStream.step3.tryAgainBtn")}
                      </button>
                    </div>
                  )}

                  <div
                    className="review-warning-box"
                    role="region"
                    aria-live="polite"
                  >
                    <strong>{t("createStream.step3.warningTitle")}</strong>{" "}
                    {t("createStream.step3.warningText", { reviewDeposit })}
                  </div>
                  {queuedSubmission && (
                    <div
                      className="offline-queue-banner"
                      role="status"
                      aria-live="polite"
                    >
                      <span className="offline-queue-banner__icon" aria-hidden="true">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="9" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                        </svg>
                      </span>
                      <div className="offline-queue-banner__body">
                        <strong className="offline-queue-banner__title">
                          {t("createStream.queue.bannerTitle")}
                        </strong>
                        <p>{t("createStream.queue.bannerBody")}</p>
                        <span className="offline-queue-banner__position">
                          {t("createStream.queue.bannerPosition", {
                            position: queuedSubmission.position,
                            total: Math.max(queueLength, queuedSubmission.position),
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                  {isFlushingQueue && (
                    <div
                      className="transaction-status-box"
                      role="status"
                      aria-live="polite"
                    >
                      {t("createStream.queue.flushingTitle")}
                    </div>
                  )}
                  {queueFlushError && (
                    <div className="offline-queue-banner offline-queue-banner--failed" role="alert">
                      <span className="offline-queue-banner__icon" aria-hidden="true">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.48 14.7A1 1 0 002.66 20h18.68a1 1 0 00.85-1.44l-8.48-14.7a1 1 0 00-1.72 0z" />
                        </svg>
                      </span>
                      <div className="offline-queue-banner__body">
                        <strong className="offline-queue-banner__title">
                          {t("createStream.queue.flushFailedTitle")}
                        </strong>
                        <p>{queueFlushError}</p>
                        <div className="offline-queue-banner__actions">
                          <button
                            type="button"
                            className="offline-queue-banner__btn offline-queue-banner__btn--primary"
                            onClick={handleRetryQueuedSubmission}
                          >
                            {t("createStream.queue.flushFailedRetryBtn")}
                          </button>
                          <button
                            type="button"
                            className="offline-queue-banner__btn"
                            onClick={handleEditQueuedSubmission}
                          >
                            {t("createStream.queue.flushFailedEditBtn")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {isSubmitting && (
                    <div
                      className="transaction-status-box"
                      role="status"
                      aria-live="polite"
                    >
                      {t("createStream.step3.statusSubmitting")}
                    </div>
                  )}
                  {!isSubmitting && transactionStatus.status === "pending" && (
                    <div
                      className="transaction-status-box"
                      role="status"
                      aria-live="polite"
                    >
                      {t("createStream.step3.statusWaiting")}
                      <span className="transaction-status-detail">
                        {t("createStream.step3.statusDetail", {
                          attempts: transactionStatus.attempts,
                          txHash: submittedTxHash
                            ? `${submittedTxHash.slice(0, 10)}...${submittedTxHash.slice(-8)}`
                            : "",
                        })}
                      </span>
                    </div>
                  )}
                  {transactionStatus.status === "failed" && (
                    <div
                      className="transaction-status-box transaction-status-box--error"
                      role="alert"
                    >
                      {transactionStatus.error ??
                        t("createStream.step3.statusFailed", {
                          error: "Transaction confirmation failed. Please retry.",
                        })}
                    </div>
                  )}
                </>
              );
            })()}

          {!wizardMode && (
            <div className="advanced-form">
              {/* ── Section 1: Recipient & Amount ─────────────────────── */}
              <section className="advanced-section" aria-labelledby="advanced-section-1-title">
                <hr className="advanced-section__divider" />
                <div className="advanced-section__header">
                  <h3 id="advanced-section-1-title" className="advanced-section__title">
                    {t("createStream.advanced.section1Header")}
                  </h3>
                  <p className="advanced-section__desc">
                    {t("createStream.advanced.section1Desc")}
                  </p>
                </div>
                <div className="advanced-section__body">
                  {(() => {
                    const recipientError = touched.recipient
                      ? (!recipient.trim()
                          ? t("createStream.validation.recipientRequired")
                          : (wallet.connected && wallet.address && recipient.trim().toLowerCase() === wallet.address.toLowerCase())
                          ? 'Recipient cannot be the same as the connected wallet address.'
                          : !isValidStellarAddress(recipient.trim())
                          ? t("createStream.validation.recipientInvalid")
                          : undefined)
                      : undefined;
                    const recipientSuccess = touched.recipient && !recipientError && recipient.trim().length > 0;
                    const depositAmountNum = parseFloat(depositAmount.replace(/,/g, ''));
                    const depositError = touched.depositAmount
                      ? (!depositAmount.trim() || isNaN(depositAmountNum) || depositAmountNum <= 0
                          ? t("createStream.validation.depositPositive")
                          : undefined)
                      : undefined;
                    const depositSuccess = touched.depositAmount && !depositError && depositAmount.trim().length > 0;

                    return (
                      <>
                        <InputField
                          id="create-stream-recipient"
                          label={t("createStream.step1.recipientLabel")}
                          required
                          error={recipientError}
                          helperText={t("createStream.step1.recipientHelper")}
                          success={recipientSuccess}
                        >
                          <input
                            ref={recipientInputRef}
                            type="text"
                            className="input-field"
                            value={recipient}
                            onChange={(e) => {
                              setRecipient(e.target.value);
                              if (error) setError(null);
                            }}
                            onBlur={() => handleBlur('recipient')}
                            placeholder={t("createStream.step1.recipientPlaceholder")}
                            autoComplete="off"
                          />
                        </InputField>

                        <InputField
                          id="create-stream-deposit"
                          label={t("createStream.step1.depositLabel")}
                          required
                          error={depositError}
                          helperText={t("createStream.step1.depositHelper")}
                          success={depositSuccess}
                        >
                          <input
                            type="text"
                            inputMode="decimal"
                            className="input-field"
                            value={depositAmount}
                            onChange={(e) => {
                              const v = sanitizeDepositAmountInput(e.target.value);
                              setDepositAmount(v);
                              if (error) setError(null);
                            }}
                            onBlur={() => handleBlur('depositAmount')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleNext();
                              }
                            }}
                            placeholder={t("createStream.step1.depositPlaceholder")}
                          />
                        </InputField>

                        <div className="label-color-section" role="region" aria-labelledby="advanced-label-color-heading">
                          <div className="label-color-header">
                            <label id="advanced-label-color-heading" className="label-color-title">
                              Stream Label Color <span style={{ color: 'var(--muted)', fontWeight: 'normal' }}>(Optional)</span>
                            </label>
                            <div className="swatch-theme-toggle" role="group" aria-label="Contrast background theme preview">
                              <span>Against:</span>
                              <button
                                type="button"
                                className={targetTheme === 'light' ? 'active' : ''}
                                onClick={() => setTargetTheme('light')}
                                aria-pressed={targetTheme === 'light'}
                              >
                                Light (#FFF)
                              </button>
                              <button
                                type="button"
                                className={targetTheme === 'dark' ? 'active' : ''}
                                onClick={() => setTargetTheme('dark')}
                                aria-pressed={targetTheme === 'dark'}
                              >
                                Dark (#0A0E17)
                              </button>
                            </div>
                          </div>

                          <div
                            className="swatch-grid"
                            role="radiogroup"
                            aria-label="Stream label color swatches"
                          >
                            {LABEL_COLOR_SWATCHES.map((swatch, idx) => {
                              const isSelected = labelColor.toLowerCase() === swatch.hex.toLowerCase();
                              const isFocused = focusedSwatchIndex === idx;
                              const isLightSwatch = ['#ffffff', '#fef08a', '#94a3b8'].includes(swatch.hex.toLowerCase());

                              return (
                                <button
                                  key={swatch.hex}
                                  type="button"
                                  role="radio"
                                  aria-checked={isSelected}
                                  aria-label={`${swatch.label} (${swatch.hex})`}
                                  tabIndex={isFocused || (focusedSwatchIndex === 0 && idx === 0) ? 0 : -1}
                                  className={`swatch-btn ${isSelected ? 'selected' : ''} ${isLightSwatch ? 'swatch-btn--light' : ''}`}
                                  style={{ backgroundColor: swatch.hex }}
                                  onClick={() => {
                                    setLabelColor(swatch.hex);
                                    setCustomHexInput(swatch.hex);
                                    setFocusedSwatchIndex(idx);
                                    setOverrideContrast(false);
                                    if (error) setError(null);
                                  }}
                                  onKeyDown={(e) => handleSwatchKeyDown(e, idx)}
                                >
                                  {isSelected && (
                                    <svg
                                      className="swatch-btn-checkmark"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="3.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </button>
                              );
                            })}

                            {labelColor && (
                              <button
                                type="button"
                                className="swatch-clear-btn"
                                onClick={() => {
                                  setLabelColor('');
                                  setCustomHexInput('');
                                  setOverrideContrast(false);
                                  if (error) setError(null);
                                }}
                                aria-label="Clear label color selection"
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          <div className="swatch-custom-input-row">
                            <label htmlFor="advanced-custom-label-hex" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                              Custom Hex:
                            </label>
                            <input
                              id="advanced-custom-label-hex"
                              type="text"
                              className="swatch-custom-input"
                              placeholder="#3B82F6"
                              maxLength={7}
                              value={customHexInput}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomHexInput(val);
                                if (error) setError(null);
                                if (/^#?[0-9A-Fa-f]{6}$/.test(val)) {
                                  const formatted = val.startsWith('#') ? val : `#${val}`;
                                  setLabelColor(formatted);
                                  setOverrideContrast(false);
                                }
                              }}
                            />
                          </div>

                          <div
                            className="contrast-badge-container"
                            aria-live="polite"
                            aria-atomic="true"
                            id="advanced-label-color-contrast-status"
                          >
                            {contrastState === 'no-selection' && (
                              <span className="contrast-badge contrast-badge--none">
                                No color selected
                              </span>
                            )}
                            {contrastState === 'AA-pass' && (
                              <span className="contrast-badge contrast-badge--pass">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {contrastEval.formattedRatio} — Pass AA
                              </span>
                            )}
                            {contrastState === 'AA-fail-blocked' && (
                              <span className="contrast-badge contrast-badge--fail">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                  <line x1="12" y1="9" x2="12" y2="13" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                {contrastEval.formattedRatio} — Fail AA
                              </span>
                            )}
                            {contrastState === 'AA-fail-overridden' && (
                              <span className="contrast-badge contrast-badge--overridden">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                  <line x1="12" y1="9" x2="12" y2="13" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                {contrastEval.formattedRatio} — Fail AA (Overridden)
                              </span>
                            )}
                          </div>

                          {(contrastState === 'AA-fail-blocked' || contrastState === 'AA-fail-overridden') && (
                            <div
                              className="contrast-warning-box"
                              role={contrastState === 'AA-fail-blocked' ? 'alert' : 'region'}
                              aria-live={contrastState === 'AA-fail-blocked' ? 'assertive' : 'polite'}
                            >
                              <div className="contrast-warning-text">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                  <line x1="12" y1="9" x2="12" y2="13" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                <span>
                                  Low contrast label color ({contrastEval.formattedRatio}). May be unreadable against the surface.
                                </span>
                              </div>
                              <div className="contrast-override-row">
                                <input
                                  type="checkbox"
                                  id="advanced-override-contrast-checkbox"
                                  className="contrast-override-checkbox"
                                  checked={overrideContrast}
                                  onChange={(e) => {
                                    setOverrideContrast(e.target.checked);
                                    if (error) setError(null);
                                  }}
                                />
                                <label htmlFor="advanced-override-contrast-checkbox" className="contrast-override-label">
                                  Use low-contrast color anyway (not recommended)
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </section>

              {/* ── Section 2: Rate & Schedule ─────────────────────────── */}
              <section className="advanced-section" aria-labelledby="advanced-section-2-title">
                <hr className="advanced-section__divider" />
                <div className="advanced-section__header">
                  <h3 id="advanced-section-2-title" className="advanced-section__title">
                    {t("createStream.advanced.section2Header")}
                  </h3>
                  <p className="advanced-section__desc">
                    {t("createStream.advanced.section2Desc")}
                  </p>
                </div>
                <div className="advanced-section__body">
                  {(() => {
                    const accrualRateError = touched.accrualRate
                      ? validateAccrualRate(accrualRate, t)
                      : undefined;
                    const accrualRateSuccess = touched.accrualRate && !accrualRateError && accrualRate.trim().length > 0;
                    const durationError = touched.duration
                      ? validateDuration(duration, t)
                      : undefined;
                    const durationSuccess = touched.duration && !durationError && duration.trim().length > 0;
                    const customStartDateError = (startTimeOption === 'custom' && touched.customStartDate)
                      ? (!customStartDate
                          ? t("createStream.validation.startDateRequired")
                          : isDateTimeInPast(customStartDate)
                          ? t("createStream.validation.startDateFuture")
                          : undefined)
                      : undefined;
                    const customStartDateSuccess = startTimeOption === 'custom' && touched.customStartDate && !customStartDateError && Boolean(customStartDate);
                    const cliffDateError = (cliffEnabled && touched.cliffDate)
                      ? (!cliffDate
                          ? t("createStream.validation.cliffDateRequired")
                          : isDateTimeInPast(cliffDate)
                          ? t("createStream.validation.cliffDatePast")
                          : (startTimeOption === 'custom' && customStartDate && isBeforeLocalDateTime(cliffDate, customStartDate))
                          ? t("createStream.validation.cliffDateAfterStart")
                          : (() => {
                              const startMs = startTimeOption === 'custom' && customStartDate
                                ? new Date(customStartDate).getTime()
                                : Date.now();
                              const endDate = computeStreamEndDate(new Date(startMs), parseFloat(duration));
                              if (endDate) {
                                const msg = validateCliffBeforeEnd(new Date(cliffDate), endDate);
                                if (msg) return msg;
                              }
                              return undefined;
                            })())
                      : undefined;
                    const cliffDateSuccess = cliffEnabled && touched.cliffDate && !cliffDateError && Boolean(cliffDate);

                    return (
                      <>
                        <div className="form-group">
                          <label htmlFor="advanced-accrual-rate" className="form-label">
                            {t("createStream.step2.rateLabel")}
                            {<span className="required" aria-hidden="true"> *</span>}
                            <InfoTooltip
                              id="advanced-rate-tooltip"
                              title={t("createStream.step2.rateTooltipTitle")}
                              ariaLabel={t("createStream.step2.rateTooltipAria")}
                              content={
                                <>
                                  <p>{t("createStream.step2.rateTooltipBody1")}</p>
                                  <p style={{ marginTop: '8px', fontWeight: 500 }}>
                                    {t("createStream.step2.rateTooltipBody2")}
                                  </p>
                                </>
                              }
                            />
                          </label>
                          <div className={`input-container ${accrualRateError ? 'input-container--error' : accrualRateSuccess ? 'input-container--success' : ''}`.trim()}>
                            <InputWithUnit
                              id="advanced-accrual-rate"
                              unit="USDC / day"
                              type="text"
                              inputMode="decimal"
                              value={accrualRate}
                              onChange={(e) => setAccrualRate(e.target.value)}
                              onBlur={() => handleBlur('accrualRate')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  document.getElementById('advanced-duration')?.focus();
                                }
                              }}
                              placeholder="0.00"
                              hasError={Boolean(accrualRateError)}
                              aria-required="true"
                              aria-describedby={accrualRateError ? 'advanced-accrual-rate-error' : 'advanced-accrual-rate-hint'}
                              keyboardHint="Enter ↵"
                            />
                          </div>
                          {accrualRateError && (
                            <span id="advanced-accrual-rate-error" className="validation-message validation-message--error" role="alert">
                              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                                <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
                                <path d="M6 3.5V6.5" stroke="currentColor" strokeLinecap="round" />
                                <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
                              </svg>
                              {accrualRateError}
                            </span>
                          )}
                          {!accrualRateError && (
                            <span id="advanced-accrual-rate-hint" className="validation-message validation-message--hint" role="status">
                              {t("createStream.step2.rateHint")}
                            </span>
                          )}
                        </div>

                        <div className="form-group">
                          <label htmlFor="advanced-duration" className="form-label">
                            {t("createStream.step2.durationLabel")}
                            {<span className="required" aria-hidden="true"> *</span>}
                            <InfoTooltip
                              id="advanced-duration-tooltip"
                              title={t("createStream.step2.durationTooltipTitle")}
                              ariaLabel={t("createStream.step2.durationTooltipAria")}
                              content={
                                <>
                                  <p>{t("createStream.step2.durationTooltipBody1")}</p>
                                  <p style={{ marginTop: '8px' }}>{t("createStream.step2.durationTooltipBody2")}</p>
                                </>
                              }
                            />
                          </label>
                          <div className={`input-container ${durationError ? 'input-container--error' : durationSuccess ? 'input-container--success' : ''}`.trim()}>
                            <InputWithUnit
                              id="advanced-duration"
                              unit="days"
                              type="text"
                              inputMode="decimal"
                              value={duration}
                              onChange={(e) => setDuration(e.target.value)}
                              onBlur={() => handleBlur('duration')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleNext();
                                }
                              }}
                              placeholder="1"
                              hasError={Boolean(durationError)}
                              aria-required="true"
                              aria-describedby={durationError ? 'advanced-duration-error' : 'advanced-duration-hint'}
                              keyboardHint="Enter ↵"
                            />
                          </div>
                          {durationError && (
                            <span id="advanced-duration-error" className="validation-message validation-message--error" role="alert">
                              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                                <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
                                <path d="M6 3.5V6.5" stroke="currentColor" strokeLinecap="round" />
                                <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
                              </svg>
                              {durationError}
                            </span>
                          )}
                          {!durationError && (
                            <span id="advanced-duration-hint" className="validation-message validation-message--hint" role="status">
                              {t("createStream.step2.durationHint")}
                            </span>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">{t("createStream.step2.startTimeLabel")}</label>
                          <div className="segmented-control">
                            <button
                              type="button"
                              className={`segment-btn ${startTimeOption === 'now' ? 'active' : ''}`}
                              onClick={() => setStartTimeOption('now')}
                            >
                              {t("createStream.step2.startNowBtn")}
                            </button>
                            <button
                              type="button"
                              className={`segment-btn ${startTimeOption === 'custom' ? 'active' : ''}`}
                              onClick={() => setStartTimeOption('custom')}
                            >
                              {t("createStream.step2.customDateBtn")}
                            </button>
                          </div>
                          {startTimeOption === 'custom' && (
                            <div style={{ marginTop: '0.75rem' }}>
                              <InputField
                                id="advanced-custom-start-date"
                                label={t("createStream.step2.customStartDateLabel")}
                                required
                                error={customStartDateError}
                                helperText={t("createStream.step2.customStartDateHelper")}
                                success={customStartDateSuccess}
                              >
                                <input
                                  type="datetime-local"
                                  className="input-field"
                                  value={customStartDate}
                                  onChange={(e) => setCustomStartDate(e.target.value)}
                                  onBlur={() => handleBlur('customStartDate')}
                                />
                              </InputField>
                            </div>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {t("createStream.step2.cliffPeriodLabel")}{' '}
                            <span style={{ color: 'var(--muted)', fontWeight: 'normal' }}>{t("createStream.step2.optionalLabel")}</span>
                            <InfoTooltip
                              id="advanced-cliff-tooltip"
                              title={t("createStream.step2.cliffTooltipTitle")}
                              ariaLabel={t("createStream.step2.cliffTooltipAria")}
                              content={
                                <>
                                  <p>{t("createStream.step2.cliffTooltipBody1")}</p>
                                  <ul style={{ marginTop: '4px', marginLeft: '16px', listStyle: 'disc' }}>
                                    <li>{t("createStream.step2.cliffTooltipList1")}</li>
                                    <li>{t("createStream.step2.cliffTooltipList2")}</li>
                                    <li>{t("createStream.step2.cliffTooltipList3")}</li>
                                  </ul>
                                  <p style={{ marginTop: '8px' }}>{t("createStream.step2.cliffTooltipBody2")}</p>
                                  <p style={{ marginTop: '8px' }}>{t("createStream.step2.cliffTooltipBody3")}</p>
                                </>
                              }
                            />
                          </label>
                          <div
                            className="toggle-container"
                            onClick={() => setCliffEnabled(!cliffEnabled)}
                            role="switch"
                            aria-checked={cliffEnabled}
                            aria-label={t("createStream.step2.enableCliffLabel")}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setCliffEnabled(!cliffEnabled);
                              }
                            }}
                          >
                            <div className={`toggle-switch ${cliffEnabled ? 'on' : ''}`}>
                              <div className="toggle-knob" />
                            </div>
                            <span>{t("createStream.step2.enableCliffLabel")}</span>
                          </div>
                          {cliffEnabled && (
                            <div style={{ marginTop: '0.75rem' }}>
                              <InputField
                                id="advanced-cliff-date"
                                label={t("createStream.step2.cliffDateLabel")}
                                required
                                error={cliffDateError}
                                helperText={t("createStream.step2.cliffDateHelper")}
                                success={cliffDateSuccess}
                              >
                                <input
                                  type="datetime-local"
                                  className="input-field"
                                  value={cliffDate}
                                  onChange={(e) => setCliffDate(e.target.value)}
                                  onBlur={() => handleBlur('cliffDate')}
                                />
                              </InputField>
                            </div>
                          )}
                        </div>

                        <div className="deposit-summary">
                          <div className="deposit-box">
                            <div className="deposit-label">{t("createStream.step2.requiredDepositLabel")}</div>
                            <div className={`deposit-value ${parseFloat(requiredDeposit) > userDeposit ? 'required' : ''}`}>
                              {requiredDeposit} USDC
                            </div>
                          </div>
                          <div className="deposit-box">
                            <div className="deposit-label">{t("createStream.step2.yourDepositLabel")}</div>
                            <div className="deposit-value">{userDeposit.toFixed(2)} USDC</div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </section>

              {/* ── Section 3: Summary & Create ─────────────────────────── */}
              <section className="advanced-section" aria-labelledby="advanced-section-3-title">
                <hr className="advanced-section__divider" />
                <div className="advanced-section__header">
                  <h3 id="advanced-section-3-title" className="advanced-section__title">
                    {t("createStream.advanced.section3Header")}
                  </h3>
                  <p className="advanced-section__desc">
                    {t("createStream.advanced.section3Desc")}
                  </p>
                </div>
                <div className="advanced-section__body">
                  {(() => {
                    const reviewRecipient = recipient.trim();
                    const reviewDeposit = formatReviewDeposit(depositAmount);
                    const durationUnit = formatDurationUnit(duration, t);
                    return (
                      <>
                        <div className="review-cards">
                          <div className="review-card review-card-vertical">
                            <div className="review-card-header">
                              <span className="review-card-icon" aria-hidden="true">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </span>
                              <div className="review-card-title">{t("createStream.step3.recipientCardTitle")}</div>
                            </div>
                            <div className="review-card-content">
                              <div className="review-card-sublabel">{t("createStream.step3.addressLabel")}</div>
                              <div className="review-card-value">{maskAddress(reviewRecipient)}</div>
                            </div>
                          </div>

                          <div className="review-card review-card-vertical">
                            <div className="review-card-header">
                              <span className="review-card-icon" aria-hidden="true">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </span>
                              <div className="review-card-title">{t("createStream.step3.depositCardTitle")}</div>
                            </div>
                            <div className="review-card-content">
                              <div className="review-card-amount">
                                {reviewDeposit}{" "}
                                <span className="review-card-unit">USDC</span>
                              </div>
                            </div>
                          </div>

                          <div className="review-card review-card-schedule-card">
                            <div className="review-card-schedule-header">
                              <span className="review-card-icon" aria-hidden="true">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                              </span>
                              <div className="review-card-title">{t("createStream.step3.rateScheduleCardTitle")}</div>
                            </div>
                            <div className="review-card-rows">
                              <div className="review-card-row">
                                <span className="review-card-row-icon" aria-hidden="true">
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                  </svg>
                                </span>
                                <span className="review-card-row-label">{t("createStream.step3.rateLabel")}</span>
                                <span className="review-card-row-value">
                                  {t("createStream.step3.rateValue", { accrualRate })}
                                </span>
                              </div>
                              <div className="review-card-row">
                                <span className="review-card-row-icon" aria-hidden="true">
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </span>
                                <span className="review-card-row-label">{t("createStream.step3.durationLabel")}</span>
                                <span className="review-card-row-value">
                                  {t("createStream.step3.durationValue", { duration, unit: durationUnit })}
                                </span>
                              </div>
                              <div className="review-card-row">
                                <span className="review-card-row-icon" aria-hidden="true">
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </span>
                                <span className="review-card-row-label">{t("createStream.step3.startLabel")}</span>
                                <span className="review-card-row-value">
                                  {startTimeOption === "now"
                                    ? t("createStream.step3.startImmediately")
                                    : customStartDate
                                      ? formatLocalDateTime(customStartDate)
                                      : "—"}
                                </span>
                              </div>
                              <div className="review-card-row">
                                <span className="review-card-row-icon" aria-hidden="true">
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="12" cy="12" r="10" />
                                    <path strokeLinecap="round" d="M12 6v6" />
                                  </svg>
                                </span>
                                <span className="review-card-row-label">{t("createStream.step3.cliffLabel")}</span>
                                <span className="review-card-row-value">
                                  {cliffEnabled && cliffDate
                                    ? formatLocalDateTime(cliffDate)
                                    : t("createStream.step3.cliffNotSet")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div
                          className="review-warning-box"
                          role="region"
                          aria-live="polite"
                        >
                          <strong>{t("createStream.step3.warningTitle")}</strong>{" "}
                          {t("createStream.step3.warningText", { reviewDeposit })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {!wizardMode ? (
            <>
              <button
                type="button"
                className="btn btn-cancel"
                onClick={handleCancel}
                disabled={isBusyCreating}
              >
                {t("createStream.button.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-next"
                onClick={handleNext}
                disabled={isBusyCreating}
                aria-busy={isBusyCreating}
              >
                {isBusyCreating && (
                  <span className="btn-spinner" aria-hidden="true" data-testid="btn-spinner" />
                )}
                {t("createStream.advanced.createBtn")}
              </button>
            </>
          ) : currentStep === 1 ? (
            <>
              <button
                type="button"
                className="btn btn-cancel"
                onClick={handleCancel}
                disabled={isBusyCreating}
              >
                {t("createStream.button.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-next"
                onClick={handleNext}
                disabled={isBusyCreating}
              >
                {t("createStream.button.next")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-back"
                onClick={handleBack}
                disabled={isBusyCreating}
              >
                {t("createStream.button.back")}
              </button>
              <button
                type="button"
                className="btn btn-next"
                onClick={handleNext}
                disabled={isBusyCreating}
                aria-busy={isBusyCreating && currentStep === 3}
              >
                {(isBusyCreating && currentStep === 3) && (
                  <span className="btn-spinner" aria-hidden="true" data-testid="btn-spinner" />
                )}
                {submitButtonLabel}
              </button>
            </>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
