/* ==========================================================================
   IDIOMA DE LA APP (español / inglés)
   La app está escrita en español. En inglés, este archivo traduce lo que se ve en la
   pantalla: los textos de index.html y todo lo que app.js / player.js / tutorial.js
   dibujan después (tarjetas, avisos, menús), vigilando los cambios con un MutationObserver.
   - Textos fijos: diccionario EN (texto completo en español → inglés).
   - Textos con números o nombres: PATTERNS (expresión regular → función).
   Lo que no está en el diccionario (títulos, descripciones, nombres de archivo) no se toca.
   El idioma se guarda en localStorage ("hiy-lang") y en data/config.json (Configuración).
   ========================================================================== */
(function () {
  const STORAGE_KEY = 'hiy-lang';
  let lang = 'es';
  try { if (localStorage.getItem(STORAGE_KEY) === 'en') lang = 'en'; } catch (_) { /* sin almacenamiento */ }

  const EN = {
    // Barra superior y menú del perfil
    'HIY Series - Streaming Personal (MP4 / MKV / WEBM)': 'HIY Series - Personal Streaming (MP4 / MKV / WEBM)',
    'Inicio': 'Home',
    'Favoritos': 'Favorites',
    'Escanear PC': 'Scan PC',
    'Escanear carpeta de videos en tu PC': 'Scan a video folder on your PC',
    'Buscar series, géneros, formatos...': 'Search series, genres, formats...',
    'Perfil Principal': 'Main Profile',
    'Editar perfil': 'Edit profile',
    'Configuración': 'Settings',
    'Cambiar de perfil': 'Switch profile',

    // Perfiles
    '¿Quién está viendo?': "Who's watching?",
    'Administrar perfiles': 'Manage profiles',
    'Listo': 'Done',
    'Agregar perfil': 'Add profile',
    'Crea tu perfil': 'Create your profile',
    'Cada perfil tiene su propio "Continuar viendo", sus Favoritos y su idioma.': 'Each profile has its own "Continue Watching", Favorites and language.',
    'Ej: Ana': 'E.g.: Ana',
    'Eliminar perfil': 'Delete profile',
    '¿Quieres iniciar siempre con este perfil?': 'Do you always want to start with this profile?',
    'No, preguntar siempre': 'No, always ask',
    'Sí, iniciar siempre': 'Yes, always start',
    'Iniciar siempre con este perfil': 'Always start with this profile',
    'Al abrir la app se entra directo, sin preguntar "¿Quién está viendo?".': 'The app opens straight into it, without asking "Who\'s watching?".',
    'Subir foto': 'Upload photo',
    'Quitar foto': 'Remove photo',
    'Ajustar foto': 'Adjust photo',
    'Arrastra la foto o usa las barras para elegir qué parte se ve. Con el zoom la acercas.': 'Drag the photo or use the sliders to choose which part shows. Zoom brings it closer.',
    'Acerca con el zoom para poder moverla.': 'Zoom in to be able to move it.',
    'La foto ya ocupa todo el alto: acerca con el zoom para moverla arriba o abajo.': 'The photo already fills the full height: zoom in to move it up or down.',
    'La foto ya ocupa todo el ancho: acerca con el zoom para moverla a los lados.': 'The photo already fills the full width: zoom in to move it sideways.',
    'Arriba / abajo': 'Up / down',
    'Izquierda / derecha': 'Left / right',
    'Mover arriba o abajo': 'Move up or down',
    'Mover a la izquierda o a la derecha': 'Move left or right',
    'Foto: arrastra o usa las flechas para moverla': 'Photo: drag it or use the arrow keys to move it',
    'Zoom': 'Zoom',
    'Centrar de nuevo': 'Re-center',
    'Aplicar': 'Apply',
    'No se pudo leer esa imagen': 'Could not read that image',
    'La foto pesa demasiado (máx. 2 MB)': 'The photo is too large (max. 2 MB)',
    'Formato de imagen no válido': 'Invalid image format',
    'Crear perfil': 'Create profile',
    'Guardar': 'Save',
    'Ya hay un perfil con ese nombre': 'There is already a profile with that name',
    'No se puede borrar el único perfil': 'The only profile cannot be deleted',
    'Perfil no encontrado': 'Profile not found',

    // Inicio
    '98% Coincidencia': '98% Match',
    'Cargando sinopsis de la serie destacada...': 'Loading the featured series synopsis...',
    'Reproducir': 'Play',
    'Más Información': 'More Info',
    'Más información': 'More info',
    'Continuar Viendo': 'Continue Watching',
    'Tendencias en Tu Biblioteca': 'Trending in Your Library',
    'Series de tu Almacenamiento Local (MP4 / MKV / WEBM)': 'Series from Your Local Storage (MP4 / MKV / WEBM)',
    'Más de tu biblioteca': 'More from your library',
    'No hay series en esta sección': 'No series in this section',
    'Anterior': 'Previous',
    'Siguiente': 'Next',

    // Vista Series
    'SERIE': 'SERIES',
    'PELÍCULA': 'MOVIE',
    'Serie': 'Series',
    'Película': 'Movie',
    'Series Hub': 'Series Hub',
    'Explora la colección completa de series organizadas por géneros, formatos y temporadas.': 'Explore the full collection of series organized by genre, format and season.',
    'Géneros': 'Genres',
    'Categorías': 'Categories',
    'Ordenar:': 'Sort:',
    'Sugerencias para ti': 'Suggested for you',
    'Nombre (A–Z)': 'Name (A–Z)',
    'Nombre (Z–A)': 'Name (Z–A)',
    'Más temporadas': 'Most seasons',
    'Más episodios': 'Most episodes',
    'Año de estreno': 'Release year',
    'Vista de cuadrícula': 'Grid view',
    'Vista de filas por categoría': 'Rows by category view',
    'No se encontraron series': 'No series found',
    'No hay títulos que coincidan con los filtros seleccionados.': 'No titles match the selected filters.',
    'Ver todas las series': 'See all series',
    'Solo series': 'Series only',
    'Solo películas': 'Movies only',

    // Favoritos
    'Aún no tienes favoritos': 'You have no favorites yet',
    'Agrega series con el botón': 'Add series with the',
    'de cada tarjeta o desde "Favoritos" en la ficha de la serie, y aparecerán aquí.': 'button on each card or from "Favorites" on the series page, and they will show up here.',
    'Explorar series': 'Explore series',
    'Quitar de Favoritos (L)': 'Remove from Favorites (L)',
    'Agregar a Favoritos (L)': 'Add to Favorites (L)',

    // Búsqueda
    'Resultados': 'Results',
    'Mejor resultado': 'Top result',
    'Otros resultados': 'Other results',
    'Te puede gustar': 'You may also like',
    'No encontramos nada': 'We found nothing',
    'Prueba con otro nombre o explora por género:': 'Try another name or browse by genre:',
    'Creador:': 'Creator:',
    'Reparto:': 'Cast:',

    // Ficha de la serie
    'Título de la Serie': 'Series Title',
    'Reproducir E1': 'Play E1',
    'Editar': 'Edit',
    'Editar información (E)': 'Edit info (E)',
    'Cargando información...': 'Loading info...',
    'Elenco:': 'Cast:',
    'Tipo:': 'Type:',
    'Géneros:': 'Genres:',
    'Episodios': 'Episodes',
    'Partes': 'Parts',
    'Archivo': 'File',
    'Desconocido': 'Unknown',
    'Cambios en la carpeta': 'Folder changes',
    'La carpeta de esta serie ya no está': 'This series folder is gone',
    'Esta serie se quedó sin videos': 'This series has no videos left',
    'Se borró o se movió a otro lugar. Si la moviste, vuelve a escanearla desde «Escanear PC».': 'It was deleted or moved. If you moved it, scan it again from “Scan PC”.',
    'Quitar de la biblioteca': 'Remove from library',
    'Tu lista no coincide con lo que hay ahora en la carpeta.': 'Your list does not match what is in the folder now.',
    'Actualizar lista': 'Update list',
    'Está en la carpeta pero todavía no aparece en tu lista.': 'It is in the folder but not in your list yet.',
    'Están en la carpeta pero todavía no aparecen en tu lista.': 'They are in the folder but not in your list yet.',
    'Agregar a la lista': 'Add to list',
    'Se borró o se movió de la carpeta.': 'It was deleted or moved out of the folder.',
    'Se borraron o se movieron de la carpeta.': 'They were deleted or moved out of the folder.',
    'Quitar de la lista': 'Remove from list',
    'Se quitará de la lista': 'Will be removed from the list',
    'Nuevo': 'New',
    'Ya no está': 'Gone',
    'Ahora no': 'Not now',
    'Tus archivos no se tocan': 'Your files are not touched',
    'Actualizando…': 'Updating…',
    'la lista ya estaba al día': 'the list was already up to date',
    'No se pudo actualizar la lista de capítulos': 'Could not update the episode list',
    'Has llegado al final de la temporada': 'You reached the end of the season',

    // Editar información
    'Editar información': 'Edit info',
    'Lo que cambies queda guardado como': 'Whatever you change is saved as',
    'editado por ti': 'edited by you',
    'y las búsquedas o traducciones automáticas no lo modificarán.': 'and automatic searches or translations will not change it.',
    'Título': 'Title',
    '🔒 Editado por ti': '🔒 Edited by you',
    'Restaurar automático': 'Restore automatic',
    'Restaurar': 'Restore',
    'Deshacer': 'Undo',
    'Buscar la serie con este nombre y completar su información (título oficial, descripción, géneros, póster, banner…). Desmárcalo para guardar el título exactamente como lo escribes.': 'Search the series with this name and fill in its info (official title, description, genres, poster, banner…). Uncheck it to save the title exactly as you type it.',
    'Descripción': 'Description',
    'Tipo': 'Type',
    'Sepáralos con comas.': 'Separate them with commas.',
    'Ej: Anime, Acción, Drama': 'E.g.: Anime, Action, Drama',
    'Póster': 'Poster',
    'Subir imagen': 'Upload image',
    'o pega un enlace…': 'or paste a link…',
    'Banner (fondo)': 'Banner (background)',
    'Cancelar': 'Cancel',
    'Guardar cambios': 'Save changes',
    'Guardando…': 'Saving…',
    'Cambios guardados': 'Changes saved',
    'Cambios guardados. Restaurando lo automático…': 'Changes saved. Restoring automatic values…',
    'El título no puede estar vacío': 'The title cannot be empty',
    'cierra y vuelve a abrir la app para activar la edición': 'close and reopen the app to enable editing',
    'Imagen no válida': 'Invalid image',
    'Cargando nueva información…': 'Loading new info…',
    'Buscando la serie': 'Searching the series',
    'Descripción, géneros, póster y banner': 'Description, genres, poster and banner',

    // Configuración
    'Secciones': 'Sections',
    'Perfil': 'Profile',
    'Reproducción': 'Playback',
    'Biblioteca': 'Library',
    'Datos': 'Data',
    'Así se ve tu perfil en la barra superior.': 'This is how your profile looks in the top bar.',
    'Nombre': 'Name',
    'Color del avatar': 'Avatar color',
    'Idioma de la app': 'App language',
    'Los textos de la app. La información de las series llega en español.': 'The app texts. Series info still comes in Spanish.',
    'Reproducir el siguiente episodio': 'Play the next episode',
    'Al terminar un episodio empieza el siguiente automáticamente.': 'When an episode ends, the next one starts automatically.',
    'Subtítulos activados': 'Subtitles on',
    'Muestra los subtítulos (en español si hay) al abrir un episodio.': 'Shows subtitles (Spanish if available) when an episode opens.',
    'Velocidad inicial': 'Starting speed',
    'Con la que empieza cada vez que abres la app.': 'The speed it starts with every time you open the app.',
    'Volumen inicial': 'Starting volume',
    'Normal (1x)': 'Normal (1x)',
    'Biblioteca e información': 'Library and info',
    'Títulos en español': 'Spanish titles',
    'Al escribir o buscar un título en inglés se guarda traducido (no se aplica al anime).': 'When you type or search an English title it is saved translated into Spanish (not for anime).',
    'Clave de TMDB': 'TMDB key',
    'Mostrar / ocultar': 'Show / hide',
    'Con ella la información (descripción, géneros, pósters) llega en español. Es gratuita en themoviedb.org.': 'With it, info (description, genres, posters) arrives in Spanish. It is free at themoviedb.org.',
    'Con ella la información (descripción, géneros, pósters) llega en español. Es gratuita en themoviedb.org. Déjala vacía para no cambiarla.': 'With it, info (description, genres, posters) arrives in Spanish. It is free at themoviedb.org. Leave it empty to keep it.',
    'La clave viene de la variable de entorno TMDB_API_KEY y no se puede cambiar desde aquí.': 'The key comes from the TMDB_API_KEY environment variable and cannot be changed here.',
    'Pega aquí tu clave de API': 'Paste your API key here',
    'Volver a buscar la información': 'Search info again',
    'Consulta de nuevo todas las series. Lo que editaste a mano no cambia.': 'Looks up every series again. What you edited by hand does not change.',
    'Buscar': 'Search',
    'Tus datos': 'Your data',
    'títulos': 'titles',
    'episodios': 'episodes',
    'favoritos': 'favorites',
    'a medias': 'in progress',
    'vistos': 'watched',
    'Borrar "Continuar viendo"': 'Clear "Continue Watching"',
    'Olvida en qué minuto ibas de cada episodio.': 'Forgets where you left off in each episode.',
    'Borrar': 'Clear',
    'Vaciar Favoritos': 'Empty Favorites',
    'Quita todas las series de tu lista. Las series no se borran.': 'Removes every series from your list. The series are not deleted.',
    'Vaciar': 'Empty',
    // Ayuda
    'Ayuda': 'Help',
    'Reportar un error': 'Report a bug',
    '¿Algo no funciona? Se abrirá un formulario en GitHub, en tu navegador.': 'Something not working? A form will open on GitHub, in your browser.',
    'Reportar': 'Report',
    'Errores ya reportados': 'Already reported bugs',
    'Mira si alguien ya avisó del mismo problema.': 'Check whether someone already reported the same problem.',
    'No incluyas tu clave de TMDB ni datos personales en el reporte.': "Don't include your TMDB key or personal data in the report.",
    'Se abrió GitHub en tu navegador': 'GitHub opened in your browser',
    'No se pudo abrir el navegador': "Couldn't open the browser",
    '¿Seguro? Clic otra vez': 'Sure? Click again',
    'Escribe un nombre para el perfil': 'Type a name for the profile',
    'cierra y vuelve a abrir la app para activar la configuración': 'close and reopen the app to enable settings',
    'Configuración guardada': 'Settings saved',
    'Buscando de nuevo la información de tus series…': 'Searching your series info again…',
    'Historial de "Continuar viendo" borrado': '"Continue Watching" history cleared',
    'Favoritos vaciados': 'Favorites emptied',
    'El nombre del perfil no puede estar vacío': 'The profile name cannot be empty',
    'La clave de TMDB no tiene un formato válido': 'The TMDB key is not in a valid format',
    'No se encontró información para las series nuevas': 'No info was found for the new series',

    // Escanear PC
    'Cerrar': 'Close',
    'Agregar series': 'Add series',
    '¿Dónde están tus videos?': 'Where are your videos?',
    'Buscar en mi PC': 'Search my PC',
    'Encontramos las carpetas con videos por ti.': 'We find the folders with videos for you.',
    'Elegir una carpeta': 'Choose a folder',
    'Tú indicas dónde están.': 'You tell us where they are.',
    'No movemos ni borramos nada': 'We never move or delete anything',
    '¿Primera vez? Ver tutorial': 'First time? Watch the tutorial',
    'Cómo preparar tus videos': 'How to prepare your videos',
    'Mira cómo se hace: 4 pasos, las temporadas y los errores más comunes.': 'See how it is done: 4 steps, seasons and the most common mistakes.',
    'Volver': 'Back',
    'Elegir carpeta': 'Choose folder',
    'Buscando videos en tu PC…': 'Searching for videos on your PC…',
    'Preparando…': 'Getting ready…',
    'Terminando…': 'Finishing…',
    'Deteniendo…': 'Stopping…',
    'carpetas revisadas': 'folders checked',
    'con videos': 'with videos',
    'Detener y ver lo encontrado': 'Stop and see what was found',
    'Encontramos carpetas con videos': 'We found folders with videos',
    'Marca las que quieres agregar a tu biblioteca.': 'Check the ones you want to add to your library.',
    'Marcar todas': 'Check all',
    'Desmarcar todas': 'Uncheck all',
    'No encontramos videos': 'We found no videos',
    'Puede que estén en una carpeta especial o en un disco desconectado.': 'They may be in a special folder or on a disconnected drive.',
    'Ver cómo preparar mis videos': 'See how to prepare my videos',
    'Agregar': 'Add',
    'Ya en tu biblioteca': 'Already in your library',
    'Búsqueda terminada': 'Search finished',
    'Escribe la ruta de la carpeta donde guardas tus series (formatos:': 'Type the path of the folder where you keep your series (formats:',
    'Ruta de la carpeta:': 'Folder path:',
    'Ej: C:\\Users\\TuUsuario\\Videos\\Series': 'E.g.: C:\\Users\\YourUser\\Videos\\Series',
    'Escanear Archivos': 'Scan Files',
    'Por favor ingresa una ruta de carpeta válida': 'Please enter a valid folder path',
    'Error al conectar con el servidor': 'Could not connect to the server',

    // Tutorial animado
    'Mis Videos': 'My Videos',
    'Ver': 'View',
    'Ordenar por': 'Sort by',
    'Carpeta': 'Folder',
    'Documento de texto': 'Text document',
    'Buscando videos…': 'Searching for videos…',
    '¡Tu serie ya está en la biblioteca!': 'Your series is in the library!',
    'nueva carpeta': 'new folder',
    'Descargas': 'Downloads',
    'DESCARGAS': 'DOWNLOADS',
    'Todo sale mezclado como': 'Everything shows up mixed as',
    'una sola serie': 'a single series',
    'llamada «Descargas»': 'called “Downloads”',
    'Nueva carpeta (2)': 'New folder (2)',
    'No encontramos': 'We cannot find a',
    'póster ni descripción': 'poster or description',
    'porque el nombre no es el de la serie': 'because the name is not the series name',
    'Los': 'The',
    '.avi, .wmv o .mov': '.avi, .wmv or .mov',
    'no aparecen. Conviértelos a MP4 primero.': 'files do not show up. Convert them to MP4 first.',
    'Ver otra vez': 'Watch again',
    'Pausar': 'Pause',
    '1 · Carpeta': '1 · Folder',
    '2 · Nombre': '2 · Name',
    '3 · Videos': '3 · Videos',
    '4 · Escanear': '4 · Scan',
    '5 · Temporadas': '5 · Seasons',
    '✕ Así no': '✕ Not like this',
    'Crea una carpeta: clic derecho → Nuevo → Carpeta': 'Create a folder: right click → New → Folder',
    'Ponle el nombre de la serie': 'Give it the series name',
    'Mete los videos dentro de la carpeta': 'Put the videos inside the folder',
    'Pulsa «Escanear PC» y ¡listo!': 'Press “Scan PC” and you are done!',
    'Temporada 1: deja sus videos sueltos en la carpeta': 'Season 1: leave its videos loose in the folder',
    'Temporada 2: crea una carpeta y mete ahí sus videos': 'Season 2: create a folder and put its videos there',
    'En la app, cada video sale en su temporada': 'In the app, each video shows up in its season',
    'No dejes los videos sueltos y mezclados': 'Do not leave videos loose and mixed up',
    'No uses un nombre cualquiera: pon el de la serie': 'Do not use a random name: use the series name',
    'Solo se detectan videos MP4, MKV y WEBM': 'Only MP4, MKV and WEBM videos are detected',

    // Reproductor
    'Atajos de teclado': 'Keyboard shortcuts',
    'Atajos de teclado (?)': 'Keyboard shortcuts (?)',
    'Espacio': 'Space',
    'Reproducir / Pausar': 'Play / Pause',
    'Reproducir/Pausar (Espacio)': 'Play/Pause (Space)',
    'Retroceder / Adelantar 10 s': 'Rewind / Forward 10 s',
    'Retroceder / Adelantar 30 s': 'Rewind / Forward 30 s',
    'Retroceder 10s (←)': 'Rewind 10s (←)',
    'Adelantar 10s (→)': 'Forward 10s (→)',
    'Subir / Bajar volumen': 'Volume up / down',
    'Silenciar': 'Mute',
    'Silencio': 'Muted',
    'Silenciar (M) · Volumen (↑ ↓)': 'Mute (M) · Volume (↑ ↓)',
    'Reactivar audio (M) · Volumen (↑ ↓)': 'Unmute (M) · Volume (↑ ↓)',
    'Control de volumen': 'Volume control',
    'Pantalla completa (o doble clic)': 'Fullscreen (or double click)',
    'Pantalla Completa (F)': 'Fullscreen (F)',
    'Siguiente episodio': 'Next episode',
    'Siguiente Episodio (N)': 'Next Episode (N)',
    'Activar / desactivar subtítulos': 'Turn subtitles on / off',
    'Bajar / Subir velocidad': 'Slower / Faster',
    'Velocidad de reproducción (< >)': 'Playback speed (< >)',
    'Ir al 0%–90% del episodio': 'Jump to 0%–90% of the episode',
    'Fin': 'End',
    'Ir al principio / final': 'Go to start / end',
    'Salir de pantalla completa / Cerrar': 'Exit fullscreen / Close',
    'Mostrar / ocultar esta ayuda': 'Show / hide this help',
    'Nombre Serie': 'Series Name',
    'Idioma del audio': 'Audio language',
    'Subtítulos': 'Subtitles',
    'Subtítulos (C)': 'Subtitles (C)',
    'Desactivados': 'Off',
    'Guardado para este episodio': 'Saved for this episode',
    'Archivo junto al video': 'File next to the video',
    'Cambiar subtítulo…': 'Change subtitle…',
    'Cargar subtítulos…': 'Load subtitles…',
    'Quitar subtítulo cargado': 'Remove loaded subtitle',
    'Subtítulos desactivados': 'Subtitles off',
    'Subtítulos guardados para este episodio': 'Subtitles saved for this episode',
    'No se pudieron guardar los subtítulos': 'Could not save the subtitles',
    'Subtítulo quitado': 'Subtitle removed',
    'No se pudo quitar el subtítulo': 'Could not remove the subtitle',
    'El archivo no tiene subtítulos válidos': 'The file has no valid subtitles',
    'Usa un archivo .srt o .vtt': 'Use a .srt or .vtt file',
    'No se pudo cargar el audio': 'Could not load the audio',
    'Episodio terminado · N para el siguiente': 'Episode finished · N for the next one',

    // Géneros (se muestran traducidos; por dentro siguen en español)
    'Acción': 'Action',
    'Aventura': 'Adventure',
    'Comedia': 'Comedy',
    'Fantasía': 'Fantasy',
    'Fantasía Épica': 'Epic Fantasy',
    'Terror': 'Horror',
    'Misterio': 'Mystery',
    'Psicológico': 'Psychological',
    'Ciencia Ficción': 'Science Fiction',
    'Recuentos de la vida': 'Slice of Life',
    'Deportes': 'Sports',
    'Sobrenatural': 'Supernatural',
    'Suspense': 'Thriller',
    'Música': 'Music',
    'Chicas mágicas': 'Magical Girls',
    'Infantil': 'Kids',
    'Familiar': 'Family',
    'Familia': 'Family',
    'Crimen': 'Crime',
    'Bélico': 'War',
    'Historia': 'History',
    'Espionaje': 'Espionage',
    'Médico': 'Medical',
    'Cocina': 'Cooking',
    'Naturaleza': 'Nature',
    'Viajes': 'Travel',
    'Adultos': 'Adults',
    'Política': 'Politics',
    'Telenovela': 'Soap Opera',
    'Animación': 'Animation',
    'Carreras': 'Racing',
    'Medios Locales': 'Local Media',
    'Documental': 'Documentary',
    'Romance': 'Romance',
    'Drama': 'Drama'
  };

  // Plural en inglés: n === 1 → one, si no → many
  const pl = (n, one, many) => `${n} ${Number(n) === 1 ? one : many}`;

  // Frases con partes variables. Lo que va entre comillas (títulos, mensajes) también se traduce si se puede.
  const PATTERNS = [
    [/^(\d+) Temporadas?$/, (m, n) => pl(n, 'Season', 'Seasons')],
    [/^(\d+) Temp$/, (m, n) => `${n} Seas.`],
    [/^Temporada (\d+)$/, (m, n) => `Season ${n}`],
    [/^(\d+) episodios?$/, (m, n) => pl(n, 'episode', 'episodes')],
    [/^(\d+) temporadas? · (\d+) episodios?$/, (m, a, b) => `${pl(a, 'season', 'seasons')} · ${pl(b, 'episode', 'episodes')}`],
    [/^(\d+) títulos · (\d+) episodios$/, (m, a, b) => `${pl(a, 'title', 'titles')} · ${pl(b, 'episode', 'episodes')}`],
    [/^(\d+) (serie|series)$/, (m, n) => pl(n, 'series', 'series')],
    [/^(\d+) series en tu biblioteca$/, (m, n) => `${n} series in your library`],
    [/^Mostrando (\d+) de (\d+)( series)?$/, (m, a, b, s) => `Showing ${a} of ${b}${s ? ' series' : ''}`],
    [/^Todos \((\d+)\)$/, (m, n) => `All (${n})`],
    [/^(.+) \((\d+)\)$/, (m, label, n) => (EN[label] ? `${EN[label]} (${n})` : null)],
    [/^Reproduciendo siguiente: (.+)$/, (m, t) => `Playing next: ${t}`],
    [/^Resultados para «(.+)»$/, (m, q) => `Results for “${q}”`],
    [/^No encontramos nada para «(.+)»$/, (m, q) => `We found nothing for “${q}”`],
    [/^Porque buscaste «(.+)»: parecidas a (.+)$/, (m, q, t) => `Because you searched “${q}”: similar to ${t}`],
    [/^Buscando «(.+)»$/, (m, q) => `Searching “${q}”`],
    [/^"(.+)" se agregó a Favoritos$/, (m, t) => `"${t}" was added to Favorites`],
    [/^"(.+)" se quitó de Favoritos$/, (m, t) => `"${t}" was removed from Favorites`],
    [/^hace (\d+) min$/, (m, n) => `${n} min ago`],
    [/^hace (\d+) h$/, (m, n) => `${n} h ago`],
    [/^hace (\d+) días$/, (m, n) => `${n} days ago`],
    [/^Encontramos (\d+) carpetas? con videos$/, (m, n) => `We found ${pl(n, 'folder', 'folders')} with videos`],
    [/^Agregar (\d+) carpetas?$/, (m, n) => `Add ${pl(n, 'folder', 'folders')}`],
    [/^(\d+) de (\d+) marcadas$/, (m, a, b) => `${a} of ${b} checked`],
    [/^Agregando (\d+) de (\d+)…$/, (m, a, b) => `Adding ${a} of ${b}…`],
    [/^¡Listo! Se agregaron (\d+) series? a tu biblioteca\.$/, (m, n) => `Done! ${pl(n, 'series was', 'series were')} added to your library.`],
    [/^(\d+) carpetas? no se pud(?:o|ieron) agregar$/, (m, n) => `${pl(n, 'folder', 'folders')} could not be added`],
    [/^Escaneando: (.+)$/, (m, p) => `Scanning: ${p}`],
    [/^¡Escaneo completado! Se encontraron (\d+) series nuevas\.$/, (m, n) => `Scan complete! ${n} new series found.`],
    [/^Buscando información de las series… (\d+)\/(\d+)$/, (m, a, b) => `Searching series info… ${a}/${b}`],
    [/^Información actualizada: (\d+) de (\d+) series$/, (m, a, b) => `Info updated: ${a} of ${b} series`],
    [/^Información actualizada: «(.+)»(.*)$/, (m, t, extra) => `Info updated: “${t}”${extra}`],
    [/^No se encontró información para «(.+)»\. Se guardó el título como «(.+)»\.$/, (m, q, t) => `No info found for “${q}”. The title was saved as “${t}”.`],
    [/^Cambios guardados\. Título en español: «(.+)»$/, (m, t) => `Changes saved. Spanish title: “${t}”`],
    [/^No se pudo (guardar|actualizar|iniciar la búsqueda|borrar|vaciar): (.+)$/, (m, what, err) => {
      const verb = { guardar: 'save', actualizar: 'update', 'iniciar la búsqueda': 'start the search', borrar: 'clear', vaciar: 'empty' }[what];
      return `Could not ${verb}: ${translate(err)}`;
    }],
    [/^Clave guardada \((.+)\)\. Escribe una nueva para cambiarla$/, (m, h) => `Key saved (${h}). Type a new one to change it`],
    [/^Velocidad (.+)x$/, (m, s) => `Speed ${s}x`],
    [/^Hola, (.+)$/, (m, n) => `Hi, ${n}`],
    [/^Al abrir la app entrarás directo como «(.+)»\. Puedes cambiarlo cuando quieras en Configuración → Perfil\.$/,
      (m, n) => `When the app opens you will go straight in as “${n}”. You can change it anytime in Settings → Profile.`],
    [/^Perfil «(.+)» eliminado$/, (m, n) => `Profile “${n}” deleted`],
    [/^No se pudo abrir el perfil: (.+)$/, (m, e) => `Could not open the profile: ${translate(e)}`],
    [/^Máximo (\d+) perfiles$/, (m, n) => `Maximum ${n} profiles`],
    [/^Subtítulos: (.+)$/, (m, l) => `Subtitles: ${l}`],
    [/^Audio (.*) no compatible: instala ffmpeg para oírlo$/, (m, c) => `Audio ${c} not supported: install ffmpeg to hear it`],
    [/^Color (#[0-9A-Fa-f]{6})$/, (m, c) => `Color ${c}`],
    [/^Se quitó «(.+)» de tu biblioteca$/, (m, t) => `“${t}” was removed from your library`],
    [/^«(.+)»: (.+)$/, (m, t, msg) => `“${t}”: ${translateChanges(msg)}`],
    [/^Se borraron (su único video|sus (\d+) videos) de la carpeta\.$/, (m, all, n) => (n ? `Its ${n} videos were deleted from the folder.` : 'Its only video was deleted from the folder.')],
    [/^y (\d+) archivos? más$/, (m, n) => `and ${pl(n, 'more file', 'more files')}`],
    [/^(1 capítulo nuevo|\d+ capítulos nuevos)( y (1 que ya no está|\d+ que ya no están))?$/, (m, a, b, c) =>
      `${countPhrase(a, 'new episode', 'new episodes')}${c ? ` and ${countPhrase(c, 'that is gone', 'that are gone')}` : ''}`],
    [/^(1 capítulo ya no está|\d+ capítulos ya no están)$/, (m, a) => `${countPhrase(a, 'episode is gone', 'episodes are gone')}`]
  ];

  function countPhrase(text, one, many) {
    const n = parseInt(text, 10) || 1;
    return pl(n, one, many);
  }

  // "se agregaron 2 capítulos y se quitó 1 capítulo"
  function translateChanges(msg) {
    if (EN[msg]) return EN[msg];
    return msg.split(' y ').map(part => {
      let m;
      if ((m = part.match(/^se (?:agregó|agregaron) (\d+) capítulos?$/))) return `${pl(m[1], 'episode', 'episodes')} added`;
      if ((m = part.match(/^se (?:quitó|quitaron) (\d+) capítulos?$/))) return `${pl(m[1], 'episode', 'episodes')} removed`;
      return part;
    }).join(' and ');
  }

  // Traduce un texto completo; devuelve el mismo si no hay traducción
  function translate(text) {
    if (lang !== 'en' || !text) return text;
    const s = String(text);
    const trimmed = s.trim();
    if (!trimmed) return s;
    let out = EN[trimmed];
    if (out === undefined) {
      for (const [re, fn] of PATTERNS) {
        const m = trimmed.match(re);
        if (m) {
          const r = fn(...m);
          if (r) { out = r; break; }
        }
      }
    }
    if (out === undefined || out === null) return s;
    // Conservar los espacios de alrededor (el texto puede ir junto a un <strong> o un ícono)
    return s.slice(0, s.indexOf(trimmed)) + out + s.slice(s.indexOf(trimmed) + trimmed.length);
  }

  /* ---------- Traducir la página ---------- */
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE']);

  function translateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentNode;
      if (parent && SKIP.has(parent.nodeName)) return;
      const out = translate(node.data);
      if (out !== node.data) node.data = out;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || SKIP.has(node.nodeName)) return;
    translateAttrs(node);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) {
        if (!SKIP.has(n.parentNode.nodeName)) {
          const out = translate(n.data);
          if (out !== n.data) n.data = out;
        }
      } else {
        translateAttrs(n);
      }
      n = walker.nextNode();
    }
  }

  function translateAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v) {
        const out = translate(v);
        if (out !== v) el.setAttribute(a, out);
      }
    }
  }

  if (lang === 'en') {
    document.documentElement.lang = 'en';
    // Desde ya: así se traduce index.html mientras se lee, sin que se vea primero en español
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') m.addedNodes.forEach(translateNode);
        else if (m.type === 'characterData') translateNode(m.target);
        else if (m.type === 'attributes') translateAttrs(m.target);
      }
      if (document.title) {
        const t = translate(document.title);
        if (t !== document.title) document.title = t;
      }
    }).observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
    document.addEventListener('DOMContentLoaded', () => {
      translateNode(document.body);
      document.title = translate(document.title);
    });
  }

  window.hiyI18n = {
    get lang() { return lang; },
    t: translate,
    // Cambia el idioma y recarga la app (todo se vuelve a dibujar en el idioma nuevo)
    setLang(next) {
      const value = next === 'en' ? 'en' : 'es';
      try { localStorage.setItem(STORAGE_KEY, value); } catch (_) { return false; }
      if (value !== lang) location.reload();
      return true;
    }
  };
})();
