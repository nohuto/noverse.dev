---
title: 'Deny App Access'
description: 'Privacy option documentation from win-config.'
editUrl: false
sidebar:
  order: 24
---

Denies the access for everything, only leaving the microphone enabled. See JSON content below for details. Note `Deny 'User Info Access'` = prevents users from managing the ability to allow apps (not desktop apps) to access the user name, account picture, and domain information - this option doesn't get applied via the main option.

Adding the `Deny` data in `HKLM` is probably enough, but the keys also exist in `HKCU` - Windows only edits it in `HKLM`, examples:
```c
// Notifications
svchost.exe	RegSetValue	HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\userNotificationListener\Value	Type: REG_SZ, Length: 10, Data: Deny

// Contacts
svchost.exe	RegSetValue	HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\contacts\Value	Type: REG_SZ, Length: 10, Data: Deny

// Pictures
svchost.exe	RegSetValue	HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\picturesLibrary\Value	Type: REG_SZ, Length: 10, Data: Deny
```

![](https://github.com/nohuto/win-config/blob/main/privacy/images/appaccess.png?raw=true)

## Windows Policies

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Let Windows apps access account information](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessAccountInfo) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessAccountInfo` |
| [Let Windows apps access the calendar](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessCalendar) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessCalendar` |
| [Let Windows apps access call history](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessCallHistory) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessCallHistory` |
| [Let Windows apps access the camera](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessCamera) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessCamera` |
| [Let Windows apps access contacts](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessContacts) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessContacts` |
| [Let Windows apps access email](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessEmail) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessEmail` |
| [Let Windows apps make use of Text and image generation features of Windows](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessSystemAIModels) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessSystemAIModels` |
| [Let Windows apps take screenshots of various windows or displays](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessGraphicsCaptureProgrammatic) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessGraphicsCaptureProgrammatic` |
| [Let Windows apps turn off the screenshot border](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessGraphicsCaptureWithoutBorder) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessGraphicsCaptureWithoutBorder` |
| [Let Windows apps access presence sensing](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessHumanPresence) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessHumanPresence` |
| [Let Windows apps access location](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessLocation) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessLocation` |
| [Let Windows apps access messaging](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessMessaging) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessMessaging` |
| [Let Windows apps access the microphone](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessMicrophone) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessMicrophone` |
| [Let Windows apps access motion](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessMotion) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessMotion` |
| [Let Windows apps access notifications](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessNotifications) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessNotifications` |
| [Let Windows apps make phone calls](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessPhone) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessPhone` |
| [Let Windows apps control radios](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessRadios) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessRadios` |
| [Let Windows apps communicate with unpaired devices](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsSyncWithDevices) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsSyncWithDevices` |
| [Let Windows apps access Tasks](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessTasks) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessTasks` |
| [Let Windows apps access trusted devices](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessTrustedDevices) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessTrustedDevices` |
| [Let Windows apps access diagnostic information about other apps](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsGetDiagnosticInfo) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsGetDiagnosticInfo` |
| [Let Windows apps access an eye tracker device](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessGazeInput) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessGazeInput` |
| [Let Windows apps activate with voice](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsActivateWithVoice) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsActivateWithVoice` |
| [Let Windows apps activate with voice while the system is locked](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsActivateWithVoiceAboveLock) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsActivateWithVoiceAboveLock` |
| [Let Windows apps access user movements while running in the background](https://www.noverse.dev/policies.html?p=AppPrivacy*LetAppsAccessBackgroundSpatialPerception) | `HKLM\Software\Policies\Microsoft\Windows\AppPrivacy` | `LetAppsAccessBackgroundSpatialPerception` |
| [User management of sharing user name, account picture, and domain information with apps (not desktop apps)](https://www.noverse.dev/policies.html?p=UserProfiles*UserInfoAccessAction) | `HKLM\Software\Policies\Microsoft\Windows\System` | `AllowUserInfoAccess` |
| [Let Windows apps access cellular data](https://www.noverse.dev/policies.html?p=wwansvc*LetAppsAccessCellularData) | `HKLM\Software\Policies\Microsoft\Windows\WwanSvc\CellularDataAccess` | `LetAppsAccessCellularData` |
