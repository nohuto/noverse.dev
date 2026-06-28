---
title: 'Priority Separation'
description: 'System option documentation from win-config.'
editUrl: false
sidebar:
  order: 3
---

```asm
; KeyPath = HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl
; ValueName = Win32PrioritySeparation
; Destination = PsRawPrioritySeparation
; Length/Type/Flags = 0

INIT:0000000140BA3E40                 dq offset aPrioritycontro ; "PriorityControl"
INIT:0000000140BA3E48                 dq offset aWin32prioritys ; "Win32PrioritySeparation"
INIT:0000000140BA3E50                 dq offset PsRawPrioritySeparation
INIT:0000000140BA3E58                 dq 3 dup(0)
```

See '[CmControlVector](https://noverse.dev/docs/win-config/system/kernel-values/#cmcontrolvector)' if you don't understand the comments.

## PsPrioritySeparation (`1:0`)

The priority applies to dynamic priorities below the RT (real time) range and is capped at priority `15`, disabling dynamic priority boosts for a thread/process would also prevent this FG boost. The quantum unit change is obviously only visible when the variable table is used, as all three in a fixed table are the same, so changing the low bits doesn't change its quantum. [`PsChangeQuantumTable`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/ntoskrnl/PsChangeQuantumTable.c) clamps the field and saves it in `PsPrioritySeparation`:

```c
// PsChangeQuantumTable

v3 = a2 & 3; // bits 1:0
if ( v3 >= 2 )
  v3 = 2;
PsPrioritySeparation = v3; // range 0-2
```

| Bits `1:0` | `PsPrioritySeparation` | Meaning |
| --- | ---: | --- |
| `00` | `0` | No FG priority boost (index `0`), "*The threads of foreground processes get the same amount of processor time as the threads of background processes and as the threads of processes with a priority class of Idle.*" |
| `01` | `1` | `+1` priority boost (index `1`), "*The threads of foreground processes get twice the processor time as the threads of background processes each time they are scheduled for the processor.*" |
| `10` | `2` | `+2` priority boost (index `2`), "*The threads of foreground processes get three times the processor time as the threads of background processes each time they are scheduled for the processor.*" |
| `11` | `2` | Same as `10` as it's clamped |

```c
lkd> dd PsPrioritySeparation L1
fffff804`1a31ec7c  00000000 // 0x18 (00)

lkd> dd PsPrioritySeparation L1
fffff801`2611ec7c  00000001 // 0x19 (01)

lkd> dd PsPrioritySeparation L1
fffff802`6b91ec7c  00000002 // 0x1A (10)
```

### Index Table

The mentioned index above is used for the quantum table, BG (background) processes use index `0`, FG processes use the index from `PsPrioritySeparation` (`a2` is the process state, `2` for FG, `0` otherwise):

```c
// PspComputeQuantum

v2 = *(_QWORD *)(a1 + 1296);
if ( !v2 || !PspUseJobSchedulingClasses )
  return *((_BYTE *)&PspForegroundQuantum + (PsPrioritySeparation & (unsigned int)-(a2 != 0))); // a2 == 0 uses index 0
