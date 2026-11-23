/**
 * Tests for src/lib/utils.ts
 *
 * `utils.ts` is intentionally narrow: it owns exactly one concern —
 * composing Tailwind CSS class names.  The `cn` helper merges an arbitrary
 * number of class values using `clsx` for conditional logic and
 * `tailwind-merge` to resolve Tailwind conflicts (e.g. two utilities that
 * target the same CSS property).
 *
 * Why keep this in its own module rather than inlining it everywhere?
 * ─ Single import path: consumers don't need to know about both `clsx` *and*
 *   `tailwind-merge`.
 * ─ Easy to swap the underlying implementation without touching call-sites.
 * ─ The test below pins the behaviour so a future dependency upgrade doesn't
 *   silently change class resolution.
 */
import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (Tailwind class merger)', () => {
  it('returns an empty string when called with no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns a single class name unchanged', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('joins multiple class names with a space', () => {
    expect(cn('flex', 'items-center', 'gap-2')).toBe('flex items-center gap-2');
  });

  it('omits falsy values (false, null, undefined, 0, empty string)', () => {
    expect(cn('block', false, null, undefined, 0 as never, '', 'mt-4')).toBe('block mt-4');
  });

  it('supports conditional class objects (clsx behaviour)', () => {
    const active = true;
    const disabled = false;
    expect(cn({ 'bg-blue-500': active, 'opacity-50': disabled })).toBe('bg-blue-500');
  });

  it('resolves Tailwind conflicts — last relevant class wins (tailwind-merge behaviour)', () => {
    // Both `p-2` and `p-4` target the `padding` property; tailwind-merge
    // drops the earlier one so the stylesheet specificity stays predictable.
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('merges conditional and unconditional classes together', () => {
    const isLarge = true;
    expect(cn('font-medium', isLarge && 'text-lg')).toBe('font-medium text-lg');
  });

  it('accepts array inputs (clsx behaviour)', () => {
    expect(cn(['flex', 'gap-4'], 'items-start')).toBe('flex gap-4 items-start');
  });

  it('handles nested arrays', () => {
    expect(cn(['font-bold', ['text-sm', 'leading-tight']])).toBe(
      'font-bold text-sm leading-tight',
    );
  });

  it('deduplicates identical class names via tailwind-merge', () => {
    // tailwind-merge collapses exact duplicates to a single occurrence.
    expect(cn('flex', 'flex')).toBe('flex');
  });
});
