# Capacidades del frontend InariOps

> Estado a 2026-11-04, rama `feat/backend-integration` (commit `0cc69cb` más los cambios sin commitear de las secciones 2.2 y 2.3; backend `inariops-backend` según su `BACKEND_CAPABILITIES.md` del 2026-11-02). Describe lo implementado en el frontend Next.js, **lo que falta** (sección 7, con el orden propuesto en la 8), los **problemas conocidos** (sección 9) y el estado de **calidad y tests** (sección 10).

---

# 1. Despliegue

1. **Variables de entorno:** sólo `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:9142/api/v1`). Se incrusta en el bundle al compilar: cambiarla exige recompilar.
2. **Comandos:** `npm run dev` (webpack, `0.0.0.0:3000`), `npm run build` y `npm run start` (`0.0.0.0:3000`), `npm run lint`, `npm run typecheck` y `npm test`. Node 24 o posterior.
3. **Requisitos del backend para que funcione:**
   - `CORS_ORIGIN` = dirección pública del frontend. El cliente manda `credentials: "include"` (la sesión va en la cookie HttpOnly `inari_token`), así que el origen debe ser exacto, no `*`.
   - `WEB_URL` = dirección pública del frontend (enlaces de invitación y de restablecer contraseña: `/reset-password?token=…`).
   - Backend con las rutas de `forgot-password`, `reset-password`, invitaciones, notificaciones, push y `/admin/system` (rama `error-handling` o posterior). La ruta antigua `/tour-days/{id}/places` ya no se usa.
   - Claves VAPID configuradas para que funcione el push (sin ellas, `GET /push/config` responde `enabled: false` y el interruptor de push no aparece activo).
4. **HTTPS obligatorio en producción:** los navegadores sólo permiten service worker y push en HTTPS, y la cookie es `Secure` detrás de un proxy con `X-Forwarded-Proto: https`.
5. **Service worker:** `public/sw.js` se sirve con `Cache-Control: no-cache` y una CSP propia (`next.config.ts`). No cachea nada: sólo muestra las notificaciones push y abre la pantalla correcta al tocarlas.
6. **PWA:** `app/manifest.ts` (nombre, iconos en `public/icons/`, `start_url: /dashboard`, `standalone`). En iPhone, el push sólo funciona con la web añadida a la pantalla de inicio.

---

# 2. Resumen

## 2.1 Pila

| Pieza | Versión / detalle |
|---|---|
| Framework | Next.js `16.4.2` (App Router, `cacheComponents`, `partialPrefetching`), compilado con webpack |
| UI | React `19.3.0`, Tailwind CSS 4 (colores en hex inline, sin sistema de componentes) |
| Lenguaje | TypeScript 5 estricto |
| Dependencias de runtime | Sólo `next`, `react`, `react-dom`. Sin librería de estado, de formularios ni de fetch |
| Imágenes remotas | `images.unsplash.com` (banners del dashboard y del login) |

Organización: `app/` sólo contiene las rutas (cada `page.tsx` renderiza una pantalla); el código está en `features/<área>/` (`api.ts` con los tipos y llamadas, `components/` con las pantallas) y `lib/` (cliente HTTP, sesión, fechas, debounce). Todas las pantallas son client components.

## 2.2 Cambios sin commitear (en curso)

Paginación y búsqueda en el servidor para los listados grandes:

- `lib/api/client.ts`: `requestPage()` añade `limit`/`offset` y lee el total de `X-Total-Count`; tipo `Page<T>`.
- `lib/useDebouncedValue.ts`: debounce (300 ms) para no lanzar una petición por tecla.
- `features/dashboard/components/Pagination.tsx`: control Anterior/Siguiente reutilizable.
- **Reservas:** filtros (estado, fechas, agencia, guía, texto) y paginación (50) en el servidor; las tarjetas de totales usan `countReservations()` (petición con `limit=1` que sólo lee el total).
- **Incidencias:** filtro por estado y paginación en el servidor.
- **Notificaciones:** "cargar más" paginado, saltando las ya mostradas si llegan nuevas.
- **Clientes:** `RecordsScreen` admite modo `remote` (paginado + `/customers/search`); el selector de clientes de la reserva busca en el servidor en vez de cargarlos todos.

## 2.3 Deuda técnica resuelta (2026-11-04, sin commitear)

