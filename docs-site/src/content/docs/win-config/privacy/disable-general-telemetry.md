---
title: 'General Telemetry'
description: 'Privacy option documentation from win-config.'
editUrl: false
sidebar:
  order: 2
---

Prevents sending info about your computer to microsoft, disables the diagnostic log collection, bluetooth ads (`DataCollection.admx`), the inventory collector. It disables the ads ID ("Windows creates a unique advertising ID per user, allowing apps and ad networks to deliver targeted ads. When enabled, it works like a cookie, linking personal data to the ID for personalized ads. This setting only affects Windows apps using the advertising ID, not web-based ads or third-party methods.") which should be disabled by default, if you toggled all options off in the OS installation phase. See policy explanations below for more details.

- [decompiled-pseudocode/tree/main/11-23H2/DiagnosticDataSettings](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/DiagnosticDataSettings) (the dll seems to exist since W10 21H+)

The option applies all kind of telemetry related values including all values that you can find in diagtrack.dll/DiagnosticDataSettings.dll (TelGetNumericPolicy, TelIsRestrictivePolicySet, TelEvaluateActiveSettingAuthority, TelGetWerTelemetryMode).

```powershell
\Registry\Machine\SOFTWARE\Policies\Microsoft\WINDOWS\DataCollection : AllowTelemetry_PolicyManager
```

Seems to be a [fallback](https://github.com/TechTech512/Win11Src/blob/840a61919419c94ed24a9b079ee1029f482d29f2/NT/onecore/base/telemetry/permission/product/telemetrypermission.cpp#L106) if `AllowTelemetry` isn't set.

## Windows Policies

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Turn off Application Telemetry](https://www.noverse.dev/policies.html?p=AppCompat*AppCompatTurnOffApplicationImpactTelemetry) | `HKLM\Software\Policies\Microsoft\Windows\AppCompat` | `AITEnable` |
| [Turn off Inventory Collector](https://www.noverse.dev/policies.html?p=AppCompat*AppCompatTurnOffProgramInventory) | `HKLM\Software\Policies\Microsoft\Windows\AppCompat` | `DisableInventory` |
| [Allow Diagnostic Data](https://www.noverse.dev/policies.html?p=DataCollection*AllowTelemetry) | `HKLM\Software\Policies\Microsoft\Windows\DataCollection`<br>`HKCU\Software\Policies\Microsoft\Windows\DataCollection` | `AllowTelemetry` |
| [Configure Authenticated Proxy usage for the Connected User Experience and Telemetry service](https://www.noverse.dev/policies.html?p=DataCollection*DisableEnterpriseAuthProxy) | `HKLM\Software\Policies\Microsoft\Windows\DataCollection` | `DisableEnterpriseAuthProxy` |
| [Limit optional diagnostic data for Desktop Analytics](https://www.noverse.dev/policies.html?p=DataCollection*LimitEnhancedDiagnosticDataWindowsAnalytics) | `HKLM\Software\Policies\Microsoft\Windows\DataCollection` | `LimitEnhancedDiagnosticDataWindowsAnalytics` |
| [Allow device name to be sent in Windows diagnostic data](https://www.noverse.dev/policies.html?p=DataCollection*AllowDeviceNameInDiagnosticData) | `HKLM\Software\Policies\Microsoft\Windows\DataCollection` | `AllowDeviceNameInTelemetry` |
| [Configure diagnostic data opt-in settings user interface](https://www.noverse.dev/policies.html?p=DataCollection*ConfigureTelemetryOptInSettingsUx) | `HKLM\Software\Policies\Microsoft\Windows\DataCollection` | `DisableTelemetryOptInSettingsUx` |
| [Configure diagnostic data opt-in change notifications](https://www.noverse.dev/policies.html?p=DataCollection*ConfigureTelemetryOptInChangeNotification) | `HKLM\Software\Policies\Microsoft\Windows\DataCollection` | `DisableTelemetryOptInChangeNotification` |
| [Disable deleting diagnostic data](https://www.noverse.dev/policies.html?p=DataCollection*DisableDeviceDelete) | `HKLM\Software\Policies\Microsoft\Windows\DataCollection` | `DisableDeviceDelete` |
| [Disable diagnostic data viewer](https://www.noverse.dev/policies.html?p=DataCollection*DisableDiagnosticDataViewer) | `HKLM\Software\Policies\Microsoft\Windows\DataCollection` | `DisableDiagnosticDataViewer` |
| [Limit Diagnostic Log Collection](https://www.noverse.dev/policies.html?p=DataCollection*LimitDiagnosticLogCollection) | `HKLM\Software\Policies\Microsoft\Windows\DataCollection` | `LimitDiagnosticLogCollection` |
| [Limit Dump Collection](https://www.noverse.dev/policies.html?p=DataCollection*LimitDumpCollection) | `HKLM\Software\Policies\Microsoft\Windows\DataCollection` | `LimitDumpCollection` |
| [Turn off the advertising ID](https://www.noverse.dev/policies.html?p=UserProfiles*DisableAdvertisingId) | `HKLM\Software\Policies\Microsoft\Windows\AdvertisingInfo` | `DisabledByGroupPolicy` |
