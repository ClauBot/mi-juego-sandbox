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
- Ragdolls con fisica realista
- Sistema de vida y muerte
- Armas: pistola y cuchillo
- Musica tecno generativa (sintetizada en tiempo real)
- Sonidos: golpes, gritos, quemadura
- Particulas de sangre
- Sol que quema
- Nubes animadas
- Arboles y flores decorativas
- Sistema de equipos/colores

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