- **Estados compartidos** en `lib/status.ts` (`formatStatus`, estados abiertos, finales, cancelados, pendientes y pagados) en lugar de siete copias.
- **Fechas:** `toDayKey` y `startOfJstDay` en `lib/datetime.ts` (antes duplicados en el dashboard y el calendario); la lógica del calendario (`monthRange`, `monthCells`, `shiftMonth`) en `lib/calendar.ts`.
- **Duplicados y código sin uso eliminados:** `listLanguages`/`listZones` sólo en `catalogs/api`; los places y actividades del itinerario se construyen sobre `places/api` y `catalogs/api` (`listItineraryPlaces`, `listItineraryActivities`); fuera `getGuide`, `getUser`, `getGuideUsers` y `canManageUsers`.
- **Dashboard admin acotado:** ya no descarga todas las reservas (6.1).
- **`ReservationsScreen`** pasa de ~990 a ~600 líneas: el alta en 3 pasos vive en `CreateReservationModal.tsx`.
- **Idioma:** toda la interfaz y los mensajes en inglés, como el backend.
- **Menú:** sin las entradas que no llevaban a ninguna parte; "Change password" para cualquier usuario (4).
- **`app/error.tsx`** (error al renderizar, con "Try again") y **`app/not-found.tsx`**.
- **Itinerario:** reordenar hace los dos cambios uno detrás de otro, mandando sólo `order_index`, y deshace el primero si falla el segundo.
- **Tests y CI:** 27 tests de `lib/` con `node:test` (sin dependencias nuevas), scripts `typecheck` y `test`, workflow de GitHub Actions (lint, tipos, tests y build) y README propio.

## 2.4 Selectores con búsqueda y creación (2026-11-04)

Los catálogos se eligen escribiendo, como los clientes: `Combobox` (`features/dashboard/components/Combobox.tsx`) filtra mientras se escribe (sin distinguir mayúsculas ni acentos, primero lo que empieza por el texto; `lib/search.ts`, con tests), se maneja con el teclado (flechas, Enter, Escape) y, si nada se llama así, ofrece *+ Create zone “…”*, lo crea y lo deja elegido. Lo creado se añade a la lista de la pantalla.

| Dónde | Qué | Crea |
|---|---|---|
| Formulario del día de tour (alta de reserva, detalle de reserva y detalle del día) | Zona | Zona |
| Itinerario (alta de reserva y detalle del día) | Lugar (primero los de la zona del día) y actividad | Lugar en la zona del día, sin descripción; actividad |
| Alta y edición de reservas | Agencia | Agencia sólo con nombre (el representante y el email se completan en *Agencies*) |
| *Places* | Zona del lugar (alta y edición); el filtro por zona sólo busca | Zona |
| Guías (alta, edición en la tabla y detalle) | Idiomas y zonas (selección múltiple con buscador) | Zonas; los idiomas sólo se buscan, porque crear uno exige su código |

**Sin desplegables del navegador:** no queda ningún `<select>` nativo. Las listas cortas y fijas (tipo de parada, rol, estado de incidencia, voucher, firma, filtros de auditoría, zona en *Assignments*) usan `Select` (`features/dashboard/components/Select.tsx`), con el mismo aspecto que `Combobox`, grupos con título, marca en la opción elegida y teclado (flechas, Enter o Espacio, Escape, y una letra salta a la primera opción que empieza por ella). Las listas que crecen sin opción de crear (guía al asignar o cambiar, filtros de agencia y guía en *Reservations*, usuario en la auditoría) usan `Combobox` sin `onCreate`: se buscan escribiendo. **Sin controles del navegador:** las fechas usan `DateInput` (calendario propio: semanas de lunes a domingo, hoy marcado en JST, *Today* y *Clear*, límites `min`/`max`; teclado: flechas por día y semana, Re Pág/Av Pág por mes, Enter, Escape), las horas `TimeInput` (se escribe "930", "9:30", "17h30"… o se elige en una lista cada 15 minutos; `parseTimeText` en `lib/datetime.ts`) y fecha con hora `DateTimeInput` (los dos juntos). Devuelven las mismas cadenas que los campos nativos (`YYYY-MM-DD`, `HH:MM`, `YYYY-MM-DDTHH:MM`). Casillas, números (sin flechas) y el aspa de las búsquedas toman el estilo de la app desde `app/globals.css`, en la capa `base` para que las clases de utilidad sigan mandando. Las listas emergentes de `Select` y `DateInput` cancelan el clic para que, dentro de una `<label>`, no se reabran.

**Diálogos propios:** no queda ningún `window.confirm` ni `window.prompt`. `useDialogs()` (`features/dashboard/components/DialogProvider.tsx`, montado en `app/layout.tsx`) da `confirm` y `prompt` con el estilo de la app sobre un `<dialog>` modal del navegador (foco atrapado, Escape y clic fuera cancelan, el foco vuelve a donde estaba). Cada uno lleva título, explicación y un botón con la acción concreta ("Cancel tour day", "Delete permanently"…); lo destructivo va en rojo y con el foco inicial en "Keep it"/"Cancel". Borrar una reserva definitivamente no habilita el botón hasta que se escribe su código exacto; la fuerza mayor pide el motivo (opcional) en el mismo diálogo.

