; Windaday installer hooks.
; The app's internal product name stays "Blitzit" so updates keep installing in place
; (same folder, same settings, same sign-in). These hooks only change what people see:
; the Start menu / desktop shortcut and the name in Windows "Installed apps".

!macro NSIS_HOOK_POSTINSTALL
  IfFileExists "$SMPROGRAMS\${PRODUCTNAME}.lnk" 0 +3
    Delete "$SMPROGRAMS\Windaday.lnk"
    Rename "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$SMPROGRAMS\Windaday.lnk"
  IfFileExists "$DESKTOP\${PRODUCTNAME}.lnk" 0 +3
    Delete "$DESKTOP\Windaday.lnk"
    Rename "$DESKTOP\${PRODUCTNAME}.lnk" "$DESKTOP\Windaday.lnk"
  WriteRegStr SHCTX "${UNINSTKEY}" "DisplayName" "Windaday"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    Delete "$SMPROGRAMS\Windaday.lnk"
    Delete "$DESKTOP\Windaday.lnk"
  ${EndIf}
!macroend
