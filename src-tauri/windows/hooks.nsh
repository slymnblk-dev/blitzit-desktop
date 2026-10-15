; Windaday installer hooks.
; From 0.6 the app installs as "Windaday" in its own folder (AppData\Local\Windaday), so the
; Start menu shortcut and the name in "Installed apps" are already "Windaday" with no renaming.
; Before 0.6 it installed as "Blitzit" in AppData\Local\Blitzit, a folder another, unrelated app
; called Blitzit also uses. This installer never touches that folder.
; Settings and sign-in are kept: they live under the app identifier, which did not change.

!macro NSIS_HOOK_POSTINSTALL
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend
