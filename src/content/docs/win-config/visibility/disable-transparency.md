---
slug: 'docs/win-config/visibility/disable-transparency'
title: 'Transparency'
description: 'Visibility option documentation from win-config.'
editUrl: false
sidebar:
  order: 9
---

See [DWM, `BackdropBlurCachingThrottleMs`](https://noverse.dev/docs/win-config/system/dwm-values/#backdropblurcachingthrottlems) for information on the minimum time before cached blur outputs are marked dirty again.

```c
"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize";
    "EnableTransparency" = 1; // REG_DWORD, 0 = solid BG
    "EnableBlurBehind" = 0; // REG_DWORD, SharedUtilities.dll BatteryService::IsBlurEnabled
```

### Transparency Enabled

<img src="https://raw.githubusercontent.com/nohuto/win-config/main/visibility/images/transpa1.png" alt="" width="1382" height="821" decoding="async">

### Transparency Disabled

<img src="https://raw.githubusercontent.com/nohuto/win-config/main/visibility/images/transpa2.png" alt="" width="1378" height="839" loading="lazy" decoding="async">
