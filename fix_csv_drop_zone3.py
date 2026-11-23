import re

with open('src/components/csv-upload/CsvDropZone.tsx', 'r') as f:
    content = f.read()

# Since tabIndex={0} on a label with a file input can cause nested interactive elements,
# let's modify the markup to avoid axe violations:
# `<input>` is naturally focusable and gets tabIndex={0} by default.
# But it has `sr-only` class.
# So if we put tabIndex={-1} on the `<input>` and keep the label focusable, we might avoid the nested issue.
# The axe rule says: "Interactive controls must not be nested" (label is interactive with htmlFor, and it contains an input which is also interactive).
# To fix this, we can move the input OUTSIDE of the label.
# <label htmlFor="csv-file-input"> ... </label> <input id="csv-file-input" />
# This is a common pattern to avoid nested interactive elements while still associating them.

content = content.replace('{/* Visually hidden file input */}', '</label>\n\n        {/* Visually hidden file input */}')
content = content.replace('        />\n      </label>', '        />')

# The `onDragOver`, `onDragLeave`, `onDrop` events can stay on the label since it's the visible drop zone.
# Also restore `role="button"` on the label if we want, but wait, `<label>` with role="button" is invalid HTML ARIA,
# "ARIA role button is not allowed for given element" -> you cannot give `<label>` a `role="button"`.
# The best way is to keep it as a label and remove `role="button"`.
# So we removed `role="button"` earlier, which is good.

with open('src/components/csv-upload/CsvDropZone.tsx', 'w') as f:
    f.write(content)
