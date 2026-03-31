import { GAME_CONFIG } from '../config.js';

export default class Item extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, itemKey) {
        // Find the specific item configuration from our central dictionary
        const config = GAME_CONFIG.items[itemKey];
        
        // Use the itemKey directly as the texture string (e.g., 'mango', 'papaya', 'anvil')
        // Assuming textures are loaded as 'item_mango', 'hazard_anvil', etc. based on the doc.
        // We will construct the expected texture key based on the type.
        let texturePrefix = 'item_';
        if (config.type === 'hazard') texturePrefix = 'hazard_';
        if (config.type === 'powerup') texturePrefix = 'power_';
        if (config.type === 'special') texturePrefix = 'special_';
        
        super(scene, x, y, texturePrefix + itemKey);

        this.scene = scene;
        this.itemKey = itemKey;
        this.itemConfig = config;
        
        // Add to scene and enable Arcade Physics
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        // Store original X for sine wave calculations
        this.startX = x;
        this.hasHitFloor = false;

        this.applyPhysics();
    }

    applyPhysics() {
        // Enforce the strict terminal velocity from config to prevent tunneling
        this.body.setMaxVelocity(2000, GAME_CONFIG.physics.terminalVelocity);

        // Adjust gravity based on the item's specific speed multiplier.
        // Arcade physics adds body gravity to the world gravity.
        // If speedMult is 1.5, we add 50% of the world's base gravity to this specific body.
        const baseGravity = GAME_CONFIG.physics.gravityY;
        const extraGravity = baseGravity * (this.itemConfig.speedMult - 1);
        this.body.setGravityY(extraGravity);
    }

    update(time, delta) {
        if (this.hasHitFloor) return;

        // Implement the Papaya's drift (or any future item with sine_wave behavior)
        if (this.itemConfig.behavior === 'sine_wave') {
            // time / 300 controls the speed of the oscillation
            // * 100 controls the pixel width of the drift
            this.x = this.startX + Math.sin(time / 300) * 100;
        }
    }

    hitFloor() {
        if (this.hasHitFloor) return;
        this.hasHitFloor = true;

        // 1. Freeze physics so it stays exactly where it landed
        this.body.setAllowGravity(false);
        this.body.setVelocity(0, 0);
        this.body.setImmovable(true);

        // 2. Visual Polish: Splatter effect (Juice)
        // Create a temporary splatter sprite behind the item
        const splatter = this.scene.add.sprite(this.x, this.y + (this.height * 0.25), 'vfx_splatter');
        splatter.setDepth(this.depth - 1);
        
        // 3. Visual Polish: Dull red/brown tint to show it's "dead/ruined"
        this.setTint(0x8b4513); 

        // 4. Fade out both the item and the splatter over 1.5 seconds (1500ms)
        this.scene.tweens.add({
            targets: [this, splatter],
            alpha: 0,
            duration: 1500,
            ease: 'Linear',
            onComplete: () => {
                splatter.destroy();
                this.destroy();
            }
        });
    }
}