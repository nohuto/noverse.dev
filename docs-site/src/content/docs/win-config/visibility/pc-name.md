---
title: 'PC Name'
description: 'Visibility option documentation from win-config.'
editUrl: false
sidebar:
  order: 35
---

Query current name via:

```powershell
$env:COMPUTERNAME # ComputerName

hostname # NV Hostname
```

## SystemSettings Capture

Same would be written if changed via [`Rename-Computer`](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/rename-computer) cmdlet.

```c
// System > About : Rename this PC (NOVERSE)

HKLM\System\CurrentControlSet\Services\Tcpip\Parameters\NV Hostname	Type: REG_SZ, Length: 16, Data: NOVERSE
HKLM\System\CurrentControlSet\Control\ComputerName\ComputerName\ComputerName	Type: REG_SZ, Length: 16, Data: NOVERSE
```