## 2.5 Qué cubre

| Área | Admin | Guía |
|---|---|---|
| Login, cambio de contraseña obligatorio, olvido y restablecimiento | ✅ | ✅ |
| Dashboard | Operativo (hoy, semana, atención, actividad) | Sus tours, preasignaciones pendientes y días abiertos |
| Reservas (listado, alta en 3 pasos, detalle, edición, pasos de pago/voucher/firma, cancelar, borrar) | ✅ | — |
| Días de tour (detalle, edición, estados, itinerario, asignación, historial) | ✅ | Sólo los suyos: aceptar/rechazar, ver itinerario, incidencias |
| Calendario mensual y agenda | ✅ | — |
| Asignación masiva de guías | ✅ | — |
| Incidencias (listado, detalle, cambio de estado, alta desde el día) | ✅ | Las suyas y las de sus días |
| Notificaciones (campana, bandeja, push) | ✅ | ✅ |
| Guías (alta, edición, idiomas, zonas, disponibilidad) | ✅ | Su disponibilidad (`/availability`) |
| Usuarios (alta, invitación, roles, sesiones, desactivar, borrar) | ✅ | — |
| Catálogos: idiomas, zonas, places, actividades, agencias, clientes | ✅ | — |
| Sistema (salud, workers, rutas, errores) | ✅ | — |
| Auditoría (quién cambió qué) | ✅ | — |

---

# 3. Plataforma

## 3.1 Cliente HTTP (`lib/api/client.ts`)

- `request<T>()` y `requestPage<T>()` sobre `fetch`, con `credentials: "include"` y `Content-Type: application/json`.
- Desempaqueta el sobre `{"data": …}` del backend; si no viene, devuelve el cuerpo tal cual.
- **Errores:** lanza `ApiError` con `status`, el mensaje del backend (`error`) y su `code` estable (`RESERVATION_NOT_FOUND`, `TOO_MANY_REQUESTS`…). Sin conexión: `ApiError` con `status 0` y "No se pudo conectar con el servidor.".
- **`401`:** borra la sesión local (el sidebar redirige al login).
- **`PASSWORD_CHANGE_REQUIRED`:** marca la sesión con `mustChangePassword` y navega a `/change-password`.

## 3.2 Sesión

- El **token** vive sólo en la cookie HttpOnly del backend; el frontend no lo ve.
- En `localStorage` (`inari.session`) se guarda `{ userId, role, mustChangePassword }`, sólo para decidir qué menú y qué pantallas mostrar. `useSession()` lo lee con `useSyncExternalStore` y reacciona a cambios en esta pestaña (evento `inari:session`) y en otras (`storage`).
- `getMe()` (`GET /auth/me`) sincroniza el rol con el de la BD si ha cambiado.
- **Protección de rutas en el cliente** (`DashboardSidebar`): sin sesión → `/`; con `mustChangePassword` → `/change-password`; un guía fuera de `/dashboard`, `/tours/`, `/incidents`, `/availability`, `/notifications` → `/dashboard`. La seguridad real la aplica el backend (`403`).

## 3.3 Fechas y zona horaria (`lib/datetime.ts`)

La operativa es en Japón: **todas las fechas y horas se introducen y se muestran en JST** (`Asia/Tokyo`, offset fijo `+09:00`), sea cual sea la zona del navegador. La API guarda instantes en UTC.

- `jstInputToIso()` / `isoToJstInput()` convierten entre `datetime-local` y ISO.
- `formatJst()` / `formatJstClock()` formatean en JST.
- Duraciones en horas enteras: `parseDuration()` acepta `6`, `6h`, `6 horas`; `formatDuration()` muestra `6h`.
- Las horas del itinerario son de reloj (`HH:MM:SS`) y se muestran tal cual, sin conversión.

## 3.4 Navegación y layout

- `DashboardSidebar` (escritorio, ≥ `lg`) y menú móvil en `DashboardHeader`. Menú distinto por rol.
- El header incluye la campana de notificaciones y el interruptor de push.
- Cerrar sesión y "cerrar sesión en todos los dispositivos" (también da de baja el push del dispositivo).
- Pie del menú (`AccountLinks`): cambiar contraseña, cerrar sesión y cerrar sesión en todos los dispositivos.
- Las secciones sin pantalla todavía (vista global de itinerarios, vouchers, firmas) no aparecen en el menú hasta que existan (7.2). Las plantillas de itinerario están en *Content* (6.10).

## 3.4.1 App móvil (PWA, 2026-11-04)

La app móvil es esta misma web, instalable (decisión: no duplicar código). Por debajo de `lg`:

