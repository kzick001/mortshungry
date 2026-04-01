import { GAME_CONFIG } from '../config.js';
import Player from '../objects/Player.js';
import Item from '../objects/Item.js';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    init() {
        // Core State
        this.score = 0;
        this.comboCount = 0;
        this.multiplier = 1;
        this.lives = GAME_CONFIG.player.baseLives;
        this.isGameOver = false;

        // Detailed Stats Tracking
        this.runStats = {
            foodCaught: 0,
            hazardsHit: 0,
            powerupsUsed: 0,
            specialsTriggered: 0
        };

        // Spawning State
        this.currentSpawnRate = GAME_CONFIG.spawning.initialRate;
        this.lastSpawnX = this.cameras.main.centerX;

        // Event States
        this.activeEvent = null;
        
        // Power-up States
        this.hasMagnet = false;

        // Load Save Data for Upgrades
        this.saveData = JSON.parse(localStorage.getItem('morts_hungry_save'));
    }

    create() {
        // --- SAFE V1.2.1: Background Music Leveling & Safety Check ---
        if (this.cache.audio.exists('bgm_jungle_loop')) {
            this.bgm = this.sound.add('bgm_jungle_loop', { loop: true, volume: 0.1 });
            this.bgm.play();
        }

        // Backgrounds
        this.bgJungle = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'bg_jungle').setOrigin(0.5);
        this.bgNeon = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'bg_neon').setOrigin(0.5).setAlpha(0);
        this.bgDark = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'bg_dark').setOrigin(0.5).setAlpha(0);

        // Floor
        this.floor = this.physics.add.staticImage(this.cameras.main.centerX, this.cameras.main.height - 50, 'env_floor');

        // Apply Upgrades to Player Config
        const agilityTier = this.saveData.unlockedUpgrades.agility || 0;
        const jawTier = this.saveData.unlockedUpgrades.jaw_dislocation || 0;
        const telekinesisTier = this.saveData.unlockedUpgrades.telekinesis || 0;

        // Temporarily modify the config for this run based on upgrades
        const runConfig = JSON.parse(JSON.stringify(GAME_CONFIG));
        runConfig.player.baseSpeed *= (1 + (agilityTier * GAME_CONFIG.economy.upgrades.agility.effectValue));
        runConfig.player.hitboxScaleX *= (1 + (jawTier * GAME_CONFIG.economy.upgrades.jaw_dislocation.effectValue));
        GAME_CONFIG.player = runConfig.player; // Override for Player.js to read

        if (telekinesisTier > 0) this.hasMagnet = true; // Weak permanent magnet

        // Instantiate Player
        this.player = new Player(this, this.cameras.main.centerX, this.cameras.main.height - 150);

        // Item Group
        this.items = this.physics.add.group({ classType: Item, runChildUpdate: true });

        // Collisions
        this.physics.add.overlap(this.player, this.items, this.handlePlayerCatch, null, this);
        this.physics.add.collider(this.items, this.floor, this.handleItemHitFloor, null, this);

        // UI
        this.scoreText = this.add.text(20, 20, 'Score: 0', { font: '32px monospace', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setDepth(10);
        this.comboText = this.add.text(20, 60, 'Combo: 1x', { font: '32px monospace', fill: '#ffd700', stroke: '#000', strokeThickness: 4 }).setDepth(10);
        this.livesText = this.add.text(this.cameras.main.width - 150, 20, `Lives: ${this.lives}`, { font: '32px monospace', fill: '#ff0000', stroke: '#000', strokeThickness: 4 }).setDepth(10);

        // Start Spawning
        this.spawnTimer = this.time.addEvent({
            delay: this.currentSpawnRate,
            callback: this.spawnItem,
            callbackScope: this,
            loop: true
        });
    }

    update(time, delta) {
        if (this.isGameOver) return;
        
        this.player.update(time, delta);

        // Handle Magnet Effect
        if (this.hasMagnet) {
            this.items.getChildren().forEach(item => {
                if (!item.hasHitFloor) {
                    this.physics.moveToObject(item, this.player, 200);
                }
            });
        }
    }

    spawnItem() {
        if (this.isGameOver) return;

        // Determine Spawn X
        let spawnX;
        let attempts = 0;
        do {
            spawnX = Phaser.Math.Between(50, this.cameras.main.width - 50);
            attempts++;
        } while (Math.abs(spawnX - this.lastSpawnX) < GAME_CONFIG.spawning.safeDistanceX && attempts < 10);
        
        this.lastSpawnX = spawnX;

        // Determine Item Type
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
                if (random <= 0) {
                    itemKey = key;
                    break;
                }
            }
        }

        const item = new Item(this, spawnX, -50, itemKey);
        this.items.add(item);

        if (GAME_CONFIG.items[itemKey].type === 'hazard') {
            const warning = this.add.image(spawnX, 50, 'ui_telegraph').setAlpha(0);
            this.tweens.add({
                targets: warning,
                alpha: 1,
                yoyo: true,
                duration: 200,
                repeat: 2,
                onComplete: () => warning.destroy()
            });
        }
    }

    increaseDifficulty() {
        this.currentSpawnRate = Math.max(GAME_CONFIG.spawning.minRate, this.currentSpawnRate - GAME_CONFIG.spawning.rateDecay);
        this.spawnTimer.delay = this.currentSpawnRate;

        // BGM Tempo Scaling (Wrapped in safety check)
        if (this.bgm) {
            const tempoMultiplier = 1 + (1 - (this.currentSpawnRate / GAME_CONFIG.spawning.initialRate));
            this.bgm.setRate(Math.min(tempoMultiplier, 1.5));
        }
    }

    handlePlayerCatch(player, item) {
        if (item.hasHitFloor || this.isGameOver) return;
        
        const config = item.itemConfig;
        
        // --- SAFE V1.2.1: Particle Check ---
        if (this.textures.exists('vfx_dust')) {
            try {
                const emitter = this.add.particles(item.x, item.y, 'vfx_dust', {
                    speed: { min: 50, max: 200 },
                    scale: { start: 1, end: 0 },
                    lifespan: 400,
                    blendMode: 'ADD'
                });
                emitter.explode(15);
                this.time.delayedCall(500, () => emitter.destroy()); // Cleanup
            } catch (e) {
                console.warn("Particle explosion failed, continuing game loop.");
            }
        }

        item.destroy(); 

        if (config.type === 'food') {
            this.runStats.foodCaught++;
            
            // --- SAFE V1.2.1: Audio Check ---
            if (this.cache.audio.exists('sfx_gulp')) {
                this.sound.play('sfx_gulp', { detune: (this.multiplier || 1) * 100 });
            }
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

            this.score += (config.points * this.multiplier);
            this.scoreText.setText(`Score: ${this.score}`);
            this.increaseDifficulty();

        } else if (config.type === 'hazard') {
            this.runStats.hazardsHit++;
            if (config.breaksCombo) {
                if (this.cache.audio.exists('sfx_splat')) this.sound.play('sfx_splat');
                this.resetCombo();
            } else {
                if (player.takeDamage()) {
                    if (this.cache.audio.exists('sfx_hurt')) this.sound.play('sfx_hurt');
                    this.cameras.main.shake(200, 0.02);
                    this.lives -= config.damage;
                    this.livesText.setText(`Lives: ${this.lives}`);
                    this.resetCombo();

                    if (this.lives <= 0) this.triggerGameOver();
                }
            }
        } else if (config.type === 'powerup') {
            this.runStats.powerupsUsed++;
            if (this.cache.audio.exists('sfx_powerup')) this.sound.play('sfx_powerup');
            player.playCatchJuice();
            this.applyPowerUp(config);
        } else if (config.type === 'special') {
            this.runStats.specialsTriggered++;
            if (this.cache.audio.exists('sfx_powerup')) this.sound.play('sfx_powerup');
            player.playCatchJuice();
            this.triggerSpecialEvent(config.event);
        }
    }

    handleItemHitFloor(obj1, obj2) {
        // --- SAFE V1.2.2: The Smart Sorter ---
        // Phaser sometimes swaps the objects. Let's find out which one is the Item.
        let item = null;
        
        if (obj1 && typeof obj1.hitFloor === 'function') {
            item = obj1;
        } else if (obj2 && typeof obj2.hitFloor === 'function') {
            item = obj2;
        }

        // If neither object is an Item (somehow), safely abort.
        if (!item) return;

        // If it's already splattered, don't trigger the logic twice
        if (item.hasHitFloor) return;
        
        // Run the splatter and despawn logic from Item.js
        item.hitFloor(); 
        
        // Play the sound
        if (this.cache.audio.exists('sfx_splat')) {
            this.sound.play('sfx_splat', { volume: 0.5 });
        }
        
        // Break the combo if food hits the floor
        if (item.itemConfig && item.itemConfig.type === 'food') {
            this.resetCombo();
        }
    }

    resetCombo() {
        this.comboCount = 0;
        this.multiplier = 1;
        this.comboText.setText(`Combo: 1x`);
    }

    applyPowerUp(config) {
        // --- SAFE V1.2.1: Relative Scaling for Pill ---
        const base = GAME_CONFIG.player.displayScale || 1;
        
        if (config.effect === 'expand_jaw') {
            this.player.setScale(base * 2, base); // Scale relative to Mort's standard size
            this.player.startPowerUpTimer(config.duration, 0xff0000); // Red bar
            this.time.delayedCall(config.duration, () => this.player.setScale(base));
        } else if (config.effect === 'magnet') {
            this.hasMagnet = true;
            this.player.startPowerUpTimer(config.duration, 0x00ff00); // Green bar
            this.time.delayedCall(config.duration, () => {
                if (!this.saveData.unlockedUpgrades.telekinesis) this.hasMagnet = false;
            });
        }
    }

    triggerSpecialEvent(eventName) {
        // Cancel active power-ups
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
            // Hazard Cleansing
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
