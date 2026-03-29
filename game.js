// script.js - Full JavaScript for Last Light Survival

(function() {
    // ---------- CONSTANTS ----------
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const miniMapCanvas = document.getElementById('miniMapCanvas');
    const miniMapCtx = miniMapCanvas.getContext('2d');
    
    const WORLD_SIZE = 2000;
    const CAMPFIRE_X = 1000, CAMPFIRE_Y = 1000;
    const CRAFTING_BENCH_X = 1100, CRAFTING_BENCH_Y = 1000;
    const TOWER_X = 500, TOWER_Y = 500;

    let camera = { x: 0, y: 0 };
    
    // ---------- MATERIALS (20 types with rarities) ----------
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
    
    // Initialize inventory with starting amounts
    materials.forEach(m => player.inventory[m.id] = 5);

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

    let resources = [];
    let enemies = [];
    let buildings = [];
    const maxBuildings = 10;
    let gameTime = 6; // 6 AM
    let gameRunning = true;
    let inTower = false;
    let towerBattleLog = [];
    
    // Joystick controls
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
                return { 
                    id: m.id, name: m.name, icon: m.icon, 
                    rarity: m.rarity, baseHealth: m.baseHealth, color: m.color 
                };
            }
        }
        return materials[0];
    }

    function generateWorld() {
        resources = [];
        for (let i = 0; i < 300; i++) {
            const material = generateRandomResource();
            let pos, attempts = 0;
            do {
                pos = getRandomPosition();
                attempts++;
            } while (!isValidResourcePosition(pos.x, pos.y) && attempts < 300);
            
            if (attempts < 300) {
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
        } while (!isValidForBuilding(pos.x, pos.y) && attempts < 300);
        
        if (attempts >= 300) return;
        
        const types = ['HOUSE', 'TOWER', 'SHED', 'SMITH', 'TEMPLE', 'MINE', 'LIBRARY', 'FORGE'];
        const type = types[Math.floor(Math.random() * types.length)];
        let inventory = {};
        
        // Generate building inventory based on type
        if (type === 'HOUSE') {
            inventory = { 
                wood: 10 + Math.floor(Math.random() * 30), 
                stone: 5 + Math.floor(Math.random() * 20), 
                herb: 1 + Math.floor(Math.random() * 5) 
            };
        } else if (type === 'TOWER') {
            inventory = { 
                iron: 2 + Math.floor(Math.random() * 8), 
                gold: Math.random() > 0.5 ? 1 + Math.floor(Math.random() * 2) : 0, 
                sapphire: Math.random() > 0.7 ? 1 : 0 
            };
        } else if (type === 'SMITH') {
            inventory = { 
                iron: 4 + Math.floor(Math.random() * 12), 
                coal: 5 + Math.floor(Math.random() * 15), 
                gold: Math.random() > 0.6 ? 1 : 0, 
                mythril: Math.random() > 0.9 ? 1 : 0 
            };
        } else if (type === 'TEMPLE') {
            inventory = { 
                crystal: 2 + Math.floor(Math.random() * 6), 
                sapphire: Math.random() > 0.6 ? 1 : 0, 
                ruby: Math.random() > 0.7 ? 1 : 0, 
                emerald: Math.random() > 0.8 ? 1 : 0 
            };
        } else if (type === 'MINE') {
            inventory = { 
                iron: 10 + Math.floor(Math.random() * 20), 
                copper: 5 + Math.floor(Math.random() * 15), 
                silver: 2 + Math.floor(Math.random() * 10), 
                gold: Math.random() > 0.6 ? 1 + Math.floor(Math.random() * 3) : 0, 
                adamantite: Math.random() > 0.8 ? 1 : 0 
            };
        } else if (type === 'LIBRARY') {
            inventory = { 
                crystal: 1 + Math.floor(Math.random() * 4), 
                dragonstone: Math.random() > 0.9 ? 1 : 0, 
                void_crystal: Math.random() > 0.95 ? 1 : 0 
            };
        } else if (type === 'FORGE') {
            inventory = { 
                iron: 5 + Math.floor(Math.random() * 15), 
                coal: 10 + Math.floor(Math.random() * 20), 
                mythril: Math.random() > 0.8 ? 1 : 0, 
                orichalcum: Math.random() > 0.9 ? 1 : 0 
            };
        }
        
        buildings.push({ x: pos.x, y: pos.y, type: type, inventory: inventory });
    }

    // Initialize buildings
    for (let i = 0; i < maxBuildings; i++) spawnNewBuilding();

    // ---------- UI UPDATE FUNCTIONS ----------
    function updateInventoryDisplay() {
        const invBar = document.getElementById('inventoryBar');
        invBar.innerHTML = '';
        materials.forEach(m => {
            const count = player.inventory[m.id] || 0;
            const div = document.createElement('div');
            div.className = `inventory-item ${m.rarity}`;
            div.innerHTML = `
                <div class="item-icon">${m.icon}</div>
                <div class="item-name">${m.name}</div>
                <div class="item-count">${count}</div>
            `;
            invBar.appendChild(div);
        });
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
        return `Cooldown: ${daysRemaining.toFixed(1)}d`;
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
        
        let hour = gameTime;
        let timeText = (hour >= 6 && hour < 18) 
            ? `Day ${Math.round((18 - hour) * 60)}m` 
            : `Night ${Math.round((hour >= 18 ? 24 - hour + 6 : 6 - hour) * 60)}m`;
        document.getElementById('timeRemaining').textContent = timeText;
        document.getElementById('towerStatus').textContent = getTowerStatus();
        
        // Update upgrade requirements
        if (campfire.level < 5) {
            let cost = campfire.upgradeCosts[campfire.level - 1];
            document.getElementById('woodReq').textContent = cost.wood || 0;
            document.getElementById('stoneReq').textContent = cost.stone || 0;
            document.getElementById('ironReq').textContent = cost.iron || 0;
            document.getElementById('crystalReq').textContent = cost.crystal || 0;
            document.getElementById('goldReq').textContent = cost.gold || 0;
            
            document.getElementById('reqWood').className = 'req-item' + ((player.inventory.wood || 0) >= (cost.wood || 0) ? ' met' : '');
            document.getElementById('reqStone').className = 'req-item' + ((player.inventory.stone || 0) >= (cost.stone || 0) ? ' met' : '');
            document.getElementById('reqIron').className = 'req-item' + ((player.inventory.iron || 0) >= (cost.iron || 0) ? ' met' : '');
            document.getElementById('reqCrystal').className = 'req-item' + ((player.inventory.crystal || 0) >= (cost.crystal || 0) ? ' met' : '');
            document.getElementById('reqGold').className = 'req-item' + ((player.inventory.gold || 0) >= (cost.gold || 0) ? ' met' : '');
        }
        
        // Check if upgrade is possible
        let canUpgrade = campfire.level < 5;
        if (canUpgrade) {
            let cost = campfire.upgradeCosts[campfire.level - 1];
            canUpgrade = (player.inventory.wood || 0) >= (cost.wood || 0) 
                && (player.inventory.stone || 0) >= (cost.stone || 0)
                && (player.inventory.iron || 0) >= (cost.iron || 0) 
                && (player.inventory.crystal || 0) >= (cost.crystal || 0)
                && (player.inventory.gold || 0) >= (cost.gold || 0);
        }
        document.getElementById('upgradeBtn').className = canUpgrade ? '' : 'disabled';
        
        updateInventoryDisplay();
    }

    // ---------- CAMERA AND DRAWING FUNCTIONS ----------
    function updateCamera() {
        camera.x = player.x - canvas.width / 2;
        camera.y = player.y - canvas.height / 2;
        camera.x = Math.max(0, Math.min(WORLD_SIZE - canvas.width, camera.x));
        camera.y = Math.max(0, Math.min(WORLD_SIZE - canvas.height, camera.y));
    }
    
    function worldToScreen(wx, wy) { 
        return { x: wx - camera.x, y: wy - camera.y }; 
    }

    function updateCampfireIndicator() {
        let dx = CAMPFIRE_X - player.x, dy = CAMPFIRE_Y - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        let dirs = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
        let index = Math.floor(((angle + 22.5 + 360) % 360) / 45);
        document.getElementById('campfireDirection').textContent = dirs[index] || 'N';
        document.getElementById('campfireDistance').textContent = Math.round(dist) + 'm';
    }

    function drawMiniMap() {
        miniMapCtx.clearRect(0, 0, 120, 120);
        miniMapCtx.fillStyle = '#1a1e34';
        miniMapCtx.fillRect(0, 0, 120, 120);
        
        const scale = 120 / WORLD_SIZE;
        
        // Campfire
        miniMapCtx.fillStyle = '#ff4500';
        miniMapCtx.beginPath();
        miniMapCtx.arc(CAMPFIRE_X * scale, CAMPFIRE_Y * scale, 3, 0, 2 * Math.PI);
        miniMapCtx.fill();
        
        // Tower
        miniMapCtx.fillStyle = '#9370db';
        miniMapCtx.beginPath();
        miniMapCtx.arc(TOWER_X * scale, TOWER_Y * scale, 3, 0, 2 * Math.PI);
        miniMapCtx.fill();
        
        // Buildings
        buildings.forEach(b => {
            miniMapCtx.fillStyle = '#8B5A2B';
            miniMapCtx.fillRect(b.x * scale - 1, b.y * scale - 1, 2, 2);
        });
        
        // Resources with rarity colors
        resources.forEach(r => {
            let color = r.material.rarity === 'common' ? '#aaa' : 
                       r.material.rarity === 'uncommon' ? '#32cd32' : 
                       r.material.rarity === 'rare' ? '#4169e1' : 
                       r.material.rarity === 'epic' ? '#9370db' : '#ffd700';
            miniMapCtx.fillStyle = color;
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
        miniMapCtx.arc(player.x * scale, player.y * scale, 4, 0, 2 * Math.PI);
        miniMapCtx.fill();
        
        // Camera view
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

        // Background
        ctx.fillStyle = '#1a4d2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = '#2d6a4f';
        ctx.lineWidth = 0.5;
        for (let x = Math.floor(camera.x / 100) * 100; x < camera.x + canvas.width; x += 100) {
            ctx.beginPath();
            ctx.moveTo(x - camera.x, 0);
            ctx.lineTo(x - camera.x, canvas.height);
            ctx.stroke();
        }
        for (let y = Math.floor(camera.y / 100) * 100; y < camera.y + canvas.height; y += 100) {
            ctx.beginPath();
            ctx.moveTo(0, y - camera.y);
            ctx.lineTo(canvas.width, y - camera.y);
            ctx.stroke();
        }

        // Campfire range
        let campScr = worldToScreen(CAMPFIRE_X, CAMPFIRE_Y);
        ctx.beginPath();
        ctx.arc(campScr.x, campScr.y, campfire.repelRange, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255,100,0,0.15)';
        ctx.fill();
        ctx.strokeStyle = '#ffaa00';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Tower
        let towScr = worldToScreen(TOWER_X, TOWER_Y);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(towScr.x - 25, towScr.y - 50, 50, 75);

        // Buildings
        buildings.forEach(b => {
            let bScr = worldToScreen(b.x, b.y);
            if (bScr.x > -50 && bScr.x < canvas.width + 50 && bScr.y > -50 && bScr.y < canvas.height + 50) {
                ctx.fillStyle = '#8B5A2B';
                ctx.fillRect(bScr.x - 20, bScr.y - 15, 40, 30);
                ctx.fillStyle = '#A0522D';
                ctx.beginPath();
                ctx.moveTo(bScr.x - 25, bScr.y - 15);
                ctx.lineTo(bScr.x, bScr.y - 35);
                ctx.lineTo(bScr.x + 25, bScr.y - 15);
                ctx.fill();
                ctx.fillStyle = '#ffd700';
                ctx.font = '16px Arial';
                ctx.fillText('📦', bScr.x - 10, bScr.y - 25);
            }
        });

        // Crafting Bench
        let benchScr = worldToScreen(CRAFTING_BENCH_X, CRAFTING_BENCH_Y);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(benchScr.x - 20, benchScr.y - 10, 40, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('🔨', benchScr.x - 12, benchScr.y - 15);

        // Resources
        resources.forEach(r => {
            let s = worldToScreen(r.x, r.y);
            if (s.x > -30 && s.x < canvas.width + 30 && s.y > -30 && s.y < canvas.height + 30) {
                ctx.shadowColor = r.material.color;
                ctx.shadowBlur = r.material.rarity === 'legendary' ? 20 : 10;
                ctx.fillStyle = r.material.color;
                ctx.beginPath();
                ctx.arc(s.x, s.y, 8, 0, 2 * Math.PI);
                ctx.fill();
                ctx.shadowBlur = 0;
                // Health bar
                ctx.fillStyle = 'red';
                ctx.fillRect(s.x - 12, s.y - 30, 24 * (r.health / r.maxHealth), 4);
            }
        });

        // Enemies
        enemies.forEach(e => {
            let s = worldToScreen(e.x, e.y);
            if (s.x > -20 && s.x < canvas.width + 20 && s.y > -20 && s.y < canvas.height + 20) {
                ctx.fillStyle = '#8b0000';
                ctx.beginPath();
                ctx.arc(s.x, s.y, 10, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(s.x - 3, s.y - 3, 2, 0, 2 * Math.PI);
                ctx.arc(s.x + 3, s.y - 3, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        });

        // Campfire
        ctx.fillStyle = '#654321';
        ctx.fillRect(campScr.x - 15, campScr.y - 8, 30, 15);
        ctx.fillStyle = '#ff4500';
        ctx.beginPath();
        ctx.arc(campScr.x, campScr.y - 12, 12, 0, 2 * Math.PI);
        ctx.fill();

        // Player
        let plScr = worldToScreen(player.x, player.y);
        ctx.fillStyle = '#4169e1';
        ctx.beginPath();
        ctx.arc(plScr.x, plScr.y, 10, 0, 2 * Math.PI);
        ctx.fill();
        
        // Player health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(plScr.x - 15, plScr.y - 20, 30 * (player.health / player.maxHealth), 4);

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

        drawMiniMap();
        updateUI();
    }

    // ---------- GAME ACTIONS ----------
    window.playerAttack = function() {
        if (attackCooldown > 0 || inTower) return;
        enemies.forEach(e => {
            if (Math.hypot(player.x - e.x, player.y - e.y) < 60) {
                e.health -= player.weaponDamage;
                attackCooldown = 15;
            }
        });
    };

    window.playerInteract = function() {
        if (inTower) return;
        
        // Check tower
        if (Math.hypot(player.x - TOWER_X, player.y - TOWER_Y) < 80) {
            enterTower();
            return;
        }
        
        // Check crafting bench
        if (Math.hypot(player.x - CRAFTING_BENCH_X, player.y - CRAFTING_BENCH_Y) < 60) {
            openCraftingBench();
            return;
        }
        
        // Check buildings
        for (let b of buildings) {
            if (Math.hypot(player.x - b.x, player.y - b.y) < 60) {
                showBuildingInventory(b);
                return;
            }
        }
        
        // Gather resources
        resources.forEach((r, i) => {
            if (Math.hypot(player.x - r.x, player.y - r.y) < 50) {
                r.health -= Math.max(1, Math.floor(player.weaponDamage / 2));
                if (r.health <= 0) {
                    player.inventory[r.type] = (player.inventory[r.type] || 0) + 1;
                    resources.splice(i, 1);
                    
                    // Respawn after delay
                    setTimeout(() => {
                        let pos;
                        let attempts = 0;
                        do {
                            pos = getRandomPosition();
                            attempts++;
                        } while (!isValidResourcePosition(pos.x, pos.y) && attempts < 100);
                        
                        if (attempts < 100) {
                            let mat = generateRandomResource();
                            resources.push({
                                x: pos.x, y: pos.y,
                                type: mat.id,
                                material: mat,
                                health: mat.baseHealth,
                                maxHealth: mat.baseHealth
                            });
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
        if (campfire.level >= 5) {
            alert('Campfire is already at max level!');
            return;
        }
        
        let cost = campfire.upgradeCosts[campfire.level - 1];
        
        // Check resources
        for (let [k, v] of Object.entries(cost)) {
            if ((player.inventory[k] || 0) < v) {
                alert('Missing materials!');
                return;
            }
        }
        
        // Deduct resources
        for (let [k, v] of Object.entries(cost)) {
            player.inventory[k] -= v;
        }
        
        campfire.level++;
        campfire.maxHealth = 500 + campfire.level * 250;
        campfire.health = campfire.maxHealth;
        campfire.repelRange = 150 + campfire.level * 50;
        
        alert(`Campfire upgraded to Level ${campfire.level}!`);
        generateWorld();
        updateInventoryDisplay();
    };

    window.playerHeal = function() {
        if (healCooldown > 0) {
            alert(`Heal on cooldown! ${healCooldown}s remaining`);
            return;
        }
        
        if (player.inventory.herb < 1) {
            alert('No herbs!');
            return;
        }
        
        player.inventory.herb--;
        player.health = Math.min(player.maxHealth, player.health + 10);
        healCooldown = 10;
        
        let btn = document.getElementById('healBtn');
        btn.classList.add('disabled');
        
        let interval = setInterval(() => {
            healCooldown--;
            if (healCooldown <= 0) {
                clearInterval(interval);
                btn.classList.remove('disabled');
            }
        }, 1000);
    };

    window.quickCraft = function() {
        if (player.inventory.herb >= 3) {
            player.inventory.herb -= 3;
            player.health = Math.min(player.maxHealth, player.health + 20);
            alert('Crafted Herbal Potion! +20 HP');
        } else {
            alert('Need 3 herbs!');
        }
    };

    // ---------- CRAFTING BENCH ----------
    window.openCraftingBench = function() {
        const grid = document.getElementById('benchCraftingGrid');
        grid.innerHTML = '';
        
        const recipes = [
            { name: 'Wood Sword', req: 'Wood x3, Stone x1', 
              craft: () => craftItem({ wood: 3, stone: 1, weapon: 'Wood Sword', damage: 15 }) },
            { name: 'Stone Axe', req: 'Stone x3, Wood x2', 
              craft: () => craftItem({ stone: 3, wood: 2, weapon: 'Stone Axe', damage: 20 }) },
            { name: 'Leather Armor', req: 'Leather x4, Wood x2', 
              craft: () => craftItem({ leather: 4, wood: 2, armor: 5 }) },
            { name: 'Iron Sword', req: 'Iron x3, Coal x2', 
              craft: () => craftItem({ iron: 3, coal: 2, weapon: 'Iron Sword', damage: 30 }) },
            { name: 'Gold Sword', req: 'Gold x2, Iron x3', 
              craft: () => craftItem({ gold: 2, iron: 3, weapon: 'Gold Sword', damage: 40 }) },
            { name: 'Herbal Potion', req: 'Herb x3', 
              craft: () => craftItem({ herb: 3, heal: 30 }) }
        ];
        
        recipes.forEach(recipe => {
            let slot = document.createElement('div');
            slot.className = 'bench-craft-slot';
            slot.innerHTML = `
                <div class="item-name">${recipe.name}</div>
                <div class="item-req">${recipe.req}</div>
            `;
            slot.addEventListener('click', () => {
                recipe.craft();
                updateUI();
            });
            grid.appendChild(slot);
        });
        
        document.getElementById('craftingBenchPopup').style.display = 'block';
    };

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
            alert('Crafted successfully!');
        } else {
            alert('Not enough materials!');
        }
    }

    document.getElementById('closeBenchPopup').addEventListener('click', () => {
        document.getElementById('craftingBenchPopup').style.display = 'none';
    });

    // ---------- BUILDING INVENTORY ----------
    function showBuildingInventory(building) {
        let grid = document.getElementById('buildingInventoryGrid');
        document.getElementById('buildingName').textContent = building.type;
        grid.innerHTML = '';
        
        for (let [item, count] of Object.entries(building.inventory)) {
            if (count > 0) {
                const material = materialMap[item] || { icon: '📦', name: item };
                let slot = document.createElement('div');
                slot.className = 'building-slot';
                slot.innerHTML = `
                    <div class="item-icon">${material.icon}</div>
                    <div class="item-count">${count}</div>
                `;
                slot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (building.inventory[item] > 0) {
                        player.inventory[item] = (player.inventory[item] || 0) + 1;
                        building.inventory[item]--;
                        
                        let total = Object.values(building.inventory).reduce((a, b) => a + b, 0);
                        if (total === 0) {
                            let idx = buildings.indexOf(building);
                            if (idx !== -1) {
                                buildings.splice(idx, 1);
                                spawnNewBuilding();
                            }
                            closeBuildingInventory();
                        } else {
                            showBuildingInventory(building);
                        }
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

    // ---------- TOWER FUNCTIONS ----------
    function enterTower() {
        if (!isTowerAvailable()) {
            alert("Tower is on cooldown! " + getTowerStatus());
            return;
        }
        
        if (tower.defeated) {
            tower.defeated = false;
            tower.guardianHealth = tower.guardianMaxHealth;
        }
        
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
            
            // Rewards
            let rewards = [];
            if (Math.random() > 0.4) { 
                player.inventory.sapphire = (player.inventory.sapphire || 0) + 1; 
                rewards.push("1 Sapphire"); 
            }
            if (Math.random() > 0.6) { 
                player.inventory.ruby = (player.inventory.ruby || 0) + 1; 
                rewards.push("1 Ruby"); 
            }
            if (Math.random() > 0.8) { 
                player.inventory.emerald = (player.inventory.emerald || 0) + 1; 
                rewards.push("1 Emerald"); 
            }
            player.inventory.gold += 3;
            player.inventory.crystal += 2;
            rewards.push("3 Gold, 2 Crystal");
            
            towerBattleLog.unshift("Rewards: " + rewards.join(", "));
            towerBattleLog.unshift(`Tower will respawn in ${tower.cooldownDays} days!`);
            
            document.getElementById('towerAttackBtn').disabled = true;
            updateInventoryDisplay();
            document.getElementById('towerEnemyHealth').textContent = 0;
            document.getElementById('towerBattleLog').innerHTML = towerBattleLog.slice(0, 3).join('<br>');
            return;
        }
        
        let guardianDamage = Math.max(8, 20 - player.armor);
        player.health -= guardianDamage;
        towerBattleLog.unshift(`Guardian hits you for ${guardianDamage} damage!`);
        
        document.getElementById('towerEnemyHealth').textContent = tower.guardianHealth;
        document.getElementById('towerPlayerHealthValue').textContent = player.health;
        
        if (player.health <= 0) {
            towerBattleLog.unshift("💀 You were defeated! Game Over!");
            setTimeout(() => { 
                resetGame(); 
                closeTower(); 
            }, 2000);
        }
        
        document.getElementById('towerBattleLog').innerHTML = towerBattleLog.slice(0, 3).join('<br>');
    };

    window.towerHeal = function() {
        if (player.inventory.herb >= 5) {
            player.inventory.herb -= 5;
            player.health = Math.min(player.maxHealth, player.health + 30);
            towerBattleLog.unshift("You used 5 herbs to heal 30 HP!");
            document.getElementById('towerPlayerHealthValue').textContent = player.health;
            updateInventoryDisplay();
        } else {
            towerBattleLog.unshift("Not enough herbs! (Need 5)");
        }
        document.getElementById('towerBattleLog').innerHTML = towerBattleLog.slice(0, 3).join('<br>');
    };

    window.closeTower = function() {
        inTower = false;
        document.getElementById('towerPopup').style.display = 'none';
    };

    document.getElementById('towerAttackBtn').addEventListener('click', window.towerAttack);
    document.getElementById('towerHealBtn').addEventListener('click', window.towerHeal);
    document.getElementById('towerExitBtn').addEventListener('click', window.closeTower);

    function resetGame() {
        player = { x: 900, y: 1000, health: 100, maxHealth: 100, weapon: 'Fist', weaponDamage: 10, armor: 0, inventory: {} };
        materials.forEach(m => player.inventory[m.id] = 5);
        campfire = { health: 500, maxHealth: 500, level: 1, repelRange: 150, upgradeCosts: campfire.upgradeCosts };
        tower.defeated = false;
        tower.guardianHealth = 200;
        tower.defeatTime = 0;
        enemies = [];
        generateWorld();
        buildings = [];
        for (let i = 0; i < maxBuildings; i++) spawnNewBuilding();
    }

    // ---------- JOYSTICK CONTROLS ----------
    window.handleTouchStart = (e) => {
        e.preventDefault();
        let touch = e.touches[0];
        let rect = document.getElementById('joystickContainer').getBoundingClientRect();
        joystickStartPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
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
        let dist = Math.hypot(dx, dy);
        let maxDist = 25;
        
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }
        
        joystickDir = { x: dx / maxDist, y: dy / maxDist };
        document.getElementById('joystick').style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };

    window.handleTouchEnd = (e) => {
        e.preventDefault();
        joystickActive = false;
        joystickDir = { x: 0, y: 0 };
        document.getElementById('joystick').style.transform = 'translate(-50%, -50%)';
    };

    // ---------- GAME LOOP ----------
    function update() {
        gameTime = (gameTime + 0.001) % 24;
        
        if (attackCooldown > 0) attackCooldown--;
        
        // Movement
        if (joystickActive && !inTower) {
            player.x += joystickDir.x * 5;
            player.y += joystickDir.y * 5;
            player.x = Math.max(50, Math.min(WORLD_SIZE - 50, player.x));
            player.y = Math.max(50, Math.min(WORLD_SIZE - 50, player.y));
        }
        
        // Enemy AI
        if (!inTower) {
            enemies.forEach((e, i) => {
                let distToCampfire = Math.hypot(e.x - CAMPFIRE_X, e.y - CAMPFIRE_Y);
                
                if (distToCampfire < campfire.repelRange) {
                    let angle = Math.atan2(e.y - CAMPFIRE_Y, e.x - CAMPFIRE_X);
                    e.x += Math.cos(angle) * 2.5;
                    e.y += Math.sin(angle) * 2.5;
                } else {
                    let dx = player.x - e.x;
                    let dy = player.y - e.y;
                    let dist = Math.hypot(dx, dy);
                    if (dist > 0) {
                        e.x += (dx / dist) * 0.9;
                        e.y += (dy / dist) * 0.9;
                    }
                }
                
                e.x = Math.max(50, Math.min(WORLD_SIZE - 50, e.x));
                e.y = Math.max(50, Math.min(WORLD_SIZE - 50, e.y));
                
                if (Math.hypot(e.x - player.x, e.y - player.y) < 30 && (e.attackTimer || 0) <= 0) {
                    player.health -= Math.max(1, 12 - player.armor);
                    e.attackTimer = 30;
                }
                
                if (e.attackTimer > 0) e.attackTimer--;
            });
            
            // Spawn enemies at night
            let isDay = gameTime >= 6 && gameTime < 18;
            if (!isDay && enemies.length < 8 && Math.random() < 0.008) {
                let angle = Math.random() * Math.PI * 2;
                enemies.push({
                    x: player.x + Math.cos(angle) * 300,
                    y: player.y + Math.sin(angle) * 300,
                    health: 50 + campfire.level * 5,
                    damage: 12 + campfire.level,
                    attackTimer: 0
                });
            }
        }
        
        if (player.health <= 0 || campfire.health <= 0) resetGame();
        
        draw();
        requestAnimationFrame(update);
    }

    // Initialize game
    generateWorld();
    updateInventoryDisplay();
    update();
})();
