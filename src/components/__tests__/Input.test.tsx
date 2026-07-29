import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import Input from '../Input';

// Arbitrary for non-empty strings that are valid HTML ids (no spaces)
const idArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9-_]{0,19}$/);
const labelArb = fc.string({ minLength: 1, maxLength: 50 });
const messageArb = fc.string({ minLength: 1, maxLength: 100 });

describe('Input Component Properties', () => {
  it('label htmlFor and input id both equal the id prop when provided', () => {
    fc.assert(
      fc.property(idArb, labelArb, (id, label) => {
        const { container, unmount } = render(<Input id={id} label={label} />);
        const labelEl = container.querySelector('label');
        const input = container.querySelector('input');
        expect(labelEl).not.toBeNull();
        expect(input).not.toBeNull();
        expect(labelEl!.getAttribute('for')).toBe(id);
        expect(input!.getAttribute('id')).toBe(id);
        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('input aria-describedby equals the error message element id when error is set', () => {
    fc.assert(
      fc.property(labelArb, messageArb, (label, error) => {
        const { container, unmount } = render(<Input label={label} error={error} />);
        const input = container.querySelector('input');
        expect(input).not.toBeNull();
        
        const describedBy = input!.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        
        // CSS Modules make the class name dynamic, so we select by ID
        const errorEl = container.querySelector(`[id="${describedBy}"]`);
        expect(errorEl).not.toBeNull();
        expect(errorEl!.textContent).toContain(error);
        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('input aria-describedby equals the helper message element id when helperText is set and no error', () => {
    fc.assert(
      fc.property(labelArb, messageArb, (label, helperText) => {
        const { container, unmount } = render(<Input label={label} helperText={helperText} />);
        const input = container.querySelector('input');
        expect(input).not.toBeNull();
        
        const describedBy = input!.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        
        const helperEl = container.querySelector(`[id="${describedBy}"]`);
        expect(helperEl).not.toBeNull();
        expect(helperEl!.textContent).toContain(helperText);
        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('label htmlFor matches input id when no id prop is passed', () => {
    const { container } = render(<Input label="Test Label" />);
    const labelEl = container.querySelector('label');
    const input = container.querySelector('input');
    
    expect(labelEl).not.toBeNull();
    expect(input).not.toBeNull();
    
    const labelFor = labelEl!.getAttribute('for');
    const inputId = input!.getAttribute('id');
    
    expect(labelFor).toBeTruthy();
    expect(inputId).toBeTruthy();
    expect(labelFor).toBe(inputId);
  });

  it('generated id is stable across re-renders when no id prop is passed', () => {
    const { container, rerender } = render(<Input label="Test Label" />);
    const labelEl = container.querySelector('label');
    const input = container.querySelector('input');
    
    expect(labelEl).not.toBeNull();
    expect(input).not.toBeNull();
    
    const initialFor = labelEl!.getAttribute('for');
    const initialId = input!.getAttribute('id');
    
    expect(initialFor).toBeTruthy();
    expect(initialId).toBeTruthy();
    expect(initialFor).toBe(initialId);
    
    // Force a re-render by passing new props
    rerender(<Input label="Test Label Updated" />);
    
    const labelElAfter = container.querySelector('label');
    const inputAfter = container.querySelector('input');
    
    expect(labelElAfter!.getAttribute('for')).toBe(initialFor);
    expect(inputAfter!.getAttribute('id')).toBe(initialId);
  });
});

describe('Input Validation ARIA attributes', () => {
  it('updates aria-invalid and aria-describedby when error is shown and cleared', () => {
    const { rerender } = render(
      <Input id="test-input" label="Test Input" />,
    );

    const input = screen.getByLabelText("Test Input");

    // Initial state: no error, no helper. `aria-describedby` is omitted from
    // the rendered DOM when undefined, so getAttribute returns null — assert
    // null (the DOM contract), not undefined (the JS-level contract).
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();

    // Show error
    rerender(
      <Input id="test-input" label="Test Input" error="This field is required" />,
    );

    // Error state
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    const alert = screen.getByRole("alert");
    expect(alert).not.toBeNull();
    expect(alert.getAttribute("id")).toBe(describedBy);
    expect(alert.textContent).toBe("This field is required");

    // Clear error
    rerender(<Input id="test-input" label="Test Input" />);

    // Cleared state
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("maintains helperText association when error is toggled", () => {
    const { rerender } = render(
      <Input id="test-input" label="Test Input" helperText="Helper text here" />,
    );

    const input = screen.getByLabelText("Test Input");

    // Initial state: hint only.
    expect(input.getAttribute("aria-invalid")).toBe("false");
    const hintDescribedBy = input.getAttribute("aria-describedby");
    expect(hintDescribedBy).toBeTruthy();    // Show error
    rerender(
      <Input
        id="test-input"
        label="Test Input"
        helperText="Helper text here"
        error="Now has error"
      />,
    );

    // Error state: the alert id must be referenced by aria-describedby.
    // We assert via membership rather than `.toBe(...)` so the test stays
    // robust against future described-by additions (e.g. a character
    // counter or a requirement hint appended to the listed ids).
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const errorDescribedBy = input.getAttribute("aria-describedby");
    expect(errorDescribedBy).toBeTruthy();
    expect(errorDescribedBy).not.toBe(hintDescribedBy);

    const alert = screen.getByRole("alert");
    expect(errorDescribedBy!.split(/\s+/)).toContain(alert.getAttribute("id"));

    // Clear error
    rerender(
      <Input id="test-input" label="Test Input" helperText="Helper text here" />,
    );

    // Back to hint only
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(input.getAttribute("aria-describedby")).toBe(hintDescribedBy);
  });
});
