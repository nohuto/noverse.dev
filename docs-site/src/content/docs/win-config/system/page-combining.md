---
title: 'Page Combining'
description: 'System option documentation from win-config.'
editUrl: false
sidebar:
  order: 24
---

Memory combining finds duplicate pages in RAM and replaces them with one shared physical page. All processes using those pages then reference the shared copy, and if a process modifies it, Windows creates a private copy for that process through `copy-on-write`.

> "*Page combining can be disabled by setting a DWORD value named `DisablePageCombining` to `1` in the `HKLM\System\CurrentControlSet\Control\Session Manager\Memory Management` registry key.*"
>
> — Windows Internals, [E7, P1: 'Memory combining'](https://github.com/nohuto/Windows-Books/releases/download/7th-Edition/Windows-Internals-E7-P1.pdf)

### DisablePageCombining

`Disable-MMAgent -PageCombining` toggles the state shown in `Get-MMAgent` but does not write the `DisablePageCombining` registry value, note that the value still is used in `MiCombineIdenticalPages`.

```asm
INIT:0000000140B9C340                 dq offset aSessionManager_7 ; "Session Manager\\Memory Management"
INIT:0000000140B9C348                 dq offset aDisablepagecom ; "DisablePageCombining"
INIT:0000000140B9C350                 dq offset dword_140D1D1C8

ALMOSTRO:0000000140D1D1C8 dword_140D1D1C8 dd 0                    ; DATA XREF: MiCombineIdenticalPages:loc_1407F7E3A↑r
```

### Get-MMAgent

See the current page combining state on your system via ([cmdlet](https://learn.microsoft.com/en-us/powershell/module/mmagent/disable-mmagent?view=windowsserver2025-ps)):

```powershell
Get-MMAgent
```
```powershell
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
