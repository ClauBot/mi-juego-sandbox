// ============================================
// MI SANDBOX - Juego estilo Melon Playground
// Mobile & Tablet First + Música
// ============================================

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isLowPerf = isMobile || navigator.hardwareConcurrency <= 4;

// Obtener dimensiones reales del viewport (importante para móvil)
function getViewportSize() {
    const vv = window.visualViewport;
    return {
        width: vv ? vv.width : window.innerWidth,
        height: vv ? vv.height : window.innerHeight
    };
}
const viewport = getViewportSize();
const screenWidth = viewport.width;
const screenHeight = viewport.height;

// Constantes de optimización para móvil
const MAX_BLOOD_PARTICLES = isLowPerf ? 15 : 50;
const MAX_RAGDOLLS = isLowPerf ? 6 : 15;
const PHYSICS_UPDATE_SKIP = isLowPerf ? 2 : 1; // Actualizar física cada N frames
let frameCount = 0;

// Función para obtener la Y del suelo dinámicamente
function getGroundY() {
    return Math.max(game.scale.height, window.innerHeight) - 50;
}
function getGroundLimit() {
    return Math.max(game.scale.height, window.innerHeight) - 65;
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    scale: {
        mode: Phaser.Scale.NONE
    },
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1.0 }, // Gravedad más realista
            debug: false,
            // Optimizaciones para móvil
            positionIterations: isLowPerf ? 4 : 6,
            velocityIterations: isLowPerf ? 3 : 4,
            constraintIterations: isLowPerf ? 2 : 2
        }
    },
    input: {
        activePointers: 3
    },
    render: {
        // Desactivar antialiasing en móvil para mejor rendimiento
        antialias: !isLowPerf,
        pixelArt: isLowPerf
    },
    fps: {
        // Limitar FPS en móvil
        target: isLowPerf ? 30 : 60,
        forceSetTimeOut: isLowPerf
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let game;
let ragdolls = [];
let selectedPart = null;
let isDragging = false;
let lastPointerPosition = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
let teamColors = [0xFF4444, 0x4444FF, 0xFFFF44, 0x44FF44, 0xFF44FF, 0x44FFFF, 0xFF8800, 0x8800FF];
let currentTeam = 0;
let teamButton;
let uiText;
let sceneRef;
let ragdollCollisionGroup = 0;
let bloodParticles = [];
let audioContext = null;
let musicPlaying = false;
let musicButton;
let musicGain = null;
let currentWeapon = null; // 'pistola', 'cuchillo', 'granada', 'caja', 'barril', 'cuerda'
let weapons = [];
let weaponMenuOpen = false;
let weaponButton;
let weaponMenu;

// NPC Menu
let npcMenuOpen = false;
let npcButton;
let npcMenu;
let currentNpcType = 'normal';

// === NUEVAS FEATURES ===
let bullets = [];
let grenades = [];
let boxes = [];
let ropes = [];
let ropeStart = null;
let teamKills = [0, 0, 0, 0];
let killScoreText;
let volumeMusic = 0.5;
let volumeEffects = 0.5;
let effectsGain = null;
let timeOfDay = 0;
let currentScenario = 'pradera';
let skyGraphics;
let stars = [];
let moon;
let snowflakes = [];
let selectedWeapon = null;
let isDraggingWeapon = false;
let scenarioElements = [];

// === SISTEMA DE MAPAS ===
let currentMap = 'normal';
let mapMenuOpen = false;
let mapButton;
let mapMenu;
let slowMotion = false;
let slowMotionButton;

// Efectos de mapa
let tornadoActive = false;
let tornadoX = 0;
let lightningTimer = 0;
let zombieMode = false;
let blackHoleActive = false;
let blackHoleX = 0;
let blackHoleY = 0;
let trampolines = [];
let cannons = [];

// Elementos del escenario para mostrar/ocultar por mapa
let treesGraphics = [];
let flowersGraphics = [];
let groundGraphics = null;
let earthGraphics = null;
let iceGraphics = null;
let snowParticles = [];
let starsGraphics = null;

// === SISTEMA DE TIENDA Y CREADOR ===
let mayhems = 0;
let lastDailyReward = null;
let exitMenuOpen = false;
let exitMenu;
let shopOpen = false;
let shopMenu;
let creatorOpen = false;
let creatorMenu;
let mayhemsText;
let unlockedItems = {
    npcs: ['normal', 'esqueleto'],
    weapons: ['pistola', 'cuchillo', 'granada'],
    worlds: ['normal']
};
let customItems = {
    npcs: [],
    weapons: [],
    worlds: []
};

// Items publicados en la tienda por la comunidad
let publishedItems = {
    npcs: [],
    weapons: [],
    worlds: []
};

// Items de la tienda
const shopItems = {
    npcs: [
        { id: 'normal', name: 'Normal', emoji: '🧑', price: 0 },
        { id: 'ninja', name: 'Ninja', emoji: '🥷', price: 50 },
        { id: 'robot', name: 'Robot', emoji: '🤖', price: 100 },
        { id: 'alien', name: 'Alien', emoji: '👽', price: 150 },
        { id: 'pirata', name: 'Pirata', emoji: '🏴‍☠️', price: 75 },
        { id: 'knight', name: 'Caballero', emoji: '🛡️', price: 200 },
        { id: 'wizard', name: 'Mago', emoji: '🧙', price: 250 },
        { id: 'demon', name: 'Demonio', emoji: '👹', price: 300 },
        { id: 'vampire', name: 'Vampiro', emoji: '🧛', price: 175 },
        { id: 'fairy', name: 'Hada', emoji: '🧚', price: 125 },
        { id: 'mermaid', name: 'Sirena', emoji: '🧜', price: 200 },
        { id: 'genie', name: 'Genio', emoji: '🧞', price: 350 },
        { id: 'superhero', name: 'Superhéroe', emoji: '🦸', price: 400 },
        { id: 'villain', name: 'Villano', emoji: '🦹', price: 400 },
        { id: 'zombie', name: 'Zombie', emoji: '🧟', price: 100 },
        { id: 'ghost', name: 'Fantasma', emoji: '👻', price: 150 },
        { id: 'clown', name: 'Payaso', emoji: '🤡', price: 75 },
        { id: 'astronaut', name: 'Astronauta', emoji: '🧑‍🚀', price: 250 },
        { id: 'king', name: 'Rey', emoji: '🤴', price: 500 },
        { id: 'queen', name: 'Reina', emoji: '👸', price: 500 },
        { id: 'esqueleto', name: 'Esqueleto', emoji: '💀', price: 80 }
    ],
    weapons: [
        { id: 'pistola', name: 'Pistola', emoji: '🔫', price: 0 },
        { id: 'cuchillo', name: 'Cuchillo', emoji: '🔪', price: 0 },
        { id: 'granada', name: 'Granada', emoji: '💣', price: 0 },
        { id: 'espada', name: 'Espada', emoji: '🗡️', price: 25 },
        { id: 'bat', name: 'Bate', emoji: '🏏', price: 25 },
        { id: 'barril', name: 'Barril', emoji: '🛢️', price: 30 },
        { id: 'trampolin', name: 'Trampolín', emoji: '🛝', price: 40 },
        { id: 'katana', name: 'Katana', emoji: '⚔️', price: 75 },
        { id: 'motosierra', name: 'Motosierra', emoji: '🪚', price: 100 },
        { id: 'arco', name: 'Arco', emoji: '🏹', price: 60 },
        { id: 'nuke', name: 'Nuke', emoji: '☢️', price: 500 },
        { id: 'iman', name: 'Imán', emoji: '🧲', price: 80 },
        { id: 'lanzallamas', name: 'Lanzallamas', emoji: '🔥', price: 150 },
        { id: 'portal', name: 'Portal', emoji: '🌀', price: 200 },
        { id: 'ventilador', name: 'Ventilador', emoji: '💨', price: 90 },
        { id: 'hacha', name: 'Hacha', emoji: '🪓', price: 55 },
        { id: 'martillo', name: 'Martillo', emoji: '🔨', price: 45 },
        { id: 'dinamita', name: 'Dinamita', emoji: '🧨', price: 120 },
        { id: 'laser', name: 'Láser', emoji: '🔦', price: 180 },
        { id: 'escudo', name: 'Escudo', emoji: '🛡️', price: 70 },
        { id: 'boomerang', name: 'Boomerang', emoji: '🪃', price: 85 },
        { id: 'piedra', name: 'Piedra', emoji: '🪨', price: 10 },
        { id: 'cactus', name: 'Cactus', emoji: '🌵', price: 35 },
        { id: 'yunque', name: 'Yunque', emoji: '⚒️', price: 100 }
    ],
    worlds: [
        { id: 'normal', name: 'Normal', emoji: '🌳', price: 0 },
        { id: 'tornado', name: 'Tornado', emoji: '🌪️', price: 50 },
        { id: 'rayos', name: 'Rayos', emoji: '⚡', price: 50 },
        { id: 'lunar', name: 'Lunar', emoji: '🌙', price: 75 },
        { id: 'zombie', name: 'Zombie', emoji: '🧟', price: 100 },
        { id: 'blackhole', name: 'Agujero Negro', emoji: '🕳️', price: 150 },
        { id: 'agua', name: 'Agua', emoji: '🌊', price: 75 },
        { id: 'lava', name: 'Lava', emoji: '🌋', price: 125 },
        { id: 'hielo', name: 'Hielo', emoji: '🧊', price: 75 },
        { id: 'desierto', name: 'Desierto', emoji: '🏜️', price: 60 },
        { id: 'bosque', name: 'Bosque', emoji: '🌲', price: 50 },
        { id: 'noche', name: 'Noche', emoji: '🌃', price: 40 },
        { id: 'arcoiris', name: 'Arcoíris', emoji: '🌈', price: 100 },
        { id: 'ciudad', name: 'Ciudad', emoji: '🏙️', price: 125 },
        { id: 'playa', name: 'Playa', emoji: '🏖️', price: 75 },
        { id: 'niebla', name: 'Niebla', emoji: '🌫️', price: 60 },
        { id: 'espacio', name: 'Espacio', emoji: '🚀', price: 100 }
    ]
};

// Calcular precio con descuento: mitad de precio redondeado, gratis si < 50 (pero 50 no es gratis)
function getDiscountedPrice(originalPrice) {
    if (originalPrice === 0) return 0;
    const halfPrice = Math.round(originalPrice / 2); // Redondear
    if (halfPrice < 50) return 0; // Gratis si es menos de 50
    return halfPrice; // 50 o más se mantiene
}

// Items por defecto que siempre deben estar desbloqueados
const defaultUnlocked = {
    npcs: ['normal', 'esqueleto'],
    weapons: ['pistola', 'cuchillo', 'granada'],
    worlds: ['normal']
};

// Cargar datos guardados
function loadSaveData() {
    try {
        const saved = localStorage.getItem('sandboxMayhem_save');
        if (saved) {
            const data = JSON.parse(saved);
            mayhems = data.mayhems || 0;
            lastDailyReward = data.lastDailyReward || null;
            unlockedItems = data.unlockedItems || unlockedItems;
            customItems = data.customItems || customItems;
            publishedItems = data.publishedItems || publishedItems;
        }
        // Asegurar que los items por defecto siempre estén desbloqueados
        defaultUnlocked.npcs.forEach(item => {
            if (!unlockedItems.npcs.includes(item)) unlockedItems.npcs.push(item);
        });
        defaultUnlocked.weapons.forEach(item => {
            if (!unlockedItems.weapons.includes(item)) unlockedItems.weapons.push(item);
        });
        defaultUnlocked.worlds.forEach(item => {
            if (!unlockedItems.worlds.includes(item)) unlockedItems.worlds.push(item);
        });
        // Verificar recompensa diaria
        checkDailyReward();
    } catch (e) {
        console.error('Error loading save:', e);
    }
}

function saveSaveData() {
    try {
        localStorage.setItem('sandboxMayhem_save', JSON.stringify({
            mayhems,
            lastDailyReward,
            unlockedItems,
            customItems,
            publishedItems
        }));
    } catch (e) {
        console.error('Error saving:', e);
    }
}

function checkDailyReward() {
    const today = new Date().toDateString();
    if (lastDailyReward !== today) {
        mayhems += 100;
        lastDailyReward = today;
        saveSaveData();
        // Mostrar notificación después de que el juego inicie
        setTimeout(() => {
            if (sceneRef) {
                showNotification('🎁 +100 Mayhems diarios!');
            }
        }, 1500);
    }
}

function showNotification(text) {
    if (!sceneRef) return;
    const notif = sceneRef.add.text(game.scale.width / 2, 100, text, {
        font: 'bold 24px Arial',
        fill: '#FFD700',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(200);

    sceneRef.tweens.add({
        targets: notif,
        y: 60,
        alpha: 0,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => notif.destroy()
    });
}

// Esperar a que el DOM esté listo para tener dimensiones correctas
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Actualizar config con dimensiones reales
        config.width = window.innerWidth;
        config.height = window.innerHeight;
        game = new Phaser.Game(config);
    });
} else {
    config.width = window.innerWidth;
    config.height = window.innerHeight;
    game = new Phaser.Game(config);
}

function preload() {}

function create() {
    sceneRef = this;
    const scene = this;

    // Forzar canvas a 100% del contenedor
    const canvas = this.game.canvas;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';

    // Pequeño delay para asegurar que las dimensiones estén correctas
    setTimeout(() => {
        initGameContent(scene);
    }, 100);
}

// Contador global de visitantes
async function checkVisitorCount() {
    try {
        // Usar CountAPI para contar visitantes globales (v2 - contador nuevo)
        const response = await fetch('https://api.countapi.xyz/hit/sandboxmayhem-oficial/visitas');
        const data = await response.json();
        const visitorNumber = data.value;

        console.log('Visitante número:', visitorNumber);

        // PRIMER VISITANTE gana 100,000,000,000,000,000,000,000,000,000 mayhems!!!
        if (visitorNumber === 1) {
            mayhems += 1e29; // 100 octillones de mayhems
            saveSaveData();
            setTimeout(() => {
                if (sceneRef) {
                    showFirstVisitorPrize(sceneRef);
                }
            }, 1000);
        }
        // Cada 100 visitantes gana 1,000,000 mayhems!
        else if (visitorNumber % 100 === 0) {
            mayhems += 1000000;
            saveSaveData();
            // Mostrar mensaje de premio
            setTimeout(() => {
                if (sceneRef) {
                    showPrizeMessage(sceneRef, visitorNumber);
                }
            }, 1000);
        }

        return visitorNumber;
    } catch (e) {
        console.log('Error contando visitantes:', e);
        return 0;
    }
}

function showPrizeMessage(scene, visitorNumber) {
    const w = game.scale.width;
    const h = game.scale.height;

    // Fondo del mensaje
    const msgBg = scene.add.graphics();
    msgBg.fillStyle(0xFFD700, 1);
    msgBg.fillRoundedRect(w/2 - 150, h/2 - 80, 300, 160, 20);
    msgBg.lineStyle(4, 0xFF8C00, 1);
    msgBg.strokeRoundedRect(w/2 - 150, h/2 - 80, 300, 160, 20);
    msgBg.setDepth(200);

    const title = scene.add.text(w/2, h/2 - 50, '🎉 GANASTE! 🎉', {
        font: 'bold 24px Arial',
        fill: '#000000'
    }).setOrigin(0.5).setDepth(201);

    const msg = scene.add.text(w/2, h/2, 'Visitante #' + visitorNumber, {
        font: '18px Arial',
        fill: '#333333'
    }).setOrigin(0.5).setDepth(201);

    const prize = scene.add.text(w/2, h/2 + 35, '+1,000,000 MAYHEMS!', {
        font: 'bold 20px Arial',
        fill: '#FF0000'
    }).setOrigin(0.5).setDepth(201);

    // Cerrar después de 5 segundos
    setTimeout(() => {
        msgBg.destroy();
        title.destroy();
        msg.destroy();
        prize.destroy();
        updateMayhemsDisplay();
    }, 5000);
}

function showFirstVisitorPrize(scene) {
    const w = game.scale.width;
    const h = game.scale.height;

    // Fondo dorado brillante
    const msgBg = scene.add.graphics();
    msgBg.fillStyle(0xFFD700, 1);
    msgBg.fillRoundedRect(w/2 - 180, h/2 - 120, 360, 240, 25);
    msgBg.lineStyle(6, 0xFF4500, 1);
    msgBg.strokeRoundedRect(w/2 - 180, h/2 - 120, 360, 240, 25);
    msgBg.setDepth(200);

    const title = scene.add.text(w/2, h/2 - 80, '👑 PRIMER JUGADOR 👑', {
        font: 'bold 26px Arial',
        fill: '#FF0000'
    }).setOrigin(0.5).setDepth(201);

    const msg = scene.add.text(w/2, h/2 - 30, '¡ERES EL #1!', {
        font: 'bold 32px Arial',
        fill: '#000000'
    }).setOrigin(0.5).setDepth(201);

    const prize = scene.add.text(w/2, h/2 + 20, '🎉 GANASTE 🎉', {
        font: 'bold 22px Arial',
        fill: '#333333'
    }).setOrigin(0.5).setDepth(201);

    const amount = scene.add.text(w/2, h/2 + 60, '100,000,000,000,000,000,000,000,000,000', {
        font: 'bold 14px Arial',
        fill: '#FF0000'
    }).setOrigin(0.5).setDepth(201);

    const mayhems = scene.add.text(w/2, h/2 + 85, 'MAYHEMS!!!', {
        font: 'bold 24px Arial',
        fill: '#FF4500'
    }).setOrigin(0.5).setDepth(201);

    // Cerrar después de 8 segundos
    setTimeout(() => {
        msgBg.destroy();
        title.destroy();
        msg.destroy();
        prize.destroy();
        amount.destroy();
        mayhems.destroy();
        updateMayhemsDisplay();
    }, 8000);
}

function initGameContent(scene) {
    // Cargar datos guardados (mayhems, items desbloqueados, etc.)
    loadSaveData();

    // Contar visitante
    checkVisitorCount();

    // Obtener dimensiones del viewport actual
    const realWidth = window.innerWidth;
    const realHeight = window.innerHeight;

    console.log('=== INIT GAME CONTENT ===');
    console.log('window:', realWidth, 'x', realHeight);
    console.log('game.scale:', game.scale.width, 'x', game.scale.height);

    // Forzar resize del juego a las dimensiones correctas
    game.scale.resize(realWidth, realHeight);

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}

    createGround(scene);

    const spawnY = realHeight - 200;
    const w = realWidth;

    if (isMobile) {
        createRagdoll(scene, w * 0.3, spawnY, teamColors[0]);
        createRagdoll(scene, w * 0.7, spawnY, teamColors[1]);
    } else {
        createRagdoll(scene, w * 0.25, spawnY, teamColors[0]);
        createRagdoll(scene, w * 0.5, spawnY, teamColors[1]);
        createRagdoll(scene, w * 0.75, spawnY, teamColors[2]);
    }

    createUI(scene);

    scene.input.on('pointerdown', onPointerDown, scene);
    scene.input.on('pointermove', onPointerMove, scene);
    scene.input.on('pointerup', onPointerUp, scene);
    scene.input.on('pointerupoutside', onPointerUp, scene);

    // Colisiones (optimizado para móvil)
    let lastCollisionTime = 0;
    const collisionCooldown = isLowPerf ? 100 : 50; // ms entre efectos de colisión

    scene.matter.world.on('collisionstart', (event) => {
        const now = Date.now();

        // En móvil, limitar frecuencia de efectos
        if (isLowPerf && now - lastCollisionTime < collisionCooldown) {
            return;
        }

        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            const vel = Math.abs(bodyA.velocity?.x || 0) + Math.abs(bodyA.velocity?.y || 0) +
                Math.abs(bodyB.velocity?.x || 0) + Math.abs(bodyB.velocity?.y || 0);

            // Verificar si es colisión con arma
            const isWeaponHit = (bodyA.collisionFilter?.category === 0x0004) ||
                               (bodyB.collisionFilter?.category === 0x0004);

            // Verificar si es colisión NPC con suelo (no hacer sonido)
            const catA = bodyA.collisionFilter?.category || 0;
            const catB = bodyB.collisionFilter?.category || 0;
            const isGroundCollision = (catA === 0x0001 && catB === 0x0002) ||
                                      (catA === 0x0002 && catB === 0x0001);

            if (vel > 12 || (isWeaponHit && vel > 5)) {
                lastCollisionTime = now;
                const x = pair.collision.supports[0]?.x || bodyA.position.x;
                const y = pair.collision.supports[0]?.y || bodyA.position.y;

                // Verificar si un barril fue golpeado
                weapons.forEach(weapon => {
                    if (weapon.type === 'barril' && weapon.body) {
                        if (weapon.body === bodyA || weapon.body === bodyB) {
                            weapon.hitCount = (weapon.hitCount || 0) + 1;
                            if (weapon.hitCount >= 2 || vel > 20) {
                                setTimeout(() => explodeBarril(weapon), 50);
                            }
                        }
                    }
                });

                if (isWeaponHit) {
                    spawnBlood(x, y, Math.min(8, Math.floor(vel / 4)));
                    playHitSound(vel / 20);
                } else if (!isGroundCollision) {
                    // Solo hacer sonido y sangre si NO es colisión con suelo
                    const bloodChance = isLowPerf ? 0.15 : 0.25;
                    if (Math.random() < bloodChance) {
                        spawnBlood(x, y, Math.min(isLowPerf ? 3 : 5, Math.floor(vel / 8)));
                    }
                    playHitSound(vel / 30);
                }
            } else if (vel > 6 && !isGroundCollision) {
                // Solo hacer sonido si NO es colisión con suelo
                playHitSound(vel / 40);
            }
        });
    });

    // NO usar resize listener - causa problemas en móvil
    // this.scale.on('resize', onResize, this);
}

// ============ MÚSICA TECNO PEGAJOSA ============
let barCount = 0;
let currentPattern = 0;

function startMusic() {
    if (!audioContext || musicPlaying) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    musicPlaying = true;
    barCount = 0;
    currentPattern = 0;

    musicGain = audioContext.createGain();
    musicGain.gain.value = 0.18;
    musicGain.connect(audioContext.destination);

    playTechnoLoop();
}

function playTechnoLoop() {
    if (!musicPlaying || !audioContext) return;

    const bpm = 130;
    const beatTime = 60 / bpm;
    const now = audioContext.currentTime;

    barCount++;

    // === MODO SIMPLIFICADO PARA MÓVIL ===
    if (isLowPerf) {
        // Kick simple - solo 4 golpes
        const kickSimple = [1, 0, 1, 0, 1, 0, 1, 0];
        for (let i = 0; i < 8; i += 2) {
            if (kickSimple[i]) {
                playKick(now + i * beatTime / 2);
            }
        }

        // Snare solo en 2 y 4
        playSnare(now + beatTime);
        playSnare(now + beatTime * 3);

        // Hi-hats reducidos (8 en vez de 16)
        for (let i = 0; i < 8; i++) {
            const vol = i % 2 === 0 ? 0.4 : 0.2;
            playHiHat(now + i * beatTime / 2, vol);
        }

        // Bass simplificado (4 notas en vez de 8)
        const bassSimple = [36, 39, 41, 43];
        for (let i = 0; i < 4; i++) {
            playBass(now + i * beatTime, bassSimple[i % 4]);
        }

        // Melodía reducida (4 notas)
        const melodySimple = [72, 75, 79, 75];
        for (let i = 0; i < 4; i++) {
            playSynth(now + i * beatTime, melodySimple[i], beatTime - 0.02);
        }

        // Sin guitarras, pads ni risers en móvil

        if (barCount % 4 === 0) {
            currentPattern++;
        }

        setTimeout(() => playTechnoLoop(), beatTime * 4 * 1000 - 50);
        return;
    }

    // === MODO COMPLETO PARA DESKTOP ===
    // Kick - patrón más interesante
    const kickPattern = [1, 0, 0, 1, 1, 0, 1, 0];
    for (let i = 0; i < 8; i++) {
        if (kickPattern[i]) {
            playKick(now + i * beatTime / 2);
        }
    }

    // Snare/clap en 2 y 4
    playSnare(now + beatTime);
    playSnare(now + beatTime * 3);

    // Hi-hats con swing
    for (let i = 0; i < 16; i++) {
        const swing = i % 2 === 1 ? 0.02 : 0;
        const vol = i % 4 === 0 ? 0.5 : (i % 2 === 0 ? 0.35 : 0.2);
        playHiHat(now + i * beatTime / 4 + swing, vol);
    }

    // Open hi-hat
    if (barCount % 2 === 0) {
        playOpenHat(now + beatTime * 1.5);
        playOpenHat(now + beatTime * 3.5);
    }

    // Bass line pegajosa - progresión de acordes
    const bassPatterns = [
        [36, 36, 39, 41, 36, 36, 43, 41],  // Em
        [36, 36, 39, 41, 43, 43, 46, 48],  // Building
        [41, 41, 44, 46, 41, 41, 48, 46],  // Am
        [43, 43, 46, 48, 43, 41, 39, 36],  // C -> Em
    ];

    const bassPattern = bassPatterns[currentPattern % 4];
    for (let i = 0; i < 8; i++) {
        playBass(now + i * beatTime / 2, bassPattern[i]);
    }

    // Melodía principal pegajosa
    const melodies = [
        [72, 75, 79, 77, 75, 72, 74, 75],
        [79, 77, 75, 72, 75, 77, 79, 84],
        [72, 0, 75, 0, 79, 77, 75, 72],
        [84, 82, 79, 77, 75, 77, 79, 75],
    ];

    const melody = melodies[currentPattern % 4];
    for (let i = 0; i < 8; i++) {
        if (melody[i] > 0) {
            playSynth(now + i * beatTime / 2, melody[i], beatTime / 2 - 0.02);
        }
    }

    // Arpeggio de fondo
    if (barCount % 4 > 1) {
        const arpNotes = [60, 64, 67, 72, 67, 64];
        for (let i = 0; i < arpNotes.length; i++) {
            playArp(now + i * beatTime / 3, arpNotes[i]);
        }
    }

    // Pad atmosférico cada 4 compases
    if (barCount % 4 === 1) {
        playPad(now, [60, 64, 67, 72], beatTime * 4);
    }

    // Efecto riser cada 8 compases
    if (barCount % 8 === 7) {
        playRiser(now, beatTime * 4);
    }

    // GUITARRA ELÉCTRICA - riffs en compases alternos
    if (barCount % 2 === 1) {
        playGuitarRiff(now, beatTime);
    }

    // Power chords en momentos épicos
    if (barCount % 8 === 4) {
        playPowerChord(now, 40, beatTime * 2);
        playPowerChord(now + beatTime * 2, 43, beatTime * 2);
    }

    // GUITARRA ELECTROACÚSTICA - fingerpicking
    if (barCount % 4 === 0) {
        const chordRoots = [40, 45, 43, 40]; // Em, Am, G, Em
        playAcousticPattern(now, beatTime, chordRoots[currentPattern % 4]);
    }

    // Rasgueo acústico ocasional
    if (barCount % 8 === 2) {
        const chords = [
            [40, 44, 47, 52], // Em
            [45, 48, 52, 57], // Am
        ];
        playAcousticChord(now, chords[0], beatTime * 2);
        playAcousticChord(now + beatTime * 2, chords[1], beatTime * 2);
    }

    // Cambiar patrón cada 4 compases
    if (barCount % 4 === 0) {
        currentPattern++;
    }

    setTimeout(() => playTechnoLoop(), beatTime * 4 * 1000 - 50);
}

function playKick(time) {
    if (!audioContext || !musicGain) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.08);

    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

    osc.connect(gain);
    gain.connect(musicGain);

    osc.start(time);
    osc.stop(time + 0.25);
}

function playSnare(time) {
    if (!audioContext || !musicGain) return;

    // Cuerpo del snare
    const osc = audioContext.createOscillator();
    const oscGain = audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    osc.connect(oscGain);
    oscGain.connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.1);

    // Ruido
    const bufferSize = audioContext.sampleRate * 0.15;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(musicGain);
    noise.start(time);
}

function playHiHat(time, volume) {
    if (!audioContext || !musicGain) return;
    const bufferSize = audioContext.sampleRate * 0.04;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    source.start(time);
}

function playOpenHat(time) {
    if (!audioContext || !musicGain) return;
    const bufferSize = audioContext.sampleRate * 0.2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5);
    }
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    source.start(time);
}

function playBass(time, note) {
    if (!audioContext || !musicGain) return;
    const freq = 440 * Math.pow(2, (note - 69) / 12);

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    // Simplificado para móvil - un solo oscilador
    if (isLowPerf) {
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(time);
        osc.stop(time + 0.17);
        return;
    }

    // Versión completa para desktop
    const osc2 = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();

    osc.type = 'sawtooth';
    osc2.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 0.995, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.15);
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + 0.22);
    osc2.stop(time + 0.22);
}

function playSynth(time, note, duration) {
    if (!audioContext || !musicGain) return;
    const freq = 440 * Math.pow(2, (note - 69) / 12);

    const osc = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.005, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + duration);
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);
}

