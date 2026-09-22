---
title: 'Registry Fundamentals'
description: 'Generated from regkit file: docs/registry-fundamentals.md.'
editUrl: false
sidebar:
  order: 2
---

## Root Keys & `\REGISTRY`

RegEdit shows five common root keys (`HKEY_*` constants, which are predefined key handles that KernelBase maps to registry paths before calling native APIs such as `NtOpenKey`/`NtCreateKey`), while the native registry starts at `\REGISTRY`.

`\REGISTRY` is the root key of the volatile master hive, when the OM (object manager) gets a path below this key, the CM (configuration manager) parses the rest of the path.

```c
lkd> !object \REGISTRY
Object: ffffd20e294c6570  Type: (ffff9f8470576d20) Key // object type = key
    ObjectHeader: ffffd20e294c6540 (new version)
    HandleCount: 1  PointerCount: 32770
    Directory Object: 00000000  Name: \REGISTRY
```

Using `!reg q` shows the four subkeys of the master hive:

```c
lkd> !reg q \REGISTRY

Found KCB = ffffd20e294dc590 :: \REGISTRY

Hive         ffffd20e294aa000
KeyNode      ffffd20e294dd024

[SubKeyAddr]         [SubKeyName]
ffffd20e294dd244     A
ffffd20e294dd16c     MACHINE
ffffd20e294dd1d4     USER
ffffd20e294dd2c4     WC

 Use '!reg keyinfo ffffd20e294aa000 <SubKeyAddr>' to dump the subkey details

[ValueType]         [ValueName]                   [ValueData]
 Key has no Values
```

`Hive` address points to `_CMHIVE` (its first member is `_HHIVE`), `KeyNode` points to the root `_CM_KEY_NODE`. Cached keys use `_CM_KEY_CONTROL_BLOCK` (KCB), and every open key handle has a `_CM_KEY_BODY` which references that KCB.

### [`\REGISTRY` Tree View](https://projectzero.google/2024/10/the-windows-registry-adventure-4-hives.html)

<img src="https://github.com/nohuto/regkit/blob/main/docs/images/REGISTRYview.png?raw=true" alt="" width="670" height="789">

## `\REGISTRY` Only Keys

Beside `MACHINE`/`USER`, native root include `A` & `WC`, which don't have predefined `HKEY_*` mappings:

- [`\REGISTRY\A`](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/filtering-registry-operations-on-application-hives) = private application hives loaded by `RegLoadAppKey`, applications can only access them through the returned handle as an absolute `NtOpenKey`/`ZwOpenKey` path via `\REGISTRY\A` returns `STATUS_ACCESS_DENIED` (hive unloads after its last handle closes)
- `\REGISTRY\WC` = differencing hives used by containers/silos

## Value Types

Windows defines twelve [registry value types](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-value-types), `0`-`11`, the type tells a reader how the data is intended to be used:

| Value | Type | Meaning |
| --- | --- | --- |
| `0` | `REG_NONE` | No defined value type |
| `1` | `REG_SZ` | Null-terminated string |
| `2` | `REG_EXPAND_SZ` | Null-terminated string with unexpanded environment variable references |
| `3` | `REG_BINARY` | Arbitrary bytes |
| `4` | `REG_DWORD` / `REG_DWORD_LITTLE_ENDIAN` | 32-bit little endian int |
| `5` | `REG_DWORD_BIG_ENDIAN` | 32-bit big endian int |
| `6` | `REG_LINK` | Null-terminated UTF-16 target path of a registry symbolic link key |
| `7` | `REG_MULTI_SZ` | Sequence of null-terminated strings, terminated by an empty string |
| `8` | `REG_RESOURCE_LIST` | Hardware resource list |
| `9` | `REG_FULL_RESOURCE_DESCRIPTOR` | Hardware resource descriptor |
| `10` | `REG_RESOURCE_REQUIREMENTS_LIST` | Hardware resource requirements |
| `11` | `REG_QWORD` / `REG_QWORD_LITTLE_ENDIAN` | 64-bit little-endian int |

