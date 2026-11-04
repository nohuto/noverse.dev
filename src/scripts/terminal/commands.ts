const aliases: Readonly<Record<string, string>> = Object.freeze({
  h: 'help',
  '?': 'help',
  usage: 'help',
  cmds: 'help',
  commands: 'help',
  cls: 'clear',
  dir: 'ls',
  ll: 'ls',
  la: 'ls',
  cprod: 'cd product',
  cproj: 'cd projects',
  cdiff: 'cd diff',
  cpolicies: 'cd policies',
  cdocs: 'cd docs',
  cabout: 'about',
  calculator: 'calc',
  quit: 'exit',
  '..': 'cd ..',
});
const aliasNames = Object.keys(aliases).sort((a, b) => a.localeCompare(b));

const expandAlias = (input: string) => {
  const parts = input.trim().split(/\s+/);
  const key = parts[0];
  const expansion = Object.hasOwn(aliases, key) ? aliases[key] : undefined;
  if (!expansion) return input;
  const rest = parts.slice(1).join(' ');
  return rest ? `${expansion} ${rest}` : expansion;
};

export const parseCommand = (input: string) => {
  const [head = '', ...args] = expandAlias(input).split(' ').filter(Boolean);
  return { command: head.toLowerCase(), args };
};

export const completeCommand = (
  raw: string,
  sources: {
    dirs: readonly string[];
    commandNames: readonly string[];
    themeNames: readonly string[];
    backgroundNames: readonly string[];
  },
) => {
  if (!raw) return '';
  const hasTrailingSpace = /\s$/.test(raw);
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const head = parts[0];
  if (head === 'cd') {
    const cdMatch = raw.match(/^cd\s+(.+)$/);
    if (!cdMatch) return '';
    const seed = cdMatch[1];
    if (!seed) return '';
    const useBackslash = seed.startsWith('.\\');
    const options = sources.dirs.map((option) =>
      useBackslash ? option.replace(/\//g, '\\') : option,
    );
    const match = options.find((option) => option.startsWith(seed));
    return match ? `cd ${match}` : '';
  }
  if (
    (head === 'theme' || head === 'bg') &&
    (parts.length > 1 || hasTrailingSpace)
  ) {
    const seed = parts.length > 1 ? parts.slice(1).join(' ') : '';
    const options =
      head === 'theme' ? sources.themeNames : sources.backgroundNames;
    const match = options.find((option) => option.startsWith(seed));
    return match ? `${head} ${match}` : '';
  }
  if (parts.length > 1) return '';
  const commandMatch = sources.commandNames.find((option) =>
    option.startsWith(head),
  );
  if (commandMatch) return commandMatch;
  return aliasNames.find((option) => option.startsWith(head)) || '';
};
