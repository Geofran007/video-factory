Actúa como guionista de videos cortos verticales (TikTok / YouTube Shorts) en español latinoamericano y como verificador de datos.

Voy a generar 30 videos de "datos curiosos". Tú solo escribes el CONTENIDO en JSON; mi programa hace la voz, las animaciones, la música y los subtítulos. Por eso el JSON debe cumplir EXACTAMENTE el formato de abajo: si un campo está mal, el video no se genera.

## Reparto de los 30 videos
- 8 de "ciencia", 7 de "curiosidades", 6 de "historia", 5 de "misterio", 4 de "finanzas".
- Temas distintos entre sí, sorprendentes pero 100 % reales y verificables. Nada de leyendas presentadas como hechos, ni salud/medicina con consejos, ni política.
- En "misterio": casos reales sin resolver, presentando solo lo comprobado y dejando claro qué no se sabe.

## Reglas del guion
- Duración: 25–40 segundos → la suma de todas las "narration" debe tener entre 65 y 95 palabras.
- Entre 5 y 7 escenas. La primera con "role": "hook", la última con "role": "closing" y al menos una con "role": "surprise". Las del medio son "development" o "surprise".
- El gancho (primera escena) debe enganchar en 3 segundos; normalmente una pregunta tipo "¿Sabías que…?" o una afirmación impactante. El campo "hook" es IDÉNTICO a la "narration" de la primera escena.
- La última escena invita a comentar con una pregunta concreta relacionada con el tema.
- "narration": frases cortas y naturales para decir en voz alta. Escribe los números con letras ("cuatrocientos cincuenta millones"), sin abreviaturas, sin siglas raras, sin emojis, sin paréntesis.
- "on_screen_text": máximo 60 caracteres (límite duro 90); aquí sí usa cifras ("450 millones").
- "highlight_words": 1 o 2 palabras que aparezcan literalmente en "on_screen_text".
- No inventes datos. Cada dato importante va en "claims" con al menos una fuente real (URL que exista; prefiere Wikipedia, NASA, NOAA, National Geographic, museos, universidades, Britannica, bancos centrales). Si no estás seguro de un dato, no lo uses.

## Tipos de escena permitidos ("type") y campos obligatorios
- "title": solo texto grande.
- "statement": frase en pantalla.
- "icon_fact": ícono grande + texto.
- "big_number": requiere "big_number" (máx. 16 caracteres, p. ej. "450" o "1.000.000") y "number_caption" (máx. 60).
- "list": requiere "items" con 2 a 4 elementos (máx. 48 caracteres cada uno).
- "comparison": requiere "items" con EXACTAMENTE 2 elementos.
- "chart": requiere "chart" con 2 a 5 puntos {"label" (máx. 24), "value" (número)}.
- "timeline": requiere "chart" con 2 a 5 puntos; "value" = millones de años atrás (≥ 0).
- "illustration": requiere "illustration" con uno de: "shark", "ancient_shark", "tree", "dinosaur", "human". Úsalo SOLO si el tema trata de eso.
- "cta": escena final de comentario.
Varía los tipos: no más de 2 "statement" por video.

## Valores permitidos (usa solo estos, escritos igual)
- "category": "ciencia" | "historia" | "misterio" | "finanzas" | "curiosidades"
- "icon": brain, heart, atom, globe, clock, star, bolt, eye, question, chart, coin, rocket, planet, book, map, drop, fire, wave, dna, landmark, key, lightbulb, skull, crown
- "sfx": none, whoosh, impact, riser, pop, ding, bubbles (usa "impact" o "riser" en el gancho y en la sorpresa; "bubbles" solo en temas de agua/océano)
- "transition": fade, slide, zoom, wipe
- "confidence": "alta" | "media" | "baja" (solo "alta" si la fuente lo dice explícitamente)

## Formato EXACTO de cada video
```json
{
  "topic": "¿Sabías que los tiburones son más antiguos que los árboles?",
  "category": "ciencia",
  "title": "Los tiburones son MÁS ANTIGUOS que los árboles",
  "hook": "¿Sabías que los tiburones son más antiguos que los árboles?",
  "scenes": [
    {"id": "s1", "role": "hook", "type": "illustration",
     "narration": "¿Sabías que los tiburones son más antiguos que los árboles?",
     "on_screen_text": "Más antiguos que los árboles", "highlight_words": ["antiguos"],
     "illustration": "shark", "icon": "question", "sfx": "impact", "transition": "fade"},
    {"id": "s2", "role": "development", "type": "big_number",
     "narration": "Sus rastros más antiguos son escamas de hace unos cuatrocientos cincuenta millones de años.",
     "on_screen_text": "Escamas de 450 millones de años", "highlight_words": ["escamas"],
     "big_number": "450", "number_caption": "millones de años: las escamas más antiguas",
     "icon": "clock", "sfx": "bubbles", "transition": "zoom"},
    {"id": "s3", "role": "surprise", "type": "timeline",
     "narration": "Cuando aparecieron los dinosaurios, los tiburones ya llevaban cerca de doscientos millones de años en el océano.",
     "on_screen_text": "Antes que bosques y dinosaurios", "highlight_words": ["Antes"],
     "chart": [{"label": "Tiburones", "value": 450}, {"label": "Árboles", "value": 385}, {"label": "Dinosaurios", "value": 233}],
     "icon": "clock", "sfx": "riser", "transition": "wipe"},
    {"id": "s4", "role": "closing", "type": "cta",
     "narration": "¿Qué otro ser vivo te sorprendería por su edad? Cuéntamelo en los comentarios.",
     "on_screen_text": "¿Qué ser vivo es aún más antiguo?", "highlight_words": ["antiguo"],
     "icon": "question", "sfx": "pop", "transition": "slide"}
  ],
  "description": "Descripción para la publicación (2-3 frases, máx. 300 caracteres) con el dato principal.",
  "hashtags": ["tiburones", "ciencia", "sabiasque", "datoscuriosos"],
  "sources": [
    {"title": "Shark evolution: a 450 million year timeline", "url": "https://www.nhm.ac.uk/discover/shark-evolution-a-450-million-year-timeline.html", "publisher": "Natural History Museum"}
  ],
  "claims": [
    {"statement": "Las evidencias más antiguas de tiburones son escamas de unos 450 millones de años.", "scene_id": "s2",
     "source_urls": ["https://www.nhm.ac.uk/discover/shark-evolution-a-450-million-year-timeline.html"], "confidence": "alta"}
  ]
}
```
(El ejemplo tiene 4 escenas por brevedad; los tuyos deben tener 5–7.)

Reglas de "claims": cada "scene_id" debe existir en "scenes"; cada URL de "source_urls" debe estar también en "sources". Hashtags: 4–7, sin "#", sin espacios ni tildes.

## Entrega
Como son muchos, entrégalos en 6 respuestas de 5 videos. En cada respuesta: un bloque ```json por video, cada uno con UN solo objeto JSON válido (comillas dobles, sin comentarios, sin comas finales). Antes de cada bloque, una línea con el nombre de archivo: `video-01.json`, `video-02.json`, … `video-30.json`.
Antes de entregar cada video, revisa: palabras de narración 65–95, hook = narración de s1, tipos con sus campos obligatorios, valores solo de las listas, URLs reales.
Empieza con los videos 01 al 05. Cuando te escriba "sigue", entrega los siguientes 5.
