; ==========================================================================
; Añadidos al instalador NSIS (electron-builder lo incluye por "nsis.include")
;  - Guarda el idioma elegido en el instalador: la app empieza en ese idioma (main.js)
;  - Al desinstalar pregunta si borrar también la biblioteca, perfiles y configuración
;    (si no, quedaban en %APPDATA% y una instalación nueva los volvía a usar)
; ==========================================================================

!macro customInstall
  ; $LANGUAGE: 1033 = inglés; cualquier otro (1034 / 3082) = español
  FileOpen $0 "$INSTDIR\resources\installer-language" w
  FileWrite $0 "$LANGUAGE"
  FileClose $0
!macroend

!macro customUnInstall
  ; Al actualizar también se ejecuta el desinstalador de la versión anterior: ahí no se pregunta
  ${ifNot} ${isUpdated}
    ; El texto se elige aquí y no con LangString: este archivo se carga antes que los idiomas
    ${if} $LANGUAGE == 1033
      StrCpy $1 "Also delete your HIY Series library, profiles, progress and settings?$\r$\n$\r$\nYour videos are not deleted."
    ${else}
      StrCpy $1 "¿Borrar también tu biblioteca, perfiles, progreso y configuración de HIY Series?$\r$\n$\r$\nTus videos no se borran."
    ${endIf}
    MessageBox MB_YESNO|MB_ICONQUESTION "$1" /SD IDNO IDNO hiyKeepData
      RMDir /r "$APPDATA\hiy-series\data"
      RMDir /r "$APPDATA\hiy-series\media"
    hiyKeepData:
  ${endIf}
!macroend
