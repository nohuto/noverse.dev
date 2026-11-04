import { literalAt } from './scanner';
import type { Settings } from './types';

const XREF_COMMENT_RE = /\bXREFs of\b|\bCallers:|\bCallees:/;
const ADDRESS_PREFIX_RE =
  /^(qword|dword|word|byte|xmmword|ymmword|zmmword|oword|unk|loc|off|stru|sub|nullsub)_(?:0x)?[0-9A-Fa-f]{6,}$/i;
const LARGE_HEX_ADDR_RE = /^0[xX][0-9A-Fa-f]{8,}(?:[uUlL]{0,3})$/;
const AUTO_IDENTIFIER_DECLARATION_RE =
  /^(?:[_A-Za-z]\w*(?:\s+[_A-Za-z]\w*)*\s+)(?:\*+\s*)?(?:var_\d+|arg_\d+)(?:\s*\[[^\]]+\])?\s*;\s*$/;
const GENERATED_LABEL_RE = /^LABEL_(\d+)$/;
const KEYWORDS_BEFORE_PAREN = new Set([
  'if',
  'for',
  'while',
  'switch',
  'sizeof',
  'return',
  'case',
]);

const isWhitespace = (char: string) =>
  char === ' ' ||
  char === '\t' ||
  char === '\n' ||
  char === '\r' ||
  char === '\f' ||
  char === '\v';
const isIdentifierStart = (char: string) => /[A-Za-z_]/.test(char);
const isIdentifierPart = (char: string) => /[A-Za-z0-9_]/.test(char);

const parseIntegerLiteral = (token: string) => {
  const match = token.match(/^(0[xX][0-9A-Fa-f]+|\d+)([uUlL]{0,3})$/);
  if (!match) return null;
  try {
    return BigInt(match[1]);
  } catch {
    return null;
  }
};

const canonicalizeIntegerLiteral = (token: string) => {
  const parsed = parseIntegerLiteral(token);
  if (parsed === null) return token;
  return parsed.toString(10);
};

const stripXrefBlocks = (source: string) => {
  let output = '';
  for (let i = 0; i < source.length; i += 1) {
    const literal = literalAt(source, i);
    if (!literal) {
      output += source[i];
      continue;
    }
    const text = source.slice(i, literal.end);
    const isXref =
      literal.kind === 'blockComment' &&
      literal.closed &&
      XREF_COMMENT_RE.test(text);
    if (!isXref) output += text;
    i = literal.end - 1;
  }
  return output;
};

