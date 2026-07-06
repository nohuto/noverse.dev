---
title: 'Classic Context Menu'
description: 'Visibility option documentation from win-config.'
editUrl: false
sidebar:
  order: 16
---

Use it on W11, unless you like the new menu. This works via causing COM to not load the DLL for the `{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}` CLSID by making [ImprocServer32](https://learn.microsoft.com/en-us/windows/win32/com/inprocserver32) empty.

```c
[HKEY_CLASSES_ROOT\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}]
@="File Explorer Context Menu"

[HKEY_CLASSES_ROOT\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InProcServer32]
@="C:\\Windows\\System32\\Windows.UI.FileExplorer.dll" // enabling would caus it to be empty
```

### Default

![](https://github.com/nohuto/win-config/blob/main/visibility/images/classiconb.png?raw=true)

### Old

![](https://github.com/nohuto/win-config/blob/main/visibility/images/classicona.png?raw=true)
