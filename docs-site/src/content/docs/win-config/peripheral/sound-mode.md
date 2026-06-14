---
title: 'Sound Mode'
description: 'Peripheral option documentation from win-config.'
editUrl: false
sidebar:
  order: 11
---

## Spatial Audio

[Spatial audio](https://www.dolby.com/experience/home-entertainment/articles/what-is-spatial-audio/) positions sounds in 3D space around you, surround sound mainly anchors audio to speaker directions.

![](https://github.com/nohuto/win-config/blob/main/peripheral/images/spatial.jpeg?raw=true)

## Mono/Stereo Audio

Mono combines left and right audio channels into one, stereo uses two channels.

![](https://github.com/nohuto/win-config/blob/main/peripheral/images/mono-stereo.jpeg?raw=true)

## SystemSettings Capture

```c
// System > Sound : Mono audio

// Enabled
HKCU\Software\Microsoft\Multimedia\Audio\AccessibilityMonoMixState	Type: REG_DWORD, Length: 4, Data: 1

// Disabled
HKCU\Software\Microsoft\Multimedia\Audio\AccessibilityMonoMixState	Type: REG_DWORD, Length: 4, Data: 0
```