```

The ms were calculated while `KeMaximumIncrement` = `2625a`/`15.625 ms` (`5.208 ms` per QU on 23H2, `0.868 ms` per 24H2 `ShortThreadQuantum` QU), see '[Cycles per QU]()'.

| Quantum table | Index `0` | Index `1` | Index `2` |
| --- | ---: | ---: | ---: |
| Variable short | `6` QU (`31.250 ms`) | `12` QU (`62.500 ms`) | `18` QU (`93.750 ms`) |
| Variable short (`ShortThreadQuantum`) | `2` QU (`1.736 ms`) | `4` QU (`3.472 ms`) | `36` QU (`31.250 ms`) |
| Fixed short | `18` QU (`93.750 ms`) | `18` QU (`93.750 ms`) | `18` QU (`93.750 ms`) |
| Fixed short (`ShortThreadQuantum`) | `18` QU (`15.625 ms`) | `18` QU (`15.625 ms`) | `18` QU (`15.625 ms`) |
| Variable long | `12` QU (`62.500 ms`) | `24` QU (`125.000 ms`) | `36` QU (`187.500 ms`) |
| Variable long (`ShortThreadQuantum`) | `4` QU (`3.472 ms`) | `8` QU (`6.944 ms`) | `72` QU (`62.500 ms`) |
| Fixed long | `36` QU (`187.500 ms`) | `36` QU (`187.500 ms`) | `36` QU (`187.500 ms`) |
| Fixed long (`ShortThreadQuantum`) | `36` QU (`31.250 ms`) | `36` QU (`31.250 ms`) | `36` QU (`31.250 ms`) |

Client uses variable + short ("*Performance Options: Programs*) and server fixed + long ("*Performance Options: Background services*") by default.

### FG Priority Boost

[`KiApplyForegroundBoostThread`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/ntoskrnl/KiApplyForegroundBoostThread.c) shows the calculation, add `PsPrioritySeparation` to the base priority & cap the dynamic priority at `15`.

```c
// KiApplyForegroundBoostThread

v10 = PsPrioritySeparation + *(_BYTE *)(a1 + 563); // PsPrioritySeparation + BasePriority
if ( v10 >= 16 )
  v10 = 15;
```

The same separation is included in the priority when [`KiDeferredReadySingleThread`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/ntoskrnl/KiDeferredReadySingleThread.c) readies a FG thread after a wait:

```c
// KiDeferredReadySingleThread

LABEL_64:
v35 += (char)PsPrioritySeparation; // add PsPrioritySeparation to the priority
```

#### ForceForegroundBoostDecay

Controls whether dynamic priority decay can remove the FG priority boost added by `PsPrioritySeparation`, changing it to `1` allows scheduler functions such as [`KiQuantumEnd`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-24H2/ntoskrnl/KiQuantumEnd.c) to remove that boost during priority decay. If the process is still FG (and the thread can still get dynamic priority boosts), [`KiTryScheduleNextForegroundBoost`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-24H2/ntoskrnl/KiTryScheduleNextForegroundBoost.c) schedules the boost to be applied again (leaving the FG obviously removes the boost no matter what the value is set to).

```asm
INIT:0000000140BA67E0                 dq offset aSessionManager_5 ; "Session Manager\\Kernel"
INIT:0000000140BA67E8                 dq offset aForceforegroun ; "ForceForegroundBoostDecay"
INIT:0000000140BA67F0                 dq offset KiSchedulerForegroundBoostDecayPolicy
INIT:0000000140BA67F8                 dq 3 dup(0)
```

Default is `0`, which keeps the boost while the process is in FG:

```c
lkd> dd KiSchedulerForegroundBoostDecayPolicy L1
fffff802`4711d31c  00000000
```

### Watching the FG Priority Boost

I'll use WPR below to capture the boost, if you're not familiar with WPA/MXA, you can look at the boost live via perfmon, follow '[EXPERIMENT: Watching foreground priority boosts and decays](https://github.com/nohuto/Windows-Books/releases/download/7th-Edition/Windows-Internals-E7-P1.pdf)' if you want to do it that way instead.

