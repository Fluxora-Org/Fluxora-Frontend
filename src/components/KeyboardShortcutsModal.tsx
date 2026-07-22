import { useEffect, useRef, useState } from 'react';
import { useModalAccessibility } from './useModalAccessibility';

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  heading: string;
  shortcuts: ShortcutEntry[];
}

const SECTIONS: ShortcutSection[] = [
  {
    heading: 'Global',
    shortcuts: [
      { keys: ['?'], description: 'Open keyboard shortcuts' },
      { keys: ['Escape'], description: 'Close modal / dismiss overlay' },
    ],
  },
];

function isAnotherModalOpen(currentModalRef?: React.RefObject<HTMLElement | null>): boolean {
  const modals = document.querySelectorAll('[aria-modal="true"]');
  if (modals.length === 0) return false;

  const currentContainer = currentModalRef?.current?.closest('[aria-modal="true"]');
  return Array.from(modals).some((modal) => modal !== currentContainer);
}

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalAccessibility({
    isOpen: open,
    modalRef: dialogRef,
    onClose: () => setOpen(false),
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement).isContentEditable;

      if (e.key === '?' && !isEditable) {
        if (isAnotherModalOpen(dialogRef)) {
          setOpen(false);
          return;
        }
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        ref={dialogRef}
        style={{
          background: '#1a1a2e', color: '#e2e8f0', borderRadius: 12,
          padding: '1.5rem', maxWidth: 520, width: '90%',
          maxHeight: '80vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Keyboard Shortcuts</h2>
          <button
            aria-label="Close keyboard shortcuts"
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {SECTIONS.map((section) => (
          <section key={section.heading} style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.5rem' }}>
              {section.heading}
            </h3>
            <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {section.shortcuts.map((s) => (
                <div key={s.description} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <dt style={{ display: 'flex', gap: '0.25rem' }}>
                    {s.keys.map((k) => (
                      <kbd key={k} style={{
                        background: '#2d3748', border: '1px solid #4a5568',
                        borderRadius: 4, padding: '0.1rem 0.4rem',
                        fontSize: '0.8rem', fontFamily: 'monospace',
                      }}>{k}</kbd>
                    ))}
                  </dt>
                  <dd style={{ margin: 0, fontSize: '0.875rem', color: '#cbd5e0' }}>{s.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
