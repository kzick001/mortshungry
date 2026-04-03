import { GAME_CONFIG } from '../config.js';
import Player from '../objects/Player.js';
import Item from '../objects/Item.js';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    init() {
        this.score = 0;
        this.comboCount = 0;
        this.multiplier = 1;
        this.lives = GAME_CONFIG.player.baseLives;
        this.isGameOver = false;

        this.runStats = { foodCaught: 0, hazardsHit: 0, powerupsUsed: 0, specialsTriggered: 0 };
        this.currentSpawnRate = GAME_CONFIG.spawning.initialRate;
        this.lastSpawnX = this.cameras.main.centerX;
        this.activeEvent = null;
        this.hasMagnet = false;
        this.saveData = JSON.parse(localStorage.getItem('morts_hungry_save'));

        // --- PHASE 3: LIVE TWEAKER VARIABLES ---
        this.debugSettings = {
            gravityY: GAME_CONFIG.physics.gravityY,
            mortSpeed: GAME_CONFIG.player.baseSpeed,
            shakeIntensity: 0.02,
            hitboxForgiveness: GAME_CONFIG.player.hitboxScaleX
        };
    }

    create() {
        if (this.cache.audio.exists('bgm_jungle_loop')) {
            this.bgm = this.sound.add('bgm_jungle_loop', { loop: true, volume: 0.1 });
            this.bgm.play();
        }

        // --- PHASE 2: VISUAL DEPTH ALIGNMENT ---
        // Depth 0: Backgrounds and Visual Floor
        this.bgJungle = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'bg_jungle').setOrigin(0.5).setDepth(0);
        this.bgNeon = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'bg_neon').setOrigin(0.5).setAlpha(0).setDepth(0);
        this.bgDark = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'bg_dark').setOrigin(0.5).setAlpha(0).setDepth(0);
        this.floorVisual = this.add.image(this.cameras.main.centerX, this.cameras.main.height - 50, 'env_floor').setDepth(0);

        // Invisible Physics Floor (Positioned on the dirt trail)
        const dirtY = this.cameras.main.height - 30; // Adjust this number to align with your dirt pixels
        this.floorHitbox = this.add.rectangle(this.cameras.main.centerX, dirtY, this.cameras.main.width, 20, 0x00ff00, 0);
        this.physics.add.existing(this.floorHitbox, true); 

        // Apply Permanent Upgrades
        const agilityTier = this.saveData.unlockedUpgrades.agility || 0;
        const jawTier = this.saveData.unlockedUpgrades.jaw_dislocation || 0;
        if (this.saveData.unlockedUpgrades.telekinesis > 0) this.hasMagnet = true;

        this.debugSettings.mortSpeed *= (1 + (agilityTier * GAME_CONFIG.economy.upgrades.agility.effectValue));
        this.debugSettings.hitboxForgiveness *= (1 + (jawTier * GAME_CONFIG.economy.upgrades.jaw_dislocation.effectValue));

        // Depth 2: Entities
        this.player = new Player(this, this.cameras.main.centerX, dirtY - 100);
        this.player.setDepth(2);
        
        // Feature 1: Mort's Drop Shadow (Depth 1)
        this.playerShadow = this.add.ellipse(this.player.x, dirtY, 50, 15, 0x000000, 0.4).setDepth(1);

        this.items = this.physics.add.group({ classType: Item, runChildUpdate: true });

        this.physics.add.overlap(this.player, this.items, this.handlePlayerCatch, null, this);
        this.physics.add.collider(this.items, this.floorHitbox, this.handleItemHitFloor, null, this);

        // UI
        this.scoreText = this.add.text(20, 20, 'Score: 0', { font: '32px monospace', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setDepth(10);
        this.comboText = this.add.text(20, 60, 'Combo: 1x', { font: '32px monospace', fill: '#ffd700', stroke: '#000', strokeThickness: 4 }).setDepth(10);
        this.livesText = this.add.text(this.cameras.main.width - 150, 20, `Lives: ${this.lives}`, { font: '32px monospace', fill: '#ff0000', stroke: '#000', strokeThickness: 4 }).setDepth(10);

        this.spawnTimer = this.time.addEvent({ delay: this.currentSpawnRate, callback: this.spawnItem, callbackScope: this, loop: true });

        this.setupGUI();
    }

    setupGUI() {
        // Only load if lil-gui successfully injected from index.html
        if (window.lil) {
            this.gui = new window.lil.GUI({ title: '🛠 Mort Debugger' });
            
            const phys = this.gui.addFolder('Physics');
            phys.add(this.debugSettings, 'gravityY', 500, 2500).name('Gravity').onChange(v => {
                GAME_CONFIG.physics.gravityY = v;
                // Live-update existing falling items
                this.items.getChildren().forEach(item => {
                    const extraGrav = v * (item.itemConfig.speedMult - 1);
                    item.body.setGravityY(extraGrav);
                });
            });
            phys.add(this.debugSettings, 'mortSpeed', 300, 1200).name('Mort Speed').onChange(v => {
                this.player.currentSpeed = v;
            });

            const juice = this.gui.addFolder('Juice');
            juice.add(this.debugSettings, 'shakeIntensity', 0, 0.05).name('Hit Shake');
            juice.add(this.debugSettings, 'hitboxForgiveness', 0.5, 1.5).name('Hitbox Size').onChange(v => {
                const w = this.player.width * v;
                const h = this.player.height * v;
                this.player.body.setSize(w, h);
                this.player.body.setOffset((this.player.width - w) / 2, (this.player.height - h) / 2);
            });
        }
    }

    update(time, delta) {
        if (this.isGameOver) return;
        
        this.player.update(time, delta);

        // Pin Mort's shadow to his feet
        this.playerShadow.x = this.player.x;

        // Dynamic Drop Shadows for Items
        this.items.getChildren().forEach(item => {
            if (item.shadow && !item.hasHitFloor) {
                item.shadow.x = item.x;
                // Shadow gets smaller/darker as item approaches the floor
                const dist = Math.max(0, this.floorHitbox.y - item.y);
                const scale = 1 - Math.min(dist / 800, 0.8); 
                item.shadow.setScale(scale);
                item.shadow.setAlpha(0.1 + (scale * 0.4));
            }
            if (this.hasMagnet && !item.hasHitFloor) {
                this.physics.moveToObject(item, this.player, 200);
            }
        });
    }

    spawnItem() {
        if (this.isGameOver) return;

        let spawnX;
        let attempts = 0;
        do {
            spawnX = Phaser.Math.Between(50, this.cameras.main.width - 50);
            attempts++;
        } while (Math.abs(spawnX - this.lastSpawnX) < GAME_CONFIG.spawning.safeDistanceX && attempts < 10);
        
        this.lastSpawnX = spawnX;

        let itemKey = 'mango'; 
        if (this.activeEvent === 'mango_frenzy') {
            itemKey = 'mango';
        } else {
            let totalWeight = 0;
            const pool = GAME_CONFIG.items;
            for (const key in pool) totalWeight += pool[key].weight;
            let random = Phaser.Math.Between(0, totalWeight);
            for (const key in pool) {
                random -= pool[key].weight;
                if (random <= 0) { itemKey = key; break; }
            }
        }

        const item = new Item(this, spawnX, -50, itemKey);
        item.setDepth(2);
        
        // Add dynamic shadow tied to the item's lifecycle
        item.shadow = this.add.ellipse(spawnX, this.floorHitbox.y, 40, 15, 0x000000, 0).setDepth(1);
        item.on('destroy', () => { if (item.shadow) item.shadow.destroy(); });

        this.items.add(item);

        if (GAME_CONFIG.items[itemKey].type === 'hazard') {
            const warning = this.add.image(spawnX, 50, 'ui_telegraph').setAlpha(0);
            this.tweens.add({ targets: warning, alpha: 1, yoyo: true, duration: 200, repeat: 2, onComplete: () => warning.destroy() });
        }
    }

    increaseDifficulty() {
        this.currentSpawnRate = Math.max(GAME_CONFIG.spawning.minRate, this.currentSpawnRate - GAME_CONFIG.spawning.rateDecay);
        this.spawnTimer.delay = this.currentSpawnRate;
        if (this.bgm) {
            this.bgm.setRate(Math.min(1 + (1 - (this.currentSpawnRate / GAME_CONFIG.spawning.initialRate)), 1.5));
        }
    }

    spawnFloatingText(x, y, message, color) {
        const text = this.add.text(x, y, message, { font: 'bold 28px monospace', fill: color, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(10);
        this.tweens.add({
            targets: text,
            y: y - 80,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => text.destroy()
        });
    }

    handlePlayerCatch(player, item) {
        if (item.hasHitFloor || this.isGameOver) return;
        
        const config = item.itemConfig;
        
        if (this.textures.exists('vfx_dust')) {
            try {
                const emitter = this.add.particles(item.x, item.y, 'vfx_dust', {
                    speed: { min: 50, max: 200 }, scale: { start: 1, end: 0 }, lifespan: 400, blendMode: 'ADD'
                });
                emitter.explode(15);
                this.time.delayedCall(500, () => emitter.destroy());
            } catch (e) {}
        }

        item.destroy(); 

        if (config.type === 'food') {
            this.runStats.foodCaught++;
            if (this.cache.audio.exists('sfx_gulp')) this.sound.play('sfx_gulp', { detune: (this.multiplier || 1) * 100 });
            player.playCatchJuice();
            
            this.comboCount++;
            if (this.comboCount % 5 === 0 && this.multiplier < 10) {
                this.multiplier++;
                this.comboText.setText(`Combo: ${this.multiplier}x`);
                this.tweens.add({ targets: this.comboText, scale: 1.5, yoyo: true, duration: 200 });
                if (this.multiplier === 10 && this.textures.exists('vfx_fire')) {
                    this.add.image(this.comboText.x + 150, this.comboText.y + 15, 'vfx_fire').setOrigin(0.5);
                }
            }

            const pointsEarned = config.points * this.multiplier;
            this.score += pointsEarned;
            this.scoreText.setText(`Score: ${this.score}`);
            this.spawnFloatingText(player.x, player.y - 40, `+${pointsEarned}`, '#00ff00');
            this.increaseDifficulty();

        } else if (config.type === 'hazard') {
            this.runStats.hazardsHit++;
            if (config.breaksCombo) {
                if (this.cache.audio.exists('sfx_splat')) this.sound.play('sfx_splat');
                this.spawnFloatingText(player.x, player.y - 40, 'COMBO LOST', '#aaaaaa');
                this.resetCombo();
            } else {
                if (player.takeDamage()) {
                    if (this.cache.audio.exists('sfx_hurt')) this.sound.play('sfx_hurt');
                    this.cameras.main.shake(200, this.debugSettings.shakeIntensity);
                    this.lives -= config.damage;
                    this.livesText.setText(`Lives: ${this.lives}`);
                    this.spawnFloatingText(player.x, player.y - 40, `OUCH!`, '#ff0000');
                    this.resetCombo();
                    if (this.lives <= 0) this.triggerGameOver();
                }
            }
        } else if (config.type === 'powerup') {
            this.runStats.powerupsUsed++;
            if (this.cache.audio.exists('sfx_powerup')) this.sound.play('sfx_powerup');
            player.playCatchJuice();
            this.spawnFloatingText(player.x, player.y - 40, 'POWER UP!', '#00ffff');
            this.applyPowerUp(config);
        } else if (config.type === 'special') {
            this.runStats.specialsTriggered++;
            if (this.cache.audio.exists('sfx_powerup')) this.sound.play('sfx_powerup');
            player.playCatchJuice();
            this.spawnFloatingText(player.x, player.y - 40, 'SPECIAL!', '#ff00ff');
            this.triggerSpecialEvent(config.event);
        }
    }

    handleItemHitFloor(obj1, obj2) {
        let item = obj1.itemKey ? obj1 : (obj2.itemKey ? obj2 : null);
        if (!item || item.hasHitFloor) return;
        
        try {
            item.hitFloor(); 
            // Paint the splat exactly on Depth 1 (Above the dirt, below Mort/Items)
            if (item.splatterGfx) item.splatterGfx.setDepth(1); 

            if (this.cache.audio.exists('sfx_splat')) this.sound.play('sfx_splat', { volume: 0.5 });
            if (item.itemConfig && item.itemConfig.type === 'food') this.resetCombo();
        } catch (e) {
            item.destroy(); 
        }
    }

    resetCombo() {
        this.comboCount = 0;
        this.multiplier = 1;
        this.comboText.setText(`Combo: 1x`);
    }

    applyPowerUp(config) {
        const base = GAME_CONFIG.player.displayScale || 1;
        if (config.effect === 'expand_jaw') {
            this.player.setScale(base * 2, base); 
            this.player.startPowerUpTimer(config.duration, 0xff0000); 
            this.time.delayedCall(config.duration, () => this.player.setScale(base));
        } else if (config.effect === 'magnet') {
            this.hasMagnet = true;
            this.player.startPowerUpTimer(config.duration, 0x00ff00); 
            this.time.delayedCall(config.duration, () => {
                if (!this.saveData.unlockedUpgrades.telekinesis) this.hasMagnet = false;
            });
        }
    }

    triggerSpecialEvent(eventName) {
        const base = GAME_CONFIG.player.displayScale || 1;
        this.player.setScale(base, base);
        this.hasMagnet = (this.saveData.unlockedUpgrades.telekinesis > 0);
        
        if (this.player.powerUpTween) {
            this.player.powerUpTween.stop();
            this.player.powerUpBar.setAlpha(0);
        }

        this.activeEvent = eventName;
        if (eventName === 'random_special') {
            eventName = Phaser.Math.Between(0, 1) === 0 ? 'mango_frenzy' : 'predator_protocol';
            this.activeEvent = eventName;
        }

        if (eventName === 'mango_frenzy') {
            this.items.getChildren().forEach(item => {
                if (item.itemConfig && item.itemConfig.type === 'hazard') {
                    if (this.textures.exists('vfx_dust')) {
                        const poof = this.add.image(item.x, item.y, 'vfx_dust');
                        this.tweens.add({ targets: poof, alpha: 0, duration: 500, onComplete: () => poof.destroy() });
                    }
                    item.destroy();
                }
            });
            this.tweens.add({ targets: this.bgNeon, alpha: 1, duration: 500 });
            this.time.delayedCall(10000, () => {
                this.activeEvent = null;
                this.tweens.add({ targets: this.bgNeon, alpha: 0, duration: 500 });
            });
        } else if (eventName === 'predator_protocol') {
            this.tweens.add({ targets: this.bgDark, alpha: 1, duration: 500 });
            this.currentSpawnRate = GAME_CONFIG.spawning.minRate; 
            this.time.delayedCall(8000, () => {
                this.activeEvent = null;
                this.tweens.add({ targets: this.bgDark, alpha: 0, duration: 500 });
            });
        } else if (eventName === 'clear_hazards') {
            this.lives++;
            this.livesText.setText(`Lives: ${this.lives}`);
            this.items.getChildren().forEach(item => {
                if (item.itemConfig && item.itemConfig.type === 'hazard') {
                    if (this.textures.exists('vfx_dust')) {
                        const poof = this.add.image(item.x, item.y, 'vfx_dust');
                        this.tweens.add({ targets: poof, alpha: 0, duration: 500, onComplete: () => poof.destroy() });
                    }
                    item.destroy();
                }
            });
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.physics.pause();
        this.spawnTimer.remove();
        if (this.bgm) this.bgm.stop(); 
        if (this.gui) this.gui.destroy(); // Remove Debug GUI

        const currencyEarned = Math.floor(this.score * GAME_CONFIG.economy.currencyConversion);
        if (this.score > this.saveData.highScore) this.saveData.highScore = this.score;
        this.saveData.totalCurrency += currencyEarned;
        localStorage.setItem('morts_hungry_save', JSON.stringify(this.saveData));

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85).fillRect(0, 0, this.cameras.main.width, this.cameras.main.height).setDepth(100);

        this.add.text(this.cameras.main.centerX, 150, 'GAME OVER', { font: '64px monospace', fill: '#ff0000' }).setOrigin(0.5).setDepth(101);
        this.add.text(this.cameras.main.centerX, 250, `Final Score: ${this.score}`, { font: '48px monospace', fill: '#fff' }).setOrigin(0.5).setDepth(101);
        this.add.text(this.cameras.main.centerX, 320, `Food Caught: ${this.runStats.foodCaught}`, { font: '24px monospace', fill: '#00ff00' }).setOrigin(0.5).setDepth(101);
        this.add.text(this.cameras.main.centerX, 360, `Hazards Hit: ${this.runStats.hazardsHit}`, { font: '24px monospace', fill: '#ff0000' }).setOrigin(0.5).setDepth(101);
        this.add.text(this.cameras.main.centerX, 400, `Power-Ups Used: ${this.runStats.powerupsUsed}`, { font: '24px monospace', fill: '#00ffff' }).setOrigin(0.5).setDepth(101);
        this.add.text(this.cameras.main.centerX, 440, `Specials Triggered: ${this.runStats.specialsTriggered}`, { font: '24px monospace', fill: '#ff00ff' }).setOrigin(0.5).setDepth(101);
        this.add.text(this.cameras.main.centerX, 520, `Currency Earned: +${currencyEarned}`, { font: '32px monospace', fill: '#ffd700' }).setOrigin(0.5).setDepth(101);

        const menuBtn = this.add.text(this.cameras.main.centerX, 650, 'RETURN TO MENU', { font: '48px monospace', fill: '#00ff00' })
            .setOrigin(0.5).setDepth(101).setInteractive();

        menuBtn.on('pointerdown', () => {
            if (this.cache.audio.exists('sfx_ui_click')) this.sound.play('sfx_ui_click');
            this.scene.start('Menu');
        });
    }
}
