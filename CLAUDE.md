# Sandbox Mayhem

Juego sandbox estilo Melon Playground. Arrastra, lanza y destruye ragdolls.

## URLs
- **Produccion:** https://sandboxmayhem.vercel.app
- **Repositorio:** https://github.com/ClauBot/mi-juego-sandbox
- **Local:** http://localhost:3000

## Stack
- Phaser 3 (motor de juego)
- Matter.js (fisica)
- Web Audio API (musica y sonidos)
- PWA (instalable en movil)
- Vercel (deploy)

## Archivos
- `game.js` - Logica del juego (~2500 lineas)
- `index.html` - Entrada
- `style.css` - Estilos minimos
- `sw.js` - Service Worker para offline
- `manifest.json` - Config PWA
- `icon.svg` - Icono del juego

## Funcionalidades
- Ragdolls con fisica realista (parpadean cada 30s)
- 16 armas: pistola, cuchillo, granada, espada, bat, cohete, barril, trampolin, katana, motosierra, arco, nuke, iman, lanzallamas, portal, ventilador
- 20 mapas: normal, volcan, tornado, rayos, lunar, zombie, agujero negro, agua, lava, hielo, desierto, bosque, noche, arcoiris, ciudad, playa, niebla, espacio, jungla, oceano
- 8 colores de equipo
- Camara lenta (boton abajo derecha)
- Musica tecno generativa (sintetizada en tiempo real)
- Sonidos: golpes, disparos, explosiones, truenos, motosierra
- Particulas de sangre
- Sol que quema
- Nubes animadas
- Arboles y flores decorativas

## Optimizaciones movil
- Deteccion de dispositivos de bajo rendimiento (isLowPerf)
- Limites: MAX_BLOOD_PARTICLES, MAX_RAGDOLLS
- FPS limitado a 30 en movil
- Physics iterations reducidas
- Antialiasing desactivado en movil

## Comandos
```bash
# Correr local
python3 -m http.server 3000

# Push a produccion
git add -A && git commit -m "mensaje" && git push origin master
```

## Git
- Usuario: mexi (m@mexi.wtf)
- Repo: ClauBot/mi-juego-sandbox
- Branch: master
- Deploy: automatico en push (Vercel)

---

## Historial

### 2026-01-30
- Correr juego en local (python3 -m http.server 3000)
- Arreglar PWA para que sea instalable:
  - Crear icon.svg (muñeco ragdoll)
  - Actualizar manifest.json con iconos
  - Mejorar sw.js con cache-first para offline
- Pantalla completa en tablet/celular:
  - Cambiar de 800x600 fijo a 100% pantalla
  - Escala RESIZE para adaptarse a cualquier dispositivo
  - Posiciones dinamicas para suelo, paredes, UI y ragdolls
- Mejorar drag and drop en tablets:
  - Area de deteccion mas grande (70px)
  - Agregar pointerupoutside
- Boton de musica mas grande (70x70px):
  - Iconos play/pausa mas visibles
  - Sombra y borde
  - Posicion dinamica
- Optimizaciones de rendimiento para movil:
  - Deteccion de dispositivos de bajo rendimiento
  - Limitar particulas de sangre y ragdolls
  - FPS limitado a 30 en movil
- Cambiar dominio a sandboxmayhem.vercel.app
- Elegir nombre: Sandbox Mayhem

### 2026-01-30 (sesion 2)
- Arreglar colision del piso (reducir friccion para que no se trabe)
- Armas no atraviesan el piso (agregar mascara de colision 0x0004)
- Sistema de balas:
  - Pistola dispara balas que empujan ragdolls
  - Sangre al impactar
  - Sonido de disparo
- Limite de 10 armas en pantalla
- Armas se pueden mover arrastrando (click rapido = disparar/activar)
- Armas golpean ragdolls (colision con categoria 0x0004)
- Quitar barra de vida, muerte y "womp womp"
- Granada con timer de 5 segundos visible
- Ragdolls parpadean cada 30 segundos
- Sistema de mapas (10 mapas):
  - Normal: gravedad normal
  - Tornado: lanza volando lo que toca
  - Tormenta: lluvia + rayos frecuentes
  - Luna: gravedad baja + estrellas + luna grande
  - Zombie: ragdolls persiguen + piel verde + cerebro expuesto
  - Agujero negro: atrae todo desde cualquier lugar
  - Agua: flotan + burbujas + olas
  - Lava: quema al tocar fondo + lava burbujeante
  - Hielo: resbaloso + copos de nieve
  - Espacio: sin gravedad + estrellas
- Nuevas armas (16 total):
  - Pistola, Cuchillo, Granada, Espada, Bat, Cohete, Barril, Trampolin
  - Katana (larga), Motosierra (on/off), Arco (dispara flechas)
  - Nuke (explosion masiva en 8s), Iman (atrae ragdolls)
  - Lanzallamas (dispara fuego), Portal (teletransporta, poner 2)
  - Ventilador (sopla hacia arriba)
- Boton de camara lenta (esquina inferior derecha)
- 8 colores de equipo (antes 4)
- Menus de armas y mapas con grid compacto
- Arma se deselecciona despues de colocar
- Efectos visuales por mapa (overlay de color, particulas)

### 2026-01-30 (sesion 3)
- Codigo secreto: teclear "1119" durante el juego da 1000 mayhems
- Mejora mapa de playa:
  - Cielo tropical con gradiente (turquesa arriba, azul abajo)
  - Palmeras animadas con cocos
  - Agua con olas y fisica (ragdolls flotan)
  - Cangrejos caminando
  - Arena dorada con conchas

## Reglas de desarrollo
- **NO ROMPER NADA**: Al hacer cambios, asegurar que toda la funcionalidad existente siga funcionando
- Los mundos/mapas siempre deben funcionar correctamente
- Los botones del menu deben seguir funcionando despues de cambiar de mapa
