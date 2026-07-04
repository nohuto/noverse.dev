---
title: 'Hung Screen'
description: 'System option documentation from win-config.'
editUrl: false
sidebar:
  order: 28
---

Causes hung apps to get automatically get terminated, making the 'Hung program' screen to not show up. It's recommended to leave the timeouts at their default, see 'Windows Internals' section below for more details on each value.

![](https://github.com/nohuto/win-config/blob/main/system/images/hung-program.png?raw=true)

## Registry Values

```c
"HKLM\\SYSTEM\\CurrentControlSet\\Control";
    "WaitToKillServiceTimeout" = 20000; // REG_SZ (ms), SCM timeout used by CSRSS while the SCM notifies services and waits for service cleanup

"HKCU\\Control Panel\\Desktop";
    "WaitToKillTimeout" = 5000; // REG_SZ (ms), time CSRSS waits for a console control handler/process to exit before showing the hung program screen
    "HungAppTimeout" = 5000; // REG_SZ (ms), time CSRSS waits for a GUI thread/process to exit after shutdown messages before seeing it as hung
    "AutoEndTasks" = 0; // REG_SZ (ms), 1 disables the 'Hung program' screen
```

## [Windows Internals](https://github.com/nohuto/Windows-Books/releases/download/7th-Edition/Windows-Internals-E7-P2.pdf)

![](https://github.com/nohuto/win-config/blob/main/system/images/shutdown1.png?raw=true)
![](https://github.com/nohuto/win-config/blob/main/system/images/shutdown2.png?raw=true)
![](https://github.com/nohuto/win-config/blob/main/system/images/shutdown3.png?raw=true)
