import re

with open('src/components/csv-upload/CsvDropZone.tsx', 'r') as f:
    content = f.read()

# Make input tabIndex={-1} since it's visually hidden and the label gets focus instead.
content = content.replace('type="file"\n          accept=".csv,text/csv"', 'type="file"\n          tabIndex={-1}\n          accept=".csv,text/csv"')

with open('src/components/csv-upload/CsvDropZone.tsx', 'w') as f:
    f.write(content)

with open('src/components/csv-upload/__tests__/CsvDropZone.test.tsx', 'r') as f:
    content2 = f.read()

# Update test to expect input to NOT have focus since label receives it.
# Actually the test just says:
#   await user.tab();
#   const dropZone = document.querySelector('.csv-drop-zone') as HTMLElement
#   expect(dropZone).toHaveFocus();
#   await user.tab();
#   const downloadButton = screen.getByRole('button', ...
#   expect(downloadButton).toHaveFocus();
