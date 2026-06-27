import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StreamCreatedModal from '../StreamCreatedModal';

describe('StreamCreatedModal View Stream', () => {
  let openSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens new window when url is valid and popup is not blocked', async () => {
    openSpy.mockReturnValue({} as Window);
    const user = userEvent.setup();
    render(
      <StreamCreatedModal
        isOpen={true}
        onClose={() => {}}
        streamId="123"
        streamUrl="https://stellar.expert/explorer/public/account/G123"
        onCreateAnother={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /view stream/i }));

    expect(openSpy).toHaveBeenCalledWith(
      'https://stellar.expert/explorer/public/account/G123',
      '_blank',
      'noopener,noreferrer'
    );
    expect(screen.queryByText(/popup blocked/i)).not.toBeInTheDocument();
  });

  it('shows fallback link when popup is blocked (window.open returns null)', async () => {
    openSpy.mockReturnValue(null);
    const user = userEvent.setup();
    render(
      <StreamCreatedModal
        isOpen={true}
        onClose={() => {}}
        streamId="123"
        streamUrl="https://stellar.expert/explorer/public/account/G123"
        onCreateAnother={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /view stream/i }));

    expect(openSpy).toHaveBeenCalled();
    expect(screen.getByText(/popup blocked/i)).toBeInTheDocument();
    
    const fallbackLink = screen.getByRole('link', { name: /click here to view your stream/i });
    expect(fallbackLink).toHaveAttribute('href', 'https://stellar.expert/explorer/public/account/G123');
    expect(fallbackLink).toHaveAttribute('target', '_blank');
    expect(fallbackLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not open window and logs error when url has non-https scheme (javascript:)', async () => {
    const user = userEvent.setup();
    render(
      <StreamCreatedModal
        isOpen={true}
        onClose={() => {}}
        streamId="123"
        streamUrl="javascript:alert('XSS')"
        onCreateAnother={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /view stream/i }));

    expect(openSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid URL scheme. Only https is allowed.');
  });
  
  it('does not open window and logs error when url has non-https scheme (data:)', async () => {
    const user = userEvent.setup();
    render(
      <StreamCreatedModal
        isOpen={true}
        onClose={() => {}}
        streamId="123"
        streamUrl="data:text/html,<script>alert('XSS')</script>"
        onCreateAnother={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /view stream/i }));

    expect(openSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid URL scheme. Only https is allowed.');
  });
});
