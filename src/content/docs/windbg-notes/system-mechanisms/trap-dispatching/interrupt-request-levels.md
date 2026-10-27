---
slug: 'docs/windbg-notes/system-mechanisms/trap-dispatching/interrupt-request-levels'
title: 'Interrupt Request Levels'
description: 'Generated from windbg-notes file: system-mechanisms/trap-dispatching/interrupt-request-levels.md.'
editUrl: false
sidebar:
  order: 14
---

Interrupt request levels (IRQLs) are basically an interrupt source priority and a per processor priority state. Each interrupt source has such an IRQL, and each processor also has a current IRQL, which defines what source can interrupt that processor. [`!irql`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-irql) displays `KPRCB.DebuggerSavedIRQL`, the IRQL saved just before the debugger break. The debugger raises IRQL when it breaks in, so the saved value is usually more useful.

Note that `PASSIVE_LEVEL`/`LOW_LEVEL` = IRQL `0`, where usually normal thread execution happens, means its not really a interrupt level, thread priorities only have a meaning if IRQL is less than 2.

<img src="https://raw.githubusercontent.com/nohuto/windbg-notes/main/images/irql-levels.png" alt="" width="439" height="310" decoding="async">

```c
// wdm.h
//
// Interrupt Request Level definitions
//

#define PASSIVE_LEVEL 0                 // Passive release level
#define LOW_LEVEL 0                     // Lowest interrupt level
#define APC_LEVEL 1                     // APC interrupt level
#define DISPATCH_LEVEL 2                // Dispatcher level
#define CMCI_LEVEL 5                    // CMCI handler level

#define CLOCK_LEVEL 13                  // Interval clock level
#define IPI_LEVEL 14                    // Interprocessor interrupt level
#define DRS_LEVEL 14                    // Deferred Recovery Service level
#define POWER_LEVEL 14                  // Power failure level
#define PROFILE_LEVEL 15                // timer used for profiling.
#define HIGH_LEVEL 15                   // Highest interrupt level
```

At `DISPATCH_LEVEL` and above:

- Normal thread preemption cannot occur on that processor
- Code cannot block waiting for a dispatcher object
- Pageable memory cannot be accessed
- A page fault cannot be handled

Moving the remaining ISR work to a DPC shortens time at DIRQL, the ordinary DPC runs at `DISPATCH_LEVEL`, where higher IRQL interrupts can still run (see [interrupt processing](https://noverse.dev/docs/windbg-notes/system-mechanisms/trap-dispatching/interrupt-dispatching/#interrupt-processing) for the entire image).

<img src="https://raw.githubusercontent.com/nohuto/windbg-notes/main/images/driver-isr.png" alt="" width="180" height="244" loading="lazy" decoding="async">
