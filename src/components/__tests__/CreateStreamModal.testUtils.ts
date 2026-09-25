import { fireEvent, screen, within } from '@testing-library/react';

/**
 * Clicks the "Create a single stream" mode card to enter the single-stream
 * wizard (flowMode === 'single'). Must be called after renderModal().
 */
export function selectSingleStream() {
  const btn = screen.getByRole('button', {
    name: /Create a single stream/i,
  });
  fireEvent.click(btn);
}

/**
 * Refined container-aware helper for tests that use `within(container)`.
 */
export function selectSingleStreamInContainer(container: HTMLElement) {
  const btn = within(container).getByRole('button', {
    name: /Create a single stream/i,
  });
  fireEvent.click(btn);
}
