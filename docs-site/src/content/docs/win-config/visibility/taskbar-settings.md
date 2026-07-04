---
title: 'Taskbar Settings'
description: 'Visibility option documentation from win-config.'
editUrl: false
sidebar:
  order: 10
---

Removes the search box, moves the taskbar to the left, removes badges, disables the flashes on the app icons, removes the "Task View" button (`Personalization > Taskbar`). See details about the `Add 'End Task' to Taskbar Context Menu` option [here](https://www.youtube.com/watch?v=5HWyyNep6t0).

`TaskbarSd` adds/removes the block in the right corner, which shows the desktop (picture).

![](https://github.com/nohuto/win-config/blob/main/visibility/images/taskbar.png?raw=true)

```json
"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced": {
  "TaskbarDa": { "Type": "REG_DWORD", "Data": 0, "Elevated": true },
```

I removed the value since you can't apply it even with `TrustedInstaller`/`SYSTEM` previledges. Note that the value is still actively used by `SystemSettings`:


```c
// Personalization > Taskbar - Widgets (off)
SystemSettings.exe	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDa	Type: REG_DWORD, Length: 4, Data: 0
```

Disallowing it via the `AllowNewsAndInterests` policy (`EnableFeeds` policy isn't used anymore) won't set `TaskbarDa` to 0, but it grays out & disables the option.

## Suboptions

### Hide Language Bar

![](https://github.com/nohuto/win-config/blob/main/visibility/images/languagebar.png?raw=true)

#### Text Services and Input Languages Captures

`Time & language > Typing > Advanced keyboard settings > Language bar options`:
```c
// Floating On Desktop
RegSetValue	HKCU\Software\Microsoft\CTF\LangBar\ShowStatus	Type: REG_DWORD, Length: 4, Data: 0

// Hidden
RegSetValue	HKCU\Software\Microsoft\CTF\LangBar\ShowStatus	Type: REG_DWORD, Length: 4, Data: 3

// Docked in the taskbar
RegSetValue	HKCU\Software\Microsoft\CTF\LangBar\ShowStatus	Type: REG_DWORD, Length: 4, Data: 4
```

`Show the Language bar as transparent when inactive`:
```c
// Enabled
RegSetValue	HKCU\Software\Microsoft\CTF\LangBar\Transparency	Type: REG_DWORD, Length: 4, Data: 64

// Disabled
RegSetValue	HKCU\Software\Microsoft\CTF\LangBar\Transparency	Type: REG_DWORD, Length: 4, Data: 255
```

`Show additional Language bar icons in the taskbar`:
```c
// Enabled
RegSetValue	HKCU\Software\Microsoft\CTF\LangBar\ExtraIconsOnMinimized	Type: REG_DWORD, Length: 4, Data: 1

// Disabled
RegSetValue	HKCU\Software\Microsoft\CTF\LangBar\ExtraIconsOnMinimized	Type: REG_DWORD, Length: 4, Data: 0
```

`Show text labels on the Language bar`:
```c
// Enabled
RegSetValue	HKCU\Software\Microsoft\CTF\LangBar\Label	Type: REG_DWORD, Length: 4, Data: 1

// Disabled
RegSetValue	HKCU\Software\Microsoft\CTF\LangBar\Label	Type: REG_DWORD, Length: 4, Data: 0
```

### System Clock Seconds

"*Uses more power*" (in relation to laptops).

![](https://github.com/nohuto/win-config/blob/main/visibility/images/clock.png?raw=true)

## [Windows Policies](https://noverse.dev/policies)

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Allow widgets](https://noverse.dev/policies?p=NewsAndInterests*AllowNewsAndInterests) | `HKLM\SOFTWARE\Policies\Microsoft\Dsh` | `AllowNewsAndInterests` |
| [Disable Widgets On Lock Screen](https://noverse.dev/policies?p=NewsAndInterests*DisableWidgetsOnLockScreen) | `HKLM\SOFTWARE\Policies\Microsoft\Dsh` | `DisableWidgetsOnLockScreen` |
| [Disable Widgets Board](https://noverse.dev/policies?p=NewsAndInterests*DisableWidgetsBoard) | `HKLM\SOFTWARE\Policies\Microsoft\Dsh` | `DisableWidgetsBoard` |
| [Remove the People Bar from the taskbar](https://noverse.dev/policies?p=StartMenu*HidePeopleBar) | `HKCU\Software\Policies\Microsoft\Windows\Explorer` | `HidePeopleBar` |
| [Hide the TaskView button](https://noverse.dev/policies?p=Taskbar*HideTaskViewButton) | `HKLM\Software\Policies\Microsoft\Windows\Explorer`<br>`HKCU\Software\Policies\Microsoft\Windows\Explorer` | `HideTaskViewButton` |
| [Configures search on the taskbar](https://noverse.dev/policies?p=Search*ConfigureSearchOnTaskbarMode) | `HKLM\Software\Policies\Microsoft\Windows\Windows Search` | `SearchOnTaskbarMode` |
