---
title: 'Audio Ducking'
description: 'Peripheral option documentation from win-config.'
editUrl: false
sidebar:
  order: 11
---

> "*Windows audio ducking is a dynamic audio processing technique that enables the automatic adjustment of audio levels between different audio sources on a Windows-based computer or operating system.*"
>
> — EaseUS, [Windows audio ducking](https://multimedia.easeus.com/ai-article/windows-audio-ducking.html)

Can be disabled manually via `mmsys.cpl > Communications` `Do nothing`.

## Registry Value

See '[Audio Values](https://noverse.dev/docs/win-config/peripheral/audio-values/)' for other related values.

```c
"HKCU\\Software\\Microsoft\\Multimedia\\Audio";
  // LoadUserSettings
  "UserDuckingPreference" = 1; // REG_DWORD, range 0-3, >3 = 1
                               // 0 = -96 dB
                               // 1 = -18 dB
                               // 2 = -6 dB
                               // 3 = 0 dB
```

```c
float __fastcall CDuckingManager::GetdBFromUserPreference(int a1)
{
  int v1; // ecx

  if ( !a1 )
    return FLOAT_N96_0; // 0
  v1 = a1 - 1;
  if ( !v1 )
    return FLOAT_N18_0; // 1, should be FLOAT_N14_0
  if ( v1 == 1 )
    return FLOAT_N6_0; // 2
  return 0.0; // 3
}
```

Fun fact: the `Reduce the volume of other sounds by 80%` audio ducking option isn't accurate at all (it's ~87%).

- [LoadUserSettings](https://github.com/nohuto/decompiled-pseudocode/tree/main/11-23H2/AudioSrvPolicyManager/-LoadUserSettings@@YAXPEAVTSSession@@PEAUHKEY__@@@Z.c)

## MMSYS Capture

Capture of `control mmsys.cpl,,3`.

```c
// Mute all other sounds
HKCU\Software\Microsoft\Multimedia\Audio\UserDuckingPreference	Type: REG_DWORD, Length: 4, Data: 0

// Reduce the volume of other sounds by 80% (default)
HKCU\Software\Microsoft\Multimedia\Audio\UserDuckingPreference	Type: REG_DWORD, Length: 4, Data: 1

// Reduce the volume of other sounds by 50%
HKCU\Software\Microsoft\Multimedia\Audio\UserDuckingPreference	Type: REG_DWORD, Length: 4, Data: 2

// Do nothing
HKCU\Software\Microsoft\Multimedia\Audio\UserDuckingPreference	Type: REG_DWORD, Length: 4, Data: 3
```
