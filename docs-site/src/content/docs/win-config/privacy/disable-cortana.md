---
title: 'Cortana'
description: 'Privacy option documentation from win-config.'
editUrl: false
sidebar:
  order: 36
---

"[Cortana](https://en.wikipedia.org/wiki/Cortana_(virtual_assistant)) was a virtual assistant developed by Microsoft that used the Bing search engine to perform tasks such as setting reminders and answering questions for users."

## [Windows Policies](https://www.noverse.dev/policies.html)

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Allow Cortana](https://www.noverse.dev/policies.html?p=Search*AllowCortana) | `HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search` | `AllowCortana` |
| [Allow Cortana above lock screen](https://www.noverse.dev/policies.html?p=Search*AllowCortanaAboveLock) | `HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search` | `AllowCortanaAboveLock` |
| [Allow search and Cortana to use location](https://www.noverse.dev/policies.html?p=Search*AllowSearchToUseLocation) | `HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search` | `AllowSearchToUseLocation` |
| [Allow Cloud Search](https://www.noverse.dev/policies.html?p=Search*AllowCloudSearch) | `HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search` | `AllowCloudSearch` |
| [Allow Cortana Page in OOBE on an AAD account](https://www.noverse.dev/policies.html?p=Search*AllowCortanaInAAD) | `HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search\AllowCortanaInAAD` | `AllowCortanaInAADPathOOBE` |

## Miscellaneous Notes
```c
"HKCU\Software\Microsoft\Windows\CurrentVersion\Cortana\DevOverrideOneSettings","Length: 16"
"HKCU\Software\Microsoft\Windows\CurrentVersion\Cortana\IsAvailable","Type: REG_DWORD, Length: 4, Data: 1"
```
