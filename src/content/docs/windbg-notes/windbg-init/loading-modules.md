---
slug: 'docs/windbg-notes/windbg-init/loading-modules'
title: 'Loading Modules'
description: 'Generated from windbg-notes file: windbg-init/loading-modules.md.'
editUrl: false
sidebar:
  order: 1
---

Use [`lm l`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/lm--list-loaded-modules-) to list modules whose symbols are currently loaded. In this LKD session `nt` is already loaded:

```c
lkd> lm l
start             end                 module name
fffff805`15c00000 fffff805`16c47000   nt         (pdb symbols)          c:\symbols\ntkrnlmp.pdb\7D91B8E878B8A42A1B9BFAB4FDC727BD1\ntkrnlmp.pdb
```

With the default lazy loading, [`.reload`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-reload--reload-module-) without `/f` updates the debuggers module info, discards existing symbols for the selected module and leaves them deferred:

```c
lkd> .reload mmcss.sys
lkd> lm m mmcss
Browse full module list
start             end                 module name
fffff805`28440000 fffff805`28456000   mmcss      (deferred)
```

`/f` overrides deferred loading ("*lazy symbol loading*") and forces the symbols to be read immediately (which can take longer as it may have to download many PDBs):

```c
lkd> .reload /f mmcss.sys
lkd> lm m mmcss
Browse full module list
start             end                 module name
fffff805`28440000 fffff805`28456000   mmcss      (pdb symbols)          c:\symbols\mmcss.pdb\9E36707273FDF82AB362DBA6ACCC09671\mmcss.pdb
```

Remove the module and its symbols from the debuggers module list (driver stays loaded in Windows):

```c
.reload /u mmcss.sys
```