1. Set bits `1:0` to the separation you want to look at
2. Start [CPUSTRES](https://learn.microsoft.com/en-us/sysinternals/downloads/cpustres) and set worker thread 1 to `Busy`
3. Open WPRUI, select: ('Light' includes `CSwitch`, `ReadyThread`, `ThreadPriority`)

![](https://github.com/nohuto/win-config/blob/main/system/images/wpr-win32prio.png?raw=true)

4. Move CPUSTRES between FG/BG several times
5. Stop the capture

![](https://github.com/nohuto/win-config/blob/main/system/images/0-sep.png?raw=true)
![](https://github.com/nohuto/win-config/blob/main/system/images/1-sep.png?raw=true)
![](https://github.com/nohuto/win-config/blob/main/system/images/2-sep.png?raw=true)

You can also see if a context switch was caused by `WrQuantumEnd` via '*Processes and Threads - CS Reason*', but note that there've to be two threads with the same priority, otherwise the thread will just get another quantum without a context switch.

![](https://github.com/nohuto/win-config/blob/main/system/images/WrQuantumEnd.png?raw=true)

#### _KTHREAD Priority

You can practically also look at it via WinDbg, but rather use WPR.

```c
// 0xA1
lkd> !process 0 4 CPUSTRES.exe
PROCESS ffffb9878e2023c0
    SessionId: 1  Cid: 1c98    Peb: 004dc000  ParentCid: 0e64
    DirBase: 7159f4000  ObjectTable: ffffde0c8aed3b40  HandleCount: 197.
    Image: CPUSTRES.EXE

        THREAD ffffb9878e2300c0  Cid 1c98.1c8c  Teb: 00000000004de000 Win32Thread: ffffb9878ccb6e20 WAIT
        THREAD ffffb9878f5c2080  Cid 1c98.1cd4  Teb: 00000000004ee000 Win32Thread: 0000000000000000 RUNNING on processor 5
        THREAD ffffb9878e2e20c0  Cid 1c98.1ca8  Teb: 00000000004f2000 Win32Thread: 0000000000000000 WAIT
        THREAD ffffb9878d9bb0c0  Cid 1c98.1c74  Teb: 00000000004f6000 Win32Thread: 0000000000000000 WAIT
        THREAD ffffb9878e1c6080  Cid 1c98.0cf4  Teb: 00000000004fa000 Win32Thread: 0000000000000000 WAIT

lkd> dt _KTHREAD ffffb9878f5c2080 Priority
   +0x0c3 Priority : 8 '' // BG
lkd> .sleep 0n3000; dt _KTHREAD ffffb9878f5c2080 Priority
   +0x0c3 Priority : 10 '' // FG

// 0x18
lkd> !process 0 4 CPUSTRES.exe
PROCESS ffff800f510cf300
    SessionId: 1  Cid: 0778    Peb: 00259000  ParentCid: 0f70
    DirBase: 7ca6b5000  ObjectTable: ffffaf88087a9b40  HandleCount: 199.
    Image: CPUSTRES.EXE

        THREAD ffff800f50dcb080  Cid 0778.1bec  Teb: 000000000025b000 Win32Thread: ffff800f5068b830 WAIT
        THREAD ffff800f50dc90c0  Cid 0778.1bb4  Teb: 0000000000263000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff800f4f96b080  Cid 0778.1bfc  Teb: 000000000026b000 Win32Thread: 0000000000000000 RUNNING on processor 5
        THREAD ffff800f4f96a080  Cid 0778.1bc8  Teb: 000000000026f000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff800f4f969080  Cid 0778.1b30  Teb: 0000000000273000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff800f4f968080  Cid 0778.1af8  Teb: 0000000000277000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff800f50dca040  Cid 0778.0fd0  Teb: 000000000027b000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff800f4f96c080  Cid 0778.0d44  Teb: 000000000027f000 Win32Thread: 0000000000000000 WAIT

lkd> dt _KTHREAD ffff800f4f96b080 Priority
nt!_KTHREAD
   +0x0c3 Priority : 8 '' // BG
lkd> .sleep 0n3000; dt _KTHREAD ffff800f4f96b080 Priority
nt!_KTHREAD
   +0x0c3 Priority : 8 '' // FG
```

#### Game Mode

If you're using a priority boost via `PsPrioritySeparation` while having game mode enabled (default), the FG boost doesn't work. See '[FG Boost with Game Mode](https://noverse.dev/docs/win-config/system/game-mode/#fg-boost-with-game-mode)' for more information on game mode effects.

Note that I've done that test on 23H2, and it *seems* to be fixed on 25H2 (haven't tried it on my own yet).

![](https://github.com/nohuto/win-config/blob/main/system/images/gamemodeprioboost.png?raw=true)

## Quantum

> "*A quantum is the amount of time a thread is permitted to run before Windows checks to see whether another thread at the same priority is waiting to run. If a thread completes its quantum and there are no other threads at its priority, Windows permits the thread to run for another quantum.*
>
> *On client versions of Windows, threads run for two clock intervals by default. On server systems, threads run for 12 clock intervals by default. The rationale for the longer default value on server systems is to minimize context switching. By having a longer quantum, server applications that wake up because of a client request have a better chance of completing the request and going back into a wait state before their quantum ends.*
>
> *The length of the clock interval varies according to the hardware platform. The frequency of the clock interrupts is up to the HAL, not the kernel. For example, the clock interval for most x86 uniprocessors is about 10 milliseconds (note that these machines are no longer supported by Windows and are used here only for example purposes), and for most x86 and x64 multiprocessors it is about 15 milliseconds. This clock interval is stored in the kernel variable KeMaximumIncrement as hundreds of nanoseconds. Although threads run in units of clock intervals, the system does not use the count of clock ticks as the gauge for how long a thread has run and whether its quantum has expired. This is because thread run-time accounting is based on processor cycles. When the system starts up, it multiplies the processor speed (CPU clock cycles per second) in hertz (Hz) by the number of seconds it takes for one clock tick to fire (based on the KeMaximumIncrement value described earlier) to calculate the number of clock cycles to which each quantum is equivalent. This value is stored in the kernel variable KiCyclesPerClockQuantum.*"
>
> — Windows Internals, [E7, P1: 'Quantum'](https://github.com/nohuto/Windows-Books/releases/download/7th-Edition/Windows-Internals-E7-P1.pdf)

The client default of two clock intervals is the background (index `0`) value, see '[Index Table]()'. The quote above is valid on 23H2, but with `ShortThreadQuantum` on 24H2, it makes each unit six times smaller (`clock interval / 18` instead of `clock interval / 3`) and adds a per thread `BamQosLevel` override (see '[QoS Quantum Override]()').

### Threads QuantumReset

You can display the current `QuantumReset` of threads via `dt _KTHREAD <thread address> QuantumReset`, I've used `0x18` while running the commands below.

```c
lkd> db PspForegroundQuantum L3
fffff805`45954bec  24 24 24                                         $$$

lkd> !process 0 4 CPUSTRES.exe
PROCESS ffff8084c5d5f080
    SessionId: 1  Cid: 1644    Peb: 00f27000  ParentCid: 0b8c
    DirBase: 73a73e000  ObjectTable: ffffdb8a6c01fc40  HandleCount: 201.
    Image: CPUSTRES.EXE

        THREAD ffff8084c125d080  Cid 1644.1694  Teb: 0000000000f29000 Win32Thread: ffff8084c4f9ec90 WAIT
        THREAD ffff8084c0ced080  Cid 1644.272c  Teb: 0000000000f2d000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff8084c23ba300  Cid 1644.1630  Teb: 0000000000f31000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff8084be291080  Cid 1644.0e10  Teb: 0000000000f35000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff8084c293e080  Cid 1644.15d4  Teb: 0000000000f39000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff8084be31f080  Cid 1644.0d28  Teb: 0000000000f3d000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff8084c06c1080  Cid 1644.14e0  Teb: 0000000000f41000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff8084bf5be080  Cid 1644.14bc  Teb: 0000000000f45000 Win32Thread: 0000000000000000 WAIT

lkd> dt _KTHREAD ffff8084c125d080 QuantumReset
   +0x28b QuantumReset : 0x24 '$'
```

### Variable/Fixed Quantum (`3:2`)

[`PsChangeQuantumTable`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/ntoskrnl/PsChangeQuantumTable.c) uses the variable table for `01` and the fixed table for `10`.

| Bits `3:2` | Result |
| --- | --- |
| `00` | client variable, server fixed |
| `01` | variable |
| `10` | fixed |
| `11` | client variable, server fixed |

```c
// PsChangeQuantumTable (23H2)

v5 = a2 & 0xC; // bits 3:2
if ( (a2 & 0xC) != 0 )
{
  if ( v5 == 4 )
  {
    v8 = (char *)&PspVariableQuantums; // 01 (variable)
    goto LABEL_7;
  }
  if ( v5 == 8 )
  {
    v8 = PspFixedQuantums; // 10 (fixed)
    goto LABEL_7;
  }
}
```

24H2 stores the table thats used in `KiVariableQuantumEnabled`, means it sets it to `1` if variable quantums via `01`, or `00`/`11` (when client) are used.

```c
// PsChangeQuantumTable (24H2)

v6 = a2 & 0xC; // bits 3:2
if ( (a2 & 0xC) == 0 )
{
LABEL_17:
  if ( !MmIsThisAnNtAsSystem() )
    goto LABEL_7; // client default (variable)
LABEL_22:
  KiVariableQuantumEnabled = 0;
  v2 = (int *)PspFixedQuantums;
  goto LABEL_8;
}
if ( v6 != 4 )
{
  if ( v6 == 8 )
    goto LABEL_22; // 10 = fixed
  goto LABEL_17; // 11 = default
}
LABEL_7:
KiVariableQuantumEnabled = 1; // 01/client default
```

See '[QoS Quantum Override (`BamQosLevel`)]()' to understand what `KiVariableQuantumEnabled` is used for.

### Long/Short Interval (`5:4`)

Each table has six bytes, the first three are the short entries, the last three are the long entries, see '[Index Table]()' for the length differences.

| Bits `5:4` | Meaning |
| --- | --- |
| `00` | client short, server long |
| `01` | long |
| `10` | short |
| `11` | client short, server long |

```c
// PsChangeQuantumTable

v9 = a2 & 0x30; // bits 5:4
if ( !v9 )
{
LABEL_8:
  if ( !MmIsThisAnNtAsSystem() ) // FALSE on client, TRUE on server
    goto LABEL_9;
  goto LABEL_22;
}
if ( v9 != 16 )
{
  if ( v9 == 32 )
    goto LABEL_9; // 10 = first three (short)
  goto LABEL_8;
}
LABEL_22:
v8 += 3; // 01 = last three (long)
LABEL_9:
PspForegroundQuantum = *(_WORD *)v8;
result = v8[2]; // copy selected three entries
```

Whenever using `00`/`11`, you can display the state of `MmIsThisAnNtAsSystem` (which is a bool as shown below) via:

```c
lkd> u nt!MmIsThisAnNtAsSystem L2
nt!MmIsThisAnNtAsSystem:
fffff802`63c907d0 8a0516caa800    mov     al,byte ptr [nt!MmRegistryState+0x2c (fffff802`6471d1ec)]
fffff802`63c907d6 c3              ret
lkd> dd fffff802`6471d1ec L1
fffff802`6471d1ec  00000000 // FALSE
```

```c
// ntddk.h

NTKERNELAPI
BOOLEAN
MmIsThisAnNtAsSystem (
    VOID
    );
```

### Quantum Units (23H2)

Without the 24H2 `ShortThreadQuantum` function, one QU is one third of the maximum clock interval. [`KeInitSystem`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/ntoskrnl/KeInitSystem.c) calculates the related processor cycle count:

```c
// KeInitSystem

v17 = *(unsigned int *)(KiProcessorBlock[0] + 68); // processor frequency (MHz)
v18 = v17 * (unsigned __int64)(unsigned int)KeMaximumIncrement / 0xA; // cycles per maximum clock interval
KiShortExecutionCycles = v18 / 0xF0;
KiCyclesPerClockQuantum = v18 / 3; // processor cycles shown as a QU
```

#### PspVariableQuantums/PspFixedQuantums

Compare the output to the '[Index Table](#index-table)' (or the table below) and you'll see the relations. `db` shows hexadecimal bytes, means e.g. `24 24 24` are three `0x24` (`36`) entries.

```c
lkd> db PspVariableQuantums L6
fffff805`45677ae0  06 0c 12 0c 18 24                                .....$

lkd> dq PspVariableQuantums L1
fffff805`45677ae0  00002418`0c120c06

lkd> db PspFixedQuantums L6
fffff805`45677a4c  12 12 12 24 24 24                                ...$$$

// 0x18

lkd> db PspForegroundQuantum L3
fffff805`45954bec  24 24 24                                         $$$
```

| Table | Short (`PsPrioritySeparation` 0/1/2) | Long (`PsPrioritySeparation` 0/1/2) |
| --- | --- | --- |
| Variable | `6 / 12 / 18` units = `2 / 4 / 6` clock intervals | `12 / 24 / 36` units = `4 / 8 / 12` clock intervals |
| Fixed | `18 / 18 / 18` units = `6` clock intervals | `36 / 36 / 36` units = `12` clock intervals |

So for example, on 23H2 with short variable quantums and separation `2`, a FG process gets a reset of `18` QU (`6` clock intervals), while a BG process gets `6` QU (`2` clock intervals), the FG reset is therefore three times the BG reset.

##### Cycles per QU

This follows the Windows Internals '[EXPERIMENT: Determining the clock cycles per quantum](https://github.com/nohuto/Windows-Books/releases/download/7th-Edition/Windows-Internals-E7-P1.pdf)', first use `!cpuinfo` to get the processor frequency stored in the PRCB:

```c
lkd> !cpuinfo
CP  F/M/S Manufacturer  MHz PRCB Signature    MSR 8B Signature Features ArchitectureClass
 0 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
 1 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
 2 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
 3 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
 4 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
 5 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
 6 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
 7 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
 8 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
 9 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
10 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
11 25,33,2 AuthenticAMD 3700 000000000a201213                   3c3b3dff 0
```

Then combine that MHz value with the decimal `KeMaximumIncrement` (same as clockres '*Maximum timer interval*') value. `KeMaximumIncrement` is measured in 100ns units, means `0x2625A` is `156250` (`15.625 ms`), one QU is therefore `15.625 / 3 = 5.208 ms`.

```c
lkd> dd KeMaximumIncrement L1
fffff805`4591ea54  0002625a
```

```c
lkd> ? 0n3700 * 0n156250 / 0n10 / 0n3
Evaluate expression: 19270833 = 00000000`01260cb1

lkd> dd KiCyclesPerClockQuantum L1
fffff805`4591d0d4  01260cb1
```

`/10` converts the clock interval from 100ns units to ms (cycles per microsecond) & `/3` converts one clock interval into one QU, the output should be then the same as the `KiCyclesPerClockQuantum` read.

#### Quantum Exceptions

Most processes get their reset from the selected three entries in `PspForegroundQuantum`, but [`PspComputeQuantum`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/ntoskrnl/PspComputeQuantum.c) has two exceptions, first are processes the *Idle* priority class (not the system Idle thread) which always get `6` QU. The other exception is for processes in a job when long + fixed is used, which select one of ten resets from `PspJobSchedulingClasses` instead of `PspForegroundQuantum`.

```c
lkd> db PspUseJobSchedulingClasses L1
fffff805`45954a07  01                                               .

lkd> db PspJobSchedulingClasses La
fffff805`45677c48  06 0c 12 18 1e 24 2a 30-36 3c                    .....$*06< // 6, 12, 18, 24, 30, 36, 42, 48, 54, 60 QU
```

### ShortThreadQuantum (24H2)

In 24H2, [`KiInitializeVelocity`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-24H2/ntoskrnl/KiInitializeVelocity.c) calls the `Feature_ShortThreadQuantum__private_ReportDeviceUsage` helper and then sets bit `0x40000` in `KiVelocityFlags` (without conditions):

```c
// KiInitializeVelocity
Feature_ShortThreadQuantum__private_ReportDeviceUsage();
KiVelocityFlags |= 0x40000u;
```

With that flag, [`KeInitSystem`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-24H2/ntoskrnl/KeInitSystem.c) divides the older quantum unit by another six:

```c
// KeInitSystem
if ( (KiVelocityFlags & 0x40000) != 0 )
{
  KiCyclesPerClockQuantum = (unsigned int)v17 / 6; // clock interval / 18
  KiLockQuantumTarget = 2 * ((unsigned int)v17 / 6);
}
```

It also causes [`KeInitializeClock`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-24H2/ntoskrnl/KeInitializeClock.c) to set `KeQuantumEndTimerIncrement` (doesn't exist in 23H2) to `1.740 ms`:

```c
// KeInitializeClock

v6 = KeMaximumIncrement;
if ( (KiVelocityFlags & 0x40000) != 0 )
  v6 = 17400; // 1.740 ms
KiTimeUpdateTryAcquireTickLock = 1;
KeQuantumEndTimerIncrement = v6;
```

Clock interrupts call [`KiUpdateRunTime`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-24H2/ntoskrnl/KiUpdateRunTime.c), which checks the running threads quantum, 23H2 uses the normal clock interval (`KeMaximumIncrement`, up to `15.625 ms`), 24H2 caps the requested quantum end clock interrupt interval (`KeQuantumEndTimerIncrement`) at `1.740 ms` (which isn't good).

```asm
PAGE:0000000140B3D09C PspVariableQuantums_With_ShortQuantum dd 4240402h
PAGE:0000000140B3D0A0                 db 8, 48h, 2 dup(0)
PAGE:0000000140B3D0A4 PspVariableQuantums dd 0C120C06h
PAGE:0000000140B3D0A8                 dq 2418h, 100000041h
PAGE:0000000140B3CD78 PspFixedQuantums db 3 dup(12h)
PAGE:0000000140B3CD7B                 db 3 dup(24h), 2 dup(0)
```

Means with the `clock interval / 18` unit, the table now is:

| Table | Short (`PsPrioritySeparation` 0/1/2) | Long (`PsPrioritySeparation` 0/1/2) |
| --- | --- | --- |
| Variable | `2 / 4 / 36` = `1/9 / 2/9 / 2` clock intervals | `4 / 8 / 72` = `2/9 / 4/9 / 4` clock intervals |
| Fixed | `18 / 18 / 18` = `1` clock interval | `36 / 36 / 36` = `2` clock intervals |

You should be able to query the bit via (haven't tried it yet):

```c
? dwo(nt!KiVelocityFlags) & 0x40000 // 0x40000 = ShortThreadQuantum used
```

#### [QoS](https://learn.microsoft.com/en-us/windows/win32/procthread/quality-of-service) Quantum Override (`BamQosLevel`)

Note that this is currently an interpretation as I haven't debugged a live 24H2 build yet.

`BamQosLevel` doesn't use the `PspVariableQuantums`/`PspFixedQuantums` tables, these're still getting filled by the threads stored `QuantumReset`. When `ShortThreadQuantum` and variable quantums are used, [`KiQueryQuantumReset`](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-24H2/ntoskrnl/KiQueryQuantumReset.c) (exists since 24H2) can instead return a QoS reset (fixed quantums set `KiVariableQuantumEnabled` to `0` and won't use that override). `_KTHREAD.BamQosLevel` is at `0x204`, which is the `a1 + 516` byte read below.

```c
// KiQueryQuantumReset

v1 = *(unsigned __int8 *)(a1 + 651); // stored QuantumReset
if ( (KiVelocityFlags & 0x40000) != 0 && KiVariableQuantumEnabled )
{
  v2 = *(unsigned __int8 *)(a1 + 516); // BamQosLevel
  if ( !v2 )
    return 36; // High
  v3 = v2 - 1;
  if ( !v3 )
    return 18; // Medium
  v4 = v3 - 1;
  if ( !v4 )
    return 2; // Low
  v5 = v4 - 1;
  if ( !v5 )
    return 36; // Multimedia
  v6 = v5 - 1;
  if ( !v6 )
    return 36; // Deadline
  v8 = v6 - 1;
  if ( !v8 || (unsigned int)(v8 - 1) <= 1 )
    return 2; // Eco/Utility/Dynamic
}
return v1; // use stored QuantumReset for 8+
```

```powershell
nohuto@ENDLESS:~/Desktop$ $a = [Reflection.Assembly]::LoadFrom('C:\Program Files (x86)\Windows Kits\10\Windows Performance Toolkit\CustomDataSources\XPerf\Microsoft.Windows.EventTracing.Cpu.dll')
nohuto@ENDLESS:~/Desktop$ $t = $a.GetType('Microsoft.Windows.EventTracing.Cpu.QualityOfServiceLevel')
nohuto@ENDLESS:~/Desktop$ [Enum]::GetValues($t) | ForEach-Object { "{0} = {1}" -f $_, [int]$_ }
High = 0
Medium = 1
Low = 2
Multimedia = 3
Deadline = 4
Eco = 5
Utility = 6
Dynamic = 7
```

Look at '[Quality of Service levels](https://learn.microsoft.com/en-us/windows/win32/procthread/quality-of-service#quality-of-service-levels)' for the meaning of each QoS level.

With the `clock interval / 18` unit, the `QuantumReset` are:

| `BamQosLevel` | QoS | Reset | Time |
| --- | --- | --- | --- |
| `0` | High | `36` QU | `31.250 ms` |
| `1` | Medium | `18` QU | `15.625 ms` |
| `2` | Low | `2` QU | `1.736 ms` |
| `3` | Multimedia | `36` QU | `31.250 ms` |
| `4` | Deadline | `36` QU | `31.250 ms` |
| `5` | Eco | `2` QU | `1.736 ms` |
| `6` | Utility | `2` QU | `1.736 ms` |
| `7` | Dynamic | `2` QU | `1.736 ms` |
| `8+` | ? | stored `QuantumReset` | table dependent |

Since I'm currently not on 24H2 I can't really look into that further, but it seems to be possible to display the current `BamQosLevel` of a thread via `_KTHREAD <thread address> BamQosLevel` (don't treat the output below as a valid example for 24H2, as `BamQosLevel` isn't used the same way on 23H2 in relation to that):

```c
lkd> !process 0 4 CPUSTRES.exe
PROCESS ffff800f5c506080
    SessionId: 1  Cid: 03f4    Peb: 0082a000  ParentCid: 0f70
    DirBase: 2bf090000  ObjectTable: ffffaf8825480b40  HandleCount: 197.
    Image: CPUSTRES.EXE

        THREAD ffff800f4f8ac080  Cid 03f4.1ff0  Teb: 000000000082c000 Win32Thread: ffff800f5c203530 WAIT
        THREAD ffff800f51471080  Cid 03f4.11e0  Teb: 0000000000830000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff800f5098a080  Cid 03f4.1e2c  Teb: 0000000000834000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff800f4f584080  Cid 03f4.05c0  Teb: 0000000000838000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff800f5700f080  Cid 03f4.1c70  Teb: 000000000083c000 Win32Thread: 0000000000000000 RUNNING on processor 5
        THREAD ffff800f5701f080  Cid 03f4.0de8  Teb: 0000000000840000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff800f556f6080  Cid 03f4.1424  Teb: 0000000000844000 Win32Thread: 0000000000000000 WAIT
        THREAD ffff800f5709d080  Cid 03f4.07fc  Teb: 0000000000848000 Win32Thread: 0000000000000000 WAIT

lkd> dt _KTHREAD ffff800f5700f080 BamQosLevel
nt!_KTHREAD
   +0x200 BamQosLevel  : 0y00000000 (0)
```
