---
title: 'Symbol Server'
description: 'Generated from windbg-notes file: windbg-init/symbol-server.md.'
editUrl: false
sidebar:
  order: 3
---

You can either set it via WinDbg, or as environment variable.

```powershell
$env:_NT_SYMBOL_PATH = 'srv*C:\Symbols*https://msdl.microsoft.com/download/symbols'
```

```c
.sympath srv*C:\Symbols*https://msdl.microsoft.com/download/symbols
```