```c
// winnt.h
//
// Predefined Value Types.
//

#define REG_NONE                    ( 0ul ) // No value type
#define REG_SZ                      ( 1ul ) // Unicode nul terminated string
#define REG_EXPAND_SZ               ( 2ul ) // Unicode nul terminated string
                                            // (with environment variable references)
#define REG_BINARY                  ( 3ul ) // Free form binary
#define REG_DWORD                   ( 4ul ) // 32-bit number
#define REG_DWORD_LITTLE_ENDIAN     ( 4ul ) // 32-bit number (same as REG_DWORD)
#define REG_DWORD_BIG_ENDIAN        ( 5ul ) // 32-bit number
#define REG_LINK                    ( 6ul ) // Symbolic Link (unicode)
#define REG_MULTI_SZ                ( 7ul ) // Multiple Unicode strings
#define REG_RESOURCE_LIST           ( 8ul ) // Resource list in the resource map
#define REG_FULL_RESOURCE_DESCRIPTOR ( 9ul ) // Resource list in the hardware description
#define REG_RESOURCE_REQUIREMENTS_LIST ( 10ul )
#define REG_QWORD                   ( 11ul ) // 64-bit number
#define REG_QWORD_LITTLE_ENDIAN     ( 11ul ) // 64-bit number (same as REG_QWORD)
```

### Type & Data

`_CM_KEY_VALUE` layout shows that `Type` is a 32-bit field and that the internal value flags are stored separately in `Flags`:

```c
lkd> dt nt!_CM_KEY_VALUE
   +0x000 Signature        : Uint2B
   +0x002 NameLength       : Uint2B
   +0x004 DataLength       : Uint4B
   +0x008 Data             : Uint4B
   +0x00c Type             : Uint4B
   +0x010 Flags            : Uint2B
   +0x012 Spare            : Uint2B
   +0x014 Name             : [1] Wchar
```

Some values are stored with extra flag bits in the upper 16 bits (e.g. `0x20000`, `0x40000`), regkit displays them as `REG_* (0xXXXX)` (for example `0x20001` is `REG_SZ` with a flag, `0x20004` is `REG_DWORD`, and `0x40007` is `REG_MULTI_SZ`). These flagged types are included in the '*Find > Data Types filter*'. Note that this is currently my personal assumption and isn't validated by any official documentation (CM doesn't seem to handle them like that).

Exmaple of an volatile key with a UTF-16 string with type `0x20001`, `RegQueryValueEx` returned the exact same type:

```c
set type=0x20001
query status=0 returned type=0x20001 bytes=10 text=test
leftover test keys: 0
```

## Key Handles

