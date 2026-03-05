// ==================== CANVAS SETUP ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniMapCanvas = document.getElementById('miniMapCanvas');
const miniMapCtx = miniMapCanvas.getContext('2d');

// ==================== GAME CONSTANTS ====================
const WORLD_SIZE = 2000;
const CAMPFIRE_X = 1000;
const CAMPFIRE_Y = 1000;
const CRAFTING_BENCH_X = 1100;
const CRAFTING_BENCH_Y = 1000;
const TOWER_X = 500;
const TOWER_Y = 500;
const MAX_BUILDINGS = 10;

// ==================== MATERIAL DEFINITIONS ====================
const MATERIALS = [
    { id: 'wood', name: 'Wood', icon: '🪵', rarity: 'common', spawnWeight: 45, baseHealth: 40, color: '#8B5A2B', texture: 'tree' },
    { id: 'stone', name: 'Stone', icon: '🪨', rarity: 'common', spawnWeight: 40, baseHealth: 50, color: '#808080', texture: 'rock' },
    { id: 'leather', name: 'Leather', icon: '👜', rarity: 'common', spawnWeight: 35, baseHealth: 30, color: '#8B4513', texture: 'hide' },
    { id: 'herb', name: 'Herb', icon: '🌿', rarity: 'common', spawnWeight: 40, baseHealth: 25, color: '#32CD32', texture: 'plant' },
    { id: 'coal', name: 'Coal', icon: '🔥', rarity: 'common', spawnWeight: 35, baseHealth: 45, color: '#2C3E50', texture: 'ore' },
    { id: 'copper', name: 'Copper', icon: '🔴', rarity: 'uncommon', spawnWeight: 25, baseHealth: 60, color: '#B87333', texture: 'ore' },
    { id: 'iron', name: 'Iron', icon: '⛓️', rarity: 'uncommon', spawnWeight: 22, baseHealth: 65, color: '#B87333', texture: 'ore' },
    { id: 'silver', name: 'Silver', icon: '⚪', rarity: 'uncommon', spawnWeight: 20, baseHealth: 70, color: '#C0C0C0', texture: 'ore' },
    { id: 'crystal', name: 'Crystal', icon: '💎', rarity: 'uncommon', spawnWeight: 18, baseHealth: 60, color: '#A5F2F3', texture: 'crystal' },
    { id: 'gold', name: 'Gold', icon: '🟡', rarity: 'rare', spawnWeight: 12, baseHealth: 75, color: '#FFD700', texture: 'ore' },
    { id: 'sapphire', name: 'Sapphire', icon: '🔵', rarity: 'rare', spawnWeight: 10, baseHealth: 70, color: '#0F52BA', texture: 'crystal' },
    { id: 'ruby', name: 'Ruby', icon: '🔴', rarity: 'rare', spawnWeight: 8, baseHealth: 70, color: '#E0115F', texture: 'crystal' },
    { id: 'emerald', name: 'Emerald', icon: '💚', rarity: 'rare', spawnWeight: 8, baseHealth: 70, color: '#50C878', texture: 'crystal' },
    { id: 'mythril', name: 'Mythril', icon: '⚪', rarity: 'epic', spawnWeight: 5, baseHealth: 85, color: '#B8B8B8', texture: 'ore' },
    { id: 'adamantite', name: 'Adamantite', icon: '🔘', rarity: 'epic', spawnWeight: 4, baseHealth: 90, color: '#5A5A5A', texture: 'ore' },
    { id: 'dragonstone', name: 'Dragonstone', icon: '🐉', rarity: 'epic', spawnWeight: 3, baseHealth: 80, color: '#D43C3C', texture: 'crystal' },
    { id: 'orichalcum', name: 'Orichalcum', icon: '✨', rarity: 'legendary', spawnWeight: 2, baseHealth: 95, color: '#DAA520', texture: 'ore' },
    { id: 'void_crystal', name: 'Void Crystal', icon: '🌌', rarity: 'legendary', spawnWeight: 1, baseHealth: 100, color: '#4B0082', texture: 'crystal' },
    { id: 'phoenix_feather', name: 'Phoenix Feather', icon: '🔥', rarity: 'legendary', spawnWeight: 1, baseHealth: 90, color: '#FF4500', texture: 'feather' },
    { id: 'dragon_scale', name: 'Dragon Scale', icon: '🐲', rarity: 'legendary', spawnWeight: 1, baseHealth: 100, color: '#8B0000', texture: 'scale' }
];

const MATERIAL_MAP = {};
MATERIALS.forEach(m => MATERIAL_MAP[m.id] = m);

// ==================== GAME STATE ====================
let camera = { x: 0, y: 0 };

let player = {
    x: 900,
    y: 1000,
    health: 100,
    maxHealth: 100,
    weapon: 'Fist',
    weaponDamage: 10,
    armor: 0,
    campfireLevel: 1,
    inventory: {}
};
MATERIALS.forEach(m => player.inventory[m.id] = 5);

let campfire = {
    health: 500,
    maxHealth: 500,
    level: 1,
    repelRange: 150,
    upgradeCosts: [
        { wood: 50, stone: 40, iron: 20, crystal: 10, gold: 5 },
        { wood: 100, stone: 80, iron: 40, crystal: 20, gold: 10, sapphire: 5 },
        { wood: 200, stone: 150, iron: 80, crystal: 40, gold: 20, ruby: 5, mythril: 2 },
        { wood: 400, stone: 300, iron: 150, crystal: 80, gold: 40, emerald: 5, orichalcum: 2 }
    ]
};

let tower = {
    x: TOWER_X,
    y: TOWER_Y,
    active: true,
    guardianHealth: 200,
    guardianMaxHealth: 200,
    defeated: false,
    defeatTime: 0,
    cooldownDays: 5
};

let resources = [];
let enemies = [];
let buildings = [];

let gameTime = 6;
let gameRunning = true;
let inTower = false;
let towerBattleLog = [];

let keys = {};
let moveSpeed = 5;
let attackCooldown = 0;
let healCooldown = 0;

// ==================== UTILITY FUNCTIONS ====================
function getRandomPosition() {
    return {
        x: 100 + Math.random() * (WORLD_SIZE - 200),
        y: 100 + Math.random() * (WORLD_SIZE - 200)
    };
}

function isInsideCampfireRange(x, y) {
    return Math.sqrt((x - CAMPFIRE_X) ** 2 + (y - CAMPFIRE_Y) ** 2) <= campfire.repelRange;
}

function isValidResourcePosition(x, y) {
    if (isInsideCampfireRange(x, y)) return false;
    if (Math.sqrt((x - CRAFTING_BENCH_X) ** 2 + (y - CRAFTING_BENCH_Y) ** 2) < 80) return false;
    if (Math.sqrt((x - TOWER_X) ** 2 + (y - TOWER_Y) ** 2) < 120) return false;
    return true;
}

function generateRandomResource() {
    const totalWeight = MATERIALS.reduce((sum, m) => sum + m.spawnWeight, 0);
    let random = Math.random() * totalWeight;
    let cumulative = 0;
    
    for (let m of MATERIALS) {
        cumulative += m.spawnWeight;
        if (random <= cumulative) {
            return {
                id: m.id,
                name: m.name,
                icon: m.icon,
                rarity: m.rarity,
                baseHealth: m.baseHealth,
                color: m.color,
                texture: m.texture
            };
        }
    }
    return MATERIALS[0];
}

function getTimeRemaining() {
    let hour = gameTime;
    let isDay = hour >= 6 && hour < 18;
    if (isDay) {
        return { text: `Day ${Math.round((18 - hour) * 60)}m`, isDay: true };
    } else {
        let minutesLeft;
        if (hour >= 18) {
            minutesLeft = Math.round((24 - hour + 6) * 60);
        } else {
            minutesLeft = Math.round((6 - hour) * 60);
        }
        return { text: `Night ${minutesLeft}m`, isDay: false };
    }
}

function isTowerAvailable() {
    if (!tower.defeated) return true;
    let daysPassed = (gameTime - tower.defeatTime);
    if (daysPassed < 0) daysPassed += 24;
    return daysPassed >= tower.cooldownDays;
}

function getTowerStatus() {
    if (!tower.defeated) return "Available Now!";
    let daysPassed = (gameTime - tower.defeatTime);
    if (daysPassed < 0) daysPassed += 24;
    let daysRemaining = Math.max(0, tower.cooldownDays - daysPassed);
    if (daysRemaining <= 0) {
        tower.defeated = false;
        tower.guardianHealth = tower.guardianMaxHealth;
        return "Available Now!";
    }
    return `Cooldown: ${daysRemaining.toFixed(1)} days`;
}

function updateCamera() {
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    camera.x = Math.max(0, Math.min(WORLD_SIZE - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_SIZE - canvas.height, camera.y));
}

function worldToScreen(wx, wy) {
    return { x: wx - camera.x, y: wy - camera.y };
}

// ==================== WORLD GENERATION FUNCTIONS ====================
function generateWorld() {
    resources = [];
    for (let i = 0; i < 300; i++) {
        const material = generateRandomResource();
        let pos;
        let attempts = 0;
        do {
            pos = getRandomPosition();
            attempts++;
            if (attempts > 500) break;
        } while (!isValidResourcePosition(pos.x, pos.y));
        
        if (attempts <= 500) {
            resources.push({
                x: pos.x,
                y: pos.y,
                type: material.id,
                material: material,
                health: material.baseHealth,
                maxHealth: material.baseHealth
            });
        }
    }
    
    buildings = [];
    for (let i = 0; i < MAX_BUILDINGS; i++) {
        spawnNewBuilding();
    }
}

function spawnNewBuilding() {
    function isValidForBuilding(x, y) {
        if (isInsideCampfireRange(x, y)) return false;
        if (Math.sqrt((x - CRAFTING_BENCH_X) ** 2 + (y - CRAFTING_BENCH_Y) ** 2) < 100) return false;
        if (Math.sqrt((x - TOWER_X) ** 2 + (y - TOWER_Y) ** 2) < 150) return false;
        for (let b of buildings) {
            if (Math.sqrt((x - b.x) ** 2 + (y - b.y) ** 2) < 120) return false;
        }
        return true;
    }
    
    let pos;
    let attempts = 0;
    do {
        pos = getRandomPosition();
        attempts++;
        if (attempts > 500) return;
    } while (!isValidForBuilding(pos.x, pos.y));
    
    const types = ['HOUSE', 'TOWER', 'SHED', 'SMITH', 'TEMPLE', 'MINE', 'LIBRARY', 'FORGE'];
    const type = types[Math.floor(Math.random() * types.length)];
    let inventory = {};
    
    if (type === 'HOUSE') {
        inventory = {
            wood: Math.floor(Math.random() * 30) + 10,
            stone: Math.floor(Math.random() * 20) + 5,
            herb: Math.floor(Math.random() * 5) + 1
        };
    } else if (type === 'TOWER') {
        inventory = {
            iron: Math.floor(Math.random() * 8) + 2,
            gold: Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : 0,
            sapphire: Math.random() > 0.7 ? 1 : 0
        };
    } else if (type === 'SMITH') {
        inventory = {
            iron: Math.floor(Math.random() * 12) + 4,
            coal: Math.floor(Math.random() * 15) + 5,
            gold: Math.random() > 0.6 ? 1 : 0,
            mythril: Math.random() > 0.9 ? 1 : 0
        };
    } else if (type === 'TEMPLE') {
        inventory = {
            crystal: Math.floor(Math.random() * 6) + 2,
            sapphire: Math.random() > 0.6 ? 1 : 0,
            ruby: Math.random() > 0.7 ? 1 : 0,
            emerald: Math.random() > 0.8 ? 1 : 0
        };
    } else if (type === 'MINE') {
        inventory = {
            iron: Math.floor(Math.random() * 20) + 10,
            copper: Math.floor(Math.random() * 15) + 5,
            silver: Math.floor(Math.random() * 10) + 2,
            gold: Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0,
            adamantite: Math.random() > 0.8 ? 1 : 0
        };
    } else if (type === 'LIBRARY') {
        inventory = {
            crystal: Math.floor(Math.random() * 4) + 1,
            dragonstone: Math.random() > 0.9 ? 1 : 0,
            void_crystal: Math.random() > 0.95 ? 1 : 0
        };
    } else if (type === 'FORGE') {
        inventory = {
            iron: Math.floor(Math.random() * 15) + 5,
            coal: Math.floor(Math.random() * 20) + 10,
            mythril: Math.random() > 0.8 ? 1 : 0,
            orichalcum: Math.random() > 0.9 ? 1 : 0
        };
    }
    
    buildings.push({
        x: pos.x,
        y: pos.y,
        type: type,
        inventory: inventory
    });
}

