/* Copyright (c) 2026 nohuto */
type Token =
  | { type: 'number'; value: number }
  | { type: 'name' | 'op' | 'paren' | 'comma'; value: string };

interface BinaryOp {
  precedence: number;
  assoc: 'left' | 'right';
  fn: (a: number, b: number) => number;
}

const constants: Readonly<Record<string, number>> = Object.freeze({
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
});
const functions: Readonly<Record<string, (...values: number[]) => number>> =
  Object.freeze({
    abs: Math.abs,
    acos: Math.acos,
    asin: Math.asin,
    atan: Math.atan,
    ceil: Math.ceil,
    cos: Math.cos,
    floor: Math.floor,
    ln: Math.log,
    log: Math.log10,
    max: Math.max,
    min: Math.min,
    pow: Math.pow,
    round: Math.round,
    sin: Math.sin,
    sqrt: Math.sqrt,
    tan: Math.tan,
  });
const binaryOps: Readonly<Record<string, BinaryOp>> = Object.freeze({
  '+': { precedence: 1, assoc: 'left', fn: (a, b) => a + b },
  '-': { precedence: 1, assoc: 'left', fn: (a, b) => a - b },
  '*': { precedence: 2, assoc: 'left', fn: (a, b) => a * b },
  '/': {
    precedence: 2,
    assoc: 'left',
    fn: (a, b) => {
      if (b === 0) throw new Error('division by zero');
      return a / b;
    },
  },
  '%': {
    precedence: 2,
    assoc: 'left',
    fn: (a, b) => {
      if (b === 0) throw new Error('modulo by zero');
      return a % b;
    },
  },
  '^': { precedence: 4, assoc: 'right', fn: (a, b) => a ** b },
});
const previewOps = new Set(['+', '*', '/', '%', '^', '!']);
const normalizers: Readonly<Record<string, string>> = Object.freeze({
  '\u00f7': '/',
  '\u2212': '-',
  '\u221a': 'sqrt',
  '\u03c0': 'pi',
});

const normalizeExpression = (value: string) =>
  String(value || '')
    .replace(/[\u00f7\u2212\u221a\u03c0]/g, (char) => normalizers[char] || char)
    .replace(/\s+/g, '');

const factorial = (value: number) => {
  if (!Number.isInteger(value) || value < 0 || value > 170) {
    throw new Error('factorial supports integers from 0 to 170');
  }
  let result = 1;
  for (let i = 2; i <= value; i += 1) result *= i;
  return result;
};

export const formatNumber = (value: number) => {
  const number = Object.is(value, -0) ? 0 : value;
  if (!Number.isFinite(number)) throw new Error('result is not finite');
  const abs = Math.abs(number);
  const text =
    abs >= 1e12 || (abs > 0 && abs < 1e-9)
      ? number.toExponential(10)
      : Number(number.toPrecision(14)).toString();
  return text.replace(/(\.\d*?)0+(e|$)/, '$1$2').replace(/\.(e|$)/, '$1');
};

const readNumber = (source: string, start: number) => {
  if (source.startsWith('0x', start) || source.startsWith('0X', start)) {
    let index = start + 2;
    while (/[0-9a-f]/i.test(source[index] || '')) index += 1;
    if (index === start + 2) throw new Error('invalid hex number');
    return {
      value: Number.parseInt(source.slice(start + 2, index), 16),
      index,
    };
  }
  if (source.startsWith('0b', start) || source.startsWith('0B', start)) {
    let index = start + 2;
    while (/[01]/.test(source[index] || '')) index += 1;
    if (index === start + 2) throw new Error('invalid binary number');
    return {
      value: Number.parseInt(source.slice(start + 2, index), 2),
      index,
    };
  }
  const match = source
    .slice(start)
    .match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
  if (!match) throw new Error('invalid number');
  return { value: Number(match[0]), index: start + match[0].length };
};

