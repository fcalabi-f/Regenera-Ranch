# Regenera Ranch

App móvil para gestión de pastoreo regenerativo / manejo holístico (Savory).
Mapa de potreros con polígonos importados desde KMZ, detección de potrero por GPS,
registro de pastoreo en el campo, importación de planillas Excel del Savory Institute,
análisis histórico por potrero, rebaños y movimientos de animales, clima, suplementación.

**Estado**: scaffolding completo, primera versión funcional. Falta probarlo en un
dispositivo real, integrar collares GPS (opcional) y refinar UX.

## Stack

- Expo SDK 56 + React Native 0.85 + React 19, TypeScript estricto
- Navegación: `@react-navigation/native-stack`
- Storage local: `expo-sqlite` (offline-first)
- Backend: Supabase (Postgres + Auth + Row Level Security)
- Mapa: `react-native-maps`
- Geo: `@turf/*`, `@tmcw/togeojson`, `jszip` para KMZ
- Excel: `@e965/xlsx`
- Sync local→remoto: outbox + `@react-native-community/netinfo`

## Setup

```bash
cd regenera-ranch
npm install
cp .env.example .env
# editar .env con la URL y anon key del proyecto Supabase
npx expo start
```

Para abrir en el celular: escaneá el QR con Expo Go (iOS/Android).

### Supabase

1. Crear un proyecto en https://supabase.com.
2. Settings → API: copiar Project URL y `anon` key al `.env`.
3. SQL Editor → pegar y ejecutar `supabase/schema.sql`.
4. (Opcional) Authentication → Email auth: deshabilitar confirmación de email
   para desarrollo local, o configurar el SMTP.

## Estructura

```
regenera-ranch/
├── App.tsx                    # raíz: providers + bootstrap DB y sync
├── app.json                   # Expo config: permisos GPS, bundle ids
├── supabase/schema.sql        # esquema + RLS para Supabase
└── src/
    ├── contexts/              # Auth, Campo activo
    ├── lib/
    │   ├── supabase.ts        # cliente Supabase con AsyncStorage
    │   ├── sqlite.ts          # apertura + migraciones SQLite
    │   ├── db.ts              # CRUD alto nivel + enqueue outbox
    │   └── sync.ts            # worker de sincronización
    ├── navigation/            # stack navigator + tipos
    ├── screens/
    │   ├── LoginScreen.tsx
    │   ├── OnboardingCampoScreen.tsx
    │   ├── MapScreen.tsx          # núcleo: mapa con potreros + GPS
    │   ├── PaddockDetailScreen.tsx # análisis histórico
    │   ├── NewGrazingScreen.tsx
    │   ├── HerdsScreen.tsx
    │   ├── RecordsScreen.tsx      # importación Excel
    │   ├── ClimateScreen.tsx
    │   └── SettingsScreen.tsx
    ├── services/
    │   ├── kmz.ts             # importar KMZ → GeoJSON
    │   ├── excel.ts           # importar planilla Savory
    │   ├── gps.ts             # expo-location wrappers
    │   ├── geo.ts             # point-in-polygon, centroides, bounds
    │   └── analytics.ts       # análisis histórico por potrero
    ├── types/models.ts        # tipos compartidos local/remoto
    └── theme.ts               # colores y espaciados
```

## Arquitectura offline-first

1. Toda escritura va a SQLite local primero (`src/lib/db.ts`).
2. Cada escritura genera una entrada en `sync_outbox`.
3. `sync.ts` corre cuando hay conexión y vacía la cola contra Supabase.
4. Pendiente: pull de cambios remotos (multidispositivo).

RLS en Supabase garantiza que cada usuario solo ve sus propios datos
(ver `supabase/schema.sql`, sección "Row Level Security").

## Cobertura de funcionalidades del README original

| Funcionalidad                                  | Estado       |
| ---------------------------------------------- | ------------ |
| Importar KMZ → mapa de potreros                | ✅            |
| Detección de potrero actual por GPS            | ✅            |
| Tap en potrero → días rezago / intensidad / etc | ✅            |
| Registro manual de pastoreo                    | ✅            |
| Importar planilla Excel Savory                 | ✅            |
| Análisis histórico (UAD, intensidades, MS)     | ✅            |
| Comparativo entre temporadas                   | ✅            |
| Rebaños + movimientos (compra/venta/etc)       | ✅            |
| Clima manual (lluvia, helada, crecimiento)     | ✅            |
| Suplementación                                 | ✅ (esquema, falta UI dedicada) |
| Manejos específicos (resiembra/muestras/etc)   | ✅ (esquema, falta UI dedicada) |
| Flujo de movimiento entre potreros con flechas | Parcial: dato guardado, falta dibujarlo en mapa |
| Integración estaciones meteorológicas          | Pendiente (Open-Meteo) |
| Collar GPS por Bluetooth/celular               | Pendiente    |
| Pull de cambios desde Supabase                 | Pendiente    |
| Foto adjunta a observaciones                   | Pendiente (esquema listo) |

## Próximos pasos sugeridos

1. Probar en dispositivo real (Android primero, Windows-friendly).
2. Sumar UI dedicada para suplementaciones y manejos por potrero.
3. Dibujar flechas de flujo en el mapa.
4. Pull desde Supabase + resolución de conflictos por `updated_at`.
5. Integrar Open-Meteo para datos automáticos de clima.
