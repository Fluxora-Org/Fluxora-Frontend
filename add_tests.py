import re

with open('src/components/csv-upload/__tests__/CsvDropZone.test.tsx', 'r') as f:
    content = f.read()

# Import userEvent and axe
imports = """import { axe } from 'vitest-axe';
import userEvent from '@testing-library/user-event';
"""

content = content.replace("import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';",
                          "import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';\n" + imports)

# Add accessibility tests
accessibility_tests = """
describe('CsvDropZone — Accessibility', () => {
  let onParsed: any;

  beforeEach(() => {
    onParsed = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has no axe violations on initial render', async () => {
    const { container } = render(<CsvDropZone onParsed={onParsed} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('every interactive element is reachable by Tab in a sensible order', async () => {
    const user = userEvent.setup();
    render(<CsvDropZone onParsed={onParsed} />);

    // Body gets initial focus
    expect(document.body).toHaveFocus();

    // Tab 1: Drop Zone
    await user.tab();
    const dropZone = screen.getByRole('button', { name: /upload csv file/i });
    expect(dropZone).toHaveFocus();

    // Tab 2: Download CSV template button
    await user.tab();
    const downloadButton = screen.getByRole('button', { name: /download csv template/i });
    expect(downloadButton).toHaveFocus();

    // Tab 3: loops back or moves outside (depending on document scope), but we care about the order here
  });

  it('any state change that matters is announced via aria-live', async () => {
    render(<CsvDropZone onParsed={onParsed} />);
    const zone = screen.getByRole('button', { name: /upload csv file/i });
    const liveRegion = document.getElementById('csv-upload-status');

    expect(liveRegion).toHaveTextContent('');

    // Drag over
    fireEvent.dragOver(zone);
    expect(liveRegion).toHaveTextContent('Drop to upload');

    // Parse error
    const badFile = makeFile('not a csv', 'notes.pdf', 'application/pdf');
    fireEvent.drop(zone, { dataTransfer: { files: [badFile] } });

    await waitFor(() => {
      expect(liveRegion).toHaveTextContent('Only .csv files are accepted.');
    });
  });
});
"""

content = content + accessibility_tests

with open('src/components/csv-upload/__tests__/CsvDropZone.test.tsx', 'w') as f:
    f.write(content)
