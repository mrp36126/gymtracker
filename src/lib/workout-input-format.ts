export function formatDurationFromDigits(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 4);
  const padded = digits.padStart(4, '0');
  const minutes = padded.slice(0, 2);
  const seconds = padded.slice(2, 4);

  return `${minutes}:${seconds}`;
}

export function sanitizeDistanceInput(input: string): string {
  let output = '';
  let hasDot = false;

  for (const char of input) {
    if (char >= '0' && char <= '9') {
      output += char;
      continue;
    }

    if (char === '.' && !hasDot) {
      output += char;
      hasDot = true;
    }
  }

  return output;
}
