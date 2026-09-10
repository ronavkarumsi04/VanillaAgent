; ─────────────────────────────────────────────────────────────────────────────
;  VanillaAgent Windows Installer (NSIS)
;  ─────────────────────────────────────
;  A dark, themed installer built with nsDialogs: welcome, license, options,
;  install (file copy + runtime dependency bootstrap) and a branded finish page.
;
;  Tokens replaced at build time: @@VERSION@@ @@PAYLOAD@@ @@ASSETS@@ @@OUTFILE@@
; ─────────────────────────────────────────────────────────────────────────────

Unicode True
SetCompressor /SOLID /FINAL lzma
SetCompress force
ShowInstDetails show
ShowUninstDetails show
RequestExecutionLevel user
AllowSkipFiles off
AutoCloseWindow false

!define PRODUCT_NAME     "VanillaAgent"
!define PRODUCT_VERSION  "@@VERSION@@"
!define PRODUCT_PUBLISHER "VanillaAgent"
!define PRODUCT_ID       "com.vanillaagent.runtime"
!define PRODUCT_URL      "https://github.com/ronavkarumsi04/VanillaAgent"
!define UNINSTALL_KEY    "Software\Microsoft\Windows\CurrentVersion\Uninstall\VanillaAgent"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "@@OUTFILE@@"
InstallDir "$LOCALAPPDATA\Programs\VanillaAgent"
InstallDirRegKey HKCU "${UNINSTALL_KEY}" "InstallLocation"

VIProductVersion "@@VERSION@@.0"
VIAddVersionKey "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey "ProductVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "FileDescription" "${PRODUCT_NAME} — Sovereign Autonomous AI Agent Runtime"
VIAddVersionKey "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "Company" "${PRODUCT_PUBLISHER}"
VIAddVersionKey "LegalCopyright" "MIT License — VanillaAgent"

; ── Brand palette (COLORREF = 0x00BBGGRR) ───────────────────────────────────
!define VA_BG        0x100D0C   ; #0c0d10  (dark-900)
!define VA_BG_DEEP   0x080706   ; #060708  (dark-950)
!define VA_PANEL     0x14181B   ; #181b20  (dark-800)
!define VA_TEXT      0xF0E8E2   ; #e2e8f0  (slate-200)
!define VA_DIM       0xB8A394   ; #94a3b8  (slate-400)
!define VA_TEAL      0xBFD42D   ; #2dd4bf  (brand-400)
!define VA_TEAL_DARK 0xA6B814   ; #14b8a6  (brand-500)


!include "LogicLib.nsh"
!include "WinMessages.nsh"
!include "FileFunc.nsh"
!include "nsDialogs.nsh"

; ── State ───────────────────────────────────────────────────────────────────
Var Dialog
Var FontTitle
Var FontBody
Var FontMono
Var LicenseText
Var LicenseCheck
Var DirField
Var NodeLabel
Var OptStartMenu
Var OptDesktop
Var OptPath
Var OptDeps
Var OptLaunch
Var NodeFound
Var NodeVersion

; ─────────────────────────────────────────────────────────────────────────────
; Helpers
; ─────────────────────────────────────────────────────────────────────────────

; Paint the outer dialog (button bar) with the brand background.
!macro VaDarkShell
  SetCtlColors $HWNDPARENT "" ${VA_BG}
!macroend