- **Tab bar inferior** (`MobileTabBar`, en `DashboardSidebar`): guía *Home · My tours · Available · Alerts · Profile*; admin *Home · Bookings · Assign · Incidents · Alerts*. El resto sigue en el menú ☰. Respeta el *safe area* del iPhone; el `body` deja hueco con `:has(.mobile-tab-bar)`.
- **Tamaños:** en móvil la escala de texto sube un punto (`globals.css`) y los campos van a 16 px en pantallas táctiles (iOS no hace zoom al enfocarlos).
- **Tablas → tarjetas** bajo `md`: reservas, guías (con llamar), registros (clientes, agencias…); usuarios, lugares, zonas e idiomas apilan las celdas de la misma fila (la edición en línea sigue igual). El calendario abre en agenda. El alta de reserva ocupa toda la pantalla.
- **Notificaciones:** un solo contador de no leídas (`useUnreadCount`) para la campana (escritorio), la pestaña *Alerts* y el número del icono de la app (`setAppBadge`); se refresca cada minuto, al volver a la app y cuando `sw.js` avisa de un push.
- **PWA:** `AppRuntime` registra `sw.js` en todas las páginas; sin conexión se ve `offline.html` (sólo se cachea esa página: los datos siempre vienen de la API). `InstallBanner` invita a instalar en el móvil (diálogo nativo en Android, pasos en iPhone, donde es la única forma de recibir push). Manifest con `id`, `scope`, orientación vertical y accesos directos. `viewport-fit=cover` y `theme-color`.
- **Hora actual:** `lib/useNow.ts` (null en el prerender; Cache Components no permite leer la hora al construir la página).

## 3.5 Renderizado

- `cacheComponents` activo: las páginas se prerenderizan y los datos se cargan en el cliente tras montar. Las rutas dinámicas (`/guides/[id]`, `/tours/[id]`, `/incidents/[id]`, `/reservations/[code]`) exportan `instant = false`.
- `/reset-password` lee el token de `searchParams` detrás de `Suspense` y fija `referrer: no-referrer` para no filtrarlo.
- Las pantallas leen el reloj después de montar para que el prerender no congele una fecha.
- `app/error.tsx` recoge los errores al renderizar una pantalla y `app/not-found.tsx` las direcciones que no existen. Los errores de las peticiones los muestra cada pantalla.

---

# 4. Autenticación

| Pantalla | Ruta | Endpoints | Notas |
|---|---|---|---|
| Login | `/` | `POST /auth/` | Mensajes específicos para `TOO_MANY_REQUESTS` y `TEMPORARY_PASSWORD_EXPIRED`. Redirige a `/change-password` si la contraseña es temporal |
| Cambio de contraseña | `/change-password` | `PATCH /auth/` | Obligatoria con la contraseña temporal de la invitación; voluntaria desde el menú ("Change password"), con vuelta al dashboard. Cierra las demás sesiones. Valida la política en el cliente (8 caracteres, mayúscula, minúscula, número y símbolo) |
| Olvidé mi contraseña | `/forgot-password` | `POST /auth/forgot-password` | Respuesta idéntica exista o no la cuenta |
| Restablecer | `/reset-password?token=` | `POST /auth/reset-password` | Ofrece pedir un enlace nuevo si el token no vale |
| Cerrar sesión | menú | `POST /auth/logout`, `POST /auth/logout-all` | Antes, quita la suscripción push del dispositivo |

---

# 5. Catálogos y personas

| Pantalla | Ruta | Endpoints | Notas |
|---|---|---|---|
| Guías | `/guides` | `GET/POST /guides`, `PATCH /guides/{id}`, `GET /languages`, `GET /zones` | Alta con `POST /guides` (usuario + credenciales + guía en una transacción, envía la invitación). Edición en línea de nombre, contacto, límite diario, idiomas y zonas |
| Detalle de guía | `/guides/[id]` | `GET/PATCH /guides/{id}`, CRUD `/guides/{id}/availabilities` | Perfil y fechas bloqueadas |
| Mi disponibilidad (guía) | `/availability` | `GET /guides/user/{user_id}` + lo anterior | El mismo detalle en modo `self`: sólo edita la disponibilidad |
| Usuarios | `/users` | `GET/POST /users`, `PATCH/DELETE /users/{id}`, `POST /users/{id}/invitation`, `DELETE /users/{id}/sessions`, `DELETE /users/{id}/permanently` | Muestra "Invited" con `invitation_pending`. Reenviar invitación, cerrar sesiones, desactivar (avisa de que sus días sin pagar vuelven a pendiente) y borrado definitivo |
| Idiomas | `/languages` | CRUD `/languages/{code}` | `CatalogScreen` |
| Zonas | `/zones` | CRUD `/zones/{id}` | `CatalogScreen` |
| Places | `/places` | CRUD `/places` | Con zona |
| Actividades | `/activities` | CRUD `/activities` | `RecordsScreen` (lista entera, búsqueda local) |
| Agencias | `/agencies` | CRUD `/agencies` | `RecordsScreen` (lista entera, búsqueda local) |
| Clientes | `/customers` | CRUD `/customers`, `GET /customers/search` | `RecordsScreen` en modo `remote`: paginado de 50 y búsqueda en el servidor (sin commitear) |

