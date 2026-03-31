import { GAME_CONFIG } from '../config.js';

export default class Menu extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    create() {
        // Load background
        this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'bg_jungle').setOrigin(0.5);

        // Load Save Data
        this.saveData = JSON.parse(localStorage.getItem('morts_hungry_save'));

        // Display High Score & Currency
        this.highScoreText = this.add.text(20, 20, `High Score: ${this.saveData.highScore}`, { 
            font: '32px monospace', fill: '#ffffff', stroke: '#000000', strokeThickness: 4 
        });
        this.currencyText = this.add.text(20, 60, `Currency: ${this.saveData.totalCurrency}`, { 
            font: '32px monospace', fill: '#ffd700', stroke: '#000000', strokeThickness: 4 
        });

        // Play Button
        const playButton = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, 'PLAY GAME', { 
            font: '64px monospace', fill: '#00ff00', stroke: '#000000', strokeThickness: 6 
        }).setOrigin(0.5).setInteractive();

        playButton.on('pointerdown', () => {
            this.sound.play('sfx_ui_click');
            this.scene.start('Game');
        });

        // Shop Button
        const shopButton = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 50, 'OPEN SHOP', { 
            font: '48px monospace', fill: '#ffffff', stroke: '#000000', strokeThickness: 5 
        }).setOrigin(0.5).setInteractive();

        shopButton.on('pointerdown', () => {
            this.sound.play('sfx_ui_click');
            this.shopContainer.setVisible(true);
        });

        this.buildShopOverlay();
    }

    buildShopOverlay() {
        // Container to hold all shop elements
        this.shopContainer = this.add.container(0, 0);
        this.shopContainer.setVisible(false);
        this.shopContainer.setDepth(100); // Ensure it renders on top

        // Dark semi-transparent background overlay
        const bgDim = this.add.graphics();
        bgDim.fillStyle(0x000000, 0.85);
        bgDim.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        // Block clicks from passing through to the menu
        bgDim.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.cameras.main.width, this.cameras.main.height), Phaser.Geom.Rectangle.Contains);
        this.shopContainer.add(bgDim);

        // Shop Title
        const shopTitle = this.add.text(this.cameras.main.centerX, 100, 'THE SHOP', { 
            font: '48px monospace', fill: '#ffd700' 
        }).setOrigin(0.5);
        this.shopContainer.add(shopTitle);

        // Close Button
        const closeBtn = this.add.text(this.cameras.main.width - 50, 50, 'X', { 
            font: '48px monospace', fill: '#ff0000' 
        }).setOrigin(0.5).setInteractive();
        
        closeBtn.on('pointerdown', () => {
            this.sound.play('sfx_ui_click');
            this.shopContainer.setVisible(false);
        });
        this.shopContainer.add(closeBtn);

        // Dynamically Generate Upgrade Buttons
        let startY = 200;
        const upgrades = GAME_CONFIG.economy.upgrades;
        
        for (const [key, upgradeData] of Object.entries(upgrades)) {
            const currentTier = this.saveData.unlockedUpgrades[key] || 0;
            const maxTier = upgradeData.tiers.length;
            const isMaxed = currentTier >= maxTier;
            const cost = isMaxed ? 'MAX' : upgradeData.tiers[currentTier];
            
            const btnText = `${key.toUpperCase()} (T${currentTier}/${maxTier}) - Cost: ${cost}`;
            const color = isMaxed ? '#888888' : '#ffffff';

            const btn = this.add.text(this.cameras.main.centerX, startY, btnText, { 
                font: '24px monospace', fill: color 
            }).setOrigin(0.5);

            if (!isMaxed) {
                btn.setInteractive();
                btn.on('pointerdown', () => this.handlePurchase('upgrade', key, cost, btn, upgradeData));
            }

            this.shopContainer.add(btn);
            startY += 60;
        }

        startY += 40; // Spacing before cosmetics
        const cosmeticsTitle = this.add.text(this.cameras.main.centerX, startY, 'COSMETICS', { 
            font: '32px monospace', fill: '#ffd700' 
        }).setOrigin(0.5);
        this.shopContainer.add(cosmeticsTitle);
        startY += 60;

        // Dynamically Generate Cosmetic Buttons
        const cosmetics = GAME_CONFIG.economy.cosmetics;

        for (const [key, cosmeticData] of Object.entries(cosmetics)) {
            const isOwned = this.saveData.unlockedCosmetics.includes(key);
            const cost = isOwned ? 'OWNED' : cosmeticData.cost;
            const color = isOwned ? '#00ff00' : '#ffffff';

            const btnText = `${key.toUpperCase()} - Cost: ${cost}`;
            
            const btn = this.add.text(this.cameras.main.centerX, startY, btnText, { 
                font: '24px monospace', fill: color 
            }).setOrigin(0.5);

            if (!isOwned) {
                btn.setInteractive();
                btn.on('pointerdown', () => this.handlePurchase('cosmetic', key, cost, btn, cosmeticData));
            }

            this.shopContainer.add(btn);
            startY += 60;
        }
    }

    handlePurchase(type, key, cost, btnElement, configData) {
        if (this.saveData.totalCurrency >= cost) {
            // Deduct currency
            this.saveData.totalCurrency -= cost;
            this.sound.play('sfx_ui_click');

            if (type === 'upgrade') {
                this.saveData.unlockedUpgrades[key]++;
                const currentTier = this.saveData.unlockedUpgrades[key];
                const maxTier = configData.tiers.length;
                const isMaxed = currentTier >= maxTier;
                const newCost = isMaxed ? 'MAX' : configData.tiers[currentTier];
                
                btnElement.setText(`${key.toUpperCase()} (T${currentTier}/${maxTier}) - Cost: ${newCost}`);
                if (isMaxed) {
                    btnElement.setColor('#888888');
                    btnElement.disableInteractive();
                }
            } else if (type === 'cosmetic') {
                this.saveData.unlockedCosmetics.push(key);
                btnElement.setText(`${key.toUpperCase()} - Cost: OWNED`);
                btnElement.setColor('#00ff00');
                btnElement.disableInteractive();
            }

            // Update UI and Save
            this.currencyText.setText(`Currency: ${this.saveData.totalCurrency}`);
            localStorage.setItem('morts_hungry_save', JSON.stringify(this.saveData));
        } else {
            // Visual feedback for insufficient funds (shake button slightly)
            this.tweens.add({
                targets: btnElement,
                x: btnElement.x + 10,
                duration: 50,
                yoyo: true,
                repeat: 3
            });
        }
    }
}