; Create the page canvas: full-bleed dark background + wordmark.
!macro VaPageCanvas
  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  CreateFont $FontTitle "Segoe UI" 13 700
  CreateFont $FontBody  "Segoe UI" 9 400
  CreateFont $FontMono  "Consolas" 8 400

  ${NSD_CreateLabel} 0u 0u 100% 100% ""
  Pop $0
  SetCtlColors $0 "" ${VA_BG}

  ${NSD_CreateBitmap} 18u 14u 32u 32u ""
  Pop $1
  ${NSD_AddStyle} $1 ${SS_CENTERIMAGE}
  ${NSD_SetImage} $1 "$PLUGINSDIR\nsis-logo.bmp" $2

  ${NSD_CreateLabel} 58u 14u 240u 14u "VanillaAgent"
  Pop $1
  SetCtlColors $1 ${VA_TEXT} ${VA_BG}
  SendMessage $1 ${WM_SETFONT} $FontTitle 0

  ${NSD_CreateLabel} 58u 30u 240u 12u "SOVEREIGN NODE v${PRODUCT_VERSION}"
  Pop $1
  SetCtlColors $1 ${VA_TEAL} ${VA_BG}
  SendMessage $1 ${WM_SETFONT} $FontMono 0

  ${NSD_CreateLabel} 18u 52u 280u 1u ""
  Pop $1
  SetCtlColors $1 ${VA_TEAL_DARK} ${VA_TEAL_DARK}
!macroend

!macro VaFooterText TEXT
  ${NSD_CreateLabel} 18u 112u 280u 20u "${TEXT}"
  Pop $1
  SetCtlColors $1 ${VA_DIM} ${VA_BG}
  SendMessage $1 ${WM_SETFONT} $FontBody 0
!macroend

; ─────────────────────────────────────────────────────────────────────────────
; Welcome
; ─────────────────────────────────────────────────────────────────────────────
Function WelcomeCreate
  !insertmacro VaDarkShell
  !insertmacro VaPageCanvas

  ${NSD_CreateLabel} 18u 60u 280u 14u "Your sovereign AI agent, one click away."
  Pop $1
  SetCtlColors $1 ${VA_TEXT} ${VA_BG}
  SendMessage $1 ${WM_SETFONT} $FontTitle 0

  ${NSD_CreateLabel} 18u 78u 280u 30u "This installs the VanillaAgent runtime, the Web GUI control panel at http://localhost:3000 and the creator CLI.$\r$\nNode.js 20 or newer is required."
  Pop $1
  SetCtlColors $1 ${VA_DIM} ${VA_BG}
  SendMessage $1 ${WM_SETFONT} $FontBody 0

  !insertmacro VaFooterText "MIT licensed · No telemetry · Wallet stays on your machine"
FunctionEnd

Function WelcomeLeave
FunctionEnd

; ─────────────────────────────────────────────────────────────────────────────
; License
; ─────────────────────────────────────────────────────────────────────────────
Function LicenseCreate
  !insertmacro VaDarkShell
  !insertmacro VaPageCanvas

  ${NSD_CreateLabel} 18u 60u 280u 12u "License"
  Pop $1
  SetCtlColors $1 ${VA_TEXT} ${VA_BG}
  SendMessage $1 ${WM_SETFONT} $FontTitle 0

  ${NSD_CreateRichEdit} 18u 74u 280u 34u ""
  Pop $LicenseText
  SendMessage $LicenseText ${WM_SETFONT} $FontMono 0
  ${NSD_RichEd_SetCustomBackgroundColor} $LicenseText ${VA_PANEL}
  SetCtlColors $LicenseText ${VA_DIM} ${VA_PANEL}
  ${NSD_SetText} $LicenseText "VanillaAgent is released under the MIT License.$\r$\n$\r$\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the $\"Software$\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:$\r$\n$\r$\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.$\r$\n$\r$\nTHE SOFTWARE IS PROVIDED $\"AS IS$\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE."
  ${NSD_Edit_SetReadOnly} $LicenseText 1

  ${NSD_CreateCheckbox} 18u 112u 280u 10u "I accept the MIT license terms"
  Pop $LicenseCheck
  SetCtlColors $LicenseCheck ${VA_TEXT} ${VA_BG}
  SendMessage $LicenseCheck ${WM_SETFONT} $FontBody 0
  ${NSD_SetState} $LicenseCheck 0
  ${NSD_OnClick} $LicenseCheck LicenseCheckClick

  ; Block "Next" until the license is accepted
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 0
FunctionEnd

Function LicenseLeave
  ${NSD_GetState} $LicenseCheck $0
  ${If} $0 == 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "Please accept the license to continue."
    Abort
  ${EndIf}
