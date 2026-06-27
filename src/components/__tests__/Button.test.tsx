import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
});
