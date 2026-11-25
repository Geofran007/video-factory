# AI Video Factory · Fase 1

Generador automatizado de videos verticales (9:16, 1080×1920, H.264 + AAC) para TikTok y YouTube Shorts.
A partir de una temática genera guion con fuentes, narración en español latinoamericano, escenas animadas en
HTML/CSS/JS, subtítulos sincronizados, efectos, música, el MP4 final y los metadatos para publicar.

```
Tema → Claude (investigación + guion JSON) → validación de fuentes
     → Piper (voz por frase, duraciones reales) → línea de tiempo (fuente única de verdad)
     → Playwright/Chromium (frame a frame, sin GPU) → FFmpeg (mezcla con ducking + MP4) → QA automático
```

## Índice
1. [Requisitos](#requisitos) · 2. [Instalación](#instalación) · 3. [Variables de entorno](#variables-de-entorno)
4. [Configuración de Claude](#configuración-de-claude) · 5. [Generar videos](#generar-videos) · 6. [Interfaz web](#interfaz-web)
7. [Arquitectura](#arquitectura) · 8. [Control de calidad](#control-de-calidad) · 9. [Pruebas](#pruebas)
10. [Costos](#costos) · 11. [Licencias de recursos](#licencias-de-recursos) · 12. [GitHub Actions](#github-actions)
13. [Solución de errores](#solución-de-errores) · 14. [Estado y pendientes](#estado-y-pendientes)

## Requisitos

| Componente | Versión probada | Uso |
|---|---|---|
| Python | 3.12 | Motor de la aplicación |
| FFmpeg + ffprobe | 9.0 (Windows, winget) | Mezcla, codificación y QA |
| Chromium de Playwright | 156 | Render de escenas HTML |
| Piper TTS + voces `es_MX` / `es_AR` | piper-tts 1.8 | Voz local gratuita |

No requiere GPU. Funciona en Windows y en `ubuntu-latest` (GitHub Actions).

## Instalación

```bash
# Windows (PowerShell o Git Bash)
winget install --id Gyan.FFmpeg -e
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -e ".[voice,dev]"
.venv\Scripts\python -m playwright install chromium
.venv\Scripts\python scripts\setup_voices.py
copy .env.example .env
.venv\Scripts\video-factory doctor
```

```bash
# Linux / macOS
sudo apt-get install -y ffmpeg fonts-dejavu-core   # macOS: brew install ffmpeg
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[voice,dev]"
python -m playwright install --with-deps chromium
python scripts/setup_voices.py
cp .env.example .env
video-factory doctor
```

`video-factory doctor` verifica FFmpeg, Chromium, voces y credenciales.

## Variables de entorno

Se leen de `.env` (nunca se sube al repositorio) o del entorno del sistema.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ANTHROPIC_API_KEY` | Para generar con IA | Clave de la API de Anthropic. Sin ella solo se puede generar desde un `content.json` existente. |
| `VF_LLM_MODEL` | No | Sustituye el modelo de `config/providers.json` (p. ej. `claude-haiku-5-5`). |
| `VF_WEB_SEARCH` | No | `false` desactiva la búsqueda web (más barato; todo queda «requiere revisión»). |
| `VF_DAILY_BUDGET_USD` | No | Presupuesto diario máximo de la API (por defecto 2.0). |
| `FFMPEG_PATH`, `FFPROBE_PATH` | No | Rutas a los binarios si no están en el PATH. |
| `VF_PORT` | No | Puerto de la interfaz web (por defecto 8000). |

## Configuración de Claude

1. Crea una clave en <https://console.anthropic.com/settings/keys> y configura la facturación.
2. Ponla en `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
3. Ajusta `config/providers.json → llm` si lo necesitas:
   - `model`: `claude-sonnet-5-5` (por defecto), `claude-opus-5-5` (más calidad, ×2 costo) o `claude-haiku-5-5` (mínimo costo).
   - `effort`: `low` | `medium` | `high`.
   - `web_search.enabled` / `max_uses`: investigación con búsqueda web para verificar datos.
   - `pricing_usd`: precios usados para registrar el costo (consultados el 2026-10-29).

Cómo usa Claude la aplicación (`src/video_factory/ai/`):
- **Investigación** (`prompts/research.md`): una llamada con la herramienta de búsqueda web que devuelve hechos con su URL.
  Las URLs se toman de los resultados reales de búsqueda, no del texto del modelo.
- **Guion** (`prompts/script-generator.md` + `scene-generator.md`): salida estructurada validada contra el esquema
  `VideoContent` (Pydantic). La IA elige tipos de escena de una lista cerrada; **nunca genera HTML ni código**.
- **Verificación** (`validation/sources.py`): una afirmación es `verified` solo si su URL está en las fuentes, proviene
  de la búsqueda, responde HTTP < 400 y la confianza es alta. Si no, queda `needs_review` con el motivo.
- Reintentos limitados (`limits.max_llm_retries`), rechazo de solicitudes al agotar el presupuesto diario y registro del
  costo de cada llamada en `data/history.db` y `output/<job>/cost.json`.
- Con `claude-sonnet-5-5`/`opus` se activa el *fallback* del servidor ante rechazos (`fallbacks: "default"`).

## Generar videos

```bash
# Con IA
video-factory generate --topic "¿Qué pasaría si la Tierra dejara de girar?" --category ciencia --duration 45
# Sin IA, desde contenido existente (útil para pruebas o guiones escritos a mano)
video-factory generate --content examples/pulpos.json --voice femenina --style misterio
# Proponer temas nuevos (evita repetidos del historial)
video-factory topics --category historia --count 5
# Lote de videos con temas automáticos (preparado para ejecución programada)
video-factory batch --category curiosidades --count 3 --duration 35
```

Opciones: `--category` (ciencia, historia, misterio, finanzas, curiosidades), `--style` (estilo visual distinto de la
categoría), `--duration` 15–60, `--voice` (masculina, masculina_2, femenina), `--speed` 0.8–1.2.

Cada trabajo crea `output/<job_id>/`:

| Archivo | Contenido |
|---|---|
| `video.mp4` | Video final 1080×1920, 30 fps, H.264 + AAC 48 kHz |
| `thumbnail.jpg` | Miniatura |
| `script.md` | Guion legible con tiempos, verificación y fuentes |
| `metadata.json` | Título, descripción con fuentes y créditos, hashtags, datos para YouTube/TikTok |
| `subtitles.srt` | Subtítulos (además de los integrados en el video) |
| `content.json` / `timeline.json` | Contenido validado y línea de tiempo |
| `report.json` | Resultado de cada control de calidad |
| `research.md`, `cost.json` | Investigación y costo de la IA (solo con IA) |
| `job.log` | Log del trabajo |

Si un trabajo se repite sobre la misma carpeta, las etapas con artefacto existente (p. ej. `content.json`) no se vuelven
a ejecutar, así no se paga dos veces la IA.

## Interfaz web

```bash
video-factory serve          # http://127.0.0.1:8000
```

Panel de generación (temática, ejemplo sin IA, categoría, estilo, voz, velocidad, duración, estado en vivo), panel de
resultados (vista previa, descargas de MP4/guion/metadatos/subtítulos/QA/log, guion por escenas, verificación de datos,
metadatos) e historial (fecha, temática, estado, duración, costo, ruta). Es responsive. Escucha solo en `127.0.0.1`
y procesa un video a la vez.

## Arquitectura

```
src/video_factory/
├── core/         models (contratos Pydantic) · interfaces (Protocols) · pipeline · config · media (FFmpeg) · logs
├── ai/           claude_provider · content_generator · prompts · topic_registry
├── audio/        tts_provider (Piper) · narration · sound_effects · music · audio_mixer · licensed_assets
├── timeline/     timeline_builder · subtitle_generator
├── video/        html_renderer (Playwright) · video_composer (FFmpeg)
├── validation/   sources (verificación de datos) · media_qa (QA del MP4)
├── publishers/   publisher_interface y youtube (YouTube Data API v3)
├── storage/      history (SQLite) · local_storage
├── web/          app (FastAPI) · static/ (interfaz)
└── cli.py
templates/runtime/   motor de escenas (engine.js, icons.js, common.css)
templates/styles/    ciencia · historia · misterio · finanzas · curiosidades (style.css + background.js)
prompts/             plantillas de prompts editables
scripts/             piper_batch (proceso de voz aislado) · setup_voices · preview_frames
```

Decisiones clave:
- **Módulos desacoplados por contratos**: la IA produce `VideoContent`; el audio produce duraciones reales; la
  `Timeline` es lo único que leen el renderizador, los subtítulos y el mezclador. Para cambiar Claude, la voz o el
  renderizador basta implementar el protocolo de `core/interfaces.py`.
- **Audio primero**: cada frase se sintetiza y se mide; las escenas duran lo que dura su narración (+ pausas
  configurables). Así no hay silencios largos al final ni subtítulos desfasados.
- **Render determinista**: `engine.js` calcula cada frame como función pura de `t` (`VF.seek(t)`), sin animaciones CSS
  ni temporizadores. Se reparte en hasta 4 procesos y los frames JPEG van por tubería a FFmpeg (sin escribir en disco).
- **HTML restringido**: plantillas fijas versionadas, CSP sin red ni scripts externos, contexto de Chromium sin
  conexión (`offline`) y todo texto de la IA insertado con `textContent`.
- **Piper aislado**: se ejecuta como proceso separado (`scripts/piper_batch.py`) porque es GPL-3.0.
- **Subtítulos**: tiempos por frase exactos (medidos); dentro de la frase, por palabra, proporcionales al número de
  fonemas que reporta Piper (aproximación de ±0,1–0,2 s; ver pendientes).

Para crear un estilo nuevo: copia `templates/styles/<estilo>/`, cambia variables en `style.css` y el fondo en
`background.js`, y añádelo a `index.html` y a `Category` en `core/models.py`. Para revisar el diseño sin renderizar
el video completo: `python scripts/preview_frames.py output/<job>/timeline.json hoja.jpg 1.0 5.0 --style historia`.

## Control de calidad

Automático en cada video (`report.json`): duración en rango, escenas contiguas con duración, subtítulos ordenados sin
solaparse y dentro del video, narración dentro de su escena, audio existente/audible/sin clipping (pico ≤ −0,5 dBFS),
MP4 no vacío y bajo el tamaño máximo, H.264 yuv420p, 1080×1920, 30 fps, AAC, duración igual a la línea de tiempo
(±0,2 s), sin escenas negras > 0,4 s y sin silencio final > 1,5 s. Si algún control falla, el trabajo queda como
`qa_failed` y se conservan los intermedios para depurar.

## Pruebas

```bash
pytest -m "not integration"   # 41 pruebas unitarias (~5 s, sin red ni costo)
pytest -m integration         # genera un video completo real (~2 min)
```

## Costos

| Concepto | Costo |
|---|---|
| Piper, FFmpeg, Playwright, música y efectos | $0 (local) |
| Claude Sonnet 5.5 | $2 / M tokens de entrada, $10 / M de salida |
| Búsqueda web | $10 por 1.000 búsquedas ($0,01 c/u), máx. 3 por video |
| GitHub Actions | Gratis en repos públicos; 2.000 min/mes en privados (≈ 4–6 min por video) |

Estimación por video con Sonnet 5.5 y búsqueda web: **≈ $0,15–0,25** (investigación ≈ 20–30 k tokens de entrada por
los resultados de búsqueda + 3 búsquedas; guion ≈ 4 k de entrada y 6–8 k de salida). **Aún no está medido con
llamadas reales**; el costo real queda en `cost.json` y en el historial. Para abaratar: `VF_LLM_MODEL=claude-haiku-5-5`
(≈ $0,01–0,04) o `VF_WEB_SEARCH=false`.

## Voz natural opcional: Chatterbox (MIT)

Voz más natural en español latino (`chatterbox_latam`), basada en
[Chatterbox Multilingual es-MX/LatAm](https://huggingface.co/ResembleAI/Chatterbox-Multilingual-es-mx-latam).
Corre en un entorno aislado porque sus dependencias fijas chocan con las del proyecto:

```bash
py -3.12 -m venv .venv-chatterbox
.venv-chatterbox\Scripts\python -m pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
.venv-chatterbox\Scripts\python -m pip install chatterbox-tts==0.1.7
.venv-chatterbox\Scripts\python scripts\setup_chatterbox.py      # descarga ~3 GB
set VF_MAX_JOB_SECONDS=7200
video-factory generate --content examples/tiburones.json --style oceano --voice chatterbox_latam
```

- **Muy lenta sin GPU**: ~2 min por frase en un PC de 8 núcleos (un video de 30 s ≈ 13 min en total).
- No admite `--speed`. Cada frase tiene un límite de tokens proporcional al texto y se recorta si se excede,
  para evitar el audio "desbocado" que el modelo produce a veces.
- Los audios llevan la marca de agua inaudible Perth de Resemble AI.
- En GitHub Actions funciona pero tarda 30–90 min por video (runners sin GPU); el entorno y el modelo se guardan en caché.

### Tu propia voz (`mi_voz`)

Chatterbox no se entrena: copia el timbre de un clip de referencia en cada síntesis. Usa solo tu voz o una con
autorización escrita de su dueño.

1. Graba 15–20 s en un lugar silencioso, con el tono de narrador de los videos.
2. Conviértela a `models/mi-voz/referencia.wav` (mono, 24 kHz). `models/` y `entrenamiento/` nunca se suben.
3. `video-factory generate --content examples/tiburones.json --style oceano --voice mi_voz`

Ajustes en `config/providers.json → tts.voices.mi_voz`: `exaggeration` (expresividad), `cfg_weight` (más bajo = más
parecido al ritmo del clip) y `seed`.

**Otra voz propia** (ej. `voz_zueria`): copia la entrada `mi_voz` en `providers.json` con otro nombre y otro
`audio_prompt` (`models/<nombre>/referencia.wav`), cífrala en `voces/<nombre>.wav.gpg` con la **misma** contraseña y
añádela a `options`, a `CHATTERBOX` y al `case` de descifrado en `.github/workflows/generate.yml`.

Para GitHub Actions la referencia va **cifrada** en `voces/referencia.wav.gpg` (AES-256) y la contraseña solo como
secreto `VOICE_PASSPHRASE`. Para cambiarla:

```bash
gpg --symmetric --cipher-algo AES256 --output voces/referencia.wav.gpg models/mi-voz/referencia.wav
gh secret set VOICE_PASSPHRASE
```

## Licencias de recursos

- **Voces**: `es_MX-claude-high` (Apache-2.0), `es_MX-ald-medium` (Unlicense), `es_AR-daniela-high` (CC BY-SA 4.0,
  requiere atribución: se añade automáticamente en `metadata.json → credits` y en la descripción).
- **Música y efectos**: generados por síntesis con FFmpeg en cada ejecución; son originales del proyecto.
- **Íconos y fondos**: dibujados por el proyecto (`icons.js`, `background.js`).
- **Recursos de terceros**: solo se usan si están en `assets/LICENSES.json` con `file`, `license` y `source`
  (p. ej. `assets/music/ciencia/pista.mp3`). Así ningún recurso sin autorización termina en un video.
- **Piper** (GPL-3.0) se invoca como programa separado.

## GitHub Actions

- `.github/workflows/ci.yml`: en cada push/PR instala FFmpeg, Chromium y voces; ejecuta pruebas unitarias y la de
  integración (video completo sin IA).
- `.github/workflows/generate.yml`: ejecución manual (*Run workflow*) con temática, categoría, duración y voz; sube el
  MP4, guion, metadatos y reportes como artefacto (7 días). Requiere el secreto `ANTHROPIC_API_KEY`
  (*Settings → Secrets and variables → Actions*). Sin temática usa el ejemplo y no llama a la IA. Con la voz `mi_voz`
  también requiere `VOICE_PASSPHRASE`; el clip descifrado se borra al terminar.
- `.github/workflows/publish.yml`: **publicación en YouTube** (autorizada por el autor el 2026-11-19, cambio de la
  regla 8 de la Fase 1). Dos turnos al día (9:00 y 17:00 locales, en `config/horarios.json`) toma el **mismo tema** de `contenidos/cola/es/` (Leo curioso) y de
  `contenidos/cola/en/` (Curious Leo), genera el video con `voz_zueria` y lo sube como **privado**; luego mueve el
  guion a `contenidos/publicados/<idioma>/` con el enlace del video. Si el control de calidad falla, no sube nada.
  GitHub retrasa las ejecuciones hasta 12 h, por eso se intenta cada 3 h y `scripts/turnos.py` prepara cada turno
  con hasta 24 h de antelación; `contenidos/publicados/turnos.json` evita repetirlo. La variable de repositorio
  `YT_PROGRAMAR=si` (activada el 2026-11-25 por el autor) hace público cada video automáticamente a su hora; sin ella quedan privados.
  También se puede lanzar a mano (*Run workflow*) con la opción «prueba» para generar sin subir.

### Publicar en YouTube

1. Google Cloud: proyecto con *YouTube Data API v3*, pantalla de consentimiento **Externa en producción** (página
   principal y privacidad en https://geofran007.github.io/curious-leo-legal/) y credencial OAuth *App de escritorio*
   guardada en `credenciales/client_secret.json` (excluida de git).
2. `pip install -e ".[youtube]"` y, por canal, `python scripts/youtube_auth.py --canal es|en`: elige el canal en el
   navegador y el script guarda `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN_<ES|EN>` y
   `YT_CHANNEL_ID_<ES|EN>` como secretos de GitHub sin mostrarlos.
3. Pon guiones en las colas con prefijo de orden (`001-…json`). El campo `language` del guion debe coincidir con
   la cola. Con la voz propia del autor los videos no se marcan como contenido sintético (YouTube exime clonar la propia voz); con cualquier otra voz, sí. Se declaran «no es para niños».
4. Mientras la API no pase la auditoría de YouTube, los videos quedan privados: publícalos o prográmalos en
   YouTube Studio. Cuota: ~6 subidas por día por proyecto.

### Publicar en TikTok (opcional)

Después de YouTube, el mismo video se envía a TikTok si existen los secretos `TIKTOK_*` del canal; si faltan o
TikTok falla, YouTube no se ve afectado (queda registro en `contenidos/publicados/<idioma>/*.tiktok.json`).

1. En https://developers.tiktok.com crea una app con los productos **Login Kit** (Desktop, redirect URI
   `http://127.0.0.1:3455/callback/`) y **Content Posting API**. Envía la app a revisión (*App review*); mientras
   está en *sandbox* solo funciona con las cuentas agregadas como usuarios de prueba.
2. Guarda el Client key y el Client secret en `credenciales/tiktok_app.json` (`{"client_key": "…", "client_secret": "…"}`,
   carpeta excluida de git) y, por cuenta, corre `python scripts/tiktok_auth.py --canal es|en`.
3. TikTok cambia el refresh token cada vez que se usa. Crea un token de GitHub *fine-grained* solo para este
   repositorio con permiso **Secrets: Read and write** y guárdalo como secreto `GH_SECRETS_TOKEN`: el workflow lo usa
   para guardar el token nuevo al final de cada ejecución. Sin él, TikTok dejará de funcionar tras la primera subida.
4. Modo (variable de repositorio `TIKTOK_MODE`):
   - `inbox` (por defecto): el video llega como **borrador** a la bandeja de entrada de TikTok y lo publicas desde la
     app (máximo 5 borradores pendientes por día).
   - `direct`: publica directo, pero mientras la app no pase la **auditoría** de TikTok la cuenta debe ser privada y el
     video queda visible solo para ti. Conecta con `--modo direct` para pedir el permiso `video.publish`.

## Solución de errores

| Síntoma | Causa y solución |
|---|---|
| `No se encontró ffmpeg` | Instala FFmpeg o define `FFMPEG_PATH`/`FFPROBE_PATH`. Tras `winget` abre una terminal nueva (la app también lo busca en la carpeta de winget). |
| `Executable doesn't exist ... chromium` | `python -m playwright install chromium` (en Linux, `--with-deps`). |
| `Falta el modelo de voz` | `python scripts/setup_voices.py` |
| `No hay credenciales de Anthropic` / `ANTHROPIC_API_KEY inválida` | Revisa `.env`; la clave empieza por `sk-ant-`. |
| `Presupuesto diario agotado` | Sube `VF_DAILY_BUDGET_USD` o espera al día siguiente (UTC). |
| `El guion tiene N palabras y se esperaban ≈M` | El modelo no respetó la duración; vuelve a generar o ajusta `audio.words_per_second`. |
| Video más largo de 60 s | Se acelera la voz hasta `audio.max_speed` (1.2); si aún excede, falla: acorta el guion. |
| `qa_failed` | Abre `report.json`; los intermedios (`video_noaudio.mp4`, `mix.wav`) se conservan para depurar. |
| Texto cortado o pequeño en escenas | Revisa con `scripts/preview_frames.py`; los límites de cada caja están en `common.css`. |
| Render lento | Ajusta `video.render_workers` en `settings.json` (por defecto automático, hasta 4) o `video.preset`. |
| Caracteres extraños en la consola de Windows | Usa Windows Terminal; los archivos se escriben siempre en UTF-8. |

## Estado y pendientes

**Probado y funcionando** (Windows 11, 8 núcleos, 8 GB): generación completa desde contenido JSON con las 3 voces y
los 5 estilos; video de 39 s en ≈ 2 min (render ≈ 100 s con 4 procesos); 22/22 controles de QA; 42 pruebas
(41 unitarias + 1 de integración); interfaz web probada en escritorio y móvil.

**Implementado pero no probado con la API real** (no había `ANTHROPIC_API_KEY`): llamadas a Claude (investigación con
búsqueda web y guion estructurado), costos reales, comandos `topics` y `batch`. Las pruebas usan un cliente simulado.

**No probado**: los workflows de GitHub Actions (el repositorio aún no tiene remoto).

**Pendiente / mejoras**: alineación palabra a palabra exacta (p. ej. whisper.cpp); fuente tipográfica incluida en el
repositorio (hoy usa fuentes del sistema: Segoe UI en Windows, DejaVu en Linux, por lo que el aspecto cambia un poco);
imágenes y mapas históricos con licencia; personajes animados; proveedores de voz en la nube; publicación (Fase 2).