FunctionEnd

Function LicenseCheckClick
  Pop $0
  ${NSD_GetState} $LicenseCheck $1
  GetDlgItem $0 $HWNDPARENT 1
  ${If} $1 == 0
    EnableWindow $0 0
  ${Else}
    EnableWindow $0 1
  ${EndIf}
FunctionEnd

; ─────────────────────────────────────────────────────────────────────────────
; Options (install location + integrations + Node status)
; ─────────────────────────────────────────────────────────────────────────────
Function OptionsCreate
  !insertmacro VaDarkShell
  !insertmacro VaPageCanvas

  ${NSD_CreateLabel} 18u 60u 280u 12u "Install location"
  Pop $1
  SetCtlColors $1 ${VA_TEXT} ${VA_BG}
  SendMessage $1 ${WM_SETFONT} $FontTitle 0

  ${NSD_CreateText} 18u 72u 212u 12u "$INSTDIR"
  Pop $DirField
  SetCtlColors $DirField ${VA_TEXT} ${VA_PANEL}
  SendMessage $DirField ${WM_SETFONT} $FontBody 0

  ${NSD_CreateBrowseButton} 234u 71u 64u 14u "Browse..."
  Pop $1
  SetCtlColors $1 ${VA_TEXT} ${VA_PANEL}
  ${NSD_OnClick} $1 OnBrowse

  ${NSD_CreateCheckbox} 18u 90u 280u 10u "Start Menu shortcuts"
  Pop $OptStartMenu
  SetCtlColors $OptStartMenu ${VA_TEXT} ${VA_BG}
  SendMessage $OptStartMenu ${WM_SETFONT} $FontBody 0
  ${NSD_SetState} $OptStartMenu 1

  ${NSD_CreateCheckbox} 18u 101u 135u 10u "Desktop shortcut"
  Pop $OptDesktop
  SetCtlColors $OptDesktop ${VA_TEXT} ${VA_BG}
  SendMessage $OptDesktop ${WM_SETFONT} $FontBody 0
  ${NSD_SetState} $OptDesktop 1

  ${NSD_CreateCheckbox} 160u 101u 138u 10u "Add to PATH"
  Pop $OptPath
  SetCtlColors $OptPath ${VA_TEXT} ${VA_BG}
  SendMessage $OptPath ${WM_SETFONT} $FontBody 0
  ${NSD_SetState} $OptPath 1

  StrCpy $1 "Node.js: not detected — install it from nodejs.org after setup."
  ${If} $NodeFound == "1"
    StrCpy $1 "Node.js $NodeVersion detected."
  ${EndIf}
  ${NSD_CreateLabel} 18u 116u 280u 10u "$1"
  Pop $NodeLabel
  SetCtlColors $NodeLabel ${VA_TEAL} ${VA_BG}
  SendMessage $NodeLabel ${WM_SETFONT} $FontMono 0

  ${NSD_CreateCheckbox} 18u 128u 280u 10u "Install runtime dependencies now (recommended, ~1 min)"
  Pop $OptDeps
  SetCtlColors $OptDeps ${VA_TEXT} ${VA_BG}
  SendMessage $OptDeps ${WM_SETFONT} $FontBody 0
  ${If} $NodeFound == "1"
    ${NSD_SetState} $OptDeps 1
  ${Else}
    ${NSD_SetState} $OptDeps 0
    EnableWindow $OptDeps 0
  ${EndIf}
FunctionEnd

Function OnBrowse
  Pop $0
  ${NSD_GetText} $DirField $1
  nsDialogs::SelectFolderDialog "Choose where VanillaAgent should live" "$1"
  Pop $2
  ${If} $2 != error
    ${NSD_SetText} $DirField $2
  ${EndIf}
FunctionEnd

Function OptionsLeave
  ${NSD_GetText} $DirField $INSTDIR
  ${If} $INSTDIR == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION "Please choose an install location."
    Abort
  ${EndIf}
FunctionEnd

