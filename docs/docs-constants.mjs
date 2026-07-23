export const WIN_CONFIG_CATEGORIES = [
  'system',
  'visibility',
  'peripheral',
  'power',
  'privacy',
  'network',
  'security',
  'nvidia',
  'misc',
  'policies',
  'affinities',
];

export const CATEGORY_LABELS = {
  affinities: 'Affinities',
  misc: 'Misc',
  network: 'Network',
  nvidia: 'NVIDIA',
  peripheral: 'Peripheral',
  policies: 'Policies',
  power: 'Power',
  privacy: 'Privacy',
  security: 'Security',
  system: 'System',
  visibility: 'Visibility',
};

export const DIRECTORY_LABEL_OVERRIDES = {
  'windbg-notes/windbg-init': 'WinDbg Init',
  'windbg-notes/threads/thread-internals': 'Thread Internals',
  'windbg-notes/threads/examining-thread-activity': 'Examining Thread Activity',
  'windbg-notes/system-mechanisms': 'System Mechanisms',
  'windbg-notes/system-mechanisms/processor-execution-model': 'Processor Execution Model',
  'windbg-notes/system-mechanisms/trap-dispatching': 'Trap Dispatching',
  'windbg-notes/system-mechanisms/software-interrupts': 'Software Interrupts',
};

const DIRECTORY_LABELS = {
  docs: 'Docs',
  guides: 'Guides',
  sections: 'Sections',
};

export function getDirectoryLabel(directory) {
  const normalizedDirectory = directory.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const segment = normalizedDirectory.split('/').pop() || normalizedDirectory;

  if (DIRECTORY_LABEL_OVERRIDES[normalizedDirectory]) {
    return DIRECTORY_LABEL_OVERRIDES[normalizedDirectory];
  }

  if (CATEGORY_LABELS[segment]) return CATEGORY_LABELS[segment];
  if (DIRECTORY_LABELS[segment]) return DIRECTORY_LABELS[segment];

  return toTitleCase(segment);
}

export function toTitleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

