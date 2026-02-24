import { useEffect, useRef } from 'react';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectFreighter?: () => void;
  onConnectAlbedo?: () => void;
  onConnectWalletConnect?: () => void;
}

export default function ConnectWalletModal({
  isOpen,
  onClose,
  onConnectFreighter,
  onConnectAlbedo,
  onConnectWalletConnect,
}: ConnectWalletModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

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
    firstFocusableRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const walletOptions = [
    {
      id: 'freighter',
      name: 'Freighter',
      description: 'Stellar browser extension wallet.',
      icon: '🚀',
      onClick: onConnectFreighter || (() => console.log('Freighter clicked')),
    },
    {
      id: 'albedo',
      name: 'Albedo',
      description: 'Web-based Stellar wallet.',
      icon: '⭐',
      onClick: onConnectAlbedo || (() => console.log('Albedo clicked')),
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      description: 'Connect with mobile wallets.',
      icon: '🔗',
      onClick: onConnectWalletConnect || (() => console.log('WalletConnect clicked')),
    },
  ];

  return (
    <div style={styles.backdrop} onClick={handleBackdropClick}>
      <div style={styles.modal} ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button
          ref={firstFocusableRef}
          style={styles.closeButton}
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        <div style={styles.header}>
          <h2 id="modal-title" style={styles.title}>Connect wallet</h2>
          <p style={styles.subtitle}>Connect your Stellar wallet to use Fluxora.</p>
        </div>

        <div style={styles.walletList}>
          {walletOptions.map((wallet) => (
            <button
              key={wallet.id}
              style={styles.walletOption}
              onClick={wallet.onClick}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#1e2d42';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#121a2a';
              }}
            >
              <div style={styles.walletIcon}>{wallet.icon}</div>
              <div style={styles.walletInfo}>
                <div style={styles.walletName}>{wallet.name}</div>
                <div style={styles.walletDescription}>{wallet.description}</div>
              </div>
              <div style={styles.chevron}>→</div>
            </button>
          ))}
        </div>

        <div style={styles.footer}>
          By connecting, you agree to Fluxora's{' '}
          <a href="/terms" style={styles.termsLink}>
            Terms of Service
          </a>
          .
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    position: 'relative',
    background: '#0a0e17',
    borderRadius: 16,
    padding: 'clamp(1.25rem, 5vw, 2rem)',
    maxWidth: 480,
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid #1e2d42',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  closeButton: {
    position: 'absolute',
    top: '1.5rem',
    right: '1.5rem',
    background: 'transparent',
    border: 'none',
    color: '#6b7a94',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
    transition: 'color 0.2s',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '0.5rem',
  },
  subtitle: {
    margin: 0,
    fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
    color: '#6b7a94',
    lineHeight: 1.5,
  },
  walletList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  walletOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(0.75rem, 3vw, 1rem)',
    background: '#121a2a',
    border: '1px solid #1e2d42',
    borderRadius: 12,
    padding: 'clamp(0.75rem, 3vw, 1rem)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
    width: '100%',
  },
  walletIcon: {
    fontSize: 'clamp(1.5rem, 5vw, 2rem)',
    flexShrink: 0,
    width: 'clamp(40px, 12vw, 48px)',
    height: 'clamp(40px, 12vw, 48px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '0.25rem',
  },
  walletDescription: {
    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
    color: '#6b7a94',
    lineHeight: 1.4,
  },
  chevron: {
    fontSize: '1.25rem',
    color: '#6b7a94',
    flexShrink: 0,
  },
  footer: {
    fontSize: '0.8125rem',
    color: '#6b7a94',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  termsLink: {
    color: '#00d4aa',
    textDecoration: 'none',
  },
};