`RecordsScreen` y `CatalogScreen` son pantallas genéricas: listado, búsqueda, "mostrar inactivos", alta, edición en línea y borrado con confirmación.

---

# 6. Operativa de tours

## 6.1 Dashboard (`/dashboard`)

- **Admin** (`loadDashboard`): todo acotado. Lee los días de esta semana, los 6 próximos (`limit=6`), cuenta sin descargarlos los días sin guía (`unassigned=true`, endpoint añadido al backend el 2026-11-04) y los que esperan respuesta del guía, las reservas abiertas y las 20 de inicio más reciente para la actividad. Tarjetas (tours de la semana, de hoy y zonas de hoy, sin asignar, esperando aceptación), panel de atención (sin guía, esperando aceptación, firmas sin enviar, firmas pendientes), agenda de hoy, próximos tours y actividad reciente de reservas.
- **Admin:** tarjeta "In progress" (días con check-in sin terminar, `in_progress=true`).
- **Guía** (`GuideDashboard`): botón "Check in" en sus tours de hoy y etiqueta "In progress"; preasignaciones esperando respuesta (aceptar / rechazar; sin respuesta en 24 h cuenta como aceptada), sus próximos tours y "Open tour days" (`GET /tour-days/available-for-guide/{id}`): días sin guía de sus zonas o sin zona (el backend filtra). Botón **Take** (`PATCH /tour-days/{id}/take`, D1 del análisis de la especificación): pide confirmación, el día pasa a preasignado y aparece en "Awaiting your answer" para confirmarlo (o cuenta como aceptado a las 24 h). Si otro guía lo cogió antes (`409 INVALID_TOUR_DAY_STATUS`) o ya no se le ofrece (`403 TOUR_DAY_NOT_OFFERED`) lo dice y recarga la lista; los avisos de solape le salen en el mensaje.

## 6.2 Reservas

- **Listado** (`/reservations`): tarjetas de totales (total, confirmadas, pendientes, vouchers pendientes), filtros por estado, rango de fechas, agencia, guía y texto (código o título), paginación de 50. Cada fila muestra estado, voucher y firma.
- **Alta en 3 pasos** (modal):
  1. Datos: título, descripción, agencia, pasajeros, días de inicio y fin (sin hora: los días se crean a las 09:00 JST y cada uno recibe su horario en su itinerario y en su día de tour), nº de presupuesto y de expediente, `offer_to_zone_guides` y clientes (búsqueda de existentes o alta nueva con `CustomerPicker`).
  2. Días de tour: el backend crea uno por fecha; aquí se completan (hora, duración, zona, punto de encuentro, pasajeros, remuneración, notas) y se pueden añadir más (`ReservationTourDaysStep`).
  3. Itinerario de cada día (`ReservationItineraryStep`), parada a parada o aplicando una plantilla a ese día o a todos (`ItineraryTemplateBar`); se puede saltar y completar después.
- **Detalle** (`/reservations/[code]`):
  - Edición de todos los datos y de los clientes (`PATCH /reservations/{code}`; el backend ajusta los días si cambian las fechas).
  - Botón del **siguiente paso manual** según el estado de los días: confirmar pago → marcar voucher enviado → marcar contrato firmado.
  - Panel *Documents*: estado del voucher y de la firma elegible a mano (bajarlo hace retroceder los días).
  - Días relacionados con alta de días nuevos (`TourDayForm`), incidencias de la reserva, referencias del cliente e historial (`HistoryTimeline`).
  - Cancelar (lógica) y **borrar definitivamente** (pide escribir el código).

## 6.3 Días de tour (`/tours/[id]`)

