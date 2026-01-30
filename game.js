// ============================================
// MI SANDBOX - Juego estilo Melon Playground
// Con sistema RAGDOLL mejorado
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

// Variables globales
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

game = new Phaser.Game(config);

function preload() {}

function create() {
    sceneRef = this;

    createGround(this);

    // Crear ragdolls iniciales
    createRagdoll(this, 200, 250, teamColors[0]);
    createRagdoll(this, 400, 250, teamColors[1]);
    createRagdoll(this, 600, 250, teamColors[2]);

    createUI(this);

    this.add.text(10, 10, 'Arrastra cualquier parte del cuerpo!', {
        font: '16px Arial',
        fill: '#333333'
    });

    // Controles
    this.input.on('pointerdown', onPointerDown);
    this.input.on('pointermove', onPointerMove);
    this.input.on('pointerup', onPointerUp);
}

function update() {
    // Mantener ragdolls dentro de la pantalla y aplicar fricción en reposo
    ragdolls.forEach(ragdoll => {
        let isOnGround = false;
        let totalVelocity = 0;

        ragdoll.parts.forEach(part => {
            if (part && part.body) {
                totalVelocity += Math.abs(part.body.velocity.x) + Math.abs(part.body.velocity.y);

                // Detectar si está en el suelo
                if (part.y > 500) {
                    isOnGround = true;
                }

                // Limitar posición
                if (part.x < 20) {
                    part.setPosition(20, part.y);
                    part.setVelocityX(Math.abs(part.body.velocity.x) * 0.5);
                }
                if (part.x > 780) {
                    part.setPosition(780, part.y);
                    part.setVelocityX(-Math.abs(part.body.velocity.x) * 0.5);
                }
                if (part.y < 20) {
                    part.setPosition(part.x, 20);
                    part.setVelocityY(Math.abs(part.body.velocity.y) * 0.5);
                }
                if (part.y > 530) {
                    part.setPosition(part.x, 530);
                    part.setVelocityY(-Math.abs(part.body.velocity.y) * 0.3);
                }
            }
        });

        // Si está en el suelo y moviéndose lento, detener completamente
        if (isOnGround && totalVelocity < 15 && !ragdoll.isBeingDragged) {
            ragdoll.parts.forEach(part => {
                if (part && part.body) {
                    // Aplicar fricción fuerte
                    part.setVelocity(
                        part.body.velocity.x * 0.85,
                        part.body.velocity.y * 0.85
                    );

                    // Si muy lento, detener
                    if (Math.abs(part.body.velocity.x) < 0.3) {
                        part.setVelocityX(0);
                    }
                    if (Math.abs(part.body.velocity.y) < 0.3 && part.y > 480) {
                        part.setVelocityY(0);
                    }
                }
            });
        }
    });
}

function onPointerDown(pointer) {
    if (pointer.x > 710) return;

    // Buscar parte del cuerpo bajo el puntero
    let closestPart = null;
    let closestDist = 30;
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
        selectedPart = closestPart;
        selectedPart.ownerRagdoll = ownerRagdoll;
        ownerRagdoll.isBeingDragged = true;
        isDragging = true;
        lastPointerPosition.x = pointer.x;
        lastPointerPosition.y = pointer.y;
        velocity = { x: 0, y: 0 };

        selectedPart.setIgnoreGravity(true);

        // Despertar todo el ragdoll
        ownerRagdoll.parts.forEach(part => {
            if (part && part.body) {
                part.setVelocity(0, 0);
            }
        });
    }
}

