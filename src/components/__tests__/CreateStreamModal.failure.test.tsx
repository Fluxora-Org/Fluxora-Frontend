import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react';
import CreateStreamModal from '../CreateStreamModal';

const VALID_STELLAR =
  'GABC' + 'ABCDEFGHJKLMNPQRSTUVWXYZ234567'.repeat(2).slice(0, 52);

function advanceToStep3(container: HTMLElement) {
  const recipientInput = container.querySelector(
    '#create-stream-recipient',
  ) as HTMLInputElement;
  fireEvent.change(recipientInput, { target: { value: VALID_STELLAR } });

  const depositInput = container.querySelector(
    '#create-stream-deposit',
  ) as HTMLInputElement;
  fireEvent.change(depositInput, { target: { value: '100' } });

  fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
  fireEvent.click(within(container).getByRole('button', { name: /^next$/i }));
}

describe('CreateStreamModal submit failure handling', () => {
  it('surfaces a rejected onStreamCreated promise and keeps the modal open', async () => {
    const submitError = new Error('RPC rejected');
    const onClose = vi.fn();
    const onStreamError = vi.fn();
    const onStreamCreated = vi.fn().mockRejectedValue(submitError);

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={onClose}
        onStreamCreated={onStreamCreated}
        onStreamError={onStreamError}
      />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('RPC rejected');
    });
    expect(onStreamError).toHaveBeenCalledWith(submitError);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('surfaces a synchronously thrown onStreamCreated error', async () => {
    const submitError = new Error('Wallet denied');
    const onClose = vi.fn();
    const onStreamError = vi.fn();
    const onStreamCreated = vi.fn(() => {
      throw submitError;
    });

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={onClose}
        onStreamCreated={onStreamCreated}
        onStreamError={onStreamError}
      />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Wallet denied');
    });
    expect(onStreamError).toHaveBeenCalledWith(submitError);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clears the failure alert and retries when Try again is clicked', async () => {
    const onStreamCreated = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockImplementationOnce(() => new Promise<void>(() => {}));

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={() => {}}
        onStreamCreated={onStreamCreated}
      />,
    );

    advanceToStep3(container);
    fireEvent.click(
      within(container).getByRole('button', { name: /^create stream$/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network timeout');
    });

    fireEvent.click(screen.getByRole('button', { name: /^try again$/i }));

    await waitFor(() => {
      expect(onStreamCreated).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('guards against duplicate submissions while the request is pending', () => {
    const onStreamCreated = vi.fn(() => new Promise<void>(() => {}));

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={() => {}}
        onStreamCreated={onStreamCreated}
      />,
    );

    advanceToStep3(container);
    const createButton = within(container).getByRole('button', {
      name: /^create stream$/i,
    });

    fireEvent.click(createButton);
    fireEvent.click(createButton);

    expect(onStreamCreated).toHaveBeenCalledTimes(1);
  });
});