function playArp(time, note) {
    if (!audioContext || !musicGain) return;
    const freq = 440 * Math.pow(2, (note - 69) / 12);

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

    osc.connect(gain);
    gain.connect(musicGain);

    osc.start(time);
    osc.stop(time + 0.15);
}

function playPad(time, notes, duration) {
    if (!audioContext || !musicGain) return;

    notes.forEach(note => {
        const freq = 440 * Math.pow(2, (note - 69) / 12);
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.04, time + 0.5);
        gain.gain.setValueAtTime(0.04, time + duration - 0.5);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);

        osc.start(time);
        osc.stop(time + duration + 0.1);
    });
}

function playRiser(time, duration) {
    if (!audioContext || !musicGain) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, time);
    osc.frequency.exponentialRampToValueAtTime(2000, time + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, time);
    filter.frequency.exponentialRampToValueAtTime(4000, time + duration);
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.15, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);

    osc.start(time);
    osc.stop(time + duration + 0.1);
}

// ============ GUITARRA ELÉCTRICA ============
function playElectricGuitar(time, note, duration, style = 'clean') {
    if (!audioContext || !musicGain) return;

    const freq = 440 * Math.pow(2, (note - 69) / 12);

    // Múltiples osciladores para simular cuerdas
    const oscs = [];
    const numOscs = 3;

    const masterGain = audioContext.createGain();
    const distortion = audioContext.createWaveShaper();
    const filter = audioContext.createBiquadFilter();
    const filter2 = audioContext.createBiquadFilter();

    // Curva de distorsión
    function makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    if (style === 'distorted') {
        distortion.curve = makeDistortionCurve(50);
        distortion.oversample = '4x';
    } else {
        distortion.curve = makeDistortionCurve(5);
    }

    // Filtros para tono de guitarra
    filter.type = 'lowpass';
    filter.frequency.value = style === 'distorted' ? 3000 : 2500;
    filter.Q.value = 1;

    filter2.type = 'peaking';
    filter2.frequency.value = 800;
    filter2.gain.value = 3;
    filter2.Q.value = 2;

    // Crear osciladores con detuning para más riqueza
    for (let i = 0; i < numOscs; i++) {
        const osc = audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        osc.detune.setValueAtTime((i - 1) * 8, time); // Detuning sutil

        const oscGain = audioContext.createGain();
        oscGain.gain.value = 0.3;

        osc.connect(oscGain);
        oscGain.connect(distortion);
        oscs.push(osc);
    }

    distortion.connect(filter);
    filter.connect(filter2);
    filter2.connect(masterGain);
    masterGain.connect(musicGain);

    // Envelope de guitarra
    const vol = style === 'distorted' ? 0.12 : 0.1;
    masterGain.gain.setValueAtTime(0, time);
    masterGain.gain.linearRampToValueAtTime(vol, time + 0.01);
    masterGain.gain.setValueAtTime(vol * 0.8, time + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    oscs.forEach(osc => {
        osc.start(time);
        osc.stop(time + duration + 0.1);
    });
}

// Power chord para guitarra eléctrica
function playPowerChord(time, rootNote, duration) {
    if (!audioContext || !musicGain) return;

    // Root, quinta, octava
    playElectricGuitar(time, rootNote, duration, 'distorted');
    playElectricGuitar(time, rootNote + 7, duration, 'distorted');
    playElectricGuitar(time, rootNote + 12, duration, 'distorted');
}

// Riff de guitarra eléctrica
function playGuitarRiff(time, beatTime) {
    if (!audioContext || !musicGain) return;

    const riffs = [
        // Riff 1 - Em pentatonic
        [40, 43, 45, 43, 40, 0, 43, 40],
        // Riff 2 - Power chords
        [40, 0, 40, 43, 45, 0, 43, 40],
        // Riff 3 - Melodic
        [52, 55, 52, 50, 48, 50, 52, 48],
    ];

    const riff = riffs[currentPattern % 3];

    for (let i = 0; i < 8; i++) {
        if (riff[i] > 0) {
            playElectricGuitar(time + i * beatTime / 2, riff[i], beatTime / 2 - 0.02, 'distorted');
        }
    }
}

// ============ GUITARRA ELECTROACÚSTICA ============
function playAcousticGuitar(time, note, duration) {
    if (!audioContext || !musicGain) return;

    const freq = 440 * Math.pow(2, (note - 69) / 12);

    // Simular cuerda de guitarra acústica con Karplus-Strong simplificado
    const bufferSize = Math.floor(audioContext.sampleRate / freq);
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    // Inicializar con ruido
    const noise = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
        noise[i] = Math.random() * 2 - 1;
    }

    // Algoritmo Karplus-Strong
    let pos = 0;
    for (let i = 0; i < data.length; i++) {
        const sample = noise[pos];
        // Filtro paso bajo (promedio con anterior)
        noise[pos] = (noise[pos] + noise[(pos + 1) % bufferSize]) * 0.498;
        data[i] = sample;
        pos = (pos + 1) % bufferSize;
    }

    const source = audioContext.createBufferSource();
    source.buffer = noiseBuffer;

    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const bodyResonance = audioContext.createBiquadFilter();

    // Resonancia del cuerpo de la guitarra
    bodyResonance.type = 'peaking';
    bodyResonance.frequency.value = 250;
    bodyResonance.gain.value = 4;
    bodyResonance.Q.value = 2;

    filter.type = 'lowpass';
    filter.frequency.value = 4000;

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    source.connect(bodyResonance);
    bodyResonance.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);

    source.start(time);
    source.stop(time + duration);
}

// Acorde de guitarra acústica (rasgueo)
function playAcousticChord(time, notes, duration) {
    if (!audioContext || !musicGain) return;

    // Rasgueo - notas ligeramente desfasadas
    notes.forEach((note, i) => {
        playAcousticGuitar(time + i * 0.015, note, duration - i * 0.015);
    });
}

// Patrón de guitarra acústica
function playAcousticPattern(time, beatTime, chordRoot) {
    if (!audioContext || !musicGain) return;

    // Acorde (root, tercera, quinta, octava)
    const chord = [chordRoot, chordRoot + 4, chordRoot + 7, chordRoot + 12];

    // Patrón de fingerpicking
    const pattern = [
        { notes: [chord[0]], t: 0 },
        { notes: [chord[2]], t: beatTime * 0.5 },
        { notes: [chord[1], chord[3]], t: beatTime },
        { notes: [chord[2]], t: beatTime * 1.5 },
        { notes: [chord[0]], t: beatTime * 2 },
        { notes: [chord[2]], t: beatTime * 2.5 },
        { notes: [chord[1], chord[3]], t: beatTime * 3 },
        { notes: [chord[2]], t: beatTime * 3.5 },
    ];

    pattern.forEach(p => {
        p.notes.forEach(note => {
            playAcousticGuitar(time + p.t, note, beatTime * 0.9);
        });
    });
}

function stopMusic() {
    musicPlaying = false;
    if (musicGain) {
        musicGain.gain.value = 0;
    }
}

function toggleMusic() {
    if (musicPlaying) {
        stopMusic();
    } else {
        startMusic();
    }
    updateMusicButton();
}

function updateMusicButton() {
    if (!musicButton) return;
    musicButton.clear();

    // Botón compacto en esquina inferior izquierda
    const btnSize = isMobile ? 50 : 45;
    const margin = 8;
    const btnX = margin;
    const btnY = game.scale.height - margin - btnSize;

    // Fondo con sombra
    musicButton.fillStyle(0x000000, 0.2);
    musicButton.fillRoundedRect(btnX + 2, btnY + 2, btnSize, btnSize, 10);

    // Botón principal
    musicButton.fillStyle(musicPlaying ? 0x44DD44 : 0x666666, 1);
    musicButton.fillRoundedRect(btnX, btnY, btnSize, btnSize, 10);

    // Icono
    musicButton.fillStyle(0xFFFFFF, 1);
    if (musicPlaying) {
        // Pausa - dos barras
        musicButton.fillRect(btnX + btnSize*0.3, btnY + btnSize*0.25, btnSize*0.12, btnSize*0.5);
        musicButton.fillRect(btnX + btnSize*0.55, btnY + btnSize*0.25, btnSize*0.12, btnSize*0.5);
    } else {
        // Play - triángulo
        musicButton.fillTriangle(
            btnX + btnSize*0.3, btnY + btnSize*0.2,
            btnX + btnSize*0.3, btnY + btnSize*0.8,
            btnX + btnSize*0.75, btnY + btnSize*0.5
        );
    }
}

// ============ SONIDOS ============
function playHitSound(intensity) {
    if (!audioContext) return;
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(80 + Math.random() * 40, audioContext.currentTime);
        oscillator.type = 'sine';
        const volume = Math.min(0.3, intensity * 0.3);
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {}
}

function playGrabSound() {
    if (!audioContext) return;
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.1);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {}
}

function playThrowSound(intensity) {
    if (!audioContext) return;
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.2);
        oscillator.type = 'sine';
        const volume = Math.min(0.2, intensity * 0.02);
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {}
}

function playScream() {
    if (!audioContext) return;
    try {
        const now = audioContext.currentTime;

        // Pitch aleatorio para variedad (voz aguda o grave)
        const pitch = 0.8 + Math.random() * 0.6;
        const duration = 0.2 + Math.random() * 0.15;

        // Formantes vocales para simular "¡Ah!" o "¡Ay!" - MÁS FUERTE
        const formants = [
            { freq: 700 * pitch, gain: 0.6, q: 5 },   // F1
            { freq: 1200 * pitch, gain: 0.5, q: 8 },  // F2
            { freq: 2500 * pitch, gain: 0.3, q: 10 }  // F3
        ];

        // Fuente de ruido + tono para la voz
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.3;
        }

        // Oscilador principal (cuerdas vocales)
        const voiceOsc = audioContext.createOscillator();
        voiceOsc.type = 'sawtooth';
        voiceOsc.frequency.setValueAtTime(150 * pitch, now);
        voiceOsc.frequency.linearRampToValueAtTime(200 * pitch, now + 0.05);
        voiceOsc.frequency.linearRampToValueAtTime(120 * pitch, now + duration);

        // Segundo oscilador para más cuerpo
        const voiceOsc2 = audioContext.createOscillator();
        voiceOsc2.type = 'triangle';
        voiceOsc2.frequency.setValueAtTime(155 * pitch, now);
        voiceOsc2.frequency.linearRampToValueAtTime(205 * pitch, now + 0.05);
        voiceOsc2.frequency.linearRampToValueAtTime(125 * pitch, now + duration);

        // Mezclar osciladores - MÁS FUERTE
        const voiceMix = audioContext.createGain();
        voiceMix.gain.value = 1.0;

        voiceOsc.connect(voiceMix);
        voiceOsc2.connect(voiceMix);

        // Ruido para respiración/aire
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        const noiseGain = audioContext.createGain();
        noiseGain.gain.value = 0.4;
        noiseSource.connect(noiseGain);

        // Filtros formantes - VOLUMEN ALTO
        const outputGain = audioContext.createGain();
        outputGain.gain.setValueAtTime(0, now);
        outputGain.gain.linearRampToValueAtTime(0.8, now + 0.02);
        outputGain.gain.setValueAtTime(0.8, now + 0.05);
        outputGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        formants.forEach(f => {
            const filter = audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = f.freq;
            filter.Q.value = f.q;

            const fGain = audioContext.createGain();
            fGain.gain.value = f.gain;

            voiceMix.connect(filter);
            noiseGain.connect(filter);
            filter.connect(fGain);
            fGain.connect(outputGain);
        });

        outputGain.connect(audioContext.destination);

        voiceOsc.start(now);
        voiceOsc2.start(now);
        noiseSource.start(now);
        voiceOsc.stop(now + duration);
        voiceOsc2.stop(now + duration);
        noiseSource.stop(now + duration);
    } catch (e) {}
}

function playSplatSound() {
    if (!audioContext) return;
    try {
        const bufferSize = audioContext.sampleRate * 0.1;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        source.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        source.start(audioContext.currentTime);
    } catch (e) {}
}

function onResize(gameSize) {
    // Actualizar botón de música cuando cambia el tamaño
    if (musicButton) {
        updateMusicButton();
    }
}

function update() {
    frameCount++;

    // Actualizar nubes solo cada 2 frames en móvil
    if (!isLowPerf || frameCount % 2 === 0) {
        updateClouds();
    }

    // Actualizar posición de armas
    updateWeapons();

    // Actualizar balas
    updateBullets();

    // Actualizar parpadeo de ragdolls
    updateBlink();

    // Actualizar efectos de mapa
    updateMapEffects();

    // Verificar sol cada 5 frames en móvil
    if (!isLowPerf || frameCount % 5 === 0) {
        checkSunBurn();
    }

    // Sangre - actualizar solo cada 2 frames en móvil
    if (!isLowPerf || frameCount % 2 === 0) {
        for (let i = bloodParticles.length - 1; i >= 0; i--) {
            const blood = bloodParticles[i];
            blood.life -= isLowPerf ? 2 : 1;

            if (blood.life <= 0) {
                blood.graphics.destroy();
                bloodParticles.splice(i, 1);
            } else {
                blood.vy += 0.3;
                blood.x += blood.vx;
                blood.y += blood.vy;

                if (blood.y > getGroundLimit()) {
                    blood.y = getGroundLimit();
                    blood.vy = 0;
                    blood.vx *= 0.8;
                    blood.life = Math.min(blood.life, 80);
                }

                blood.graphics.setPosition(blood.x, blood.y);
                blood.graphics.setAlpha(Math.min(1, blood.life / 40));
            }
        }
    }

    // Actualizar física de ragdolls (puede saltar frames en móvil)
    const shouldUpdatePhysics = !isLowPerf || frameCount % PHYSICS_UPDATE_SKIP === 0;

    ragdolls.forEach(ragdoll => {
        const [head, torso, armL, armR, legL, legR] = ragdoll.parts;

        // Los que están siendo arrastrados siempre se actualizan
        if (ragdoll.isBeingDragged || shouldUpdatePhysics) {
            if (ragdoll.isStanding && !ragdoll.isBeingDragged) {
                if (torso && torso.body) {
                    const currentAngle = torso.body.angle;
                    if (Math.abs(currentAngle) > 0.05) {
                        sceneRef.matter.body.setAngle(torso.body, currentAngle * 0.9);
                    }
                    sceneRef.matter.body.setAngularVelocity(torso.body, 0);
                }
            }

            // Limitar rotación
            if (torso && torso.body) {
                const torsoAngle = torso.body.angle;
                if (head && head.body) limitAngle(head, torsoAngle, 0.7);
                if (armL && armL.body) limitAngle(armL, torsoAngle, 2.0);
                if (armR && armR.body) limitAngle(armR, torsoAngle, 2.0);
                if (legL && legL.body) limitAngle(legL, torsoAngle, 1.5);
                if (legR && legR.body) limitAngle(legR, torsoAngle, 1.5);
            }
        }

        // Límites de pantalla siempre se verifican (importante para UX)
        const screenW = game.scale.width;
        ragdoll.parts.forEach(part => {
            if (part && part.body) {
                // NO permitir saltos - limitar velocidad Y negativa
                if (!ragdoll.isBeingDragged && part.body.velocity.y < -5) {
                    part.setVelocityY(-5);
                }

                if (part.x < 20) {
                    part.setPosition(20, part.y);
                    part.setVelocityX(Math.abs(part.body.velocity.x) * 0.3);
                }
                if (part.x > screenW - 20) {
                    part.setPosition(screenW - 20, part.y);
                    part.setVelocityX(-Math.abs(part.body.velocity.x) * 0.3);
                }
                if (part.y < 20) {
                    part.setPosition(part.x, 20);
                    part.setVelocityY(Math.abs(part.body.velocity.y) * 0.3);
                }
                if (part.y > getGroundLimit()) {
                    part.setPosition(part.x, getGroundLimit());
                }
            }
        });

        // Fricción en reposo - solo si deberían actualizarse
        if (shouldUpdatePhysics && !ragdoll.isStanding && !ragdoll.isBeingDragged) {
            let totalVel = 0;
            ragdoll.parts.forEach(p => {
                if (p && p.body) {
                    totalVel += Math.abs(p.body.velocity.x) + Math.abs(p.body.velocity.y);
                }
            });

            if (totalVel < 10) {
                ragdoll.parts.forEach(part => {
                    if (part && part.body) {
                        part.setVelocity(part.body.velocity.x * 0.9, part.body.velocity.y * 0.9);
                        sceneRef.matter.body.setAngularVelocity(part.body, part.body.angularVelocity * 0.85);
                    }
                });
            }
        }
    });
}

function spawnBlood(x, y, amount) {
    // Limitar cantidad según dispositivo
    amount = Math.min(amount, isLowPerf ? 3 : 5);

    // No crear más si ya hay muchas partículas
    if (bloodParticles.length >= MAX_BLOOD_PARTICLES) {
        // Eliminar las más viejas
        const toRemove = bloodParticles.splice(0, amount);
        toRemove.forEach(p => p.graphics.destroy());
    }

    if (amount > 2) playSplatSound();

    for (let i = 0; i < amount; i++) {
        const size = Phaser.Math.Between(2, 4);
        const graphics = sceneRef.add.graphics();
        const red = Phaser.Math.Between(150, 200);
        graphics.fillStyle(Phaser.Display.Color.GetColor(red, 0, 0), 1);
        graphics.fillCircle(0, 0, size);
        graphics.setPosition(x, y);
        graphics.setDepth(5);

        bloodParticles.push({
            graphics: graphics,
            x: x,
            y: y,
            vx: Phaser.Math.FloatBetween(-3, 3),
            vy: Phaser.Math.FloatBetween(-4, -1),
            life: Phaser.Math.Between(isLowPerf ? 40 : 60, isLowPerf ? 80 : 120),
            size: size
        });
    }
}

function limitAngle(part, referenceAngle, maxDiff) {
    const partAngle = part.body.angle;
    let diff = partAngle - referenceAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > maxDiff) {
        const newAngle = referenceAngle + Math.sign(diff) * maxDiff;
        sceneRef.matter.body.setAngle(part.body, newAngle);
        sceneRef.matter.body.setAngularVelocity(part.body, part.body.angularVelocity * 0.5);
    }
}

function onPointerDown(pointer) {
    // Activar audio
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const uiAreaX = game.scale.width - 90;
    if (pointer.x > uiAreaX) return;

    // Área de botón de música (más grande)
    if (pointer.x < 100 && pointer.y > game.scale.height - 100) {
        toggleMusic();
        return;
    }

    // Área de botón de armas
    if (pointer.x > 340 && pointer.x < 460 && pointer.y < 50) {
        return;
    }

    // Verificar si clickeó en un arma para mover o disparar
    let clickedWeapon = null;
    let closestWeaponDist = 40;
    weapons.forEach(weapon => {
        if (weapon.body) {
            const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, weapon.x, weapon.y);
            if (dist < closestWeaponDist) {
                closestWeaponDist = dist;
                clickedWeapon = weapon;
            }
        }
    });

    if (clickedWeapon) {
        selectedWeapon = clickedWeapon;
        isDraggingWeapon = true;
        selectedWeapon.dragStartX = pointer.x;
        selectedWeapon.dragStartY = pointer.y;
        selectedWeapon.hasMoved = false;
        lastPointerPosition.x = pointer.x;
        lastPointerPosition.y = pointer.y;
        playGrabSound();
        return;
    }

    // Si hay arma seleccionada, crear arma (máximo 10)
    if (currentWeapon && pointer.y > 100 && pointer.y < game.scale.height - 70) {
        if (weapons.length >= 10) {
            const maxText = sceneRef.add.text(game.scale.width / 2, 80, 'Máx 10 armas', {
                font: 'bold 14px Arial',
                fill: '#FF0000'
            }).setOrigin(0.5);
            sceneRef.tweens.add({
                targets: maxText,
                alpha: 0,
                y: 60,
                duration: 1000,
                onComplete: () => maxText.destroy()
            });
            return;
        }
        // Crear arma según tipo
        const weaponCreators = {
            'pistola': createPistola,
            'cuchillo': createCuchillo,
            'granada': createGranada,
            'espada': createEspada,
            'bat': createBat,
            'barril': createBarril,
            'trampolin': createTrampolin,
            'katana': createKatana,
            'motosierra': createMotosierra,
            'arco': createArco,
            'nuke': createNuke,
            'iman': createIman,
            'lanzallamas': createLanzallamas,
            'portal': createPortal,
            'ventilador': createVentilador,
            'hacha': createHacha,
            'martillo': createMartillo,
            'dinamita': createDinamita,
            'laser': createLaser,
            'escudo': createEscudo,
            'boomerang': createBoomerang,
            'piedra': createPiedra,
            'cactus': createCactus,
            'yunque': createYunque
        };

        if (weaponCreators[currentWeapon]) {
            // Verificar si el click está cerca de la mano de un NPC
            let nearestArm = null;
            let nearestRagdoll = null;
            let nearestDist = 60;

            ragdolls.forEach(ragdoll => {
                // Brazos son índices 2 (izquierdo) y 3 (derecho)
                [2, 3].forEach(armIdx => {
                    const arm = ragdoll.parts[armIdx];
                    if (arm && arm.body) {
                        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, arm.x, arm.y);
                        if (dist < nearestDist) {
                            nearestDist = dist;
                            nearestArm = arm;
                            nearestRagdoll = ragdoll;
                        }
                    }
                });
            });

            // Si está cerca de un brazo, darle el arma al NPC
            if (nearestArm && nearestRagdoll) {
                const weapon = weaponCreators[currentWeapon](sceneRef, nearestArm.x, nearestArm.y);
                if (weapon && weapon.body) {
                    // Crear constraint para unir arma al brazo
                    const constraint = sceneRef.matter.add.constraint(nearestArm.body, weapon.body, 5, 0.9, {
                        pointA: { x: 0, y: 10 },
                        pointB: { x: 0, y: 0 }
                    });
                    weapon.heldBy = nearestRagdoll;
                    weapon.heldConstraint = constraint;
                    nearestRagdoll.heldWeapon = weapon;
                    showNotification('🤝 ' + currentWeapon + ' equipada!');
                }
            } else {
                // Colocar arma normalmente
                weaponCreators[currentWeapon](sceneRef, pointer.x, pointer.y);
            }

            playGrabSound();
            // Deseleccionar arma después de colocarla
            currentWeapon = null;
            drawWeaponButton();
        }
        return;
    }

    let closestPart = null;
    let closestDist = isMobile ? 70 : 50;  // Área de detección más grande
    let ownerRagdoll = null;

    ragdolls.forEach(ragdoll => {
        ragdoll.parts.forEach(part => {
            if (part && part.body) {
                const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, part.x, part.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestPart = part;
                    ownerRagdoll = ragdoll;
                }
            }
        });
    });

    if (closestPart && ownerRagdoll) {
        if (ownerRagdoll.isStanding) {
            ownerRagdoll.isStanding = false;
            ownerRagdoll.parts.forEach(part => {
                if (part && part.body) {
                    part.setStatic(false);
                }
            });
        }

        playGrabSound();

        selectedPart = closestPart;
        selectedPart.ownerRagdoll = ownerRagdoll;
        ownerRagdoll.isBeingDragged = true;
        isDragging = true;
        lastPointerPosition.x = pointer.x;
        lastPointerPosition.y = pointer.y;
        velocity = { x: 0, y: 0 };

        selectedPart.setIgnoreGravity(true);
    }
}

function onPointerMove(pointer) {
    if (isDragging && selectedPart) {
        // Calcular velocidad de movimiento del dedo
        velocity.x = (pointer.x - lastPointerPosition.x) * 1.2;
        velocity.y = (pointer.y - lastPointerPosition.y) * 1.2;

        // Fuerza de arrastre mejorada - más suave y responsiva
        const dx = pointer.x - selectedPart.x;
        const dy = pointer.y - selectedPart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Fuerza proporcional a la distancia pero con límite
        const forceMult = Math.min(distance * 0.08, 15);
        const forceX = (dx / (distance || 1)) * forceMult;
        const forceY = (dy / (distance || 1)) * forceMult;

        selectedPart.setVelocity(forceX * 2.5, forceY * 2.5);

        lastPointerPosition.x = pointer.x;
        lastPointerPosition.y = pointer.y;
    }

    // Mover arma
    if (isDraggingWeapon && selectedWeapon && selectedWeapon.body) {
        const moveDistance = Phaser.Math.Distance.Between(
            selectedWeapon.dragStartX, selectedWeapon.dragStartY,
            pointer.x, pointer.y
        );
        if (moveDistance > 10) {
            selectedWeapon.hasMoved = true;
        }

        const forceX = (pointer.x - selectedWeapon.x) * 0.15;
        const forceY = (pointer.y - selectedWeapon.y) * 0.15;
        sceneRef.matter.body.setVelocity(selectedWeapon.body, { x: forceX * 2, y: forceY * 2 });

        lastPointerPosition.x = pointer.x;
        lastPointerPosition.y = pointer.y;
    }
}

function onPointerUp(pointer) {
    if (isDragging && selectedPart) {
        selectedPart.setIgnoreGravity(false);

        if (selectedPart.ownerRagdoll) {
            selectedPart.ownerRagdoll.isBeingDragged = false;
        }

        const throwPower = 1.2; // Mayor poder de lanzamiento
        const throwSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

        if (throwSpeed > 3) {
            playThrowSound(throwSpeed);
            playScream();
        }

        // Lanzamiento más potente y satisfactorio
        selectedPart.setVelocity(
            velocity.x * throwPower,
            velocity.y * throwPower
        );

        selectedPart = null;
        isDragging = false;
    }

    // Soltar arma
    if (isDraggingWeapon && selectedWeapon) {
        // Si no se movió mucho, activar arma
        if (!selectedWeapon.hasMoved) {
            if (selectedWeapon.type === 'pistola') {
                shootBullet(selectedWeapon);
            } else if (selectedWeapon.type === 'barril') {
                explodeBarril(selectedWeapon);
            } else if (selectedWeapon.type === 'arco') {
                shootArrow(selectedWeapon);
            } else if (selectedWeapon.type === 'lanzallamas') {
                selectedWeapon.isFiring = !selectedWeapon.isFiring;
            } else if (selectedWeapon.type === 'motosierra') {
                selectedWeapon.isOn = !selectedWeapon.isOn;
                if (selectedWeapon.isOn) playMotosierraSound();
            } else if (selectedWeapon.type === 'iman') {
                selectedWeapon.isActive = !selectedWeapon.isActive;
            } else if (selectedWeapon.type === 'ventilador') {
                selectedWeapon.isOn = !selectedWeapon.isOn;
            }
        }
        selectedWeapon = null;
        isDraggingWeapon = false;
    }
}

function shootArrow(weapon) {
    const angle = weapon.body.angle;
    const speed = 20;
    const startX = weapon.x + Math.cos(angle) * 25;
    const startY = weapon.y + Math.sin(angle) * 25;

    const arrow = sceneRef.add.graphics();
    arrow.fillStyle(0x8B4513, 1);
    arrow.fillRect(-15, -1, 30, 3);
    arrow.fillStyle(0x888888, 1);
    arrow.fillTriangle(15, -3, 15, 4, 22, 0);
    arrow.setPosition(startX, startY);
    arrow.setRotation(angle);
    arrow.setDepth(15);

    bullets.push({
        graphics: arrow,
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifetime: 180,
        isArrow: true
    });

    playGunSound();
}

function playMotosierraSound() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(150, audioContext.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
}

function explodeBarril(weapon) {
    const explosionX = weapon.x;
    const explosionY = weapon.y;

    // Explosión de fuego
    const explosion = sceneRef.add.graphics();
    explosion.setDepth(50);
    explosion.fillStyle(0xFF0000, 0.9);
    explosion.fillCircle(explosionX, explosionY, 40);
    explosion.fillStyle(0xFF6600, 0.7);
    explosion.fillCircle(explosionX, explosionY, 60);
    explosion.fillStyle(0xFFFF00, 0.5);
    explosion.fillCircle(explosionX, explosionY, 80);

    sceneRef.tweens.add({
        targets: explosion,
        alpha: 0,
        scale: 2.5,
        duration: 500,
        onComplete: () => explosion.destroy()
    });

    playExplosionSound();

    // Empujar todo con mucha fuerza
    const radius = 180;
    const force = 35;

    ragdolls.forEach(ragdoll => {
        ragdoll.parts.forEach(part => {
            if (part && part.body) {
                const dist = Phaser.Math.Distance.Between(explosionX, explosionY, part.x, part.y);
                if (dist < radius) {
                    const angle = Math.atan2(part.y - explosionY, part.x - explosionX);
                    const f = (1 - dist / radius) * force;
                    part.setVelocity(Math.cos(angle) * f, Math.sin(angle) * f - 10);

                    if (ragdoll.isStanding) {
                        ragdoll.isStanding = false;
                        ragdoll.parts.forEach(p => p && p.body && p.setStatic(false));
                    }
                }
            }
        });
    });

    // También empujar otras armas
    weapons.forEach(w => {
        if (w !== weapon && w.body) {
            const dist = Phaser.Math.Distance.Between(explosionX, explosionY, w.x, w.y);
            if (dist < radius) {
                const angle = Math.atan2(w.y - explosionY, w.x - explosionX);
                const f = (1 - dist / radius) * force;
                sceneRef.matter.body.setVelocity(w.body, {
                    x: Math.cos(angle) * f,
                    y: Math.sin(angle) * f - 10
                });
            }
        }
    });

    spawnBlood(explosionX, explosionY, 25);

    // Eliminar barril
    if (weapon.graphics) weapon.graphics.destroy();
    if (weapon.body) sceneRef.matter.world.remove(weapon.body);
    const idx = weapons.indexOf(weapon);
    if (idx > -1) weapons.splice(idx, 1);
}

