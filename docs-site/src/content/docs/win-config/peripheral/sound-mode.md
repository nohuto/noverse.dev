---
title: 'Sound Mode'
description: 'Peripheral option documentation from win-config.'
editUrl: false
sidebar:
  order: 13
---

## Spatial Audio

[Spatial audio](https://www.dolby.com/experience/home-entertainment/articles/what-is-spatial-audio/) positions sounds in 3D space around you, surround sound mainly anchors audio to speaker directions.

![](https://github.com/nohuto/win-config/blob/main/peripheral/images/spatial.jpeg?raw=true)

### Registry Values

See '[Audio Values](https://noverse.dev/docs/win-config/peripheral/audio-values/)' for other related values.

```c
"HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Audio";
  // BlockSpatialAudioRegistryGates
  "DisableSpatialAudioGlobal" = 0; // REG_DWORD (bool)
  "DisableSpatialAudioPerEndpoint" = 1; // REG_DWORD (bool), nonzero = PKEY_Endpoint_SpatialNotAllowed
  "DisableSpatialAudioVssFeature" = 0; // REG_DWORD (bool)
  "SpatialAudioHrtfOnByDefault" = 0; // REG_DWORD (bool)

  // IsSpatialComboEndpointDeterminationDisabled
  "DisableSpatialOnComboEndpoints" = 1; // REG_DWORD (bool)

"HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Audio\\Policy\\Spatial";
  // AtmosCheck::GetSpatialAudioLicenseGracePeriodInMs
  "SpatialAudioLicenseCheckStartDelay" = 5; // REG_DWORD, range 1-900000 ms, 0/>900000 = 5 ms

  // IsMultiUserSKU
  "SpatialAudioLicenseCheckRequiresUserContext" = 0; // REG_DWORD (bool)
```

- [BlockSpatialAudioRegistryGates](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/audiosrv/BlockSpatialAudioRegistryGates.c)
- [IsSpatialComboEndpointDeterminationDisabled](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/audiosrv/IsSpatialComboEndpointDeterminationDisabled.c)
- [GetSpatialAudioLicenseGracePeriodInMs](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/audiosrv/-GetSpatialAudioLicenseGracePeriodInMs@AtmosCheck@@CAHXZ.c)
- [IsMultiUserSKU](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/audiosrv/-IsMultiUserSKU@@YA_NXZ.c)

## Mono/Stereo Audio

Mono combines left and right audio channels into one, stereo uses two channels.

![](https://github.com/nohuto/win-config/blob/main/peripheral/images/mono-stereo.jpg?raw=true)

## SystemSettings Capture

```c
// System > Sound : Mono audio

// Enabled
HKCU\Software\Microsoft\Multimedia\Audio\AccessibilityMonoMixState	Type: REG_DWORD, Length: 4, Data: 1

// Disabled
HKCU\Software\Microsoft\Multimedia\Audio\AccessibilityMonoMixState	Type: REG_DWORD, Length: 4, Data: 0
```
