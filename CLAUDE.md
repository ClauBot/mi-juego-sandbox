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
