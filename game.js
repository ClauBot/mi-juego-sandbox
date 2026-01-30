// ============================================
// MI SANDBOX - Juego estilo Melon Playground
// Mobile & Tablet First + Música
// ============================================

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const screenWidth = Math.min(window.innerWidth, 800);
const screenHeight = Math.min(window.innerHeight, 600);

const config = {
    type: Phaser.AUTO,
    width: screenWidth,
    height: screenHeight,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0.8 },
            debug: false
        }
    },
    input: {
        activePointers: 3
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

game = new Phaser.Game(config);

function preload() {}

function create() {
    sceneRef = this;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}

    createGround(this);

    if (isMobile) {
        createRagdoll(this, 200, 400, teamColors[0]);
        createRagdoll(this, 400, 400, teamColors[1]);
    } else {
        createRagdoll(this, 200, 400, teamColors[0]);
        createRagdoll(this, 400, 400, teamColors[1]);
        createRagdoll(this, 600, 400, teamColors[2]);
    }

    createUI(this);

    const instructionText = isMobile ? 'Toca un muñeco!' : 'Toca un muñeco para que se caiga!';
    this.add.text(10, 10, instructionText, {
        font: '14px Arial',
        fill: '#333333'
    });

    this.input.on('pointerdown', onPointerDown);
    this.input.on('pointermove', onPointerMove);
    this.input.on('pointerup', onPointerUp);

    // Colisiones
    this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            const vel = Math.abs(bodyA.velocity?.x || 0) + Math.abs(bodyA.velocity?.y || 0) +
                Math.abs(bodyB.velocity?.x || 0) + Math.abs(bodyB.velocity?.y || 0);

            if (vel > 12) {
                const x = pair.collision.supports[0]?.x || bodyA.position.x;
                const y = pair.collision.supports[0]?.y || bodyA.position.y;

                if (Math.random() < 0.25) {
                    spawnBlood(x, y, Math.min(5, Math.floor(vel / 8)));
                }
                playHitSound(vel / 30);
            } else if (vel > 6) {
                playHitSound(vel / 40);
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
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();
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

    // Botón en esquina inferior izquierda
    const btnX = 10;
    const btnY = 555;
    const btnW = 50;
    const btnH = 35;

    musicButton.fillStyle(musicPlaying ? 0x44AA44 : 0x666666, 1);
    musicButton.fillRoundedRect(btnX, btnY, btnW, btnH, 8);

    // Icono
    musicButton.fillStyle(0xFFFFFF, 1);
    if (musicPlaying) {
        // Pausa
        musicButton.fillRect(btnX + 15, btnY + 8, 6, 19);
        musicButton.fillRect(btnX + 28, btnY + 8, 6, 19);
    } else {
        // Play
        musicButton.fillTriangle(
            btnX + 15, btnY + 7,
            btnX + 15, btnY + 28,
            btnX + 38, btnY + 17
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

        // Formantes vocales para simular "¡Ah!" o "¡Ay!"
        const formants = [
            { freq: 700 * pitch, gain: 0.3, q: 5 },   // F1
            { freq: 1200 * pitch, gain: 0.2, q: 8 },  // F2
            { freq: 2500 * pitch, gain: 0.1, q: 10 }  // F3
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

        // Mezclar osciladores
        const voiceMix = audioContext.createGain();
        voiceMix.gain.value = 0.5;

        voiceOsc.connect(voiceMix);
        voiceOsc2.connect(voiceMix);

        // Ruido para respiración/aire
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        const noiseGain = audioContext.createGain();
        noiseGain.gain.value = 0.15;
        noiseSource.connect(noiseGain);

        // Filtros formantes
        const outputGain = audioContext.createGain();
        outputGain.gain.setValueAtTime(0, now);
        outputGain.gain.linearRampToValueAtTime(0.4, now + 0.02);
        outputGain.gain.setValueAtTime(0.4, now + 0.05);
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

function onResize(gameSize) {}

function update() {
    // Mover nubes
    updateClouds();

    // Sangre
    for (let i = bloodParticles.length - 1; i >= 0; i--) {
        const blood = bloodParticles[i];
        blood.life--;

        if (blood.life <= 0) {
            blood.graphics.destroy();
            bloodParticles.splice(i, 1);
        } else {
            blood.vy += 0.3;
            blood.x += blood.vx;
            blood.y += blood.vy;

            if (blood.y > 545) {
                blood.y = 545;
                blood.vy = 0;
                blood.vx *= 0.8;
                blood.life = Math.min(blood.life, 80);
            }

            blood.graphics.setPosition(blood.x, blood.y);
            blood.graphics.setAlpha(Math.min(1, blood.life / 40));
        }
    }

    ragdolls.forEach(ragdoll => {
        const [head, torso, armL, armR, legL, legR] = ragdoll.parts;

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

        // Límites de pantalla y NO SALTAR
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
                if (part.x > 780) {
                    part.setPosition(780, part.y);
                    part.setVelocityX(-Math.abs(part.body.velocity.x) * 0.3);
                }
                if (part.y < 20) {
                    part.setPosition(part.x, 20);
                    part.setVelocityY(Math.abs(part.body.velocity.y) * 0.3);
                }
                if (part.y > 535) {
                    part.setPosition(part.x, 535);
                }
            }
        });

        // Fricción en reposo
        if (!ragdoll.isStanding && !ragdoll.isBeingDragged) {
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
    amount = Math.min(amount, 5);
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
            life: Phaser.Math.Between(60, 120),
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

    const uiAreaX = 800 - 90;
    if (pointer.x > uiAreaX) return;

    // Área de botón de música
    if (pointer.x < 70 && pointer.y > 500) {
        toggleMusic();
        return;
    }

    let closestPart = null;
    let closestDist = isMobile ? 50 : 35;
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

function createSky(scene) {
    // Sol
    sun = scene.add.graphics();
    sun.setDepth(-10);

    // Círculo principal del sol
    sun.fillStyle(0xFFDD00, 1);
    sun.fillCircle(700, 60, 40);

    // Brillo alrededor
    sun.fillStyle(0xFFEE44, 0.5);
    sun.fillCircle(700, 60, 50);

    // Rayos
    sun.lineStyle(3, 0xFFDD00, 0.7);
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x1 = 700 + Math.cos(angle) * 55;
        const y1 = 60 + Math.sin(angle) * 55;
        const x2 = 700 + Math.cos(angle) * 70;
        const y2 = 60 + Math.sin(angle) * 70;
        sun.lineBetween(x1, y1, x2, y2);
    }

    // Crear nubes
    createCloud(scene, 100, 50, 1.2);
    createCloud(scene, 300, 80, 0.8);
    createCloud(scene, 500, 40, 1.0);
    createCloud(scene, 150, 100, 0.6);
    createCloud(scene, 600, 90, 0.9);
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

    const groundGraphics = scene.add.graphics();
    groundGraphics.fillStyle(0x4a7c3f, 1);
    groundGraphics.fillRect(0, 550, 800, 50);

    groundGraphics.fillStyle(0x3d6b35, 1);
    for (let x = 0; x < 800; x += 20) {
        groundGraphics.fillRect(x, 545, 10, 5);
    }

    // Flores decorativas
    const flowerColors = [0xFF69B4, 0xFF1493, 0xFFB6C1, 0xFF4500, 0xFFFF00, 0x9370DB, 0x00CED1, 0xFF6347];

    for (let i = 0; i < 20; i++) {
        const fx = 30 + Math.random() * 740;
        const fy = 535 + Math.random() * 10;
        const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        createFlower(scene, fx, fy, color);
    }

    scene.matter.add.rectangle(400, 575, 800, 50, {
        isStatic: true,
        friction: 1,
        frictionStatic: 1,
        restitution: 0.05,
        label: 'ground'
    });

    scene.matter.add.rectangle(-25, 300, 50, 700, { isStatic: true });
    scene.matter.add.rectangle(825, 300, 50, 700, { isStatic: true });
    scene.matter.add.rectangle(400, -25, 800, 50, { isStatic: true });
}

function createRagdoll(scene, x, y, color) {
    const parts = [];
    const constraints = [];

    ragdollCollisionGroup--;
    const myGroup = ragdollCollisionGroup;

    const skinColor = 0xFFDBB4;
    const shirtColor = color;
    const pantsColor = 0x333333;

    const groundY = 550;
    const legHeight = 30;
    const torsoHeight = 36;

    const feetY = groundY - 15;
    const legY = feetY - legHeight/2;
    const torsoY = feetY - legHeight - torsoHeight/2 + 5;
    const headY = torsoY - torsoHeight/2 - 11 + 5;

    const partOptions = {
        friction: 0.8,
        frictionAir: 0.03,
        frictionStatic: 0.5,
        restitution: 0.1,
        collisionFilter: { group: myGroup }
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

    const ragdoll = {
        parts: parts,
        constraints: constraints,
        color: color,
        team: teamColors.indexOf(color),
        isBeingDragged: false,
        isStanding: true,
        collisionGroup: myGroup
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
    const btnSize = isMobile ? 60 : 50;
    const panelX = 800 - btnSize - 20;

    const uiPanel = scene.add.graphics();
    uiPanel.fillStyle(0x000000, 0.4);
    uiPanel.fillRoundedRect(panelX - 5, 5, btnSize + 20, 220, 12);

    // Botón +
    const spawnButton = scene.add.graphics();
    spawnButton.fillStyle(0x44AA44, 1);
    spawnButton.fillRoundedRect(panelX, 15, btnSize, btnSize, 10);
    spawnButton.fillStyle(0xFFFFFF, 1);
    spawnButton.fillRect(panelX + btnSize/2 - 2, 15 + 12, 4, btnSize - 24);
    spawnButton.fillRect(panelX + 12, 15 + btnSize/2 - 2, btnSize - 24, 4);

    const spawnZone = scene.add.zone(panelX + btnSize/2, 15 + btnSize/2, btnSize, btnSize);
    spawnZone.setInteractive();
    spawnZone.on('pointerdown', () => {
        const newX = Phaser.Math.Between(100, 600);
        createRagdoll(sceneRef, newX, 400, teamColors[currentTeam]);
    });

    // Botón equipo
    teamButton = scene.add.graphics();
    drawTeamButton(teamButton, teamColors[currentTeam], panelX, btnSize);

    const teamZone = scene.add.zone(panelX + btnSize/2, 85 + btnSize/2, btnSize, btnSize);
    teamZone.setInteractive();
    teamZone.on('pointerdown', () => {
        currentTeam = (currentTeam + 1) % 4;
        teamButton.clear();
        drawTeamButton(teamButton, teamColors[currentTeam], panelX, btnSize);
    });

    // Botón limpiar
    const clearButton = scene.add.graphics();
    clearButton.fillStyle(0xAA4444, 1);
    clearButton.fillRoundedRect(panelX, 165, btnSize, 40, 8);

    scene.add.text(panelX + btnSize/2, 185, 'X', {
        font: 'bold 20px Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);

    const clearZone = scene.add.zone(panelX + btnSize/2, 185, btnSize, 40);
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
        });
        ragdolls = [];
    });

    // Botón de música (abajo izquierda)
    musicButton = scene.add.graphics();
    musicButton.setDepth(100);
    updateMusicButton();

    const musicZone = scene.add.zone(35, 572, 60, 45);
    musicZone.setInteractive();
    musicZone.setDepth(100);
    musicZone.on('pointerdown', (pointer) => {
        pointer.event.stopPropagation();
        toggleMusic();
    });
}

function drawTeamButton(graphics, color, panelX, btnSize) {
    graphics.fillStyle(0x555555, 1);
    graphics.fillRoundedRect(panelX, 85, btnSize, btnSize, 10);
    graphics.fillStyle(color, 1);
    graphics.fillCircle(panelX + btnSize/2, 85 + btnSize/2, btnSize/2 - 8);
}