function onPointerMove(pointer) {
    if (isDragging && selectedPart) {
        // Calcular velocidad
        velocity.x = (pointer.x - lastPointerPosition.x);
        velocity.y = (pointer.y - lastPointerPosition.y);

        // Mover la parte seleccionada hacia el puntero
        const targetX = pointer.x;
        const targetY = pointer.y;

        const forceX = (targetX - selectedPart.x) * 0.15;
        const forceY = (targetY - selectedPart.y) * 0.15;

        selectedPart.setVelocity(forceX * 2.5, forceY * 2.5);

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

        // Lanzar con velocidad
        const throwPower = 0.8;
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

    // Suelo con mucha fricción
    scene.matter.add.rectangle(400, 575, 800, 50, {
        isStatic: true,
        friction: 1,
        frictionStatic: 1,
        restitution: 0.05,
        label: 'ground'
    });

    // Paredes
    scene.matter.add.rectangle(-25, 300, 50, 700, { isStatic: true, label: 'wall' });
    scene.matter.add.rectangle(825, 300, 50, 700, { isStatic: true, label: 'wall' });
    scene.matter.add.rectangle(400, -25, 800, 50, { isStatic: true, label: 'ceiling' });
}

function createRagdoll(scene, x, y, color) {
    const parts = [];
    const constraints = [];

    // Cada ragdoll tiene su propio grupo de colisión
    ragdollCollisionGroup--;
    const myGroup = ragdollCollisionGroup;

    // Colores
    const skinColor = 0xFFDBB4;
    const shirtColor = color;
    const pantsColor = 0x333333;

    // Opciones comunes - las partes del mismo ragdoll NO colisionan entre sí
    const partOptions = {
        friction: 0.9,
        frictionAir: 0.02,
        frictionStatic: 0.5,
        restitution: 0.1,
        collisionFilter: {
            group: myGroup  // Mismo grupo negativo = no colisionan entre sí
        }
    };

    // === CABEZA ===
    const headTexture = createPartTexture(scene, 'head', 22, 22, skinColor, true);
    const head = scene.matter.add.sprite(x, y - 50, headTexture, null, {
        ...partOptions,
        shape: { type: 'circle', radius: 11 },
        density: 0.002,
        label: 'head'
    });
    parts.push(head);

    // === TORSO ===
    const torsoTexture = createPartTexture(scene, 'torso', 28, 36, shirtColor);
    const torso = scene.matter.add.sprite(x, y - 15, torsoTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 28, height: 36 },
        density: 0.003,
        label: 'torso'
    });
    parts.push(torso);

    // === BRAZO IZQUIERDO (superior) ===
    const armLTexture = createPartTexture(scene, 'armL', 10, 20, skinColor);
    const armL = scene.matter.add.sprite(x - 20, y - 18, armLTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 10, height: 20 },
        density: 0.001,
        label: 'armL'
    });
    parts.push(armL);

    // === BRAZO DERECHO (superior) ===
    const armRTexture = createPartTexture(scene, 'armR', 10, 20, skinColor);
    const armR = scene.matter.add.sprite(x + 20, y - 18, armRTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 10, height: 20 },
        density: 0.001,
        label: 'armR'
    });
    parts.push(armR);

    // === PIERNA IZQUIERDA ===
    const legLTexture = createPartTexture(scene, 'legL', 12, 30, pantsColor);
    const legL = scene.matter.add.sprite(x - 8, y + 22, legLTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 12, height: 30 },
        density: 0.0015,
        label: 'legL'
    });
    parts.push(legL);

    // === PIERNA DERECHA ===
    const legRTexture = createPartTexture(scene, 'legR', 12, 30, pantsColor);
    const legR = scene.matter.add.sprite(x + 8, y + 22, legRTexture, null, {
        ...partOptions,
        shape: { type: 'rectangle', width: 12, height: 30 },
        density: 0.0015,
        label: 'legR'
    });
    parts.push(legR);

    // === CONECTAR PARTES CON JOINTS MÁS RÍGIDOS ===

    // Cabeza - Torso (cuello rígido)
    const neckJoint = scene.matter.add.constraint(head, torso, 5, 1, {
        pointA: { x: 0, y: 11 },
        pointB: { x: 0, y: -18 }
    });
    constraints.push(neckJoint);

    // Torso - Brazo Izquierdo (hombro)
    const shoulderL = scene.matter.add.constraint(torso, armL, 3, 0.9, {
        pointA: { x: -14, y: -14 },
        pointB: { x: 0, y: -8 }
    });
    constraints.push(shoulderL);

    // Torso - Brazo Derecho (hombro)
    const shoulderR = scene.matter.add.constraint(torso, armR, 3, 0.9, {
        pointA: { x: 14, y: -14 },
        pointB: { x: 0, y: -8 }
    });
    constraints.push(shoulderR);

    // Torso - Pierna Izquierda (cadera)
    const hipL = scene.matter.add.constraint(torso, legL, 3, 0.95, {
        pointA: { x: -7, y: 18 },
        pointB: { x: 0, y: -14 }
    });
    constraints.push(hipL);

    // Torso - Pierna Derecha (cadera)
    const hipR = scene.matter.add.constraint(torso, legR, 3, 0.95, {
        pointA: { x: 7, y: 18 },
        pointB: { x: 0, y: -14 }
    });
    constraints.push(hipR);

    const ragdoll = {
        parts: parts,
        constraints: constraints,
        color: color,
        team: teamColors.indexOf(color),
        isBeingDragged: false,
        collisionGroup: myGroup
    };

    ragdolls.push(ragdoll);
    return ragdoll;
}

function createPartTexture(scene, name, width, height, color, isHead = false) {
    const key = name + '_' + color + '_' + Date.now() + '_' + Math.random();
    const graphics = scene.make.graphics({ add: false });

    if (isHead) {
        // Cabeza redonda
        graphics.fillStyle(color, 1);
        graphics.fillCircle(width/2, height/2, width/2);

        // Ojos
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(width/2 - 4, height/2 - 2, 2);
        graphics.fillCircle(width/2 + 4, height/2 - 2, 2);

        // Boca
        graphics.fillRect(width/2 - 3, height/2 + 5, 6, 2);
    } else {
        // Parte rectangular con bordes redondeados
        graphics.fillStyle(color, 1);
        graphics.fillRoundedRect(0, 0, width, height, 3);

        // Borde sutil
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

    // Botón crear NPC
    const spawnButton = scene.add.graphics();
    spawnButton.fillStyle(0x44AA44, 1);
    spawnButton.fillRoundedRect(720, 10, 70, 40, 8);
    spawnButton.fillStyle(0xFFFFFF, 1);
    spawnButton.fillRect(752, 18, 4, 24);
    spawnButton.fillRect(742, 28, 24, 4);

    const spawnZone = scene.add.zone(755, 30, 70, 40);
    spawnZone.setInteractive();
    spawnZone.on('pointerdown', () => {
        const newX = Phaser.Math.Between(150, 650);
        createRagdoll(scene, newX, 100, teamColors[currentTeam]);
    });

    // Botón cambiar equipo
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

    // Botón limpiar
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