// ==================== UI UPDATE FUNCTIONS ====================
function updateInventoryDisplay() {
    const inventoryBar = document.getElementById('inventoryBar');
    inventoryBar.innerHTML = '';
    
    MATERIALS.forEach(m => {
        const count = player.inventory[m.id] || 0;
        const itemDiv = document.createElement('div');
        itemDiv.className = `inventory-item ${m.rarity}`;
        itemDiv.innerHTML = `
            <div class="item-icon">${m.icon}</div>
            <div class="item-name">${m.name}</div>
            <div class="item-count">${count}</div>
        `;
        inventoryBar.appendChild(itemDiv);
    });
}

function updateCampfireIndicator() {
    let dx = CAMPFIRE_X - player.x;
    let dy = CAMPFIRE_Y - player.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    let direction = '';
    
    if (angle >= -22.5 && angle < 22.5) direction = 'E';
    else if (angle >= 22.5 && angle < 67.5) direction = 'NE';
    else if (angle >= 67.5 && angle < 112.5) direction = 'N';
    else if (angle >= 112.5 && angle < 157.5) direction = 'NW';
    else if (angle >= 157.5 || angle < -157.5) direction = 'W';
    else if (angle >= -157.5 && angle < -112.5) direction = 'SW';
    else if (angle >= -112.5 && angle < -67.5) direction = 'S';
    else if (angle >= -67.5 && angle < -22.5) direction = 'SE';
    
    document.getElementById('campfireDirection').textContent = direction;
    document.getElementById('campfireDistance').textContent = Math.round(distance) + 'm';
}

function updateUI() {
    document.getElementById('healthValue').textContent = player.health;
    document.getElementById('weaponValue').textContent = player.weapon;
    document.getElementById('armorValue').textContent = player.armor;
    document.getElementById('campfireLevel').textContent = campfire.level;
    
    let isDay = gameTime >= 6 && gameTime < 18;
    document.getElementById('timeDisplay').textContent = isDay ? '🌞 Day' : '🌙 Night';
    
    document.getElementById('campfireHealth').textContent = Math.floor(campfire.health);
    document.getElementById('campfireMax').textContent = campfire.maxHealth;
    document.getElementById('campfireLevelNum').textContent = campfire.level;
    document.getElementById('campfireRange').textContent = campfire.repelRange;
    
    let timeInfo = getTimeRemaining();
    document.getElementById('timeRemaining').textContent = timeInfo.text;
    document.getElementById('towerStatus').textContent = getTowerStatus();
    
    updateInventoryDisplay();
    
    if (campfire.level < 5) {
        let nextCost = campfire.upgradeCosts[campfire.level - 1];
        document.getElementById('woodReq').textContent = nextCost.wood || 0;
        document.getElementById('stoneReq').textContent = nextCost.stone || 0;
        document.getElementById('ironReq').textContent = nextCost.iron || 0;
        document.getElementById('crystalReq').textContent = nextCost.crystal || 0;
        document.getElementById('goldReq').textContent = nextCost.gold || 0;
        
        document.getElementById('reqWood').className = 'req-item' + ((player.inventory.wood || 0) >= (nextCost.wood || 0) ? ' met' : '');
        document.getElementById('reqStone').className = 'req-item' + ((player.inventory.stone || 0) >= (nextCost.stone || 0) ? ' met' : '');
        document.getElementById('reqIron').className = 'req-item' + ((player.inventory.iron || 0) >= (nextCost.iron || 0) ? ' met' : '');
        document.getElementById('reqCrystal').className = 'req-item' + ((player.inventory.crystal || 0) >= (nextCost.crystal || 0) ? ' met' : '');
        document.getElementById('reqGold').className = 'req-item' + ((player.inventory.gold || 0) >= (nextCost.gold || 0) ? ' met' : '');
    }
    
    let canUpgrade = campfire.level < 5;
    if (canUpgrade) {
        let nextCost = campfire.upgradeCosts[campfire.level - 1];
        canUpgrade = (player.inventory.wood || 0) >= (nextCost.wood || 0) &&
            (player.inventory.stone || 0) >= (nextCost.stone || 0) &&
            (player.inventory.iron || 0) >= (nextCost.iron || 0) &&
            (player.inventory.crystal || 0) >= (nextCost.crystal || 0) &&
            (player.inventory.gold || 0) >= (nextCost.gold || 0);
    }
    
    document.getElementById('upgradeBtn').className = canUpgrade ? '' : 'disabled';
}

