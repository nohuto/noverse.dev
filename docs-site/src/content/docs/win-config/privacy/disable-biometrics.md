---
title: 'Biometrics'
description: 'Privacy option documentation from win-config.'
editUrl: false
sidebar:
  order: 22
---

Biometric is used for fingerprint, facial recognition, and other biometric authentication methods in Windows Hello and related security features.

## Windows Policies

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Allow the use of biometrics](https://www.noverse.dev/policies.html?p=Biometrics*Biometrics_EnableBio) | `HKLM\SOFTWARE\Policies\Microsoft\Biometrics` | `Enabled` |
| [Allow users to log on using biometrics](https://www.noverse.dev/policies.html?p=Biometrics*Biometrics_EnableCredProv) | `HKLM\SOFTWARE\Policies\Microsoft\Biometrics\Credential Provider` | `Enabled` |
| [Allow domain users to log on using biometrics](https://www.noverse.dev/policies.html?p=Biometrics*Biometrics_EnableDomainCredProv) | `HKLM\SOFTWARE\Policies\Microsoft\Biometrics\Credential Provider` | `Domain Accounts` |
| [Configure enhanced anti-spoofing](https://www.noverse.dev/policies.html?p=Biometrics*Face_EnhancedAntiSpoofing) | `HKLM\SOFTWARE\Policies\Microsoft\Biometrics\FacialFeatures` | `EnhancedAntiSpoofing` |