Key handle = process handle to an open registry `Key` object, functions such as [`RegOpenKeyEx`](https://learn.microsoft.com/en-us/windows/win32/api/winreg/nf-winreg-regopenkeyexw) return it as an `HKEY`. The handle can then be used to query the key, change it, or open another key relative to it.

The `Access` column shows the [access rights](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-key-security-and-access-rights):

<img src="https://github.com/nohuto/regkit/blob/main/docs/images/key-handles-access.png?raw=true" alt="" width="1852" height="870">

| Value | Meaning |
| --- | --- |
| KEY\_ALL\_ACCESS (0xF003F) | Combines the STANDARD\_RIGHTS\_REQUIRED, KEY\_QUERY\_VALUE, KEY\_SET\_VALUE, KEY\_CREATE\_SUB\_KEY, KEY\_ENUMERATE\_SUB\_KEYS, KEY\_NOTIFY, and KEY\_CREATE\_LINK access rights. |
| KEY\_CREATE\_LINK (0x0020) | Reserved for system use. |
| KEY\_CREATE\_SUB\_KEY (0x0004) | Required to create a subkey of a registry key. |
| KEY\_ENUMERATE\_SUB\_KEYS (0x0008) | Required to enumerate the subkeys of a registry key. |
| KEY\_EXECUTE (0x20019) | Equivalent to KEY\_READ. |
| KEY\_NOTIFY (0x0010) | Required to request change notifications for a registry key or for subkeys of a registry key. |
| KEY\_QUERY\_VALUE (0x0001) | Required to query the values of a registry key. |
| KEY\_READ (0x20019) | Combines the STANDARD\_RIGHTS\_READ, KEY\_QUERY\_VALUE, KEY\_ENUMERATE\_SUB\_KEYS, and KEY\_NOTIFY values. |
| KEY\_SET\_VALUE (0x0002) | Required to create, delete, or set a registry value. |
| KEY\_WOW64\_32KEY (0x0200) | Indicates that an application on 64-bit Windows should operate on the 32-bit registry view. This flag is ignored by 32-bit Windows. For more information, see [Accessing an Alternate Registry View](https://learn.microsoft.com/en-us/windows/desktop/WinProg64/accessing-an-alternate-registry-view). This flag must be combined using the OR operator with the other flags in this table that either query or access registry values. **Windows 2000:** This flag is not supported. |
| KEY\_WOW64\_64KEY (0x0100) | Indicates that an application on 64-bit Windows should operate on the 64-bit registry view. This flag is ignored by 32-bit Windows. For more information, see [Accessing an Alternate Registry View](https://learn.microsoft.com/en-us/windows/desktop/WinProg64/accessing-an-alternate-registry-view). This flag must be combined using the OR operator with the other flags in this table that either query or access registry values. **Windows 2000:** This flag is not supported. |
| KEY\_WRITE (0x20006) | Combines the STANDARD\_RIGHTS\_WRITE, KEY\_SET\_VALUE, and KEY\_CREATE\_SUB\_KEY access rights. |

### Access Example

```c
#include <windows.h>
#include <stdio.h>

int wmain(void)
{
    HKEY query_key = NULL;
    HKEY set_key = NULL;

    // open HKCU\Software twice with different access rights
    LSTATUS query_status = RegOpenKeyExW(
        HKEY_CURRENT_USER,
        L"Software",
        0,
        KEY_QUERY_VALUE,
        &query_key);
    LSTATUS set_status = RegOpenKeyExW(
        HKEY_CURRENT_USER,
        L"Software",
        0,
        KEY_SET_VALUE,
        &set_key);

    printf(
        "PID=%lu QUERY=%p SET=%p QSTATUS=%ld SSTATUS=%ld\n",
        GetCurrentProcessId(),
        query_key,
        set_key,
        query_status,
        set_status);
    fflush(stdout);
    Sleep(60000); // keep both handles open for the debugger

    RegCloseKey(set_key);
    RegCloseKey(query_key);
    return 0;
}
```

```c
PID=1428 QUERY=00000000000000F4 SET=00000000000000F8 QSTATUS=0 SSTATUS=0

0:004> cdb: Reading initial command '!handle F4 f; !handle F8 f; !handle ffffffff80000001 f; q'
Handle f4 // KEY_QUERY_VALUE
  Type         	Key
  Attributes   	0
  GrantedAccess	0x1:
         None
         QueryValue
  HandleCount  	2
  PointerCount 	32769
  Name         	\REGISTRY\USER\S-1-5-21-925530076-420762750-1089864997-1000\Software
  Object Specific Information
    Key last write time:  11:04:03. 9/22/2026
    Key name Software
Handle f8 // KEY_SET_VALUE
  Type         	Key
  Attributes   	0
  GrantedAccess	0x2:
         None
         SetValue
  HandleCount  	2 // UM !handle duplicated handles to query it
  PointerCount 	32769
  Name         	\REGISTRY\USER\S-1-5-21-925530076-420762750-1089864997-1000\Software
  Object Specific Information
Could not duplicate handle 80000001, error 6
```

## [Predefined Keys](https://learn.microsoft.com/en-us/windows/win32/sysinfo/predefined-keys)

| Key | Short name | Native source/behavior |
| --- | --- | --- |
| `HKEY_LOCAL_MACHINE` | `HKLM` | `\REGISTRY\MACHINE` |
| `HKEY_USERS` | `HKU` | `\REGISTRY\USER` and the loaded user profiles below it |
| `HKEY_CURRENT_USER` | `HKCU` | Per process mapping to the current user's branch in `HKEY_USERS` |
| `HKEY_CURRENT_USER_LOCAL_SETTINGS` | `HKCULS` | `\REGISTRY\USER\<SID>_Classes\Local Settings` for machinelocal user settings |
| `HKEY_CLASSES_ROOT` | `HKCR` | Merged view of `HKLM\SOFTWARE\Classes` and `HKU\<SID>_Classes` that follows the [HKCR merge rules](https://learn.microsoft.com/en-us/windows/win32/sysinfo/merged-view-of-hkey-classes-root) |
| `HKEY_CURRENT_CONFIG` | `HKCC` | Alias for `HKLM\SYSTEM\CurrentControlSet\Hardware Profiles\Current` |
| `HKEY_PERFORMANCE_DATA` | `HKPD` | Registry functions collect performance data from its source when this handle is queried |
| `HKEY_PERFORMANCE_TEXT` | - | Performance counter names & help (US English) |
| `HKEY_PERFORMANCE_NLSTEXT` | - | Performance counter names & help (system language) |

`HKEY_DYN_DATA` is also present in the header for compatibility, but it belongs to Windows 9x and has no current Windows NT relation.

```c
// winreg.h
//
// Reserved Key Handles.
//

#define HKEY_CLASSES_ROOT                   (( HKEY ) (ULONG_PTR)((LONG)0x80000000) )
#define HKEY_CURRENT_USER                   (( HKEY ) (ULONG_PTR)((LONG)0x80000001) )
#define HKEY_LOCAL_MACHINE                  (( HKEY ) (ULONG_PTR)((LONG)0x80000002) )
#define HKEY_USERS                          (( HKEY ) (ULONG_PTR)((LONG)0x80000003) )
#define HKEY_PERFORMANCE_DATA               (( HKEY ) (ULONG_PTR)((LONG)0x80000004) )
#define HKEY_PERFORMANCE_TEXT               (( HKEY ) (ULONG_PTR)((LONG)0x80000050) )
#define HKEY_PERFORMANCE_NLSTEXT            (( HKEY ) (ULONG_PTR)((LONG)0x80000060) )
#if(WINVER >= 0x0400)
#define HKEY_CURRENT_CONFIG                 (( HKEY ) (ULONG_PTR)((LONG)0x80000005) )
#define HKEY_DYN_DATA                       (( HKEY ) (ULONG_PTR)((LONG)0x80000006) )
#define HKEY_CURRENT_USER_LOCAL_SETTINGS    (( HKEY ) (ULONG_PTR)((LONG)0x80000007) )
#endif
```

As shown above each constant has its high bit set, which keeps it outside the normal user handle range and lets KernelBase see it as a predefined key before opening a real key handle for the native call.

### Symbolic Links

Symbolic link get created via `REG_OPTION_CREATE_LINK`, its key node then has the `KEY_SYM_LINK` flag, and the `SymbolicLinkValue` value stores the target as `REG_LINK` (`RegOpenKeyEx`/`NtOpenKeyEx` resolve that). Passing `REG_OPTION_OPEN_LINK` opens the link key itself.

Example of `CurrentControlSet` which is a volatile symbolic link to `ControlSet00x`:

```c
lkd> !reg q \REGISTRY\MACHINE\SYSTEM\CurrentControlSet

Found KCB = ffffd20e29508050 :: \REGISTRY\MACHINE\SYSTEM\CURRENTCONTROLSET

Hive         ffffd20e2948d000
KeyNode      ffffd20e29515024

[ValueType]         [ValueName]                   [ValueData]
REG_LINK            SymbolicLinkValue             \Registry\Machine\SYSTEM\ControlSet001 // // CS001 was selected for that boot
```

The `S-1-5-18` key below `\REGISTRY\USER` is another symbolic link which points to the LocalSystem profile hive mounted as `.DEFAULT`:

```c
lkd> !reg q \REGISTRY\USER\S-1-5-18

Sorry <\REGISTRY\USER\S-1-5-18> is not cached

===========================================================================================
Falling back to traversing the tree of nodes.

Hive         ffffd20e294aa000
KeyNode      ffffd20e2c366024

[ValueType]         [ValueName]                   [ValueData]
REG_LINK            SymbolicLinkValue             \Registry\User\.Default
```

### WOW64 Views

On 64-bit Windows the [registry redirector](https://learn.microsoft.com/en-us/windows/win32/winprog64/registry-redirector) has separate logical views of selected keys for 32-bit & 64-bit applications, while other keys are shared and the exact shared/redirected list depends on the winver. `KEY_WOW64_32KEY`/`KEY_WOW64_64KEY` select a view through the API, while `reg.exe` shows the same choice through `/reg:32` and `/reg:64`:

```bat
> reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion" /v ProgramFilesDir /reg:64

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion
    ProgramFilesDir    REG_SZ    C:\Program Files

> reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion" /v ProgramFilesDir /reg:32

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion
    ProgramFilesDir    REG_SZ    C:\Program Files (x86)
```

## Hives & On-Disk Files

More details will be added somewhat soon.

A [hive](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-hives) is a logical group of keys/subkeys/values. The kernel stores a loaded hive in `_CMHIVE`, its first member is `_HHIVE` which has the cell maps & routines used to allocate, resolve, read, and write hive cells.

### Loaded Hives

`HKLM\SYSTEM\CurrentControlSet\Control\Hivelist` lists global hive mount paths and their backing paths, while an empty value can show a fileless hive such as `HKLM\HARDWARE`.

```c
lkd> !reg hivelist

-------------------------------------------------------------------------------------------------------------------------------------------------------
|     HiveAddr     |Stable Length|    Stable Map    |Volatile Length|    Volatile Map    |MappedViews|PinnedViews|U(Cnt)|     BaseBlock     | FileName
-------------------------------------------------------------------------------------------------------------------------------------------------------
| ffffd20e294aa000 |       2000  | ffffd20e294aa128 |       1000    |  ffffd20e294aa3a0  | ffffd20e294d8000  | <NONAME> // hive without backing file
| ffffd20e2948d000 |     faa000  | ffffd20e294df000 |      a8000    |  ffffd20e2948d3a0  | ffffd20e294de000  | SYSTEM // \REGISTRY\MACHINE\SYSTEM
| ffffd20e2954b000 |      34000  | ffffd20e2954b128 |       9000    |  ffffd20e2954b3a0  | ffffd20e29516000  | <NONAME> // HKLM\HARDWARE
| ffffd20e29fcb000 |    57bf000  | ffffd20e2b109000 |     282000    |  ffffd20e2f31b000  | ffffd20e29fed000  | emRoot\System32\Config\SOFTWARE // \REGISTRY\MACHINE\SOFTWARE
| ffffd20e2c2f6000 |       b000  | ffffd20e2c2f6128 |          0    |  0000000000000000  | ffffd20e2b0b7000  | kVolume1\EFI\Microsoft\Boot\BCD // \REGISTRY\MACHINE\BCD00000000
| ffffd20e2c31c000 |      7d000  | ffffd20e2c31c128 |       1000    |  ffffd20e2c31c3a0  | ffffd20e2c2ff000  | temRoot\System32\Config\DEFAULT // \REGISTRY\USER\.DEFAULT
| ffffd20e2e01b000 |       7000  | ffffd20e2e01b128 |       1000    |  ffffd20e2e01b3a0  | ffffd20e2cfa3000  | emRoot\System32\Config\SECURITY // \REGISTRY\MACHINE\SECURITY
| ffffd20e2e121000 |       b000  | ffffd20e2e121128 |          0    |  0000000000000000  | ffffd20e2e145000  | \SystemRoot\System32\Config\SAM // \REGISTRY\MACHINE\SAM
| ffffd20e2e26d000 |      2b000  | ffffd20e2e26d128 |       1000    |  ffffd20e2e26d3a0  | ffffd20e2e1ff000  | files\NetworkService\NTUSER.DAT // \REGISTRY\USER\S-1-5-20
| ffffd20e2e4cd000 |      1c000  | ffffd20e2e4cd128 |          0    |  0000000000000000  | ffffd20e2e4f2000  | \SystemRoot\System32\Config\BBI
| ffffd20e2e528000 |      2c000  | ffffd20e2e528128 |          0    |  0000000000000000  | ffffd20e2e56b000  | rofiles\LocalService\NTUSER.DAT // \REGISTRY\USER\S-1-5-19
| ffffd20e2f63d000 |     237000  | ffffd20e2f5f6000 |       4000    |  ffffd20e2f63d3a0  | ffffd20e2f3f4000  | \??\C:\Users\nohuto\ntuser.dat
| ffffd20e2f68a000 |     417000  | ffffd20e2f6d1000 |       1000    |  ffffd20e2f68a3a0  | ffffd20e2f5ff000  | \Microsoft\Windows\UsrClass.dat
| ffffd20e3006a000 |       7000  | ffffd20e3006a128 |          0    |  0000000000000000  | ffffd20e300fd000  | 5n1h2txyewy\ActivationStore.dat
| ffffd20e30028000 |      1f000  | ffffd20e30028128 |          0    |  0000000000000000  | ffffd20e300fe000  | 5n1h2txyewy\ActivationStore.dat
| ffffd20e30046000 |      98000  | ffffd20e30046128 |          0    |  0000000000000000  | ffffd20e300ff000  | 5n1h2txyewy\ActivationStore.dat
| ffffd20e3725f000 |      19000  | ffffd20e3725f128 |          0    |  0000000000000000  | ffffd20e35dfa000  | 5n1h2txyewy\ActivationStore.dat
| ffffd20e3723e000 |      11000  | ffffd20e3723e128 |          0    |  0000000000000000  | ffffd20e36fcb000  | ekyb3d8bbwe\ActivationStore.dat
| ffffd20e395f2000 |       1000  | ffffd20e395f2128 |          0    |  0000000000000000  | ffffd20e376e1000  | lium\Cache\76804d2cd6f9d6e7.dat
| ffffd20e395f4000 |       6000  | ffffd20e395f4128 |          0    |  0000000000000000  | ffffd20e376e2000  | e\SystemAppData\Helium\User.dat
| ffffd20e395f6000 |       8000  | ffffd20e395f6128 |          0    |  0000000000000000  | ffffd20e298c1000  | mAppData\Helium\UserClasses.dat
| ffffd20e395f8000 |       1000  | ffffd20e395f8128 |          0    |  0000000000000000  | ffffd20e38e07000  | ache\76804d2cd6f9d6e7_COM15.dat
| ffffd20e39603000 |       1000  | ffffd20e39603128 |          0    |  0000000000000000  | ffffd20e365ce000  | lium\Cache\76804d2cd6f9d6e7.dat
| ffffd20e395f0000 |      12000  | ffffd20e395f0128 |          0    |  0000000000000000  | ffffd20e38dba000  | ekyb3d8bbwe\ActivationStore.dat
| ffffd20e39605000 |       e000  | ffffd20e39605128 |          0    |  0000000000000000  | ffffd20e2f25b000  | ekyb3d8bbwe\ActivationStore.dat
-------------------------------------------------------------------------------------------------------------------------------------------------------
```

- `Stable Length` = size of stable storage which is saved when the hive has a backing file
- `Volatile Length` = size of storage which is lost when the hive unloads

#### Backing File

| Native mount path | Backing file |
| --- | --- |
| `\REGISTRY\MACHINE\BCD00000000` | `\EFI\Microsoft\Boot\BCD` on the EFI system partition |
| `\REGISTRY\MACHINE\SYSTEM` | `%SystemRoot%\System32\Config\SYSTEM` |
| `\REGISTRY\MACHINE\SOFTWARE` | `%SystemRoot%\System32\Config\SOFTWARE` |
| `\REGISTRY\MACHINE\SAM` | `%SystemRoot%\System32\Config\SAM` |
| `\REGISTRY\MACHINE\SECURITY` | `%SystemRoot%\System32\Config\SECURITY` |
| `\REGISTRY\MACHINE\HARDWARE` | None |
| `\REGISTRY\USER\.DEFAULT` | `%SystemRoot%\System32\Config\DEFAULT` |
| `\REGISTRY\USER\S-1-5-19` | `%SystemRoot%\ServiceProfiles\LocalService\NTUSER.DAT` |
| `\REGISTRY\USER\S-1-5-20` | `%SystemRoot%\ServiceProfiles\NetworkService\NTUSER.DAT` |
| `\REGISTRY\USER\<SID>` | `%SystemDrive%\Users\<user>\NTUSER.DAT` |
| `\REGISTRY\USER\<SID>_Classes` | `%LocalAppData%\Microsoft\Windows\UsrClass.dat` |
