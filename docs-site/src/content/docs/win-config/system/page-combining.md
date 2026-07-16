---
title: 'Page Combining'
description: 'System option documentation from win-config.'
editUrl: false
sidebar:
  order: 11
---

Memory combining finds duplicate pages in RAM and replaces them with one shared physical page. All processes using those pages then reference the shared copy, and if a process modifies it, Windows creates a private copy for that process through `copy-on-write`.

There's no separate process for page combining (like `MemCompression`), SysMain requests the work and the kernel Memory Manager does the combine work.

### DisablePageCombining

> "*Page combining can be disabled by setting a DWORD value named `DisablePageCombining` to `1` in the `HKLM\System\CurrentControlSet\Control\Session Manager\Memory Management` registry key.*"
>
> — Windows Internals, [E7, P1: 'Memory combining'](https://github.com/nohuto/Windows-Books/releases/download/7th-Edition/Windows-Internals-E7-P1.pdf)

That value is read from the `Memory Management` registry key into `nt!MmRegistryState+0x8` and read by `MiCombineIdenticalPages`, if bit 0 is set, the combine request returns `STATUS_NOT_SUPPORTED` (not used by MMAgent obviously).

```asm
INIT:0000000140B9C340                 dq offset aSessionManager_7 ; "Session Manager\\Memory Management"
INIT:0000000140B9C348                 dq offset aDisablepagecom ; "DisablePageCombining"
INIT:0000000140B9C350                 dq offset dword_140D1D1C8

ALMOSTRO:0000000140D1D1C8 dword_140D1D1C8 dd 0                    ; DATA XREF: MiCombineIdenticalPages:loc_1407F7E3A↑r
```

```c
lkd> dd nt!MmRegistryState+8 L1
fffff803`1bd1d1c8  00000000
```

### MMAgent

`Enable-MMAgent -PageCombining` calls the `PS_MMAgent` CIM provider in `sysmain.dll`, which goes to `MmaConfigure`, sets the page combining admin bit in the Superfetch key, and relies on `SysMain` to apply the component state.

```c
"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Superfetch"
    AdminEnable & 0x100 // PageCombining requested enabled
    AdminDisable & 0x100 // PageCombining requested disabled
    StartedComponents & 0x100 // PageCombining started by SysMain
```

`0x100` = bit `8`, you can use my [bitmask calculator](https://noverse.dev/#bitmask) to see whenever that bit is set in your current `StartedComponents` data.

See the requested page combining state via [MMAgent](https://learn.microsoft.com/en-us/powershell/module/mmagent/get-mmagent?view=windowsserver2025-ps):

```powershell
Get-MMAgent

ApplicationLaunchPrefetching : True
ApplicationPreLaunch         : True
MaxOperationAPIFiles         : 512
MemoryCompression            : True
OperationAPI                 : True
PageCombining                : True # Enabled
PSComputerName               :
```

## [Windows Internals](https://github.com/nohuto/Windows-Books/releases/download/7th-Edition/Windows-Internals-E7-P1.pdf)

![](https://github.com/nohuto/win-config/blob/main/system/images/pagecomb1.png?raw=true)
![](https://github.com/nohuto/win-config/blob/main/system/images/pagecomb2.png?raw=true)
![](https://github.com/nohuto/win-config/blob/main/system/images/pagecomb3.png?raw=true)
![](https://github.com/nohuto/win-config/blob/main/system/images/pagecomb4.png?raw=true)
