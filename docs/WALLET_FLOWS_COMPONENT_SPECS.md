# Wallet Flows - Component Implementation Specifications

## Overview

This document provides detailed implementation specifications for the wallet disconnect, stale session, and reconnect flow components. These specifications are designed to be implementation-ready without requiring clarification spikes.

## Component Architecture

### 1. WalletDisconnectModal

#### 1.1 File Structure
```
src/components/wallet-flows/WalletDisconnectModal/
├── WalletDisconnectModal.tsx
├── WalletDisconnectModal.module.css
├── WalletDisconnectModal.test.tsx
├── WalletDisconnectModal.stories.tsx
└── README.md
```

#### 1.2 TypeScript Interface
```typescript
interface WalletDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  walletAddress: string;
  activeFeatures: {
    streams: number;
    treasury: boolean;
    balance: boolean;
  };
  isLoading?: boolean;
  error?: string | null;
}

interface WalletDisconnectModalState {
  isConfirming: boolean;
  focusedAction: 'cancel' | 'disconnect' | null;
  hasAttemptedDisconnect: boolean;
}
```

#### 1.3 Implementation Template
```typescript
import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import styles from './WalletDisconnectModal.module.css';

export default function WalletDisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  walletAddress,
  activeFeatures,
  isLoading = false,
  error = null,
}: WalletDisconnectModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [focusedAction, setFocusedAction] = useState<'cancel' | 'disconnect'>('disconnect');

  // Focus management
  useEffect(() => {
    if (!isOpen) return;
    
    const previousActiveElement = document.activeElement as HTMLElement;
    const disconnectButton = modalRef.current?.querySelector('[data-action="disconnect"]') as HTMLElement;
    disconnectButton?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      // Focus trap implementation
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (!focusableElements || focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousActiveElement?.focus();
    };
  }, [isOpen, onClose]);

  const handleConfirm = async () => {
    if (isLoading) return;
    
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      // Error handling is managed by parent component
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="disconnect-modal-title"
      aria-describedby="disconnect-modal-description"
    >
      <div ref={modalRef} className={styles.modal}>
        {/* Close Button */}
        <button
          ref={cancelButtonRef}
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close disconnect wallet dialog"
          disabled={isLoading}
        >
          <X size={16} aria-hidden="true" />
        </button>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.warningIcon}>
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <h2 id="disconnect-modal-title" className={styles.title}>
            Disconnect Wallet?
          </h2>
        </div>

        {/* Description */}
        <div className={styles.content}>
          <p id="disconnect-modal-description" className={styles.description}>
            Are you sure you want to disconnect your wallet? You'll lose access to:
          </p>
          
          <ul className={styles.featureList} aria-label="Features that will be unavailable">
            {activeFeatures.streams > 0 && (
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>📊</span>
                <span>{activeFeatures.streams} active stream{activeFeatures.streams !== 1 ? 's' : ''}</span>
              </li>
            )}
            {activeFeatures.treasury && (
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>🏦</span>
                <span>Treasury management</span>
              </li>
            )}
            {activeFeatures.balance && (
              <li className={styles.featureItem}>
                <span className={styles.featureIcon}>💰</span>
                <span>Real-time balance updates</span>
              </li>
            )}
          </ul>

          <p className={styles.reassurance}>
            You can reconnect anytime from the navigation bar.
          </p>

          <div className={styles.walletInfo}>
            <span className={styles.walletLabel}>Connected wallet:</span>
            <code className={styles.walletAddress}>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </code>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={styles.errorBanner} role="alert" aria-live="assertive">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isLoading}
            data-action="cancel"
          >
            Cancel
          </button>
          
          <button
            type="button"
            className={styles.disconnectButton}
            onClick={handleConfirm}
            disabled={isLoading}
            data-action="disconnect"
            aria-describedby={isLoading ? "disconnect-loading" : undefined}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
                <span id="disconnect-loading" className="sr-only">
                  Disconnecting wallet
                </span>
                Disconnecting...
              </>
            ) : (
              'Disconnect Wallet'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 1.4 CSS Module Specification
```css
/* WalletDisconnectModal.module.css */

