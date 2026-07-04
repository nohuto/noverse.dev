---
title: 'Remove Quick Access'
description: 'Visibility option documentation from win-config.'
editUrl: false
sidebar:
  order: 2
---

Removes the `Quick access` in the File Explorer & sets `Open File Exporer to` to `This PC`.

![](https://github.com/nohuto/win-config/blob/main/visibility/images/quickaccess.png?raw=true)


## [Windows Policies](https://noverse.dev/policies)

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Hide and disable all items on the desktop](https://noverse.dev/policies?p=Desktop*NoDesktop) | `HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer`<br>`HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer` | `NoDesktop` |
| [Do not keep history of recently opened documents](https://noverse.dev/policies?p=StartMenu*NoRecentDocsHistory) | `HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer`<br>`HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer` | `NoRecentDocsHistory` |
| [Prohibit access of the Windows Connect Now wizards](https://noverse.dev/policies?p=WindowsConnectNow*WCN_DisableWcnUi_2) | `HKLM\Software\Policies\Microsoft\Windows\WCN\UI` | `DisableWcnUi` |
