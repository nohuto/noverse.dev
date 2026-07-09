---
title: 'Taskbar Settings'
description: 'Visibility option documentation from win-config.'
editUrl: false
sidebar:
  order: 10
---

Removes the search box, moves the taskbar to the left, removes badges, disables the flashes on the app icons, removes the "Task View" button (`Personalization > Taskbar`). See details about the `Add 'End Task' to Taskbar Context Menu` option [here](https://www.youtube.com/watch?v=5HWyyNep6t0).

### SystemSettings Captures

```c
// SystemSettings > Personalization > Taskbar

  // Taskbar items
    // Search
    // Hide
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Search\SearchboxTaskbarMode	Type: REG_DWORD, Length: 4, Data: 0
    // Search icon only
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Search\SearchboxTaskbarMode	Type: REG_DWORD, Length: 4, Data: 1
    // Search icon and label
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Search\SearchboxTaskbarMode	Type: REG_DWORD, Length: 4, Data: 3
    // Search box
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Search\SearchboxTaskbarMode	Type: REG_DWORD, Length: 4, Data: 2

    // Task view
    // Enabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowTaskViewButton	Type: REG_DWORD, Length: 4, Data: 1
    // Disabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowTaskViewButton	Type: REG_DWORD, Length: 4, Data: 0

    // Widgets
    // Enabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDa	Type: REG_DWORD, Length: 4, Data: 1
    // Disabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDa	Type: REG_DWORD, Length: 4, Data: 0

  // System Tray icons
    // Emoji and more
    // Never
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\TabletTip\1.7\EmojiAndMoreIconVisibilityState	Type: REG_DWORD, Length: 4, Data: 0
    // While typing
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\TabletTip\1.7\EmojiAndMoreIconVisibilityState	Type: REG_DWORD, Length: 4, Data: 1
    // Always
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\TabletTip\1.7\EmojiAndMoreIconVisibilityState	Type: REG_DWORD, Length: 4, Data: 2

    // Pen menu
    // Enabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\PenWorkspace\PenWorkspaceButtonDesiredVisibility	Type: REG_DWORD, Length: 4, Data: 1
    // Disabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\PenWorkspace\PenWorkspaceButtonDesiredVisibility	Type: REG_DWORD, Length: 4, Data: 0

    // Touch keyboard
    // Never
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\TabletTip\1.7\TipbandDesiredVisibility	Type: REG_DWORD, Length: 4, Data: 0
    // Always
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\TabletTip\1.7\TipbandDesiredVisibility	Type: REG_DWORD, Length: 4, Data: 1
    // When no keyboard attached
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\TabletTip\1.7\TipbandDesiredVisibility	Type: REG_DWORD, Length: 4, Data: 2

  // Other system tray icons
    // Hidden icon menu
    // Enabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\TrayNotify\SystemTrayChevronVisibility	Type: REG_DWORD, Length: 4, Data: 1
    // Disabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\TrayNotify\SystemTrayChevronVisibility	Type: REG_DWORD, Length: 4, Data: 0

    // Microsoft OneDrive
    // Enabled
    SystemSettings.exe	RegSetValue	HKCU\Control Panel\NotifyIconSettings\1393818165748543931\IsPromoted	Type: REG_DWORD, Length: 4, Data: 1
    // Disabled
    SystemSettings.exe	RegSetValue	HKCU\Control Panel\NotifyIconSettings\1393818165748543931\IsPromoted	Type: REG_DWORD, Length: 4, Data: 0

    // Windows Security notification icon
    // Enabled
    SystemSettings.exe	RegSetValue	HKCU\Control Panel\NotifyIconSettings\9970533644875679773\IsPromoted	Type: REG_DWORD, Length: 4, Data: 1
    // Disabled
    SystemSettings.exe	RegSetValue	HKCU\Control Panel\NotifyIconSettings\9970533644875679773\IsPromoted	Type: REG_DWORD, Length: 4, Data: 0

  // Taskbar behaviours
    // Taskbar alignment
    // Left
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarAl	Type: REG_DWORD, Length: 4, Data: 0
    // Center
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarAl	Type: REG_DWORD, Length: 4, Data: 1

    // Show badges on taskbar apps
    // Enabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarBadges	Type: REG_DWORD, Length: 4, Data: 1
    // Disabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarBadges	Type: REG_DWORD, Length: 4, Data: 0

    // Show flashing on taskbar apps
    // Enabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarFlashing	Type: REG_DWORD, Length: 4, Data: 1
    // Disabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarFlashing	Type: REG_DWORD, Length: 4, Data: 0

    // Share any window from my taskbar
    // Enabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarSn	Type: REG_DWORD, Length: 4, Data: 1
    // Disabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarSn	Type: REG_DWORD, Length: 4, Data: 0

    // Select the far corner of the taskbar to show the desktop
    // Enabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarSd	Type: REG_DWORD, Length: 4, Data: 1
    // Disabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarSd	Type: REG_DWORD, Length: 4, Data: 0

    // Combine taskbar buttons and hide labels (same for the one below but it uses value name MMTaskbarGlomLevel)
    // Always
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarGlomLevel	Type: REG_DWORD, Length: 4, Data: 0
    // When taskbar is full
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarGlomLevel	Type: REG_DWORD, Length: 4, Data: 1
    // Never
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarGlomLevel	Type: REG_DWORD, Length: 4, Data: 2

    // Show smaller taskbar buttons
    // Always
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\IconSizePreference	Type: REG_DWORD, Length: 4, Data: 0
    // When taskbar is full
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\IconSizePreference	Type: REG_DWORD, Length: 4, Data: 2
    // Never
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\IconSizePreference	Type: REG_DWORD, Length: 4, Data: 1


// SystemSettings > Time & language > Date & time

  // Show time and date in the System tray
  // Enabled
  SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowSystrayDateTimeValueName	Type: REG_DWORD, Length: 4, Data: 1
    // Show seconds in system tray clock (uses more power)
    // Enabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowSecondsInSystemClock	Type: REG_DWORD, Length: 4, Data: 1
    // Disabled
    SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowSecondsInSystemClock	Type: REG_DWORD, Length: 4, Data: 0

  // Disabled
  SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowSystrayDateTimeValueName	Type: REG_DWORD, Length: 4, Data: 0

// Taskbar

  // Lock the taskbar
  // Enabled
  Explorer.EXE	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarSizeMove	Type: REG_DWORD, Length: 4, Data: 0
  // Disabled
  Explorer.EXE	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarSizeMove	Type: REG_DWORD, Length: 4, Data: 1

// SystemSettings > System > Advanced

  // End Task
  // Enabled
  SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings\TaskbarEndTask	Type: REG_DWORD, Length: 4, Data: 1
  // Disabled
  SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings\TaskbarEndTask	Type: REG_DWORD, Length: 4, Data: 0


```

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
