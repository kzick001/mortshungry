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

        // Spawning State
        this.currentSpawnRate = GAME_CONFIG.spawning.initialRate;
        this.lastSpawnX = this.cameras.main.centerX;

        // Event States
        this.activeEvent = null;
        this.eventTimer = null;
        
        // Power-up States
        this.hasMagnet = false;

        // Load Save Data for Upgrades
        this.saveData = JSON.parse(localStorage.getItem('morts_hungry_save'));
    }

    create() {
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

        // Handle Magnet Effect (Syringe Power-up or Telekinesis Upgrade)
        if (this.hasMagnet) {
            this.items.getChildren().forEach(item => {
                if (!item.hasHitFloor) {
                    this.physics.moveToObject(item, this.player, 200);
                }
            });
        }
    }

    // ---------------------------------------------------
    // SPAWNING SYSTEM
    // ---------------------------------------------------
    spawnItem() {
        if (this.isGameOver) return;

        // Determine Spawn X (Ensure safe distance from last spawn to prevent impossible traps)
        let spawnX;
        let attempts = 0;
        do {
            spawnX = Phaser.Math.Between(50, this.cameras.main.width - 50);
            attempts++;
        } while (Math.abs(spawnX - this.lastSpawnX) < GAME_CONFIG.spawning.safeDistanceX && attempts < 10);
        
        this.lastSpawnX = spawnX;

        // Determine Item Type based on Event or Weights
        let itemKey = 'mango'; // Default fallback
        
        if (this.activeEvent === 'mango_frenzy') {
            itemKey = 'mango';
        } else {
            // Calculate total weight
            let totalWeight = 0;
            const pool = GAME_CONFIG.items;
            for (const key in pool) {
                // Remove hazards if Predator Protocol isn't active, or boost them if it is? 
                // Let's stick to standard weights unless explicitly overridden
                totalWeight += pool[key].weight;
            }

            let random = Phaser.Math.Between(0, totalWeight);
            for (const key in pool) {
                random -= pool[key].weight;
                if (random <= 0) {
                    itemKey = key;
                    break;
                }
            }
        }

        // Create Item
        const item = new Item(this, spawnX, -50, itemKey);
        this.items.add(item);

        // Telegraph Warning for Hazards
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
    }

    // ---------------------------------------------------
    // COLLISION & GAMEPLAY LOGIC
    // ---------------------------------------------------
    handlePlayerCatch(player, item) {
        if (item.hasHitFloor || this.isGameOver) return;
        
        const config = item.itemConfig;
        item.destroy(); // Consume item

        if (config.type === 'food') {
            this.sound.play('sfx_gulp');
            player.playCatchJuice();
            
            // Score & Combo Logic (Rule of 5s)
            this.comboCount++;
            if (this.comboCount % 5 === 0 && this.multiplier < 10) {
                this.multiplier++;
                this.comboText.setText(`Combo: ${this.multiplier}x`);
                
                // Visual feedback for multiplier increase
                this.tweens.add({ targets: this.comboText, scale: 1.5, yoyo: true, duration: 200 });
                if (this.multiplier === 10) this.add.image(this.comboText.x + 150, this.comboText.y + 15, 'vfx_fire').setOrigin(0.5);
            }

            this.score += (config.points * this.multiplier);
            this.scoreText.setText(`Score: ${this.score}`);
            this.increaseDifficulty();

        } else if (config.type === 'hazard') {
            if (config.breaksCombo) {
                this.sound.play('sfx_splat');
                this.resetCombo();
            } else {
                if (player.takeDamage()) {
                    this.sound.play('sfx_hurt');
                    this.cameras.main.shake(200, 0.02);
                    this.lives -= config.damage;
                    this.livesText.setText(`Lives: ${this.lives}`);
                    this.resetCombo();

                    if (this.lives <= 0) this.triggerGameOver();
                }
            }
        } else if (config.type === 'powerup') {
            this.sound.play('sfx_powerup');
            player.playCatchJuice();
            this.applyPowerUp(config);
        } else if (config.type === 'special') {
            this.sound.play('sfx_powerup');
            player.playCatchJuice();
            this.triggerSpecialEvent(config.event);
        }
    }

    handleItemHitFloor(item, floor) {
        if (item.hasHitFloor) return;
        
        item.hitFloor(); // Triggers visual splatter and freezes item
        this.sound.play('sfx_splat');

        // Dropping food breaks the combo
        if (item.itemConfig.type === 'food') {
            this.resetCombo();
        }
    }

    resetCombo() {
        this.comboCount = 0;
        this.multiplier = 1;
        this.comboText.setText(`Combo: 1x`);
    }

    // ---------------------------------------------------
    // POWER-UPS & SPECIAL EVENTS
    // ---------------------------------------------------
    applyPowerUp(config) {
        if (config.effect === 'expand_jaw') {
            this.player.setScale(2, 1);
            this.time.delayedCall(config.duration, () => this.player.setScale(1, 1));
        } else if (config.effect === 'magnet') {
            this.hasMagnet = true;
            this.time.delayedCall(config.duration, () => {
                if (!this.saveData.unlockedUpgrades.telekinesis) this.hasMagnet = false;
            });
        }
    }

    triggerSpecialEvent(eventName) {
        this.activeEvent = eventName;
        
        if (eventName === 'random_special') {
            // Pick randomly between Frenzy or Dark Mode for the Star
            eventName = Phaser.Math.Between(0, 1) === 0 ? 'mango_frenzy' : 'predator_protocol';
            this.activeEvent = eventName;
        }

        if (eventName === 'mango_frenzy') {
            this.tweens.add({ targets: this.bgNeon, alpha: 1, duration: 500 });
            this.time.delayedCall(10000, () => {
                this.activeEvent = null;
                this.tweens.add({ targets: this.bgNeon, alpha: 0, duration: 500 });
            });
        } else if (eventName === 'predator_protocol') {
            this.tweens.add({ targets: this.bgDark, alpha: 1, duration: 500 });
            this.currentSpawnRate = GAME_CONFIG.spawning.minRate; // Instant max speed
            this.time.delayedCall(8000, () => {
                this.activeEvent = null;
                this.tweens.add({ targets: this.bgDark, alpha: 0, duration: 500 });
            });
        } else if (eventName === 'clear_hazards') {
            // Golden Foot effect
            this.lives++;
            this.livesText.setText(`Lives: ${this.lives}`);
            this.items.getChildren().forEach(item => {
                if (item.itemConfig.type === 'hazard') {
                    const poof = this.add.image(item.x, item.y, 'vfx_dust');
                    this.tweens.add({ targets: poof, alpha: 0, duration: 500, onComplete: () => poof.destroy() });
                    item.destroy();
                }
            });
        }
    }

    // ---------------------------------------------------
    // GAME OVER
    // ---------------------------------------------------
    triggerGameOver() {
        this.isGameOver = true;
        this.physics.pause();
        this.spawnTimer.remove();

        // Economy Math
        const currencyEarned = Math.floor(this.score * GAME_CONFIG.economy.currencyConversion);
        
        // Update Save Data
        if (this.score > this.saveData.highScore) this.saveData.highScore = this.score;
        this.saveData.totalCurrency += currencyEarned;
        localStorage.setItem('morts_hungry_save', JSON.stringify(this.saveData));

        // Build Summary Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85).fillRect(0, 0, this.cameras.main.width, this.cameras.main.height).setDepth(100);

        this.add.text(this.cameras.main.centerX, 200, 'GAME OVER', { font: '64px monospace', fill: '#ff0000' }).setOrigin(0.5).setDepth(101);
        this.add.text(this.cameras.main.centerX, 350, `Final Score: ${this.score}`, { font: '48px monospace', fill: '#fff' }).setOrigin(0.5).setDepth(101);
        this.add.text(this.cameras.main.centerX, 450, `Currency Earned: +${currencyEarned}`, { font: '32px monospace', fill: '#ffd700' }).setOrigin(0.5).setDepth(101);

        const menuBtn = this.add.text(this.cameras.main.centerX, 650, 'RETURN TO MENU', { font: '48px monospace', fill: '#00ff00' })
            .setOrigin(0.5).setDepth(101).setInteractive();

        menuBtn.on('pointerdown', () => {
            this.sound.play('sfx_ui_click');
            this.scene.start('Menu');
        });
    }
}