.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(2, 8, 18, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: clamp(12px, 4vw, 24px);
}

.modal {
  position: relative;
  background: var(--surface-neutral);
  border: 1px solid var(--border-neutral);
  border-radius: var(--radius-xl);
  padding: clamp(20px, 5vw, 32px);
  max-width: 480px;
  width: 100%;
  box-shadow: var(--shadow-xl);
  font-family: var(--font-family-base);
}

.closeButton {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-md);
  padding: 0.5rem;
  transition: all var(--transition-fast);
}

.closeButton:hover:not(:disabled) {
  background: var(--surface-elevated);
  color: var(--text-secondary);
}

.closeButton:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.warningIcon {
  width: 48px;
  height: 48px;
  background: var(--color-warning-bg);
  color: var(--status-warning);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.title {
  font: var(--font-heading-3);
  color: var(--text-vivid);
  margin: 0;
}

.content {
  margin-bottom: 1.5rem;
}

.description {
  font: var(--font-body-md);
  color: var(--text-secondary);
  margin: 0 0 1rem;
}

.featureList {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
}

.featureItem {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  font: var(--font-body-sm);
  color: var(--text-secondary);
}

.featureIcon {
  font-size: 1.25rem;
}

.reassurance {
  font: var(--font-body-sm);
  color: var(--text-muted);
  margin: 1rem 0;
  font-style: italic;
}

.walletInfo {
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.walletLabel {
  font: var(--font-label-sm);
  color: var(--text-muted);
}

.walletAddress {
  font: var(--font-mono-sm);
  color: var(--text-secondary);
  background: var(--surface-base);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}

.errorBanner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-danger-bg);
  color: var(--status-error);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  font: var(--font-body-sm);
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: stretch;
}

