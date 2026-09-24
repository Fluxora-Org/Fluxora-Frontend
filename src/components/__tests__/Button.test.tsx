import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { contrastRatio } from '../../theme/contrastUtils';
import Button from '../Button';

describe('Button component', () => {
  describe('Variants', () => {
    it('renders primary variant by default', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button.className).toContain('buttonPrimary');
    });

    it.each([
      ['primary', 'buttonPrimary'],
      ['secondary', 'buttonSecondary'],
      ['danger', 'buttonDanger'],
      ['success', 'buttonSuccess'],
      ['ghost', 'buttonGhost'],
    ] as const)('renders %s variant correctly', (variant, expectedClass) => {
      render(<Button variant={variant}>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button.className).toContain(expectedClass);
    });
  });

  describe('Disabled state', () => {
    it('renders with disabled attribute and suppresses click', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>);

      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');

      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Loading state', () => {
    it('renders aria-busy, prevents click, and shows spinner', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button loading onClick={handleClick}>Loading...</Button>);

      const button = screen.getByRole('button'); // Name might not match due to spinner replacing content, depends on implementation

      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toBeDisabled();

      // Look for spinner by checking for SVG or hidden attribute
      const spinner = button.querySelector('span[aria-hidden="true"] > svg');
      expect(spinner).toBeInTheDocument();

      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('renders custom loading content', () => {
      render(<Button loading loadingContent="Please wait">Loading...</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Please wait');
      expect(button).not.toHaveTextContent('Loading...');
    });
  });

  describe('Click handling', () => {
    it('invokes click handler exactly once when enabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Default button type', () => {
    it('defaults to type="button"', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toHaveAttribute('type', 'button');
    });

    it('allows overriding the type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button', { name: /submit/i });
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Accessibility attribute forwarding', () => {
    it('forwards arbitrary accessibility props to the button element', () => {
      render(
        <Button aria-label="Save changes" aria-describedby="hint">
          Save
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Save changes');
      expect(button).toHaveAttribute('aria-describedby', 'hint');
    });

    it('sets aria-hidden="true" on icon element when text is present', () => {
      const icon = <svg data-testid="icon" />;
      render(<Button icon={icon}>With Icon</Button>);
      const iconContainer = screen.getByTestId('icon').parentElement;
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });

    it('removes aria-hidden on icon when iconOnly is true', () => {
      const icon = <svg data-testid="icon" />;
      render(<Button icon={icon} iconOnly aria-label="Action" />);
      const iconContainer = screen.getByTestId('icon').parentElement;
      expect(iconContainer).not.toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Contrast requirements', () => {
    const withAlpha = (hex: string, alpha: number) => {
      const normalized = alpha * 255;
      return `${hex}${Math.round(normalized).toString(16).padStart(2, '0')}`;
    };

    const cases = [
      { theme: 'light', state: 'default', variant: 'primary', fg: '#ffffff', bg: '#006f7a' },
      { theme: 'dark', state: 'default', variant: 'primary', fg: '#ffffff', bg: '#006f7a' },
      { theme: 'light', state: 'hover', variant: 'primary', fg: '#ffffff', bg: '#00515c' },
      { theme: 'dark', state: 'hover', variant: 'primary', fg: '#ffffff', bg: '#00515c' },

      { theme: 'light', state: 'default', variant: 'secondary', fg: '#1a1f36', bg: '#e8ecf1' },
      { theme: 'dark', state: 'default', variant: 'secondary', fg: '#e8ecf4', bg: '#192436' },
      { theme: 'light', state: 'hover', variant: 'secondary', fg: '#1a1f36', bg: '#dfe5ed' },
      { theme: 'dark', state: 'hover', variant: 'secondary', fg: '#e8ecf4', bg: '#1e2c40' },

      { theme: 'light', state: 'default', variant: 'danger', fg: '#ffffff', bg: '#bb2124' },
      { theme: 'dark', state: 'default', variant: 'danger', fg: '#ffffff', bg: '#bb2124' },
      { theme: 'light', state: 'hover', variant: 'danger', fg: '#ffffff', bg: '#8f1d1d' },
      { theme: 'dark', state: 'hover', variant: 'danger', fg: '#ffffff', bg: '#8f1d1d' },

      { theme: 'light', state: 'default', variant: 'success', fg: '#ffffff', bg: '#047857' },
      { theme: 'dark', state: 'default', variant: 'success', fg: '#ffffff', bg: '#047857' },
      { theme: 'light', state: 'hover', variant: 'success', fg: '#ffffff', bg: '#065f46' },
      { theme: 'dark', state: 'hover', variant: 'success', fg: '#ffffff', bg: '#065f46' },

      { theme: 'light', state: 'default', variant: 'ghost', fg: '#1a1f36', bg: '#ffffff' },
      { theme: 'dark', state: 'default', variant: 'ghost', fg: '#e8ecf4', bg: '#0a0e17' },
      { theme: 'light', state: 'hover', variant: 'ghost', fg: '#1a1f36', bg: '#dfe5ed' },
      { theme: 'dark', state: 'hover', variant: 'ghost', fg: '#e8ecf4', bg: '#1e2c40' },

      { theme: 'light', state: 'disabled', variant: 'primary', fg: withAlpha('#1a1f36', 0.72), bg: '#e8ecf1' },
      { theme: 'dark', state: 'disabled', variant: 'primary', fg: withAlpha('#e8ecf4', 0.72), bg: '#192436' },
    ] as const;

    it.each(cases)('$theme $state $variant meets WCAG AA against its effective background', ({ fg, bg }) => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Focus visible state', () => {
    it('receives focus when tabbed to (keyboard accessibility)', async () => {
      const user = userEvent.setup();
      render(<Button>Focus target</Button>);

      const button = screen.getByRole('button', { name: /focus target/i });

      await user.tab();
      expect(button).toHaveFocus();
    });
  });
});
