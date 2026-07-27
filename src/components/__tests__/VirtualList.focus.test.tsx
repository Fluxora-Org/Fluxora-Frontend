import React from 'react';
import { render } from '@testing-library/react';
import VirtualList from '../../VirtualList';

type Item = { id: string; label: string };

const items: Item[] = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}`, label: `Item ${i}` }));

const renderItem = (item: Item, index: number) => (
  <button data-testid={`row-${index}`} tabIndex={0}>
    {item.label}
  </button>
);

describe('VirtualList focus retention', () => {
  it('moves focus to nearest mounted row when focused row unmounts', () => {
    const { getByTestId } = render(
      <VirtualList
        items={items}
        getKey={(item) => item.id}
        renderItem={renderItem}
        ariaLabel="Virtual list"
        estimateSize={30}
        overscan={1}
        threshold={0}
      />
    );

    const firstRow = getByTestId('row-0');
    firstRow.focus();
    expect(document.activeElement).toBe(firstRow);

    // Simulate scroll that unmounts the first row (scroll far down)
    window.scrollY = 1000;
    window.dispatchEvent(new Event('scroll'));

    // The effect should move focus to the first visible row (index 1 or similar)
    const newFocused = getByTestId('row-1');
    expect(document.activeElement).toBe(newFocused);
  });
});
