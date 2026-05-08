---
title: 'Application Compatibility'
description: 'Privacy option documentation from win-config.'
editUrl: false
sidebar:
  order: 49
---

Disables Windows Application Experience telemetry and compatibility components, Microsoft Compatibility Appraiser (including its daily task and `CompatTelRunner.exe`) and the Application Experience tasks. It reduces telemetry, and some attack surface, but removes most automatic compatibility checks, upgrade assessments and some app related backup/recovery features.

`DisableAPISamping`, `DisableApplicationFootprint`, `DisableInstallTracing`, `DisableWin32AppBackup` will only work on 24H2 and above.

Currently includes all existing tasks in `\\Microsoft\\Windows\\Application Experience\\` (LTSC IoT Enterprise 2024):
```c
"\\Microsoft\\Windows\\Application Experience\\MareBackup",
"\\Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser",
"\\Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser Exp",
"\\Microsoft\\Windows\\Application Experience\\PcaPatchDbTask",
"\\Microsoft\\Windows\\Application Experience\\SdbinstMergeDbTask",
"\\Microsoft\\Windows\\Application Experience\\StartupAppTask"

//"\\Microsoft\\Windows\\Application Experience\\AitAgent",
//"\\Microsoft\\Windows\\Application Experience\\PcaWallpaperAppDetect",
```

## Windows Policies

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Turn off SwitchBack Compatibility Engine](https://www.noverse.dev/policies.html?p=AppCompat*AppCompatTurnOffSwitchBack) | `HKLM\Software\Policies\Microsoft\Windows\AppCompat` | `SbEnable` |
| [Turn off Application Compatibility Engine](https://www.noverse.dev/policies.html?p=AppCompat*AppCompatTurnOffEngine) | `HKLM\Software\Policies\Microsoft\Windows\AppCompat` | `DisableEngine` |
| [Turn off Program Compatibility Assistant](https://www.noverse.dev/policies.html?p=AppCompat*AppCompatTurnOffProgramCompatibilityAssistant_2) | `HKLM\Software\Policies\Microsoft\Windows\AppCompat` | `DisablePCA` |
| [Turn off Install Tracing](https://www.noverse.dev/policies.html?p=AppDeviceInventory*TurnOffInstallTracing) | `HKLM\Software\Policies\Microsoft\Windows\AppCompat` | `DisableInstallTracing` |
| [Turn off API Sampling](https://www.noverse.dev/policies.html?p=AppDeviceInventory*TurnOffAPISamping) | `HKLM\Software\Policies\Microsoft\Windows\AppCompat` | `DisableAPISamping` |
| [Turn off Application Footprint](https://www.noverse.dev/policies.html?p=AppDeviceInventory*TurnOffApplicationFootprint) | `HKLM\Software\Policies\Microsoft\Windows\AppCompat` | `DisableApplicationFootprint` |
| [Turn off compatibility scan for backed up applications](https://www.noverse.dev/policies.html?p=AppDeviceInventory*TurnOffWin32AppBackup) | `HKLM\Software\Policies\Microsoft\Windows\AppCompat` | `DisableWin32AppBackup` |
| [Detect compatibility issues for applications and drivers](https://www.noverse.dev/policies.html?p=pca*DisablePcaUIPolicy) | `HKLM\Software\Policies\Microsoft\Windows\AppCompat` | `DisablePcaUI` |
