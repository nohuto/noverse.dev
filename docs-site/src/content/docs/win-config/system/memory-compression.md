---
title: 'Memory Compression'
description: 'System option documentation from win-config.'
editUrl: false
sidebar:
  order: 23
---

Memory compression stores infrequently accessed, private memory pages in compressed form so they occupy less physical memory, causing Windows to keep more data in RAM and reduce pagefile I/O. Whenever a process references a compressed page again, it gets decompressed which is normally faster than reading it from storage, although compression and decompression consume CPU time.

Keep it enabled, unless you've to debug issues in relation to compression/decompression & it's activity.

Compressed pages are stored in a dedicated (minimal) "Memory Compression" process managed by the Store Manager, which kind of consumes no resources, and its threads are waiting most of the time.

![](https://github.com/nohuto/win-config/blob/main/system/images/memory-compression.png?raw=true)

Example:  
1. System looks for cold/rarely used data in RAM
2. It compresses that data, e.g. 24 MB -> 7 MB
3. The 17 MB saved is used for active apps
4. When the data is needed again, it's decompressed back to 24 MB

### Get-MMAgent

See the current memory compression state on your system via ([cmdlet](https://learn.microsoft.com/en-us/powershell/module/mmagent/disable-mmagent?view=windowsserver2025-ps)):
```powershell
Get-MMAgent

ApplicationLaunchPrefetching : True
ApplicationPreLaunch         : True
MaxOperationAPIFiles         : 512
MemoryCompression            : True # Enabled
OperationAPI                 : True
PageCombining                : True
PSComputerName               :
```

## [Windows Internals](https://github.com/nohuto/Windows-Books/releases/download/7th-Edition/Windows-Internals-E7-P1.pdf)

![](https://github.com/nohuto/win-config/blob/main/system/images/memcompress3.png?raw=true)
![](https://github.com/nohuto/win-config/blob/main/system/images/memcompress2.png?raw=true)
![](https://github.com/nohuto/win-config/blob/main/system/images/memcompress1.png?raw=true)
