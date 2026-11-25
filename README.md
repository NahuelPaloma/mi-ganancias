# Mi Ganancias

Aplicación local para seguir comprobantes educativos, revisar cargas mensuales de SiRADIG y conservar evidencia del avance. No se conecta con ARCA ni presenta declaraciones.

## Arrancar en Mac o Ubuntu

Requiere Node.js 22 o superior. No necesita paquetes externos, cuenta de hosting ni compilación.

```bash
git clone https://github.com/NahuelPaloma/mi-ganancias.git
cd mi-ganancias
node server.mjs
```

Abrir http://127.0.0.1:4321. Detener con Ctrl+C. `node --test` ejecuta las pruebas.

Si ya tenés la carpeta del proyecto, basta con `cd mi-ganancias` y `node server.mjs`.

## Datos locales

- `data/audit.json`: base auditada (importes por mes, proveedor y metadatos). Al arrancar se copia la plantilla vacía `audit.example.json` solamente si aún no existe.
- `data/tracking.json`: comprobantes y seguimiento manual. Se crea al guardar por primera vez.
- `data/backups/`: copia del seguimiento anterior a cada modificación. No se eliminan automáticamente.

Todo `data/` está excluido de Git. El repositorio público contiene únicamente código y una plantilla vacía, sin facturas ni información fiscal personal. No agregues la carpeta de datos con `git add -f`.

Los comprobantes se registran manualmente; no se adjuntan facturas. Conservá los originales en tu archivo personal. El botón **Exportar respaldo** descarga JSON con auditoría y seguimiento. **Importar respaldo** valida y reemplaza el seguimiento; la auditoría se administra en `data/audit.json` y no se reemplaza mediante esa importación.

Los familiares se identifican como Familiar 1 y Familiar 2. No es necesario publicar nombres o documentos para usar la aplicación.

## Funciones

- Resumen de importes informados, base mensual y pendientes señalados en la auditoría.
- Registro y edición de facturas, recibos y notas de crédito (importe positivo; la nota de crédito se distingue por tipo).
- Control de duplicados por CUIT, tipo y número completo.
- Estados manuales, notas, fecha de envío y lectura del empleador.
- Guardado atómico, copias previas y control de versiones entre pestañas.

Los estados “Presentado” o “Presentación registrada” son anotaciones del usuario: no ejecutan acciones en ARCA. No se calculan deducciones admitidas ni ahorro fiscal. El período de esta primera versión es 2026.

## Pasarlo después a Ubuntu

Copiá o cloná el código y transferí **por separado** la carpeta `data/` desde tu equipo. No uses Git para transferir los datos personales. Detené el proceso antes de copiar o restaurar los archivos.

```bash
DATA_DIR=/ruta/absoluta/a/datos PORT=4321 node server.mjs
```

Por defecto escucha solamente en `127.0.0.1`. No incluye autenticación propia y debe usarse localmente. Para acceder después desde otra máquina, se puede mantener el bind local y usar un túnel SSH:

```bash
ssh -L 4321:127.0.0.1:4321 usuario@servidor
```

No expongas esta instancia a Internet directamente. La integración con JARVIS no está implementada y no se modifica su configuración.

`HOST`, `PORT` y `DATA_DIR` se leen del entorno del proceso; no se carga `.env` automáticamente. El servidor crea `data/.server.lock` para impedir dos escritores. Si el proceso termina abruptamente, verificá que no siga ejecutándose antes de retirar manualmente ese archivo de bloqueo.

## Limitaciones

Sin integración verificada con SiRADIG, Mis Comprobantes, correo o JARVIS. No almacena claves fiscales. No programa tareas mensuales. El guardado es local en el servidor que ejecuta Node.js, compartido por las pestañas de esa instancia.
