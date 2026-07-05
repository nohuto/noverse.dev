---
title: 'Bluetooth'
description: 'Peripheral option documentation from win-config.'
editUrl: false
sidebar:
  order: 15
---

Polic CSP - [Connectivity](https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-connectivity#allowbluetooth) & [Bluetooth](https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-bluetooth#allowprepairing).

### AllowBluetooth

Allows the user to enable Bluetooth or restrict access.

| Value | Description |
| --- | --- |
| 0 | Disallow Bluetooth. If this is set to 0, the radio in the Bluetooth control panel will be grayed out and the user won't be able to turn Bluetooth on. |
| 2 (Default) | Allow Bluetooth. If this is set to 2, the radio in the Bluetooth control panel will be functional and the user will be able to turn Bluetooth on. |

```powershell
$ rg -i 'AllowBluetooth' "C:\Users\nohuto\Desktop\regkit\records\23H2.txt"
9893:\Registry\Machine\SOFTWARE\Microsoft\PolicyManager\Default\Connectivity\AllowBluetooth : 30Value
9894:\Registry\Machine\SOFTWARE\Microsoft\PolicyManager\Default\Connectivity\AllowBluetooth : ADMXMetadataBoth
9895:\Registry\Machine\SOFTWARE\Microsoft\PolicyManager\Default\Connectivity\AllowBluetooth : ADMXMetadataDevice
9896:\Registry\Machine\SOFTWARE\Microsoft\PolicyManager\Default\Connectivity\AllowBluetooth : ADMXMetadataUser
9897:\Registry\Machine\SOFTWARE\Microsoft\PolicyManager\Default\Connectivity\AllowBluetooth : Behavior
9898:\Registry\Machine\SOFTWARE\Microsoft\PolicyManager\Default\Connectivity\AllowBluetooth : MergeAlgorithm
9899:\Registry\Machine\SOFTWARE\Microsoft\PolicyManager\Default\Connectivity\AllowBluetooth : PolicyType
9900:\Registry\Machine\SOFTWARE\Microsoft\PolicyManager\Default\Connectivity\AllowBluetooth : RegKeyPathRedirect
9901:\Registry\Machine\SOFTWARE\Microsoft\PolicyManager\Default\Connectivity\AllowBluetooth : RegKeyPathRedirectMapped
9902:\Registry\Machine\SOFTWARE\Microsoft\PolicyManager\Default\Connectivity\AllowBluetooth : Value
9903:\Registry\Machine\SOFTWARE\Microsoft\PolicyManager\Default\Connectivity\AllowBluetooth : grouppolicyname
```

### AllowDiscoverableMode

Specifies whether other Bluetooth-enabled devices can discover the device.

| Value | Description |
| --- | --- |
| 0 | Not allowed. When set to 0, other devices won't be able to detect the device. To verify, open the Bluetooth control panel on the device. Then, go to another Bluetooth-enabled device, open the Bluetooth control panel, and verify that you can't see the name of the device. |
| 1 (Default) | Allowed. When set to 1, other devices will be able to detect the device. To verify, open the Bluetooth control panel on the device. Then, go to another Bluetooth-enabled device, open the Bluetooth control panel and verify that you can discover it. |

### AllowPrepairing

Specifies whether to allow specific bundled Bluetooth peripherals to automatically pair with the host device.

| Value | Description |
| --- | --- |
| 0 | Not allowed. |
| 1 (Default) | Allowed. |

## Services/Drivers

| Service/Driver | Description |
| --- | --- |
| `BluetoothUserService_*` | The Bluetooth user service supports proper functionality of Bluetooth features relevant to each user session. |
| `BTAGService` | Service supporting the audio gateway role of the Bluetooth Handsfree Profile. |
| `BthA2dp` | Microsoft Bluetooth A2dp driver |
| `BthAvctpSvc` | This is Audio Video Control Transport Protocol service |
| `BthEnum` | Bluetooth Enumerator Service |
| `BthHFEnum` | Microsoft Bluetooth Hands-Free Profile driver |
| `BthLEEnum` | Bluetooth Low Energy Driver |
| `BthMini` | Bluetooth Radio Driver |
| `BTHMODEM` | Bluetooth Modem Communications Driver |
| `BTHPORT` | Bluetooth Port Driver |
| `bthserv` | The Bluetooth service supports discovery and association of remote Bluetooth devices. Stopping or disabling this service may cause already installed Bluetooth devices to fail to operate properly and prevent new devices from being discovered or associated. |
| `BTHUSB` | Bluetooth Radio USB Driver |
| `DeviceAssociationBrokerSvc` | Enables apps to pair devices |
| `DeviceAssociationService` | Enables pairing between the system and wired or wireless devices. |
| `Microsoft_Bluetooth_AvrcpTransport` | Microsoft Bluetooth Avrcp Transport Driver |
| `RFCOMM` | Bluetooth Device (RFCOMM Protocol TDI) |
