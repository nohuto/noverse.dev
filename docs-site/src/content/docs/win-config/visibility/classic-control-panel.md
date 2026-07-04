---
title: 'Classic Control Panel'
description: 'Visibility option documentation from win-config.'
editUrl: false
sidebar:
  order: 24
---

> "*This policy setting controls the default Control Panel view, whether by category or icons. If this policy setting is enabled, the Control Panel opens to the icon view. If this policy setting is disabled, the Control Panel opens to the category view.*"

### Icon View

![](https://github.com/nohuto/win-config/blob/main/visibility/images/panel0.png?raw=true)

### Category View

![](https://github.com/nohuto/win-config/blob/main/visibility/images/panel1.png?raw=true)

## 'New' Context Menu

Instead of creating a `.txt` file, then renaming it to e.g. `.bat` / `.ps1`, you can add these options to the 'new' context menu. This may also change the `Type` shown in the explorer (only `.bat` is affected of the three).

`Remove 'Add to Favorites' Option`, `Remove 'Share' Option`, `Remove 'Send to' Option`, `Remove 'bmp'/'zip' Options` don't have a revert yet.

![](https://github.com/nohuto/win-config/blob/main/visibility/images/newcontext1.png?raw=true)
![](https://github.com/nohuto/win-config/blob/main/visibility/images/newcontext2.png?raw=true)

## [Windows Policies](https://noverse.dev/policies)

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Always open All Control Panel Items when opening Control Panel](https://noverse.dev/policies?p=ControlPanel*ForceClassicControlPanel) | `HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer` | `ForceClassicControlPanel` |