let clouds = [];
let sun;

const sunX = 60;
const sunY = 60;
const sunBurnDistance = 80; // Distancia para quemarse
let lastBurnTime = 0;

function createSky(scene) {
    // Sol en esquina superior izquierda
    sun = scene.add.graphics();
    sun.setDepth(-10);

    // Círculo principal del sol
    sun.fillStyle(0xFFDD00, 1);
    sun.fillCircle(sunX, sunY, 40);

    // Brillo alrededor
    sun.fillStyle(0xFFEE44, 0.5);
    sun.fillCircle(sunX, sunY, 50);

    // Rayos
    sun.lineStyle(3, 0xFFDD00, 0.7);
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x1 = sunX + Math.cos(angle) * 55;
        const y1 = sunY + Math.sin(angle) * 55;
        const x2 = sunX + Math.cos(angle) * 70;
        const y2 = sunY + Math.sin(angle) * 70;
        sun.lineBetween(x1, y1, x2, y2);
    }

    // Crear nubes (menos en móvil)
    createCloud(scene, 100, 50, 1.2);
    createCloud(scene, 300, 80, 0.8);
    createCloud(scene, 500, 40, 1.0);
    if (!isLowPerf) {
        createCloud(scene, 150, 100, 0.6);
        createCloud(scene, 600, 90, 0.9);
    }
}

function createCloud(scene, x, y, scale) {
    const cloud = scene.add.graphics();
    cloud.setDepth(-5);

    // Dibujar nube esponjosa
    cloud.fillStyle(0xFFFFFF, 0.9);

    // Múltiples círculos para forma de nube
    cloud.fillCircle(0, 0, 25 * scale);
    cloud.fillCircle(25 * scale, -5, 20 * scale);
    cloud.fillCircle(-25 * scale, 0, 18 * scale);
    cloud.fillCircle(15 * scale, 10, 22 * scale);
    cloud.fillCircle(-15 * scale, 8, 20 * scale);
    cloud.fillCircle(40 * scale, 5, 15 * scale);
    cloud.fillCircle(-35 * scale, 5, 12 * scale);

    // Sombra sutil
    cloud.fillStyle(0xDDDDDD, 0.5);
    cloud.fillCircle(5 * scale, 15 * scale, 18 * scale);
    cloud.fillCircle(-10 * scale, 12 * scale, 15 * scale);

    cloud.setPosition(x, y);

    clouds.push({
        graphics: cloud,
        x: x,
        y: y,
        speed: 0.2 + Math.random() * 0.3,
        scale: scale
    });
}

function updateClouds() {
    clouds.forEach(cloud => {
        cloud.x += cloud.speed;

        // Regresar al inicio cuando sale de pantalla
        if (cloud.x > 900) {
            cloud.x = -100;
        }

        cloud.graphics.setPosition(cloud.x, cloud.y);
    });
}

function checkSunBurn() {
    const now = Date.now();
    if (now - lastBurnTime < 500) return; // Cooldown de 500ms

    ragdolls.forEach(ragdoll => {
        ragdoll.parts.forEach(part => {
            if (part && part.body) {
                const dist = Phaser.Math.Distance.Between(part.x, part.y, sunX, sunY);

                if (dist < sunBurnDistance) {
                    lastBurnTime = now;

                    // Mostrar texto
                    const texts = ['Ouch!', 'Hot!', '¡Ay!', '¡Quema!'];
                    const text = texts[Math.floor(Math.random() * texts.length)];

                    const burnText = sceneRef.add.text(part.x, part.y - 20, text, {
                        font: 'bold 16px Arial',
                        fill: '#FF4400',
                        stroke: '#FFFFFF',
                        strokeThickness: 3
                    });
                    burnText.setOrigin(0.5);
                    burnText.setDepth(100);

                    // Animar y destruir texto
                    sceneRef.tweens.add({
                        targets: burnText,
                        y: burnText.y - 40,
                        alpha: 0,
                        duration: 800,
                        ease: 'Power2',
                        onComplete: () => burnText.destroy()
                    });

                    // Sonido de quemadura
                    playBurnSound();

                    // Empujar al ragdoll lejos del sol
                    const angle = Math.atan2(part.y - sunY, part.x - sunX);
                    part.setVelocity(
                        Math.cos(angle) * 8,
                        Math.abs(Math.sin(angle)) * 5 + 3
                    );
                }
            }
        });
    });
}

function playBurnSound() {
    if (!audioContext) return;
    try {
        const now = audioContext.currentTime;

        // Sonido de "sizzle"
        const bufferSize = audioContext.sampleRate * 0.3;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        const filter = audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 5;

        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);

        source.start(now);
    } catch (e) {}
}

// Dibujar cangrejo decorativo (fondo - NPCs no lo tocan)
function drawCrab(graphics, x, y, color, scale = 1) {
    const s = scale;
    // Cuerpo
    graphics.fillStyle(color, 1);
    graphics.fillEllipse(x, y, 12 * s, 8 * s);
    // Ojos (pequeños palitos con bolitas)
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(x - 5 * s, y - 8 * s, 2 * s);
    graphics.fillCircle(x + 5 * s, y - 8 * s, 2 * s);
    // Palitos de ojos
    graphics.lineStyle(1.5 * s, color, 1);
    graphics.lineBetween(x - 4 * s, y - 3 * s, x - 5 * s, y - 7 * s);
    graphics.lineBetween(x + 4 * s, y - 3 * s, x + 5 * s, y - 7 * s);
    // Pinzas (animadas)
    const pinzaAnim = Math.sin(Date.now()/300) * 0.3;
    graphics.fillStyle(color, 1);
    graphics.fillEllipse(x - 18 * s, y - 3 * s + pinzaAnim * 2, 8 * s, 5 * s);
    graphics.fillEllipse(x + 18 * s, y - 3 * s - pinzaAnim * 2, 8 * s, 5 * s);
    // Puntas de pinzas
    graphics.lineStyle(2 * s, color, 1);
    graphics.lineBetween(x - 23 * s, y - 5 * s, x - 26 * s, y - 8 * s + pinzaAnim * 3);
    graphics.lineBetween(x - 23 * s, y - 1 * s, x - 26 * s, y + 2 * s - pinzaAnim * 3);
    graphics.lineBetween(x + 23 * s, y - 5 * s, x + 26 * s, y - 8 * s - pinzaAnim * 3);
    graphics.lineBetween(x + 23 * s, y - 1 * s, x + 26 * s, y + 2 * s + pinzaAnim * 3);
    // Patas (6 en cada lado)
    graphics.lineStyle(2 * s, color, 1);
    for (let leg = -1; leg <= 1; leg += 2) {
        for (let i = 0; i < 3; i++) {
            const legX = x + leg * (4 + i * 3) * s;
            const legAnim = Math.sin(Date.now()/150 + i * 0.5) * 2;
            graphics.lineBetween(legX, y + 3 * s, legX + leg * 6 * s, y + 8 * s + legAnim);
        }
    }
}

function createAppleTree(scene, x) {
    const tree = scene.add.graphics();
    tree.setDepth(0);

    const groundY = Math.max(game.scale.height, window.innerHeight) - 55;

    // Tronco
    tree.fillStyle(0x8B4513, 1);
    tree.fillRect(x - 12, groundY - 120, 24, 120);

    // Textura del tronco
    tree.fillStyle(0x654321, 1);
    tree.fillRect(x - 8, groundY - 100, 4, 80);
    tree.fillRect(x + 4, groundY - 90, 3, 60);

    // Copa del árbol (círculos verdes)
    tree.fillStyle(0x228B22, 1);
    tree.fillCircle(x, groundY - 150, 50);
    tree.fillCircle(x - 40, groundY - 130, 35);
    tree.fillCircle(x + 40, groundY - 130, 35);
    tree.fillCircle(x - 25, groundY - 170, 30);
    tree.fillCircle(x + 25, groundY - 170, 30);
    tree.fillCircle(x, groundY - 190, 25);

    // Hojas más claras
    tree.fillStyle(0x32CD32, 0.6);
    tree.fillCircle(x - 20, groundY - 140, 20);
    tree.fillCircle(x + 30, groundY - 150, 18);
    tree.fillCircle(x + 10, groundY - 175, 15);

    // Manzanas rojas (no caen, son decorativas)
    tree.fillStyle(0xFF0000, 1);
    const applePositions = [
        { ax: x - 30, ay: groundY - 140 },
        { ax: x + 25, ay: groundY - 135 },
        { ax: x - 10, ay: groundY - 160 },
        { ax: x + 35, ay: groundY - 155 },
        { ax: x - 35, ay: groundY - 165 },
        { ax: x + 5, ay: groundY - 180 },
        { ax: x - 20, ay: groundY - 125 },
        { ax: x + 15, ay: groundY - 145 },
    ];

    applePositions.forEach(pos => {
        // Manzana
        tree.fillStyle(0xFF0000, 1);
        tree.fillCircle(pos.ax, pos.ay, 7);

        // Brillo
        tree.fillStyle(0xFF6666, 1);
        tree.fillCircle(pos.ax - 2, pos.ay - 2, 2);

        // Tallito
        tree.fillStyle(0x8B4513, 1);
        tree.fillRect(pos.ax - 1, pos.ay - 10, 2, 4);

        // Hojita
        tree.fillStyle(0x228B22, 1);
        tree.fillEllipse(pos.ax + 3, pos.ay - 9, 5, 3);
    });

    return tree;
}

function createFlower(scene, x, y, color) {
    const flower = scene.add.graphics();
    flower.setDepth(1);

    // Tallo
    flower.fillStyle(0x228B22, 1);
    flower.fillRect(x - 1, y, 3, 15);

    // Hojas
    flower.fillStyle(0x32CD32, 1);
    flower.fillEllipse(x - 5, y + 8, 8, 4);
    flower.fillEllipse(x + 5, y + 6, 8, 4);

    // Pétalos
    flower.fillStyle(color, 1);
    const petalSize = 5 + Math.random() * 3;
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const px = x + Math.cos(angle) * 6;
        const py = y - 5 + Math.sin(angle) * 6;
        flower.fillCircle(px, py, petalSize);
    }

    // Centro
    flower.fillStyle(0xFFD700, 1);
    flower.fillCircle(x, y - 5, 4);

    return flower;
}

function createGround(scene) {
    // Crear cielo primero
    createSky(scene);

    // USAR dimensiones reales del viewport, no del game.scale
    const w = Math.max(scene.scale.width, window.innerWidth);
    const h = Math.max(scene.scale.height, window.innerHeight);
    const groundY = h - 50;

    console.log('GROUND - w:', w, 'h:', h, 'groundY:', groundY);

    // Guardar referencia al suelo
    groundGraphics = scene.add.graphics();
    groundGraphics.fillStyle(0x4a7c3f, 1);
    groundGraphics.fillRect(0, groundY, w, 50);

    groundGraphics.fillStyle(0x3d6b35, 1);
    for (let x = 0; x < w; x += 20) {
        groundGraphics.fillRect(x, groundY - 5, 10, 5);
    }
    groundGraphics.setDepth(-9);

    // Crear gráficos alternativos de suelo (ocultos inicialmente)
    // Suelo lunar - gris claro
    const lunarGround = scene.add.graphics();
    lunarGround.fillStyle(0xCCCCCC, 1); // Gris claro
    lunarGround.fillRect(0, groundY, w, 50);
    // Cráteres más oscuros
    lunarGround.fillStyle(0x999999, 1);
    for (let x = 50; x < w; x += 100) {
        lunarGround.fillCircle(x, groundY + 10, 15);
        lunarGround.fillCircle(x + 30, groundY + 25, 10);
    }
    lunarGround.setDepth(-9);
    lunarGround.setVisible(false);
    groundGraphics.lunarGround = lunarGround;

    // Suelo de hielo/antártida
    const iceGround = scene.add.graphics();
    iceGround.fillStyle(0xE8F4F8, 1);
    iceGround.fillRect(0, groundY, w, 50);
    // Grietas de hielo
    iceGround.lineStyle(2, 0xAADDEE, 0.6);
    for (let x = 30; x < w; x += 80) {
        iceGround.lineBetween(x, groundY, x + 20, groundY + 30);
        iceGround.lineBetween(x + 20, groundY + 30, x + 40, groundY + 10);
    }
    iceGround.setDepth(-9);
    iceGround.setVisible(false);
    groundGraphics.iceGround = iceGround;

    // Suelo de arena para agua (submarino)
    const sandGround = scene.add.graphics();
    sandGround.fillStyle(0xC2B280, 1);
    sandGround.fillRect(0, groundY, w, 50);
    // Ondulaciones de arena
    sandGround.fillStyle(0xD4C89A, 1);
    for (let x = 0; x < w; x += 40) {
        sandGround.fillEllipse(x + 20, groundY + 5, 25, 8);
    }
    // Conchas y piedras
    sandGround.fillStyle(0xFFE4C4, 1);
    for (let x = 80; x < w; x += 150) {
        sandGround.fillCircle(x, groundY + 15, 5);
    }
    sandGround.setDepth(-9);
    sandGround.setVisible(false);
    groundGraphics.sandGround = sandGround;

    // Suelo de arena para playa (más cálido y con olas)
    const beachGround = scene.add.graphics();
    beachGround.fillStyle(0xF4D03F, 1); // Arena dorada
    beachGround.fillRect(0, groundY, w, 50);
    // Textura de arena
    beachGround.fillStyle(0xE5BE3D, 1);
    for (let x = 0; x < w; x += 30) {
        beachGround.fillEllipse(x + 15, groundY + 3, 20, 6);
    }
    // Conchas decorativas
    beachGround.fillStyle(0xFFF5EE, 1);
    for (let x = 50; x < w * 0.6; x += 120) {
        beachGround.fillCircle(x, groundY + 12, 4);
        beachGround.fillEllipse(x + 30, groundY + 15, 6, 4);
    }
    beachGround.setDepth(-9);
    beachGround.setVisible(false);
    groundGraphics.beachGround = beachGround;

    // Suelo de roca volcánica para lava
    const rockGround = scene.add.graphics();
    rockGround.fillStyle(0x4A4A4A, 1);
    rockGround.fillRect(0, groundY, w, 50);
    // Grietas de lava en la roca
    rockGround.lineStyle(3, 0xFF4400, 0.7);
    for (let x = 50; x < w; x += 100) {
        rockGround.lineBetween(x, groundY + 5, x + 30, groundY + 25);
        rockGround.lineBetween(x + 30, groundY + 25, x + 20, groundY + 45);
    }
    // Rocas irregulares
    rockGround.fillStyle(0x3A3A3A, 1);
    for (let x = 30; x < w; x += 60) {
        rockGround.fillRect(x, groundY - 3, 20, 8);
    }
    rockGround.setDepth(-9);
    rockGround.setVisible(false);
    groundGraphics.rockGround = rockGround;

    // Suelo de desierto (arena naranja/dorada con dunas)
    const desertGround = scene.add.graphics();
    desertGround.fillStyle(0xD2691E, 1); // Arena naranja
    desertGround.fillRect(0, groundY, w, 50);
    // Dunas de arena
    desertGround.fillStyle(0xE2811E, 1);
    for (let x = 0; x < w; x += 80) {
        desertGround.fillEllipse(x + 40, groundY - 5, 50, 15);
    }
    // Textura granulada
    desertGround.fillStyle(0xC2691E, 0.7);
    for (let x = 0; x < w; x += 20) {
        desertGround.fillCircle(x + Math.random() * 15, groundY + 10 + Math.random() * 20, 2);
    }
    // Piedras pequeñas
    desertGround.fillStyle(0x8B4513, 1);
    for (let x = 100; x < w; x += 200) {
        desertGround.fillEllipse(x, groundY + 15, 8, 5);
    }
    desertGround.setDepth(-9);
    desertGround.setVisible(false);
    groundGraphics.desertGround = desertGround;

    // Crear Tierra para mapa lunar (oculta inicialmente)
    earthGraphics = scene.add.graphics();
    earthGraphics.setDepth(-10);
    const earthX = 80;
    const earthY = 80;
    // Océanos
    earthGraphics.fillStyle(0x1E90FF, 1);
    earthGraphics.fillCircle(earthX, earthY, 45);
    // Continentes
    earthGraphics.fillStyle(0x228B22, 1);
    earthGraphics.fillEllipse(earthX - 15, earthY - 10, 25, 20);
    earthGraphics.fillEllipse(earthX + 20, earthY + 5, 20, 30);
    earthGraphics.fillEllipse(earthX - 5, earthY + 20, 15, 12);
    // Nubes
    earthGraphics.fillStyle(0xFFFFFF, 0.6);
    earthGraphics.fillEllipse(earthX - 25, earthY - 20, 20, 8);
    earthGraphics.fillEllipse(earthX + 15, earthY - 25, 15, 6);
    earthGraphics.fillEllipse(earthX + 30, earthY + 15, 18, 7);
    // Brillo atmosférico
    earthGraphics.lineStyle(3, 0x87CEEB, 0.5);
    earthGraphics.strokeCircle(earthX, earthY, 48);
    earthGraphics.setVisible(false);

    // Crear estrellas para mapas nocturnos
    starsGraphics = scene.add.graphics();
    starsGraphics.setDepth(-15);
    for (let i = 0; i < 100; i++) {
        const sx = Math.random() * w;
        const sy = Math.random() * (h - 100);
        const size = Math.random() * 2 + 1;
        starsGraphics.fillStyle(0xFFFFFF, Math.random() * 0.5 + 0.5);
        starsGraphics.fillCircle(sx, sy, size);
    }
    starsGraphics.setVisible(false);

    // Árboles de manzana (guardar referencias)
    treesGraphics.push(createAppleTree(scene, 150));
    treesGraphics.push(createAppleTree(scene, w - 150));

    // Flores decorativas (menos en móvil)
    const flowerColors = [0xFF69B4, 0xFF1493, 0xFFB6C1, 0xFF4500, 0xFFFF00, 0x9370DB, 0x00CED1, 0xFF6347];
    const numFlowers = isLowPerf ? 8 : 20;

    for (let i = 0; i < numFlowers; i++) {
        const fx = 30 + Math.random() * (w - 60);
        const fy = groundY - 15 + Math.random() * 10;
        const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        flowersGraphics.push(createFlower(scene, fx, fy, color));
    }

    // Colisión: suelo y paredes son categoría 0x0001
    const wallOptions = {
        isStatic: true,
        collisionFilter: {
            category: 0x0001,
            mask: 0x0002 | 0x0004  // Colisiona con ragdolls y armas
        }
    };

    // Nota: Los ragdolls ahora SÍ colisionan entre sí (pueden pegarse)

    scene.matter.add.rectangle(w / 2, groundY + 25, w, 50, {
        ...wallOptions,
        friction: 0.3,
        frictionStatic: 0.1,
        restitution: 0.2,
        label: 'ground'
    });

    scene.matter.add.rectangle(-25, h / 2, 50, h, wallOptions);
    scene.matter.add.rectangle(w + 25, h / 2, 50, h, wallOptions);
    scene.matter.add.rectangle(w / 2, -25, w, 50, wallOptions);
}

function createRagdoll(scene, x, y, color, npcType = 'normal') {
    const parts = [];
    const constraints = [];

    ragdollCollisionGroup--;
    const myGroup = ragdollCollisionGroup;

    // Color zombie si estamos en modo zombie
    const isZombie = (currentMap === 'zombie');

    // Colores según tipo de NPC
    let skinColor = 0xFFDBB4; // Piel normal
    let shirtColor = color;
    let pantsColor = 0x333333;

    switch(npcType) {
        case 'ninja':
            skinColor = 0xFFDBB4;
            shirtColor = 0x111111;
            pantsColor = 0x111111;
            break;
        case 'robot':
            skinColor = 0xC0C0C0;
            shirtColor = 0x666666;
            pantsColor = 0x444444;
            break;
        case 'alien':
            skinColor = 0x90EE90;
            shirtColor = 0x4444FF;
            pantsColor = 0x2222AA;
            break;
        case 'pirata':
            skinColor = 0xDEB887;
            shirtColor = 0x8B0000;
            pantsColor = 0x222222;
            break;
        case 'knight':
            skinColor = 0xFFDBB4;
            shirtColor = 0x888888;
            pantsColor = 0x666666;
            break;
        case 'wizard':
            skinColor = 0xFFDBB4;
            shirtColor = 0x4B0082;
            pantsColor = 0x2E0854;
            break;
        case 'demon':
            skinColor = 0xFF4444;
            shirtColor = 0x222222;
            pantsColor = 0x111111;
            break;
        case 'esqueleto':
            skinColor = 0xCCCCBB; // Hueso gris
            shirtColor = 0xAAAAAA; // Costillas gris
            pantsColor = 0x888888; // Huesos piernas oscuro
            break;
    }

    if (isZombie) {
        skinColor = 0x6B8E23;
        shirtColor = 0x4A4A4A;
        pantsColor = 0x2F2F2F;
    }

    const isSkeleton = (npcType === 'esqueleto');
    const isNinja = (npcType === 'ninja');
    const isPirate = (npcType === 'pirata');
    const isClown = (npcType === 'clown');

    const groundY = Math.max(game.scale.height, window.innerHeight) - 50;
    const legHeight = 30;
    const torsoHeight = 36;

    const feetY = groundY - 15;
    const legY = feetY - legHeight/2;
    const torsoY = feetY - legHeight - torsoHeight/2 + 5;
    const headY = torsoY - torsoHeight/2 - 11 + 5;

    // Categorías de colisión:
    // 0x0001 = suelo/paredes
    // 0x0002 = ragdolls
    // Los ragdolls colisionan con suelo Y entre ellos
    const partOptions = {
        friction: 0.4,
        frictionAir: 0.03,
        frictionStatic: 0.1,
        restitution: 0.15,
        collisionFilter: {
            group: myGroup,           // Partes del mismo ragdoll no colisionan entre sí
            category: 0x0002,         // Soy un ragdoll
            mask: 0x0001 | 0x0002 | 0x0004  // Colisiono con suelo, ragdolls y armas
        }
    };

    // Ninja es 25% más ligero (cae más rápido por menos resistencia al aire)
    const densityMult = isNinja ? 0.75 : 1;

    const headTexture = createPartTexture(scene, 'head', 22, 22, skinColor, true, isSkeleton, isNinja, isPirate, isClown);
    const head = scene.matter.add.sprite(x, headY, headTexture, null, {
        ...partOptions,
        shape: { type: 'circle', radius: 11 },
        density: 0.001 * densityMult
    });
    parts.push(head);

    // Párpados para parpadear
    const eyelids = scene.add.graphics();
    eyelids.fillStyle(skinColor, 1);
    eyelids.fillRect(-6, -4, 4, 4);
    eyelids.fillRect(2, -4, 4, 4);
    eyelids.setVisible(false);
    eyelids.setDepth(55);
    head.eyelids = eyelids;

    // Cerebro expuesto si es zombie
    let brainGraphics = null;
    if (isZombie) {
        brainGraphics = scene.add.graphics();
        brainGraphics.setDepth(56);
        // Herida/agujero en el cráneo
        brainGraphics.fillStyle(0x8B0000, 1); // Rojo oscuro (sangre seca)
        brainGraphics.fillEllipse(4, -8, 10, 6);
        // Cerebro rosado expuesto
        brainGraphics.fillStyle(0xFFB6C1, 1); // Rosa cerebro
        brainGraphics.fillCircle(3, -7, 4);
        brainGraphics.fillCircle(6, -8, 3);
        brainGraphics.fillStyle(0xFF9999, 1);
        brainGraphics.fillCircle(4, -9, 2);
        // Líneas del cerebro
        brainGraphics.lineStyle(1, 0xCC8888, 0.8);
        brainGraphics.lineBetween(1, -8, 5, -6);
        brainGraphics.lineBetween(4, -9, 7, -7);
        head.brainGraphics = brainGraphics;
    }

    const torsoTexture = createPartTexture(scene, 'torso', 28, 36, shirtColor, false, isSkeleton, isNinja, isPirate, isClown);
    const torso = scene.matter.add.sprite(x, torsoY, torsoTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 28, height: 36 },
        density: 0.002 * densityMult
    });
    parts.push(torso);

    const armLTexture = createPartTexture(scene, 'armL', 10, 22, skinColor, false, isSkeleton, isNinja, isPirate, isClown);
    const armL = scene.matter.add.sprite(x - 19, torsoY, armLTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 10, height: 22 },
        density: 0.0008 * densityMult
    });
    parts.push(armL);

    const armRTexture = createPartTexture(scene, 'armR', 10, 22, skinColor, false, isSkeleton, isNinja, isPirate, isClown);
    const armR = scene.matter.add.sprite(x + 19, torsoY, armRTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 10, height: 22 },
        density: 0.0008 * densityMult
    });
    parts.push(armR);

    const legLTexture = createPartTexture(scene, 'legL', 12, 30, pantsColor, false, isSkeleton, isNinja, isPirate, isClown);
    const legL = scene.matter.add.sprite(x - 8, legY, legLTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 12, height: 30 },
        density: 0.001 * densityMult
    });
    parts.push(legL);

    const legRTexture = createPartTexture(scene, 'legR', 12, 30, pantsColor, false, isSkeleton, isNinja, isPirate, isClown);
    const legR = scene.matter.add.sprite(x + 8, legY, legRTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 12, height: 30 },
        density: 0.001 * densityMult
    });
    parts.push(legR);

    constraints.push(scene.matter.add.constraint(head, torso, 5, 0.95, {
        pointA: { x: 0, y: 10 },
        pointB: { x: 0, y: -18 }
    }));

    constraints.push(scene.matter.add.constraint(torso, armL, 3, 0.9, {
        pointA: { x: -14, y: -12 },
        pointB: { x: 0, y: -10 }
    }));
    constraints.push(scene.matter.add.constraint(torso, armR, 3, 0.9, {
        pointA: { x: 14, y: -12 },
        pointB: { x: 0, y: -10 }
    }));

    constraints.push(scene.matter.add.constraint(torso, legL, 3, 0.95, {
        pointA: { x: -7, y: 18 },
        pointB: { x: 0, y: -14 }
    }));
    constraints.push(scene.matter.add.constraint(torso, legR, 3, 0.95, {
        pointA: { x: 7, y: 18 },
        pointB: { x: 0, y: -14 }
    }));

    const ragdoll = {
        parts: parts,
        constraints: constraints,
        color: color,
        team: teamColors.indexOf(color),
        isBeingDragged: false,
        isStanding: true,
        collisionGroup: myGroup,
        eyelids: eyelids,
        brainGraphics: brainGraphics,
        isZombie: isZombie,
        lastBlinkTime: Date.now()
    };

    ragdolls.push(ragdoll);
    return ragdoll;
}