- **Admin:** edición de los datos del día (no editable en estados finales), confirmar o rechazar en nombre del guía, marcar completado, fuerza mayor (con motivo), cancelar, asignar / cambiar / desasignar guía (reglas por estado: cambiar en preasignados y pagados, desasignar sólo antes de pagar; tras asignar muestra los `warnings` de la respuesta: fuera de zona y solapes, D3), itinerario editable con "Apply template" y "Save as template", recursos (punto de encuentro, remuneración en JPY…), incidencias e historial.
- **Guía:** aceptar o rechazar su preasignación, itinerario de sólo lectura, reportar incidencias, y **clientes del día** (`BriefingPanel`, `GET /tour-days/{id}/briefing`: reserva y clientes con botón de llamar). Si el día ya no es suyo ni se le ofrece (`403`), lo dice.
- **Día ofrecido al guía** (aún sin guía): lo puede abrir para ver datos e itinerario y cogerlo ("Take this tour"); sin historial, incidencias ni clientes hasta que es suyo.
- **Check-in** (`POST /tour-days/{id}/check-in`): botón "Check in" el día del tour (JST) si el guía ya lo aceptó; el backend decide la ventana (desde 2 h antes) y su mensaje dice cuándo abre si es pronto. Después, etiqueta "In progress since HH:MM". El admin puede hacerlo por el guía ("Check in for guide") y deshacerlo ("Undo check-in"); con check-in el panel de asignación ya no deja cambiar ni quitar al guía. Historial: "X checked in" y "Check-in of X undone".
- **Itinerario** (`ItineraryEditor`): paradas con place o actividad, hora de inicio/fin, notas, reordenar (subir/bajar intercambiando `order_index`) y borrar.
- **Plantillas en el día** (`ItineraryTemplateBar`, sólo admin y días no cancelados): aplicar una plantilla (`POST /itinerary-templates/{id}/apply`, sustituyendo las paradas con confirmación o añadiéndolas detrás) y guardar el itinerario del día como plantilla (`from_tour_day_id`, con la zona del día).
- **Historial:** la acción `TAKEN` se muestra como "Taken by <guía>"; los avisos de compatibilidad salen en el `reason`.

## 6.4 Calendario (`/calendar`)

Vista mensual (semanas de lunes a domingo) y agenda, en JST, con colores por estado y resumen del mes. Carga sólo el rango del mes (`from`/`to`).

## 6.5 Asignaciones (`/assignments`)

Días asignables desde hoy (pendientes, preasignados y pagados sin guía), selección múltiple y asignación de un guía a todos a la vez (`PATCH /tour-days/assign-guide`). Ordena primero los guías de las zonas de los días elegidos. El backend valida todos los días antes de cambiar ninguno. Tras asignar muestra los `warnings` por día (fuera de las zonas del guía, solape de horario): la asignación se hace igual.

## 6.6 Incidencias

- **Listado** (`/incidents`): filtro por estado y paginación en el servidor (sin commitear). El guía ve las que abrió y las de sus días.
- **Detalle** (`/incidents/[id]`): datos, día y reserva relacionados, historial de estados con nombre del autor (sólo admin) y cambio de estado con motivo (`OPEN → IN_REVIEW → RESOLVED → CLOSED`; cerrada es final).
- **Alta:** desde el día de tour (`TourDayIncidents`), por su guía o un admin; no en días cancelados.

## 6.7 Notificaciones

- **Campana** en el header: contador de no leídas y las 8 últimas; marcar leída al abrir y "marcar todas".
- **Bandeja** (`/notifications`): todas o sólo no leídas, "cargar más".
- **Icono por tipo** (`NotificationIcon`, en la campana y la bandeja): un guía cogió un día (`GUIDE_TOOK_DAY`), confirmado, día perdido o cancelado, incidencia, plazo de preasignación y, por defecto, día de tour.
- **Push** (`PushToggle` + `features/notifications/push.ts`): registra `sw.js`, pide permiso con un toque, suscribe con la clave VAPID de `GET /push/config` y la guarda en `POST /push/subscriptions`; la resincroniza si el navegador la renueva y la borra al desactivar o cerrar sesión. En iPhone explica que hay que instalar la web en la pantalla de inicio.

## 6.8 Auditoría (`/audit`)

Sólo ADMIN. Lista de `GET /admin/audit-logs` (sección 6.9 del backend): cada cambio hecho en el espacio de trabajo y cada evento de seguridad de las cuentas (logins correctos y fallidos, restablecimientos, sesiones, dispositivos), más reciente primero. Cada fila: fecha y hora en JST, qué (entidad y acción), cuál (id o código, con enlace a su pantalla cuando la tiene), quién, con qué rol y desde qué IP ("Not signed in" para los intentos sin sesión), el resultado (*Succeeded*, *Failed*, *Denied* u *Outcome unknown* si el servidor se detuvo a mitad del cambio) y el botón *Data sent* que despliega lo enviado (sin contraseñas ni tokens), la ruta y el request ID. Filtros en el servidor: tipo de entidad, id o código, usuario, acción (agrupadas en *Sign-ins & security* y *Changes*), resultado y rango de días (JST, `to` incluido); 50 por página.

## 6.9 Sistema (`/system`)

