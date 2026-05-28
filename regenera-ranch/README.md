# Regenera Ranch

Aplicación móvil (iOS y Android) para gestión de pastoreo regenerativo / manejo
holístico (Savory). Pensada para usarse en el campo, con guantes, sin internet.

**Estado**: scaffolding completo, primera versión funcional. Falta probarlo en un
dispositivo real, integrar collares GPS (opcional) y refinar UX.

---

## ¿Qué es?

Una app diseñada para agricultores y ganaderos que practican pastoreo regenerativo
o manejo holístico, inspirada en la metodología del Savory Institute. Su objetivo
es facilitar el seguimiento del pastoreo en el campo, recolectar datos útiles de
forma automatizada y manual, y apoyar la toma de decisiones para mejorar la
productividad y la salud del suelo a lo largo del tiempo.

## Problema que resuelve

El pastoreo regenerativo requiere un registro constante y detallado de movimientos
de animales, días de rezago, intensidad de pastoreo y condiciones del terreno. Hoy
esto se hace en planillas físicas o Excel, lo que dificulta el análisis, la
comparación entre temporadas y la toma de decisiones en tiempo real, directamente
desde el campo.

## Funcionalidades principales

### 🗺️ Mapa de potreros inteligente

- El usuario carga un archivo KMZ con el mapa de su campo (elaborado fácilmente
  en Google Earth desde el computador).
- La app detecta automáticamente en qué potrero se encuentra el usuario mediante
  el GPS del teléfono.
- Al tocar un potrero en pantalla, muestra de inmediato:
  - Días de rezago (días desde el último pastoreo).
  - Intensidad del último pastoreo (Leve / Moderado / Intenso).
  - Duración y carga animal del último pastoreo (ej: 300 vacas, 3 días).
  - Flujo de movimiento: desde qué potrero vienen los animales y hacia cuál se
    dirigen (representado con flechas en el mapa).

### 📋 Ingreso de datos de pastoreo

- Carga de planilla de pastoreo en Excel (compatible con el formato Savory Institute).
- Registro manual desde el campo:
  - Cantidad y peso de animales (o selección de un rebaño predefinido).
  - Fecha de entrada y días en el potrero.
  - Observaciones: malezas, plagas u otras condiciones observadas.
  - Recomendaciones: saltar la próxima vuelta, aplicar pastoreo leve, resembrar,
    regenerar, etc.

### 📊 Análisis histórico por potrero

Por cada potrero, la app calcula y muestra —en el año calendario o agrícola
definido por el usuario:

- Total de raciones animales (Unidades Animal/Día), con estimación de materia
  seca consumida según parámetros ingresados o valores estándar por categoría.
- Secuencia e intensidad de pastoreo a lo largo de la temporada (ej: L, M, I, I, M, L).
- Comparación con temporada anterior en raciones animales e intensidad, para
  evaluar si el potrero puede clasificarse como más o menos productivo.
- Alimentación suplementaria: registro de tipo y cantidad por día (ej: 4 bolos
  de silo, 3 bolos de heno).

### 🐄 Gestión de rebaños

- Un campo puede tener uno o más rebaños, cada uno con su propio recorrido.
- Registro de movimientos de animales:
  - Salidas: muerte, venta o traslado (con opción de registrar cliente, precio
    y peso promedio en ventas).
  - Entradas: nacimiento, compra o traslado.
- Programación de manejo de corral al llegar a un potrero (ej: menos horas de
  pastoreo por día).

### 🌦️ Clima y condiciones del campo

- Integración opcional con estaciones meteorológicas cercanas de datos abiertos,
  para consultar milímetros de lluvia y otras variables.
- Registro manual simplificado para todo el recorrido:
  - Velocidad de crecimiento del pasto: rápido / lento / estancado.
  - Eventos climáticos relevantes: lluvias significativas, heladas.

Esta información contextualiza los datos de pastoreo sin requerir conocimientos
técnicos especializados.

### 🔧 Manejos específicos por potrero

- Cosecha de bolos.
- Resiembra.
- Toma de muestras de suelo (ej: presencia de gusano blanco o cuncunilla negra).

### Funcionalidades opcionales (menú secundario)

- Manejo de corral: registro del tiempo fuera del potrero.
- Localización automática de animales: posibilidad de conectar un collar GPS
  colocado en un animal manso de cada rebaño, que envía señal cada 3 horas. Bajo
  consumo de batería, bajo costo, 1 o 2 animales por rebaño son suficientes para
  automatizar el registro de movimientos.

## Principios de diseño

- **Muy fácil de usar**: pensada para ser operada con guantes, en el campo, con
  datos a un toque.
- **Interfaz limpia**: sin menús innecesarios a la vista. Lo importante, siempre
  al frente.
- **Funciona sin internet**: los datos se sincronizan cuando hay conexión.
- **Compatible con el flujo de trabajo actual**: no reemplaza las planillas
  existentes, las importa y mejora.

## Usuarios objetivo

Ganaderos, agricultores y técnicos que practiquen o estén adoptando el pastoreo
regenerativo o el manejo holístico de Savory, con campos de cualquier tamaño y
uno o más rebaños.

---

## Stack técnico

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

## Cobertura de funcionalidades

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