function createPartTexture(scene, name, width, height, color, isHead = false, isSkeleton = false, isNinja = false, isPirate = false, isClown = false) {
    const key = name + '_' + color + '_' + Date.now() + '_' + Math.random();
    const graphics = scene.make.graphics({ add: false });

    if (isClown) {
        // PENNYWISE - Payaso de IT
        if (isHead) {
            // Cara blanca de payaso
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillCircle(width/2, height/2, width/2);
            // Pelo rojo a los lados
            graphics.fillStyle(0xFF2200, 1);
            graphics.fillEllipse(2, height/2 - 2, 6, 8);
            graphics.fillEllipse(width - 2, height/2 - 2, 6, 8);
            graphics.fillEllipse(4, height/2 - 6, 5, 6);
            graphics.fillEllipse(width - 4, height/2 - 6, 5, 6);
            // Frente calva
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillEllipse(width/2, 3, 10, 5);
            // Ojos amarillos malvados
            graphics.fillStyle(0xFFFF00, 1);
            graphics.fillEllipse(width/2 - 4, height/2 - 2, 4, 3);
            graphics.fillEllipse(width/2 + 4, height/2 - 2, 4, 3);
            // Pupilas rojas
            graphics.fillStyle(0xFF0000, 1);
            graphics.fillCircle(width/2 - 4, height/2 - 2, 1.5);
            graphics.fillCircle(width/2 + 4, height/2 - 2, 1.5);
            // Nariz roja
            graphics.fillStyle(0xFF0000, 1);
            graphics.fillCircle(width/2, height/2 + 2, 3);
            // Sonrisa siniestra roja
            graphics.fillStyle(0xCC0000, 1);
            graphics.fillRect(width/2 - 6, height/2 + 6, 12, 3);
            // Líneas rojas de la boca hacia arriba
            graphics.lineStyle(2, 0xCC0000, 1);
            graphics.lineBetween(width/2 - 6, height/2 + 6, width/2 - 8, height/2 + 2);
            graphics.lineBetween(width/2 + 6, height/2 + 6, width/2 + 8, height/2 + 2);
        } else if (name === 'torso') {
            // Traje de payaso gris con pompones rojos
            graphics.fillStyle(0x888888, 1);
            graphics.fillRoundedRect(0, 0, width, height, 3);
            // Pompones rojos
            graphics.fillStyle(0xFF0000, 1);
            graphics.fillCircle(width/2, 6, 4);
            graphics.fillCircle(width/2, 16, 4);
            graphics.fillCircle(width/2, 26, 4);
            // Cuello con volantes
            graphics.fillStyle(0xCCCCCC, 1);
            graphics.fillEllipse(width/2, 2, width - 4, 6);
        } else {
            // Pantalones/brazos grises
            graphics.fillStyle(0x666666, 1);
            graphics.fillRoundedRect(0, 0, width, height, 3);
        }
    } else if (isPirate) {
        // JACK SPARROW - Pirata
        if (isHead) {
            // Cara bronceada
            graphics.fillStyle(0xDEB887, 1);
            graphics.fillCircle(width/2, height/2, width/2);
            // Bandana roja
            graphics.fillStyle(0x8B0000, 1);
            graphics.fillRect(0, 0, width, 6);
            graphics.fillEllipse(width/2, 3, width, 6);
            // Pelo negro con rastas
            graphics.fillStyle(0x1a1a1a, 1);
            graphics.fillEllipse(1, height/2 + 2, 4, 10);
            graphics.fillEllipse(width - 1, height/2 + 2, 4, 10);
            graphics.fillEllipse(3, height/2 + 4, 3, 8);
            graphics.fillEllipse(width - 3, height/2 + 4, 3, 8);
            // Ojos con delineador
            graphics.fillStyle(0x000000, 1);
            graphics.fillEllipse(width/2 - 4, height/2 - 1, 4, 3);
            graphics.fillEllipse(width/2 + 4, height/2 - 1, 4, 3);
            graphics.fillStyle(0x4a3728, 1);
            graphics.fillCircle(width/2 - 4, height/2 - 1, 1.5);
            graphics.fillCircle(width/2 + 4, height/2 - 1, 1.5);
            // Barba y bigote
            graphics.fillStyle(0x1a1a1a, 1);
            graphics.fillRect(width/2 - 2, height/2 + 4, 4, 2); // bigote
            graphics.fillEllipse(width/2, height/2 + 8, 6, 4); // barba
            // Perilla con cuentas
            graphics.fillStyle(0x1a1a1a, 1);
            graphics.fillRect(width/2 - 1, height/2 + 10, 2, 3);
        } else if (name === 'torso') {
            // Camisa blanca abierta con chaleco
            graphics.fillStyle(0xF5F5DC, 1); // Camisa beige
            graphics.fillRoundedRect(0, 0, width, height, 3);
            // Chaleco marrón
            graphics.fillStyle(0x4a3728, 1);
            graphics.fillRoundedRect(0, 0, 8, height, 2);
            graphics.fillRoundedRect(width - 8, 0, 8, height, 2);
            // Cinturón con hebilla
            graphics.fillStyle(0x2a1a0a, 1);
            graphics.fillRect(0, height - 8, width, 6);
            graphics.fillStyle(0xFFD700, 1);
            graphics.fillRect(width/2 - 3, height - 7, 6, 4);
        } else {
            // Pantalones/brazos marrones
            graphics.fillStyle(0x3a2a1a, 1);
            graphics.fillRoundedRect(0, 0, width, height, 3);
            // Botas en piernas
            if (name.includes('leg')) {
                graphics.fillStyle(0x1a1a0a, 1);
                graphics.fillRoundedRect(0, height - 10, width, 10, 2);
            }
        }
    } else if (isSkeleton) {
        // Dibujar huesos de esqueleto
        const boneColor = 0xF5F5DC; // Hueso beige
        const darkBone = 0xCCCCBB; // Sombra del hueso

        if (isHead) {
            // Calavera
            graphics.fillStyle(boneColor, 1);
            graphics.fillCircle(width/2, height/2, width/2);
            // Cuencas de los ojos (negras y grandes)
            graphics.fillStyle(0x000000, 1);
            graphics.fillEllipse(width/2 - 4, height/2 - 2, 5, 6);
            graphics.fillEllipse(width/2 + 4, height/2 - 2, 5, 6);
            // Agujero de la nariz
            graphics.fillTriangle(width/2, height/2 + 2, width/2 - 2, height/2 + 5, width/2 + 2, height/2 + 5);
            // Dientes
            graphics.fillStyle(boneColor, 1);
            graphics.fillRect(width/2 - 5, height/2 + 6, 10, 4);
            graphics.lineStyle(1, 0x000000, 1);
            for (let i = 0; i < 5; i++) {
                graphics.lineBetween(width/2 - 4 + i*2, height/2 + 6, width/2 - 4 + i*2, height/2 + 10);
            }
        } else if (name === 'torso') {
            // Costillas
            graphics.fillStyle(boneColor, 1);
            // Columna vertebral
            graphics.fillRect(width/2 - 2, 0, 4, height);
            // Costillas
            for (let i = 0; i < 5; i++) {
                const y = 4 + i * 7;
                graphics.fillEllipse(width/2 - 8, y, 12, 3);
                graphics.fillEllipse(width/2 + 8, y, 12, 3);
            }
            // Líneas de sombra
            graphics.lineStyle(1, darkBone, 0.5);
            graphics.strokeRect(width/2 - 2, 0, 4, height);
        } else {
            // Huesos de brazos/piernas
            graphics.fillStyle(boneColor, 1);
            // Hueso con extremos redondeados
            graphics.fillRoundedRect(width/4, 0, width/2, height, 3);
            // Extremos del hueso (más anchos)
            graphics.fillEllipse(width/2, 3, width - 2, 6);
            graphics.fillEllipse(width/2, height - 3, width - 2, 6);
            // Sombra
            graphics.lineStyle(1, darkBone, 0.5);
            graphics.strokeRoundedRect(width/4, 0, width/2, height, 3);
        }
    } else if (isNinja) {
        // Dibujar ninja con máscara
        if (isHead) {
            // Cabeza con máscara ninja negra
            graphics.fillStyle(0x111111, 1); // Negro máscara
            graphics.fillCircle(width/2, height/2, width/2);
            // Banda blanca en la frente
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillRect(0, height/2 - 6, width, 4);
            // Colas de la banda blancas
            graphics.fillTriangle(width + 2, height/2 - 6, width + 8, height/2 - 8, width + 6, height/2 - 2);
            graphics.fillTriangle(width + 2, height/2 - 2, width + 10, height/2, width + 8, height/2 + 4);
            // Solo los ojos visibles (blancos con pupila)
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillEllipse(width/2 - 4, height/2, 5, 3);
            graphics.fillEllipse(width/2 + 4, height/2, 5, 3);
            // Pupilas
            graphics.fillStyle(0x000000, 1);
            graphics.fillCircle(width/2 - 4, height/2, 1.5);
            graphics.fillCircle(width/2 + 4, height/2, 1.5);
        } else if (name === 'torso') {
            // Traje ninja negro con cinturón
            graphics.fillStyle(0x111111, 1);
            graphics.fillRoundedRect(0, 0, width, height, 3);
            // Cinturón blanco
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillRect(0, height/2 - 3, width, 6);
            // Línea del traje
            graphics.lineStyle(1, 0x222222, 1);
            graphics.lineBetween(width/2, 0, width/2, height/2 - 3);
        } else {
            // Brazos/piernas ninja negros
            graphics.fillStyle(0x111111, 1);
            graphics.fillRoundedRect(0, 0, width, height, 3);
            // Vendas blancas
            graphics.lineStyle(2, 0xFFFFFF, 0.7);
            for (let i = 0; i < 3; i++) {
                const y = 5 + i * (height / 3);
                graphics.lineBetween(0, y, width, y + 3);
            }
        }
    } else if (isHead) {
        graphics.fillStyle(color, 1);
        graphics.fillCircle(width/2, height/2, width/2);
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(width/2 - 4, height/2 - 2, 2);
        graphics.fillCircle(width/2 + 4, height/2 - 2, 2);
        graphics.fillRect(width/2 - 3, height/2 + 5, 6, 2);
    } else {
        graphics.fillStyle(color, 1);
        graphics.fillRoundedRect(0, 0, width, height, 3);
        graphics.lineStyle(1, 0x000000, 0.2);
        graphics.strokeRoundedRect(0, 0, width, height, 3);
    }

    graphics.generateTexture(key, width, height);
    graphics.destroy();
    return key;
}

