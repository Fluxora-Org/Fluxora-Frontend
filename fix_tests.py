import re

with open('src/components/csv-upload/__tests__/CsvDropZone.test.tsx', 'r') as f:
    content = f.read()

# Add toHaveNoViolations matcher import
content = content.replace("import { axe } from 'vitest-axe';", "import { axe } from 'vitest-axe';\nimport { toHaveNoViolations } from 'vitest-axe/matchers';\n\nexpect.extend({ toHaveNoViolations });")

with open('src/components/csv-upload/__tests__/CsvDropZone.test.tsx', 'w') as f:
    f.write(content)
