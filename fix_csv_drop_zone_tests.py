import re

with open('src/components/csv-upload/__tests__/CsvDropZone.test.tsx', 'r') as f:
    content = f.read()

# Since the label no longer has role="button", we need to update the tests.
# The tests are querying for: screen.getByRole('button', { name: /upload csv file/i })
# Now the label has aria-label="Upload CSV file. Drag and drop or click to browse."
# But no role. A label's accessible name is not queryable by role="button".
# We can find it by text or label.
# Because it's a label for the input, the input has the accessible name of the label (or its aria-label).
# Let's change `screen.getByRole('button', { name: /upload csv file/i })`
# to `screen.getByLabelText(/upload csv file/i)` which will return the input, but we might want the label.
# Wait, let's look at what the test does. It calls fireEvent on the `zone` which is the label.
# We can get the label via `screen.getByText('Drag & drop your CSV here').closest('label')`.
# Actually, the drop zone wrapper has the label text.
# Let's see if we can use `screen.getByLabelText(/Drag and drop or click to browse/i)` ?
# The label has `aria-label="Upload CSV file. Drag and drop or click to browse."`
# `screen.getByLabelText` gets the element associated with the label, which is the input!
# So `zone` was the label itself. We can get it via `document.querySelector('label')` or add a test id.
# Let's just use `document.querySelector('.csv-drop-zone')`.

content = content.replace("screen.getByRole('button', { name: /upload csv file/i })", "document.querySelector('.csv-drop-zone') as HTMLElement")
content = content.replace("const zone = screen.getByRole('button'", "const zone = document.querySelector('.csv-drop-zone') as HTMLElement //")

with open('src/components/csv-upload/__tests__/CsvDropZone.test.tsx', 'w') as f:
    f.write(content)
