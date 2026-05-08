---
title: 'Online Speech Recognition'
description: 'Privacy option documentation from win-config.'
editUrl: false
sidebar:
  order: 28
---

[`HasAccepted`](https://learn.microsoft.com/en-us/windows/privacy/manage-connections-from-windows-operating-system-components-to-microsoft-services#bkmk-priv-speech) disables online speech recognition, voice input to apps like Cortana, and data upload to Microsoft. [`AllowSpeechModelUpdate`](https://learn.microsoft.com/en-us/windows/privacy/manage-connections-from-windows-operating-system-components-to-microsoft-services#bkmk-priv-speech) blocks automatic updates of speech recognition and synthesis models. I found `DisableSpeechInput` randomly while looking for `HasAccepted`, related to mixed reality environments.

## Windows Policies

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Allow Automatic Update of Speech Data](https://www.noverse.dev/policies.html?p=Speech*AllowSpeechModelUpdate) | `HKLM\Software\Policies\Microsoft\Speech` | `AllowSpeechModelUpdate` |
