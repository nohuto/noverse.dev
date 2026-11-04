interface Literal {
  kind: 'lineComment' | 'blockComment' | 'string' | 'char';
  end: number;
  closed: boolean;
}

export const literalAt = (source: string, index: number): Literal | null => {
  const char = source[index];
  const next = source[index + 1];
  if (char === '/' && next === '*') {
    const close = source.indexOf('*/', index + 2);
    return close < 0
      ? { kind: 'blockComment', end: source.length, closed: false }
      : { kind: 'blockComment', end: close + 2, closed: true };
  }
  if (char === '/' && next === '/') {
    const close = source.indexOf('\n', index + 2);
    return close < 0
      ? { kind: 'lineComment', end: source.length, closed: false }
      : { kind: 'lineComment', end: close + 1, closed: true };
  }
  if (char !== '"' && char !== "'") return null;
  const kind = char === '"' ? 'string' : 'char';
  for (let i = index + 1; i < source.length; i += 1) {
    if (source[i] === '\\') i += 1;
    else if (source[i] === char) return { kind, end: i + 1, closed: true };
  }
  return { kind, end: source.length, closed: false };
};
