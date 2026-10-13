/* Copyright (c) 2026 nohuto */
import { createDraggableDialog } from '../dialogs/draggable';

export const initFloatingTool = ({
  layer,
  dialog,
  handle,
  closeButton,
  hash,
  focusTarget,
}: {
  layer: HTMLDialogElement;
  dialog: HTMLElement;
  handle: HTMLElement;
  closeButton: HTMLElement;
  hash: string;
  focusTarget: () => HTMLElement | undefined;
}) => {
  const openDialog = createDraggableDialog({
    layer,
    dialog,
    handle,
    resizeHandle: dialog.querySelector<HTMLElement>('.tool-resize-handle'),
    margin: 12,
    topBiased: true,
  });
  const targetHash = `#${hash}`;
  const isHashActive = () => location.hash.toLowerCase() === targetHash;
  const syncHash = (active: boolean) => {
    if (active === isHashActive()) return;
    history.replaceState(
      history.state,
      '',
      `${location.pathname}${location.search}${active ? targetHash : ''}`,
    );
  };
  const open = () => {
    syncHash(true);
    if (!layer.open) openDialog({ initialFocus: focusTarget() });
  };
  closeButton.addEventListener('click', () => layer.close());
  layer.addEventListener('click', (event) => {
    if (event.target === layer) layer.close();
  });
  layer.addEventListener('close', () => syncHash(false));
  window.addEventListener('hashchange', () => {
    if (isHashActive()) open();
    else layer.close();
  });
  return open;
};
