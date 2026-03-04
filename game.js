// script.js
(function() {
    // ---------- CONSTANTS & SETUP ----------
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const miniMapCanvas = document.getElementById('miniMapCanvas');
    const miniMapCtx = miniMapCanvas.getContext('2d');
    
    const WORLD_SIZE = 2000;
    const CAMPFIRE_X = 1000, CAMPFIRE_Y = 1000;
    const CRAFTING_BENCH_X = 1100, CRAFTING_BENCH_Y = 1000;
    const TOWER_X = 500, TOWER_Y = 500;

    let camera = { x: 0, y: 0 };
    
    // ---------- MATERIAL DEFINITIONS ----------
    const materials = [
        { id: 'wood', name: 'Wood', icon: '🪵', rarity: 'common', spawnWeight: 45, baseHealth: 40, color: '#8B5A2B' },
        { id: 'stone', name: 'Stone', icon: '🪨', rarity: 'common', spawnWeight: 40, baseHealth: 50, color: '#808080' },
        { id: 'leather', name: 'Leather', icon: '👜', rarity: 'common', spawnWeight: 35, baseHealth: 30, color: '#8B4513' },
        { id: 'herb', name: 'Herb', icon: '🌿', rarity: 'common', spawnWeight: 40, baseHealth: 25, color: '#32CD32' },
        { id: 'coal', name: 'Coal', icon: '🔥', rarity: 'common', spawnWeight: 35, baseHealth: 45, color: '#2C3E50' },
        { id: 'copper', name: 'Copper', icon: '🔴', rarity: 'uncommon', spawnWeight: 25, baseHealth: 60, color: '#B87333' },
        { id: 'iron', name: 'Iron', icon: '⛓️', rarity: 'uncommon', spawnWeight: 22, baseHealth: 65, color: '#B87333' },
        { id: 'silver', name: 'Silver', icon: '⚪', rarity: 'uncommon', spawnWeight: 20, baseHealth: 70, color: '#C0C0C0' },
        { id: 'crystal', name: 'Crystal', icon: '💎', rarity: 'uncommon', spawnWeight: 18, baseHealth: 60, color: '#A5F2F3' },
        { id: 'gold', name: 'Gold', icon: '🟡', rarity: 'rare', spawnWeight: 12, baseHealth: 75, color: '#FFD700' },
        { id: 'sapphire', name: 'Sapphire', icon: '🔵', rarity: 'rare', spawnWeight: 10, baseHealth: 70, color: '#0F52BA' },
        { id: 'ruby', name: 'Ruby', icon: '🔴', rarity: 'rare', spawnWeight: 8, baseHealth: 70, color: '#E0115F' },
        { id: 'emerald', name: 'Emerald', icon: '💚', rarity: 'rare', spawnWeight: 8, baseHealth: 70, color: '#50C878' },
        { id: 'mythril', name: 'Mythril', icon: '⚪', rarity: 'epic', spawnWeight: 5, baseHealth: 85, color: '#B8B8B8' },
        { id: 'adamantite', name: 'Adamantite', icon: '🔘', rarity: 'epic', spawnWeight: 4, baseHealth: 90, color: '#5A5A5A' },
        { id: 'dragonstone', name: 'Dragonstone', icon: '🐉', rarity: 'epic', spawnWeight: 3, baseHealth: 80, color: '#D43C3C' },
        { id: 'orichalcum', name: 'Orichalcum', icon: '✨', rarity: 'legendary', spawnWeight: 2, baseHealth: 95, color: '#DAA520' },
        { id: 'void_crystal', name: 'Void Crystal', icon: '🌌', rarity: 'legendary', spawnWeight: 1, baseHealth: 100, color: '#4B0082' },
        { id: 'phoenix_feather', name: 'Phoenix Feather', icon: '🔥', rarity: 'legendary', spawnWeight: 1, baseHealth: 90, color: '#FF4500' },
        { id: 'dragon_scale', name: 'Dragon Scale', icon: '🐲', rarity: 'legendary', spawnWeight: 1, baseHealth: 100, color: '#8B0000' }
    ];
    const materialMap = {};
    materials.forEach(m => materialMap[m.id] = m);

    // ---------- GAME STATE ----------
    let player = {
        x: 900, y: 1000, health: 100, maxHealth: 100,
        weapon: 'Fist', weaponDamage: 10, armor: 0,
        inventory: {}
    };
    materials.forEach(m => player.inventory[m.id] = 5); // starting amount

    let campfire = {
        health: 500, maxHealth: 500, level: 1, repelRange: 150,
        upgradeCosts: [
            { wood: 50, stone: 40, iron: 20, crystal: 10, gold: 5 },
            { wood: 100, stone: 80, iron: 40, crystal: 20, gold: 10, sapphire: 5 },
            { wood: 200, stone: 150, iron: 80, crystal: 40, gold: 20, ruby: 5, mythril: 2 },
            { wood: 400, stone: 300, iron: 150, crystal: 80, gold: 40, emerald: 5, orichalcum: 2 }
        ]
    };

    let tower = {
        x: TOWER_X, y: TOWER_Y, active: true,
        guardianHealth: 200, guardianMaxHealth: 200,
        defeated: false, defeatTime: 0, cooldownDays: 5
    };

    let craftingBench = { x: CRAFTING_BENCH_X, y: CRAFTING_BENCH_Y, health: 200, maxHealth: 200 };

    let resources = [];
    let enemies = [];
    let buildings = [];
    const maxBuildings = 10;

    let gameTime = 6; // 6 = 6:00
    let gameRunning = true;
    let inTower = false;
    let towerBattleLog = [];

    // Joystick
    let joystickActive = false;
    let joystickDir = { x: 0, y: 0 };
    let joystickStartPos = { x: 0, y: 0 };
    let joystickCurrentPos = { x: 0, y: 0 };

    // Cooldowns
    let attackCooldown = 0;
    let healCooldown = 0;

    // ---------- HELPER FUNCTIONS ----------
    function isInsideCampfireRange(x, y) {
        let dist = Math.sqrt((x - CAMPFIRE_X) ** 2 + (y - CAMPFIRE_Y) ** 2);
        return dist <= campfire.repelRange;
    }

    function getRandomPosition() {
        return { x: 100 + Math.random() * (WORLD_SIZE - 200), y: 100 + Math.random() * (WORLD_SIZE - 200) };
    }

    function isValidResourcePosition(x, y) {
        if (isInsideCampfireRange(x, y)) return false;
        if (Math.sqrt((x - CRAFTING_BENCH_X) ** 2 + (y - CRAFTING_BENCH_Y) ** 2) < 80) return false;
        if (Math.sqrt((x - TOWER_X) ** 2 + (y - TOWER_Y) ** 2) < 120) return false;
        return true;
    }

    function generateRandomResource() {
        const totalWeight = materials.reduce((sum, m) => sum + m.spawnWeight, 0);
        let random = Math.random() * totalWeight;
        let cumulative = 0;
        for (let m of materials) {
            cumulative += m.spawnWeight;
            if (random <= cumulative) {
                return { id: m.id, name: m.name, icon: m.icon, rarity: m.rarity, baseHealth: m.baseHealth, color: m.color };
            }
        }
        return materials[0];
    }

    function generateWorld() {
        resources = [];
        const totalResources = 300;
        for (let i = 0; i < totalResources; i++) {
            const material = generateRandomResource();
            let pos, attempts = 0;
            do {
                pos = getRandomPosition();
                attempts++;
                if (attempts > 500) break;
            } while (!isValidResourcePosition(pos.x, pos.y));
            if (attempts <= 500) {
                resources.push({
                    x: pos.x, y: pos.y,
                    type: material.id,
                    material: material,
                    health: material.baseHealth,
                    maxHealth: material.baseHealth
                });
            }
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
        let pos, attempts = 0;
        do {
            pos = getRandomPosition();
            attempts++;
            if (attempts > 500) return;
        } while (!isValidForBuilding(pos.x, pos.y));

        const types = ['HOUSE', 'TOWER', 'SHED', 'SMITH', 'TEMPLE', 'MINE', 'LIBRARY', 'FORGE'];
        const type = types[Math.floor(Math.random() * types.length)];
        let inventory = {};
        if (type === 'HOUSE') inventory = { wood: Math.floor(Math.random() * 30) + 10, stone: Math.floor(Math.random() * 20) + 5, herb: Math.floor(Math.random() * 5) + 1 };
        else if (type === 'TOWER') inventory = { iron: Math.floor(Math.random() * 8) + 2, gold: Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : 0, sapphire: Math.random() > 0.7 ? 1 : 0 };
        else if (type === 'SMITH') inventory = { iron: Math.floor(Math.random() * 12) + 4, coal: Math.floor(Math.random() * 15) + 5, gold: Math.random() > 0.6 ? 1 : 0, mythril: Math.random() > 0.9 ? 1 : 0 };
        else if (type === 'TEMPLE') inventory = { crystal: Math.floor(Math.random() * 6) + 2, sapphire: Math.random() > 0.6 ? 1 : 0, ruby: Math.random() > 0.7 ? 1 : 0, emerald: Math.random() > 0.8 ? 1 : 0 };
        else if (type === 'MINE') inventory = { iron: Math.floor(Math.random() * 20) + 10, copper: Math.floor(Math.random() * 15) + 5, silver: Math.floor(Math.random() * 10) + 2, gold: Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0, adamantite: Math.random() > 0.8 ? 1 : 0 };
        else if (type === 'LIBRARY') inventory = { crystal: Math.floor(Math.random() * 4) + 1, dragonstone: Math.random() > 0.9 ? 1 : 0, void_crystal: Math.random() > 0.95 ? 1 : 0 };
        else if (type === 'FORGE') inventory = { iron: Math.floor(Math.random() * 15) + 5, coal: Math.floor(Math.random() * 20) + 10, mythril: Math.random() > 0.8 ? 1 : 0, orichalcum: Math.random() > 0.9 ? 1 : 0 };
        buildings.push({ x: pos.x, y: pos.y, type: type, inventory: inventory });
    }

    // Fill initial buildings
    for (let i = 0; i < maxBuildings; i++) spawnNewBuilding();

    // ---------- UI UPDATE ----------
    function updateInventoryDisplay() {
        const inventoryBar = document.getElementById('inventoryBar');
        inventoryBar.innerHTML = '';
        materials.forEach(m => {
            const count = player.inventory[m.id] || 0;
            const itemDiv = document.createElement('div');
            itemDiv.className = `inventory-item ${m.rarity}`;
            itemDiv.innerHTML = `<div class="item-icon">${m.icon}</div><div class="item-name">${m.name}</div><div class="item-count">${count}</div>`;
            inventoryBar.appendChild(itemDiv);
        });
    }

    function getTimeRemaining() {
        let hour = gameTime;
        let isDay = hour >= 6 && hour < 18;
        if (isDay) return { text: `Day ${Math.round((18 - hour) * 60)}m`, isDay: true };
        else {
            let minutesLeft = hour >= 18 ? Math.round((24 - hour + 6) * 60) : Math.round((6 - hour) * 60);
            return { text: `Night ${minutesLeft}m`, isDay: false };
        }
    }

    function isTowerAvailable() {
        if (!tower.defeated) return true;
        let daysPassed = gameTime - tower.defeatTime;
        if (daysPassed < 0) daysPassed += 24;
        return daysPassed >= tower.cooldownDays;
    }

    function getTowerStatus() {
        if (!tower.defeated) return "Available Now!";
        let daysPassed = gameTime - tower.defeatTime;
        if (daysPassed < 0) daysPassed += 24;
        let daysRemaining = Math.max(0, tower.cooldownDays - daysPassed);
        if (daysRemaining <= 0) {
            tower.defeated = false;
            tower.guardianHealth = tower.guardianMaxHealth;
            return "Available Now!";
        }
        return `Cooldown: ${daysRemaining.toFixed(1)} days`;
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
        document.getElementById('timeRemaining').textContent = getTimeRemaining().text;
        document.getElementById('towerStatus').textContent = getTowerStatus();
        
        // Upgrade requirements
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
        updateInventoryDisplay();
    }

    // ---------- DRAWING ----------
    function updateCamera() {
        camera.x = player.x - canvas.width/2;
        camera.y = player.y - canvas.height/2;
        camera.x = Math.max(0, Math.min(WORLD_SIZE - canvas.width, camera.x));
        camera.y = Math.max(0, Math.min(WORLD_SIZE - canvas.height, camera.y));
    }

    function worldToScreen(wx, wy) {
        return { x: wx - camera.x, y: wy - camera.y };
    }

    function updateCampfireIndicator() {
        let dx = CAMPFIRE_X - player.x, dy = CAMPFIRE_Y - player.y;
        let distance = Math.sqrt(dx*dx + dy*dy);
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        let dirs = ['E','NE','N','NW','W','SW','S','SE'];
        let index = Math.floor(((angle + 22.5) % 360) / 45);
        document.getElementById('campfireDirection').textContent = dirs[index] || 'N';
        document.getElementById('campfireDistance').textContent = Math.round(distance) + 'm';
    }

    function drawMiniMap() {
        miniMapCtx.clearRect(0, 0, 120, 120);
        miniMapCtx.fillStyle = '#1a1e34';
        miniMapCtx.fillRect(0, 0, 120, 120);
        const scale = 120 / WORLD_SIZE;

        // Campfire (orange)
        miniMapCtx.fillStyle = '#ff4500';
        miniMapCtx.beginPath();
        miniMapCtx.arc(CAMPFIRE_X * scale, CAMPFIRE_Y * scale, 3, 0, Math.PI * 2);
        miniMapCtx.fill();

        // Tower
        miniMapCtx.fillStyle = '#9370db';
        miniMapCtx.beginPath();
        miniMapCtx.arc(TOWER_X * scale, TOWER_Y * scale, 3, 0, Math.PI * 2);
        miniMapCtx.fill();

        // Buildings
        buildings.forEach(b => {
            miniMapCtx.fillStyle = '#8B5A2B';
            miniMapCtx.fillRect(b.x * scale - 1, b.y * scale - 1, 2, 2);
        });

        // Resources with rarity colors
        resources.forEach(r => {
            switch(r.material.rarity) {
                case 'common': miniMapCtx.fillStyle = '#aaaaaa'; break;
                case 'uncommon': miniMapCtx.fillStyle = '#32cd32'; break;
                case 'rare': miniMapCtx.fillStyle = '#4169e1'; break;
                case 'epic': miniMapCtx.fillStyle = '#9370db'; break;
                case 'legendary': miniMapCtx.fillStyle = '#ffd700'; break;
                default: miniMapCtx.fillStyle = '#ffffff';
            }
            miniMapCtx.fillRect(r.x * scale - 1, r.y * scale - 1, 2, 2);
        });

        // Enemies
        enemies.forEach(e => {
            miniMapCtx.fillStyle = '#8b0000';
            miniMapCtx.fillRect(e.x * scale - 1, e.y * scale - 1, 2, 2);
        });

        // Player
        miniMapCtx.fillStyle = '#4169e1';
        miniMapCtx.beginPath();
        miniMapCtx.arc(player.x * scale, player.y * scale, 4, 0, Math.PI * 2);
        miniMapCtx.fill();

        // Camera rect
        miniMapCtx.strokeStyle = '#e94560';
        miniMapCtx.lineWidth = 1;
        miniMapCtx.strokeRect(camera.x * scale, camera.y * scale, canvas.width * scale, canvas.height * scale);
        miniMapCtx.strokeStyle = '#e94560';
        miniMapCtx.lineWidth = 2;
        miniMapCtx.strokeRect(0, 0, 120, 120);
    }

    function draw() {
        updateCamera();
        updateCampfireIndicator();

        ctx.fillStyle = '#1a4d2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = '#2d6a4f';
        ctx.lineWidth = 0.5;
        let startX = Math.floor(camera.x / 100) * 100;
        let startY = Math.floor(camera.y / 100) * 100;
        for (let x = startX; x < camera.x + canvas.width; x += 100) {
            ctx.beginPath();
            ctx.moveTo(x - camera.x, 0);
            ctx.lineTo(x - camera.x, canvas.height);
            ctx.stroke();
        }
        for (let y = startY; y < camera.y + canvas.height; y += 100) {
            ctx.beginPath();
            ctx.moveTo(0, y - camera.y);
            ctx.lineTo(canvas.width, y - camera.y);
            ctx.stroke();
        }

        // Campfire range
        let campfireScreen = worldToScreen(CAMPFIRE_X, CAMPFIRE_Y);
        ctx.beginPath();
        ctx.arc(campfireScreen.x, campfireScreen.y, campfire.repelRange, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 100, 0, 0.15)';
        ctx.fill();
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Tower
        let towerScreen = worldToScreen(TOWER_X, TOWER_Y);
        let towerAvailable = isTowerAvailable();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(towerScreen.x - 25, towerScreen.y + 10, 50, 15);
        ctx.fillStyle = towerAvailable ? '#4a4a4a' : '#2a2a2a';
        ctx.fillRect(towerScreen.x - 25, towerScreen.y - 50, 50, 75);
        ctx.fillStyle = towerAvailable ? '#6a6a6a' : '#3a3a3a';
        ctx.beginPath();
        ctx.moveTo(towerScreen.x - 30, towerScreen.y - 50);
        ctx.lineTo(towerScreen.x, towerScreen.y - 70);
        ctx.lineTo(towerScreen.x + 30, towerScreen.y - 50);
        ctx.fill();

        // Buildings
        buildings.forEach(b => {
            let bScreen = worldToScreen(b.x, b.y);
            if (bScreen.x > -50 && bScreen.x < canvas.width + 50 && bScreen.y > -50 && bScreen.y < canvas.height + 50) {
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
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px Arial';
                ctx.fillText(b.type, bScreen.x - 20, bScreen.y - 50);
                ctx.fillStyle = '#ffd700';
                ctx.font = '20px Arial';
                ctx.fillText('📦', bScreen.x - 12, bScreen.y - 30);
            }
        });

        // Crafting Bench
        let benchScreen = worldToScreen(CRAFTING_BENCH_X, CRAFTING_BENCH_Y);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(benchScreen.x - 25, benchScreen.y - 10, 50, 20);
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(benchScreen.x - 20, benchScreen.y - 20, 40, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText('🔨', benchScreen.x - 10, benchScreen.y - 25);

        // Resources
        resources.forEach(r => {
            let rScreen = worldToScreen(r.x, r.y);
            if (rScreen.x > -30 && rScreen.x < canvas.width + 30 && rScreen.y > -30 && rScreen.y < canvas.height + 30) {
                ctx.shadowColor = r.material.color;
                ctx.shadowBlur = r.material.rarity === 'legendary' ? 20 : r.material.rarity === 'epic' ? 15 : r.material.rarity === 'rare' ? 10 : 5;
                ctx.fillStyle = r.material.color;
                ctx.beginPath();
                ctx.arc(rScreen.x, rScreen.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                // Health bar
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(rScreen.x - 12, rScreen.y - 30, 24 * (r.health / r.maxHealth), 4);
            }
        });

        // Enemies
        enemies.forEach(e => {
            let eScreen = worldToScreen(e.x, e.y);
            if (eScreen.x > -20 && eScreen.x < canvas.width + 20 && eScreen.y > -20 && eScreen.y < canvas.height + 20) {
                ctx.fillStyle = '#8b0000';
                ctx.beginPath();
                ctx.arc(eScreen.x, eScreen.y, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(eScreen.x - 3, eScreen.y - 3, 2, 0, Math.PI * 2);
                ctx.arc(eScreen.x + 3, eScreen.y - 3, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Campfire
        ctx.fillStyle = '#654321';
        ctx.fillRect(campfireScreen.x - 15, campfireScreen.y - 8, 30, 15);
        ctx.fillStyle = '#ff4500';
        ctx.beginPath();
        ctx.arc(campfireScreen.x, campfireScreen.y - 12, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(campfireScreen.x - 40, campfireScreen.y - 40, 80 * (campfire.health / campfire.maxHealth), 6);

        // Player
        let playerScreen = worldToScreen(player.x, player.y);
        ctx.fillStyle = '#4169e1';
        ctx.beginPath();
        ctx.arc(playerScreen.x, playerScreen.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(playerScreen.x - 15, playerScreen.y - 20, 30 * (player.health / player.maxHealth), 4);

        // Night effects
        let isDay = gameTime >= 6 && gameTime < 18;
        let outsideSafe = !isInsideCampfireRange(player.x, player.y) && !isDay;
        document.getElementById('warningMessage').style.display = outsideSafe ? 'inline' : 'none';
        if (outsideSafe) {
            ctx.fillStyle = 'rgba(50, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (!isDay) {
            ctx.fillStyle = 'rgba(0, 0, 30, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Sun/Moon
        if (isDay) {
            ctx.fillStyle = '#ffdd77';
            ctx.beginPath();
            ctx.arc(750, 50, 20, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#fffbe6';
            ctx.beginPath();
            ctx.arc(750, 50, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        drawMiniMap();
        updateUI();
    }

    // ---------- GAMEPLAY ACTIONS ----------
    window.playerAttack = function() {
        if (attackCooldown > 0 || inTower) return;
        enemies.forEach((e, i) => {
            if (Math.sqrt((player.x - e.x) ** 2 + (player.y - e.y) ** 2) < 60) {
                e.health -= player.weaponDamage;
                attackCooldown = 15;
            }
        });
    };

    window.playerInteract = function() {
        if (inTower) return;
        let distToTower = Math.sqrt((player.x - TOWER_X) ** 2 + (player.y - TOWER_Y) ** 2);
        if (distToTower < 80) { enterTower(); return; }
        let distToBench = Math.sqrt((player.x - CRAFTING_BENCH_X) ** 2 + (player.y - CRAFTING_BENCH_Y) ** 2);
        if (distToBench < 60) { openCraftingBench(); return; }
        for (let b of buildings) {
            if (Math.sqrt((player.x - b.x) ** 2 + (player.y - b.y) ** 2) < 60) {
                showBuildingInventory(b); return;
            }
        }
        resources.forEach((r, i) => {
            let dist = Math.sqrt((player.x - r.x) ** 2 + (player.y - r.y) ** 2);
            if (dist < 50) {
                r.health -= Math.max(1, Math.floor(player.weaponDamage / 2));
                if (r.health <= 0) {
                    player.inventory[r.type] = (player.inventory[r.type] || 0) + 1;
                    resources.splice(i, 1);
                    setTimeout(() => {
                        let x, y, attempts = 0;
                        do {
                            x = 100 + Math.random() * (WORLD_SIZE - 200);
                            y = 100 + Math.random() * (WORLD_SIZE - 200);
                            attempts++;
                        } while (!isValidResourcePosition(x, y) && attempts < 200);
                        if (attempts < 200) {
                            const newMaterial = generateRandomResource();
                            resources.push({ x, y, type: newMaterial.id, material: newMaterial, health: newMaterial.baseHealth, maxHealth: newMaterial.baseHealth });
                        }
                    }, 30000);
                }
            }
        });
    };

    window.repairCampfire = function() {
        if (player.inventory.wood >= 10 && player.inventory.stone >= 5) {
            campfire.health = Math.min(campfire.maxHealth, campfire.health + 100);
            player.inventory.wood -= 10;
            player.inventory.stone -= 5;
            updateInventoryDisplay();
        }
    };

    window.upgradeCampfire = function() {
        if (campfire.level >= 5) { alert("Campfire is already at max level!"); return; }
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
            alert(`Campfire upgraded to Level ${campfire.level}!`);
            generateWorld();
            updateInventoryDisplay();
        }
    };

    window.playerHeal = function() {
        if (healCooldown > 0) { alert(`Heal on cooldown! ${healCooldown}s remaining`); return; }
        if (player.inventory.herb >= 1) {
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
        } else alert("Not enough herbs!");
    };

    window.quickCraft = function() {
        if (player.inventory.herb >= 3) {
            player.inventory.herb -= 3;
            player.health = Math.min(player.maxHealth, player.health + 20);
            alert("Crafted Herbal Potion! +20 HP");
        } else alert("Need 3 herbs!");
    };

    // Tower functions
    function enterTower() {
        if (!isTowerAvailable()) { alert("Tower is on cooldown! " + getTowerStatus()); return; }
        if (tower.defeated) { tower.defeated = false; tower.guardianHealth = tower.guardianMaxHealth; }
        inTower = true;
        document.getElementById('towerPopup').style.display = 'block';
        document.getElementById('towerEnemyHealth').textContent = tower.guardianHealth;
        document.getElementById('towerPlayerHealthValue').textContent = player.health;
        document.getElementById('towerAttackBtn').disabled = false;
        towerBattleLog = ["You enter the tower... A guardian appears!"];
        document.getElementById('towerBattleLog').innerHTML = towerBattleLog.join('<br>');
    }

    window.towerAttack = function() {
        if (!inTower) return;
        let playerDamage = player.weaponDamage + Math.floor(Math.random() * 15);
        tower.guardianHealth -= playerDamage;
        towerBattleLog.unshift(`You hit for ${playerDamage} damage!`);
        if (tower.guardianHealth <= 0) {
            tower.defeated = true;
            tower.defeatTime = gameTime;
            towerBattleLog.unshift("🎉 VICTORY! You defeated the tower guardian!");
            let rewards = [];
            if (Math.random() > 0.4) { player.inventory.sapphire = (player.inventory.sapphire || 0) + 1; rewards.push("1 Sapphire"); }
            if (Math.random() > 0.6) { player.inventory.ruby = (player.inventory.ruby || 0) + 1; rewards.push("1 Ruby"); }
            if (Math.random() > 0.8) { player.inventory.emerald = (player.inventory.emerald || 0) + 1; rewards.push("1 Emerald"); }
            if (Math.random() > 0.7) { player.inventory.dragonstone = (player.inventory.dragonstone || 0) + 1; rewards.push("1 Dragonstone"); }
            player.inventory.gold += 3;
            player.inventory.crystal += 2;
            rewards.push("3 Gold, 2 Crystal");
            towerBattleLog.unshift("Rewards: " + rewards.join(", "));
            towerBattleLog.unshift(`Tower will respawn in ${tower.cooldownDays} days!`);
            document.getElementById('towerAttackBtn').disabled = true;
            updateInventoryDisplay();
            document.getElementById('towerEnemyHealth').textContent = 0;
            document.getElementById('towerBattleLog').innerHTML = towerBattleLog.slice(0,3).join('<br>');
            return;
        }
        let guardianDamage = Math.max(8, 20 - player.armor);
        player.health -= guardianDamage;
        towerBattleLog.unshift(`Guardian hits you for ${guardianDamage} damage!`);
        document.getElementById('towerEnemyHealth').textContent = tower.guardianHealth;
        document.getElementById('towerPlayerHealthValue').textContent = player.health;
        if (player.health <= 0) {
            towerBattleLog.unshift("💀 You were defeated! Game Over!");
            setTimeout(() => { resetGame(); closeTower(); }, 2000);
        }
        document.getElementById('towerBattleLog').innerHTML = towerBattleLog.slice(0,3).join('<br>');
    };

    window.towerHeal = function() {
        if (player.inventory.herb >= 5) {
            player.inventory.herb -= 5;
            player.health = Math.min(player.maxHealth, player.health + 30);
            towerBattleLog.unshift("You used 5 herbs to heal 30 HP!");
            document.getElementById('towerPlayerHealthValue').textContent = player.health;
            updateInventoryDisplay();
        } else towerBattleLog.unshift("Not enough herbs! (Need 5)");
        document.getElementById('towerBattleLog').innerHTML = towerBattleLog.slice(0,3).join('<br>');
    };

    window.closeTower = function() {
        inTower = false;
        document.getElementById('towerPopup').style.display = 'none';
    };

    document.getElementById('towerAttackBtn').addEventListener('click', window.towerAttack);
    document.getElementById('towerHealBtn').addEventListener('click', window.towerHeal);
    document.getElementById('towerExitBtn').addEventListener('click', window.closeTower);

    // Crafting bench
    window.openCraftingBench = function() {
        let grid = document.getElementById('benchCraftingGrid');
        grid.innerHTML = '';
        const benchRecipes = [
            { name: 'Wood Sword', req: 'Wood x3, Stone x1', craft: () => craftItem({ wood: 3, stone: 1, weapon: 'Wood Sword', damage: 15 }) },
            { name: 'Stone Axe', req: 'Stone x3, Wood x2', craft: () => craftItem({ stone: 3, wood: 2, weapon: 'Stone Axe', damage: 20 }) },
            { name: 'Leather Armor', req: 'Leather x4, Wood x2', craft: () => craftItem({ leather: 4, wood: 2, armor: 5 }) },
            { name: 'Copper Sword', req: 'Copper x3, Wood x2', craft: () => craftItem({ copper: 3, wood: 2, weapon: 'Copper Sword', damage: 18 }) },
            { name: 'Iron Sword', req: 'Iron x3, Coal x2', craft: () => craftItem({ iron: 3, coal: 2, weapon: 'Iron Sword', damage: 30 }) },
            { name: 'Iron Armor', req: 'Iron x5, Leather x3', craft: () => craftItem({ iron: 5, leather: 3, armor: 15 }) },
            { name: 'Silver Sword', req: 'Silver x3, Iron x2', craft: () => craftItem({ silver: 3, iron: 2, weapon: 'Silver Sword', damage: 35 }) },
            { name: 'Gold Sword', req: 'Gold x2, Iron x3', craft: () => craftItem({ gold: 2, iron: 3, weapon: 'Gold Sword', damage: 40 }) },
            { name: 'Sapphire Ring', req: 'Sapphire x2, Gold x1', craft: () => craftItem({ sapphire: 2, gold: 1, armor: 10 }) },
            { name: 'Ruby Amulet', req: 'Ruby x1, Gold x2', craft: () => craftItem({ ruby: 1, gold: 2, armor: 15 }) },
            { name: 'Emerald Crown', req: 'Emerald x2, Gold x3', craft: () => craftItem({ emerald: 2, gold: 3, armor: 20 }) },
            { name: 'Herbal Potion', req: 'Herb x3', craft: () => craftItem({ herb: 3, heal: 30 }) },
            { name: 'Mythril Sword', req: 'Mythril x2, Gold x2', craft: () => craftItem({ mythril: 2, gold: 2, weapon: 'Mythril Sword', damage: 55 }) },
            { name: 'Adamantite Armor', req: 'Adamantite x3, Gold x3', craft: () => craftItem({ adamantite: 3, gold: 3, armor: 30 }) },
            { name: 'Dragonstone Staff', req: 'Dragonstone x1, Crystal x3', craft: () => craftItem({ dragonstone: 1, crystal: 3, weapon: 'Dragon Staff', damage: 70 }) },
            { name: 'Orichalcum Blade', req: 'Orichalcum x2, Gold x3', craft: () => craftItem({ orichalcum: 2, gold: 3, weapon: 'Orichalcum Blade', damage: 85 }) },
            { name: 'Void Crystal Shield', req: 'Void Crystal x1, Mythril x2', craft: () => craftItem({ void_crystal: 1, mythril: 2, armor: 45 }) },
            { name: 'Phoenix Feather Cape', req: 'Phoenix Feather x1, Gold x3', craft: () => craftItem({ phoenix_feather: 1, gold: 3, armor: 35 }) },
            { name: 'Dragon Scale Mail', req: 'Dragon Scale x1, Adamantite x2', craft: () => craftItem({ dragon_scale: 1, adamantite: 2, armor: 50 }) }
        ];
        benchRecipes.forEach(recipe => {
            let slot = document.createElement('div');
            slot.className = 'bench-craft-slot';
            slot.innerHTML = `<div class="item-name">${recipe.name}</div><div class="item-req">${recipe.req}</div>`;
            slot.addEventListener('click', (e) => { e.stopPropagation(); recipe.craft(); updateUI(); });
            grid.appendChild(slot);
        });
        document.getElementById('craftingBenchPopup').style.display = 'block';
    };

    document.getElementById('closeBenchPopup').addEventListener('click', () => {
        document.getElementById('craftingBenchPopup').style.display = 'none';
    });

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
            if (requirements.weapon) { player.weapon = requirements.weapon; player.weaponDamage = requirements.damage; }
            if (requirements.armor) player.armor += requirements.armor;
            if (requirements.heal) player.health = Math.min(player.maxHealth, player.health + requirements.heal);
            updateInventoryDisplay();
        } else alert("Not enough materials!");
    }

    function showBuildingInventory(building) {
        let grid = document.getElementById('buildingInventoryGrid');
        document.getElementById('buildingName').textContent = building.type;
        grid.innerHTML = '';
        for (let [item, count] of Object.entries(building.inventory)) {
            if (count > 0) {
                const material = materialMap[item] || { icon: '📦', name: item };
                let slot = document.createElement('div');
                slot.className = 'building-slot';
                slot.innerHTML = `<div class="item-icon">${material.icon}</div><div class="item-count">${count}</div>`;
                slot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (building.inventory[item] > 0) {
                        player.inventory[item] = (player.inventory[item] || 0) + 1;
                        building.inventory[item]--;
                        if (Object.values(building.inventory).reduce((a,b)=>a+b,0) === 0) {
                            let idx = buildings.indexOf(building);
                            if (idx !== -1) { buildings.splice(idx, 1); spawnNewBuilding(); }
                            closeBuildingInventory();
                        } else showBuildingInventory(building);
                        updateInventoryDisplay();
                    }
                });
                grid.appendChild(slot);
            }
        }
        document.getElementById('buildingInventory').style.display = 'block';
    }

    window.closeBuildingInventory = function() {
        document.getElementById('buildingInventory').style.display = 'none';
    };
    document.getElementById('closeBuildingInventory').addEventListener('click', window.closeBuildingInventory);

    function resetGame() {
        player = { x: 900, y: 1000, health: 100, maxHealth: 100, weapon: 'Fist', weaponDamage: 10, armor: 0, inventory: {} };
        materials.forEach(m => player.inventory[m.id] = 5);
        campfire = { health: 500, maxHealth: 500, level: 1, repelRange: 150, upgradeCosts: campfire.upgradeCosts };
        tower.defeated = false; tower.guardianHealth = 200; tower.defeatTime = 0;
        enemies = [];
        generateWorld();
        buildings = [];
        for (let i = 0; i < maxBuildings; i++) spawnNewBuilding();
    }

    // Joystick
    window.handleTouchStart = (e) => {
        e.preventDefault();
        let touch = e.touches[0];
        let rect = document.getElementById('joystickContainer').getBoundingClientRect();
        joystickStartPos = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
        joystickCurrentPos = { x: touch.clientX, y: touch.clientY };
        joystickActive = true;
    };
    window.handleTouchMove = (e) => {
        e.preventDefault();
        if (!joystickActive) return;
        let touch = e.touches[0];
        joystickCurrentPos = { x: touch.clientX, y: touch.clientY };
        let dx = joystickCurrentPos.x - joystickStartPos.x;
        let dy = joystickCurrentPos.y - joystickStartPos.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        let maxDist = 25;
        if (dist > maxDist) { dx = (dx/dist) * maxDist; dy = (dy/dist) * maxDist; }
        joystickDir = { x: dx/maxDist, y: dy/maxDist };
        document.getElementById('joystick').style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    window.handleTouchEnd = (e) => {
        e.preventDefault();
        joystickActive = false;
        joystickDir = { x: 0, y: 0 };
        document.getElementById('joystick').style.transform = 'translate(-50%, -50%)';
    };

    // Update loop
    function update() {
        if (!gameRunning) return;
        gameTime += 0.001;
        if (gameTime >= 24) gameTime = 0;
        if (attackCooldown > 0) attackCooldown--;

        if (joystickActive && !inTower) {
            player.x += joystickDir.x * 5;
            player.y += joystickDir.y * 5;
            player.x = Math.max(50, Math.min(WORLD_SIZE - 50, player.x));
            player.y = Math.max(50, Math.min(WORLD_SIZE - 50, player.y));
        }

        // Enemy AI (simplified)
        if (!inTower) {
            enemies.forEach((e, i) => {
                let distToCampfire = Math.sqrt((e.x - CAMPFIRE_X) ** 2 + (e.y - CAMPFIRE_Y) ** 2);
                if (distToCampfire < campfire.repelRange) {
                    let angle = Math.atan2(e.y - CAMPFIRE_Y, e.x - CAMPFIRE_X);
                    e.x += Math.cos(angle) * 2.5;
                    e.y += Math.sin(angle) * 2.5;
                } else {
                    let dx = player.x - e.x, dy = player.y - e.y, dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > 0) { e.x += (dx/dist) * 0.9; e.y += (dy/dist) * 0.9; }
                }
                e.x = Math.max(50, Math.min(WORLD_SIZE - 50, e.x));
                e.y = Math.max(50, Math.min(WORLD_SIZE - 50, e.y));
                if (Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2) < 30 && (e.attackTimer || 0) <= 0) {
                    player.health -= Math.max(1, 12 - player.armor);
                    e.attackTimer = 30;
                }
                if (e.attackTimer > 0) e.attackTimer--;
            });

            let isDay = gameTime >= 6 && gameTime < 18;
            if (!isDay && enemies.length < 8 && Math.random() < 0.008) {
                let angle = Math.random() * Math.PI * 2;
                enemies.push({ x: player.x + Math.cos(angle) * 300, y: player.y + Math.sin(angle) * 300, health: 50 + campfire.level * 5, damage: 12 + campfire.level, speed: 0.9, attackTimer: 0 });
            }
        }

        if (player.health <= 0 || campfire.health <= 0) resetGame();
        draw();
        requestAnimationFrame(update);
    }

    // Start
    generateWorld();
    updateInventoryDisplay();
    update();
})();
