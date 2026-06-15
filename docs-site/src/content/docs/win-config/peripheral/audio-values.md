---
title: 'Audio Values'
description: 'Peripheral option documentation from win-config.'
editUrl: false
sidebar:
  order: 8
---

You can find all mentioned functions in [decompiled-pseudocode/11-23H2/audiosrv](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/audiosrv)/[decompiled-pseudocode/11-23H2/audiodg](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/audiodg)/[decompiled-pseudocode/11-23H2/AudioSrvPolicyManager](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/AudioSrvPolicyManager), everything below is currently based on xrefs of `RegGetValueW`. Since the function names often already tell a lot, I've written them down where they're from. See a boot capture of `CurrentVersion\\Audio` key [here](https://github.com/nohuto/regkit/blob/main/records/Audio.txt).

The titles below tell what binary I've the values from.

## audiodg.exe

```c
"HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Audio";
  // AERTMemoryInitOnce
  "SkipRTHeap" = 1; // REG_DWORD (bool), 0 = RT (realtime) heap, nonzero = normal C++ heap (for AERTAllocate & AERTFree)

  // CEndpointInstance::CreateStreamEndpointInstance
  "SuppressBridgeTargetGlitchLogging" = 0; // REG_DWORD (bool)

  // CAudioPump::IsTimerRequired
  "DisablePumpBackupTimer" = ?; // REG_DWORD (bool)

  // _lambda_10c7c3905643286e055343d22ac897fe_::operator()
  "AudioDgWatchDogTimerInMs" = 0; // REG_DWORD, range 0-4294967295 ms, the read value gets overwritten with 0 and I didn't see any other points where the edited value could be used (?)
  "UseNewStreamManagementCodePath" = 1; // REG_DWORD (bool)

  // InitializeCpuManager
  "CpuManagementThresholdHns" = 50000; // REG_DWORD, range 0-4294967295 (100 ns units) means default = 5 ms
  "CpuManagementAudioReservedCpuMask" = 0; // REG_QWORD, range 0-18446744073709551615 (0 = auto)

  // CRTThreadManager::InitializeRTOperatingMode
  "RTOperatingMode" = 3; // REG_DWORD, useful range seems 0-4
                         // 0 uses the shared Audio queue
                         // 1 uses it plus one MMCSS queue
                         // 2 creates a base queue plus queues per APO
                         // 3 uses the shared queue
                         // 4 creates queues per APO

  // CollectExceptionData
  "PreventAudioDGCrashOrReportOnAPOException" = 0; // REG_DWORD (bool)

"HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Audio\\Parameters";
  // CAudioPump::Initialize
  "AudioDGCPUPercentMax" = 40; // REG_DWORD, range 10-90 (percent), allowed pump processing time per audio period
  "DeadlineDurationThreshold" = 1000; // REG_DWORD, range 0-4294967295 ms (seems unused)

"HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Audio\\Policy";
  // IsSkipAPOFailureCheck
  "SkipAPOFailureCheck" = 0; // REG_DWORD (bool)
```
