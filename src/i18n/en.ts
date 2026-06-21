export const en = {
  common: {
    back: "Back",
    cancel: "Cancel",
    edit: "Edit",
    next: "Next",
    notSet: "Not set",
  },
  createStream: {
    title: "Create stream",
    description:
      "Set the recipient, funding, and schedule details for a new Stellar stream.",
    closeAria: "Close create stream modal",
    steps: {
      recipientAmount: "Recipient & amount",
      rateSchedule: "Rate & schedule",
      reviewCreate: "Review & create",
    },
    buttons: {
      create: "Create stream",
      confirming: "Confirming...",
      retryCreate: "Retry create stream",
      submitting: "Submitting...",
    },
    validation: {
      cliffAfterStart: "Cliff date must be on or after the start date.",
      cliffDateRequired: "Cliff date is required.",
      cliffPast: "Cliff date must not be in the past.",
      customStartRequired: "Custom start date is required.",
      depositPositive: "Deposit amount must be a positive number.",
      durationMax: "Duration must be {maxDays} days or less.",
      durationPositive: "Duration must be a positive number.",
      invalidRecipient:
        "Please enter a valid Stellar address (starts with G, 56 characters).",
      missingTransactionHash: "Missing transaction hash from Stellar RPC.",
      recipientRequired: "Recipient is required.",
      startPast: "Start date must be in the future.",
      streamCreationFallback: "Stream creation failed. Please try again.",
      transactionConfirmationFailed:
        "Transaction confirmation failed. Please retry.",
      walletRequired: "Please connect your wallet first.",
      rateMax: "Stream rate must be {maxRate} USDC/day or less.",
      ratePositive: "Stream rate must be a positive number.",
      wrongNetwork:
        "Wrong Stellar network. Expected {expectedNetwork}, but wallet is connected to {walletNetwork}. Please switch network in Freighter.",
    },
    toast: {
      createFailed: "Failed to create stream: {message}",
      created: "Stream created successfully on-chain!",
    },
    step1: {
      depositHelper: "Enter the total USDC amount to deposit into the stream",
      depositLabel: "Deposit amount",
      depositPlaceholder: "$ 0.00 USDC",
      heading: "Recipient & amount",
      infoTitle: "Smart contract lock:",
      infoText:
        "Your USDC will be locked in a Soroban smart contract. The recipient can withdraw their accrued portion at any time.",
      recipientHelper:
        "Enter a valid Stellar address (starts with G, 56 characters)",
      recipientLabel: "Recipient",
      recipientPlaceholder: "Paste Stellar address (G...)",
      summary: "Set who receives the stream and how much USDC to lock.",
    },
    step2: {
      cliffCommonUseLabel: "Common use case:",
      cliffCommonUseText:
        'Employee compensation where vesting "cliff" prevents withdrawal for the first 3-6 months, ensuring commitment before funds are accessible.',
      cliffDateHelper:
        "The recipient cannot withdraw until this date, even though USDC accrues",
      cliffDateLabel: "Cliff date",
      cliffExample:
        "Example: 1-year stream with 3-month cliff = No withdrawals for 3 months, then all accrued USDC becomes available.",
      cliffIntro: "A cliff is a vesting lockup period. During the cliff:",
      cliffItemAccrues: "USDC continues to accrue normally",
      cliffItemLocked: "The recipient CANNOT withdraw any funds",
      cliffItemUnlocks:
        "After the cliff date, all accrued funds become withdrawable",
      cliffLabel: "Cliff period",
      cliffOptional: "(optional)",
      cliffToggle: "Enable cliff (vesting lockup until specific date)",
      cliffTooltipAria: "Learn more about cliff periods",
      cliffTooltipTitle: "What is a cliff?",
      customDate: "Custom date",
      customStartHelper: "When the stream begins accruing USDC",
      customStartLabel: "Custom start date",
      durationExample:
        "Example: A 7-day stream transfers funds continuously over one week. The recipient can withdraw at any time during this period.",
      durationHelper: "How many days the stream will run before ending",
      durationLabel: "Stream duration",
      durationTooltipAria: "Learn more about stream duration",
      durationTooltipText:
        "The duration defines the total length of the stream in days. After this period ends, the full deposit amount will have been streamed to the recipient.",
      durationTooltipTitle: "Understanding stream duration",
      heading: "Rate & schedule",
      localTimezone: "Start and cliff times use your local timezone.",
      rateFormula: "Formula: Total Deposit / Duration = Stream Rate",
      rateHelper: "How much USDC the recipient earns per day",
      rateLabel: "Stream rate",
      rateTooltipAria: "Learn more about stream rate calculation",
      rateTooltipText:
        "The stream rate is the amount of USDC that accrues to the recipient per day. For example, a rate of 38.62 USDC/day means the recipient can withdraw approximately 270 USDC after 7 days.",
      rateTooltipTitle: "How is stream rate calculated?",
      requiredDeposit: "Required deposit",
      startNow: "Start now",
      startTime: "Start time",
      summary: "Configure how fast USDC streams and when it starts.",
      yourDeposit: "Your deposit",
    },
    review: {
      address: "Address",
      cliff: "Cliff",
      deposit: "Deposit",
      duration: "Duration",
      editDepositAria: "Edit deposit",
      editRateScheduleAria: "Edit rate and schedule",
      editRecipientAria: "Edit recipient",
      failedTitle: "Stream creation failed.",
      rate: "Rate",
      rateSchedule: "Rate & schedule",
      rateValue: "{rate} USDC per day",
      recipient: "Recipient",
      start: "Start",
      startImmediately: "Immediately",
      submitStatus:
        "Submitting transaction to Stellar. Keep this window open.",
      waitingForConfirmation:
        "Waiting for Stellar confirmation before opening the success receipt.",
      confirmationCheck: "Confirmation check {attempts}",
      confirmationTx: "tx {txHash}",
      tryAgain: "Try again",
      warningPrefix: "By creating this stream:",
      warningBody:
        "{amount} USDC will be locked in a Soroban smart contract. The recipient can withdraw their accrued amount at any time during the stream.",
    },
    units: {
      day: {
        one: "day",
        other: "days",
      },
      days: "days",
      month: {
        one: "month",
        other: "months",
      },
    },
  },
  streams: {
    actions: {
      create: "Create stream",
      openFeatured: "Open featured deep dive",
    },
    announcements: {
      collapsed: "collapsed",
      expanded: "expanded",
      showing: "Showing {count} {streamWord}.",
      streamPlural: "streams",
      streamSingular: "stream",
      toggle: "{streamName} deep dive {state}.",
    },
    empty: {
      description:
        "Create and manage USDC streams. Set rate, duration, and cliff from the treasury.",
    },
    hero: {
      eyebrow: "Treasury streaming",
      subtitle:
        "Review every stream from a single operational surface, then open a deeper layout when treasury context, recipient balance, or audit notes need closer attention.",
      title: "Streams",
    },
    list: {
      cardsAria: "Stream cards",
      emptySearch: "No streams match your search or filter.",
      filterAria: "Filter and search streams",
      heading: "Deep-dive ready list",
      searchAria: "Search streams by name, ID or recipient",
      searchPlaceholder: "Search streams...",
      sortAria: "Sort streams",
      sortHighestRate: "Highest rate",
      sortMostRecent: "Most recent",
      sortName: "Name (A-Z)",
      subtitle:
        "Expand a row for the operational summary or open the full stream detail route for the complete layout.",
    },
    streamCard: {
      nextUnlock: "Next unlock {relativeTime}",
      nextUnlockLabel: "Next unlock",
      withdrawableNow: "Withdrawable now",
    },
    statusFilters: {
      active: "Active",
      all: "All",
      completed: "Completed",
      paused: "Paused",
    },
    summary: {
      activeDescription: "Currently accruing from treasury capital.",
      activeLabel: "Active streams",
      ariaLabel: "Stream summary",
      monthlyDescription:
        "Projected accrual across active streams each month.",
      monthlyLabel: "Monthly outflow",
      nextUnlockDescription:
        "Earliest upcoming release window across active streams.",
      nextUnlockLabel: "Next unlock",
      withdrawableDescription:
        "Available to recipients right now without a refill.",
      withdrawableLabel: "Withdrawable now",
    },
    toast: {
      clipboardUnavailable:
        "Clipboard access is unavailable in this browser. Copy the address manually instead.",
      recipientCopied:
        "Recipient for {streamName} copied to your clipboard.",
    },
    zeroAccrual: {
      action: "Check cliff date",
    },
  },
} as const;

export type EnglishCatalog = typeof en;
