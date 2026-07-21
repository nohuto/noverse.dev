import { readFile, writeFile } from 'node:fs/promises';
import { parse, serialize } from 'parse5';

const pairs = process.argv.slice(2);
if (!pairs.length || pairs.length % 2) {
  throw new Error('Expected input/output path pairs');
}

const blockElements = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'details', 'dialog', 'div', 'dl', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header',
  'hgroup', 'hr', 'html', 'li', 'main', 'menu', 'nav', 'ol', 'p', 'section', 'table', 'tbody', 'td',
  'tfoot', 'th', 'thead', 'tr', 'ul'
]);
const preserveWhitespace = new Set(['pre', 'script', 'style', 'textarea']);
const isBoundary = node => !node || node.nodeName === '#documentType' || blockElements.has(node.tagName);

function compact(node, preserve = false) {
  if (!node.childNodes) return;
  const keepWhitespace = preserve || preserveWhitespace.has(node.tagName);
  node.childNodes = node.childNodes.filter(child => child.nodeName !== '#comment');

  for (const child of node.childNodes) compact(child, keepWhitespace);
  if (keepWhitespace) return;

  node.childNodes.forEach((child, index, children) => {
    if (child.nodeName !== '#text') return;
    let value = child.value.replace(/\s+/g, ' ');
    if (isBoundary(children[index - 1])) value = value.trimStart();
    if (isBoundary(children[index + 1])) value = value.trimEnd();
    child.value = value;
  });
  node.childNodes = node.childNodes.filter(child => child.nodeName !== '#text' || child.value);
}

for (let index = 0; index < pairs.length; index += 2) {
  const document = parse(await readFile(pairs[index], 'utf8'));
  compact(document);
  const html = serialize(document)
    .replace(/ (allowfullscreen|async|autofocus|autoplay|checked|controls|default|defer|disabled|formnovalidate|hidden|inert|loop|multiple|muted|nomodule|novalidate|open|playsinline|readonly|required|reversed|selected)=""/g, ' $1')
    .trim();
  await writeFile(pairs[index + 1], html);
}
