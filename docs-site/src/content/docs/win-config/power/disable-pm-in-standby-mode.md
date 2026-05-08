---
title: 'PM in Standby Mode'
description: 'Power option documentation from win-config.'
editUrl: false
sidebar:
  order: 14
---

This policy setting specifies that power management is disabled when the machine enters connected standby mode.
- If this policy setting is enabled, Windows Connection Manager doesn't manage adapter radios to reduce power consumption when the machine enters connected standby mode.
- If this policy setting isn't configured or is disabled, power management is enabled when the machine enters connected standby mode.

## Suboption

`Disable Modern Standby`:
```c
"HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power"; 
    "MSDisabled" = 1; // PopModernStandbyDisabled

"HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\ModernSleep";
    "EnabledActions" = 0; // PopAggressiveStandbyActionsRegValue 
    "EnableDsNetRefresh" = 0; // PopEnableDsNetRefresh 
```

## Windows Policies

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Disable power management in connected standby mode](https://www.noverse.dev/policies.html?p=WCM*WCM_DisablePowerManagement) | `HKLM\Software\Policies\Microsoft\Windows\WcmSvc\GroupPolicy` | `fDisablePowerManagement` |
