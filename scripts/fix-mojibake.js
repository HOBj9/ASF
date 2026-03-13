const fs = require('fs');
const path = require('path');

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error('Usage: node scripts/fix-mojibake.js <file> [more files]');
  process.exit(1);
}

const suspiciousPattern = /[\u00d8\u00d9\u00c3\u00c2\u00e2]/;
const arabicPattern = /[\u0600-\u06ff]/;

function suspiciousCount(value) {
  return Array.from(value).reduce((count, ch) => (
    suspiciousPattern.test(ch) ? count + 1 : count
  ), 0);
}

function decodeLatin1Utf8(value) {
  return Buffer.from(value, 'latin1').toString('utf8');
}

function repairLiteralValue(value) {
  if (!suspiciousPattern.test(value)) return value;

  let current = value;
  let best = value;
  let bestScore = suspiciousCount(value);

  for (let i = 0; i < 4; i += 1) {
    const decoded = decodeLatin1Utf8(current);
    if (decoded === current) break;

    const score = suspiciousCount(decoded);
    if (
      score < bestScore ||
      (score === 0 && arabicPattern.test(decoded))
    ) {
      best = decoded;
      bestScore = score;
    }

    current = decoded;
  }

  return best;
}

function transformQuotedStrings(source) {
  let output = '';
  let index = 0;
  let changed = false;

  while (index < source.length) {
    const ch = source[index];

    if (ch !== '"' && ch !== '\'' && ch !== '`') {
      output += ch;
      index += 1;
      continue;
    }

    const quote = ch;
    output += quote;
    index += 1;

    let literalValue = '';

    while (index < source.length) {
      const current = source[index];

      if (current === '\\') {
        literalValue += current;
        if (index + 1 < source.length) {
          literalValue += source[index + 1];
          index += 2;
          continue;
        }
      }

      if (current === quote) break;

      literalValue += current;
      index += 1;
    }

    const repairedValue = repairLiteralValue(literalValue);
    if (repairedValue !== literalValue) changed = true;

    output += repairedValue;

    if (index < source.length && source[index] === quote) {
      output += quote;
      index += 1;
    }
  }

  return { output, changed };
}

for (const file of files) {
  const fullPath = path.resolve(file);
  const source = fs.readFileSync(fullPath, 'utf8');
  const { output, changed } = transformQuotedStrings(source);

  if (changed && output !== source) {
    fs.writeFileSync(fullPath, output, 'utf8');
    console.log(`updated ${file}`);
  }
}
