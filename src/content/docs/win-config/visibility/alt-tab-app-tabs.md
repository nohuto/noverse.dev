---
slug: 'docs/win-config/visibility/alt-tab-app-tabs'
title: 'Alt-Tab App Tabs'
description: 'Visibility option documentation from win-config.'
editUrl: false
sidebar:
  order: 20
---

Select the amount of recent tabs from apps in the alt+tab menu.

### Don't show tabs

<img src="https://raw.githubusercontent.com/nohuto/win-config/main/visibility/images/0tabs.png" alt="" width="871" height="466" decoding="async">

### 3 Tabs

<img src="https://raw.githubusercontent.com/nohuto/win-config/main/visibility/images/3tabs.png" alt="" width="1071" height="745" loading="lazy" decoding="async">

### 5 Tabs

<img src="https://raw.githubusercontent.com/nohuto/win-config/main/visibility/images/5tabs.png" alt="" width="1069" height="575" loading="lazy" decoding="async">

### 20 Tabs

<img src="https://raw.githubusercontent.com/nohuto/win-config/main/visibility/images/20tabs.png" alt="" width="1070" height="1013" loading="lazy" decoding="async">

## [Windows Policies](https://noverse.dev/policies)

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Configure the inclusion of app tabs into Alt-Tab](https://noverse.dev/policies?p=Multitasking*BrowserAltTabBlowout) | `HKCU\Software\Policies\Microsoft\Windows\Explorer` | `MultiTaskingAltTabFilter` |

The option changes it via `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced`.

## Classic Task Switcher

Restarting the explorer is enough to apply the changes.

### New

<img src="https://raw.githubusercontent.com/nohuto/win-config/main/visibility/images/taskswitchnew.png" alt="" width="2176" height="441" loading="lazy" decoding="async">

### Classic

<img src="https://raw.githubusercontent.com/nohuto/win-config/main/visibility/images/taskswitchold.png" alt="" width="409" height="194" loading="lazy" decoding="async">