function createUI(scene) {
    const btnSize = isMobile ? 50 : 45;
    const margin = 8;
    const topY = margin;
    const screenW = game.scale.width;

    // === BARRA SUPERIOR DERECHA (horizontal, compacta) ===
    // Orden de derecha a izquierda: [X] [Color] [+]

    // Botón limpiar (X) - más a la derecha
    const clearX = screenW - margin - btnSize;
    const clearButton = scene.add.graphics();
    clearButton.fillStyle(0xAA4444, 1);
    clearButton.fillRoundedRect(clearX, topY, btnSize, btnSize, 8);
    clearButton.fillStyle(0xFFFFFF, 1);
    // Dibujar X
    clearButton.lineStyle(4, 0xFFFFFF, 1);
    clearButton.lineBetween(clearX + 12, topY + 12, clearX + btnSize - 12, topY + btnSize - 12);
    clearButton.lineBetween(clearX + btnSize - 12, topY + 12, clearX + 12, topY + btnSize - 12);

    const clearZone = scene.add.zone(clearX + btnSize/2, topY + btnSize/2, btnSize, btnSize);
    clearZone.setInteractive();
    clearZone.on('pointerdown', () => {
        bloodParticles.forEach(blood => blood.graphics.destroy());
        bloodParticles = [];
        ragdolls.forEach(ragdoll => {
            ragdoll.constraints.forEach(c => {
                if (c) sceneRef.matter.world.removeConstraint(c);
            });
            ragdoll.parts.forEach(p => {
                if (p) p.destroy();
            });
            if (ragdoll.eyelids) ragdoll.eyelids.destroy();
            if (ragdoll.brainGraphics) ragdoll.brainGraphics.destroy();
        });
        ragdolls = [];
        weapons.forEach(w => {
            if (w.graphics) w.graphics.destroy();
            if (w.body) sceneRef.matter.world.remove(w.body);
        });
        weapons = [];
        currentWeapon = null;
        drawWeaponButton();
    });

    // Botón equipo (color) - segundo desde la derecha
    const teamX = clearX - margin - btnSize;
    teamButton = scene.add.graphics();
    drawTeamButton(teamButton, teamColors[currentTeam], teamX, topY, btnSize);

    const teamZone = scene.add.zone(teamX + btnSize/2, topY + btnSize/2, btnSize, btnSize);
    teamZone.setInteractive();
    teamZone.on('pointerdown', () => {
        currentTeam = (currentTeam + 1) % 4;
        teamButton.clear();
        drawTeamButton(teamButton, teamColors[currentTeam], teamX, topY, btnSize);
    });

    // Botón de NPCs (antes era +, ahora muestra menú de NPCs desbloqueados)
    const spawnX = teamX - margin - btnSize;
    npcButton = scene.add.graphics();
    npcButton.setDepth(100);
    drawNpcButton(spawnX, topY, btnSize);

    const spawnZone = scene.add.zone(spawnX + btnSize/2, topY + btnSize/2, btnSize, btnSize);
    spawnZone.setInteractive();
    spawnZone.setDepth(100);
    spawnZone.on('pointerdown', () => {
        toggleNpcMenu();
    });

    // Menú de NPCs
    const npcMenuX = spawnX + btnSize/2;
    const npcMenuY = topY + btnSize + 5;
    npcMenu = scene.add.container(npcMenuX, npcMenuY);
    npcMenu.setDepth(101);
    npcMenu.setVisible(false);
    createNpcMenu(scene, npcMenu);

    // Botón de armas - cuarto desde la derecha
    const weaponX = spawnX - margin - btnSize;
    weaponButton = scene.add.graphics();
    weaponButton.setDepth(100);
    drawWeaponButton(weaponX, topY, btnSize);

    const weaponZone = scene.add.zone(weaponX + btnSize/2, topY + btnSize/2, btnSize, btnSize);
    weaponZone.setInteractive();
    weaponZone.setDepth(100);
    weaponZone.on('pointerdown', () => {
        toggleWeaponMenu();
    });

    // === BOTÓN MÚSICA (abajo izquierda, más pequeño) ===
    musicButton = scene.add.graphics();
    musicButton.setDepth(100);
    updateMusicButton();

    const musicBtnSize = isMobile ? 50 : 45;
    const musicBtnX = margin + musicBtnSize/2;
    const musicBtnY = game.scale.height - margin - musicBtnSize/2;
    const musicZone = scene.add.zone(musicBtnX, musicBtnY, musicBtnSize + 10, musicBtnSize + 10);
    musicZone.setInteractive();
    musicZone.setDepth(100);
    musicZone.on('pointerdown', (pointer) => {
        pointer.event.stopPropagation();
        toggleMusic();
    });

    // Menú de armas (dinámico - solo muestra armas desbloqueadas)
    const menuX = weaponX + btnSize/2;
    const menuY = topY + btnSize + 5;
    weaponMenu = scene.add.container(menuX, menuY);
    weaponMenu.setDepth(101);
    weaponMenu.setVisible(false);

    // === BOTÓN DE MAPA (izquierda del botón de armas) ===
    const mapX = weaponX - margin - btnSize;
    mapButton = scene.add.graphics();
    mapButton.setDepth(100);
    mapButton.fillStyle(0x8B4513, 1);
    mapButton.fillRoundedRect(mapX, topY, btnSize, btnSize, 8);
    mapButton.fillStyle(0xFFFFFF, 1);
    const mapIcon = scene.add.text(mapX + btnSize/2, topY + btnSize/2, '🗺️', {
        font: '24px Arial'
    }).setOrigin(0.5).setDepth(100);

    const mapZone = scene.add.zone(mapX + btnSize/2, topY + btnSize/2, btnSize, btnSize);
    mapZone.setInteractive();
    mapZone.setDepth(100);
    mapZone.on('pointerdown', () => toggleMapMenu());

    // Menú de mapas (dinámico - solo muestra mapas desbloqueados)
    const mapMenuX = mapX + btnSize/2;
    const mapMenuY = topY + btnSize + 5;
    mapMenu = scene.add.container(mapMenuX, mapMenuY);
    mapMenu.setDepth(101);
    mapMenu.setVisible(false);

    // === BOTÓN DE CÁMARA LENTA (abajo derecha) ===
    slowMotionButton = scene.add.graphics();
    slowMotionButton.setDepth(100);
    const slowX = game.scale.width - margin - btnSize;
    const slowY = game.scale.height - margin - btnSize;
    drawSlowMotionButton(slowX, slowY, btnSize);

    const slowZone = scene.add.zone(slowX + btnSize/2, slowY + btnSize/2, btnSize, btnSize);
    slowZone.setInteractive();
    slowZone.setDepth(100);
    slowZone.on('pointerdown', () => toggleSlowMotion());

    // === BOTÓN DE SALIR (arriba izquierda) ===
    const exitX = margin;
    const exitButton = scene.add.graphics();
    exitButton.setDepth(100);
    exitButton.fillStyle(0x9B59B6, 1);
    exitButton.fillRoundedRect(exitX, topY, btnSize, btnSize, 8);
    const exitIcon = scene.add.text(exitX + btnSize/2, topY + btnSize/2, '☰', {
        font: 'bold 24px Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5).setDepth(100);

    const exitZone = scene.add.zone(exitX + btnSize/2, topY + btnSize/2, btnSize, btnSize);
    exitZone.setInteractive();
    exitZone.setDepth(100);
    exitZone.on('pointerdown', () => toggleExitMenu());

    // === INDICADOR DE MAYHEMS (junto al botón de salir) ===
    mayhemsText = scene.add.text(exitX + btnSize + 10, topY + btnSize/2, '💎 ' + mayhems, {
        font: 'bold 16px Arial',
        fill: '#FFD700',
        stroke: '#000000',
        strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(100);

    // === MENÚ DE SALIR ===
    const exitMenuX = exitX + btnSize/2;
    const exitMenuY = topY + btnSize + 5;
    exitMenu = scene.add.container(exitMenuX, exitMenuY);
    exitMenu.setDepth(150);
    exitMenu.setVisible(false);

    const exitMenuW = 180;
    const exitMenuH = 110;
    const exitMenuBg = scene.add.graphics();
    exitMenuBg.fillStyle(0x2C3E50, 0.98);
    exitMenuBg.fillRoundedRect(0, 0, exitMenuW, exitMenuH, 10);
    exitMenu.add(exitMenuBg);

    // Botón Tienda
    const shopBtn = scene.add.graphics();
    shopBtn.fillStyle(0x27AE60, 1);
    shopBtn.fillRoundedRect(10, 10, exitMenuW - 20, 40, 8);
    exitMenu.add(shopBtn);
    const shopTxt = scene.add.text(exitMenuW/2, 30, '🛒 Tienda', {
        font: 'bold 18px Arial', fill: '#FFFFFF'
    }).setOrigin(0.5);
    exitMenu.add(shopTxt);
    const shopRect = scene.add.rectangle(exitMenuW/2, 30, exitMenuW - 20, 40, 0x000000, 0);
    shopRect.setInteractive();
    exitMenu.add(shopRect);
    shopRect.on('pointerdown', () => {
        exitMenu.setVisible(false);
        exitMenuOpen = false;
        openShop();
    });

    // Botón Creador
    const creatorBtn = scene.add.graphics();
    creatorBtn.fillStyle(0x3498DB, 1);
    creatorBtn.fillRoundedRect(10, 60, exitMenuW - 20, 40, 8);
    exitMenu.add(creatorBtn);
    const creatorTxt = scene.add.text(exitMenuW/2, 80, '🎨 Creador + AI', {
        font: 'bold 18px Arial', fill: '#FFFFFF'
    }).setOrigin(0.5);
    exitMenu.add(creatorTxt);
    const creatorRect = scene.add.rectangle(exitMenuW/2, 80, exitMenuW - 20, 40, 0x000000, 0);
    creatorRect.setInteractive();
    exitMenu.add(creatorRect);
    creatorRect.on('pointerdown', () => {
        exitMenu.setVisible(false);
        exitMenuOpen = false;
        openCreator();
    });

    // === MENÚ DE TIENDA (pantalla completa) ===
    createShopMenu(scene);

    // === MENÚ DE CREADOR (pantalla completa) ===
    createCreatorMenu(scene);
}

// Posición del botón de armas (se actualiza en createUI)
let weaponBtnPos = { x: 0, y: 0, size: 50 };

function drawWeaponButton(x, y, size) {
    // Guardar posición si se pasa
    if (x !== undefined) {
        weaponBtnPos = { x, y, size };
    }
    const { x: bx, y: by, size: bs } = weaponBtnPos;

    weaponButton.clear();
    weaponButton.fillStyle(0x666666, 1);
    weaponButton.fillRoundedRect(bx, by, bs, bs, 8);

    weaponButton.fillStyle(0xFFFFFF, 1);

    // Mostrar emoji del arma actual
    const weaponEmojis = {
        'pistola': '🔫',
        'cuchillo': '🔪',
        'granada': '💣',
        'espada': '🗡️',
        'bat': '🏏',
        'barril': '🛢️',
        'trampolin': '🛝'
    };

    if (currentWeapon && weaponEmojis[currentWeapon]) {
        if (!weaponButton.emojiText) {
            weaponButton.emojiText = sceneRef.add.text(bx + bs/2, by + bs/2, '', {
                font: '24px Arial'
            }).setOrigin(0.5).setDepth(101);
        }
        weaponButton.emojiText.setText(weaponEmojis[currentWeapon]);
        weaponButton.emojiText.setPosition(bx + bs/2, by + bs/2);
    } else {
        if (weaponButton.emojiText) {
            weaponButton.emojiText.setText('⚔️');
        }
        // Dibujar icono genérico
        weaponButton.fillRect(bx + 10, by + bs/2 - 3, 15, 6);
        weaponButton.fillRect(bx + 8, by + bs/2 + 3, 8, 10);
        weaponButton.fillStyle(0x888888, 1);
        weaponButton.fillRect(bx + 25, by + bs/2 - 2, 12, 4);
    }
}

function toggleWeaponMenu() {
    weaponMenuOpen = !weaponMenuOpen;
    weaponMenu.setVisible(weaponMenuOpen);

    // Actualizar menú con armas desbloqueadas
    if (weaponMenuOpen) {
        updateWeaponMenu();
    }

    if (mapMenuOpen) {
        mapMenu.setVisible(false);
        mapMenuOpen = false;
    }
    if (npcMenuOpen) {
        npcMenu.setVisible(false);
        npcMenuOpen = false;
    }
}

function updateWeaponMenu() {
    if (!weaponMenu) return;
    weaponMenu.removeAll(true);

    // Solo mostrar armas desbloqueadas
    const unlockedWeapons = shopItems.weapons.filter(weapon => unlockedItems.weapons.includes(weapon.id));

    const cols = 4;
    const itemW = 60;
    const itemH = 50;
    const menuW = cols * itemW + 10;
    const menuH = Math.ceil(unlockedWeapons.length / cols) * itemH + 10;

    const menuBg = sceneRef.add.graphics();
    menuBg.fillStyle(0x333333, 0.95);
    menuBg.fillRoundedRect(-menuW/2, 0, menuW, menuH, 8);
    weaponMenu.add(menuBg);

    unlockedWeapons.forEach((weapon, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = -menuW/2 + 5 + col * itemW;
        const by = 5 + row * itemH;

        const isSelected = currentWeapon === weapon.id;

        const btn = sceneRef.add.graphics();
        btn.fillStyle(isSelected ? 0x666666 : 0x555555, 1);
        btn.fillRoundedRect(bx, by, itemW - 5, itemH - 5, 6);
        weaponMenu.add(btn);

        const txt = sceneRef.add.text(bx + (itemW-5)/2, by + (itemH-5)/2, weapon.emoji, {
            font: '22px Arial'
        }).setOrigin(0.5);
        weaponMenu.add(txt);

        const zoneGraphic = sceneRef.add.rectangle(bx + (itemW-5)/2, by + (itemH-5)/2, itemW-5, itemH-5, 0x000000, 0);
        zoneGraphic.setInteractive();
        weaponMenu.add(zoneGraphic);
        zoneGraphic.on('pointerdown', () => {
            currentWeapon = weapon.id;
            weaponMenu.setVisible(false);
            weaponMenuOpen = false;
            drawWeaponButton();
        });
    });
}

function toggleMapMenu() {
    mapMenuOpen = !mapMenuOpen;
    mapMenu.setVisible(mapMenuOpen);

    // Actualizar menú con mapas desbloqueados
    if (mapMenuOpen) {
        updateMapMenu();
    }

    if (weaponMenuOpen) {
        weaponMenu.setVisible(false);
        weaponMenuOpen = false;
    }
    if (npcMenuOpen) {
        npcMenu.setVisible(false);
        npcMenuOpen = false;
    }
}

function updateMapMenu() {
    if (!mapMenu) return;
    mapMenu.removeAll(true);

    // Solo mostrar mapas desbloqueados
    const unlockedMaps = shopItems.worlds.filter(world => unlockedItems.worlds.includes(world.id));

    const cols = 5;
    const itemW = 50;
    const itemH = 40;
    const menuW = cols * itemW + 10;
    const menuH = Math.ceil(unlockedMaps.length / cols) * itemH + 10;

    const menuBg = sceneRef.add.graphics();
    menuBg.fillStyle(0x333333, 0.95);
    menuBg.fillRoundedRect(-menuW/2, 0, menuW, menuH, 8);
    mapMenu.add(menuBg);

    unlockedMaps.forEach((map, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = -menuW/2 + 5 + col * itemW;
        const by = 5 + row * itemH;

        const isSelected = currentMap === map.id;

        const btn = sceneRef.add.graphics();
        btn.fillStyle(isSelected ? 0x8B4513 : 0x555555, 1);
        btn.fillRoundedRect(bx, by, itemW - 5, itemH - 5, 6);
        mapMenu.add(btn);

        const txt = sceneRef.add.text(bx + (itemW-5)/2, by + (itemH-5)/2, map.emoji, {
            font: '18px Arial'
        }).setOrigin(0.5);
        mapMenu.add(txt);

        const zoneGraphic = sceneRef.add.rectangle(bx + (itemW-5)/2, by + (itemH-5)/2, itemW-5, itemH-5, 0x000000, 0);
        zoneGraphic.setInteractive();
        mapMenu.add(zoneGraphic);
        zoneGraphic.on('pointerdown', () => {
            changeMap(map.id);
            mapMenu.setVisible(false);
            mapMenuOpen = false;
        });
    });
}

// === NPC MENU FUNCTIONS ===
let npcBtnPos = { x: 0, y: 0, size: 50 };

function drawNpcButton(x, y, size) {
    if (x !== undefined) npcBtnPos = { x, y, size };
    const { x: bx, y: by, size: bs } = npcBtnPos;

    npcButton.clear();
    npcButton.fillStyle(0x44AA44, 1);
    npcButton.fillRoundedRect(bx, by, bs, bs, 8);

    // Mostrar emoji del NPC actual
    const npcEmojis = {
        'normal': '🧑',
        'ninja': '🥷',
        'robot': '🤖',
        'alien': '👽',
        'pirata': '🏴‍☠️',
        'knight': '🛡️',
        'wizard': '🧙',
        'demon': '👹'
    };

    if (!npcButton.emojiText) {
        npcButton.emojiText = sceneRef.add.text(bx + bs/2, by + bs/2, npcEmojis[currentNpcType] || '🧑', {
            font: '24px Arial'
        }).setOrigin(0.5).setDepth(101);
    } else {
        npcButton.emojiText.setText(npcEmojis[currentNpcType] || '🧑');
        npcButton.emojiText.setPosition(bx + bs/2, by + bs/2);
    }
}

function toggleNpcMenu() {
    npcMenuOpen = !npcMenuOpen;
    npcMenu.setVisible(npcMenuOpen);

    // Actualizar menú con NPCs desbloqueados
    if (npcMenuOpen) {
        updateNpcMenu();
    }

    if (weaponMenuOpen) {
        weaponMenu.setVisible(false);
        weaponMenuOpen = false;
    }
    if (mapMenuOpen) {
        mapMenu.setVisible(false);
        mapMenuOpen = false;
    }
}

function createNpcMenu(scene, container) {
    // Se llenará dinámicamente en updateNpcMenu
}

function updateNpcMenu() {
    if (!npcMenu) return;
    npcMenu.removeAll(true);

    // Obtener NPCs desbloqueados
    const unlockedNpcs = shopItems.npcs.filter(npc => unlockedItems.npcs.includes(npc.id));

    const cols = 4;
    const itemW = 55;
    const itemH = 55;
    const menuW = cols * itemW + 10;
    const menuH = Math.ceil(unlockedNpcs.length / cols) * itemH + 10;

    const menuBg = sceneRef.add.graphics();
    menuBg.fillStyle(0x333333, 0.95);
    menuBg.fillRoundedRect(-menuW/2, 0, menuW, menuH, 8);
    npcMenu.add(menuBg);

    unlockedNpcs.forEach((npc, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = -menuW/2 + 5 + col * itemW;
        const by = 5 + row * itemH;

        const isSelected = currentNpcType === npc.id;

        const btn = sceneRef.add.graphics();
        btn.fillStyle(isSelected ? 0x44AA44 : 0x555555, 1);
        btn.fillRoundedRect(bx, by, itemW - 5, itemH - 5, 6);
        npcMenu.add(btn);

        const txt = sceneRef.add.text(bx + (itemW-5)/2, by + (itemH-5)/2, npc.emoji, {
            font: '24px Arial'
        }).setOrigin(0.5);
        npcMenu.add(txt);

        const zoneGraphic = sceneRef.add.rectangle(bx + (itemW-5)/2, by + (itemH-5)/2, itemW-5, itemH-5, 0x000000, 0);
        zoneGraphic.setInteractive();
        npcMenu.add(zoneGraphic);
        zoneGraphic.on('pointerdown', () => {
            currentNpcType = npc.id;
            spawnNpc(npc.id);
            npcMenu.setVisible(false);
            npcMenuOpen = false;
            drawNpcButton();
        });
    });
}

function spawnNpc(npcType) {
    if (ragdolls.length >= MAX_RAGDOLLS) {
        const maxText = sceneRef.add.text(game.scale.width / 2, 80, 'Máx ' + MAX_RAGDOLLS, {
            font: 'bold 14px Arial',
            fill: '#FF4444',
            stroke: '#FFFFFF',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(100);
        sceneRef.tweens.add({
            targets: maxText,
            alpha: 0,
            y: 60,
            duration: 800,
            onComplete: () => maxText.destroy()
        });
        return;
    }
    const newX = Phaser.Math.Between(80, game.scale.width - 80);
    createRagdoll(sceneRef, newX, game.scale.height - 150, teamColors[currentTeam], npcType);
}

function changeMap(mapId) {
    currentMap = mapId;

    // Reset efectos del mapa anterior
    tornadoActive = false;
    zombieMode = false;
    blackHoleActive = false;

    // Limpiar gráficos de efectos anteriores
    if (sceneRef.tornadoGraphics) {
        sceneRef.tornadoGraphics.clear();
    }
    if (sceneRef.blackHoleGraphics) {
        sceneRef.blackHoleGraphics.clear();
    }
    if (sceneRef.mapOverlay) {
        sceneRef.mapOverlay.clear();
    }
    if (sceneRef.rainGraphics) {
        sceneRef.rainGraphics.clear();
    }

    // Crear overlay si no existe
    if (!sceneRef.mapOverlay) {
        sceneRef.mapOverlay = sceneRef.add.graphics();
        sceneRef.mapOverlay.setDepth(-8);
    }

    // Por defecto mostrar elementos normales
    if (sun) sun.setVisible(true);
    if (groundGraphics) groundGraphics.setVisible(true);
    if (groundGraphics && groundGraphics.lunarGround) groundGraphics.lunarGround.setVisible(false);
    if (groundGraphics && groundGraphics.iceGround) groundGraphics.iceGround.setVisible(false);
    if (earthGraphics) earthGraphics.setVisible(false);
    if (starsGraphics) starsGraphics.setVisible(false);
    treesGraphics.forEach(t => { if (t) t.setVisible(true); });
    flowersGraphics.forEach(f => { if (f) f.setVisible(true); });
    clouds.forEach(c => { if (c.graphics) c.graphics.setVisible(true); });

    // Aplicar efectos del nuevo mapa
    switch(mapId) {
        case 'lunar':
            sceneRef.matter.world.setGravity(0, 0.15);
            // Ocultar sol, árboles, flores, nubes - mostrar Tierra y estrellas
            if (sun) sun.setVisible(false);
            if (groundGraphics) groundGraphics.setVisible(false);
            if (groundGraphics && groundGraphics.lunarGround) groundGraphics.lunarGround.setVisible(true);
            if (earthGraphics) earthGraphics.setVisible(true);
            if (starsGraphics) starsGraphics.setVisible(true);
            treesGraphics.forEach(t => { if (t) t.setVisible(false); });
            flowersGraphics.forEach(f => { if (f) f.setVisible(false); });
            clouds.forEach(c => { if (c.graphics) c.graphics.setVisible(false); });
            // Cielo negro espacial
            sceneRef.mapOverlay.fillStyle(0x000000, 0.9);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            break;
        case 'tornado':
            tornadoActive = true;
            tornadoX = game.scale.width / 2;
            sceneRef.matter.world.setGravity(0, 0.8);
            // Cielo gris tormentoso
            sceneRef.mapOverlay.fillStyle(0x444444, 0.4);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            break;
        case 'rayos':
            lightningTimer = 0;
            sceneRef.matter.world.setGravity(0, 0.8);
            // Cielo oscuro de tormenta
            sceneRef.mapOverlay.fillStyle(0x222233, 0.6);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            break;
        case 'zombie':
            zombieMode = true;
            sceneRef.matter.world.setGravity(0, 0.8);
            // Cielo rojo apocalíptico
            sceneRef.mapOverlay.fillStyle(0x330000, 0.5);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            break;
        case 'blackhole':
            blackHoleActive = true;
            blackHoleX = game.scale.width / 2;
            blackHoleY = game.scale.height / 3;
            sceneRef.matter.world.setGravity(0, 0.3);
            // Cielo espacial con estrellas
            if (starsGraphics) starsGraphics.setVisible(true);
            sceneRef.mapOverlay.fillStyle(0x110022, 0.6);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            break;
        case 'agua':
            sceneRef.matter.world.setGravity(0, 0.3); // Flotan bajo el agua
            // SUBMARINO: ocultar sol, árboles, flores, nubes - mostrar arena
            if (sun) sun.setVisible(false);
            if (groundGraphics) groundGraphics.setVisible(false);
            if (groundGraphics && groundGraphics.sandGround) groundGraphics.sandGround.setVisible(true);
            treesGraphics.forEach(t => { if (t) t.setVisible(false); });
            flowersGraphics.forEach(f => { if (f) f.setVisible(false); });
            clouds.forEach(c => { if (c.graphics) c.graphics.setVisible(false); });
            // Fondo azul profundo submarino
            sceneRef.mapOverlay.fillStyle(0x001133, 0.7);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            // Gradiente de luz desde arriba
            sceneRef.mapOverlay.fillStyle(0x003366, 0.4);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height / 3);
            break;
        case 'lava':
            sceneRef.matter.world.setGravity(0, 0.8);
            // VOLCÁN: ocultar árboles, flores - mostrar roca
            if (groundGraphics) groundGraphics.setVisible(false);
            if (groundGraphics && groundGraphics.rockGround) groundGraphics.rockGround.setVisible(true);
            treesGraphics.forEach(t => { if (t) t.setVisible(false); });
            flowersGraphics.forEach(f => { if (f) f.setVisible(false); });
            // Cielo rojo fuego
            sceneRef.mapOverlay.fillStyle(0x661100, 0.5);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            // Humo/ceniza
            sceneRef.mapOverlay.fillStyle(0x333333, 0.3);
            for (let i = 0; i < 10; i++) {
                const smokeX = Math.random() * game.scale.width;
                sceneRef.mapOverlay.fillEllipse(smokeX, 50 + i * 20, 100, 30);
            }
            break;
        case 'hielo':
            sceneRef.matter.world.setGravity(0, 0.8);
            // Antártida: ocultar árboles y flores, mostrar suelo de hielo
            if (groundGraphics) groundGraphics.setVisible(false);
            if (groundGraphics && groundGraphics.iceGround) groundGraphics.iceGround.setVisible(true);
            treesGraphics.forEach(t => { if (t) t.setVisible(false); });
            flowersGraphics.forEach(f => { if (f) f.setVisible(false); });
            // Cielo aurora boreal antártico
            sceneRef.mapOverlay.fillStyle(0x0A1628, 0.7);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            // Aurora boreal
            sceneRef.mapOverlay.fillStyle(0x00FF88, 0.15);
            for (let i = 0; i < 5; i++) {
                const ax = Math.random() * game.scale.width;
                sceneRef.mapOverlay.fillEllipse(ax, 80 + i * 30, 200, 40);
            }
            sceneRef.mapOverlay.fillStyle(0x00FFFF, 0.1);
            for (let i = 0; i < 3; i++) {
                const ax = Math.random() * game.scale.width;
                sceneRef.mapOverlay.fillEllipse(ax, 100 + i * 40, 150, 30);
            }
            break;
        case 'espacio':
            sceneRef.matter.world.setGravity(0, 0.05); // Casi sin gravedad
            // Espacio: ocultar sol, árboles, flores, nubes - mostrar estrellas
            if (sun) sun.setVisible(false);
            if (groundGraphics) groundGraphics.setVisible(false);
            if (groundGraphics && groundGraphics.lunarGround) groundGraphics.lunarGround.setVisible(true);
            if (starsGraphics) starsGraphics.setVisible(true);
            treesGraphics.forEach(t => { if (t) t.setVisible(false); });
            flowersGraphics.forEach(f => { if (f) f.setVisible(false); });
            clouds.forEach(c => { if (c.graphics) c.graphics.setVisible(false); });
            // Cielo negro espacial profundo
            sceneRef.mapOverlay.fillStyle(0x000011, 0.95);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            // Nebulosas de colores
            sceneRef.mapOverlay.fillStyle(0x4400AA, 0.2);
            sceneRef.mapOverlay.fillEllipse(game.scale.width * 0.3, 100, 200, 100);
            sceneRef.mapOverlay.fillStyle(0xAA0044, 0.15);
            sceneRef.mapOverlay.fillEllipse(game.scale.width * 0.7, 150, 180, 90);
            break;
        case 'niebla':
            sceneRef.matter.world.setGravity(0, 0.2); // Baja gravedad
            // Niebla: ocultar sol, árboles, flores - solo nubes blancas
            if (sun) sun.setVisible(false);
            treesGraphics.forEach(t => { if (t) t.setVisible(false); });
            flowersGraphics.forEach(f => { if (f) f.setVisible(false); });
            clouds.forEach(c => { if (c.graphics) c.graphics.setVisible(true); });
            // Fondo blanco puro
            sceneRef.mapOverlay.fillStyle(0xFFFFFF, 1);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            // Nubes de niebla en diferentes capas
            sceneRef.mapOverlay.fillStyle(0xEEEEEE, 0.8);
            for (let i = 0; i < 8; i++) {
                const fogX = Math.random() * game.scale.width;
                const fogY = Math.random() * game.scale.height;
                sceneRef.mapOverlay.fillEllipse(fogX, fogY, 200 + Math.random() * 150, 80 + Math.random() * 60);
            }
            sceneRef.mapOverlay.fillStyle(0xDDDDDD, 0.6);
            for (let i = 0; i < 6; i++) {
                const fogX = Math.random() * game.scale.width;
                const fogY = Math.random() * game.scale.height;
                sceneRef.mapOverlay.fillEllipse(fogX, fogY, 250 + Math.random() * 100, 100 + Math.random() * 50);
            }
            // Crear un esqueleto al entrar al mapa
            createRagdoll(sceneRef, game.scale.width / 2, game.scale.height - 150, 0x666666, 'esqueleto');
            break;
        case 'desierto':
            sceneRef.matter.world.setGravity(0, 0.8);
            // Desierto: sol grande, sin árboles ni flores, suelo de arena naranja
            if (sun) sun.setVisible(true);
            if (groundGraphics) groundGraphics.setVisible(false);
            if (groundGraphics && groundGraphics.desertGround) groundGraphics.desertGround.setVisible(true);
            treesGraphics.forEach(t => { if (t) t.setVisible(false); });
            flowersGraphics.forEach(f => { if (f) f.setVisible(false); });
            clouds.forEach(c => { if (c.graphics) c.graphics.setVisible(false); });
            // Cielo del desierto (amarillo/naranja caliente)
            sceneRef.mapOverlay.fillStyle(0xFFD700, 0.3);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            // Degradado más intenso arriba
            sceneRef.mapOverlay.fillStyle(0xFFA500, 0.2);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height / 3);
            break;
        case 'playa':
            sceneRef.matter.world.setGravity(0, 0.8);
            // Playa: mostrar sol, ocultar árboles normales, mostrar suelo de arena
            if (sun) sun.setVisible(true);
            if (groundGraphics) groundGraphics.setVisible(false);
            if (groundGraphics && groundGraphics.beachGround) groundGraphics.beachGround.setVisible(true);
            treesGraphics.forEach(t => { if (t) t.setVisible(false); });
            flowersGraphics.forEach(f => { if (f) f.setVisible(false); });
            clouds.forEach(c => { if (c.graphics) c.graphics.setVisible(true); });
            // Cielo azul tropical
            sceneRef.mapOverlay.fillStyle(0x87CEEB, 0.3);
            sceneRef.mapOverlay.fillRect(0, 0, game.scale.width, game.scale.height);
            break;
        default:
            sceneRef.matter.world.setGravity(0, 0.8);
            // Sin overlay
            break;
    }
}

let slowBtnPos = { x: 0, y: 0, size: 50 };

function drawSlowMotionButton(x, y, size) {
    if (x !== undefined) slowBtnPos = { x, y, size };
    const { x: bx, y: by, size: bs } = slowBtnPos;

    slowMotionButton.clear();
    slowMotionButton.fillStyle(slowMotion ? 0x44AA44 : 0x666666, 1);
    slowMotionButton.fillRoundedRect(bx, by, bs, bs, 8);
    slowMotionButton.fillStyle(0xFFFFFF, 1);
    // Icono de slow motion (reloj)
    slowMotionButton.lineStyle(3, 0xFFFFFF, 1);
    slowMotionButton.strokeCircle(bx + bs/2, by + bs/2, bs/3);
    slowMotionButton.lineBetween(bx + bs/2, by + bs/2, bx + bs/2, by + bs/4 + 5);
    slowMotionButton.lineBetween(bx + bs/2, by + bs/2, bx + bs/2 + 8, by + bs/2);
}

function toggleSlowMotion() {
    slowMotion = !slowMotion;
    if (slowMotion) {
        sceneRef.matter.world.engine.timing.timeScale = 0.3;
    } else {
        sceneRef.matter.world.engine.timing.timeScale = 1;
    }
    drawSlowMotionButton();
}

function drawTeamButton(graphics, color, x, y, btnSize) {
    graphics.fillStyle(0x555555, 1);
    graphics.fillRoundedRect(x, y, btnSize, btnSize, 8);
    graphics.fillStyle(color, 1);
    graphics.fillCircle(x + btnSize/2, y + btnSize/2, btnSize/2 - 6);
}

// ============ ARMAS ============
function createPistola(scene, x, y) {
    const pistol = scene.add.graphics();
    pistol.setDepth(10);

    // Cuerpo de la pistola
    pistol.fillStyle(0x333333, 1);
    pistol.fillRect(-20, -5, 40, 12);

    // Cañón
    pistol.fillStyle(0x222222, 1);
    pistol.fillRect(15, -3, 20, 8);

    // Mango
    pistol.fillStyle(0x4a3728, 1);
    pistol.fillRect(-15, 7, 12, 18);

    // Gatillo
    pistol.fillStyle(0x222222, 1);
    pistol.fillRect(-5, 7, 3, 8);

    pistol.setPosition(x, y);

    const weapon = {
        graphics: pistol,
        type: 'pistola',
        x: x,
        y: y,
        body: scene.matter.add.rectangle(x, y, 50, 20, {
            friction: 0.3,
            frictionAir: 0.01,
            restitution: 0.3,
            slop: 0.01,
            collisionFilter: {
                category: 0x0004,
                mask: 0x0001 | 0x0002
            }
        })
    };

    weapons.push(weapon);
    return weapon;
}

function createCuchillo(scene, x, y) {
    const knife = scene.add.graphics();
    knife.setDepth(10);

    // Mango
    knife.fillStyle(0x4a3728, 1);
    knife.fillRect(-25, -4, 20, 10);

    // Hoja
    knife.fillStyle(0xCCCCCC, 1);
    knife.fillRect(-5, -3, 35, 8);

    // Punta
    knife.fillTriangle(30, -3, 30, 5, 40, 1);

    // Filo (línea brillante)
    knife.fillStyle(0xFFFFFF, 1);
    knife.fillRect(-5, -3, 35, 2);

    knife.setPosition(x, y);

    const weapon = {
        graphics: knife,
        type: 'cuchillo',
        x: x,
        y: y,
        body: scene.matter.add.rectangle(x, y, 60, 15, {
            friction: 0.3,
            frictionAir: 0.01,
            restitution: 0.3,
            slop: 0.01,
            collisionFilter: {
                category: 0x0004,
                mask: 0x0001 | 0x0002
            }
        })
    };

    weapons.push(weapon);
    return weapon;
}

function createGranada(scene, x, y) {
    const grenade = scene.add.graphics();
    grenade.setDepth(10);

    // Cuerpo de la granada
    grenade.fillStyle(0x556B2F, 1);
    grenade.fillCircle(0, 0, 12);

    // Tapa
    grenade.fillStyle(0x333333, 1);
    grenade.fillRect(-4, -18, 8, 8);

    // Anillo
    grenade.fillStyle(0xFFD700, 1);
    grenade.fillCircle(6, -14, 3);

    grenade.setPosition(x, y);

    // Timer text
    const timerText = scene.add.text(0, -30, '5', {
        font: 'bold 16px Arial',
        fill: '#FF0000',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);
    timerText.setDepth(100);

    const weapon = {
        graphics: grenade,
        type: 'granada',
        x: x,
        y: y,
        timerText: timerText,
        timeLeft: 5,
        body: scene.matter.add.circle(x, y, 12, {
            friction: 0.5,
            frictionAir: 0.01,
            restitution: 0.4,
            collisionFilter: {
                category: 0x0004,
                mask: 0x0001 | 0x0002
            }
        })
    };

    // Timer de 5 segundos
    weapon.timerInterval = setInterval(() => {
        weapon.timeLeft--;
        if (weapon.timerText) {
            weapon.timerText.setText(weapon.timeLeft.toString());
        }
        if (weapon.timeLeft <= 0) {
            clearInterval(weapon.timerInterval);
            explodeGranada(weapon);
        }
    }, 1000);

    weapons.push(weapon);
    return weapon;
}

function explodeGranada(weapon) {
    const explosionX = weapon.x;
    const explosionY = weapon.y;
    const explosionRadius = 150;
    const explosionForce = 25;

    // Efecto visual de explosión
    const explosion = sceneRef.add.graphics();
    explosion.setDepth(50);

    // Círculo de explosión
    explosion.fillStyle(0xFF4500, 0.8);
    explosion.fillCircle(explosionX, explosionY, 20);
    explosion.fillStyle(0xFFFF00, 0.6);
    explosion.fillCircle(explosionX, explosionY, 40);
    explosion.fillStyle(0xFF6600, 0.4);
    explosion.fillCircle(explosionX, explosionY, 60);

    // Animar explosión
    sceneRef.tweens.add({
        targets: explosion,
        alpha: 0,
        scale: 2,
        duration: 300,
        onComplete: () => explosion.destroy()
    });

    // Sonido de explosión
    playExplosionSound();

    // Empujar ragdolls
    ragdolls.forEach(ragdoll => {
        ragdoll.parts.forEach(part => {
            if (part && part.body) {
                const dist = Phaser.Math.Distance.Between(explosionX, explosionY, part.x, part.y);
                if (dist < explosionRadius) {
                    const angle = Math.atan2(part.y - explosionY, part.x - explosionX);
                    const force = (1 - dist / explosionRadius) * explosionForce;
                    part.setVelocity(
                        Math.cos(angle) * force,
                        Math.sin(angle) * force - 5
                    );

                    // Si está parado, tirarlo
                    if (ragdoll.isStanding) {
                        ragdoll.isStanding = false;
                        ragdoll.parts.forEach(p => {
                            if (p && p.body) p.setStatic(false);
                        });
                    }
                }
            }
        });
    });

    // Empujar otras armas
    weapons.forEach(w => {
        if (w !== weapon && w.body) {
            const dist = Phaser.Math.Distance.Between(explosionX, explosionY, w.x, w.y);
            if (dist < explosionRadius) {
                const angle = Math.atan2(w.y - explosionY, w.x - explosionX);
                const force = (1 - dist / explosionRadius) * explosionForce;
                sceneRef.matter.body.setVelocity(w.body, {
                    x: Math.cos(angle) * force,
                    y: Math.sin(angle) * force - 5
                });
            }
        }
    });

    // Mucha sangre
    spawnBlood(explosionX, explosionY, 15);

    // Eliminar granada
    if (weapon.timerText) weapon.timerText.destroy();
    if (weapon.graphics) weapon.graphics.destroy();
    if (weapon.body) sceneRef.matter.world.remove(weapon.body);

    const idx = weapons.indexOf(weapon);
    if (idx > -1) weapons.splice(idx, 1);
}

function playExplosionSound() {
    if (!audioContext) return;

    // Explosion bass
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.3);
    gain.gain.setValueAtTime(0.5, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.4);

    // Noise burst
    const noise = audioContext.createOscillator();
    const noiseGain = audioContext.createGain();
    noise.type = 'square';
    noise.frequency.setValueAtTime(200, audioContext.currentTime);
    noise.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
    noiseGain.gain.setValueAtTime(0.3, audioContext.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    noise.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start();
    noise.stop(audioContext.currentTime + 0.3);
}

// === NUEVAS ARMAS ===

function createEspada(scene, x, y) {
    const sword = scene.add.graphics();
    sword.setDepth(10);

    // Mango
    sword.fillStyle(0x8B4513, 1);
    sword.fillRect(-35, -4, 20, 10);

    // Guardia
    sword.fillStyle(0xFFD700, 1);
    sword.fillRect(-15, -8, 6, 18);

    // Hoja
    sword.fillStyle(0xC0C0C0, 1);
    sword.fillRect(-9, -4, 55, 10);

    // Punta
    sword.fillTriangle(46, -4, 46, 6, 60, 1);

    // Filo brillante
    sword.fillStyle(0xFFFFFF, 1);
    sword.fillRect(-9, -4, 55, 2);

    sword.setPosition(x, y);

    const weapon = {
        graphics: sword,
        type: 'espada',
        x: x,
        y: y,
        body: scene.matter.add.rectangle(x, y, 80, 15, {
            friction: 0.6,
            frictionAir: 0.02,
            restitution: 0.3,
            collisionFilter: {
                category: 0x0004,
                mask: 0x0001 | 0x0002
            }
        })
    };

    weapons.push(weapon);
    return weapon;
}

function createBat(scene, x, y) {
    const bat = scene.add.graphics();
    bat.setDepth(10);

    // Mango
    bat.fillStyle(0x8B4513, 1);
    bat.fillRect(-35, -3, 25, 8);

    // Cuerpo del bat
    bat.fillStyle(0xDEB887, 1);
    bat.fillRect(-10, -6, 50, 14);

    // Punta redondeada
    bat.fillCircle(40, 1, 7);

    bat.setPosition(x, y);

    const weapon = {
        graphics: bat,
        type: 'bat',
        x: x,
        y: y,
        body: scene.matter.add.rectangle(x, y, 70, 15, {
            friction: 0.7,
            frictionAir: 0.02,
            restitution: 0.4,
            collisionFilter: {
                category: 0x0004,
                mask: 0x0001 | 0x0002
            }
        })
    };

    weapons.push(weapon);
    return weapon;
}

function createBarril(scene, x, y) {
    const barrel = scene.add.graphics();
    barrel.setDepth(10);

    // Cuerpo
    barrel.fillStyle(0x8B0000, 1);
    barrel.fillCircle(0, 0, 18);

    // Bandas metálicas
    barrel.lineStyle(3, 0x333333, 1);
    barrel.strokeCircle(0, 0, 18);
    barrel.strokeCircle(0, 0, 12);

    // Símbolo de peligro
    barrel.fillStyle(0xFFFF00, 1);
    barrel.fillTriangle(0, -10, -8, 5, 8, 5);
    barrel.fillStyle(0x000000, 1);
    barrel.fillRect(-2, -6, 4, 8);
    barrel.fillCircle(0, 5, 2);

    barrel.setPosition(x, y);

    const weapon = {
        graphics: barrel,
        type: 'barril',
        x: x,
        y: y,
        health: 3, // Explota después de 3 golpes
        body: scene.matter.add.circle(x, y, 18, {
            friction: 0.8,
            frictionAir: 0.01,
            restitution: 0.3,
            collisionFilter: {
                category: 0x0004,
                mask: 0x0001 | 0x0002
            }
        })
    };

    weapons.push(weapon);
    return weapon;
}

function createTrampolin(scene, x, y) {
    const tramp = scene.add.graphics();
    tramp.setDepth(5);

    // Base
    tramp.fillStyle(0x333333, 1);
    tramp.fillRect(-40, 5, 80, 10);

    // Superficie de rebote
    tramp.fillStyle(0x00BFFF, 1);
    tramp.fillRect(-35, -5, 70, 10);

    // Resortes
    tramp.lineStyle(2, 0xFFFFFF, 1);
    for (let i = -30; i <= 30; i += 15) {
        tramp.lineBetween(i, 5, i, -5);
    }

    tramp.setPosition(x, y);

    const weapon = {
        graphics: tramp,
        type: 'trampolin',
        x: x,
        y: y,
        body: scene.matter.add.rectangle(x, y, 80, 20, {
            isStatic: true,
            friction: 0.1,
            restitution: 1.5, // Super rebote
            collisionFilter: {
                category: 0x0004,
                mask: 0x0001 | 0x0002
            }
        })
    };

    trampolines.push(weapon);
    weapons.push(weapon);
    return weapon;
}

// === NUEVAS ARMAS ===

function createKatana(scene, x, y) {
    const katana = scene.add.graphics();
    katana.setDepth(10);
    katana.fillStyle(0x8B0000, 1);
    katana.fillRect(-40, -3, 15, 8); // Mango
    katana.fillStyle(0xFFD700, 1);
    katana.fillRect(-25, -4, 4, 10); // Guardia
    katana.fillStyle(0xE8E8E8, 1);
    katana.fillRect(-21, -2, 70, 6); // Hoja
    katana.fillTriangle(49, -2, 49, 4, 60, 1); // Punta
    katana.fillStyle(0xFFFFFF, 1);
    katana.fillRect(-21, -2, 70, 1); // Filo
    katana.setPosition(x, y);

    const weapon = { graphics: katana, type: 'katana', x, y,
        body: scene.matter.add.rectangle(x, y, 90, 10, {
            friction: 0.2, frictionAir: 0.01, restitution: 0.3, slop: 0.01,
            collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }
        })
    };
    weapons.push(weapon);
    return weapon;
}

function createMotosierra(scene, x, y) {
    const sierra = scene.add.graphics();
    sierra.setDepth(10);
    sierra.fillStyle(0xFF6600, 1);
    sierra.fillRect(-30, -8, 25, 18); // Cuerpo
    sierra.fillStyle(0x333333, 1);
    sierra.fillRect(-5, -4, 45, 10); // Barra
    sierra.fillStyle(0x666666, 1);
    for (let i = 0; i < 40; i += 5) {
        sierra.fillTriangle(-5 + i, -4, -5 + i + 3, -7, -5 + i + 5, -4);
        sierra.fillTriangle(-5 + i, 6, -5 + i + 3, 9, -5 + i + 5, 6);
    }
    sierra.setPosition(x, y);

    const weapon = { graphics: sierra, type: 'motosierra', x, y, isOn: false,
        body: scene.matter.add.rectangle(x, y, 70, 18, {
            friction: 0.3, frictionAir: 0.01, restitution: 0.2, slop: 0.01,
            collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }
        })
    };
    weapons.push(weapon);
    return weapon;
}

function createArco(scene, x, y) {
    const arco = scene.add.graphics();
    arco.setDepth(10);
    arco.lineStyle(4, 0x8B4513, 1);
    arco.beginPath();
    arco.arc(0, 0, 25, -Math.PI/2 - 0.5, Math.PI/2 + 0.5);
    arco.strokePath();
    arco.lineStyle(2, 0xFFFFFF, 1);
    arco.lineBetween(0, -22, 0, 22); // Cuerda
    arco.setPosition(x, y);

    const weapon = { graphics: arco, type: 'arco', x, y,
        body: scene.matter.add.rectangle(x, y, 30, 50, {
            friction: 0.3, frictionAir: 0.02, restitution: 0.2, slop: 0.01,
            collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }
        })
    };
    weapons.push(weapon);
    return weapon;
}

function createNuke(scene, x, y) {
    const nuke = scene.add.graphics();
    nuke.setDepth(10);
    nuke.fillStyle(0x333333, 1);
    nuke.fillEllipse(0, 0, 40, 25);
    nuke.fillStyle(0xFFFF00, 1);
    nuke.fillCircle(-5, 0, 8);
    nuke.fillStyle(0x000000, 1);
    nuke.fillTriangle(-5, -5, -5, 5, 2, 0);
    nuke.fillStyle(0xFF0000, 1);
    nuke.fillRect(15, -3, 8, 6);
    nuke.setPosition(x, y);

    const weapon = { graphics: nuke, type: 'nuke', x, y, timer: 8,
        body: scene.matter.add.ellipse(x, y, 40, 25, {
            friction: 0.5, frictionAir: 0.01, restitution: 0.3, slop: 0.01,
            collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }
        })
    };

    // Timer de 8 segundos
    const timerText = scene.add.text(x, y - 30, '8', {
        font: 'bold 18px Arial', fill: '#FF0000', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(100);
    weapon.timerText = timerText;

    weapon.timerInterval = setInterval(() => {
        weapon.timer--;
        if (weapon.timerText) weapon.timerText.setText(weapon.timer.toString());
        if (weapon.timer <= 0) {
            clearInterval(weapon.timerInterval);
            explodeNuke(weapon);
        }
    }, 1000);

    weapons.push(weapon);
    return weapon;
}

function explodeNuke(weapon) {
    const ex = weapon.x, ey = weapon.y;

    // Flash blanco gigante
    const flash = sceneRef.add.graphics();
    flash.setDepth(200);
    flash.fillStyle(0xFFFFFF, 1);
    flash.fillRect(0, 0, game.scale.width, game.scale.height);
    sceneRef.tweens.add({ targets: flash, alpha: 0, duration: 1000, onComplete: () => flash.destroy() });

    // Explosión masiva
    const explosion = sceneRef.add.graphics();
    explosion.setDepth(150);
    for (let r = 300; r > 0; r -= 30) {
        const color = r > 200 ? 0xFF0000 : r > 100 ? 0xFF6600 : 0xFFFF00;
        explosion.fillStyle(color, 0.8 - r/400);
        explosion.fillCircle(ex, ey, r);
    }
    sceneRef.tweens.add({ targets: explosion, alpha: 0, scale: 3, duration: 1500, onComplete: () => explosion.destroy() });

    playExplosionSound();
    playExplosionSound();

    // Empujar TODO con fuerza extrema
    ragdolls.forEach(r => {
        if (r.isStanding) { r.isStanding = false; r.parts.forEach(p => p?.body && p.setStatic(false)); }
        r.parts.forEach(p => {
            if (p?.body) {
                const dx = p.x - ex, dy = p.y - ey;
                const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 50);
                const force = 50 * (1 - Math.min(dist/500, 1));
                p.setVelocity(dx/dist * force, dy/dist * force - 20);
            }
        });
    });
    weapons.forEach(w => {
        if (w !== weapon && w.body && w.type !== 'trampolin') {
            const dx = w.x - ex, dy = w.y - ey;
            const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 50);
            const force = 40 * (1 - Math.min(dist/500, 1));
            sceneRef.matter.body.setVelocity(w.body, { x: dx/dist * force, y: dy/dist * force - 15 });
        }
    });

    spawnBlood(ex, ey, 50);

    if (weapon.timerText) weapon.timerText.destroy();
    if (weapon.graphics) weapon.graphics.destroy();
    if (weapon.body) sceneRef.matter.world.remove(weapon.body);
    const idx = weapons.indexOf(weapon);
    if (idx > -1) weapons.splice(idx, 1);
}

function createIman(scene, x, y) {
    const iman = scene.add.graphics();
    iman.setDepth(10);
    iman.fillStyle(0xFF0000, 1);
    iman.fillRect(-20, -15, 15, 30);
    iman.fillStyle(0x0000FF, 1);
    iman.fillRect(5, -15, 15, 30);
    iman.fillStyle(0x888888, 1);
    iman.fillRect(-5, -15, 10, 15);
    iman.setPosition(x, y);

    const weapon = { graphics: iman, type: 'iman', x, y, isActive: true,
        body: scene.matter.add.rectangle(x, y, 40, 30, {
            friction: 0.5, frictionAir: 0.02, restitution: 0.2, slop: 0.01,
            collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }
        })
    };
    weapons.push(weapon);
    return weapon;
}

