---
slug: 'docs/windbg-notes/windbg-init/symbol-server'
title: 'Symbol Server'
description: 'Generated from windbg-notes file: windbg-init/symbol-server.md.'
editUrl: false
sidebar:
  order: 3
---

Set the env variable before starting WinDbg from that PowerShell session:

```powershell
$env:_NT_SYMBOL_PATH = 'srv*C:\Symbols*https://msdl.microsoft.com/download/symbols'
```

Use `.sympath` in an existing debugger session, then `.reload /f <module>` to load symbols immediately.

```c
.sympath srv*C:\Symbols*https://msdl.microsoft.com/download/symbols
```
