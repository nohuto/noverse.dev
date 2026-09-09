---
title: 'Capture Table'
description: 'Generated from regkit file: docs/capture-table.md.'
editUrl: false
sidebar:
  order: 3
---

Most activities were captured during boot, there are some others such as `Steam.txt`, `TLOU2.txt`, `StartAllBack.txt`, and `Lighshot.txt`, that were captured using [Procmon during use](/docs/regkit/guides/procmon/). The records of specific keys are based on `24H2`.

## System Trace

| File | Path(s) |
| --- | --- |
| [23H2.txt](https://github.com/nohuto/regkit/blob/main/assets/records/23H2.txt) | System trace of 23H2, used for [regkit](https://github.com/nohuto/regkit) (see [trace-menu](http://noverse.dev/docs/regkit/overview/#trace-menu)) |
| [24H2.txt](https://github.com/nohuto/regkit/blob/main/assets/records/24H2.txt) | System trace of 24H2, used for [regkit](https://github.com/nohuto/regkit) (see [trace-menu](http://noverse.dev/docs/regkit/overview/#trace-menu)) |
| [25H2.txt](https://github.com/nohuto/regkit/blob/main/assets/records/25H2.txt) | System trace of 25H2, used for [regkit](https://github.com/nohuto/regkit) (see [trace-menu](http://noverse.dev/docs/regkit/overview/#trace-menu)) |

## Specific Keys

### Boost Trace

| File | Path(s) |
| --- | --- |
| [ACPI.txt](https://github.com/nohuto/regkit/blob/main/assets/records/ACPI.txt) | `HKLM\SYSTEM\ControlSet001\Services\ACPI`<br>`HKLM\SYSTEM\ControlSet001\Services\acpiex`<br>`HKLM\SYSTEM\ControlSet001\Services\AcpiDev`<br>`HKLM\SYSTEM\ControlSet001\Services\acpipagr`<br>`HKLM\SYSTEM\ControlSet001\Services\AcpiPmi`<br>`HKLM\SYSTEM\ControlSet001\Services\acpitime` |
| [AFD-Parameters.txt](https://github.com/nohuto/regkit/blob/main/assets/records/AFD-Parameters.txt) | `HKLM\SYSTEM\ControlSet001\Services\AFD\Parameters` |
| [Accessibility.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Accessibility.txt) | `HKCU\Control Panel\Accessibility` |
| [Audio.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Audio.txt) | `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Audio` |
| [BFE.txt](https://github.com/nohuto/regkit/blob/main/assets/records/BFE.txt) | `HKLM\SYSTEM\ControlSet001\Services\BFE` |
| [BrokerInfrastructure.txt](https://github.com/nohuto/regkit/blob/main/assets/records/BrokerInfrastructure.txt) | `HKLM\SYSTEM\ControlSet001\Services\BrokerInfrastructure` |
| [CV-Explorer.txt](https://github.com/nohuto/regkit/blob/main/assets/records/CV-Explorer.txt) | `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer` |
| [Classpnp.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Classpnp.txt) | `HKLM\SYSTEM\ControlSet001\Control\Classpnp` |
| [Control-Wdf.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Control-Wdf.txt) | `HKLM\SYSTEM\ControlSet001\Control\Wdf` |
| [ControlPanel-Desktop.txt](https://github.com/nohuto/regkit/blob/main/assets/records/ControlPanel-Desktop.txt) | `HKCU\Control Panel\Desktop` |
| [ControlPanel-Mouse.txt](https://github.com/nohuto/regkit/blob/main/assets/records/ControlPanel-Mouse.txt) | `HKCU\Control Panel\Mouse` |
| [CrashControl.txt](https://github.com/nohuto/regkit/blob/main/assets/records/CrashControl.txt) | `HKLM\SYSTEM\ControlSet001\Control\CrashControl` |
| [Cryptography.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Cryptography.txt) | `HKLM\SOFTWARE\Microsoft\Cryptography` |
| [Disk-Storport-(990Pro).txt](https://github.com/nohuto/regkit/blob/main/assets/records/Disk-Storport-(990Pro).txt) | `HKLM\SYSTEM\ControlSet001\Enum\SCSI\Disk&Ven_NVMe&Prod_Samsung_SSD_990\5&33c33320&0&000000\Device Parameters\StorPort` (your path will be different) |
| [Dnscache-Parameters.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Dnscache-Parameters.txt) | `HKLM\SYSTEM\ControlSet001\Services\Dnscache\Parameters` |
| [Enum-USB.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Enum-USB.txt) | `HKLM\SYSTEM\ControlSet001\Enum\USB` |
| [Error-Reporting.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Error-Reporting.txt) | `HKLM\SOFTWARE\Microsoft\WINDOWS\Windows Error Reporting` |
| [FileSystem.txt](https://github.com/nohuto/regkit/blob/main/assets/records/FileSystem.txt) | `HKLM\SYSTEM\ControlSet001\Control\FileSystem` |
| [GRE-INITIALIZE.txt](https://github.com/nohuto/regkit/blob/main/assets/records/GRE-INITIALIZE.txt) | `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\GRE_INITIALIZE` |
| [Graphics-Drivers.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Graphics-Drivers.txt) | `HKLM\SYSTEM\ControlSet001\Control\GraphicsDrivers` |
| [Input.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Input.txt) | `HKLM\SYSTEM\INPUT` |
| [Intel-00XX.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Intel-00XX.txt) | `HKLM\SYSTEM\ControlSet001\Control\Class\{4D36E968-E325-11CE-BFC1-08002BE10318}\00XX` (Intel) |
| [Intel.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Intel.txt) | `HKLM\Software\Intel` |
| [Internet-Settings.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Internet-Settings.txt) | `\Software\Microsoft\Windows\CurrentVersion\Internet Settings` |
| [LanmanServer.txt](https://github.com/nohuto/regkit/blob/main/assets/records/LanmanServer.txt) | `HKLM\SYSTEM\ControlSet001\Services\LanmanServer` |
| [Lsa.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Lsa.txt) | `HKLM\SYSTEM\ControlSet001\Control\Lsa` |
| [MultiMedia.txt](https://github.com/nohuto/regkit/blob/main/assets/records/MultiMedia.txt) | `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\MultiMedia` |
| [NDIS-Parameters.txt](https://github.com/nohuto/regkit/blob/main/assets/records/NDIS-Parameters.txt) | `HKLM\SYSTEM\ControlSet001\Services\NDIS\Parameters` |
| [NetBT.txt](https://github.com/nohuto/regkit/blob/main/assets/records/NetBT.txt) | `HKLM\SYSTEM\ControlSet001\Services\NetBT` |
| [NIC-Intel.txt](https://github.com/nohuto/regkit/blob/main/assets/records/NIC-Intel.txt) | `HKLM\SYSTEM\ControlSet001\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}\00XX` (Intel) |
| [NIC-Intel-IDA.txt](https://github.com/nohuto/regkit/blob/main/assets/records/NIC-Intel-IDA.txt) | Same path as above, but values were found via decompiling (some may not get read) |
| [NVIDIA-DispGUID.txt](https://github.com/nohuto/regkit/blob/main/assets/records/NVIDIA-DispGUID.txt) | `HKLM\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\00XX` |
| [NVIDIA-Corp.txt](https://github.com/nohuto/regkit/blob/main/assets/records/NVIDIA-Corp.txt) | `HKLM\SOFTWARE\NVIDIA Corporation` |
| [NlaSvc.txt](https://github.com/nohuto/regkit/blob/main/assets/records/NlaSvc.txt) | `HKLM\SYSTEM\ControlSet001\Services\NlaSvc` |
| [OLE.txt](https://github.com/nohuto/regkit/blob/main/assets/records/OLE.txt) | `HKLM\SOFTWARE\Microsoft\OLE` ([*](https://learn.microsoft.com/en-us/windows/win32/com/hkey-local-machine-software-microsoft-ole)) |
| [PnP.txt](https://github.com/nohuto/regkit/blob/main/assets/records/PnP.txt) | `HKLM\SYSTEM\ControlSet001\Control\PnP` |
| [Policies-System.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Policies-System.txt) | `HKLM\SOFTWARE\Policies\Microsoft\WINDOWS\SYSTEM` |
| [Policies.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Policies.txt) | `HKLM\SYSTEM\ControlSet001\Policies` |
| [Policies.txt](https://github.com/nohuto/regkit/blob/main/assets/records/CV-Policies.txt) | `HKLM\Software\Microsoft\Windows\CurrentVersion\Policies` |
| [Power.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Power.txt) | `HKLM\SYSTEM\ControlSet001\Control\Power` |
| [Session-Manager.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Session-Manager.txt) | `HKLM\SYSTEM\ControlSet001\Control\Session Manager`<br>`HKLM\SYSTEM\ControlSet001\Control\Session Manager\Memory Management`<br>`HKLM\SYSTEM\ControlSet001\Control\Session Manager\Power`<br>`HKLM\SYSTEM\ControlSet001\Control\Session Manager\Quota System` |
| [StorPort.txt](https://github.com/nohuto/regkit/blob/main/assets/records/StorPort.txt) | `HKLM\SYSTEM\ControlSet001\Control\StorPort` |
| [Tcpip-Parameters.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Tcpip-Parameters.txt) | `HKLM\SYSTEM\ControlSet001\Services\Tcpip\Parameters` |
| [Terminal-Server.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Terminal-Server.txt) | `HKLM\SYSTEM\ControlSet001\Control\Terminal Server` |
| [USB-Flags.txt](https://github.com/nohuto/regkit/blob/main/assets/records/USB-Flags.txt) | `HKLM\SYSTEM\ControlSet001\Control\usbflags` |
| [USBHUB3.txt](https://github.com/nohuto/regkit/blob/main/assets/records/USBHUB3.txt) | `HKLM\SYSTEM\ControlSet001\Services\USBHUB3` |
| [WHEA.txt](https://github.com/nohuto/regkit/blob/main/assets/records/WHEA.txt) | `HKLM\SYSTEM\ControlSet001\Control\WHEA` |
| [Windows-Defender.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Windows-Defender.txt) | `HKLM\SOFTWARE\Policies\Microsoft\Windows Defender` |
| [Windows-Dwm.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Windows-Dwm.txt) | `HKLM\SOFTWARE\Microsoft\Windows\Dwm` |
| [Winows-NT.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Winows-NT.txt) | `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Windows` |
| [Wisp.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Wisp.txt) | `HKCU\Software\Microsoft\Wisp` |
| [disk.txt](https://github.com/nohuto/regkit/blob/main/assets/records/disk.txt) | `HKLM\SYSTEM\ControlSet001\Services\disk` |
| [kbdclass.txt](https://github.com/nohuto/regkit/blob/main/assets/records/kbdclass.txt) | `HKLM\SYSTEM\ControlSet001\Services\kbdclass` |
| [kbdhid.txt](https://github.com/nohuto/regkit/blob/main/assets/records/kbdhid.txt) | `HKLM\SYSTEM\ControlSet001\Services\kbdhid` |
| [monitor.txt](https://github.com/nohuto/regkit/blob/main/assets/records/monitor.txt) | `HKLM\SYSTEM\ControlSet001\Services\monitor` |
| [mouclass.txt](https://github.com/nohuto/regkit/blob/main/assets/records/mouclass.txt) | `HKLM\SYSTEM\ControlSet001\Services\mouclass` |
| [mouhid.txt](https://github.com/nohuto/regkit/blob/main/assets/records/mouhid.txt) | `HKLM\SYSTEM\ControlSet001\Services\mouhid` |
| [nvlddmkm.txt](https://github.com/nohuto/regkit/blob/main/assets/records/nvlddmkm.txt) | `HKLM\SYSTEM\ControlSet001\Services\nvlddmkm` |
| [pci.txt](https://github.com/nohuto/regkit/blob/main/assets/records/pci.txt) | `HKLM\SYSTEM\ControlSet001\Enum\pci` |
| [stornvme.txt](https://github.com/nohuto/regkit/blob/main/assets/records/stornvme.txt) | `HKLM\SYSTEM\ControlSet001\Services\stornvme\Parameters` |
| [usbhub.txt](https://github.com/nohuto/regkit/blob/main/assets/records/usbhub.txt) | `HKLM\SYSTEM\ControlSet001\Services\usbhub` |
| [wbem.txt](https://github.com/nohuto/regkit/blob/main/assets/records/wbem.txt) | `HKLM\SOFTWARE\Microsoft\wbem` |

### Runtime Trace

| File | Path(s) |
| --- | --- |
| [StartAllBack.txt](https://github.com/nohuto/regkit/blob/main/assets/records/StartAllBack.txt) | `HKCU\Software\StartIsBack` |
| [Steam.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Steam.txt) | `HKCU\Software\Valve\Steam` |
| [TLOU2.txt](https://github.com/nohuto/regkit/blob/main/assets/records/TLOU2.txt) | `HKCU\Software\Naughty Dog` |
| [Lighshot.txt](https://github.com/nohuto/regkit/blob/main/assets/records/Lighshot.txt) | `HKCU\Software\SkillBrains\Lightshot` |
