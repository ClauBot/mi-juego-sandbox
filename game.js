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
            gravity: { y: 0.8 },
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
let teamColors = [0xFF4444, 0x4444FF, 0xFFFF44, 0x44FF44];
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

function initGameContent(scene) {
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
                } else {
                    const bloodChance = isLowPerf ? 0.15 : 0.25;
                    if (Math.random() < bloodChance) {
                        spawnBlood(x, y, Math.min(isLowPerf ? 3 : 5, Math.floor(vel / 8)));
                    }
                    playHitSound(vel / 30);
                }
            } else if (vel > 6) {
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
            'cohete': createCohete,
            'barril': createBarril,
            'trampolin': createTrampolin
        };

        if (weaponCreators[currentWeapon]) {
            weaponCreators[currentWeapon](sceneRef, pointer.x, pointer.y);
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
        velocity.x = (pointer.x - lastPointerPosition.x);
        velocity.y = (pointer.y - lastPointerPosition.y);

        const forceX = (pointer.x - selectedPart.x) * 0.12;
        const forceY = (pointer.y - selectedPart.y) * 0.12;

        selectedPart.setVelocity(forceX * 2, forceY * 2);

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

        const throwPower = 0.7;
        const throwSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

        if (throwSpeed > 5) {
            playThrowSound(throwSpeed);
            playScream();
        }

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
            } else if (selectedWeapon.type === 'cohete') {
                activateCohete(selectedWeapon);
            } else if (selectedWeapon.type === 'barril') {
                explodeBarril(selectedWeapon);
            }
        }
        selectedWeapon = null;
        isDraggingWeapon = false;
    }
}

function activateCohete(weapon) {
    if (weapon.isFlying) return;

    weapon.isFlying = true;
    playRocketSound();

    // El cohete vuela por 3 segundos y luego explota
    setTimeout(() => {
        if (weapon && weapons.includes(weapon)) {
            explodeCohete(weapon);
        }
    }, 3000);
}

function explodeCohete(weapon) {
    const explosionX = weapon.x;
    const explosionY = weapon.y;

    // Explosión grande
    const explosion = sceneRef.add.graphics();
    explosion.setDepth(50);
    explosion.fillStyle(0xFF4500, 0.9);
    explosion.fillCircle(explosionX, explosionY, 30);
    explosion.fillStyle(0xFFFF00, 0.7);
    explosion.fillCircle(explosionX, explosionY, 50);
    explosion.fillStyle(0xFF6600, 0.5);
    explosion.fillCircle(explosionX, explosionY, 80);

    sceneRef.tweens.add({
        targets: explosion,
        alpha: 0,
        scale: 2,
        duration: 400,
        onComplete: () => explosion.destroy()
    });

    playExplosionSound();

    // Empujar ragdolls (radio más grande que granada)
    const radius = 200;
    const force = 30;

    ragdolls.forEach(ragdoll => {
        ragdoll.parts.forEach(part => {
            if (part && part.body) {
                const dist = Phaser.Math.Distance.Between(explosionX, explosionY, part.x, part.y);
                if (dist < radius) {
                    const angle = Math.atan2(part.y - explosionY, part.x - explosionX);
                    const f = (1 - dist / radius) * force;
                    part.setVelocity(Math.cos(angle) * f, Math.sin(angle) * f - 8);

                    if (ragdoll.isStanding) {
                        ragdoll.isStanding = false;
                        ragdoll.parts.forEach(p => p && p.body && p.setStatic(false));
                    }
                }
            }
        });
    });

    spawnBlood(explosionX, explosionY, 20);

    // Eliminar cohete
    if (weapon.graphics) weapon.graphics.destroy();
    if (weapon.body) sceneRef.matter.world.remove(weapon.body);
    const idx = weapons.indexOf(weapon);
    if (idx > -1) weapons.splice(idx, 1);
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

function playRocketSound() {
    if (!audioContext) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.5);
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.setValueAtTime(0.15, audioContext.currentTime + 2);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 3);
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

    const groundGraphics = scene.add.graphics();
    groundGraphics.fillStyle(0x4a7c3f, 1);
    groundGraphics.fillRect(0, groundY, w, 50);

    groundGraphics.fillStyle(0x3d6b35, 1);
    for (let x = 0; x < w; x += 20) {
        groundGraphics.fillRect(x, groundY - 5, 10, 5);
    }

    // Árboles de manzana
    createAppleTree(scene, 150);
    createAppleTree(scene, w - 150);

    // Flores decorativas (menos en móvil)
    const flowerColors = [0xFF69B4, 0xFF1493, 0xFFB6C1, 0xFF4500, 0xFFFF00, 0x9370DB, 0x00CED1, 0xFF6347];
    const numFlowers = isLowPerf ? 8 : 20;

    for (let i = 0; i < numFlowers; i++) {
        const fx = 30 + Math.random() * (w - 60);
        const fy = groundY - 15 + Math.random() * 10;
        const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        createFlower(scene, fx, fy, color);
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

function createRagdoll(scene, x, y, color) {
    const parts = [];
    const constraints = [];

    ragdollCollisionGroup--;
    const myGroup = ragdollCollisionGroup;

    // Color zombie si estamos en modo zombie
    const isZombie = (currentMap === 'zombie');
    const skinColor = isZombie ? 0x6B8E23 : 0xFFDBB4; // Verde zombie o piel normal
    const shirtColor = isZombie ? 0x4A4A4A : color; // Ropa rasgada gris
    const pantsColor = isZombie ? 0x2F2F2F : 0x333333;

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

    const headTexture = createPartTexture(scene, 'head', 22, 22, skinColor, true);
    const head = scene.matter.add.sprite(x, headY, headTexture, null, {
        ...partOptions,
        shape: { type: 'circle', radius: 11 },
        density: 0.001
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

    const torsoTexture = createPartTexture(scene, 'torso', 28, 36, shirtColor);
    const torso = scene.matter.add.sprite(x, torsoY, torsoTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 28, height: 36 },
        density: 0.002
    });
    parts.push(torso);

    const armLTexture = createPartTexture(scene, 'armL', 10, 22, skinColor);
    const armL = scene.matter.add.sprite(x - 19, torsoY, armLTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 10, height: 22 },
        density: 0.0008
    });
    parts.push(armL);

    const armRTexture = createPartTexture(scene, 'armR', 10, 22, skinColor);
    const armR = scene.matter.add.sprite(x + 19, torsoY, armRTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 10, height: 22 },
        density: 0.0008
    });
    parts.push(armR);

    const legLTexture = createPartTexture(scene, 'legL', 12, 30, pantsColor);
    const legL = scene.matter.add.sprite(x - 8, legY, legLTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 12, height: 30 },
        density: 0.001
    });
    parts.push(legL);

    const legRTexture = createPartTexture(scene, 'legR', 12, 30, pantsColor);
    const legR = scene.matter.add.sprite(x + 8, legY, legRTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 12, height: 30 },
        density: 0.001
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

