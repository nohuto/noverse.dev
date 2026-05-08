---
title: 'File/Printer Sharing'
description: 'Network option documentation from win-config.'
editUrl: false
sidebar:
  order: 28
---

Disables "Allow other on the network to access shared files and printers on this device" via `@FirewallAPI.dll,-28502` & `ms_server`.

```powershell
PS C:\Users\Nohuto> Get-NetFirewallRule | sort -unique Group | sort DisplayGroup | ft DisplayGroup, Group

DisplayGroup                                                                      Group
------------                                                                      -----
File and Printer Sharing                                                          @FirewallAPI.dll,-28502
File and Printer Sharing (Restrictive)                                            @FirewallAPI.dll,-28672

PS C:\Users\Nohuto> Get-NetAdapterBinding -Name *

Name                           DisplayName                                        ComponentID          Enabled
----                           -----------                                        -----------          -------
Ethernet                       File and Printer Sharing for Microsoft Networks    ms_server            False
```

## Windows Policies

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Allow printer sharing with Windows Sandbox](https://www.noverse.dev/policies.html?p=WindowsSandbox*AllowPrinterRedirection) | `HKLM\SOFTWARE\Policies\Microsoft\Windows\Sandbox` | `AllowPrinterRedirection` |
