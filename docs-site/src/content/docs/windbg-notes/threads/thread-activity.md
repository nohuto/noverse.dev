---
title: 'Thread Activity'
description: 'Generated from windbg-notes file: threads/thread-activity.md.'
editUrl: false
sidebar:
  order: 8
---

Thread activity = what a thread is currently doing and how much execution time it has used.

## User Mode

Attach WinDbg to the process, then list its threads:

```c
0:006> ~
   0  Id: 1ebc.1024 Suspend: 1 Teb: 00000000`00c04000 Unfrozen
   1  Id: 1ebc.2238 Suspend: 1 Teb: 00000000`00c0c000 Unfrozen
   2  Id: 1ebc.1474 Suspend: 1 Teb: 00000000`00c10000 Unfrozen
   3  Id: 1ebc.1bd4 Suspend: 1 Teb: 00000000`00c12000 Unfrozen
   4  Id: 1ebc.27e0 Suspend: 1 Teb: 00000000`00c16000 Unfrozen
   5  Id: 1ebc.1e64 Suspend: 1 Teb: 00000000`00c18000 Unfrozen
.  6  Id: 1ebc.26e4 Suspend: 1 Teb: 00000000`00c1a000 Unfrozen
```

Each line includes the debugger thread index, `PID.TID`, suspend count, TEB address and debugger freeze state. The thread index is assigned by the debugger and is not the system TID.

| Command | Information |
| --- | --- |
| `~` | All threads in the current process |
| `~.` | Current thread |
| `~#` | Thread that caused the current debug event |
| `~<index>k` | Stack of one thread without changing the current thread |
| `~<index>s` | Select one thread |
| `~~[<TID>]s` | Select a thread by system TID |
| `~*k` | Stack of every thread in the current process |
| `!runaway 7` | Accumulated user time, kernel time and elapsed time for every thread |
| `!findstack <symbol> 1` | Threads whose stacks contain a symbol or module |
| `!analyze -hang` | Analyze stacks for threads blocking other threads |

[`!runaway 7`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-runaway) is useful for finding a CPU-consuming thread. Its values are cumulative, so compare samples when activity over an interval matters.

```c
!runaway 7
~<index>k
```

An invasive attach normally breaks through a debugger-created thread. A stack ending in `ntdll!DbgBreakPoint` and `ntdll!DbgUiRemoteBreakin` belongs to this break-in path, not the application work being investigated.

`~` selects threads only in user-mode debugging. In kernel-mode debugging the same syntax selects processors.

## Kernel Mode

See [Thread Address](/docs/windbg-notes/threads/thread-address/) for locating the `_ETHREAD` address.

```c
!process 0 0 <image>
!process <EPROCESS> 4
!thread <ETHREAD>
```

`!process <EPROCESS> 4` gives one line per thread. Use `!process <EPROCESS> 2` when the associated waits and dispatcher objects are also needed.

[`!thread <ETHREAD>`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-thread) displays the thread state, wait information, owning process, execution times, context-switch count, ideal processor, priorities, start address and kernel stack.

```c
!thread <ETHREAD> 0
!thread <ETHREAD> 2
!thread <ETHREAD> 6
```

| Flags | Information |
| ---: | --- |
| `0` | Minimal thread information |
| `2` | Wait state |
| `6` | Wait state and stack |
| `0x10` | Temporarily use the owning process context for a more accurate stack |

`!thread` displays information but does not select the thread register context. [`.thread <ETHREAD>`](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-thread--set-register-context-) selects the saved register context.

```c
.thread <ETHREAD>
```

Use `/p /r` only when the user-mode portion of the stack is required. `/p` translates transition PTEs for the owning process and `/r` reloads its user-mode symbols.

```c
.thread /p /r <ETHREAD>
```

## State and Wait Reason

The state describes the thread's scheduler position. The wait reason describes why a waiting thread entered its wait.

The `_KTHREAD_STATE` values exposed by the kernel symbols are:

```c
lkd> dt nt!_KTHREAD_STATE
   Initialized = 0n0
   Ready = 0n1
   Running = 0n2
   Standby = 0n3
   Terminated = 0n4
   Waiting = 0n5
   Transition = 0n6
   DeferredReady = 0n7
   GateWaitObsolete = 0n8
   WaitingForProcessInSwap = 0n9
```

| State | Meaning |
| --- | --- |
| `Initialized` | Thread is being created |
| `Ready` | Waiting for a processor |
| `Running` | Executing on a processor |
| `Standby` | Selected to execute next on a processor |
| `Terminated` | Finished execution |
| `Waiting` | Waiting for an object, delay, I/O or suspension |
| `Transition` | Ready, but its kernel stack is paged out |
| `DeferredReady` | Ready processing has been deferred for a selected processor |

`!thread` combines the relevant wait fields in its header:

```c
WAIT: (WrUserRequest) UserMode Non-Alertable
```

This means:

| Value | Field |
| --- | --- |
| `WAIT` | `_KTHREAD.State` |
| `WrUserRequest` | `_KTHREAD.WaitReason` |
| `UserMode` | `_KTHREAD.WaitMode` |
| `Non-Alertable` | `_KTHREAD.Alertable` |

List the wait-reason values for the loaded kernel build with:

```c
dt nt!_KWAIT_REASON
```

The wait reason is meaningful while the thread is waiting. The stack and displayed dispatcher object identify the actual wait path and object.

## Reading the Stack

Read a stack from the current frame toward the thread entry point. For a waiting thread, the first frames commonly show the dispatcher wait path, followed by the component that requested the wait.

```c
nt!KiSwapContext
nt!KiSwapThread
nt!KiCommitThreadWait
nt!KeWaitForSingleObject
<requesting component>
```

The dispatcher frames explain that the thread is waiting. The first component-specific frame above them usually explains what requested the wait.

One stack is only a snapshot. Repeated samples that stop in the same component can indicate a persistent wait or hot path, while changing stacks usually indicate ongoing work.

## System-Wide Views

These kernel-mode commands inspect more than one process or processor and can produce large output:

| Command | Information |
| --- | --- |
| `!running` | Current and next thread for each active processor |
| `!running -t` | Running threads with processor stacks |
| `!ready 0` | Threads in ready queues, ordered by decreasing priority |
| `!stacks 0` | Summary of every kernel thread stack |
| `!stacks 2 <filter>` | Full matching kernel stacks |

Use targeted `!process` and `!thread` inspection first. System-wide views are mainly useful for scheduler, contention and hang analysis.