// ==================== DRAWING FUNCTIONS ====================
function drawMiniMap() {
    miniMapCtx.clearRect(0, 0, 120, 120);
    miniMapCtx.fillStyle = '#1a1e34';
    miniMapCtx.fillRect(0, 0, 120, 120);
    
    const scale = 120 / WORLD_SIZE;
    
    miniMapCtx.fillStyle = '#ff4500';
    miniMapCtx.beginPath();
    miniMapCtx.arc(CAMPFIRE_X * scale, CAMPFIRE_Y * scale, 3, 0, Math.PI * 2);
    miniMapCtx.fill();
    
    miniMapCtx.fillStyle = '#9370db';
    miniMapCtx.beginPath();
    miniMapCtx.arc(TOWER_X * scale, TOWER_Y * scale, 3, 0, Math.PI * 2);
    miniMapCtx.fill();
    
    buildings.forEach(b => {
        miniMapCtx.fillStyle = '#8B5A2B';
        miniMapCtx.fillRect(b.x * scale - 1, b.y * scale - 1, 2, 2);
    });
    
    resources.forEach(r => {
        switch (r.material.rarity) {
            case 'common': miniMapCtx.fillStyle = '#aaaaaa'; break;
            case 'uncommon': miniMapCtx.fillStyle = '#32cd32'; break;
            case 'rare': miniMapCtx.fillStyle = '#4169e1'; break;
            case 'epic': miniMapCtx.fillStyle = '#9370db'; break;
            case 'legendary': miniMapCtx.fillStyle = '#ffd700'; break;
            default: miniMapCtx.fillStyle = '#ffffff';
        }
        miniMapCtx.fillRect(r.x * scale - 1, r.y * scale - 1, 2, 2);
    });
    
    enemies.forEach(e => {
        miniMapCtx.fillStyle = '#8b0000';
        miniMapCtx.fillRect(e.x * scale - 1, e.y * scale - 1, 2, 2);
    });
    
    miniMapCtx.fillStyle = '#4169e1';
    miniMapCtx.beginPath();
    miniMapCtx.arc(player.x * scale, player.y * scale, 4, 0, Math.PI * 2);
    miniMapCtx.fill();
    
    miniMapCtx.strokeStyle = '#e94560';
    miniMapCtx.lineWidth = 1;
    miniMapCtx.strokeRect(camera.x * scale, camera.y * scale, canvas.width * scale, canvas.height * scale);
    miniMapCtx.strokeStyle = '#e94560';
    miniMapCtx.lineWidth = 2;
    miniMapCtx.strokeRect(0, 0, 120, 120);
}