; ─────────────────────────────────────────────────────────────────────────────
; Install page styling (best effort — harmless if the control ids differ)
; ─────────────────────────────────────────────────────────────────────────────
Function InstfilesShow
  FindWindow $0 "#32770" "" $HWNDPARENT
  SetCtlColors $0 "" ${VA_BG}
  GetDlgItem $1 $0 1016
  ${If} $1 != 0
    SendMessage $1 ${EM_SETBKGNDCOLOR} 0 ${VA_BG}
    SetCtlColors $1 ${VA_TEXT} ${VA_BG}
  ${EndIf}
  GetDlgItem $2 $0 1004
  ${If} $2 != 0
    SendMessage $2 ${PBM_SETBARCOLOR} 0 ${VA_TEAL_DARK}
    SendMessage $2 ${PBM_SETBKCOLOR} 0 ${VA_BG_DEEP}
  ${EndIf}
FunctionEnd

; ─────────────────────────────────────────────────────────────────────────────
; Finish
; ─────────────────────────────────────────────────────────────────────────────
Function FinishCreate
  !insertmacro VaDarkShell
  !insertmacro VaPageCanvas

  ${NSD_CreateLabel} 18u 60u 280u 14u "Your agent is sovereign."
  Pop $1
  SetCtlColors $1 ${VA_TEXT} ${VA_BG}
  SendMessage $1 ${WM_SETFONT} $FontTitle 0

  ${NSD_CreateLabel} 18u 78u 280u 32u "VanillaAgent is installed. Launch it to open the Web GUI control panel at http://localhost:3000 and finish the first-run setup wizard."
  Pop $1
  SetCtlColors $1 ${VA_DIM} ${VA_BG}
  SendMessage $1 ${WM_SETFONT} $FontBody 0

  ${NSD_CreateCheckbox} 18u 112u 280u 10u "Launch VanillaAgent now"
  Pop $OptLaunch
  SetCtlColors $OptLaunch ${VA_TEXT} ${VA_BG}
  SendMessage $OptLaunch ${WM_SETFONT} $FontBody 0
  ${NSD_SetState} $OptLaunch 1

  GetDlgItem $0 $HWNDPARENT 1
  SendMessage $0 ${WM_SETTEXT} 0 "STR:Finish"
  GetDlgItem $0 $HWNDPARENT 2
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 3
  ShowWindow $0 ${SW_HIDE}
FunctionEnd

Function FinishLeave
  ${NSD_GetState} $OptLaunch $0
  ${If} $0 == 1
    ExecShell "open" "$INSTDIR\vanilla-gui.cmd"
  ${EndIf}
FunctionEnd