function createLanzallamas(scene, x, y) {
    const llamas = scene.add.graphics();
    llamas.setDepth(10);
    llamas.fillStyle(0x444444, 1);
    llamas.fillRect(-25, -5, 35, 12);
    llamas.fillStyle(0xFF6600, 1);
    llamas.fillRect(-30, -3, 8, 8);
    llamas.fillStyle(0x222222, 1);
    llamas.fillRect(10, -4, 20, 10);
    llamas.setPosition(x, y);

    const weapon = { graphics: llamas, type: 'lanzallamas', x, y, fuel: 100,
        body: scene.matter.add.rectangle(x, y, 55, 15, {
            friction: 0.3, frictionAir: 0.01, restitution: 0.2, slop: 0.01,
            collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }
        })
    };
    weapons.push(weapon);
    return weapon;
}

let portals = [];
function createPortal(scene, x, y) {
    const portal = scene.add.graphics();
    portal.setDepth(3);
    const hue = portals.length % 2 === 0 ? 0x00FFFF : 0xFF00FF;
    portal.lineStyle(5, hue, 0.8);
    portal.strokeCircle(0, 0, 30);
    portal.lineStyle(3, 0xFFFFFF, 0.5);
    portal.strokeCircle(0, 0, 20);
    portal.setPosition(x, y);

    const weapon = { graphics: portal, type: 'portal', x, y, portalId: portals.length,
        body: scene.matter.add.circle(x, y, 30, {
            isStatic: true, isSensor: true,
            collisionFilter: { category: 0x0004, mask: 0x0002 }
        })
    };
    portals.push(weapon);
    weapons.push(weapon);
    return weapon;
}

function createHacha(scene, x, y) {
    const g = scene.add.graphics();
    g.setDepth(10);
    g.fillStyle(0x4a3728, 1);
    g.fillRect(-3, -20, 6, 40); // Mango
    g.fillStyle(0x888888, 1);
    g.fillRect(-15, -20, 20, 15); // Cabeza
    g.fillTriangle(-15, -20, -15, -5, -20, -12); // Filo
    g.setPosition(x, y);
    const weapon = { graphics: g, type: 'hacha', x, y,
        body: scene.matter.add.rectangle(x, y, 30, 40, { friction: 0.3, collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }})
    };
    weapons.push(weapon);
    return weapon;
}

function createMartillo(scene, x, y) {
    const g = scene.add.graphics();
    g.setDepth(10);
    g.fillStyle(0x4a3728, 1);
    g.fillRect(-3, -5, 6, 35); // Mango
    g.fillStyle(0x555555, 1);
    g.fillRect(-12, -15, 24, 12); // Cabeza
    g.setPosition(x, y);
    const weapon = { graphics: g, type: 'martillo', x, y,
        body: scene.matter.add.rectangle(x, y, 24, 35, { friction: 0.3, collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }})
    };
    weapons.push(weapon);
    return weapon;
}

function createDinamita(scene, x, y) {
    const g = scene.add.graphics();
    g.setDepth(10);
    g.fillStyle(0xCC0000, 1);
    g.fillRect(-5, -15, 10, 30); // Cartucho rojo
    g.fillStyle(0xFFFF00, 1);
    g.fillRect(-2, -18, 4, 5); // Mecha
    g.setPosition(x, y);
    const weapon = { graphics: g, type: 'dinamita', x, y, timer: 3, timerStarted: false,
        body: scene.matter.add.rectangle(x, y, 10, 30, { friction: 0.3, collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }})
    };
    weapons.push(weapon);
    return weapon;
}

function createLaser(scene, x, y) {
    const g = scene.add.graphics();
    g.setDepth(10);
    g.fillStyle(0x333333, 1);
    g.fillRect(-25, -8, 50, 16); // Cuerpo
    g.fillStyle(0xFF0000, 1);
    g.fillCircle(25, 0, 5); // Punta láser
    g.setPosition(x, y);
    const weapon = { graphics: g, type: 'laser', x, y,
        body: scene.matter.add.rectangle(x, y, 50, 16, { friction: 0.3, collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }})
    };
    weapons.push(weapon);
    return weapon;
}

function createEscudo(scene, x, y) {
    const g = scene.add.graphics();
    g.setDepth(10);
    g.fillStyle(0x8B4513, 1);
    g.fillRoundedRect(-15, -20, 30, 40, 10); // Escudo madera
    g.fillStyle(0xFFD700, 1);
    g.fillCircle(0, 0, 8); // Centro dorado
    g.setPosition(x, y);
    const weapon = { graphics: g, type: 'escudo', x, y,
        body: scene.matter.add.rectangle(x, y, 30, 40, { friction: 0.5, collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }})
    };
    weapons.push(weapon);
    return weapon;
}

function createBoomerang(scene, x, y) {
    const g = scene.add.graphics();
    g.setDepth(10);
    g.fillStyle(0x8B4513, 1);
    g.fillRoundedRect(-20, -3, 20, 6, 3);
    g.fillRoundedRect(-3, -20, 6, 20, 3);
    g.setPosition(x, y);
    const weapon = { graphics: g, type: 'boomerang', x, y,
        body: scene.matter.add.rectangle(x, y, 25, 25, { friction: 0.1, collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }})
    };
    weapons.push(weapon);
    return weapon;
}

function createPiedra(scene, x, y) {
    const g = scene.add.graphics();
    g.setDepth(10);
    g.fillStyle(0x777777, 1);
    g.fillCircle(0, 0, 12);
    g.fillStyle(0x666666, 1);
    g.fillCircle(-3, -3, 5);
    g.setPosition(x, y);
    const weapon = { graphics: g, type: 'piedra', x, y,
        body: scene.matter.add.circle(x, y, 12, { friction: 0.5, restitution: 0.3, collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }})
    };
    weapons.push(weapon);
    return weapon;
}

function createCactus(scene, x, y) {
    const g = scene.add.graphics();
    g.setDepth(10);
    g.fillStyle(0x228B22, 1);
    g.fillRoundedRect(-8, -25, 16, 50, 5); // Cuerpo
    g.fillRoundedRect(-20, -10, 15, 8, 3); // Brazo izq
    g.fillRoundedRect(5, 0, 15, 8, 3); // Brazo der
    g.setPosition(x, y);
    const weapon = { graphics: g, type: 'cactus', x, y,
        body: scene.matter.add.rectangle(x, y, 30, 50, { isStatic: true, collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }})
    };
    weapons.push(weapon);
    return weapon;
}

function createYunque(scene, x, y) {
    const g = scene.add.graphics();
    g.setDepth(10);
    g.fillStyle(0x444444, 1);
    g.fillRect(-20, -10, 40, 20); // Base
    g.fillRect(-15, -20, 30, 12); // Arriba
    g.fillStyle(0x333333, 1);
    g.fillRect(-25, -12, 10, 8); // Cuerno izq
    g.setPosition(x, y);
    const weapon = { graphics: g, type: 'yunque', x, y,
        body: scene.matter.add.rectangle(x, y, 40, 25, { friction: 0.8, density: 0.01, collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }})
    };
    weapons.push(weapon);
    return weapon;
}

function createVentilador(scene, x, y) {
    const vent = scene.add.graphics();
    vent.setDepth(10);
    vent.fillStyle(0x666666, 1);
    vent.fillRect(-20, -25, 40, 50);
    vent.fillStyle(0x333333, 1);
    vent.fillCircle(0, 0, 15);
    vent.fillStyle(0xAAAAAA, 1);
    for (let a = 0; a < 3; a++) {
        const angle = a * Math.PI * 2 / 3 + Date.now()/100;
        vent.fillEllipse(Math.cos(angle) * 8, Math.sin(angle) * 8, 12, 5);
    }
    vent.setPosition(x, y);

    const weapon = { graphics: vent, type: 'ventilador', x, y, isOn: true,
        body: scene.matter.add.rectangle(x, y, 40, 50, {
            isStatic: true,
            collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }
        })
    };
    weapons.push(weapon);
    return weapon;
}

// === EFECTOS DE MAPA ===

