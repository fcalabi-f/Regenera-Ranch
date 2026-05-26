# Regenera-Ranch
Claro, aquí va una versión organizada y clara para que cualquier persona —técnica o no— pueda entender el proyecto:

PastorApp – Aplicación Móvil para Gestión de Pastoreo Regenerativo
¿Qué es?
Una aplicación móvil (iOS y Android) diseñada para agricultores y ganaderos que practican pastoreo regenerativo o manejo holístico, inspirada en la metodología del Savory Institute. Su objetivo es facilitar el seguimiento del pastoreo en el campo, recolectar datos útiles de forma automatizada y manual, y apoyar la toma de decisiones para mejorar la productividad y la salud del suelo a lo largo del tiempo.

Problema que resuelve
El pastoreo regenerativo requiere un registro constante y detallado de movimientos de animales, días de rezago, intensidad de pastoreo y condiciones del terreno. Hoy esto se hace en planillas físicas o Excel, lo que dificulta el análisis, la comparación entre temporadas y la toma de decisiones en tiempo real, directamente desde el campo.

Funcionalidades principales
🗺️ Mapa de potreros inteligente

El usuario carga un archivo KMZ con el mapa de su campo (elaborado fácilmente en Google Earth desde el computador).
La app detecta automáticamente en qué potrero se encuentra el usuario mediante el GPS del teléfono.
Al tocar un potrero en pantalla, muestra de inmediato:

Días de rezago (días desde el último pastoreo).
Intensidad del último pastoreo (Leve / Moderado / Intenso).
Duración y carga animal del último pastoreo (ej: 300 vacas, 3 días).
Flujo de movimiento: desde qué potrero vienen los animales y hacia cuál se dirigen (representado con flechas en el mapa).




📋 Ingreso de datos de pastoreo

Carga de planilla de pastoreo en Excel (compatible con el formato Savory Institute).
Registro manual desde el campo:

Cantidad y peso de animales (o selección de un rebaño predefinido).
Fecha de entrada y días en el potrero.
Observaciones: malezas, plagas u otras condiciones observadas.
Recomendaciones: saltar la próxima vuelta, aplicar pastoreo leve, resembrar, regenerar, etc.




📊 Análisis histórico por potrero
Por cada potrero, la app calcula y muestra —en el año calendario o agrícola definido por el usuario:

Total de raciones animales (Unidades Animal/Día), con estimación de materia seca consumida según parámetros ingresados o valores estándar por categoría.
Secuencia e intensidad de pastoreo a lo largo de la temporada (ej: L, M, I, I, M, L).
Comparación con temporada anterior en raciones animales e intensidad, para evaluar si el potrero puede clasificarse como más o menos productivo.
Alimentación suplementaria: registro de tipo y cantidad por día (ej: 4 bolos de silo, 3 bolos de heno).


🐄 Gestión de rebaños

Un campo puede tener uno o más rebaños, cada uno con su propio recorrido.
Registro de movimientos de animales:

Salidas: muerte, venta o traslado (con opción de registrar cliente, precio y peso promedio en ventas).
Entradas: nacimiento, compra o traslado.


Programación de manejo de corral al llegar a un potrero (ej: menos horas de pastoreo por día).


🌦️ Clima y condiciones del campo

Integración opcional con estaciones meteorológicas cercanas de datos abiertos, para consultar milímetros de lluvia y otras variables.
Registro manual simplificado para todo el recorrido:

Velocidad de crecimiento del pasto: rápido / lento / estancado.
Eventos climáticos relevantes: lluvias significativas, heladas.


Esta información contextualiza los datos de pastoreo sin requerir conocimientos técnicos especializados.


🔧 Manejos específicos por potrero

Cosecha de bolos.
Resiembra.
Toma de muestras de suelo (ej: presencia de gusano blanco o cuncunilla negra).


Funcionalidades opcionales (menú secundario)
Para no sobrecargar la interfaz principal:

Manejo de corral: registro del tiempo fuera del potrero.
Localización automática de animales: posibilidad de conectar un collar GPS colocado en un animal manso de cada rebaño, que envía señal cada 3 horas. Bajo consumo de batería, bajo costo, 1 o 2 animales por rebaño son suficientes para automatizar el registro de movimientos.


Integración de datos
EntradaSalidaArchivo KMZ (Google Earth)Tablas de datos exportables en ExcelPlanilla Excel de pastoreoMapa interactivo con historial por potreroGPS del teléfonoReportes de raciones animales por temporadaGPS de collares (opcional)Comparativos entre temporadas

Principios de diseño

Muy fácil de usar: pensada para ser operada con guantes, en el campo, con datos a un toque.
Interfaz limpia: sin menús innecesarios a la vista. Lo importante, siempre al frente.
Funciona sin internet: los datos se sincronizan cuando hay conexión.
Compatible con el flujo de trabajo actual: no reemplaza las planillas existentes, las importa y mejora.


Usuarios objetivo
Ganaderos, agricultores y técnicos que practiquen o estén adoptando el pastoreo regenerativo o el manejo holístico de Savory, con campos de cualquier tamaño y uno o más rebaños.
