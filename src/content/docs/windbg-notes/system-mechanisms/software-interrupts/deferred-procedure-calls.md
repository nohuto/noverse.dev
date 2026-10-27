---
slug: 'docs/windbg-notes/system-mechanisms/software-interrupts/deferred-procedure-calls'
title: 'Deferred Procedure Calls'
description: 'Generated from windbg-notes file: system-mechanisms/software-interrupts/deferred-procedure-calls.md.'
editUrl: false
sidebar:
  order: 15
---

An ordinary DPC runs at `DISPATCH_LEVEL` and prevents normal thread scheduling on that processor, regardless of thread priority.

## _KDPC Structure

```c
lkd> dt nt!_KDPC
   +0x000 TargetInfoAsUlong : Uint4B
   +0x000 Type             : UChar
   +0x001 Importance       : UChar
   +0x002 Number           : Uint2B
   +0x008 DpcListEntry     : _SINGLE_LIST_ENTRY
   +0x010 ProcessorHistory : Uint8B
   +0x018 DeferredRoutine  : Ptr64     void // callback address
   +0x020 DeferredContext  : Ptr64 Void // passed into DeferredRoutine
   +0x028 SystemArgument1  : Ptr64 Void // ^
   +0x030 SystemArgument2  : Ptr64 Void // ^
   +0x038 DpcData          : Ptr64 Void
```

## _KDPC_DATA Structure

Each `_KPRCB` (in 24H2 layout) includes `DpcData[2]`, `[0]` is the ordinary queue and `[1]` is the threaded queue. `DpcQueueDepth` counts queued work, `DpcCount` is a cumulative 32bit insertion counter for that queue (see [DpcCount](https://noverse.dev/docs/win-config/system/kernel-values/#dpccount)).

```c
lkd> dt nt!_KDPC_DATA
   +0x000 DpcList          : _KDPC_LIST
   +0x010 DpcLock          : Uint8B
   +0x018 DpcQueueDepth    : Int4B // waiting in queue
   +0x01c DpcCount         : Uint4B // successful insertions into queue
   +0x020 ActiveDpc        : Ptr64 _KDPC // currently executing
   +0x028 LongDpcPresent   : Uint4B
   +0x02c Padding          : Uint4B
```

If the DPC is already queued, [`KeInsertQueueDpc`](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-keinsertqueuedpc) returns `FALSE` without inserting it again.
