---
slug: 'docs/win-config/peripheral/device-manager'
title: 'Device Manager'
description: 'Peripheral option documentation from win-config.'
editUrl: false
sidebar:
  order: 16
---

The `Clean Up` botton removes non present devices (`-PresentOnly:$false`/`Status -eq 'Unknown'`) via `/remove-device` ([`pnputil`](https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/pnputil-command-syntax)).
