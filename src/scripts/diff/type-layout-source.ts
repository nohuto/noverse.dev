/* Copyright (c) 2026 nohuto */
import { createSource } from './source';

const expectedTypeNames = (typeName: string) => {
  const names = new Set([typeName]);
  if (typeName.startsWith('-')) {
    const unnamed = typeName
      .replace(/^-/, '')
      .replace(/_\d+$/i, '')
      .replace(/-$/, '');
    if (unnamed) names.add(`<${unnamed}>`);
  }
  return names;
};

const findBlockEnd = (source: string, openIndex: number) => {
  let depth = 0;
  let state = 'code';
  let escape = false;
  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1] || '';
    if (state === 'code') {
      if (char === '/' && next === '*') {
        state = 'block';
        i += 1;
      } else if (char === '/' && next === '/') {
        state = 'line';
        i += 1;
      } else if (char === '"') {
        state = 'string';
        escape = false;
      } else if (char === "'") {
        state = 'char';
        escape = false;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          let end = i + 1;
          while (/[ \t]/.test(source[end] || '')) end += 1;
          if (source[end] === ';') end += 1;
          if (source[end] === '\n') end += 1;
          return end;
        }
      }
    } else if (state === 'block' && char === '*' && next === '/') {
      state = 'code';
      i += 1;
    } else if (state === 'line' && char === '\n') {
      state = 'code';
    } else if (state === 'string' || state === 'char') {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (
        (state === 'string' && char === '"') ||
        (state === 'char' && char === "'")
      )
        state = 'code';
    }
  }
  return source.length;
};

const extractPrimaryLayout = (text: string, typeName: string) => {
  const declaration =
    /^(struct|union|enum)\s+([^\s/{]+|<[^>]+>)(?=\s|\/|\{|$)/gm;
  const wanted = expectedTypeNames(typeName);
  const blocks: { name: string; start: number; end: number }[] = [];
  let match;
  while ((match = declaration.exec(text))) {
    const openIndex = text.indexOf('{', declaration.lastIndex);
    if (openIndex === -1) break;
    const end = findBlockEnd(text, openIndex);
    blocks.push({ name: match[2]!, start: match.index, end });
    declaration.lastIndex = end;
  }
  const selected =
    blocks.find((block) => wanted.has(block.name)) || blocks[blocks.length - 1];
  return selected
    ? `${text.slice(selected.start, selected.end).trimEnd()}\n`
    : text;
};

const stripComments = (source: string) => {
  let state = 'code';
  let escape = false;
  const output: string[] = [];
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]!;
    const next = source[i + 1] || '';
    if (state === 'code') {
      if (char === '/' && next === '/') {
        state = 'line';
        i += 1;
        continue;
      }
      if (char === '/' && next === '*') {
        state = 'block';
        i += 1;
        continue;
      }
      if (char === '"') {
        state = 'string';
        escape = false;
      } else if (char === "'") {
        state = 'char';
        escape = false;
      }
      output.push(char);
      continue;
    }
    if (state === 'line') {
      if (char === '\n') {
        while (output.length && /\s/.test(output[output.length - 1]!))
          output.pop();
        output.push('\n');
        state = 'code';
      }
      continue;
    }
    if (state === 'block') {
      if (char === '*' && next === '/') {
        state = 'code';
        i += 1;
      }
      continue;
    }
    output.push(char);
    if (escape) escape = false;
    else if (char === '\\') escape = true;
    else if (
      (state === 'string' && char === '"') ||
      (state === 'char' && char === "'")
    )
      state = 'code';
  }
  return `${output
    .join('')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`;
};

export const source = createSource({
  repository: 'nohuto/type-layouts',
  dataset: 'type-layouts',
  settingsKey: 'nv-diff-type-settings-v1',
  defaultModule: 'ntdll',
  displayName: (fileName) => fileName.replace(/\.cpp$/i, ''),
  settings: [
    { key: 'showDependencies', label: 'Show dependencies', value: false },
    { key: 'hideComments', label: 'Hide comments', value: false },
  ],
  prepare: (text, file, settings) => {
    const prepared = settings.showDependencies
      ? text
      : extractPrimaryLayout(text, file.name);
    return settings.hideComments ? stripComments(prepared) : prepared;
  },
});
