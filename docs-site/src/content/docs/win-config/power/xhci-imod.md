---
title: 'xHCI IMOD'
description: 'Power option documentation from win-config.'
editUrl: false
sidebar:
  order: 2
---

| Flag | Description |
| --- | --- |
| `--rw-path PATH` | Override the default `%LOCALAPPDATA%\Noverse\IMOD\RwPortable\Win64\Portable\Rw.exe` location |
| `--bdf BB:DD.F` | Use a specific controller by Bus:Device.Function (hex). Mutually exclusive with `--xhci-index`/`--all` |
| `--xhci-index N` | Use the Nth xHCI controller reported by `FPciClass` (defaults to 0 when `--bdf/--all` absent) |
| `--all` | Iterate through every xHCI controller and apply the same IMOD changes to each |
| `--interrupter ID` / `-i ID` | Restrict the operation to specific interrupter IDs, repeat the flag for multiple IDs (defaults to all) |
| `--interval VALUE` | Set a custom IMOD interval (0–0xFFFF, in 250 ns ticks). Use for example `0xC800` (~48 Hz) to see if chaning the interval works |
| `--no-write` | Only read and print IMOD registers (skip the write for information only) |
| `--startup` | Copy the script or exe to `%LOCALAPPDATA%\Noverse\IMOD\` and creates a scheduled task that runs the command at each logon |
| `--delete` | Delete the scheduled task created by `--startup` |
| `--no-exit` | Keep the console open after completion |
| `--verbose` | Output all `rw.exe` commands/results |

```c
--all --no-write --no-exit // information only
--all --no-write --verbose --no-exit // rw commands/output
--all // 0 for all controllers
--all --interval 0xC800 // testing (~48hz)
--all --startup // 0 for all controllers, creates scheduled task
--delete // removes the task
```

You can download [NV-IMOD](https://github.com/nohuto/win-config/blob/main/power/assets/NV-IMOD.exe) from my repository, I packed it into one package since some may not have python installed on their system.

## Bit Descriptions

### Interrupter Moderation Register (IMOD)

| Bit   | Description|
| :---: | --- |
| 15:0 | **Interrupt Moderation Interval (IMODI) – RW.** Default = '4000' (~1ms). Minimum inter-interrupt interval. The interval is specified in 250ns increments. A value of '0' disables interrupt throttling logic and interrupts shall be generated immediately if IP = '0', EHB = '0', and the *Event Ring* is not empty. |
| 31:16 | **Interrupt Moderation Counter (IMODC) – RW.** Default = undefined. Down counter. Loaded with the IMODI value whenever IP is cleared to '0', counts down to '0', and stops. The associated interrupt shall be signaled whenever this counter is '0', the *Event Ring* is not empty, the IE and IP flags = '1', and EHB = '0'. This counter may be directly written by software at any time to alter the interrupt rate. |

### Host Controller Structural Parameters 2 (HCSPARAMS2)

| Bit  | Description |
| :---: | --- |
| 0:3 | **Isochronous Scheduling Threshold (IST).** Default = implementation dependent. The value in this field indicates to system software the minimum distance (in time) that it is required to stay ahead of the host controller while adding TRBs, in order to have the host controller process them at the correct time. The value shall be specified in terms of number of frames/microframes.<br><br>If bit [3] of IST is cleared to '0', software can add a TRB no later than IST[2:0] Microframes before that TRB is scheduled to be executed.<br><br>If bit [3] of IST is set to '1', software can add a TRB no later than IST[2:0] Frames before that TRB is scheduled to be executed.<br><br>Refer to Section 4.14.2 for details on how software uses this information for scheduling isochronous transfers. |
| 7:4 | ***Event Ring* Segment Table Max (ERST Max).** Default = implementation dependent. Valid values are 0 – 15. This field determines the maximum value supported the **Event Ring* Segment Table Base Size* registers (5.5.2.3.1), where:<br><br>  The maximum number of *Event Ring* Segment Table entries = 2 ERST Max.<br><br>e.g. if the ERST Max = 7, then the xHC **Event Ring* Segment Table(s)* supports up to 128 entries, 15 then 32K entries, etc. |
| 20:8 | Reserved. |

![](https://github.com/nohuto/win-config/blob/main/power/images/HCSPARAMS2-structure.png?raw=true)

### Runtime Register Space Offset Register (RTSOFF)

| Bit  | Description |
| :---: | --- |
| 0 | **Interrupt Pending (IP) – RW1C.** Default = '0'. This flag represents the current state of the Interrupter. If IP = '1', an interrupt is pending for this Interrupter. A '0' value indicates that no interrupt is pending for the Interrupter. Refer to section 4.17.3 for the conditions that modify the state of this flag.                                    |
| 1 | **Interrupt Enable (IE) – RW.** Default = '0'. This flag specifies whether the Interrupter is capable of generating an interrupt. When this bit and the IP bit are set ('1'), the Interrupter shall generate an interrupt when the Interrupter Moderation Counter reaches '0'. If this bit is '0', then the Interrupter is prohibited from generating interrupts. |
| 31:2 | Reserved and Preserved. |

![](https://github.com/nohuto/win-config/blob/main/power/images/RTSOFF-structure.png?raw=true)

### Interrupter Management Register Bit Definitions (IMAN)

| Bit  | Description |
| :---: | --- |
| 0 | **Interrupt Pending (IP) – RW1C.** Default = '0'. This flag represents the current state of the Interrupter. If IP = '1', an interrupt is pending for this Interrupter. A '0' value indicates that no interrupt is pending for the Interrupter. Refer to section 4.17.3 for the conditions that modify the state of this flag. |
| 1 | **Interrupt Enable (IE) – RW.** Default = '0'. This flag specifies whether the Interrupter is capable of generating an interrupt. When this bit and the IP bit are set ('1'), the Interrupter shall generate an interrupt when the Interrupter Moderation Counter reaches '0'. If this bit is '0', then the Interrupter is prohibited from generating interrupts. |
| 31:2 | Reserved and Preserved. |