.cancelButton {
  flex: 1;
  min-height: 44px;
  background: var(--surface-elevated);
  color: var(--text-secondary);
  border: 1px solid var(--border-neutral);
  border-radius: var(--radius-md);
  font: var(--font-label-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.cancelButton:hover:not(:disabled) {
  background: var(--surface-raised);
  border-color: var(--border-interactive);
}

.cancelButton:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.disconnectButton {
  flex: 1;
  min-height: 44px;
  background: var(--color-danger);
  color: white;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  font: var(--font-label-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.disconnectButton:hover:not(:disabled) {
  background: var(--color-danger-hover);
  border-color: var(--color-danger-hover);
}

.disconnectButton:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.disconnectButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .modal {
    padding: 1.5rem;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .cancelButton,
  .disconnectButton {
    width: 100%;
  }
}
```

### 2. StaleSessionBanner

#### 2.1 File Structure
```
src/components/wallet-flows/StaleSessionBanner/
├── StaleSessionBanner.tsx
├── StaleSessionBanner.module.css
├── StaleSessionBanner.test.tsx
├── StaleSessionBanner.stories.tsx
└── README.md
```

#### 2.2 TypeScript Interface
```typescript
interface StaleSessionBannerProps {
  isVisible: boolean;
  onReconnect: () => void;
  onDismiss: () => void;
  severity: 'warning' | 'error' | 'info';
  message?: string;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  maxAttempts?: number;
}

interface StaleSessionBannerState {
  isReconnecting: boolean;
  reconnectProgress: number;
  timeRemaining: number;
}
```

#### 2.3 Implementation Template
```typescript
import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, X, Wifi, WifiOff } from 'lucide-react';
import styles from './StaleSessionBanner.module.css';

const DEFAULT_MESSAGES = {
  warning: 'Wallet connection unstable. Some features may not work correctly.',
  error: 'Wallet connection lost. Please reconnect to continue using all features.',
  info: 'Reconnecting to wallet...',
};

const AUTO_RECONNECT_DELAY = 2000; // 2 seconds
const MAX_AUTO_ATTEMPTS = 3;

export default function StaleSessionBanner({
  isVisible,
  onReconnect,
  onDismiss,
  severity,
  message,
  autoReconnect = false,
  reconnectAttempts = 0,
  maxAttempts = MAX_AUTO_ATTEMPTS,
}: StaleSessionBannerProps) {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(AUTO_RECONNECT_DELAY / 1000);

  // Auto-reconnect logic
  useEffect(() => {
    if (!autoReconnect || !isVisible || isReconnecting || reconnectAttempts >= maxAttempts) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleReconnect();
          return AUTO_RECONNECT_DELAY / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoReconnect, isVisible, isReconnecting, reconnectAttempts, maxAttempts]);

  const handleReconnect = async () => {
    if (isReconnecting) return;
    
    setIsReconnecting(true);
    try {
      await onReconnect();
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleDismiss = () => {
    if (isReconnecting) return;
    onDismiss();
  };

  if (!isVisible) return null;

  const displayMessage = message || DEFAULT_MESSAGES[severity];
  const showAutoReconnect = autoReconnect && reconnectAttempts < maxAttempts && !isReconnecting;
  const canRetry = reconnectAttempts < maxAttempts;

  return (
    <div 
      className={`${styles.banner} ${styles[severity]}`}
      role={severity === 'error' ? 'alert' : 'status'}
      aria-live={severity === 'error' ? 'assertive' : 'polite'}
    >
      <div className={styles.content}>
        {/* Icon */}
        <div className={styles.icon} aria-hidden="true">
          {severity === 'error' ? (
            <WifiOff size={20} />
          ) : severity === 'warning' ? (
            <AlertTriangle size={20} />
          ) : (
            <Wifi size={20} />
          )}
        </div>

        {/* Message */}
        <div className={styles.message}>
          <p className={styles.text}>{displayMessage}</p>
          
          {reconnectAttempts > 0 && (
            <p className={styles.attempts}>
              Attempt {reconnectAttempts} of {maxAttempts}
              {reconnectAttempts >= maxAttempts && ' - Max attempts reached'}
            </p>
          )}

          {showAutoReconnect && (
            <p className={styles.autoReconnect}>
              Auto-reconnecting in {timeRemaining}s...
            </p>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {canRetry && !isReconnecting && (
            <button
              type="button"
              className={styles.reconnectButton}
              onClick={handleReconnect}
              disabled={isReconnecting}
              aria-label="Reconnect wallet now"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Reconnect
            </button>
          )}

          {!autoReconnect && (
            <button
              type="button"
              className={styles.dismissButton}
              onClick={handleDismiss}
              disabled={isReconnecting}
              aria-label="Dismiss wallet connection warning"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Loading State */}
        {isReconnecting && (
          <div className={styles.loading}>
            <RefreshCw size={16} className={styles.spinner} aria-hidden="true" />
            <span className="sr-only">Reconnecting to wallet</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 2.4 CSS Module Specification
```css
/* StaleSessionBanner.module.css */

.banner {
  border: 1px solid;
  border-radius: var(--radius-md);
  margin: 1rem 0;
  font-family: var(--font-family-base);
  transition: all var(--transition-base);
}

.banner.warning {
  background: var(--color-warning-bg);
  border-color: var(--status-warning);
  color: var(--status-warning);
}

.banner.error {
  background: var(--color-danger-bg);
  border-color: var(--status-error);
  color: var(--status-error);
}

.banner.info {
  background: var(--color-info-bg);
  border-color: var(--status-info);
  color: var(--status-info);
}

.content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
}

.icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.message {
  flex: 1;
  min-width: 0;
}

.text {
  font: var(--font-body-sm);
  margin: 0;
  line-height: 1.5;
}

.attempts {
  font: var(--font-label-sm);
  margin: 0.25rem 0 0;
  opacity: 0.8;
}

.autoReconnect {
  font: var(--font-label-sm);
  margin: 0.25rem 0 0;
  font-style: italic;
  opacity: 0.9;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.reconnectButton,
.dismissButton {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid;
  border-radius: var(--radius-sm);
  font: var(--font-label-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  background: transparent;
}

.reconnectButton {
  color: var(--color-text-primary);
  border-color: currentColor;
}

.reconnectButton:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.dismissButton {
  color: currentColor;
  border-color: currentColor;
  opacity: 0.7;
}

.dismissButton:hover:not(:disabled) {
  opacity: 1;
}

.reconnectButton:focus-visible,
.dismissButton:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 1px;
}

.reconnectButton:disabled,
.dismissButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font: var(--font-label-sm);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .content {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .actions {
    align-self: flex-end;
  }
}
```

### 3. ReconnectModal

#### 3.1 File Structure
```
src/components/wallet-flows/ReconnectModal/
├── ReconnectModal.tsx
├── ReconnectModal.module.css
├── ReconnectModal.test.tsx
├── ReconnectModal.stories.tsx
└── README.md
```

#### 3.2 TypeScript Interface
```typescript
interface ReconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReconnect: (provider: WalletProvider) => Promise<void>;
  previousProvider?: WalletProvider;
  previousAddress?: string;
  availableProviders: WalletProvider[];
  isReconnecting?: boolean;
  reconnectProgress?: ReconnectProgress;
}

interface WalletProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  isAvailable: boolean;
}

interface ReconnectProgress {
  step: 'selecting' | 'connecting' | 'verifying' | 'restoring';
  percentage: number;
  message: string;
}
```

#### 3.3 Implementation Template
```typescript
import { useState, useRef, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import styles from './ReconnectModal.module.css';

const PROGRESS_STEPS = [
  { key: 'selecting', label: 'Selecting wallet', icon: '🔍' },
  { key: 'connecting', label: 'Connecting to wallet', icon: '🔗' },
  { key: 'verifying', label: 'Verifying connection', icon: '✅' },
  { key: 'restoring', label: 'Restoring session', icon: '🔄' },
] as const;

export default function ReconnectModal({
  isOpen,
  onClose,
  onReconnect,
  previousProvider,
  previousAddress,
  availableProviders,
  isReconnecting = false,
  reconnectProgress,
}: ReconnectModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedProvider, setSelectedProvider] = useState<WalletProvider | null>(
    previousProvider || null
  );

  // Focus management
  useEffect(() => {
    if (!isOpen) return;
    
    const previousActiveElement = document.activeElement as HTMLElement;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      // Focus trap implementation (same as DisconnectModal)
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousActiveElement?.focus();
    };
  }, [isOpen, onClose]);

  const handleProviderSelect = (provider: WalletProvider) => {
    if (isReconnecting) return;
    setSelectedProvider(provider);
  };

  const handleReconnect = async () => {
    if (!selectedProvider || isReconnecting) return;
    
    try {
      await onReconnect(selectedProvider);
    } catch (err) {
      // Error handling managed by parent
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isReconnecting) {
      onClose();
    }
  };

  const renderProgressStep = (step: typeof PROGRESS_STEPS[number], index: number) => {
    const isActive = reconnectProgress?.step === step.key;
    const isCompleted = reconnectProgress && 
      PROGRESS_STEPS.findIndex(s => s.key === reconnectProgress.step) > index;
    
    return (
      <div 
        key={step.key}
        className={`${styles.progressStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
      >
        <div className={styles.stepIcon}>
          {isCompleted ? (
            <CheckCircle size={16} aria-hidden="true" />
          ) : isActive ? (
            <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
          ) : (
            <span aria-hidden="true">{step.icon}</span>
          )}
        </div>
        <span className={styles.stepLabel}>{step.label}</span>
      </div>
    );
  };

  if (!isOpen) return null;

  const showProgress = isReconnecting && reconnectProgress;
  const canReconnect = selectedProvider && !isReconnecting;

  return (
    <div 
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconnect-modal-title"
      aria-describedby="reconnect-modal-description"
    >
      <div ref={modalRef} className={styles.modal}>
        {/* Close Button */}
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          disabled={isReconnecting}
          aria-label="Close reconnect wallet dialog"
        >
          <X size={16} aria-hidden="true" />
        </button>

        {/* Header */}
        <div className={styles.header}>
          <h2 id="reconnect-modal-title" className={styles.title}>
            {previousProvider ? 'Reconnect to Wallet' : 'Choose Wallet Provider'}
          </h2>
          <p id="reconnect-modal-description" className={styles.description}>
            {previousProvider 
              ? 'Reconnecting to your previously connected wallet'
              : 'Select your wallet provider to reconnect to Fluxora'
            }
          </p>
        </div>

        {/* Previous Wallet Info */}
        {previousProvider && previousAddress && (
          <div className={styles.previousWallet}>
            <div className={styles.walletInfo}>
              <div className={styles.walletIcon}>
                <span aria-hidden="true">{previousProvider.icon}</span>
              </div>
              <div className={styles.walletDetails}>
                <div className={styles.walletName}>{previousProvider.name}</div>
                <code className={styles.walletAddress}>
                  {previousAddress.slice(0, 6)}...{previousAddress.slice(-4)}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {showProgress && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${reconnectProgress.percentage}%` }}
                role="progressbar"
                aria-valuenow={reconnectProgress.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Reconnection progress: ${reconnectProgress.percentage}%`}
              />
            </div>
            <div className={styles.progressSteps}>
              {PROGRESS_STEPS.map(renderProgressStep)}
            </div>
            <div className={styles.progressMessage}>
              {reconnectProgress.message}
            </div>
          </div>
        )}

        {/* Provider Selection */}
        {!showProgress && (
          <div className={styles.providerSection}>
            <h3 className={styles.sectionTitle}>Wallet Provider</h3>
            <div className={styles.providerList} role="list" aria-label="Available wallet providers">
              {availableProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className={`${styles.providerOption} ${selectedProvider?.id === provider.id ? styles.selected : ''} ${!provider.isAvailable ? styles.disabled : ''}`}
                  onClick={() => handleProviderSelect(provider)}
                  disabled={!provider.isAvailable || isReconnecting}
                  role="listitem"
                  aria-label={`Select ${provider.name}`}
                  aria-selected={selectedProvider?.id === provider.id}
                  aria-disabled={!provider.isAvailable}
                >
                  <div className={styles.providerIcon}>
                    <span aria-hidden="true">{provider.icon}</span>
                  </div>
                  <div className={styles.providerInfo}>
                    <div className={styles.providerName}>{provider.name}</div>
                    <div className={styles.providerDescription}>{provider.description}</div>
                    {!provider.isAvailable && (
                      <div className={styles.unavailableNotice}>Not available</div>
                    )}
                  </div>
                  <div className={styles.providerCheck}>
                    {selectedProvider?.id === provider.id && (
                      <CheckCircle size={20} aria-hidden="true" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isReconnecting}
          >
            Cancel
          </button>
          
          <button
            type="button"
            className={styles.reconnectButton}
            onClick={handleReconnect}
            disabled={!canReconnect}
            aria-describedby={isReconnecting ? "reconnect-loading" : undefined}
          >
            {isReconnecting ? (
              <>
                <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
                <span id="reconnect-loading" className="sr-only">
                  Reconnecting to wallet
                </span>
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw size={16} aria-hidden="true" />
                Reconnect Wallet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 3.4 CSS Module Specification
```css
/* ReconnectModal.module.css */

.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(2, 8, 18, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: clamp(12px, 4vw, 24px);
}

.modal {
  position: relative;
  background: var(--surface-neutral);
  border: 1px solid var(--border-neutral);
  border-radius: var(--radius-xl);
  padding: clamp(20px, 5vw, 32px);
  max-width: 520px;
  width: 100%;
  box-shadow: var(--shadow-xl);
  font-family: var(--font-family-base);
}

.closeButton {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-md);
  padding: 0.5rem;
  transition: all var(--transition-fast);
}

.closeButton:hover:not(:disabled) {
  background: var(--surface-elevated);
  color: var(--text-secondary);
}

.closeButton:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.header {
  margin-bottom: 1.5rem;
}

.title {
  font: var(--font-heading-3);
  color: var(--text-vivid);
  margin: 0 0 0.5rem;
}

.description {
  font: var(--font-body-md);
  color: var(--text-secondary);
  margin: 0;
}

.previousWallet {
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.walletInfo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.walletIcon {
  width: 40px;
  height: 40px;
  background: var(--surface-base);
  border: 1px solid var(--border-neutral);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.walletDetails {
  flex: 1;
}

.walletName {
  font: var(--font-label-lg);
  font-weight: 600;
  color: var(--text-vivid);
  margin-bottom: 0.25rem;
}

.walletAddress {
  font: var(--font-mono-sm);
  color: var(--text-secondary);
  background: var(--surface-neutral);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}

.progressContainer {
  margin-bottom: 1.5rem;
}

.progressBar {
  height: 4px;
  background: var(--surface-elevated);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 1rem;
}

.progressFill {
  height: 100%;
  background: var(--color-accent-primary);
  transition: width var(--transition-base);
}

.progressSteps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.progressStep {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.stepIcon {
  width: 32px;
  height: 32px;
  background: var(--surface-elevated);
  border: 2px solid var(--border-neutral);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all var(--transition-base);
}

.progressStep.active .stepIcon {
  border-color: var(--color-accent-primary);
  color: var(--color-accent-primary);
}

.progressStep.completed .stepIcon {
  background: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
  color: white;
}

.stepLabel {
  font: var(--font-label-sm);
  color: var(--text-muted);
  text-align: center;
}

.progressStep.active .stepLabel,
.progressStep.completed .stepLabel {
  color: var(--text-secondary);
}

.progressMessage {
  font: var(--font-body-sm);
  color: var(--text-secondary);
  text-align: center;
  padding: 0.75rem;
  background: var(--surface-elevated);
  border-radius: var(--radius-md);
}

.providerSection {
  margin-bottom: 1.5rem;
}

.sectionTitle {
  font: var(--font-heading-4);
  color: var(--text-vivid);
  margin: 0 0 1rem;
}

.providerList {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.providerOption {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid var(--border-neutral);
  border-radius: var(--radius-md);
  background: var(--surface-neutral);
  cursor: pointer;
  transition: all var(--transition-base);
  text-align: left;
}

.providerOption:hover:not(:disabled) {
  border-color: var(--border-interactive);
  background: var(--surface-elevated);
}

.providerOption.selected {
  border-color: var(--color-accent-primary);
  background: var(--color-accent-primary);
  background: var(--color-accent-primary);
  background: linear-gradient(135deg, rgba(0, 184, 212, 0.1), rgba(0, 212, 170, 0.1));
}

.providerOption.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.providerIcon {
  width: 48px;
  height: 48px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-neutral);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.providerInfo {
  flex: 1;
  min-width: 0;
}

.providerName {
  font: var(--font-label-lg);
  font-weight: 600;
  color: var(--text-vivid);
  margin-bottom: 0.25rem;
}

.providerDescription {
  font: var(--font-body-sm);
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.unavailableNotice {
  font: var(--font-label-sm);
  color: var(--status-error);
  font-weight: 500;
}

.providerCheck {
  color: var(--color-accent-primary);
  flex-shrink: 0;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: stretch;
}

.cancelButton {
  flex: 1;
  min-height: 44px;
  background: var(--surface-elevated);
  color: var(--text-secondary);
  border: 1px solid var(--border-neutral);
  border-radius: var(--radius-md);
  font: var(--font-label-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.cancelButton:hover:not(:disabled) {
  background: var(--surface-raised);
  border-color: var(--border-interactive);
}

.cancelButton:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.reconnectButton {
  flex: 1;
  min-height: 44px;
  background: var(--color-accent-primary);
  color: white;
  border: 1px solid var(--color-accent-primary);
  border-radius: var(--radius-md);
  font: var(--font-label-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.reconnectButton:hover:not(:disabled) {
  background: var(--color-accent-primary-dark);
  border-color: var(--color-accent-primary-dark);
}

.reconnectButton:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.reconnectButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .modal {
    padding: 1.5rem;
  }
  
  .progressSteps {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .progressStep {
    flex-direction: row;
    justify-content: flex-start;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .cancelButton,
  .reconnectButton {
    width: 100%;
  }
}
```

## 4. Integration Guide

### 4.1 Wallet Context Extensions

Extend the existing `WalletContext` to support disconnect and reconnect flows:

```typescript
// src/components/wallet-connect/WalletContext.tsx extensions

interface WalletContextType extends WalletState {
  connect: (address: string, network: string) => void;
  disconnect: () => Promise<void>;
  reconnect: (provider?: WalletProvider) => Promise<void>;
  checkSessionHealth: () => Promise<boolean>;
  getSessionError: () => string | null;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be inside <WalletProvider>");
  return ctx;
}
```

### 4.2 State Management Pattern

Use a reducer pattern for complex wallet state management:

```typescript
type WalletAction =
  | { type: 'CONNECT_SUCCESS'; payload: { address: string; network: string } }
  | { type: 'DISCONNECT_REQUEST' }
  | { type: 'DISCONNECT_SUCCESS' }
  | { type: 'DISCONNECT_ERROR'; payload: string }
  | { type: 'SESSION_STALE'; payload: string }
  | { type: 'RECONNECT_REQUEST'; payload?: WalletProvider }
  | { type: 'RECONNECT_SUCCESS' }
  | { type: 'RECONNECT_ERROR'; payload: string };

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  // Implementation logic
}
```

### 4.3 Error Boundary Integration

Wrap wallet-dependent components with error boundaries:

```typescript
// src/components/wallet-flows/WalletErrorBoundary.tsx

export default function WalletErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<WalletErrorFallback />}
      onError={(error, errorInfo) => {
        // Log wallet errors for debugging
        console.error('Wallet error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

## 5. Testing Strategy

### 5.1 Unit Tests

Each component should have comprehensive unit tests covering:

- **Rendering**: All states and variants
- **Interactions**: User actions and callbacks
- **Accessibility**: ARIA attributes and keyboard navigation
- **Error Handling**: Edge cases and error states

Example test structure:
```typescript
// WalletDisconnectModal.test.tsx

describe('WalletDisconnectModal', () => {
  it('renders correctly when open', () => {
    // Test basic rendering
  });

  it('handles confirmation correctly', async () => {
    // Test disconnect confirmation
  });

  it('manages focus properly', () => {
    // Test focus trap and restoration
  });

  it('announces errors to screen readers', () => {
    // Test accessibility compliance
  });
});
```

### 5.2 Integration Tests

Test wallet flow integration with existing components:

```typescript
// wallet-flows.integration.test.tsx

describe('Wallet Flows Integration', () => {
  it('maintains context across reconnection', async () => {
    // Test state persistence
  });

  it('handles session staleness gracefully', () => {
    // Test stale session detection
  });

  it('provides clear error recovery paths', () => {
    // Test error handling and recovery
  });
});
```

### 5.3 Accessibility Tests

Use automated tools and manual testing:

- **axe-core**: Automated accessibility testing
- **Screen readers**: NVDA, VoiceOver, JAWS testing
- **Keyboard navigation**: Full keyboard-only navigation
- **Color contrast**: Verify contrast ratios

## 6. Performance Considerations

### 6.1 Code Splitting

Implement lazy loading for modal components:

```typescript
const WalletDisconnectModal = lazy(() => import('./WalletDisconnectModal'));
const StaleSessionBanner = lazy(() => import('./StaleSessionBanner'));
const ReconnectModal = lazy(() => import('./ReconnectModal'));
```

### 6.2 Memory Management

- Clean up event listeners and timers
- Abort pending wallet requests on unmount
- Clear modal state properly

### 6.3 Network Optimization

- Debounce wallet health checks
- Cache wallet provider availability
- Optimize reconnection attempts

## 7. Deployment Checklist

### 7.1 Pre-deployment
- [ ] All components pass unit and integration tests
- [ ] Accessibility audit passes WCAG 2.1 AA
- [ ] Performance budgets met (<100ms interaction delay)
- [ ] Error monitoring configured
- [ ] Analytics events implemented

### 7.2 Post-deployment
- [ ] Monitor wallet connection success rates
- [ ] Track user session duration
- [ ] Measure support ticket reduction
- [ ] Collect user feedback on flows

---

**Document Version**: 1.0  
**Last Updated**: 2025-04-29  
**Implementation Target**: Sprint 3  
**Code Review Required**: Yes  
**QA Testing Required**: Yes
