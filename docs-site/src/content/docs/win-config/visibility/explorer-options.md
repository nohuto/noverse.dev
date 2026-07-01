---
title: 'Explorer Options'
description: 'Visibility option documentation from win-config.'
editUrl: false
sidebar:
  order: 1
---

It changes every setting which is shown in the `Folder Options` window. Some are personal preference, see suboptions below for customization.

![](https://github.com/nohuto/win-config/blob/main/visibility/images/explorer.png?raw=true)

## Explorer Captures

Based on `Explorer > View > Options`.

### General

```c
// Open File Explorer to
// Home
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\LaunchTo	Type: REG_DWORD, Length: 4, Data: 2
// This PC
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\LaunchTo	Type: REG_DWORD, Length: 4, Data: 1

// Browse folders
// Open each folder in the same window
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\CabinetState\Settings	Type: REG_BINARY, Length: 12, Data: 0C 00 02 00 0A 01 00 00 60 00 00 00
// Open each folder in its own window
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\CabinetState\Settings	Type: REG_BINARY, Length: 12, Data: 0C 00 02 00 2A 01 00 00 60 00 00 00

// Click items as follows
// Single-click to open an item (point to select)
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\ShellState Type: REG_BINARY, Length: 36, Data: 24 00 00 00 1E 20 00 00 00 00 00 00 00 00 00 00
// Double-click to open an item (singe-click to select)
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\ShellState Type: REG_BINARY, Length: 36, Data: 24 00 00 00 3E 20 00 00 00 00 00 00 00 00 00 00

// Privacy
  // Show recently used files
  // Enabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\ShowRecent	Type: REG_DWORD, Length: 4, Data: 1
  // Disabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\ShowRecent	Type: REG_DWORD, Length: 4, Data: 0

  // Show frequently used folders
  // Enabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\ShowFrequent	Type: REG_DWORD, Length: 4, Data: 1
  // Disabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\ShowFrequent	Type: REG_DWORD, Length: 4, Data: 0

  // Show files from Office.com
  // Enabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\ShowCloudFilesInQuickAccess	Type: REG_DWORD, Length: 4, Data: 1
  // Disabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\ShowCloudFilesInQuickAccess	Type: REG_DWORD, Length: 4, Data: 0
```

### View

```c
// Always show icons, never thumbnails
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\IconsOnly	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\IconsOnly	Type: REG_DWORD, Length: 4, Data: 0

// Decrease space between items (compact view)
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\UseCompactMode	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\UseCompactMode	Type: REG_DWORD, Length: 4, Data: 0

// Display file icon on thumbnails
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowTypeOverlay	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowTypeOverlay	Type: REG_DWORD, Length: 4, Data: 0

// Display file size information in folder tips
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\FolderContentsInfoTip	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\FolderContentsInfoTip	Type: REG_DWORD, Length: 4, Data: 0

// Dispay the full path in the title bar
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\CabinetState\FullPath	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\CabinetState\FullPath	Type: REG_DWORD, Length: 4, Data: 0

// Hidden files and folders
// Don't show hidden files, folders, or drives
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\Hidden	Type: REG_DWORD, Length: 4, Data: 2
// SHow hidden files, folders, and drives
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\Hidden	Type: REG_DWORD, Length: 4, Data: 1

// Hide empty drives
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\HideDrivesWithNoMedia	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\HideDrivesWithNoMedia	Type: REG_DWORD, Length: 4, Data: 0

// Hide file extensions for known file types
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\HideFileExt	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\HideFileExt	Type: REG_DWORD, Length: 4, Data: 0

// Hide folder merge conflicts
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\HideMergeConflicts	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\HideMergeConflicts	Type: REG_DWORD, Length: 4, Data: 0

// Hide protected operating system files (Recommended)
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowSuperHidden	Type: REG_DWORD, Length: 4, Data: 0
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowSuperHidden	Type: REG_DWORD, Length: 4, Data: 1

// Launch folder windows in a seperate process
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\SeparateProcess	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\SeparateProcess	Type: REG_DWORD, Length: 4, Data: 0

// Restore previous folder windows at logon
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\PersistBrowsers	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\PersistBrowsers	Type: REG_DWORD, Length: 4, Data: 0

// Show drive letters
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\ShowDriveLettersFirst	Type: REG_DWORD, Length: 4, Data: 0
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\ShowDriveLettersFirst	Type: REG_DWORD, Length: 4, Data: 2

// Show encrypted or compressed NTFS files in color
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowEncryptCompressedColor	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowEncryptCompressedColor	Type: REG_DWORD, Length: 4, Data: 0

// Show pop-up description for folder and desktop items
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowInfoTip	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowInfoTip	Type: REG_DWORD, Length: 4, Data: 0

// Show preview handlers in preview pane
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowPreviewHandlers	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowPreviewHandlers	Type: REG_DWORD, Length: 4, Data: 0

// Show status bar
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowStatusBar	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowStatusBar	Type: REG_DWORD, Length: 4, Data: 0

// Show sync provider notifications
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowSyncProviderNotifications	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\ShowSyncProviderNotifications	Type: REG_DWORD, Length: 4, Data: 0

// Use check boxes to select items
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\AutoCheckSelect	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\AutoCheckSelect	Type: REG_DWORD, Length: 4, Data: 0

// Use Sharing Wizard (Recommended)
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\SharingWizardOn	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\SharingWizardOn	Type: REG_DWORD, Length: 4, Data: 0

// When typing into list view
// Automatically type into the Search Box
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TypeAhead	Type: REG_DWORD, Length: 4, Data: 1
// Select the typed item in the view
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TypeAhead	Type: REG_DWORD, Length: 4, Data: 0

// Navigation pane
  // Always show availability status
  // Enabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\NavPaneShowAllCloudStates	Type: REG_DWORD, Length: 4, Data: 1
  // Disabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\NavPaneShowAllCloudStates	Type: REG_DWORD, Length: 4, Data: 0

  // Expand to open folders
  // Enabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\NavPaneExpandToCurrentFolder	Type: REG_DWORD, Length: 4, Data: 1
  // Disabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\NavPaneExpandToCurrentFolder	Type: REG_DWORD, Length: 4, Data: 0

  // Show all folders
  // Enabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\NavPaneShowAllFolders	Type: REG_DWORD, Length: 4, Data: 1
  // Disabled
  HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\NavPaneShowAllFolders	Type: REG_DWORD, Length: 4, Data: 0

  // Show libraries
  // Enabled
  HKCU\Software\Classes\CLSID\{031E4825-7B94-4dc3-B131-E946B44C8DD5}\System.IsPinnedToNameSpaceTree	Type: REG_DWORD, Length: 4, Data: 1
  // Disabled
  HKCU\Software\Classes\CLSID\{031E4825-7B94-4dc3-B131-E946B44C8DD5}\System.IsPinnedToNameSpaceTree	Type: REG_DWORD, Length: 4, Data: 0
```

### Search

```c
// Don't use the index when searching in file folders for system files (searches might take longer)
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Search\Preferences\WholeFileSystem	Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Search\Preferences\WholeFileSystem	Type: REG_DWORD, Length: 4, Data: 0

// Include system directories
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Search\Preferences\SystemFolders Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Search\Preferences\SystemFolders Type: REG_DWORD, Length: 4, Data: 0

// Include compress files (ZIP, CAB...)
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Search\Preferences\ArchivedFiles Type: REG_DWORD, Length: 4, Data: 1
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Search\Preferences\ArchivedFiles Type: REG_DWORD, Length: 4, Data: 0

// Always search file names and contents (this might take several minutes)
// Enabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Search\PrimaryProperties\UnindexedLocations\SearchOnly Type: REG_DWORD, Length: 4, Data: 0
// Disabled
HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Search\PrimaryProperties\UnindexedLocations\SearchOnly Type: REG_DWORD, Length: 4, Data: 1
```

## [Windows Policies](https://noverse.dev/policies)

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Hide and disable all items on the desktop](https://noverse.dev/policies?p=Desktop*NoDesktop) | `HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer`<br>`HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer` | `NoDesktop` |
| [Do not keep history of recently opened documents](https://noverse.dev/policies?p=StartMenu*NoRecentDocsHistory) | `HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer`<br>`HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer` | `NoRecentDocsHistory` |
| [Prohibit access of the Windows Connect Now wizards](https://noverse.dev/policies?p=WindowsConnectNow*WCN_DisableWcnUi_2) | `HKLM\Software\Policies\Microsoft\Windows\WCN\UI` | `DisableWcnUi` |