function drawResourceWithTexture(r, screenX, screenY) {
    const material = r.material;
    const healthPercent = r.health / r.maxHealth;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    
    if (material.texture === 'tree') {
        ctx.fillStyle = '#8B5A2B';
        ctx.fillRect(screenX - 4, screenY - 15, 8, 25);
        ctx.fillStyle = '#2e8b57';
        ctx.beginPath();
        ctx.arc(screenX, screenY - 25, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3cb371';
        ctx.beginPath();
        ctx.arc(screenX - 5, screenY - 28, 4, 0, Math.PI * 2);
        ctx.arc(screenX + 5, screenY - 22, 4, 0, Math.PI * 2);
        ctx.fill();
    } else if (material.texture === 'rock') {
        ctx.fillStyle = material.color;
        ctx.beginPath();
        ctx.ellipse(screenX, screenY, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#A9A9A9';
        ctx.beginPath();
        ctx.ellipse(screenX - 4, screenY - 2, 3, 2, 0, 0, Math.PI * 2);
        ctx.ellipse(screenX + 5, screenY + 1, 2, 1, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (material.texture === 'ore') {
        ctx.fillStyle = material.color;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 12);
        ctx.lineTo(screenX + 8, screenY - 4);
        ctx.lineTo(screenX + 8, screenY + 4);
        ctx.lineTo(screenX, screenY + 12);
        ctx.lineTo(screenX - 8, screenY + 4);
        ctx.lineTo(screenX - 8, screenY - 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(screenX - 3, screenY - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    } else if (material.texture === 'crystal') {
        ctx.fillStyle = material.color;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 14);
        ctx.lineTo(screenX + 10, screenY);
        ctx.lineTo(screenX, screenY + 14);
        ctx.lineTo(screenX - 10, screenY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(screenX - 5, screenY - 5);
        ctx.lineTo(screenX + 5, screenY + 5);
        ctx.stroke();
        ctx.globalAlpha = 1;
    } else if (material.texture === 'plant') {
        ctx.fillStyle = material.color;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 12);
        ctx.lineTo(screenX - 6, screenY);
        ctx.lineTo(screenX + 6, screenY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#228B22';
        ctx.fillRect(screenX - 1, screenY - 8, 2, 12);
    } else if (material.texture === 'hide') {
        ctx.fillStyle = material.color;
        ctx.fillRect(screenX - 8, screenY - 6, 16, 12);
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(screenX - 6 + i * 4, screenY - 3);
            ctx.lineTo(screenX - 2 + i * 4, screenY + 3);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    } else if (material.texture === 'feather') {
        ctx.fillStyle = material.color;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 10);
        ctx.quadraticCurveTo(screenX + 8, screenY - 5, screenX + 8, screenY);
        ctx.quadraticCurveTo(screenX + 8, screenY + 5, screenX, screenY);
        ctx.quadraticCurveTo(screenX - 8, screenY + 5, screenX - 8, screenY);
        ctx.quadraticCurveTo(screenX - 8, screenY - 5, screenX, screenY - 10);
        ctx.fill();
    } else if (material.texture === 'scale') {
        ctx.fillStyle = material.color;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(screenX - 4 + i * 4, screenY - 2, 3, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        ctx.fillStyle = material.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    const barWidth = 30;
    const barHeight = 4;
    const barX = screenX - barWidth / 2;
    const barY = screenY - 30;
    
    ctx.fillStyle = '#330000';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    if (healthPercent > 0.6) ctx.fillStyle = '#00ff00';
    else if (healthPercent > 0.3) ctx.fillStyle = '#ffff00';
    else ctx.fillStyle = '#ff0000';
    
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
}

function draw() {
    updateCamera();
    updateCampfireIndicator();
    
    ctx.fillStyle = '#1a4d2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    let startX = Math.floor(camera.x / 50) * 50;
    let startY = Math.floor(camera.y / 50) * 50;
    for (let x = startX; x < camera.x + canvas.width; x += 50) {
        let screenX = x - camera.x;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();
    }
    for (let y = startY; y < camera.y + canvas.height; y += 50) {
        let screenY = y - camera.y;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    
    let campfireScreen = worldToScreen(CAMPFIRE_X, CAMPFIRE_Y);
    ctx.beginPath();
    ctx.arc(campfireScreen.x, campfireScreen.y, campfire.repelRange, 0, Math.PI * 2);
    let gradient = ctx.createRadialGradient(
        campfireScreen.x, campfireScreen.y, 0,
        campfireScreen.x, campfireScreen.y, campfire.repelRange
    );
    gradient.addColorStop(0, 'rgba(255, 100, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    let towerScreen = worldToScreen(TOWER_X, TOWER_Y);
    let towerAvailable = isTowerAvailable();
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    
    ctx.fillStyle = towerAvailable ? '#4a4a4a' : '#2a2a2a';
    ctx.fillRect(towerScreen.x - 25, towerScreen.y - 50, 50, 75);
    
    ctx.fillStyle = towerAvailable ? '#6a6a6a' : '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(towerScreen.x - 30, towerScreen.y - 50);
    ctx.lineTo(towerScreen.x, towerScreen.y - 70);
    ctx.lineTo(towerScreen.x + 30, towerScreen.y - 50);
    ctx.fill();
    
    ctx.fillStyle = towerAvailable ? '#ffaa00' : '#666666';
    ctx.fillRect(towerScreen.x - 15, towerScreen.y - 30, 10, 10);
    ctx.fillRect(towerScreen.x + 5, towerScreen.y - 30, 10, 10);
    
    ctx.fillStyle = towerAvailable ? '#e94560' : '#884444';
    ctx.beginPath();
    ctx.moveTo(towerScreen.x + 20, towerScreen.y - 65);
    ctx.lineTo(towerScreen.x + 40, towerScreen.y - 60);
    ctx.lineTo(towerScreen.x + 20, towerScreen.y - 55);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    buildings.forEach(b => {
        let bScreen = worldToScreen(b.x, b.y);
        if (bScreen.x > -50 && bScreen.x < canvas.width + 50 && bScreen.y > -50 && bScreen.y < canvas.height + 50) {
            
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 3;
            
            ctx.fillStyle = '#8B5A2B';
            ctx.fillRect(bScreen.x - 25, bScreen.y - 20, 50, 40);
            
            ctx.fillStyle = '#A0522D';
            ctx.beginPath();
            ctx.moveTo(bScreen.x - 30, bScreen.y - 20);
            ctx.lineTo(bScreen.x, bScreen.y - 45);
            ctx.lineTo(bScreen.x + 30, bScreen.y - 20);
            ctx.fill();
            
            ctx.fillStyle = '#4A2511';
            ctx.fillRect(bScreen.x - 8, bScreen.y - 8, 16, 28);
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.fillText(b.type, bScreen.x - 20, bScreen.y - 50);
            
            ctx.fillStyle = '#ffd700';
            ctx.font = '20px Arial';
            ctx.fillText('📦', bScreen.x - 12, bScreen.y - 30);
        }
    });
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    let benchScreen = worldToScreen(CRAFTING_BENCH_X, CRAFTING_BENCH_Y);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(benchScreen.x - 25, benchScreen.y - 10, 50, 20);
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(benchScreen.x - 20, benchScreen.y - 20, 40, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('🔨', benchScreen.x - 10, benchScreen.y - 25);
    
    resources.forEach(r => {
        let rScreen = worldToScreen(r.x, r.y);
        if (rScreen.x > -40 && rScreen.x < canvas.width + 40 && rScreen.y > -40 && rScreen.y < canvas.height + 40) {
            drawResourceWithTexture(r, rScreen.x, rScreen.y);
        }
    });
    
    enemies.forEach(e => {
        let eScreen = worldToScreen(e.x, e.y);
        if (eScreen.x > -20 && eScreen.x < canvas.width + 20 && eScreen.y > -20 && eScreen.y < canvas.height + 20) {
            
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 3;
            
            ctx.fillStyle = '#8b0000';
            ctx.beginPath();
            ctx.arc(eScreen.x, eScreen.y, 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(eScreen.x - 3, eScreen.y - 3, 2, 0, Math.PI * 2);
            ctx.arc(eScreen.x + 3, eScreen.y - 3, 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(eScreen.x - 12, eScreen.y - 20, 24 * (e.health / 50), 4);
        }
    });
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 20;
    
    ctx.fillStyle = '#654321';
    ctx.fillRect(campfireScreen.x - 15, campfireScreen.y - 8, 30, 15);
    
    ctx.fillStyle = '#ff4500';
    ctx.beginPath();
    ctx.arc(campfireScreen.x, campfireScreen.y - 12, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(campfireScreen.x - 3, campfireScreen.y - 15, 5, 0, Math.PI * 2);
    ctx.arc(campfireScreen.x + 4, campfireScreen.y - 18, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(campfireScreen.x - 40, campfireScreen.y - 40, 80 * (campfire.health / campfire.maxHealth), 6);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(campfireScreen.x - 40, campfireScreen.y - 40, 80, 6);
    
    let playerScreen = worldToScreen(player.x, player.y);
    
    ctx.shadowColor = '#4169e1';
    ctx.shadowBlur = 15;
    
    ctx.fillStyle = '#4169e1';
    ctx.beginPath();
    ctx.arc(playerScreen.x, playerScreen.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(playerScreen.x - 3, playerScreen.y - 3, 2, 0, Math.PI * 2);
    ctx.arc(playerScreen.x + 3, playerScreen.y - 3, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(playerScreen.x - 15, playerScreen.y - 20, 30 * (player.health / player.maxHealth), 4);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(playerScreen.x - 15, playerScreen.y - 20, 30, 4);
    
    let isDay = gameTime >= 6 && gameTime < 18;
    let outsideSafe = !isInsideCampfireRange(player.x, player.y) && !isDay;
    document.getElementById('warningMessage').style.display = outsideSafe ? 'inline' : 'none';
    
    if (outsideSafe) {
        ctx.fillStyle = 'rgba(50, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (!isDay) {
        ctx.fillStyle = 'rgba(0, 0, 30, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    if (isDay) {
        ctx.shadowColor = '#ffdd77';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ffdd77';
        ctx.beginPath();
        ctx.arc(750, 50, 20, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.shadowColor = '#fffbe6';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fffbe6';
        ctx.beginPath();
        ctx.arc(750, 50, 15, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.shadowBlur = 0;
    
    drawMiniMap();
    updateUI();
}

// ==================== PLAYER ACTION FUNCTIONS ====================
function playerAttack() {
    if (attackCooldown > 0 || inTower) return;
    enemies.forEach(e => {
        if (Math.sqrt((player.x - e.x) ** 2 + (player.y - e.y) ** 2) < 60) {
            e.health -= player.weaponDamage;
            attackCooldown = 15;
        }
    });
}

function playerInteract() {
    if (inTower) return;
    
    if (Math.sqrt((player.x - TOWER_X) ** 2 + (player.y - TOWER_Y) ** 2) < 80) {
        enterTower();
        return;
    }
    
    if (Math.sqrt((player.x - CRAFTING_BENCH_X) ** 2 + (player.y - CRAFTING_BENCH_Y) ** 2) < 60) {
        openCraftingBench();
        return;
    }
    
    for (let b of buildings) {
        if (Math.sqrt((player.x - b.x) ** 2 + (player.y - b.y) ** 2) < 60) {
            showBuildingInventory(b);
            return;
        }
    }
    
    resources.forEach((r, i) => {
        if (Math.sqrt((player.x - r.x) ** 2 + (player.y - r.y) ** 2) < 50) {
            r.health -= Math.max(1, Math.floor(player.weaponDamage / 2));
            if (r.health <= 0) {
                player.inventory[r.type] = (player.inventory[r.type] || 0) + 1;
                resources.splice(i, 1);
                
                setTimeout(() => {
                    let x, y;
                    do {
                        x = 100 + Math.random() * (WORLD_SIZE - 200);
                        y = 100 + Math.random() * (WORLD_SIZE - 200);
                    } while (!isValidResourcePosition(x, y));
                    
                    const newMaterial = generateRandomResource();
                    resources.push({
                        x, y,
                        type: newMaterial.id,
                        material: newMaterial,
                        health: newMaterial.baseHealth,
                        maxHealth: newMaterial.baseHealth
                    });
                }, 30000);
            }
        }
    });
}

function repairCampfire() {
    if (player.inventory.wood >= 10 && player.inventory.stone >= 5) {
        campfire.health = Math.min(campfire.maxHealth, campfire.health + 100);
        player.inventory.wood -= 10;
        player.inventory.stone -= 5;
        updateInventoryDisplay();
    }
}

function upgradeCampfire() {
    if (campfire.level >= 5) return;
    let cost = campfire.upgradeCosts[campfire.level - 1];
    let canUpgrade = true;
    for (let [item, amount] of Object.entries(cost)) {
        if ((player.inventory[item] || 0) < amount) canUpgrade = false;
    }
    if (canUpgrade) {
        for (let [item, amount] of Object.entries(cost)) player.inventory[item] -= amount;
        campfire.level++;
        campfire.maxHealth = 500 + (campfire.level * 250);
        campfire.health = campfire.maxHealth;
        campfire.repelRange = 150 + (campfire.level * 50);
        updateInventoryDisplay();
    }
}

function playerHeal() {
    if (healCooldown > 0 || player.inventory.herb < 1) return;
    player.inventory.herb -= 1;
    player.health = Math.min(player.maxHealth, player.health + 10);
    healCooldown = 10;
    document.getElementById('healBtn').classList.add('disabled');
    let cooldownInterval = setInterval(() => {
        healCooldown--;
        if (healCooldown <= 0) {
            clearInterval(cooldownInterval);
            document.getElementById('healBtn').classList.remove('disabled');
        }
    }, 1000);
    updateInventoryDisplay();
}

function quickCraft() {
    if (player.inventory.herb >= 3) {
        player.inventory.herb -= 3;
        player.health = Math.min(player.maxHealth, player.health + 20);
        updateInventoryDisplay();
    }
}

// ==================== CRAFTING FUNCTIONS ====================
function craftItem(requirements) {
    let canCraft = true;
    for (let [item, amount] of Object.entries(requirements)) {
        if (item !== 'weapon' && item !== 'damage' && item !== 'armor' && item !== 'heal') {
            if ((player.inventory[item] || 0) < amount) canCraft = false;
        }
    }
    if (canCraft) {
        for (let [item, amount] of Object.entries(requirements)) {
            if (item !== 'weapon' && item !== 'damage' && item !== 'armor' && item !== 'heal') {
                player.inventory[item] -= amount;
            }
        }
        if (requirements.weapon) {
            player.weapon = requirements.weapon;
            player.weaponDamage = requirements.damage;
        }
        if (requirements.armor) player.armor += requirements.armor;
        if (requirements.heal) player.health = Math.min(player.maxHealth, player.health + requirements.heal);
        updateInventoryDisplay();
    }
}

function openCraftingBench() {
    let grid = document.getElementById('benchCraftingGrid');
    grid.innerHTML = '';
    const benchRecipes = [
        { name: 'Wood Sword', req: 'Wood x3, Stone x1', craft: () => craftItem({ wood: 3, stone: 1, weapon: 'Wood Sword', damage: 15 }) },
        { name: 'Stone Axe', req: 'Stone x3, Wood x2', craft: () => craftItem({ stone: 3, wood: 2, weapon: 'Stone Axe', damage: 20 }) },
        { name: 'Leather Armor', req: 'Leather x4, Wood x2', craft: () => craftItem({ leather: 4, wood: 2, armor: 5 }) },
        { name: 'Iron Sword', req: 'Iron x3, Coal x2', craft: () => craftItem({ iron: 3, coal: 2, weapon: 'Iron Sword', damage: 30 }) },
        { name: 'Gold Sword', req: 'Gold x2, Iron x3', craft: () => craftItem({ gold: 2, iron: 3, weapon: 'Gold Sword', damage: 40 }) },
        { name: 'Herbal Potion', req: 'Herb x3', craft: () => craftItem({ herb: 3, heal: 30 }) }
    ];
    benchRecipes.forEach(recipe => {
        let slot = document.createElement('div');
        slot.className = 'bench-craft-slot';
        slot.innerHTML = `<div class="item-name">${recipe.name}</div><div class="item-req">${recipe.req}</div>`;
        slot.addEventListener('click', () => { recipe.craft(); updateUI(); });
        grid.appendChild(slot);
    });
    document.getElementById('craftingBenchPopup').style.display = 'block';
}

function closeBenchPopup() {
    document.getElementById('craftingBenchPopup').style.display = 'none';
}

// ==================== TOWER FUNCTIONS ====================
function enterTower() {
    if (!isTowerAvailable()) return;
    inTower = true;
    document.getElementById('towerPopup').style.display = 'block';
    document.getElementById('towerEnemyHealth').textContent = tower.guardianHealth;
    document.getElementById('towerPlayerHealthValue').textContent = player.health;
    addTowerLog("You enter the tower... A guardian appears!");
}

function towerAttack() {
    if (!inTower) return;
    let playerDamage = player.weaponDamage + Math.floor(Math.random() * 15);
    tower.guardianHealth -= playerDamage;
    addTowerLog(`You hit for ${playerDamage} damage!`);
    if (tower.guardianHealth <= 0) {
        tower.defeated = true;
        tower.defeatTime = gameTime;
        addTowerLog("🎉 VICTORY! You defeated the tower guardian!");
        player.inventory.gold += 3;
        player.inventory.crystal += 2;
        document.getElementById('towerAttackBtn').disabled = true;
        updateInventoryDisplay();
        return;
    }
    let guardianDamage = Math.max(8, 20 - player.armor);
    player.health -= guardianDamage;
    addTowerLog(`Guardian hits you for ${guardianDamage} damage!`);
    document.getElementById('towerEnemyHealth').textContent = tower.guardianHealth;
    document.getElementById('towerPlayerHealthValue').textContent = player.health;
}

function towerHeal() {
    if (player.inventory.herb >= 5) {
        player.inventory.herb -= 5;
        player.health = Math.min(player.maxHealth, player.health + 30);
        addTowerLog("You used 5 herbs to heal 30 HP!");
        document.getElementById('towerPlayerHealthValue').textContent = player.health;
        updateInventoryDisplay();
    }
}

function addTowerLog(message) {
    towerBattleLog.push(message);
    if (towerBattleLog.length > 3) towerBattleLog.shift();
    document.getElementById('towerBattleLog').innerHTML = towerBattleLog.join('<br>');
}

function closeTower() {
    inTower = false;
    document.getElementById('towerPopup').style.display = 'none';
}

// ==================== BUILDING FUNCTIONS ====================
function showBuildingInventory(building) {
    let grid = document.getElementById('buildingInventoryGrid');
    document.getElementById('buildingName').textContent = building.type;
    grid.innerHTML = '';
    for (let [item, count] of Object.entries(building.inventory)) {
        if (count > 0) {
            const material = MATERIAL_MAP[item] || { icon: '📦', name: item };
            let slot = document.createElement('div');
            slot.className = 'building-slot';
            slot.innerHTML = `<div class="item-icon">${material.icon}</div><div class="item-count">${count}</div>`;
            slot.addEventListener('click', () => takeFromBuilding(building, item));
            grid.appendChild(slot);
        }
    }
    document.getElementById('buildingInventory').style.display = 'block';
}

function takeFromBuilding(building, item) {
    if (building.inventory[item] > 0) {
        player.inventory[item] = (player.inventory[item] || 0) + 1;
        building.inventory[item]--;
        if (Object.values(building.inventory).reduce((a, b) => a + b, 0) === 0) {
            let index = buildings.indexOf(building);
            if (index !== -1) buildings.splice(index, 1);
            closeBuildingInventory();
        } else {
            showBuildingInventory(building);
        }
        updateInventoryDisplay();
    }
}

function closeBuildingInventory() {
    document.getElementById('buildingInventory').style.display = 'none';
}

// ==================== GAME LOOP FUNCTIONS ====================
function update() {
    if (!gameRunning) return;
    
    gameTime += 0.001;
    if (gameTime >= 24) gameTime = 0;
    
    if (attackCooldown > 0) attackCooldown--;
    
    if (!inTower) {
        if (keys['w'] || keys['W']) player.y -= moveSpeed;
        if (keys['s'] || keys['S']) player.y += moveSpeed;
        if (keys['a'] || keys['A']) player.x -= moveSpeed;
        if (keys['d'] || keys['D']) player.x += moveSpeed;
        player.x = Math.max(50, Math.min(WORLD_SIZE - 50, player.x));
        player.y = Math.max(50, Math.min(WORLD_SIZE - 50, player.y));
    }
    
    enemies.forEach((e, i) => {
        let distToCampfire = Math.sqrt((e.x - CAMPFIRE_X) ** 2 + (e.y - CAMPFIRE_Y) ** 2);
        
        if (distToCampfire < campfire.repelRange) {
            let angle = Math.atan2(e.y - CAMPFIRE_Y, e.x - CAMPFIRE_X);
            e.x += Math.cos(angle) * 2.5;
            e.y += Math.sin(angle) * 2.5;
        } else {
            let dx = player.x - e.x;
            let dy = player.y - e.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                e.x += (dx / dist) * e.speed;
                e.y += (dy / dist) * e.speed;
            }
        }
        
        e.x = Math.max(50, Math.min(WORLD_SIZE - 50, e.x));
        e.y = Math.max(50, Math.min(WORLD_SIZE - 50, e.y));
        
        if (Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2) < 30 && e.attackTimer <= 0) {
            player.health -= Math.max(1, e.damage - player.armor);
            e.attackTimer = 30;
        }
        
        if (e.attackTimer > 0) e.attackTimer--;
        
        if (e.health <= 0) {
            enemies.splice(i, 1);
            player.inventory.leather = (player.inventory.leather || 0) + 1;
            if (Math.random() > 0.7) player.inventory.herb = (player.inventory.herb || 0) + 1;
        }
    });
    
    let isDay = gameTime >= 6 && gameTime < 18;
    if (!isDay && enemies.length < 8) {
        if (Math.random() < 0.008) {
            let angle = Math.random() * Math.PI * 2;
            enemies.push({
                x: player.x + Math.cos(angle) * 300,
                y: player.y + Math.sin(angle) * 300,
                health: 50 + (campfire.level * 5),
                damage: 12 + campfire.level,
                speed: 0.9,
                attackTimer: 0
            });
        }
    }
    
    if (player.health <= 0 || campfire.health <= 0) {
        resetGame();
    }
    
    draw();
    requestAnimationFrame(update);
}

function resetGame() {
    player = {
        x: 900, y: 1000, health: 100, maxHealth: 100,
        weapon: 'Fist', weaponDamage: 10, armor: 0, campfireLevel: 1,
        inventory: {}
    };
    MATERIALS.forEach(m => player.inventory[m.id] = 5);
    
    campfire = {
        health: 500, maxHealth: 500, level: 1, repelRange: 150,
        upgradeCosts: [
            { wood: 50, stone: 40, iron: 20, crystal: 10, gold: 5 },
            { wood: 100, stone: 80, iron: 40, crystal: 20, gold: 10, sapphire: 5 },
            { wood: 200, stone: 150, iron: 80, crystal: 40, gold: 20, ruby: 5, mythril: 2 },
            { wood: 400, stone: 300, iron: 150, crystal: 80, gold: 40, emerald: 5, orichalcum: 2 }
        ]
    };
    
    tower.defeated = false;
    tower.guardianHealth = 200;
    tower.defeatTime = 0;
    enemies = [];
    generateWorld();
    updateInventoryDisplay();
}

// ==================== KEYBOARD FUNCTIONS ====================
function handleKeyDown(e) {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'Space') { e.preventDefault(); playerAttack(); }
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); playerInteract(); }
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); repairCampfire(); }
    if (e.key === 'c' || e.key === 'C') { e.preventDefault(); openCraftingBench(); }
    if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); quickCraft(); }
    if (e.key === 'h' || e.key === 'H') { e.preventDefault(); playerHeal(); }
    if (e.key === 'u' || e.key === 'U') { e.preventDefault(); upgradeCampfire(); }
    if (e.key === 'Escape') { closeTower(); closeBenchPopup(); closeBuildingInventory(); }
}

function handleKeyUp(e) {
    keys[e.key] = false;
}

// ==================== EVENT LISTENER FUNCTIONS ====================
function initEventListeners() {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    document.getElementById('attackBtn').addEventListener('click', playerAttack);
    document.getElementById('interactBtn').addEventListener('click', playerInteract);
    document.getElementById('benchBtn').addEventListener('click', openCraftingBench);
    document.getElementById('repairBtn').addEventListener('click', repairCampfire);
    document.getElementById('healBtn').addEventListener('click', playerHeal);
    document.getElementById('quickCraftBtn').addEventListener('click', quickCraft);
    document.getElementById('upgradeBtn').addEventListener('click', upgradeCampfire);
    document.getElementById('towerAttackBtn').addEventListener('click', towerAttack);
    document.getElementById('towerHealBtn').addEventListener('click', towerHeal);
    document.getElementById('closeTowerBtn').addEventListener('click', closeTower);
    document.getElementById('closeBenchPopup').addEventListener('click', closeBenchPopup);
    document.getElementById('closeBuildingInventory').addEventListener('click', closeBuildingInventory);
}

// ==================== INITIALIZATION ====================
function init() {
    generateWorld();
    updateInventoryDisplay();
    initEventListeners();
    draw();
    update();
}

window.addEventListener('load', init);
