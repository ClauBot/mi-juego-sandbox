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
    return game.scale.height - 50;
}
function getGroundLimit() {
    return game.scale.height - 65; // Donde los objetos dejan de caer
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
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

game = new Phaser.Game(config);

function preload() {}

function create() {
    sceneRef = this;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}

    createGround(this);

    const spawnY = game.scale.height - 200;
    const w = game.scale.width;

    if (isMobile) {
        createRagdoll(this, w * 0.3, spawnY, teamColors[0]);
        createRagdoll(this, w * 0.7, spawnY, teamColors[1]);
    } else {
        createRagdoll(this, w * 0.25, spawnY, teamColors[0]);
        createRagdoll(this, w * 0.5, spawnY, teamColors[1]);
        createRagdoll(this, w * 0.75, spawnY, teamColors[2]);
    }

    createUI(this);

    this.input.on('pointerdown', onPointerDown, this);
    this.input.on('pointermove', onPointerMove, this);
    this.input.on('pointerup', onPointerUp, this);
    this.input.on('pointerupoutside', onPointerUp, this);

    // Colisiones (optimizado para móvil)
    let lastCollisionTime = 0;
    const collisionCooldown = isLowPerf ? 100 : 50; // ms entre efectos de colisión

    this.matter.world.on('collisionstart', (event) => {
        const now = Date.now();

        // En móvil, limitar frecuencia de efectos
        if (isLowPerf && now - lastCollisionTime < collisionCooldown) {
            // Solo procesar daño sin efectos visuales/sonoros
            event.pairs.forEach(pair => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                const vel = Math.abs(bodyA.velocity?.x || 0) + Math.abs(bodyA.velocity?.y || 0) +
                    Math.abs(bodyB.velocity?.x || 0) + Math.abs(bodyB.velocity?.y || 0);
                if (vel > 12) {
                    const x = pair.collision.supports[0]?.x || bodyA.position.x;
                    const y = pair.collision.supports[0]?.y || bodyA.position.y;
                    damageRagdollAt(x, y, Math.floor(vel / 2));
                }
            });
            return;
        }

        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            const vel = Math.abs(bodyA.velocity?.x || 0) + Math.abs(bodyA.velocity?.y || 0) +
                Math.abs(bodyB.velocity?.x || 0) + Math.abs(bodyB.velocity?.y || 0);

            if (vel > 12) {
                lastCollisionTime = now;
                const x = pair.collision.supports[0]?.x || bodyA.position.x;
                const y = pair.collision.supports[0]?.y || bodyA.position.y;

                // Menos probabilidad de sangre en móvil
                const bloodChance = isLowPerf ? 0.15 : 0.25;
                if (Math.random() < bloodChance) {
                    spawnBlood(x, y, Math.min(isLowPerf ? 3 : 5, Math.floor(vel / 8)));
                }
                playHitSound(vel / 30);

                // Reducir vida al golpear
                damageRagdollAt(x, y, Math.floor(vel / 2));
            } else if (vel > 6) {
                playHitSound(vel / 40);
                const x = pair.collision.supports[0]?.x || bodyA.position.x;
                const y = pair.collision.supports[0]?.y || bodyA.position.y;
                damageRagdollAt(x, y, Math.floor(vel / 4));
            }
        });
    });

    this.scale.on('resize', onResize, this);
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

    // Actualizar barras de vida solo cada 3 frames (posición)
    if (frameCount % 3 === 0) {
        updateAllHealthBars();
    }

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

    // Si hay arma seleccionada, crear arma
    if (currentWeapon && pointer.y > 100 && pointer.y < game.scale.height - 70) {
        if (currentWeapon === 'pistola') {
            createPistola(sceneRef, pointer.x, pointer.y);
        } else if (currentWeapon === 'cuchillo') {
            createCuchillo(sceneRef, pointer.x, pointer.y);
        }
        playGrabSound();
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

    const groundY = game.scale.height - 55;

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

    const w = game.scale.width;
    const h = game.scale.height;
    const groundY = h - 50;

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
            mask: 0x0002  // Colisiona con ragdolls
        }
    };

    // Nota: Los ragdolls ahora SÍ colisionan entre sí (pueden pegarse)

    scene.matter.add.rectangle(w / 2, groundY + 25, w, 50, {
        ...wallOptions,
        friction: 1,
        frictionStatic: 1,
        restitution: 0.05,
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

    const skinColor = 0xFFDBB4;
    const shirtColor = color;
    const pantsColor = 0x333333;

    const groundY = game.scale.height - 50;
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
        friction: 0.8,
        frictionAir: 0.03,
        frictionStatic: 0.5,
        restitution: 0.1,
        collisionFilter: {
            group: myGroup,           // Partes del mismo ragdoll no colisionan entre sí
            category: 0x0002,         // Soy un ragdoll
            mask: 0x0001 | 0x0002     // Colisiono con suelo Y otros ragdolls
        }
    };

    const headTexture = createPartTexture(scene, 'head', 22, 22, skinColor, true);
    const head = scene.matter.add.sprite(x, headY, headTexture, null, {
        ...partOptions,
        shape: { type: 'circle', radius: 11 },
        density: 0.001
    });
    parts.push(head);

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

    // Barra de vida
    const healthBg = scene.add.graphics();
    healthBg.fillStyle(0x333333, 1);
    healthBg.fillRect(-20, -8, 40, 8);
    healthBg.setDepth(50);

    const healthBar = scene.add.graphics();
    healthBar.fillStyle(0x00FF00, 1);
    healthBar.fillRect(-19, -7, 38, 6);
    healthBar.setDepth(51);

    const ragdoll = {
        parts: parts,
        constraints: constraints,
        color: color,
        team: teamColors.indexOf(color),
        isBeingDragged: false,
        isStanding: true,
        collisionGroup: myGroup,
        health: 100,
        maxHealth: 100,
        healthBar: healthBar,
        healthBg: healthBg,
        isDead: false
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
            if (ragdoll.healthBar) ragdoll.healthBar.destroy();
            if (ragdoll.healthBg) ragdoll.healthBg.destroy();
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

    // Menú de armas (oculto inicialmente)
    // Menú de armas - posicionado debajo del botón de armas
    const menuX = weaponX + btnSize/2;
    const menuY = topY + btnSize + 5;
    weaponMenu = scene.add.container(menuX, menuY);
    weaponMenu.setDepth(101);
    weaponMenu.setVisible(false);

    const menuBg = scene.add.graphics();
    menuBg.fillStyle(0x333333, 0.95);
    menuBg.fillRoundedRect(-60, 0, 120, 80, 8);
    weaponMenu.add(menuBg);

    // Opción Pistola
    const pistolaBtn = scene.add.graphics();
    pistolaBtn.fillStyle(0x555555, 1);
    pistolaBtn.fillRoundedRect(-55, 5, 110, 32, 6);
    weaponMenu.add(pistolaBtn);

    const pistolaText = scene.add.text(0, 21, '🔫 Pistola', {
        font: 'bold 14px Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);
    weaponMenu.add(pistolaText);

    const pistolaZone = scene.add.zone(menuX, menuY + 21, 110, 32);
    pistolaZone.setInteractive();
    pistolaZone.setDepth(102);
    pistolaZone.on('pointerdown', () => {
        currentWeapon = 'pistola';
        weaponMenu.setVisible(false);
        weaponMenuOpen = false;
        drawWeaponButton();
    });

    // Opción Cuchillo
    const cuchilloBtn = scene.add.graphics();
    cuchilloBtn.fillStyle(0x555555, 1);
    cuchilloBtn.fillRoundedRect(-55, 42, 110, 32, 6);
    weaponMenu.add(cuchilloBtn);

    const cuchilloText = scene.add.text(0, 58, '🔪 Cuchillo', {
        font: 'bold 14px Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);
    weaponMenu.add(cuchilloText);

    const cuchilloZone = scene.add.zone(menuX, menuY + 58, 110, 32);
    cuchilloZone.setInteractive();
    cuchilloZone.setDepth(102);
    cuchilloZone.on('pointerdown', () => {
        currentWeapon = 'cuchillo';
        weaponMenu.setVisible(false);
        weaponMenuOpen = false;
        drawWeaponButton();
    });
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

    if (currentWeapon === 'pistola') {
        // Dibujar pistola simple
        weaponButton.fillRect(bx + 8, by + bs/2 - 4, 20, 8);
        weaponButton.fillRect(bx + 5, by + bs/2, 8, 12);
    } else if (currentWeapon === 'cuchillo') {
        // Dibujar cuchillo simple
        weaponButton.fillRect(bx + 5, by + bs/2 - 3, 12, 6);
        weaponButton.fillStyle(0xCCCCCC, 1);
        weaponButton.fillRect(bx + 17, by + bs/2 - 2, 25, 4);
    } else {
        // Sin arma - mostrar icono de arma
        weaponButton.fillRect(bx + 10, by + bs/2 - 3, 15, 6);
        weaponButton.fillRect(bx + 8, by + bs/2 + 3, 8, 10);
        weaponButton.fillStyle(0x888888, 1);
        weaponButton.fillRect(bx + 25, by + bs/2 - 2, 12, 4);
    }
}

function toggleWeaponMenu() {
    weaponMenuOpen = !weaponMenuOpen;
    weaponMenu.setVisible(weaponMenuOpen);
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
            friction: 0.8,
            frictionAir: 0.02,
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
            friction: 0.8,
            frictionAir: 0.02,
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

function updateWeapons() {
    weapons.forEach(weapon => {
        if (weapon.body) {
            weapon.x = weapon.body.position.x;
            weapon.y = weapon.body.position.y;
            weapon.graphics.setPosition(weapon.x, weapon.y);
            weapon.graphics.setRotation(weapon.body.angle);
        }
    });
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
