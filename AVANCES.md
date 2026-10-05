# Estado del desarrollo — 15 de septiembre de 2026 (Chile)

## Actualizador acumulativo local — 16 de septiembre de 2026

Implementado por elección expresa del usuario: descargador en su PC, panel en http://127.0.0.1:5180/, SQLite acumulativa por ID y parche, consulta del total, progreso real, pausa/reanudación y exportación por parche. Programación configurable cada 6/12/24 horas, por defecto 6; instalado inicio con la sesión de Windows. El servicio continúa al cerrar la pestaña. La clave permanece en `.env.local`, la base y logs están excluidos de Git.

Comprobado con descargas reales: la base empezó con 127 partidas y aumentó; se probó pausar, reiniciar el servicio y reanudar desde la partida pendiente sin perder las ya guardadas. Tests verifican deduplicación, almacenamiento persistente, parches, normalización, protección de origen y validación. Panel revisado en escritorio y móvil sin desbordamiento. Esta incorporación es local y no requiere republicar la web. La colección local no se sincroniza automáticamente con la web publicada; genera la muestra local para una publicación posterior.

## Cierre de revisión — 16 de septiembre de 2026

Los pendientes de implementación y comprobación de este registro están completados. Motor, TypeScript, ESLint y compilación pasan; ESLint conserva únicamente la advertencia por imágenes de Data Dragon. Se verificaron en navegador la práctica automática, deshacer decisiones con respuesta rival, volver al original y el enfoque del panel propio durante turnos rivales. Escritorio (1440 px) y móvil (390 px) no presentan desbordamiento horizontal; los botones tienen nombre accesible.

Se corrigió el exceso de peso de campeones flex usando presencia por su mejor rol disponible; el plan provisional fija el rol de cada nuevo candidato para evitar desplazarlo después a otro rol con poca evidencia. Se reforzó el seguimiento de iniciación y se desactivó el desempate estadístico en parches incompatibles. Las pruebas adicionales verifican pools en la propuesta completa y prioridad de protección para Jinx.

Esta revisión está validada para publicación en el sitio privado existente. El resultado del despliegue se confirma en la respuesta de entrega. El resto del documento conserva el registro del punto de guardado anterior. Permanecen los límites del producto: muestra de 127 partidas de Solo/Duo, actualización manual y predicciones sin calibración profesional; no son errores pendientes de esta entrega.

## Objetivo de esta actualización

Priorizar la sinergia del equipo propio; recomendar bans por presencia, amenazas y counters; anticipar picks rivales según sus bans; permitir practicar sin elegir manualmente por ambos equipos.

## Terminado y guardado

- Importación real con Riot Match-V5: **127 partidas únicas de Solo/Duo LAS del parche 16.18**, obtenidas de una búsqueda de 300 partidas de 30 cuentas Challenger. Se descartan otros parches, partidas menores de 15 minutos y roles incompletos. No son partidas profesionales; el rango del resto de participantes no está verificado.
- Dataset sin nombres ni PUUID de jugadores: `public/data/meta.json`. Fecha UTC de descarga incluida. Colector reproducible: `scripts/collect-meta.mjs`. La clave permanece en `.env.local` y no entra a Git.
- Estadísticas de picks, bans, parejas, resultados y cruces de línea. Regularización de muestras pequeñas y umbral de cinco casos. 159 asociaciones ban/pick superan el umbral en esta muestra.
- El historial de drafts y las simulaciones dejaron de alimentar la evidencia estadística.
- Predicción rival con asociaciones entre sus bans y picks, roles, pool y posibles counters que sus bans eliminan.
- Bans por presencia en la muestra, amenazas a la composición propia y coste de quitar campeones del pool propio.
- Sinergias concretas entre campeones, planes de protección del carry y poke; propuesta provisional de cinco roles.
- Sala centrada en recomendaciones del equipo propio. En modo real se registran decisiones observadas del rival; en práctica el rival responde automáticamente. El escenario mantiene separado el draft original.
- UI muestra fuente, fecha, parche, cantidad y límites de la muestra. Las estadísticas se desactivan cuando el parche no coincide.
- README actualizado con funcionamiento y actualización manual de la muestra.

## Verificaciones realizadas

- `node scripts/check.mjs`: correcto, incluso después del último ajuste. Comprueba orden, roles, pools, Fearless, importación, independencia del historial, aislamiento de parche, asociaciones ban/pick, propuesta de cinco roles y rival automático para ambos primeros lados.
- TypeScript y build completos: correctos **antes del último ajuste de ponderaciones y asignación de roles**. Hay que repetirlos para el estado final.
- ESLint sin errores en la revisión anterior; solo advertencia existente por imágenes de Data Dragon con `<img>`. Repetir tras los últimos cambios.
- Vista previa local abre y muestra los nuevos paneles y las 127 partidas. No se modificaron datos de producción.
- La revisión visual detectó que al inicio se premiaba demasiado la primera línea. Se corrigió: ahora el peso de presencia usa partidas en roles disponibles, y la bonificación de primera línea/iniciación exige un aliado ya elegido. La asignación final de roles prioriza los observados en la muestra. **Falta volver a comprobar estos resultados en la interfaz.**

## Pendiente para terminar y publicar

1. Revisar las propuestas después del último ajuste: composición completa coherente, priorización de sinergias y roles; comprobar casos con pool propio y bans rivales. La muestra incluye picks poco habituales (por ejemplo Aurelion Sol en ADC); no confundir presencia en esta muestra con recomendación profesional validada.
2. Probar en la interfaz práctica automática, deshacer, volver al original y recomendaciones propias durante turnos rivales. Comprobar diseño móvil y ausencia de desbordamiento.
3. Repetir TypeScript, ESLint y build. Las pruebas del motor ya pasan con el último ajuste.
4. Revisar el diff final, guardar el commit de cierre, subir al repositorio del sitio, empaquetar, guardar versión y desplegar al **mismo sitio privado**. Verificar que el despliegue termine correctamente.
5. Comunicar claramente el alcance: muestra pequeña de Solo/Duo LAS, actualización manual, sin validación predictiva fuera de muestra ni datos profesionales. No prometer probabilidades calibradas ni una composición óptima garantizada.

## Publicación actual

La web publicada **todavía no incluye esta actualización**:
https://draftlab-amateur.upla-2331.chatgpt.site/

Reutilizar `project_id` de `.openai/hosting.json`; no crear otro sitio ni cambiar su audiencia. No hay cambios de esquema D1 ni migraciones nuevas. Conservar todos los espacios guardados.

## Notas para reanudar

- Proyecto: `C:\Users\Casa\Desktop\Proyectos\draftlab`.
- En esta máquina npm debe ejecutarse con `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build` (el lanzador normal falla).
- Para empaquetar usar Git Bash explícito (`C:\Program Files\Git\bin\bash.exe`) y rutas `/c/...`; el bash predeterminado apunta a WSL y falla.
- La vista previa usa localhost:5173. Si dejó de estar activa, reiniciarla.
- La recopilación de datos terminó correctamente; no hace falta repetirla para continuar la revisión.
- Mantener secretos fuera de logs, commits, archivos públicos y archivos de entrega.