function updateMapEffects() {
    // Tornado
    if (tornadoActive) {
        // El tornado se mueve lentamente por la pantalla
        tornadoX += Math.sin(Date.now() / 1500) * 2;

        // Dibujar tornado simple
        if (!sceneRef.tornadoGraphics) {
            sceneRef.tornadoGraphics = sceneRef.add.graphics();
            sceneRef.tornadoGraphics.setDepth(5);
        }
        sceneRef.tornadoGraphics.clear();

        // Tornado simple - embudo
        for (let i = 0; i < 8; i++) {
            const w = 15 + i * 12;
            const yy = game.scale.height - 60 - i * 45;
            const wobble = Math.sin(Date.now()/150 + i) * 8;
            sceneRef.tornadoGraphics.fillStyle(0x888888, 0.5);
            sceneRef.tornadoGraphics.fillEllipse(tornadoX + wobble, yy, w, 15);
        }

        const tornadoRadius = 120;

        // Afectar ragdolls
        ragdolls.forEach(ragdoll => {
            ragdoll.parts.forEach(part => {
                if (part && part.body) {
                    const dist = Math.abs(part.x - tornadoX);

                    if (dist < tornadoRadius) {
                        // Si está parado, tirarlo
                        if (ragdoll.isStanding) {
                            ragdoll.isStanding = false;
                            ragdoll.parts.forEach(p => p && p.body && p.setStatic(false));
                        }

                        // ¡LANZAR VOLANDO!
                        part.setVelocity(
                            (Math.random() - 0.5) * 25,
                            -30 - Math.random() * 20
                        );
                    }
                }
            });
        });

        // Afectar armas
        weapons.forEach(weapon => {
            if (weapon.body && weapon.type !== 'trampolin') {
                const dist = Math.abs(weapon.x - tornadoX);

                if (dist < tornadoRadius) {
                    sceneRef.matter.body.setVelocity(weapon.body, {
                        x: (Math.random() - 0.5) * 20,
                        y: -25 - Math.random() * 15
                    });
                }
            }
        });
    }

    // Lunar - estrellas brillantes y saltos altos
    if (currentMap === 'lunar') {
        // Dibujar estrellas
        if (!sceneRef.lunarGraphics) {
            sceneRef.lunarGraphics = sceneRef.add.graphics();
            sceneRef.lunarGraphics.setDepth(-7);
        }
        sceneRef.lunarGraphics.clear();

        // Estrellas titilantes
        for (let i = 0; i < 30; i++) {
            const sx = (i * 137) % game.scale.width;
            const sy = (i * 89) % (game.scale.height - 100);
            const twinkle = Math.sin(Date.now() / 200 + i) * 0.5 + 0.5;
            sceneRef.lunarGraphics.fillStyle(0xFFFFFF, twinkle);
            sceneRef.lunarGraphics.fillCircle(sx, sy, 1 + twinkle);
        }

        // Luna grande
        sceneRef.lunarGraphics.fillStyle(0xEEEECC, 1);
        sceneRef.lunarGraphics.fillCircle(game.scale.width - 80, 80, 40);
        sceneRef.lunarGraphics.fillStyle(0xCCCCAA, 0.5);
        sceneRef.lunarGraphics.fillCircle(game.scale.width - 90, 75, 8);
        sceneRef.lunarGraphics.fillCircle(game.scale.width - 70, 90, 5);
    } else if (sceneRef.lunarGraphics) {
        sceneRef.lunarGraphics.clear();
    }

    // Rayos - tormenta con lluvia
    if (currentMap === 'rayos') {
        // Lluvia
        if (!sceneRef.rainGraphics) {
            sceneRef.rainGraphics = sceneRef.add.graphics();
            sceneRef.rainGraphics.setDepth(2);
        }
        sceneRef.rainGraphics.clear();
        sceneRef.rainGraphics.lineStyle(1, 0x6666FF, 0.4);

        for (let i = 0; i < 50; i++) {
            const rx = (Date.now() / 5 + i * 47) % game.scale.width;
            const ry = (Date.now() / 3 + i * 31) % game.scale.height;
            sceneRef.rainGraphics.lineBetween(rx, ry, rx - 5, ry + 15);
        }

        // Rayos más frecuentes
        lightningTimer++;
        if (lightningTimer > 90 && Math.random() < 0.05) {
            spawnLightning();
            lightningTimer = 0;
        }
    } else if (sceneRef.rainGraphics) {
        sceneRef.rainGraphics.clear();
    }

    // Zombie mode - ragdolls persiguen agresivamente
    if (zombieMode) {
        ragdolls.forEach(ragdoll => {
            if (!ragdoll.isBeingDragged && ragdoll.parts[0]) {
                // Tirar ragdoll si está parado
                if (ragdoll.isStanding) {
                    ragdoll.isStanding = false;
                    ragdoll.parts.forEach(p => p && p.body && p.setStatic(false));
                }

                const head = ragdoll.parts[0];

                // Buscar ragdoll más cercano para perseguir
                let closestDist = 999;
                let targetX = head.x;

                ragdolls.forEach(other => {
                    if (other !== ragdoll && other.parts[0]) {
                        const dist = Math.abs(other.parts[0].x - head.x);
                        if (dist < closestDist && dist > 40) {
                            closestDist = dist;
                            targetX = other.parts[0].x;
                        }
                    }
                });

                // Moverse hacia el objetivo con más fuerza
                const dx = targetX - head.x;
                if (Math.abs(dx) > 30) {
                    const moveForce = 0.4;
                    head.setVelocity(
                        head.body.velocity.x + Math.sign(dx) * moveForce,
                        head.body.velocity.y
                    );

                    // A veces saltar
                    if (Math.random() < 0.02 && head.body.velocity.y > -2) {
                        head.setVelocity(head.body.velocity.x, -8);
                    }
                }
            }
        });
    }

    // Agujero negro
    if (blackHoleActive) {
        // Dibujar agujero negro DETRÁS de todo (depth negativo)
        if (!sceneRef.blackHoleGraphics) {
            sceneRef.blackHoleGraphics = sceneRef.add.graphics();
            sceneRef.blackHoleGraphics.setDepth(-5); // Detrás de los NPCs
        }
        sceneRef.blackHoleGraphics.clear();

        // Efecto de distorsión del espacio (anillos giratorios)
        const time = Date.now() / 1000;
        for (let i = 8; i > 0; i--) {
            const rotation = time * (0.5 + i * 0.1);
            const radius = 40 + i * 25;
            const alpha = 0.4 - i * 0.04;

            // Anillo distorsionado
            sceneRef.blackHoleGraphics.lineStyle(3, 0x9400D3, alpha);
            sceneRef.blackHoleGraphics.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.1) {
                const wobble = Math.sin(a * 3 + rotation) * 5;
                const rx = blackHoleX + Math.cos(a) * (radius + wobble);
                const ry = blackHoleY + Math.sin(a) * (radius * 0.6 + wobble);
                if (a === 0) {
                    sceneRef.blackHoleGraphics.moveTo(rx, ry);
                } else {
                    sceneRef.blackHoleGraphics.lineTo(rx, ry);
                }
            }
            sceneRef.blackHoleGraphics.closePath();
            sceneRef.blackHoleGraphics.strokePath();
        }

        // Disco de acreción brillante
        sceneRef.blackHoleGraphics.fillStyle(0xFF6600, 0.3);
        sceneRef.blackHoleGraphics.fillEllipse(blackHoleX, blackHoleY, 80, 30);
        sceneRef.blackHoleGraphics.fillStyle(0xFFFF00, 0.2);
        sceneRef.blackHoleGraphics.fillEllipse(blackHoleX, blackHoleY, 60, 20);

        // Centro negro absoluto
        sceneRef.blackHoleGraphics.fillStyle(0x000000, 1);
        sceneRef.blackHoleGraphics.fillCircle(blackHoleX, blackHoleY, 35);

        // Atraer TODO desde CUALQUIER lugar
        const attractObjects = (obj, isRagdoll = false) => {
            const px = obj.x;
            const py = obj.y;
            const dx = blackHoleX - px;
            const dy = blackHoleY - py;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Fuerza inversamente proporcional a la distancia (más cerca = más fuerte)
            // Mínimo dist de 50 para evitar división por casi 0
            const effectiveDist = Math.max(dist, 50);
            const force = 800 / (effectiveDist * effectiveDist) * 10;

            // Limitar fuerza máxima
            const maxForce = 3;
            const actualForce = Math.min(force, maxForce);

            if (dist > 45) { // No atraer si ya está en el centro
                if (isRagdoll && obj.body) {
                    obj.setVelocity(
                        obj.body.velocity.x + (dx/dist) * actualForce,
                        obj.body.velocity.y + (dy/dist) * actualForce
                    );

                    // Si está parado y cerca, tirarlo
                    if (dist < 200) {
                        ragdolls.forEach(r => {
                            if (r.parts.includes(obj) && r.isStanding) {
                                r.isStanding = false;
                                r.parts.forEach(p => p && p.body && p.setStatic(false));
                            }
                        });
                    }
                } else if (obj.body) {
                    sceneRef.matter.body.setVelocity(obj.body, {
                        x: obj.body.velocity.x + (dx/dist) * actualForce,
                        y: obj.body.velocity.y + (dy/dist) * actualForce
                    });
                }
            }
        };

        ragdolls.forEach(r => r.parts.forEach(p => p && attractObjects(p, true)));
        weapons.forEach(w => w.type !== 'trampolin' && attractObjects(w));
    }

    // === EFECTOS DE NUEVOS MAPAS ===

    // Agua - SUBMARINO con peces, algas, corrientes
    if (currentMap === 'agua') {
        if (!sceneRef.waterGraphics) {
            sceneRef.waterGraphics = sceneRef.add.graphics();
            sceneRef.waterGraphics.setDepth(1);
        }
        sceneRef.waterGraphics.clear();

        // Rayos de luz desde arriba
        sceneRef.waterGraphics.fillStyle(0x88DDFF, 0.1);
        for (let i = 0; i < 6; i++) {
            const rayX = i * 150 + Math.sin(Date.now()/2000 + i) * 30;
            sceneRef.waterGraphics.beginPath();
            sceneRef.waterGraphics.moveTo(rayX, 0);
            sceneRef.waterGraphics.lineTo(rayX - 50, game.scale.height);
            sceneRef.waterGraphics.lineTo(rayX + 80, game.scale.height);
            sceneRef.waterGraphics.closePath();
            sceneRef.waterGraphics.fillPath();
        }

        // Algas moviéndose en el fondo
        for (let i = 0; i < 12; i++) {
            const algaX = 50 + i * 70;
            const algaHeight = 60 + (i % 3) * 30;
            const sway = Math.sin(Date.now()/800 + i) * 15;

            sceneRef.waterGraphics.lineStyle(6, 0x228B22, 0.8);
            sceneRef.waterGraphics.beginPath();
            sceneRef.waterGraphics.moveTo(algaX, game.scale.height - 50);
            sceneRef.waterGraphics.quadraticCurveTo(
                algaX + sway, game.scale.height - 50 - algaHeight/2,
                algaX + sway * 1.5, game.scale.height - 50 - algaHeight
            );
            sceneRef.waterGraphics.strokePath();

            // Hojitas
            sceneRef.waterGraphics.fillStyle(0x32CD32, 0.7);
            sceneRef.waterGraphics.fillEllipse(algaX + sway * 0.7, game.scale.height - 50 - algaHeight * 0.4, 8, 4);
            sceneRef.waterGraphics.fillEllipse(algaX + sway * 1.2, game.scale.height - 50 - algaHeight * 0.7, 6, 3);
        }

        // Burbujas subiendo
        for (let i = 0; i < 20; i++) {
            const bx = (i * 97 + Date.now()/15) % game.scale.width;
            const by = game.scale.height - 50 - ((Date.now()/8 + i * 40) % (game.scale.height - 100));
            const wobble = Math.sin(Date.now()/200 + i) * 5;
            sceneRef.waterGraphics.fillStyle(0xAADDFF, 0.6);
            sceneRef.waterGraphics.fillCircle(bx + wobble, by, 2 + i % 4);
        }

        // Peces nadando
        const fishColors = [0xFF6B35, 0xFFD700, 0xFF69B4, 0x00CED1, 0x9370DB];
        for (let i = 0; i < 5; i++) {
            const fishX = ((Date.now()/10 * (0.5 + i * 0.3)) + i * 200) % (game.scale.width + 100) - 50;
            const fishY = 100 + i * 80 + Math.sin(Date.now()/500 + i) * 30;
            const fishSize = 15 + i * 5;
            const fishColor = fishColors[i % fishColors.length];

            // Cuerpo
            sceneRef.waterGraphics.fillStyle(fishColor, 0.9);
            sceneRef.waterGraphics.fillEllipse(fishX, fishY, fishSize, fishSize * 0.5);
            // Cola
            sceneRef.waterGraphics.beginPath();
            sceneRef.waterGraphics.moveTo(fishX - fishSize, fishY);
            sceneRef.waterGraphics.lineTo(fishX - fishSize - 10, fishY - 8);
            sceneRef.waterGraphics.lineTo(fishX - fishSize - 10, fishY + 8);
            sceneRef.waterGraphics.closePath();
            sceneRef.waterGraphics.fillPath();
            // Ojo
            sceneRef.waterGraphics.fillStyle(0xFFFFFF, 1);
            sceneRef.waterGraphics.fillCircle(fishX + fishSize * 0.4, fishY - 2, 3);
            sceneRef.waterGraphics.fillStyle(0x000000, 1);
            sceneRef.waterGraphics.fillCircle(fishX + fishSize * 0.45, fishY - 2, 1.5);
        }

        // Corrientes de agua (partículas moviéndose)
        sceneRef.waterGraphics.lineStyle(2, 0x66BBDD, 0.3);
        for (let i = 0; i < 8; i++) {
            const cx = (Date.now()/20 + i * 100) % (game.scale.width + 200) - 100;
            const cy = 150 + i * 60;
            sceneRef.waterGraphics.lineBetween(cx, cy, cx + 50, cy + Math.sin(Date.now()/300 + i) * 10);
        }

        // Aplicar corriente a ragdolls
        ragdolls.forEach(r => r.parts.forEach(p => {
            if (p?.body) {
                const currentForce = Math.sin(Date.now()/1000) * 0.1;
                p.setVelocity(p.body.velocity.x + currentForce, p.body.velocity.y);
            }
        }));

    } else if (sceneRef.waterGraphics) {
        sceneRef.waterGraphics.clear();
    }

    // Lava - VOLCÁN con partículas de fuego y daño
    if (currentMap === 'lava') {
        if (!sceneRef.lavaGraphics) {
            sceneRef.lavaGraphics = sceneRef.add.graphics();
            sceneRef.lavaGraphics.setDepth(-6);
        }
        sceneRef.lavaGraphics.clear();

        // VOLCÁN DE FONDO
        const volcanoX = game.scale.width / 2;
        const volcanoBase = game.scale.height - 50;
        const volcanoTop = 100;

        // Cuerpo del volcán (montaña gris oscuro)
        sceneRef.lavaGraphics.fillStyle(0x3A3A3A, 1);
        sceneRef.lavaGraphics.beginPath();
        sceneRef.lavaGraphics.moveTo(volcanoX - 200, volcanoBase);
        sceneRef.lavaGraphics.lineTo(volcanoX - 40, volcanoTop);
        sceneRef.lavaGraphics.lineTo(volcanoX + 40, volcanoTop);
        sceneRef.lavaGraphics.lineTo(volcanoX + 200, volcanoBase);
        sceneRef.lavaGraphics.closePath();
        sceneRef.lavaGraphics.fillPath();

        // Cráter con lava
        sceneRef.lavaGraphics.fillStyle(0x2A2A2A, 1);
        sceneRef.lavaGraphics.fillRect(volcanoX - 35, volcanoTop - 10, 70, 25);
        sceneRef.lavaGraphics.fillStyle(0xFF4400, 0.9);
        sceneRef.lavaGraphics.fillRect(volcanoX - 30, volcanoTop, 60, 15);
        sceneRef.lavaGraphics.fillStyle(0xFFFF00, 0.7);
        sceneRef.lavaGraphics.fillRect(volcanoX - 20, volcanoTop + 3, 40, 8);

        // Lava cayendo por el volcán
        const lavaFlow = Math.sin(Date.now()/500) * 10;
        sceneRef.lavaGraphics.fillStyle(0xFF4400, 0.8);
        sceneRef.lavaGraphics.beginPath();
        sceneRef.lavaGraphics.moveTo(volcanoX - 15, volcanoTop + 15);
        sceneRef.lavaGraphics.lineTo(volcanoX - 30 + lavaFlow, volcanoBase - 50);
        sceneRef.lavaGraphics.lineTo(volcanoX + lavaFlow, volcanoBase - 50);
        sceneRef.lavaGraphics.lineTo(volcanoX + 15, volcanoTop + 15);
        sceneRef.lavaGraphics.closePath();
        sceneRef.lavaGraphics.fillPath();

        // Humo/ceniza saliendo del volcán
        for (let i = 0; i < 6; i++) {
            const smokeY = volcanoTop - 30 - i * 25 - ((Date.now()/30) % 50);
            const smokeX = volcanoX + Math.sin(Date.now()/300 + i) * 20;
            const smokeSize = 20 + i * 8;
            sceneRef.lavaGraphics.fillStyle(0x555555, 0.4 - i * 0.05);
            sceneRef.lavaGraphics.fillCircle(smokeX, smokeY, smokeSize);
        }

        // Chispas/brasas volando
        for (let i = 0; i < 10; i++) {
            const sparkX = volcanoX + ((Date.now()/10 + i * 50) % 100) - 50;
            const sparkY = volcanoTop - ((Date.now()/5 + i * 30) % 150);
            const sparkSize = 2 + (i % 3);
            sceneRef.lavaGraphics.fillStyle(i % 2 === 0 ? 0xFF6600 : 0xFFFF00, 0.8);
            sceneRef.lavaGraphics.fillCircle(sparkX, sparkY, sparkSize);
        }

        // Lava burbujeante en el suelo
        for (let i = 0; i < 8; i++) {
            const lx = (i * 120) % game.scale.width;
            const bubble = Math.sin(Date.now()/200 + i) * 10;
            sceneRef.lavaGraphics.fillStyle(0xFF4400, 0.8);
            sceneRef.lavaGraphics.fillCircle(lx, game.scale.height - 30 + bubble, 15 + bubble/2);
            sceneRef.lavaGraphics.fillStyle(0xFFFF00, 0.5);
            sceneRef.lavaGraphics.fillCircle(lx, game.scale.height - 35 + bubble, 8);
        }

        // Si ragdoll toca el fondo, lanzarlo
        ragdolls.forEach(r => r.parts.forEach(p => {
            if (p?.body && p.y > game.scale.height - 70) {
                p.setVelocity(p.body.velocity.x, -15);
                spawnBlood(p.x, p.y, 2);
            }
        }));
    } else if (sceneRef.lavaGraphics) {
        sceneRef.lavaGraphics.clear();
    }

    // Hielo - ANTÁRTIDA con mucha nieve
    if (currentMap === 'hielo') {
        if (!sceneRef.iceGraphics) {
            sceneRef.iceGraphics = sceneRef.add.graphics();
            sceneRef.iceGraphics.setDepth(1);
        }
        sceneRef.iceGraphics.clear();

        // MUCHA nieve cayendo (60 copos)
        for (let i = 0; i < 60; i++) {
            const windOffset = Math.sin(Date.now()/2000) * 50;
            const sx = (i * 43 + Date.now()/25 + windOffset) % game.scale.width;
            const sy = (Date.now()/15 + i * 30) % game.scale.height;
            const size = 1 + (i % 4);
            sceneRef.iceGraphics.fillStyle(0xFFFFFF, 0.9);
            sceneRef.iceGraphics.fillCircle(sx, sy, size);
        }

        // Icebergs/montañas de hielo en el fondo
        sceneRef.iceGraphics.fillStyle(0xD4F1F9, 0.8);
        sceneRef.iceGraphics.beginPath();
        sceneRef.iceGraphics.moveTo(50, game.scale.height - 60);
        sceneRef.iceGraphics.lineTo(100, game.scale.height - 150);
        sceneRef.iceGraphics.lineTo(150, game.scale.height - 60);
        sceneRef.iceGraphics.closePath();
        sceneRef.iceGraphics.fillPath();

        sceneRef.iceGraphics.fillStyle(0xE8F4F8, 0.7);
        sceneRef.iceGraphics.beginPath();
        sceneRef.iceGraphics.moveTo(game.scale.width - 180, game.scale.height - 60);
        sceneRef.iceGraphics.lineTo(game.scale.width - 120, game.scale.height - 180);
        sceneRef.iceGraphics.lineTo(game.scale.width - 60, game.scale.height - 60);
        sceneRef.iceGraphics.closePath();
        sceneRef.iceGraphics.fillPath();

        // Pingüino de fondo
        const pengX = game.scale.width - 250;
        const pengY = game.scale.height - 90;
        // Cuerpo
        sceneRef.iceGraphics.fillStyle(0x000000, 1);
        sceneRef.iceGraphics.fillEllipse(pengX, pengY, 15, 25);
        // Panza blanca
        sceneRef.iceGraphics.fillStyle(0xFFFFFF, 1);
        sceneRef.iceGraphics.fillEllipse(pengX, pengY + 5, 10, 18);
        // Cabeza
        sceneRef.iceGraphics.fillStyle(0x000000, 1);
        sceneRef.iceGraphics.fillCircle(pengX, pengY - 20, 10);
        // Ojos
        sceneRef.iceGraphics.fillStyle(0xFFFFFF, 1);
        sceneRef.iceGraphics.fillCircle(pengX - 4, pengY - 22, 3);
        sceneRef.iceGraphics.fillCircle(pengX + 4, pengY - 22, 3);
        // Pico
        sceneRef.iceGraphics.fillStyle(0xFFA500, 1);
        sceneRef.iceGraphics.fillTriangle(pengX, pengY - 18, pengX - 4, pengY - 15, pengX + 4, pengY - 15);

        // Nieve acumulada en el suelo
        sceneRef.iceGraphics.fillStyle(0xFFFFFF, 0.6);
        for (let i = 0; i < game.scale.width; i += 30) {
            const snowPile = Math.sin(i * 0.1 + Date.now()/5000) * 5 + 10;
            sceneRef.iceGraphics.fillCircle(i, game.scale.height - 55, snowPile);
        }

        // Hacer que ragdolls resbalen mucho
        ragdolls.forEach(r => r.parts.forEach(p => {
            if (p?.body && p.y > game.scale.height - 80) {
                p.setVelocity(p.body.velocity.x * 1.02, p.body.velocity.y);
            }
        }));
    } else if (sceneRef.iceGraphics) {
        sceneRef.iceGraphics.clear();
    }

    // Desierto - cactus, dunas y lagartijas
    if (currentMap === 'desierto') {
        if (!sceneRef.desertGraphics) {
            sceneRef.desertGraphics = sceneRef.add.graphics();
            sceneRef.desertGraphics.setDepth(-6);
        }
        sceneRef.desertGraphics.clear();

        const w = game.scale.width;
        const h = game.scale.height;
        const groundY = h - 50;

        // === DUNAS EN EL FONDO ===
        sceneRef.desertGraphics.fillStyle(0xE8A030, 0.6);
        sceneRef.desertGraphics.fillEllipse(w * 0.2, groundY - 30, 150, 40);
        sceneRef.desertGraphics.fillEllipse(w * 0.6, groundY - 25, 180, 35);
        sceneRef.desertGraphics.fillEllipse(w * 0.85, groundY - 35, 120, 45);

        // === CACTUS (3 en diferentes posiciones) ===
        const cactusPositions = [
            { x: 100, size: 1 },
            { x: w * 0.5, size: 1.2 },
            { x: w - 120, size: 0.9 }
        ];

        cactusPositions.forEach(cactus => {
            const cx = cactus.x;
            const s = cactus.size;
            const sway = Math.sin(Date.now()/2000 + cx) * 2;

            // Cuerpo principal del cactus
            sceneRef.desertGraphics.fillStyle(0x228B22, 1);
            sceneRef.desertGraphics.fillRect(cx - 12 * s, groundY - 80 * s, 24 * s, 80 * s);
            // Parte superior redondeada
            sceneRef.desertGraphics.fillCircle(cx, groundY - 80 * s, 12 * s);

            // Brazo izquierdo
            sceneRef.desertGraphics.fillRect(cx - 30 * s, groundY - 60 * s, 20 * s, 12 * s);
            sceneRef.desertGraphics.fillRect(cx - 32 * s, groundY - 70 * s, 14 * s, 25 * s);
            sceneRef.desertGraphics.fillCircle(cx - 25 * s, groundY - 70 * s, 7 * s);

            // Brazo derecho
            sceneRef.desertGraphics.fillRect(cx + 10 * s, groundY - 45 * s, 20 * s, 12 * s);
            sceneRef.desertGraphics.fillRect(cx + 22 * s, groundY - 60 * s, 14 * s, 30 * s);
            sceneRef.desertGraphics.fillCircle(cx + 29 * s, groundY - 60 * s, 7 * s);

            // Lineas del cactus (textura)
            sceneRef.desertGraphics.lineStyle(1, 0x1A6B1A, 0.5);
            for (let i = 0; i < 4; i++) {
                sceneRef.desertGraphics.lineBetween(
                    cx - 8 * s + i * 5 * s, groundY - 75 * s,
                    cx - 8 * s + i * 5 * s, groundY - 5 * s
                );
            }

            // Espinas (pequeños puntos)
            sceneRef.desertGraphics.fillStyle(0xFFFFAA, 0.8);
            for (let spine = 0; spine < 8; spine++) {
                const spineX = cx + (Math.random() - 0.5) * 20 * s;
                const spineY = groundY - 20 * s - Math.random() * 55 * s;
                sceneRef.desertGraphics.fillCircle(spineX, spineY, 1.5);
            }
        });

        // === LAGARTIJA CORRIENDO (decorativa) ===
        const lizardX = 250 + Math.sin(Date.now()/1500) * 100;
        const lizardY = groundY - 8;
        const lizardDir = Math.cos(Date.now()/1500) > 0 ? 1 : -1;

        // Cuerpo
        sceneRef.desertGraphics.fillStyle(0x8B7355, 1);
        sceneRef.desertGraphics.fillEllipse(lizardX, lizardY, 15, 6);
        // Cabeza
        sceneRef.desertGraphics.fillEllipse(lizardX + 12 * lizardDir, lizardY - 1, 6, 4);
        // Cola
        sceneRef.desertGraphics.lineStyle(3, 0x8B7355, 1);
        sceneRef.desertGraphics.lineBetween(lizardX - 12 * lizardDir, lizardY, lizardX - 25 * lizardDir, lizardY + 3);
        // Patas (animadas)
        const legAnim = Math.sin(Date.now()/100) * 3;
        sceneRef.desertGraphics.lineStyle(2, 0x8B7355, 1);
        sceneRef.desertGraphics.lineBetween(lizardX - 5, lizardY + 3, lizardX - 10, lizardY + 8 + legAnim);
        sceneRef.desertGraphics.lineBetween(lizardX + 5, lizardY + 3, lizardX + 10, lizardY + 8 - legAnim);
        // Ojo
        sceneRef.desertGraphics.fillStyle(0x000000, 1);
        sceneRef.desertGraphics.fillCircle(lizardX + 14 * lizardDir, lizardY - 2, 1.5);

        // === ONDAS DE CALOR (efecto visual) ===
        sceneRef.desertGraphics.lineStyle(1, 0xFFFFFF, 0.15);
        for (let wave = 0; wave < 5; wave++) {
            const waveY = groundY - 100 - wave * 30;
            sceneRef.desertGraphics.beginPath();
            sceneRef.desertGraphics.moveTo(0, waveY);
            for (let wx = 0; wx < w; wx += 20) {
                const offset = Math.sin(Date.now()/500 + wx * 0.02 + wave) * 5;
                sceneRef.desertGraphics.lineTo(wx, waveY + offset);
            }
            sceneRef.desertGraphics.strokePath();
        }

        // === CALAVERA DE VACA (decorativa) ===
        const skullX = w - 80;
        const skullY = groundY - 12;
        sceneRef.desertGraphics.fillStyle(0xFFFACD, 1);
        sceneRef.desertGraphics.fillEllipse(skullX, skullY, 12, 8);
        // Cuernos
        sceneRef.desertGraphics.lineStyle(3, 0xFFFACD, 1);
        sceneRef.desertGraphics.lineBetween(skullX - 10, skullY - 3, skullX - 18, skullY - 10);
        sceneRef.desertGraphics.lineBetween(skullX + 10, skullY - 3, skullX + 18, skullY - 10);
        // Ojos (huecos)
        sceneRef.desertGraphics.fillStyle(0x000000, 1);
        sceneRef.desertGraphics.fillCircle(skullX - 4, skullY - 2, 2);
        sceneRef.desertGraphics.fillCircle(skullX + 4, skullY - 2, 2);
        // Nariz
        sceneRef.desertGraphics.fillCircle(skullX, skullY + 3, 1.5);

    } else if (sceneRef.desertGraphics) {
        sceneRef.desertGraphics.clear();
    }

    // Playa - palmeras con cocos y agua con fisica
    if (currentMap === 'playa') {
        if (!sceneRef.beachGraphics) {
            sceneRef.beachGraphics = sceneRef.add.graphics();
            sceneRef.beachGraphics.setDepth(-6);
        }
        sceneRef.beachGraphics.clear();

        const w = game.scale.width;
        const h = game.scale.height;
        const groundY = h - 50;
        const waterStartX = w * 0.65; // El agua empieza a 2/3 de la pantalla

        // === PALMERAS CON COCOS (izquierda, 2 palmeras) ===
        const palmPositions = [80, 180];
        palmPositions.forEach((palmX, idx) => {
            const sway = Math.sin(Date.now()/1500 + idx) * 5;

            // Tronco de palmera (curvo)
            sceneRef.beachGraphics.lineStyle(18, 0x8B4513, 1);
            sceneRef.beachGraphics.beginPath();
            sceneRef.beachGraphics.moveTo(palmX, groundY - 10);
            sceneRef.beachGraphics.quadraticCurveTo(
                palmX + 15 + sway, groundY - 80,
                palmX + 10 + sway, groundY - 150
            );
            sceneRef.beachGraphics.strokePath();

            // Textura del tronco (anillos)
            sceneRef.beachGraphics.lineStyle(2, 0x6B3410, 0.5);
            for (let ring = 0; ring < 8; ring++) {
                const ringY = groundY - 20 - ring * 18;
                const ringX = palmX + 5 + (ring / 8) * (10 + sway);
                sceneRef.beachGraphics.lineBetween(ringX - 8, ringY, ringX + 8, ringY);
            }

            // Hojas de palmera
            const leafTopX = palmX + 10 + sway;
            const leafTopY = groundY - 150;
            const leafAngles = [-2.5, -1.8, -1, -0.3, 0.3, 1, 1.8, 2.5];
            leafAngles.forEach((angle, i) => {
                const leafSway = Math.sin(Date.now()/800 + idx + i) * 3;
                const leafLen = 60 + (i % 3) * 15;
                const endX = leafTopX + Math.cos(angle) * leafLen + leafSway;
                const endY = leafTopY + Math.sin(angle) * leafLen * 0.5 - 20;

                // Hoja principal
                sceneRef.beachGraphics.lineStyle(4, 0x228B22, 0.9);
                sceneRef.beachGraphics.beginPath();
                sceneRef.beachGraphics.moveTo(leafTopX, leafTopY);
                sceneRef.beachGraphics.quadraticCurveTo(
                    leafTopX + Math.cos(angle) * leafLen * 0.5 + leafSway,
                    leafTopY + Math.sin(angle) * leafLen * 0.3 - 30,
                    endX, endY
                );
                sceneRef.beachGraphics.strokePath();

                // Segmentos de la hoja
                sceneRef.beachGraphics.lineStyle(2, 0x32CD32, 0.7);
                for (let seg = 0.3; seg < 1; seg += 0.15) {
                    const segX = leafTopX + (endX - leafTopX) * seg;
                    const segY = leafTopY + (endY - leafTopY) * seg - 10 * (1 - seg);
                    sceneRef.beachGraphics.lineBetween(segX, segY, segX + 8, segY + 6);
                    sceneRef.beachGraphics.lineBetween(segX, segY, segX - 8, segY + 6);
                }
            });

            // Cocos (no caen, son decorativos)
            const cocoPositions = [
                { x: leafTopX - 8, y: leafTopY + 5 },
                { x: leafTopX + 5, y: leafTopY + 8 },
                { x: leafTopX - 2, y: leafTopY + 12 }
            ];
            cocoPositions.forEach(coco => {
                // Coco marrón
                sceneRef.beachGraphics.fillStyle(0x8B4513, 1);
                sceneRef.beachGraphics.fillCircle(coco.x + sway * 0.5, coco.y, 8);
                // Brillo
                sceneRef.beachGraphics.fillStyle(0xA0522D, 0.6);
                sceneRef.beachGraphics.fillCircle(coco.x + sway * 0.5 - 2, coco.y - 2, 3);
            });
        });

        // === AGUA EN 1/3 DERECHA INFERIOR ===
        const waterHeight = h / 3;
        const waterY = h - waterHeight;

        // Fondo del agua (azul profundo)
        sceneRef.beachGraphics.fillStyle(0x1E90FF, 0.7);
        sceneRef.beachGraphics.fillRect(waterStartX, waterY, w - waterStartX, waterHeight);

        // Gradiente más claro arriba
        sceneRef.beachGraphics.fillStyle(0x87CEEB, 0.4);
        sceneRef.beachGraphics.fillRect(waterStartX, waterY, w - waterStartX, waterHeight * 0.3);

        // Olas animadas en la superficie
        const waveTime = Date.now() / 500;
        sceneRef.beachGraphics.fillStyle(0xADD8E6, 0.8);
        sceneRef.beachGraphics.beginPath();
        sceneRef.beachGraphics.moveTo(waterStartX - 20, waterY + 15);
        for (let wx = waterStartX - 20; wx <= w; wx += 10) {
            const waveY = waterY + Math.sin(waveTime + wx * 0.02) * 8;
            sceneRef.beachGraphics.lineTo(wx, waveY);
        }
        sceneRef.beachGraphics.lineTo(w, h);
        sceneRef.beachGraphics.lineTo(waterStartX - 20, h);
        sceneRef.beachGraphics.closePath();
        sceneRef.beachGraphics.fillPath();

        // Espuma de las olas
        sceneRef.beachGraphics.fillStyle(0xFFFFFF, 0.7);
        for (let foam = 0; foam < 5; foam++) {
            const foamX = waterStartX + foam * 30 + Math.sin(waveTime + foam) * 10;
            const foamY = waterY + Math.sin(waveTime + foam * 0.5) * 5;
            sceneRef.beachGraphics.fillEllipse(foamX, foamY, 15 + foam * 2, 5);
        }

        // Brillos en el agua
        sceneRef.beachGraphics.fillStyle(0xFFFFFF, 0.4);
        for (let sparkle = 0; sparkle < 8; sparkle++) {
            const sx = waterStartX + 30 + (sparkle * 50 + Date.now()/100) % (w - waterStartX - 30);
            const sy = waterY + 30 + (sparkle * 40) % (waterHeight - 50);
            const sparkleSize = 2 + Math.sin(Date.now()/200 + sparkle) * 1;
            sceneRef.beachGraphics.fillCircle(sx, sy, sparkleSize);
        }

        // === FISICA DEL AGUA ===
        // Ragdolls flotan cuando estan en el agua
        ragdolls.forEach(r => r.parts.forEach(p => {
            if (p?.body) {
                const inWater = p.x > waterStartX && p.y > waterY;
                if (inWater) {
                    // Flotar (empujar hacia arriba)
                    const floatForce = -0.4;
                    const drag = 0.95; // Resistencia del agua
                    p.setVelocity(
                        p.body.velocity.x * drag,
                        p.body.velocity.y * drag + floatForce
                    );

                    // Burbujas ocasionales
                    if (Math.random() < 0.02) {
                        sceneRef.beachGraphics.fillStyle(0xADD8E6, 0.6);
                        sceneRef.beachGraphics.fillCircle(p.x + (Math.random() - 0.5) * 10, p.y - 10, 3);
                    }
                }
            }
        }));

        // Armas tambien flotan
        weapons.forEach(weapon => {
            if (weapon.body) {
                const inWater = weapon.x > waterStartX && weapon.y > waterY;
                if (inWater) {
                    sceneRef.matter.body.setVelocity(weapon.body, {
                        x: weapon.body.velocity.x * 0.95,
                        y: weapon.body.velocity.y * 0.95 - 0.2
                    });
                }
            }
        });

        // === CANGREJOS CAMINANDO (decorativos, fondo - NPCs no los tocan) ===
        // Cangrejo 1 - cerca del agua
        const crab1X = waterStartX - 50 + Math.sin(Date.now()/2000) * 30;
        const crab1Y = groundY - 15;
        drawCrab(sceneRef.beachGraphics, crab1X, crab1Y, 0xFF6347);

        // Cangrejo 2 - más a la izquierda, va en dirección opuesta
        const crab2X = 280 + Math.sin(Date.now()/2500 + 2) * 40;
        const crab2Y = groundY - 12;
        drawCrab(sceneRef.beachGraphics, crab2X, crab2Y, 0xFF4500);

        // Cangrejo 3 - pequeño cerca de las palmeras
        const crab3X = 120 + Math.sin(Date.now()/3000 + 4) * 25;
        const crab3Y = groundY - 10;
        drawCrab(sceneRef.beachGraphics, crab3X, crab3Y, 0xE9967A, 0.7);

    } else if (sceneRef.beachGraphics) {
        sceneRef.beachGraphics.clear();
    }

    // === EFECTOS DE NUEVAS ARMAS ===

    // Imán - atrae ragdolls
    weapons.forEach(weapon => {
        if (weapon.type === 'iman' && weapon.isActive) {
            ragdolls.forEach(r => r.parts.forEach(p => {
                if (p?.body) {
                    const dx = weapon.x - p.x;
                    const dy = weapon.y - p.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 200 && dist > 30) {
                        const force = 0.3 * (1 - dist/200);
                        p.setVelocity(p.body.velocity.x + dx/dist * force, p.body.velocity.y + dy/dist * force);
                    }
                }
            }));
        }
    });

    // Ventilador - sopla ragdolls
    weapons.forEach(weapon => {
        if (weapon.type === 'ventilador' && weapon.isOn) {
            // Actualizar aspas giratorias
            weapon.graphics.clear();
            weapon.graphics.fillStyle(0x666666, 1);
            weapon.graphics.fillRect(-20, -25, 40, 50);
            weapon.graphics.fillStyle(0x333333, 1);
            weapon.graphics.fillCircle(0, 0, 15);
            weapon.graphics.fillStyle(0xAAAAAA, 1);
            for (let a = 0; a < 3; a++) {
                const angle = a * Math.PI * 2 / 3 + Date.now()/50;
                weapon.graphics.fillEllipse(Math.cos(angle) * 8, Math.sin(angle) * 8, 12, 5);
            }

            // Soplar hacia arriba
            ragdolls.forEach(r => r.parts.forEach(p => {
                if (p?.body) {
                    const dx = p.x - weapon.x;
                    const dy = p.y - weapon.y;
                    if (Math.abs(dx) < 80 && dy < 0 && dy > -200) {
                        p.setVelocity(p.body.velocity.x + dx * 0.01, p.body.velocity.y - 0.8);
                    }
                }
            }));
        }
    });

    // Portal - teletransportar
    if (portals.length >= 2) {
        ragdolls.forEach(r => r.parts.forEach(p => {
            if (p?.body && !p.justTeleported) {
                for (let i = 0; i < portals.length; i++) {
                    const portal = portals[i];
                    const dist = Phaser.Math.Distance.Between(p.x, p.y, portal.x, portal.y);
                    if (dist < 25) {
                        const otherPortal = portals[(i + 1) % portals.length];
                        p.setPosition(otherPortal.x, otherPortal.y);
                        p.justTeleported = true;
                        setTimeout(() => { if (p) p.justTeleported = false; }, 500);
                        break;
                    }
                }
            }
        }));
    }

    // Lanzallamas - disparar fuego
    weapons.forEach(weapon => {
        if (weapon.type === 'lanzallamas' && weapon.isFiring && weapon.fuel > 0) {
            weapon.fuel--;
            const angle = weapon.body.angle;
            const fx = weapon.x + Math.cos(angle) * 30;
            const fy = weapon.y + Math.sin(angle) * 30;

            // Partícula de fuego
            const fire = sceneRef.add.graphics();
            fire.fillStyle(Math.random() > 0.5 ? 0xFF6600 : 0xFFFF00, 0.8);
            fire.fillCircle(0, 0, 5 + Math.random() * 5);
            fire.setPosition(fx, fy);
            fire.setDepth(20);

            sceneRef.tweens.add({
                targets: fire,
                x: fx + Math.cos(angle) * 100,
                y: fy + Math.sin(angle) * 100,
                alpha: 0,
                scale: 0.5,
                duration: 300,
                onComplete: () => fire.destroy()
            });

            // Empujar ragdolls cercanos
            ragdolls.forEach(r => r.parts.forEach(p => {
                if (p?.body) {
                    const dist = Phaser.Math.Distance.Between(fx, fy, p.x, p.y);
                    if (dist < 60) {
                        p.setVelocity(p.body.velocity.x + Math.cos(angle) * 2, p.body.velocity.y + Math.sin(angle) * 2);
                        if (Math.random() < 0.3) spawnBlood(p.x, p.y, 1);
                    }
                }
            }));
        }
    });
}

function spawnLightning() {
    const lx = Math.random() * game.scale.width;
    const ly = 0;

    // Gráfico del rayo
    const lightning = sceneRef.add.graphics();
    lightning.setDepth(100);
    lightning.lineStyle(4, 0xFFFF00, 1);

    let cx = lx;
    let cy = ly;
    lightning.moveTo(cx, cy);

    while (cy < game.scale.height - 50) {
        cx += (Math.random() - 0.5) * 60;
        cy += 30 + Math.random() * 40;
        lightning.lineTo(cx, cy);
    }
    lightning.strokePath();

    // Destello
    const flash = sceneRef.add.graphics();
    flash.setDepth(99);
    flash.fillStyle(0xFFFFFF, 0.3);
    flash.fillRect(0, 0, game.scale.width, game.scale.height);

    // Daño a ragdolls cercanos
    ragdolls.forEach(ragdoll => {
        ragdoll.parts.forEach(part => {
            if (part && part.body) {
                const dist = Math.abs(part.x - cx);
                if (dist < 50) {
                    part.setVelocity(
                        (Math.random() - 0.5) * 20,
                        -15
                    );
                    spawnBlood(part.x, part.y, 3);
                }
            }
        });
    });

    // Sonido de trueno
    playThunderSound();

    // Eliminar gráficos
    sceneRef.time.delayedCall(100, () => {
        lightning.destroy();
        flash.destroy();
    });
}

function playThunderSound() {
    if (!audioContext) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + 0.5);
    gain.gain.setValueAtTime(0.4, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.8);
}

function updateWeapons() {
    weapons.forEach(weapon => {
        if (weapon.body) {
            weapon.x = weapon.body.position.x;
            weapon.y = weapon.body.position.y;
            weapon.graphics.setPosition(weapon.x, weapon.y);
            weapon.graphics.setRotation(weapon.body.angle);

            // Actualizar posición del timer de granada
            if (weapon.type === 'granada' && weapon.timerText) {
                weapon.timerText.setPosition(weapon.x, weapon.y - 25);
            }
        }
    });
}

function shootBullet(weapon) {
    if (weapon.type !== 'pistola') return;

    const angle = weapon.body.angle;
    const speed = 15;
    const startX = weapon.x + Math.cos(angle) * 35;
    const startY = weapon.y + Math.sin(angle) * 35;

    const bullet = sceneRef.add.graphics();
    bullet.fillStyle(0xFFD700, 1);
    bullet.fillCircle(0, 0, 4);
    bullet.setPosition(startX, startY);
    bullet.setDepth(15);

    bullets.push({
        graphics: bullet,
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifetime: 120
    });

    playGunSound();
}

function playGunSound() {
    if (!audioContext) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const noise = audioContext.createOscillator();
    const noiseGain = audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    noise.type = 'sawtooth';
    noise.frequency.setValueAtTime(100, audioContext.currentTime);
    noiseGain.gain.setValueAtTime(0.2, audioContext.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioContext.destination);
    noise.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    osc.start();
    noise.start();
    osc.stop(audioContext.currentTime + 0.15);
    noise.stop(audioContext.currentTime + 0.1);
}

function updateBlink() {
    const now = Date.now();

    ragdolls.forEach(ragdoll => {
        const head = ragdoll.parts[0];
        if (!head || !ragdoll.eyelids) return;

        // Actualizar posición de párpados
        ragdoll.eyelids.setPosition(head.x, head.y);
        ragdoll.eyelids.setRotation(head.rotation);

        // Actualizar posición del cerebro zombie
        if (ragdoll.brainGraphics) {
            ragdoll.brainGraphics.setPosition(head.x, head.y);
            ragdoll.brainGraphics.setRotation(head.rotation);
        }

        // Parpadear cada 30 segundos
        const timeSinceLastBlink = now - ragdoll.lastBlinkTime;

        if (timeSinceLastBlink >= 30000 && !ragdoll.isBlinking) {
            // Iniciar parpadeo
            ragdoll.isBlinking = true;
            ragdoll.eyelids.setVisible(true);

            // Cerrar párpados por 150ms
            setTimeout(() => {
                if (ragdoll.eyelids) {
                    ragdoll.eyelids.setVisible(false);
                    ragdoll.isBlinking = false;
                    ragdoll.lastBlinkTime = Date.now();
                }
            }, 150);
        }
    });
}

function updateBullets() {
    const groundY = Math.max(game.scale.height, window.innerHeight) - 50;

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        bullet.lifetime--;

        bullet.graphics.setPosition(bullet.x, bullet.y);

        // Verificar colisión con ragdolls
        let hitRagdoll = false;
        ragdolls.forEach(ragdoll => {
            if (hitRagdoll) return;

            ragdoll.parts.forEach(part => {
                if (part && part.body && !hitRagdoll) {
                    const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, part.x, part.y);
                    if (dist < 20) {
                        hitRagdoll = true;

                        // Aplicar fuerza al impacto
                        part.setVelocity(bullet.vx * 0.5, bullet.vy * 0.5);

                        // Efecto de sangre
                        spawnBlood(bullet.x, bullet.y, 5);
                        playHitSound(0.5);
                    }
                }
            });
        });

        // Eliminar bala si golpeó algo, salió de pantalla o expiró
        if (hitRagdoll || bullet.lifetime <= 0 ||
            bullet.x < 0 || bullet.x > game.scale.width ||
            bullet.y < 0 || bullet.y > groundY) {
            bullet.graphics.destroy();
            bullets.splice(i, 1);
        }
    }
}

function damageRagdollAt(x, y, damage) {
    ragdolls.forEach(ragdoll => {
        if (ragdoll.isDead) return;

        ragdoll.parts.forEach(part => {
            if (part && part.body) {
                const dist = Phaser.Math.Distance.Between(x, y, part.x, part.y);
                if (dist < 50) {
                    ragdoll.health -= damage;
                    if (ragdoll.health < 0) ragdoll.health = 0;

                    updateHealthBar(ragdoll);

                    if (ragdoll.health <= 0 && !ragdoll.isDead) {
                        killRagdoll(ragdoll);
                    }
                }
            }
        });
    });
}

