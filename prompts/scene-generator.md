## Tipos de escena disponibles (campo `type`)
Las plantillas visuales ya existen; tú solo eliges el tipo y llenas los datos. No escribas HTML, CSS ni código.

| type | Uso | Campos obligatorios |
|---|---|---|
| title | Gancho inicial o título impactante | on_screen_text |
| statement | Explicación breve con ícono | on_screen_text, icon |
| big_number | Una cifra protagonista que cuenta hacia arriba | big_number (solo el número, p. ej. "500", "3", "1.600"), number_caption |
| list | 2 a 4 elementos que aparecen uno a uno | items |
| comparison | Dos conceptos enfrentados (A vs B) | items (exactamente 2) |
| chart | Gráfico de barras con 2 a 5 valores reales | chart [{label, value}] |
| icon_fact | Dato curioso con ícono grande | on_screen_text, icon |
| cta | Cierre con llamada a la acción | on_screen_text |

Íconos permitidos (`icon`): brain, heart, atom, globe, clock, star, bolt, eye, question, chart, coin, rocket,
planet, book, map, drop, fire, wave, dna, landmark, key, lightbulb, skull, crown.

Efectos de sonido (`sfx`): none, whoosh (movimiento), impact (revelación fuerte), riser (tensión antes del dato),
pop (aparición ligera), ding (dato curioso). Usa como máximo uno por escena y no repitas el mismo en escenas seguidas.

Transiciones (`transition`): fade, slide, zoom, wipe. Varíalas.

Reglas visuales:
- `on_screen_text` es corto (máximo 8 palabras) y complementa la narración, no la copia completa.
- `highlight_words` contiene 1 o 2 palabras que aparecen literalmente en `on_screen_text`.
- No repitas el mismo `type` en dos escenas consecutivas.
- Los valores de `chart` deben ser datos reales respaldados por las fuentes.