const tokenize = (source: string) => {
  const rawTokens: Token[] = [];
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (/\d|\./.test(char)) {
      const number = readNumber(source, index);
      rawTokens.push({ type: 'number', value: number.value });
      index = number.index;
      continue;
    }
    if (/[a-z_]/i.test(char)) {
      let end = index + 1;
      while (/[a-z0-9_]/i.test(source[end] || '')) end += 1;
      rawTokens.push({
        type: 'name',
        value: source.slice(index, end).toLowerCase(),
      });
      index = end;
      continue;
    }
    if ('+-*/%^!(),'.includes(char)) {
      rawTokens.push({
        type:
          char === '(' || char === ')'
            ? 'paren'
            : char === ','
              ? 'comma'
              : 'op',
        value: char,
      });
      index += 1;
      continue;
    }
    throw new Error(`unexpected token: ${char}`);
  }
  const tokens: Token[] = [];
  const endsValue = (token: Token | undefined) =>
    token &&
    (token.type === 'number' ||
      token.type === 'name' ||
      token.value === ')' ||
      token.value === '!');
  const startsValue = (token: Token) =>
    token &&
    (token.type === 'number' || token.type === 'name' || token.value === '(');
  rawTokens.forEach((token) => {
    const previous = tokens[tokens.length - 1];
    const isFunctionCall =
      previous?.type === 'name' &&
      functions[previous.value] &&
      token.value === '(';
    if (endsValue(previous) && startsValue(token) && !isFunctionCall) {
      tokens.push({ type: 'op', value: '*' });
    }
    tokens.push(token);
  });
  return tokens;
};

export const shouldPreviewExpression = (source: string) => {
  let tokens: Token[];
  try {
    tokens = tokenize(normalizeExpression(source));
  } catch {
    return false;
  }
  return tokens.some((token, index) => {
    if (token.type === 'comma') return true;
    if (token.type === 'op' && previewOps.has(token.value)) return true;
    if (token.type === 'op' && token.value === '-' && index > 0) return true;
    if (
      token.type === 'name' &&
      functions[token.value] &&
      tokens[index + 1]?.value === '('
    )
      return true;
    return false;
  });
};

export const evaluateExpression = (source: string, lastAnswer: number) => {
  const tokens = tokenize(normalizeExpression(source));
  let position = 0;
  const peek = () => tokens[position];
  const consume = () => tokens[position++];
  const peekOp = () => {
    const token = peek();
    return token?.type === 'op' ? binaryOps[token.value] : undefined;
  };

  const parseExpression = (minPrecedence = 0): number => {
    let left = parseUnary();
    let op = peekOp();
    while (op && op.precedence >= minPrecedence) {
      consume();
      const right = parseExpression(
        op.precedence + (op.assoc === 'left' ? 1 : 0),
      );
      left = op.fn(left, right);
      op = peekOp();
    }
    return left;
  };

  const parseUnary = (): number => {
    const token = peek();
    if (token?.type === 'op' && token.value === '+') {
      consume();
      return parseUnary();
    }
    if (token?.type === 'op' && token.value === '-') {
      consume();
      return -parseExpression(3);
    }
    let value = parsePrimary();
    while (peek()?.type === 'op' && peek().value === '!') {
      consume();
      value = factorial(value);
    }
    return value;
  };

  const readArguments = () => {
    const args: number[] = [];
    if (peek()?.value === ')') {
      consume();
      return args;
    }
    for (;;) {
      args.push(parseExpression());
      const next = peek();
      if (next?.type === 'comma') {
        consume();
        continue;
      }
      if (next?.value !== ')') throw new Error('missing closing parenthesis');
      consume();
      return args;
    }
  };

  const parsePrimary = (): number => {
    const token = consume();
    if (!token) throw new Error('empty expression');
    if (token.type === 'number') return token.value;
    if (token.type === 'name') {
      if (token.value === 'ans') return lastAnswer;
      if (constants[token.value] !== undefined) return constants[token.value];
      const fn = functions[token.value];
      if (!fn) throw new Error(`unknown function: ${token.value}`);
      if (consume()?.value !== '(')
        throw new Error(`missing arguments for ${token.value}`);
      return fn(...readArguments());
    }
    if (token.value === '(') {
      const value = parseExpression();
      if (consume()?.value !== ')')
        throw new Error('missing closing parenthesis');
      return value;
    }
    throw new Error(`unexpected token: ${token.value}`);
  };

  const result = parseExpression();
  if (position < tokens.length)
    throw new Error(`unexpected token: ${tokens[position].value}`);
  if (!Number.isFinite(result)) throw new Error('result is not finite');
  return result;
};