const transformCodeTokens = (source: string, settings: Settings) => {
  let output = '';
  let braceDepth = 0;
  let previousSignificant = '';

  const identifierMap = new Map<string, string>();
  let argCount = 0;
  let varCount = 0;

  let labelMap = new Map<string, string>();
  let labelCount = 0;

  const mapIdentifier = (identifier: string) => {
    if (!settings.normalizeDecompilerIdentifiers) return identifier;
    if (!/^([av])\d+$/.test(identifier)) return identifier;
    if (!identifierMap.has(identifier)) {
      if (identifier.startsWith('a')) {
        argCount += 1;
        identifierMap.set(identifier, `arg_${argCount}`);
      } else {
        varCount += 1;
        identifierMap.set(identifier, `var_${varCount}`);
      }
    }
    return identifierMap.get(identifier) || identifier;
  };

  const mapGeneratedLabel = (identifier: string) => {
    if (!settings.normalizeGeneratedLabels) return identifier;
    const match = identifier.match(GENERATED_LABEL_RE);
    if (!match) return identifier;
    if (!labelMap.has(identifier)) {
      labelCount += 1;
      labelMap.set(identifier, `LABEL_${labelCount}`);
    }
    return labelMap.get(identifier) || identifier;
  };

  for (let i = 0; i < source.length; i += 1) {
    const literal = literalAt(source, i);
    if (literal) {
      output += source.slice(i, literal.end);
      i = literal.end - 1;
      continue;
    }
    const char = source[i];
    const next = i + 1 < source.length ? source[i + 1] : '';

    if (isIdentifierStart(char)) {
      let j = i + 1;
      while (j < source.length && isIdentifierPart(source[j])) {
        j += 1;
      }
      let identifier = source.slice(i, j);

      if (
        settings.normalizeRelocationSymbols &&
        ADDRESS_PREFIX_RE.test(identifier)
      ) {
        const prefix = identifier.slice(0, identifier.indexOf('_'));
        identifier = `${prefix}_ADDR`;
      }

      identifier = mapIdentifier(identifier);
      identifier = mapGeneratedLabel(identifier);

      output += identifier;
      previousSignificant = identifier;
      i = j - 1;
      continue;
    }

    if (/\d/.test(char)) {
      let j = i;
      if (char === '0' && (next === 'x' || next === 'X')) {
        j += 2;
        while (j < source.length && /[0-9A-Fa-f]/.test(source[j])) {
          j += 1;
        }
        while (j < source.length && /[uUlL]/.test(source[j])) {
          j += 1;
        }
      } else {
        while (j < source.length && /\d/.test(source[j])) {
          j += 1;
        }
        if (j < source.length && source[j] === '.') {
          let k = j + 1;
          if (k < source.length && /\d/.test(source[k])) {
            while (k < source.length && /\d/.test(source[k])) {
              k += 1;
            }
            if (k < source.length && /[eE]/.test(source[k])) {
              k += 1;
              if (k < source.length && /[+-]/.test(source[k])) k += 1;
              while (k < source.length && /\d/.test(source[k])) {
                k += 1;
              }
            }
            output += source.slice(i, k);
            previousSignificant = source.slice(i, k);
            i = k - 1;
            continue;
          }
        }
        if (j < source.length && /[eE]/.test(source[j])) {
          let k = j + 1;
          if (k < source.length && /[+-]/.test(source[k])) k += 1;
          let hasExponentDigits = false;
          while (k < source.length && /\d/.test(source[k])) {
            hasExponentDigits = true;
            k += 1;
          }
          if (hasExponentDigits) {
            output += source.slice(i, k);
            previousSignificant = source.slice(i, k);
            i = k - 1;
            continue;
          }
        }
        while (j < source.length && /[uUlL]/.test(source[j])) {
          j += 1;
        }
      }

      const numberToken = source.slice(i, j);
      let transformedNumber = numberToken;
      if (
        settings.normalizeRelocationSymbols &&
        LARGE_HEX_ADDR_RE.test(numberToken)
      ) {
        transformedNumber = '0xADDR';
      } else if (settings.normalizeNumericNotation) {
        transformedNumber = canonicalizeIntegerLiteral(numberToken);
      }

      output += transformedNumber;
      previousSignificant = transformedNumber;
      i = j - 1;
      continue;
    }

    if (char === '{') {
      if (braceDepth === 0 && previousSignificant === ')') {
        labelMap = new Map();
        labelCount = 0;
      }
      braceDepth += 1;
      output += char;
      previousSignificant = char;
      continue;
    }

    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      output += char;
      previousSignificant = char;
      continue;
    }

    if (!isWhitespace(char)) {
      previousSignificant = char;
    }
    output += char;
  }

  return output;
};

const splitTopLevelArgs = (text: string) => {
  const args: string[] = [];
  let start = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < text.length; i += 1) {
    const literal = literalAt(text, i);
    if (literal) {
      i = literal.end - 1;
      continue;
    }
    const char = text[i];
    if (char === '(') parenDepth += 1;
    else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (char === '[') bracketDepth += 1;
    else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (char === '{') braceDepth += 1;
    else if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
    else if (
      char === ',' &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0
    ) {
      args.push(text.slice(start, i));
      start = i + 1;
    }
  }

  args.push(text.slice(start));
  return args;
};

const isDefaultPrototypeArg = (value: string) => {
  const compact = value.replace(/\s+/g, '').toLowerCase();
  if (!compact) return false;
  if (compact === '0' || compact === 'null' || compact === 'nullptr')
    return true;
  if (/^0[x]0+[uUlL]*$/.test(compact)) return true;
  if (/^0+[uUlL]+$/.test(compact)) return true;
  if (/^\(void\*\)0+$/.test(compact)) return true;
  return false;
};

