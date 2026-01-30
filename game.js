// ============================================
// MI SANDBOX - Juego estilo Melon Playground
// Con sangre y sonidos
// ============================================

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0.8 },
            debug: false
        }
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

game = new Phaser.Game(config);

function preload() {}

function create() {
    sceneRef = this;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}

    createGround(this);

    createRagdoll(this, 200, 400, teamColors[0]);
    createRagdoll(this, 400, 400, teamColors[1]);
    createRagdoll(this, 600, 400, teamColors[2]);

    createUI(this);

    this.add.text(10, 10, 'Toca un muñeco para que se caiga!', {
        font: '16px Arial',
        fill: '#333333'
    });

    this.input.on('pointerdown', onPointerDown);
    this.input.on('pointermove', onPointerMove);
    this.input.on('pointerup', onPointerUp);

    // Sangre SOLO al chocar fuerte
    this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            const vel = Math.abs(bodyA.velocity?.x || 0) + Math.abs(bodyA.velocity?.y || 0) +
                Math.abs(bodyB.velocity?.x || 0) + Math.abs(bodyB.velocity?.y || 0);

            // Solo si el impacto es MUY fuerte
            if (vel > 12) {
                const x = pair.collision.supports[0]?.x || bodyA.position.x;
                const y = pair.collision.supports[0]?.y || bodyA.position.y;

                // 25% de chance de sangre
                if (Math.random() < 0.25) {
                    spawnBlood(x, y, Math.min(5, Math.floor(vel / 8))); // Máximo 5 gotas
                }

                playHitSound(vel / 30);
            } else if (vel > 6) {
                // Golpe medio: solo sonido
                playHitSound(vel / 40);
            }
        });
    });
}

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

function update() {
    // Actualizar sangre
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

        if (torso && torso.body) {
            const torsoAngle = torso.body.angle;
            if (head && head.body) limitAngle(head, torsoAngle, 0.7);
            if (armL && armL.body) limitAngle(armL, torsoAngle, 2.0);
            if (armR && armR.body) limitAngle(armR, torsoAngle, 2.0);
            if (legL && legL.body) limitAngle(legL, torsoAngle, 1.5);
            if (legR && legR.body) limitAngle(legR, torsoAngle, 1.5);
        }

        ragdoll.parts.forEach(part => {
            if (part && part.body) {
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
    amount = Math.min(amount, 5); // Máximo 5 gotas

    if (amount > 2) {
        playSplatSound();
    }

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
    if (pointer.x > 710) return;

    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }

    let closestPart = null;
    let closestDist = 35;
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
        }

        selectedPart.setVelocity(
            velocity.x * throwPower,
            velocity.y * throwPower
        );

        selectedPart = null;
        isDragging = false;
    }
}

function createGround(scene) {
    const groundGraphics = scene.add.graphics();
    groundGraphics.fillStyle(0x4a7c3f, 1);
    groundGraphics.fillRect(0, 550, 800, 50);

    groundGraphics.fillStyle(0x3d6b35, 1);
    for (let x = 0; x < 800; x += 20) {
        groundGraphics.fillRect(x, 545, 10, 5);
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
    const headSize = 22;

    const feetY = groundY - 15;
    const legY = feetY - legHeight/2;
    const torsoY = feetY - legHeight - torsoHeight/2 + 5;
    const headY = torsoY - torsoHeight/2 - headSize/2 + 5;

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
        density: 0.001,
        label: 'head'
    });
    parts.push(head);

    const torsoTexture = createPartTexture(scene, 'torso', 28, 36, shirtColor);
    const torso = scene.matter.add.sprite(x, torsoY, torsoTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 28, height: 36 },
        density: 0.002,
        label: 'torso'
    });
    parts.push(torso);

    const armLTexture = createPartTexture(scene, 'armL', 10, 22, skinColor);
    const armL = scene.matter.add.sprite(x - 19, torsoY, armLTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 10, height: 22 },
        density: 0.0008,
        label: 'armL'
    });
    parts.push(armL);

    const armRTexture = createPartTexture(scene, 'armR', 10, 22, skinColor);
    const armR = scene.matter.add.sprite(x + 19, torsoY, armRTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 10, height: 22 },
        density: 0.0008,
        label: 'armR'
    });
    parts.push(armR);

    const legLTexture = createPartTexture(scene, 'legL', 12, 30, pantsColor);
    const legL = scene.matter.add.sprite(x - 8, legY, legLTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 12, height: 30 },
        density: 0.001,
        label: 'legL'
    });
    parts.push(legL);

    const legRTexture = createPartTexture(scene, 'legR', 12, 30, pantsColor);
    const legR = scene.matter.add.sprite(x + 8, legY, legRTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 12, height: 30 },
        density: 0.001,
        label: 'legR'
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
    const uiPanel = scene.add.graphics();
    uiPanel.fillStyle(0x000000, 0.3);
    uiPanel.fillRoundedRect(715, 5, 80, 200, 10);

    const spawnButton = scene.add.graphics();
    spawnButton.fillStyle(0x44AA44, 1);
    spawnButton.fillRoundedRect(720, 10, 70, 40, 8);
    spawnButton.fillStyle(0xFFFFFF, 1);
    spawnButton.fillRect(752, 18, 4, 24);
    spawnButton.fillRect(742, 28, 24, 4);

    const spawnZone = scene.add.zone(755, 30, 70, 40);
    spawnZone.setInteractive();
    spawnZone.on('pointerdown', () => {
        const newX = Phaser.Math.Between(100, 650);
        createRagdoll(sceneRef, newX, 400, teamColors[currentTeam]);
    });

    teamButton = scene.add.graphics();
    drawTeamButton(teamButton, teamColors[currentTeam]);

    const teamZone = scene.add.zone(755, 80, 70, 40);
    teamZone.setInteractive();
    teamZone.on('pointerdown', () => {
        currentTeam = (currentTeam + 1) % 4;
        teamButton.clear();
        drawTeamButton(teamButton, teamColors[currentTeam]);
        const teamNames = ['Rojo', 'Azul', 'Amarillo', 'Verde'];
        uiText.setText('Equipo:\n' + teamNames[currentTeam]);
    });

    uiText = scene.add.text(725, 115, 'Equipo:\nRojo', {
        font: '12px Arial',
        fill: '#FFFFFF',
        align: 'center'
    });

    const clearButton = scene.add.graphics();
    clearButton.fillStyle(0xAA4444, 1);
    clearButton.fillRoundedRect(720, 160, 70, 30, 6);

    scene.add.text(730, 168, 'Limpiar', {
        font: '12px Arial',
        fill: '#FFFFFF'
    });

    const clearZone = scene.add.zone(755, 175, 70, 30);
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
}

function drawTeamButton(graphics, color) {
    graphics.fillStyle(0x666666, 1);
    graphics.fillRoundedRect(720, 60, 70, 40, 8);
    graphics.fillStyle(color, 1);
    graphics.fillCircle(755, 80, 14);
}