function createPartTexture(scene, name, width, height, color, isHead = false) {
    const key = name + '_' + color + '_' + Date.now() + '_' + Math.random();
    const graphics = scene.make.graphics({ add: false });

    if (isHead) {
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

    // Botón agregar (+) - tercero desde la derecha
    const spawnX = teamX - margin - btnSize;
    const spawnButton = scene.add.graphics();
    spawnButton.fillStyle(0x44AA44, 1);
    spawnButton.fillRoundedRect(spawnX, topY, btnSize, btnSize, 8);
    spawnButton.fillStyle(0xFFFFFF, 1);
    spawnButton.fillRect(spawnX + btnSize/2 - 2, topY + 10, 4, btnSize - 20);
    spawnButton.fillRect(spawnX + 10, topY + btnSize/2 - 2, btnSize - 20, 4);

    const spawnZone = scene.add.zone(spawnX + btnSize/2, topY + btnSize/2, btnSize, btnSize);
    spawnZone.setInteractive();
    spawnZone.on('pointerdown', () => {
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
        createRagdoll(sceneRef, newX, game.scale.height - 150, teamColors[currentTeam]);
    });

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

    // Menú de armas - grid compacto
    const menuX = weaponX + btnSize/2;
    const menuY = topY + btnSize + 5;
    weaponMenu = scene.add.container(menuX, menuY);
    weaponMenu.setDepth(101);
    weaponMenu.setVisible(false);

    const weaponOptions = [
        { id: 'pistola', emoji: '🔫', name: 'Pistola' },
        { id: 'cuchillo', emoji: '🔪', name: 'Cuchillo' },
        { id: 'granada', emoji: '💣', name: 'Granada' },
        { id: 'espada', emoji: '🗡️', name: 'Espada' },
        { id: 'bat', emoji: '🏏', name: 'Bat' },
        { id: 'cohete', emoji: '🚀', name: 'Cohete' },
        { id: 'barril', emoji: '🛢️', name: 'Barril' },
        { id: 'trampolin', emoji: '🛝', name: 'Trampolín' }
    ];

    const cols = 2;
    const itemW = 70;
    const itemH = 40;
    const menuW = cols * itemW + 10;
    const menuH = Math.ceil(weaponOptions.length / cols) * itemH + 10;

    const menuBg = scene.add.graphics();
    menuBg.fillStyle(0x333333, 0.95);
    menuBg.fillRoundedRect(-menuW/2, 0, menuW, menuH, 8);
    weaponMenu.add(menuBg);

    weaponOptions.forEach((opt, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = -menuW/2 + 5 + col * itemW;
        const by = 5 + row * itemH;

        const btn = scene.add.graphics();
        btn.fillStyle(0x555555, 1);
        btn.fillRoundedRect(bx, by, itemW - 5, itemH - 5, 6);
        weaponMenu.add(btn);

        const txt = scene.add.text(bx + (itemW-5)/2, by + (itemH-5)/2, opt.emoji, {
            font: '20px Arial'
        }).setOrigin(0.5);
        weaponMenu.add(txt);

        // Zona interactiva dentro del container
        const zoneGraphic = scene.add.rectangle(bx + (itemW-5)/2, by + (itemH-5)/2, itemW-5, itemH-5, 0x000000, 0);
        zoneGraphic.setInteractive();
        weaponMenu.add(zoneGraphic);
        zoneGraphic.on('pointerdown', () => {
            currentWeapon = opt.id;
            weaponMenu.setVisible(false);
            weaponMenuOpen = false;
            drawWeaponButton();
        });
    });

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

    // Menú de mapas
    const mapMenuX = mapX + btnSize/2;
    const mapMenuY = topY + btnSize + 5;
    mapMenu = scene.add.container(mapMenuX, mapMenuY);
    mapMenu.setDepth(101);
    mapMenu.setVisible(false);

    const mapOptions = [
        { id: 'normal', emoji: '🌳', name: 'Normal' },
        { id: 'tornado', emoji: '🌪️', name: 'Tornado' },
        { id: 'rayos', emoji: '⚡', name: 'Tormenta' },
        { id: 'lunar', emoji: '🌙', name: 'Luna' },
        { id: 'zombie', emoji: '🧟', name: 'Zombie' },
        { id: 'blackhole', emoji: '🕳️', name: 'Agujero' }
    ];

    const mapMenuW = 2 * itemW + 10;
    const mapMenuH = Math.ceil(mapOptions.length / 2) * itemH + 10;

    const mapMenuBg = scene.add.graphics();
    mapMenuBg.fillStyle(0x333333, 0.95);
    mapMenuBg.fillRoundedRect(-mapMenuW/2, 0, mapMenuW, mapMenuH, 8);
    mapMenu.add(mapMenuBg);

    mapOptions.forEach((opt, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = -mapMenuW/2 + 5 + col * itemW;
        const by = 5 + row * itemH;

        const btn = scene.add.graphics();
        btn.fillStyle(0x555555, 1);
        btn.fillRoundedRect(bx, by, itemW - 5, itemH - 5, 6);
        mapMenu.add(btn);

        const txt = scene.add.text(bx + (itemW-5)/2, by + (itemH-5)/2, opt.emoji, {
            font: '20px Arial'
        }).setOrigin(0.5);
        mapMenu.add(txt);

        // Zona interactiva dentro del container
        const zoneGraphic = scene.add.rectangle(bx + (itemW-5)/2, by + (itemH-5)/2, itemW-5, itemH-5, 0x000000, 0);
        zoneGraphic.setInteractive();
        mapMenu.add(zoneGraphic);
        zoneGraphic.on('pointerdown', () => {
            changeMap(opt.id);
            mapMenu.setVisible(false);
            mapMenuOpen = false;
        });
    });

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
        'cohete': '🚀',
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
    if (mapMenuOpen) {
        mapMenu.setVisible(false);
        mapMenuOpen = false;
    }
}

function toggleMapMenu() {
    mapMenuOpen = !mapMenuOpen;
    mapMenu.setVisible(mapMenuOpen);
    if (weaponMenuOpen) {
        weaponMenu.setVisible(false);
        weaponMenuOpen = false;
    }
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

    // Aplicar efectos del nuevo mapa
    switch(mapId) {
        case 'lunar':
            sceneRef.matter.world.setGravity(0, 0.15);
            // Cielo nocturno
            sceneRef.mapOverlay.fillStyle(0x000033, 0.7);
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
            // Cielo espacial
            sceneRef.mapOverlay.fillStyle(0x110022, 0.6);
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

function createCohete(scene, x, y) {
    const rocket = scene.add.graphics();
    rocket.setDepth(10);

    // Cuerpo
    rocket.fillStyle(0xFF0000, 1);
    rocket.fillRect(-20, -6, 40, 14);

    // Punta
    rocket.fillStyle(0xFFFFFF, 1);
    rocket.fillTriangle(20, -6, 20, 8, 35, 1);

    // Aletas
    rocket.fillStyle(0x333333, 1);
    rocket.fillTriangle(-20, -6, -30, -12, -20, 0);
    rocket.fillTriangle(-20, 8, -30, 14, -20, 2);

    // Fuego (se animará)
    rocket.fillStyle(0xFFA500, 1);
    rocket.fillTriangle(-20, -4, -35, 1, -20, 6);

    rocket.setPosition(x, y);

    const weapon = {
        graphics: rocket,
        type: 'cohete',
        x: x,
        y: y,
        isFlying: false,
        body: scene.matter.add.rectangle(x, y, 50, 15, {
            friction: 0.3,
            frictionAir: 0.005,
            restitution: 0.2,
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

    // Actualizar cohetes voladores
    weapons.forEach(weapon => {
        if (weapon.type === 'cohete' && weapon.isFlying) {
            const angle = weapon.body.angle;
            sceneRef.matter.body.setVelocity(weapon.body, {
                x: Math.cos(angle) * 12,
                y: Math.sin(angle) * 12
            });
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