const normalizePrototypeExpansionArgsPass = (
  source: string,
  settings: Settings,
) => {
  if (!settings.normalizePrototypeExpansionArgs) return source;

  let output = '';

  for (let i = 0; i < source.length; i += 1) {
    const literal = literalAt(source, i);
    if (literal) {
      output += source.slice(i, literal.end);
      i = literal.end - 1;
      continue;
    }
    const char = source[i];

    if (isIdentifierStart(char)) {
      let j = i + 1;
      while (j < source.length && isIdentifierPart(source[j])) j += 1;
      const identifier = source.slice(i, j);
      output += identifier;

      let k = j;
      while (k < source.length && /\s/.test(source[k])) {
        output += source[k];
        k += 1;
      }

      if (
        k < source.length &&
        source[k] === '(' &&
        !KEYWORDS_BEFORE_PAREN.has(identifier)
      ) {
        let depth = 1;
        let m = k + 1;
        while (m < source.length && depth > 0) {
          const literal = literalAt(source, m);
          if (literal) {
            m = literal.end;
            continue;
          }
          if (source[m] === '(') depth += 1;
          if (source[m] === ')') depth -= 1;
          m += 1;
        }

        if (depth === 0) {
          const argsText = source.slice(k + 1, m - 1);
          const args = splitTopLevelArgs(argsText);
          if (args.length >= 3) {
            let cutIndex = args.length;
            while (
              cutIndex > 0 &&
              isDefaultPrototypeArg(args[cutIndex - 1].trim())
            ) {
              cutIndex -= 1;
            }
            if (cutIndex < args.length && cutIndex > 0) {
              const kept = args
                .slice(0, cutIndex)
                .map((arg) => arg.trim())
                .join(', ');
              output += `(${kept})`;
              i = m - 1;
              continue;
            }
          }
          output += source.slice(k, m);
          i = m - 1;
          continue;
        }
      }

      i = k - 1;
      continue;
    }

    output += char;
  }

  return output;
};

const stripStorageLocationCommentsPass = (
  source: string,
  settings: Settings,
) => {
  if (!settings.stripStorageLocationComments) return source;

  return source
    .split('\n')
    .map((line) => {
      const next = line
        .replace(
          /\s*\/\/\s*\[(?:rsp|rbp|esp|ebp)[^\]]*\](?:\s*\[(?:rsp|rbp|esp|ebp)[^\]]*\])*(?:\s*BYREF)?\s*$/i,
          '',
        )
        .replace(
          /\s*\/\/\s*(?:[re]?[abcd]x|[re]?(?:si|di|sp|bp|ip)|r\d+[bwd]?|xmm\d+|ymm\d+|zmm\d+)\s*$/i,
          '',
        );
      return next;
    })
    .join('\n');
};

const stripAutoIdentifierDeclarationsPass = (
  source: string,
  settings: Settings,
) => {
  if (!settings.normalizeDecompilerIdentifiers) return source;

  const lines = source.split('\n');
  const kept: string[] = [];
  lines.forEach((line) => {
    if (AUTO_IDENTIFIER_DECLARATION_RE.test(line.trim())) {
      return;
    }
    kept.push(line);
  });
  return kept.join('\n');
};

const trimTrailingWhitespacePass = (source: string, settings: Settings) => {
  if (!settings.trimTrailingWhitespace) return source;
  return source.replace(/[ \t]+$/gm, '');
};

const finalizeText = (source: string) => {
  const compact = source.replace(/\n{3,}/g, '\n\n').trimEnd();
  return compact ? `${compact}\n` : '';
};

export const normalize = (source: string, settings: Settings) => {
  let text = source;
  if (settings.stripCrossReferenceMetadata) text = stripXrefBlocks(text);
  text = transformCodeTokens(text, settings);
  text = normalizePrototypeExpansionArgsPass(text, settings);
  text = stripStorageLocationCommentsPass(text, settings);
  text = stripAutoIdentifierDeclarationsPass(text, settings);
  text = trimTrailingWhitespacePass(text, settings);
  return finalizeText(text);
};
