---
title: 'Wi-Fi'
description: 'Network option documentation from win-config.'
editUrl: false
sidebar:
  order: 8
---

Disables Wi-Fi services/drivers, scheduled tasks.

| Name | Description | Type | Dependencies | Command Line |
| --- | --- | --- | --- | --- |
| `WlanSvc` | The WLANSVC service provides the logic required to configure, discover, connect to, and disconnect from a wireless local area network (WLAN) as defined by IEEE 802.11 standards. It also contains the logic to turn your computer into a software access point so that other devices or computers can connect to your computer wirelessly using a WLAN adapter that can support this. Stopping or disabling the WLANSVC service will make all WLAN adapters on your computer inaccessible from the Windows networking UI. It is strongly recommended that you have the WLANSVC service running if your computer has a WLAN adapter. | Win32 Own Process (16) | nativewifip, RpcSs, Ndisuio, wcmsvc | C:\Windows\system32\svchost.exe -k LocalSystemNetworkRestricted -p |
| `vwififlt` | Virtual WiFi Filter Driver | Kernel Driver (1) | - | System32\drivers\vwififlt.sys |
| `WwanSvc` | This service manages mobile broadband (GSM & CDMA) data card/embedded module adapters and connections by auto-configuring the networks. It is strongly recommended that this service be kept running for best user experience of mobile broadband devices. | Win32 Share Process (32) | RpcSs, NdisUio | C:\Windows\system32\svchost.exe -k LocalSystemNetworkRestricted -p |

---

```c
"\\Microsoft\\Windows\\WCM\\WiFiTask" // %WINDIR%\System32\WiFiTask.exe
"\\Microsoft\\Windows\\WwanSvc\\NotificationTask" // %WINDIR%\System32\WiFiTask.exe wwan
```