function updateHealthBar(ragdoll) {
    const head = ragdoll.parts[0];
    if (!head || !ragdoll.healthBar || !ragdoll.healthBg) return;

    // Posicionar encima de la cabeza
    ragdoll.healthBg.setPosition(head.x - 20, head.y - 35);
    ragdoll.healthBar.setPosition(head.x - 20, head.y - 35);

    // Actualizar tamaño y color
    ragdoll.healthBar.clear();
    const healthPercent = ragdoll.health / ragdoll.maxHealth;
    const barWidth = 38 * healthPercent;

    // Color según vida
    let color = 0x00FF00;
    if (healthPercent < 0.3) color = 0xFF0000;
    else if (healthPercent < 0.6) color = 0xFFFF00;

    ragdoll.healthBar.fillStyle(color, 1);
    ragdoll.healthBar.fillRect(0, 0, barWidth, 6);

    ragdoll.healthBg.clear();
    ragdoll.healthBg.fillStyle(0x333333, 1);
    ragdoll.healthBg.fillRect(0, 0, 40, 8);
}

function killRagdoll(ragdoll) {
    ragdoll.isDead = true;

    // Cambiar ojos a X
    const head = ragdoll.parts[0];
    if (head) {
        // Crear X en los ojos
        const deadEyes = sceneRef.add.text(head.x, head.y - 2, 'X X', {
            font: 'bold 10px Arial',
            fill: '#000000'
        }).setOrigin(0.5);
        deadEyes.setDepth(60);
        ragdoll.deadEyes = deadEyes;

        // Mostrar "womp womp"
        const wompText = sceneRef.add.text(head.x, head.y - 50, 'womp womp', {
            font: 'bold 18px Arial',
            fill: '#000000',
            stroke: '#FFFFFF',
            strokeThickness: 3
        }).setOrigin(0.5);
        wompText.setDepth(100);

        // Sonido womp womp
        playWompSound();

        // Animar texto
        sceneRef.tweens.add({
            targets: wompText,
            y: wompText.y - 30,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => wompText.destroy()
        });
    }
}

function playWompSound() {
    if (!audioContext) return;
    try {
        const now = audioContext.currentTime;

        // Primer womp
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(200, now);
        osc1.frequency.linearRampToValueAtTime(100, now + 0.3);
        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Segundo womp
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(180, now + 0.35);
        osc2.frequency.linearRampToValueAtTime(80, now + 0.7);
        gain2.gain.setValueAtTime(0.4, now + 0.35);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.start(now + 0.35);
        osc2.stop(now + 0.7);
    } catch (e) {}
}

function updateAllHealthBars() {
    ragdolls.forEach(ragdoll => {
        const head = ragdoll.parts[0];
        if (head && ragdoll.healthBg && ragdoll.healthBar) {
            ragdoll.healthBg.setPosition(head.x - 20, head.y - 35);

            ragdoll.healthBar.clear();
            const healthPercent = ragdoll.health / ragdoll.maxHealth;
            const barWidth = 38 * healthPercent;

            let color = 0x00FF00;
            if (healthPercent < 0.3) color = 0xFF0000;
            else if (healthPercent < 0.6) color = 0xFFFF00;

            ragdoll.healthBar.fillStyle(color, 1);
            ragdoll.healthBar.fillRect(0, 0, barWidth, 6);
        }

        // Actualizar posición de ojos muertos
        if (ragdoll.isDead && ragdoll.deadEyes && head) {
            ragdoll.deadEyes.setPosition(head.x, head.y - 2);
        }
    });
}

// ============================================
// SISTEMA DE TIENDA Y CREADOR
// ============================================

function toggleExitMenu() {
    exitMenuOpen = !exitMenuOpen;
    exitMenu.setVisible(exitMenuOpen);
    if (weaponMenuOpen) {
        weaponMenu.setVisible(false);
        weaponMenuOpen = false;
    }
    if (mapMenuOpen) {
        mapMenu.setVisible(false);
        mapMenuOpen = false;
    }
}

function updateMayhemsDisplay() {
    if (mayhemsText) {
        mayhemsText.setText('💎 ' + mayhems);
    }
}

function createShopMenu(scene) {
    const w = game.scale.width;
    const h = game.scale.height;

    shopMenu = scene.add.container(0, 0);
    shopMenu.setDepth(200);
    shopMenu.setVisible(false);

    // Fondo oscuro
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.98);
    bg.fillRect(0, 0, w, h);
    shopMenu.add(bg);

    // Título
    const title = scene.add.text(w/2, 30, '🛒 TIENDA', {
        font: 'bold 32px Arial',
        fill: '#FFD700'
    }).setOrigin(0.5);
    shopMenu.add(title);

    // Subtítulo
    const subtitle = scene.add.text(w/2, 60, 'Solo items que no tienes', {
        font: '14px Arial',
        fill: '#AAAAAA'
    }).setOrigin(0.5);
    shopMenu.add(subtitle);

    // Mayhems display
    const mayhemsShop = scene.add.text(w/2, 85, '💎 ' + mayhems + ' Mayhems', {
        font: 'bold 18px Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);
    shopMenu.add(mayhemsShop);
    shopMenu.mayhemsDisplay = mayhemsShop;

    // Tabs
    const tabs = ['NPCs', 'Armas', 'Mundos'];
    shopMenu.currentTab = 0;
    shopMenu.tabBtns = [];
    shopMenu.itemContainers = [];

    tabs.forEach((tab, i) => {
        const tabX = w/2 - 120 + i * 120;
        const tabBtn = scene.add.graphics();
        tabBtn.fillStyle(i === 0 ? 0x27AE60 : 0x444444, 1);
        tabBtn.fillRoundedRect(tabX - 50, 110, 100, 30, 6);
        shopMenu.add(tabBtn);
        shopMenu.tabBtns.push(tabBtn);

        const tabTxt = scene.add.text(tabX, 125, tab, {
            font: 'bold 14px Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5);
        shopMenu.add(tabTxt);

        const tabRect = scene.add.rectangle(tabX, 125, 100, 30, 0x000000, 0);
        tabRect.setInteractive();
        shopMenu.add(tabRect);
        tabRect.on('pointerdown', () => {
            shopMenu.currentTab = i;
            shopMenu.tabBtns.forEach((btn, j) => {
                btn.clear();
                btn.fillStyle(j === i ? 0x27AE60 : 0x444444, 1);
                btn.fillRoundedRect(w/2 - 170 + j * 120, 110, 100, 30, 6);
            });
            shopMenu.itemContainers.forEach((cont, j) => cont.setVisible(j === i));
        });
    });

    // Contenedores de items (se llenan dinámicamente)
    const categories = ['npcs', 'weapons', 'worlds'];
    categories.forEach((cat, catIdx) => {
        const container = scene.add.container(0, 150);
        container.setVisible(catIdx === 0);
        shopMenu.add(container);
        shopMenu.itemContainers.push(container);
    });

    // Botón cerrar
    const closeBtn = scene.add.graphics();
    closeBtn.fillStyle(0xE74C3C, 1);
    closeBtn.fillRoundedRect(w - 60, 10, 50, 50, 10);
    shopMenu.add(closeBtn);
    const closeTxt = scene.add.text(w - 35, 35, '✕', {
        font: 'bold 28px Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);
    shopMenu.add(closeTxt);
    const closeRect = scene.add.rectangle(w - 35, 35, 50, 50, 0x000000, 0);
    closeRect.setInteractive();
    shopMenu.add(closeRect);
    closeRect.on('pointerdown', () => closeShop());
}

function refreshShopItems() {
    if (!shopMenu || !shopMenu.itemContainers) return;

    const w = game.scale.width;
    const categories = ['npcs', 'weapons', 'worlds'];

    categories.forEach((cat, catIdx) => {
        const container = shopMenu.itemContainers[catIdx];
        container.removeAll(true);

        // Solo mostrar items NO desbloqueados
        const lockedItems = shopItems[cat].filter(item => !unlockedItems[cat].includes(item.id));

        if (lockedItems.length === 0) {
            const allDone = sceneRef.add.text(w/2, 50, '✅ ¡Tienes todo!', {
                font: 'bold 20px Arial',
                fill: '#2ECC71'
            }).setOrigin(0.5);
            container.add(allDone);
            return;
        }

        const cols = isMobile ? 2 : 4;
        const itemW = isMobile ? (w - 40) / 2 : 150;
        const itemH = 80;
        const startX = isMobile ? 20 : (w - cols * itemW) / 2;

        lockedItems.forEach((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * itemW;
            const y = row * (itemH + 10);

            const itemBg = sceneRef.add.graphics();
            itemBg.fillStyle(0x34495E, 1);
            itemBg.fillRoundedRect(x, y, itemW - 10, itemH, 8);
            container.add(itemBg);

            const emoji = sceneRef.add.text(x + 30, y + itemH/2, item.emoji, {
                font: '28px Arial'
            }).setOrigin(0.5);
            container.add(emoji);

            const name = sceneRef.add.text(x + 60, y + 20, item.name, {
                font: 'bold 14px Arial',
                fill: '#FFFFFF'
            });
            container.add(name);

            const realPrice = getDiscountedPrice(item.price);
            const priceText = realPrice === 0 ? 'GRATIS' : '💎 ' + realPrice;
            const price = sceneRef.add.text(x + 60, y + 45, priceText, {
                font: '12px Arial',
                fill: realPrice === 0 ? '#00FF00' : '#FFD700'
            });
            container.add(price);

            const buyRect = sceneRef.add.rectangle(x + itemW/2 - 5, y + itemH/2, itemW - 10, itemH, 0x000000, 0);
            buyRect.setInteractive();
            container.add(buyRect);
            buyRect.on('pointerdown', () => {
                if (realPrice === 0 || mayhems >= realPrice) {
                    mayhems -= realPrice;
                    unlockedItems[cat].push(item.id);
                    saveSaveData();
                    updateMayhemsDisplay();
                    shopMenu.mayhemsDisplay.setText('💎 ' + mayhems + ' Mayhems');
                    showNotification('🎉 ' + item.name + ' desbloqueado!');
                    // Refrescar para quitar el item comprado
                    refreshShopItems();
                } else {
                    showNotification('❌ No tienes suficientes Mayhems');
                }
            });
        });
    });
}

function openShop() {
    shopOpen = true;
    shopMenu.setVisible(true);
    if (shopMenu.mayhemsDisplay) {
        shopMenu.mayhemsDisplay.setText('💎 ' + mayhems + ' Mayhems');
    }
    // Refrescar items para mostrar solo los no desbloqueados
    refreshShopItems();
}

function closeShop() {
    shopOpen = false;
    shopMenu.setVisible(false);
}

function createCreatorMenu(scene) {
    const w = game.scale.width;
    const h = game.scale.height;

    creatorMenu = scene.add.container(0, 0);
    creatorMenu.setDepth(200);
    creatorMenu.setVisible(false);

    // Fondo
    const bg = scene.add.graphics();
    bg.fillStyle(0x16213e, 0.98);
    bg.fillRect(0, 0, w, h);
    creatorMenu.add(bg);

    // Título
    const title = scene.add.text(w/2, 30, '🎨 CREADOR + AI', {
        font: 'bold 32px Arial',
        fill: '#00D4FF'
    }).setOrigin(0.5);
    creatorMenu.add(title);

    // Subtítulo
    const subtitle = scene.add.text(w/2, 65, 'Describe lo que quieres crear y la AI lo generará', {
        font: '16px Arial',
        fill: '#AAAAAA'
    }).setOrigin(0.5);
    creatorMenu.add(subtitle);

    // Opciones de creación
    const options = [
        { id: 'npc', emoji: '🧑', name: 'Crear NPC', desc: 'Describe el personaje' },
        { id: 'weapon', emoji: '⚔️', name: 'Crear Arma', desc: 'Describe el arma y su efecto' },
        { id: 'world', emoji: '🌍', name: 'Crear Mundo', desc: 'Describe el ambiente y efectos' }
    ];

    const optionStartY = 110;
    options.forEach((opt, i) => {
        const y = optionStartY + i * 100;
        const cardW = Math.min(w - 40, 400);
        const cardX = (w - cardW) / 2;

        const card = scene.add.graphics();
        card.fillStyle(0x2C3E50, 1);
        card.fillRoundedRect(cardX, y, cardW, 85, 12);
        creatorMenu.add(card);

        const emoji = scene.add.text(cardX + 45, y + 42, opt.emoji, {
            font: '36px Arial'
        }).setOrigin(0.5);
        creatorMenu.add(emoji);

        const name = scene.add.text(cardX + 90, y + 25, opt.name, {
            font: 'bold 20px Arial',
            fill: '#FFFFFF'
        });
        creatorMenu.add(name);

        const desc = scene.add.text(cardX + 90, y + 52, opt.desc, {
            font: '14px Arial',
            fill: '#888888'
        });
        creatorMenu.add(desc);

        const cardRect = scene.add.rectangle(cardX + cardW/2, y + 42, cardW, 85, 0x000000, 0);
        cardRect.setInteractive();
        creatorMenu.add(cardRect);
        cardRect.on('pointerdown', () => openAICreator(opt.id));
    });

    // Sección de items creados
    const createdY = optionStartY + options.length * 100 + 20;
    const createdTitle = scene.add.text(w/2, createdY, '📦 Tus Creaciones', {
        font: 'bold 20px Arial',
        fill: '#FFD700'
    }).setOrigin(0.5);
    creatorMenu.add(createdTitle);

    // Lista de items creados (scrollable conceptualmente)
    const createdContainer = scene.add.container(0, createdY + 30);
    creatorMenu.add(createdContainer);
    creatorMenu.createdContainer = createdContainer;

    // Botón cerrar
    const closeBtn = scene.add.graphics();
    closeBtn.fillStyle(0xE74C3C, 1);
    closeBtn.fillRoundedRect(w - 60, 10, 50, 50, 10);
    creatorMenu.add(closeBtn);
    const closeTxt = scene.add.text(w - 35, 35, '✕', {
        font: 'bold 28px Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);
    creatorMenu.add(closeTxt);
    const closeRect = scene.add.rectangle(w - 35, 35, 50, 50, 0x000000, 0);
    closeRect.setInteractive();
    creatorMenu.add(closeRect);
    closeRect.on('pointerdown', () => closeCreator());
}

function openCreator() {
    creatorOpen = true;
    creatorMenu.setVisible(true);
    updateCreatedItemsList();
}

function closeCreator() {
    creatorOpen = false;
    creatorMenu.setVisible(false);
}

function updateCreatedItemsList() {
    if (!creatorMenu.createdContainer) return;
    const container = creatorMenu.createdContainer;
    container.removeAll(true);

    const allItems = [
        ...customItems.npcs.map(i => ({...i, type: 'npc'})),
        ...customItems.weapons.map(i => ({...i, type: 'weapon'})),
        ...customItems.worlds.map(i => ({...i, type: 'world'}))
    ];

    if (allItems.length === 0) {
        const emptyText = sceneRef.add.text(game.scale.width/2, 20, 'No has creado nada aún', {
            font: '16px Arial',
            fill: '#666666'
        }).setOrigin(0.5);
        container.add(emptyText);
        return;
    }

    const w = game.scale.width;
    const cols = isMobile ? 1 : 2;
    const itemW = isMobile ? (w - 40) : (w - 60) / 2;
    const itemH = 70;

    allItems.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 20 + col * (itemW + 10);
        const y = row * (itemH + 10);

        const isPublished = item.isPublished || false;

        const itemBg = sceneRef.add.graphics();
        itemBg.fillStyle(isPublished ? 0x27AE60 : 0x3498DB, 1);
        itemBg.fillRoundedRect(x, y, itemW, itemH, 8);
        container.add(itemBg);

        const emoji = sceneRef.add.text(x + 30, y + 35, item.emoji || '✨', {
            font: '24px Arial'
        }).setOrigin(0.5);
        container.add(emoji);

        const name = sceneRef.add.text(x + 60, y + 20, item.name, {
            font: 'bold 14px Arial',
            fill: '#FFFFFF',
            wordWrap: { width: itemW - 120 }
        });
        container.add(name);

        const typeLabel = sceneRef.add.text(x + 60, y + 40, item.type.toUpperCase(), {
            font: '10px Arial',
            fill: '#AAAAAA'
        });
        container.add(typeLabel);

        // Botón de publicar (si no está publicado)
        if (!isPublished) {
            const pubBtn = sceneRef.add.graphics();
            pubBtn.fillStyle(0xE67E22, 1);
            pubBtn.fillRoundedRect(x + itemW - 75, y + 15, 65, 40, 6);
            container.add(pubBtn);

            const pubTxt = sceneRef.add.text(x + itemW - 42, y + 35, '📤 Subir', {
                font: 'bold 11px Arial',
                fill: '#FFFFFF'
            }).setOrigin(0.5);
            container.add(pubTxt);

            const pubRect = sceneRef.add.rectangle(x + itemW - 42, y + 35, 65, 40, 0x000000, 0);
            pubRect.setInteractive();
            container.add(pubRect);
            pubRect.on('pointerdown', () => openPublishPopup(item));
        } else {
            const pubStatus = sceneRef.add.text(x + itemW - 42, y + 35, '✓ En tienda', {
                font: '11px Arial',
                fill: '#AAFFAA'
            }).setOrigin(0.5);
            container.add(pubStatus);
        }
    });
}

// AI Creator popup
let aiCreatorPopup = null;
let aiCreatorType = null;

function openAICreator(type) {
    aiCreatorType = type;
    const w = game.scale.width;
    const h = game.scale.height;

    if (aiCreatorPopup) {
        aiCreatorPopup.destroy();
    }

    aiCreatorPopup = sceneRef.add.container(0, 0);
    aiCreatorPopup.setDepth(250);

    // Fondo semitransparente
    const overlay = sceneRef.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, w, h);
    aiCreatorPopup.add(overlay);

    const popupW = Math.min(w - 40, 450);
    const popupH = 350;
    const popupX = (w - popupW) / 2;
    const popupY = (h - popupH) / 2;

    const popup = sceneRef.add.graphics();
    popup.fillStyle(0x2C3E50, 1);
    popup.fillRoundedRect(popupX, popupY, popupW, popupH, 15);
    aiCreatorPopup.add(popup);

    const typeNames = { npc: 'NPC', weapon: 'Arma', world: 'Mundo' };
    const title = sceneRef.add.text(w/2, popupY + 30, '🤖 Crear ' + typeNames[type] + ' con AI', {
        font: 'bold 24px Arial',
        fill: '#00D4FF'
    }).setOrigin(0.5);
    aiCreatorPopup.add(title);

    // Instrucciones
    const instructions = sceneRef.add.text(w/2, popupY + 70, 'Escribe una descripción:', {
        font: '16px Arial',
        fill: '#CCCCCC'
    }).setOrigin(0.5);
    aiCreatorPopup.add(instructions);

    // Input simulado (área de texto)
    const inputBg = sceneRef.add.graphics();
    inputBg.fillStyle(0x1a1a2e, 1);
    inputBg.fillRoundedRect(popupX + 20, popupY + 95, popupW - 40, 100, 8);
    aiCreatorPopup.add(inputBg);

    // Texto placeholder
    const placeholder = sceneRef.add.text(popupX + 30, popupY + 105,
        type === 'npc' ? 'Ej: Un ninja con armadura dorada que se mueve rápido' :
        type === 'weapon' ? 'Ej: Una espada láser que congela enemigos' :
        'Ej: Un volcán activo con lluvia de meteoritos', {
        font: '14px Arial',
        fill: '#666666',
        wordWrap: { width: popupW - 60 }
    });
    aiCreatorPopup.add(placeholder);

    // Ejemplos rápidos
    const examples = type === 'npc' ?
        ['Zombie rápido', 'Robot gigante', 'Mago de fuego'] :
        type === 'weapon' ?
        ['Rayo laser', 'Bomba de hielo', 'Espada eléctrica'] :
        ['Ciudad destruida', 'Bosque mágico', 'Desierto caliente'];

    const exY = popupY + 210;
    const exTitle = sceneRef.add.text(w/2, exY, 'Ideas rápidas:', {
        font: '14px Arial',
        fill: '#888888'
    }).setOrigin(0.5);
    aiCreatorPopup.add(exTitle);

    examples.forEach((ex, i) => {
        const exBtn = sceneRef.add.graphics();
        const exX = popupX + 30 + i * ((popupW - 60) / 3);
        exBtn.fillStyle(0x3498DB, 1);
        exBtn.fillRoundedRect(exX, exY + 20, (popupW - 80) / 3, 30, 6);
        aiCreatorPopup.add(exBtn);

        const exTxt = sceneRef.add.text(exX + (popupW - 80) / 6, exY + 35, ex, {
            font: '11px Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5);
        aiCreatorPopup.add(exTxt);

        const exRect = sceneRef.add.rectangle(exX + (popupW - 80) / 6, exY + 35, (popupW - 80) / 3, 30, 0x000000, 0);
        exRect.setInteractive();
        aiCreatorPopup.add(exRect);
        exRect.on('pointerdown', () => {
            generateAIItem(type, ex);
        });
    });

    // Botón generar
    const genBtn = sceneRef.add.graphics();
    genBtn.fillStyle(0x27AE60, 1);
    genBtn.fillRoundedRect(popupX + 20, popupY + popupH - 70, popupW - 40, 50, 10);
    aiCreatorPopup.add(genBtn);

    const genTxt = sceneRef.add.text(w/2, popupY + popupH - 45, '✨ Generar con AI', {
        font: 'bold 20px Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);
    aiCreatorPopup.add(genTxt);

    const genRect = sceneRef.add.rectangle(w/2, popupY + popupH - 45, popupW - 40, 50, 0x000000, 0);
    genRect.setInteractive();
    aiCreatorPopup.add(genRect);
    genRect.on('pointerdown', () => {
        // Generar con descripción genérica si no hay input
        generateAIItem(type, 'Aleatorio');
    });

    // Botón cerrar
    const closeRect = sceneRef.add.rectangle(w/2, popupY - 30, w, 60, 0x000000, 0);
    closeRect.setInteractive();
    aiCreatorPopup.add(closeRect);
    closeRect.on('pointerdown', () => closeAICreator());
}

function closeAICreator() {
    if (aiCreatorPopup) {
        aiCreatorPopup.destroy();
        aiCreatorPopup = null;
    }
}

function generateAIItem(type, description) {
    closeAICreator();

    // Simular generación AI
    const emojis = {
        npc: ['🦸', '🦹', '🧙', '🧛', '🧜', '🧚', '🤴', '👸', '🥷', '🤖', '👽', '👻'],
        weapon: ['🔮', '⚡', '❄️', '🔥', '💫', '🌟', '⭐', '💥', '🎯', '🏹'],
        world: ['🏔️', '🌋', '🏝️', '🌌', '🌈', '⛈️', '🌪️', '❄️', '🔥', '🌊']
    };

    const randomEmoji = emojis[type][Math.floor(Math.random() * emojis[type].length)];
    const itemId = type + '_' + Date.now();

    const newItem = {
        id: itemId,
        name: description,
        emoji: randomEmoji,
        description: description,
        createdAt: Date.now()
    };

    if (type === 'npc') {
        customItems.npcs.push(newItem);
        unlockedItems.npcs.push(itemId);
    } else if (type === 'weapon') {
        customItems.weapons.push(newItem);
        unlockedItems.weapons.push(itemId);
    } else {
        customItems.worlds.push(newItem);
        unlockedItems.worlds.push(itemId);
    }

    saveSaveData();
    updateCreatedItemsList();
    showNotification('✨ ' + description + ' creado!');
}

// === SISTEMA DE PUBLICACIÓN EN TIENDA ===
let publishPopup = null;

function openPublishPopup(item) {
    const w = game.scale.width;
    const h = game.scale.height;

    if (publishPopup) {
        publishPopup.destroy();
    }

    publishPopup = sceneRef.add.container(0, 0);
    publishPopup.setDepth(300);

    // Fondo semitransparente
    const overlay = sceneRef.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, w, h);
    publishPopup.add(overlay);

    const popupW = Math.min(w - 30, 420);
    const popupH = 320;
    const popupX = (w - popupW) / 2;
    const popupY = (h - popupH) / 2;

    // Fondo del popup
    const popup = sceneRef.add.graphics();
    popup.fillStyle(0x2C3E50, 1);
    popup.fillRoundedRect(popupX, popupY, popupW, popupH, 15);
    publishPopup.add(popup);

    // Título
    const title = sceneRef.add.text(w/2, popupY + 30, '📤 Publicar en Tienda', {
        font: 'bold 22px Arial',
        fill: '#E67E22'
    }).setOrigin(0.5);
    publishPopup.add(title);

    // Item info
    const itemInfo = sceneRef.add.text(w/2, popupY + 65, item.emoji + ' ' + item.name, {
        font: 'bold 18px Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);
    publishPopup.add(itemInfo);

    // Instrucciones
    const instructions = sceneRef.add.text(w/2, popupY + 100, 'Escribe qué hace y cómo funciona:', {
        font: '14px Arial',
        fill: '#AAAAAA'
    }).setOrigin(0.5);
    publishPopup.add(instructions);

    // Área de descripción (simulada)
    const descBg = sceneRef.add.graphics();
    descBg.fillStyle(0x1a1a2e, 1);
    descBg.fillRoundedRect(popupX + 15, popupY + 120, popupW - 30, 80, 8);
    publishPopup.add(descBg);

    const placeholder = sceneRef.add.text(popupX + 25, popupY + 130,
        'Ej: Un arma que congela a los enemigos por 3 segundos\n' +
        'cuando los golpeas. Muy útil para combos.', {
        font: '12px Arial',
        fill: '#666666',
        wordWrap: { width: popupW - 50 }
    });
    publishPopup.add(placeholder);

    // Precio sugerido
    const priceLabel = sceneRef.add.text(popupX + 20, popupY + 215, 'Precio (Mayhems):', {
        font: '14px Arial',
        fill: '#FFFFFF'
    });
    publishPopup.add(priceLabel);

    const prices = [0, 25, 50, 100, 200];
    let selectedPrice = 50;

    prices.forEach((price, i) => {
        const priceBtn = sceneRef.add.graphics();
        priceBtn.fillStyle(price === selectedPrice ? 0xE67E22 : 0x555555, 1);
        priceBtn.fillRoundedRect(popupX + 20 + i * 75, popupY + 235, 65, 30, 6);
        publishPopup.add(priceBtn);

        const priceTxt = sceneRef.add.text(popupX + 52 + i * 75, popupY + 250,
            price === 0 ? 'GRATIS' : '💎' + price, {
            font: '11px Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5);
        publishPopup.add(priceTxt);
    });

    // Botón publicar
    const pubBtn = sceneRef.add.graphics();
    pubBtn.fillStyle(0x27AE60, 1);
    pubBtn.fillRoundedRect(popupX + 15, popupY + popupH - 55, popupW - 30, 45, 10);
    publishPopup.add(pubBtn);

    const pubTxt = sceneRef.add.text(w/2, popupY + popupH - 32, '✅ Publicar en la Tienda', {
        font: 'bold 18px Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);
    publishPopup.add(pubTxt);

    const pubRect = sceneRef.add.rectangle(w/2, popupY + popupH - 32, popupW - 30, 45, 0x000000, 0);
    pubRect.setInteractive();
    publishPopup.add(pubRect);
    pubRect.on('pointerdown', () => publishItem(item, selectedPrice));

    // Botón cerrar
    const closeBtn = sceneRef.add.text(popupX + popupW - 25, popupY + 15, '✕', {
        font: 'bold 24px Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);
    closeBtn.setInteractive();
    publishPopup.add(closeBtn);
    closeBtn.on('pointerdown', () => closePublishPopup());
}

function closePublishPopup() {
    if (publishPopup) {
        publishPopup.destroy();
        publishPopup = null;
    }
}

function publishItem(item, price) {
    // Marcar como publicado
    item.isPublished = true;
    item.publishedPrice = price;
    item.publishedAt = Date.now();

    // Agregar a items publicados
    const publishedItem = {
        ...item,
        price: price,
        author: 'Jugador',
        downloads: 0
    };

    if (item.type === 'npc') {
        publishedItems.npcs.push(publishedItem);
    } else if (item.type === 'weapon') {
        publishedItems.weapons.push(publishedItem);
    } else {
        publishedItems.worlds.push(publishedItem);
    }

    // Actualizar el item original en customItems
    const cat = item.type === 'npc' ? 'npcs' : item.type === 'weapon' ? 'weapons' : 'worlds';
    const idx = customItems[cat].findIndex(i => i.id === item.id);
    if (idx > -1) {
        customItems[cat][idx].isPublished = true;
    }

    saveSaveData();
    closePublishPopup();
    updateCreatedItemsList();
    showNotification('📤 ¡' + item.name + ' publicado en la tienda!');
}
