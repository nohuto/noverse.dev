---
title: 'WER'
description: 'Privacy option documentation from win-config.'
editUrl: false
sidebar:
  order: 3
---

[WER](https://learn.microsoft.com/en-us/windows/win32/wer/wer-settings) (Windows Error Reporting) sends error logs to Microsoft, disabling it keeps error data local.

WER is implemented by the WerSvc service and Wer.dll/Faultrep.dll, crashed processes connect to the service over an ALPC port to generate reports and dumps. Disabling WER stops that reporting part.

`\Microsoft\Windows\Windows Error Reporting : QueueReporting` would run `%windir%\system32\wermgr.exe -upload`. `Error-Reporting.txt` shows a trace of `\Registry\Machine\SOFTWARE\Microsoft\WINDOWS\Windows Error Reporting`.

[WER network endpoints](https://learn.microsoft.com/en-us/troubleshoot/windows-client/system-management-components/windows-error-reporting-diagnostics-enablement-guidance#configure-network-endpoints-to-be-allowed):
```
0.0.0.0 watson.microsoft.com
0.0.0.0 watson.telemetry.microsoft.com
0.0.0.0 umwatsonc.events.data.microsoft.com
0.0.0.0 ceuswatcab01.blob.core.windows.net
0.0.0.0 ceuswatcab02.blob.core.windows.net
0.0.0.0 eaus2watcab01.blob.core.windows.net
0.0.0.0 eaus2watcab02.blob.core.windows.net
0.0.0.0 weus2watcab01.blob.core.windows.net
0.0.0.0 weus2watcab02.blob.core.windows.net
```
`DisableSendRequestAdditionalSoftwareToWER`: "Prevent Windows from sending an error report when a device driver requests additional software during installation"
`DisableSendGenericDriverNotFoundToWER`: "Do not send a Windows error report when a generic driver is installed on a device"

- [privacy/assets | wer-PciGetSystemWideHackFlagsFromRegistry.c](https://github.com/nohuto/win-config/blob/main/privacy/assets/wer-PciGetSystemWideHackFlagsFromRegistry.c)

## Suboption

`Disable DHA Report`:  
> "*This group policy enables Device Health Attestation reporting (DHA-report) on supported devices. It enables supported devices to send Device Health Attestation related information (device boot logs, PCR values, TPM certificate, etc.) to Device Health Attestation Service (DHA-Service) every time a device starts. Device Health Attestation Service validates the security state and health of the devices, and makes the findings accessible to enterprise administrators via a cloud based reporting portal. This policy is independent of DHA reports that are initiated by device manageability solutions (like MDM or SCCM), and will not interfere with their workflows.*"

`Disable Persistent System Timestamp`:

Disables the Reliability policy that periodically writes the current system time to disk. Windows uses that persistent timestamp as a "last known alive" time so Reliability Monitor / WER can estimate when an unexpected shutdown, power loss, hard reset, or crash happened (see policies below).

> "*This policy setting allows the system to detect the time of unexpected shutdowns by writing the current time to disk on a schedule controlled by the Timestamp Interval. If you enable this policy setting, you are able to specify how often the Persistent System Timestamp is refreshed and subsequently written to the disk. You can specify the Timestamp Interval in seconds. If you disable this policy setting, the Persistent System Timestamp is turned off and the timing of unexpected shutdowns is not recorded. If you do not configure this policy setting, the Persistent System Timestamp is refreshed according the default, which is every 60 seconds beginning with Windows Server 2003. Note: This feature might interfere with power configuration settings that turn off hard disks after a period of inactivity. These power settings may be accessed in the Power Options Control Panel.*"

```c
if ( !RegQueryValueExW(hKey[0], "TimeStampEnabled", 0LL, 0LL, (LPBYTE)&Data, &cbData) )
if ( !RegQueryValueExW(hKey[0], "TimeStampInterval", 0LL, 0LL, (LPBYTE)&v4, &cbData) && v4 <= 0x15180 ) // 86400 seconds = 24h?
```

`TimeStampInterval` under `HKLM\Software\Policies\Microsoft\Windows NT\Reliability` is in seconds, the value under `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Reliability` is read as minutes and multiplied by 60.

- [system/assets | timestamp-OsEventsTimestampInterval.c](https://github.com/nohuto/win-config/blob/main/system/assets/timestamp-OsEventsTimestampInterval.c)

## Miscellaneous Notes

`EnableWerUserReporting`  
Default: `1` (`DbgkEnableWerUserReporting dd 1`)

```powershell
"Session Manager\Kernel","EnableWerUserReporting","0xFFFFF800CF1C335C","0x00000000","0x00000000","0x00000000"
```

Related to [PCIe advanced error reporting](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/ns-wdm-_pci_express_rootport_aer_capability)? Haven't informed myself about it yet, therefore ignore it:
```
\Registry\Machine\SYSTEM\ControlSet001\Control\PnP\pci : AerMultiErrorDisabled
```
Default is `0`, non zero would enable the behaviour? The value doesn't exist by default.

```
\Registry\Machine\SYSTEM\ControlSet001\Control\StorPort : TelemetryErrorDataEnabled
\Registry\Machine\SYSTEM\ControlSet001\Control\Session Manager\Memory Management : PeriodicTelemetryReportFrequency
```

## Windows Policies

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Do not send a Windows error report when a generic driver is installed on a device](https://www.noverse.dev/policies.html?p=DeviceSetup*DeviceInstall_GenericDriverSendToWER) | `HKLM\Software\Policies\Microsoft\Windows\DeviceInstall\Settings` | `DisableSendGenericDriverNotFoundToWER` |
| [Prevent Windows from sending an error report when a device driver requests additional software during installation](https://www.noverse.dev/policies.html?p=DeviceSetup*DeviceInstall_RequestAdditionalSoftwareSendToWER) | `HKLM\Software\Policies\Microsoft\Windows\DeviceInstall\Settings` | `DisableSendRequestAdditionalSoftwareToWER` |
| [Disable Windows Error Reporting](https://www.noverse.dev/policies.html?p=ErrorReporting*WerDisable_2) | `HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting` | `Disabled` |
| [Disable logging](https://www.noverse.dev/policies.html?p=ErrorReporting*WerNoLogging_1) | `HKCU\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting` | `LoggingDisabled` |
| [Automatically send memory dumps for OS-generated error reports](https://www.noverse.dev/policies.html?p=ErrorReporting*WerAutoApproveOSDumps_1) | `HKCU\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting` | `AutoApproveOSDumps` |
| [Automatically send memory dumps for OS-generated error reports](https://www.noverse.dev/policies.html?p=ErrorReporting*WerAutoApproveOSDumps_2) | `HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Error Reporting` | `AutoApproveOSDumps` |
| [Enable Device Health Attestation Monitoring and Reporting](https://www.noverse.dev/policies.html?p=TPM*OptIntoDSHA_Name) | `HKLM\Software\Policies\Microsoft\DeviceHealthAttestationService` | `EnableDeviceHealthAttestationService` |
| [Enable Persistent Time Stamp](https://www.noverse.dev/policies.html?p=Reliability*EE_EnablePersistentTimeStamp) | `HKLM\Software\Policies\Microsoft\Windows NT\Reliability` | `TimeStampEnabled`<br>`TimeStampInterval` |