Pantalla de `GET /admin/system`: estado de la BD, uptime, workers (última ejecución, fallos), peticiones por ruta y últimos errores con su request ID.

---

## 6.10 Plantillas de itinerario (`/itinerary-templates`)

Sólo admin (D5 del análisis de la especificación). Listado con búsqueda y filtro por zona (nº de paradas, zona, última modificación), alta, edición y borrado. El formulario edita nombre, descripción, zona y las paradas en local (hora de inicio/fin opcionales, tipo, place o actividad, notas, subir/bajar, quitar); guardar manda la lista entera (`PATCH` con `items` la sustituye). Aplicar copia las paradas a los días, así que cambiar o borrar una plantilla no toca los días ya configurados. Se aplican desde el día de tour y desde el paso 3 del alta (6.2, 6.3).

## 6.11 Pantallas del guía

- **My tours** (`/my-tours`): próximos (paginados, desde hoy) y pasados (rango de fechas, por defecto los últimos 90 días, el más reciente primero), agrupados por día, con check-in en los de hoy (`TourDayCard`).
- **Available** (`/available`): todos los días que se le ofrecen, agrupados por fecha y filtrables por zona, con "Take" (`useTakeTourDay`, compartido con el dashboard y el detalle). El dashboard muestra los 5 primeros y enlaza aquí.

## 6.12 Perfil (`/profile`)

Para cualquier usuario (menú del guía y "My profile" al pie del menú). Edita nombre y teléfono (`PATCH /auth/me`); muestra sin editar email, rol y, al guía, zonas, idiomas y tours por día, con enlaces a disponibilidad y cambio de contraseña.

# 7. Pendiente

## 7.1 Operación

| Qué | Detalle |
|---|---|
| Commitear los cambios en curso | Paginación (2.2) y deuda técnica (2.3) |
| Desplegar con HTTPS | Requisito del push y de la cookie `Secure` |
| `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`, `WEB_URL` | Coherentes entre frontend y backend (sección 1) |
| Probar push en móvil | Android y iPhone (con la web instalada) tras el despliegue |
| CI en GitHub | El workflow existe; comprobar que la primera ejecución pasa en GitHub |

## 7.2 Funcionalidad

| Área | Situación | ¿Depende del backend? |
|---|---|---|
| Vouchers | El voucher es sólo un estado manual | Sí: PDF, plantilla, almacenamiento y email |
| Firmas | Sólo estado manual | Sí: proveedor externo y webhook |
| Documentos / adjuntos | No hay subida ni descarga de archivos | Sí: upload y storage (`files`, `incident_files`) |
| Incidencias | No se pueden editar título ni descripción ni adjuntar archivos | Sí |
| Fuerza mayor de una reserva entera | Sólo por día | Sí |
| Itinerarios (vista global) | Sin pantalla | No |
| Hoteles del día | El formulario del día no tiene hotel del guía ni del cliente | Sí: los campos existen, pero el backend no tiene endpoints de `hotels` (sección 7.4 del backend) |
| Voucher por día | `PATCH /tour-days/{id}` acepta `voucher_status`, pero se muestra sólo como lectura | No: decidir con el voucher en PDF si va por día o por reserva |
| Filtros | El calendario no filtra por guía ni zona; el listado de incidencias sólo por estado | No: el backend ya admite `guide_id`/`zone_id` en `/tour-days` y `guide_id`/`reservation_id`/`tour_day_id` en `/incidents` |

## 7.3 Calidad y deuda técnica

Resuelto el 2026-11-04: ver 2.3.

| Área | Situación | Por qué sigue |
|---|---|---|
| Tests de componentes y e2e | Sólo hay tests de `lib/` | Necesitan dependencias (Testing Library, Playwright) y un backend de pruebas; lo siguiente sería un e2e del alta de reservas |
| Listados enteros | Guías, usuarios, agencias, actividades, places, idiomas y zonas se cargan completos y se filtran en el navegador | Correcto con el volumen actual; el backend ya pagina si hace falta |
| Estilos | Colores y tamaños en hex/px inline en cada componente; sin tokens ni componentes base (botón, input, tabla) | Cambio grande y visual; mejor hacerlo pantalla a pantalla con revisión del diseño |
| Confirmaciones | `window.confirm` / `window.prompt` nativos | Funcionan; sustituirlos es parte de los componentes base |
| Protección de rutas | Sólo en el cliente (no hay `proxy`): la página se prerenderiza y luego redirige | La cookie es del dominio del backend y el frontend no la ve; la seguridad la aplica el backend |
| Offline | El service worker no cachea | Sin necesidad por ahora |

