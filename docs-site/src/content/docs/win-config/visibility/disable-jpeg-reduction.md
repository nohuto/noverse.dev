---
title: 'JPEG Reduction'
description: 'Visibility option documentation from win-config.'
editUrl: false
sidebar:
  order: 29
---

Windows reduces the quality of JPEG images you set as the desktop background to `85%` by default, you can set it to `100%` via the option switch.

### [TranscodeImage](https://github.com/nohuto/win-config/blob/main/system/assets/jpeg-TranscodeImage.c)

```c
if ( (int)SHRegGetDWORD(
            HKEY_CURRENT_USER,
            L"Control Panel\\Desktop",
            L"JPEGImportQuality",
            (unsigned int *)&v38) < 0 )
{
  v17 = FLOAT_85_0;
}
else
{
  v17 = fmaxf((float)(int)v38, 60.0);
  if ( v17 > 100.0 )
    v17 = FLOAT_100_0;
}
```

Default value is `85` -> `85%` (gets used if value isn't present), clamp range is `60-100`, if set above `100` it gets clamped to `100`, if set below `60`, it gets clamped to `60`.
