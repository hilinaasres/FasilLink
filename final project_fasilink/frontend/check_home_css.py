from pathlib import Path
text = Path('src/pages/Home.css').read_text(encoding='utf-8')
lines = text.splitlines()
for i in range(430, 451):
    if i < len(lines):
        line = lines[i]
        print(f'{i+1}: {line!r}')
        print(' codes:', [ord(ch) for ch in line])