**Endpoints del backend que el frontend no usa:** `GET /reservations/{code}/customers` (los clientes vienen en el detalle), los `GET` de un elemento de catálogo (`/activities/{id}`, `/agencies/{id}`, `/customers/{id}`, `/languages/{code}`, `/zones/{id}`, `/places/{id}`), `GET/POST/DELETE /guides/{id}/languages` (se usa `PATCH /guides/{id}`), `GET /users/guides` y `GET /health`.

---

# 8. Plan

## Hecho

- **Base (`c925f2a`–`91de401`):** maqueta del dashboard, estilos, PWA.
- **Integración con el backend (`de8b6e9`–`0cc69cb`):** cliente tipado y capa de datos, login real y cambio de contraseña, dashboard con datos reales, catálogos, guías/disponibilidad/usuarios, días de tour con formulario e itinerario, reservas (listado, alta y detalle), restablecimiento de contraseña e invitaciones, asignaciones e historial.
- **También integrado:** incidencias, notificaciones con Web Push, pantalla de sistema, calendario.
- **Sin commitear (2026-11-04):** paginación y búsqueda en el servidor (2.2) y deuda técnica (2.3).

## Siguiente

1. **Commitear** y desplegar junto al backend nuevo con HTTPS (7.1).
2. **e2e del alta de reservas** (Playwright contra un backend de pruebas).
3. **Voucher en PDF y documentos**, en cuanto el backend los tenga (sección 8 del backend).

## Después

- Tokens de color y componentes base (botón, input, tabla, diálogo de confirmación).
- Perfil propio.
- Firma digital, adjuntos de incidencias, plantillas de tour y solicitud de días abiertos por el guía (con el backend).

---

# 9. Problemas conocidos

## 9.1 Corregidos (2026-11-04)

| ID | Problema | Corrección |
|---|---|---|
| FE-01 | El dashboard admin descargaba todas las reservas | Sólo las abiertas y las 20 de inicio más reciente (6.1) |
| FE-02 | Menú con 4 enlaces `#` que no llevaban a ninguna parte | Quitados hasta que exista su pantalla |
| FE-03 | No había forma visible de cambiar la contraseña salvo la obligatoria | "Change password" en el menú y pantalla en modo voluntario |
| FE-04 | Mensajes mezclados en inglés y español | Todo en inglés |
| FE-05 | Reordenar el itinerario lanzaba dos `PATCH` a la vez; si fallaba uno, dos paradas podían quedar en la misma posición | Uno detrás de otro, deshaciendo el primero si falla el segundo |
| FE-06 | Cargas secundarias (guías, zonas, agencias, places, actividades, nombres de usuario, días abiertos, incidencias de la reserva, reserva del día) fallaban en silencio y se veían IDs o "Unknown" sin aviso | La pantalla se sigue mostrando y avisa de qué no se pudo cargar, con botón de recargar (`lib/missing.ts`, `MissingDataNotice`). La campana distingue "no hay notificaciones" de "no se pudieron cargar" |
| FE-07 | El dashboard admin leía todos los días futuros | Semana, próximos 6 y conteos con el filtro nuevo `unassigned` del backend (6.1) |

## 9.2 Abiertos

Ninguno. Siguen siendo "best effort", a propósito, las llamadas de push (configuración, alta y baja de la suscripción) y marcar notificaciones como leídas: si fallan no cambia lo que se ve.

---

# 10. Calidad y tests

## 10.1 Cómo ejecutarlos

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

La CI de GitHub Actions (`.github/workflows/ci.yml`) ejecuta las cuatro con Node 26 en cada pull request y en `main`.

## 10.2 Qué cubren

`node:test` con el soporte nativo de TypeScript de Node, sin dependencias. 30 tests:

| Archivo | Qué prueba |
|---|---|
| `lib/datetime.test.ts` | Conversión JST ↔ ISO (incluido el cambio de día UTC), reloj en 24 h, día de operaciones (`toDayKey`, `startOfJstDay`), duraciones válidas e inválidas |
| `lib/calendar.test.ts` | Rango de un mes en JST (también diciembre → enero), semanas completas de lunes a domingo, cambio de mes entre años |
| `lib/status.test.ts` | Formato de estados, estados abiertos y finales sin solaparse, cancelados |
| `lib/missing.test.ts` | Valor por defecto y anotación (una sola vez) de lo que falló; descripción en una frase |
| `lib/api/client.test.ts` | Sobre `{"data": …}`, cookies y JSON, `204`, `ApiError` con mensaje/estado/código, cuerpo de texto y mensaje genérico, fallo de red (`status 0`), `limit`/`offset` y `X-Total-Count` |

Estado a 2026-11-04: lint, tipos, tests y build pasan.

## 10.3 Pendiente

Tests de componentes y un e2e del alta de reservas (7.3).
