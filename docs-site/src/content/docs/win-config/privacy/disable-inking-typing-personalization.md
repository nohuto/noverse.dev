---
title: 'Inking & Typing Personalization'
description: 'Privacy option documentation from win-config.'
editUrl: false
sidebar:
  order: 26
---

Used for better suggestions by creating a custom dictionary using your typing history and handwriting patterns. Disables autocorrection of misspelled words, highlight of misspelled words, and typing insights - would use AI to suggest words, autocorrect spelling mistakes etc. (`Privacy & security > Inking & typing personalization` & `Time & Language > Typing`).

```
\Registry\Machine\SOFTWARE\Microsoft\INPUT\TIPC : Enabled
\Registry\User\.Default\SOFTWARE\Microsoft\INPUT\TIPC : Enabled
\Registry\User\S-ID\SOFTWARE\Microsoft\INPUT\TIPC : Enabled
```

![](https://github.com/nohuto/win-config/blob/main/privacy/images/inking.png?raw=true)

## Windows Policies

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Allow users to enable online speech recognition services](https://www.noverse.dev/policies.html?p=Globalization*AllowInputPersonalization) | `HKLM\Software\Policies\Microsoft\InputPersonalization` | `AllowInputPersonalization` |
| [Improve inking and typing recognition](https://www.noverse.dev/policies.html?p=TextInput*AllowLinguisticDataCollection) | `HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\TextInput` | `AllowLinguisticDataCollection` |
| [Allow Windows Ink Workspace](https://www.noverse.dev/policies.html?p=WindowsInkWorkspace*AllowWindowsInkWorkspace) | `HKLM\Software\Policies\Microsoft\WindowsInkWorkspace` | `AllowWindowsInkWorkspace` |
| [Allow suggested apps in Windows Ink Workspace](https://www.noverse.dev/policies.html?p=WindowsInkWorkspace*AllowSuggestedAppsInWindowsInkWorkspace) | `HKLM\Software\Policies\Microsoft\WindowsInkWorkspace` | `AllowSuggestedAppsInWindowsInkWorkspace` |
