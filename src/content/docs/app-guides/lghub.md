---
slug: 'docs/app-guides/lghub'
title: 'LGHUB'
description: 'Generated from app-guides file: ./lghub.md.'
editUrl: false
sidebar:
  order: 5
---

Use [OMM](https://support.logi.com/hc/en-us/articles/360059641133-Onboard-Memory-Manager)/[OpenMouse](https://openmouse.app/) for supported mice, and enable '*On Board Memory Mode*'. For headset configuration alternatives are [Equalizer APO](https://sourceforge.net/projects/equalizerapo/) (EQ) & [HeadsetControl](https://github.com/Sapd/HeadsetControl) (battery, sidetone, idle timer).

## App Settings

- Devices
  - Enable On-Board Memory Mode for supported mice
- General Settings
  - General
    - `Launch app on login`: Off
    - `Automatically disable lighting`: On
    - `Game lighting control`: Off
    - `Recommendations`: Off
  - Beta Features
    - `Games`: Off
  - Analytics
    - `Share my usage data`: Off
    - `Send error logs automatically when G HUB encounters issues`: Off

## [LGHUB Toggle](https://github.com/nohuto/app-guides/blob/main/assets/LGHUB-Toggle.ps1)

Script which enables/disables the `LGHUBUpdaterService` service and other drivers, `Enable LGHub` option only enables `LGHUBUpdaterService` since the other drivers aren't required for it to work. '*Uninstall optional drivers*' removes LampArray/virtual input packages.

Additional notes:

- `logi_lamparray_service`: dynamic lighting service
- `logi_joy_*`: virtual input
