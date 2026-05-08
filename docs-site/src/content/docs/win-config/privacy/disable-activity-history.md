---
title: 'Activity History'
description: 'Privacy option documentation from win-config.'
editUrl: false
sidebar:
  order: 31
---

`EnableActivityFeed` enables or disables publishing and syncing of activities across devices. `PublishUserActivities` allows or blocks local publishing of user activities. `UploadUserActivities` allows or blocks uploading of user activities to the cloud, deletion is not affected.

## Windows Policies

| Policy | Key Path | Value Name |
| --- | --- | --- |
| [Enables Activity Feed](https://www.noverse.dev/policies.html?p=OSPolicy*EnableActivityFeed) | `HKLM\Software\Policies\Microsoft\Windows\System` | `EnableActivityFeed` |
| [Allow publishing of User Activities](https://www.noverse.dev/policies.html?p=OSPolicy*PublishUserActivities) | `HKLM\Software\Policies\Microsoft\Windows\System` | `PublishUserActivities` |
| [Allow upload of User Activities](https://www.noverse.dev/policies.html?p=OSPolicy*UploadUserActivities) | `HKLM\Software\Policies\Microsoft\Windows\System` | `UploadUserActivities` |
| [Turn off storage and display of search history](https://www.noverse.dev/policies.html?p=Search*DisableSearchHistory) | `HKCU\SOFTWARE\Policies\Microsoft\Windows\Explorer` | `DisableSearchHistory` |
