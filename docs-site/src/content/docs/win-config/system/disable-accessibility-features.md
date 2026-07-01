---
title: 'Accessibility Features'
description: 'System option documentation from win-config.'
editUrl: false
sidebar:
  order: 20
---

Disables all kind of accessibility features such as `Voice Access`, `Live Captions`, `Narrator`, `Magnifier`, `OSK` etc. (`SystemSettings > Accessibility`/`Control Panel > All Control Panel Items > Ease of Access Center`). Specific features can be enabled via the suboptions.

## Suboptions

| Suboption | Description |
| --- | --- |
| Audio Description | Hear descriptions of what's happening in videos (when available). |
| Dynamic Scrollbars | "Always show scrollbars", `On` dynamically hide them. |
| [Voice Access](https://support.microsoft.com/en-us/topic/use-voice-access-to-control-your-pc-author-text-with-your-voice-4dcd23ee-f1b9-4fd1-bacc-862ab611f55d) | Modern voice command feature to help you interact with your PC and dictate text. |
| Live Captions | Audio and video will be captioned live on your screen. |
| Notification Box Visbility Time | Time how long the Windows notification boxes should stay opened. |
| Narrator | Narrator reads aloud any text on the screen. You will need speakers. |
| Sound Sentry | Visual notifications for sounds (this option chooses 'None' as visual warning). |
| Color Filters | "Use a color filter to make colors on your screen easier to see and differentiate." |
| Magnifier | Magnifier zooms in anywhere on the screen, and makes everything in that area larger. You can move Magnifier around, lock it in one place, or resize it. |
| On-Screen Keyboard | Tyoe using the mouse or another pointing device such as a joystick by selecting keys from a picture of a keyboard. |
| [Accessibility Insights Telemetry](https://github.com/microsoft/accessibility-insights-windows/blob/main/docs/TelemetryOverview.md#control-of-telemery) | "Accessibility Insights for Windows uses telemetry to better understand what features are most helpful to users, as well as to help identify potential issues that users are experiencing." |

## SystemSettings Captures

Not complete yet, will be extended over time.

```c
// Accessibility > Visual effects

  // Always show scrollbars
  // Enabled
  HKCU\Control Panel\Accessibility\DynamicScrollbars	Type: REG_DWORD, Length: 4, Data: 0
  // Disabled
  HKCU\Control Panel\Accessibility\DynamicScrollbars	Type: REG_DWORD, Length: 4, Data: 1

  // Transparency effects
  // Enabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize\EnableTransparency	Type: REG_DWORD, Length: 4, Data: 1
  // Disabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize\EnableTransparency	Type: REG_DWORD, Length: 4, Data: 0

  // Animation effects (https://noverse.dev/docs/win-config/visibility/optimize-visual-effects/#userpreferencesmask)
  // Enabled
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 92 12 07 80 10 00 00 00
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 96 12 07 80 10 00 00 00
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 9E 12 07 80 10 00 00 00
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 9E 16 07 80 10 00 00 00
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 9E 1E 07 80 10 00 00 00
  HKCU\Control Panel\Desktop\WindowMetrics\MinAnimate	Type: REG_SZ, Length: 4, Data: 1
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 9E 1E 07 80 12 00 00 00
  // Disabled
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 9C 1E 07 80 12 00 00 00
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 98 1E 07 80 12 00 00 00
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 90 1E 07 80 12 00 00 00
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 90 1A 07 80 12 00 00 00
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 90 12 07 80 12 00 00 00
  HKCU\Control Panel\Desktop\WindowMetrics\MinAnimate	Type: REG_SZ, Length: 4, Data: 0
  HKCU\Control Panel\Desktop\UserPreferencesMask	Type: REG_BINARY, Length: 8, Data: 90 12 07 80 10 00 00 00

  // Dismiss notifications after this amount of time
  // 5 seconds
  HKCU\Control Panel\Accessibility\MessageDuration	Type: REG_DWORD, Length: 4, Data: 5
  // 5 minutes
  HKCU\Control Panel\Accessibility\MessageDuration	Type: REG_DWORD, Length: 4, Data: 300

// Accessibility > Mouse pointer and touch

  // Size
  // 1
  SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Accessibility\CursorSize	Type: REG_DWORD, Length: 4, Data: 1
  // 2
  SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Accessibility\CursorSize	Type: REG_DWORD, Length: 4, Data: 2

  // Touch indicator
  // Enabled
  SystemSettings.exe	RegSetValue	HKCU\Control Panel\Cursors\ContactVisualization	Type: REG_DWORD, Length: 4, Data: 1
  SystemSettings.exe	RegSetValue	HKCU\Control Panel\Cursors\GestureVisualization	Type: REG_DWORD, Length: 4, Data: 31
    // Make the circle darker and larger
    SystemSettings.exe	RegSetValue	HKCU\Control Panel\Cursors\ContactVisualization	Type: REG_DWORD, Length: 4, Data: 2
  // Disabled
  SystemSettings.exe	RegSetValue	HKCU\Control Panel\Cursors\ContactVisualization	Type: REG_DWORD, Length: 4, Data: 0
  SystemSettings.exe	RegSetValue	HKCU\Control Panel\Cursors\GestureVisualization	Type: REG_DWORD, Length: 4, Data: 2

// Accessibility > Text cursor

  // Text cursor indicator
  // Enabled
  SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows NT\CurrentVersion\Accessibility\Configuration	Type: REG_SZ, Length: 32, Data: cursorindicator
  // Disabled
  SystemSettings.exe	RegSetValue	HKCU\Software\Microsoft\Windows NT\CurrentVersion\Accessibility\Configuration	Type: REG_SZ, Length: 2, Data: 
```