; ─────────────────────────────────────────────────────────────────────────────
; Sections
; ─────────────────────────────────────────────────────────────────────────────
Section "VanillaAgent Runtime" SEC_MAIN
  SectionIn RO
  SetOutPath "$INSTDIR"

  DetailPrint "Installing VanillaAgent ${PRODUCT_VERSION} to $INSTDIR"
  File /r /x "node_modules" "@@PAYLOAD@@\*.*"
  File /oname=assets\vanillaagent.ico "@@ASSETS@@\nsis-installer.ico"

  ; ── Uninstaller + registry ────────────────────────────────────────────────
  WriteUninstaller "$INSTDIR\Uninstall VanillaAgent.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "${PRODUCT_NAME} ${PRODUCT_VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\assets\vanillaagent.ico"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\Uninstall VanillaAgent.exe"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "QuietUninstallString" '"$INSTDIR\Uninstall VanillaAgent.exe" /S'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "URLInfoAbout" "${PRODUCT_URL}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "HelpLink" "${PRODUCT_URL}"
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1

  ; ── Shortcuts ─────────────────────────────────────────────────────────────
  ${NSD_GetState} $OptStartMenu $0
  ${If} $0 == 1
    CreateDirectory "$SMPROGRAMS\VanillaAgent"
    CreateShortcut "$SMPROGRAMS\VanillaAgent\VanillaAgent.lnk" \
      "$INSTDIR\vanilla-gui.cmd" "" "$INSTDIR\assets\vanillaagent.ico" 0 SW_SHOWNORMAL "" \
      "Sovereign autonomous AI agent runtime and Web GUI control panel"
    CreateShortcut "$SMPROGRAMS\VanillaAgent\VanillaAgent CLI.lnk" \
      "$INSTDIR\vanilla.cmd" "--help" "$INSTDIR\assets\vanillaagent.ico" 0 SW_SHOWNORMAL "" \
      "VanillaAgent command line interface"
    CreateShortcut "$SMPROGRAMS\VanillaAgent\Uninstall VanillaAgent.lnk" \
      "$INSTDIR\Uninstall VanillaAgent.exe"
  ${EndIf}

  ${NSD_GetState} $OptDesktop $0
  ${If} $0 == 1
    CreateShortcut "$DESKTOP\VanillaAgent.lnk" \
      "$INSTDIR\vanilla-gui.cmd" "" "$INSTDIR\assets\vanillaagent.ico" 0 SW_SHOWNORMAL "" \
      "Sovereign autonomous AI agent runtime"
  ${EndIf}

  ; ── PATH ──────────────────────────────────────────────────────────────────
  ${NSD_GetState} $OptPath $0
  ${If} $0 == 1
    ReadRegStr $1 HKCU "Environment" "Path"
    ${If} $1 == ""
      StrCpy $2 "$INSTDIR"
    ${Else}
      StrCpy $2 "$1;$INSTDIR"
    ${EndIf}
    WriteRegExpandStr HKCU "Environment" "Path" "$2"
    System::Call 'user32::SendMessageTimeout(i 0xffff, i ${WM_WININICHANGE}, i 0, t "Environment", i 2, i 5000, *i .r3) i .r4'
    DetailPrint "Added $INSTDIR to the user PATH"
  ${EndIf}

  ; ── Runtime dependencies ──────────────────────────────────────────────────
  ${NSD_GetState} $OptDeps $0
  ${If} $0 == 1
    DetailPrint "Resolving runtime dependencies (npm install) — this can take a minute..."
    StrCpy $1 "$INSTDIR\package.json"
    ${If} ${FileExists} "$1"
      ExpandEnvStrings $2 "%COMSPEC%"
      nsExec::ExecToLog '"$2" /c cd /d "$INSTDIR" ^&^& npm install --omit=dev --no-audit --no-fund'
      Pop $3
      ${If} $3 == 0
        DetailPrint "Runtime dependencies installed."
      ${Else}
        DetailPrint "npm install exited with $3 — the launcher will retry on first launch."
      ${EndIf}
    ${EndIf}
  ${Else}
    DetailPrint "Skipped dependency install — VanillaAgent will fetch them on first launch."
  ${EndIf}

  DetailPrint "Install complete."
SectionEnd

; ─────────────────────────────────────────────────────────────────────────────
; Uninstaller
; ─────────────────────────────────────────────────────────────────────────────
Function un.RemovePathEntry
  ReadRegStr $1 HKCU "Environment" "Path"
  ${If} $1 != ""
    ; Remove the install directory token from PATH
    StrLen $2 "$INSTDIR"
    StrCpy $3 ""
    StrCpy $4 0
    ${Do}
      StrCpy $5 ""
      ${Do}
        StrCpy $6 $1 1 $4
        ${If} $6 == ";"
        ${OrIf} $6 == ""
          ${ExitDo}
        ${EndIf}
        StrCpy $5 "$5$6"
        IntOp $4 $4 + 1
      ${Loop}
      IntOp $4 $4 + 1
      ${If} $5 != "$INSTDIR"
        ${If} $3 == ""
          StrCpy $3 "$5"
        ${Else}
          StrCpy $3 "$3;$5"
        ${EndIf}
      ${EndIf}
    ${LoopUntil} $6 == ""
    WriteRegExpandStr HKCU "Environment" "Path" "$3"
  ${EndIf}
FunctionEnd

Section "Uninstall"
  SetShellVarContext current

  Delete "$SMPROGRAMS\VanillaAgent\VanillaAgent.lnk"
  Delete "$SMPROGRAMS\VanillaAgent\VanillaAgent CLI.lnk"
  Delete "$SMPROGRAMS\VanillaAgent\Uninstall VanillaAgent.lnk"
  RMDir "$SMPROGRAMS\VanillaAgent"
  Delete "$DESKTOP\VanillaAgent.lnk"

  Call un.RemovePathEntry
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  DeleteRegKey HKCU "Software\VanillaAgent"

  RMDir /r "$INSTDIR\node_modules"
  RMDir /r "$INSTDIR\app"
  RMDir /r "$INSTDIR\cli"
  RMDir /r "$INSTDIR\lib"
  RMDir /r "$INSTDIR\skills"
  RMDir /r "$INSTDIR\docs"
  RMDir /r "$INSTDIR\assets"
  Delete "$INSTDIR\package.json"
  Delete "$INSTDIR\pnpm-lock.yaml"
  Delete "$INSTDIR\install-manifest.json"
  Delete "$INSTDIR\vanilla"
  Delete "$INSTDIR\vanilla.cmd"
  Delete "$INSTDIR\vanilla-gui"
  Delete "$INSTDIR\vanilla-gui.cmd"
  Delete "$INSTDIR\vanilla-cli"
  Delete "$INSTDIR\vanilla-cli.cmd"
  Delete "$INSTDIR\Uninstall VanillaAgent.exe"
  RMDir /r "$INSTDIR"
SectionEnd

; ─────────────────────────────────────────────────────────────────────────────
; Init / page order
; ─────────────────────────────────────────────────────────────────────────────
Function .onInit
  InitPluginsDir
  File /oname=$PLUGINSDIR\nsis-logo.bmp "@@ASSETS@@\nsis-logo.bmp"
  File /oname=$PLUGINSDIR\nsis-wordmark.bmp "@@ASSETS@@\nsis-wordmark.bmp"

  ; Detect Node.js (v20+)
  StrCpy $NodeFound "0"
  StrCpy $NodeVersion ""
  nsExec::ExecToStack '"$SYSDIR\cmd.exe" /c node --version'
  Pop $0
  Pop $1
  ${If} $0 == 0
    StrCpy $NodeVersion "$1"
    ${Do}
      StrLen $5 $NodeVersion
      IntOp $5 $5 - 1
      StrCpy $6 $NodeVersion 1 $5
      ${If} $6 == "$\r"
      ${OrIf} $6 == "$\n"
        StrCpy $NodeVersion $NodeVersion $5
      ${Else}
        ${ExitDo}
      ${EndIf}
    ${Loop}
    StrCpy $NodeFound "1"
    ; major version check
    StrCpy $2 ""
    StrCpy $3 1
    ${Do}
      StrCpy $4 $NodeVersion 1 $3
      ${If} $4 == "."
      ${OrIf} $4 == ""
        ${ExitDo}
      ${EndIf}
      StrCpy $2 "$2$4"
      IntOp $3 $3 + 1
    ${Loop}
    ${If} $2 < 20
    ${AndIf} $2 != ""
      StrCpy $NodeFound "0"
      MessageBox MB_OK|MB_ICONINFORMATION "Node.js $NodeVersion was found but VanillaAgent needs version 20 or newer.$\r$\n$\r$\nThe installer will continue; install a newer Node.js from https://nodejs.org before launching VanillaAgent."
    ${EndIf}
  ${EndIf}
FunctionEnd

Function .onInstSuccess
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Remove VanillaAgent ${PRODUCT_VERSION} from your computer?" IDYES +2
  Abort
FunctionEnd

Function un.onUninstSuccess
FunctionEnd

Page custom WelcomeCreate WelcomeLeave
Page custom LicenseCreate LicenseLeave
Page custom OptionsCreate OptionsLeave
Page instfiles "" InstfilesShow ""
Page custom FinishCreate FinishLeave
