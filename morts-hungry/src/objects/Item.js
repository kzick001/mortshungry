import { GAME_CONFIG } from '../config.js';

export default class Item extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, itemKey) {
        // 1. Determine the correct texture prefix based on the item type
        const config = GAME_CONFIG.items[itemKey];
        let texturePrefix = 'item_';
        if (config.type === 'hazard') texturePrefix = 'hazard_';
        if (config.type === 'powerup') texturePrefix = 'power_';
        if (config.type === 'special') texturePrefix = 'special_';
        
        // 2. Initialize the Sprite
        super(scene, x, y, texturePrefix + itemKey);

        this.scene = scene;
        this.itemKey = itemKey;
        this.itemConfig = config;
        
        // 3. Add to scene and enable physics
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        // --- v1.2 Visual Scaling ---
        this.setScale(config.displayScale || 1);

        // 4. State tracking variables
        this.startX = x;
        this.hasHitFloor = false;
        
        // 5. Setup physics properties
        this.applyPhysics();
        
    } // <--- THE CRITICAL FIX: The constructor strictly ends right here!

    applyPhysics() {
        // Enforce terminal velocity to prevent items from passing through the floor
        this.body.setMaxVelocity(2000, GAME_CONFIG.physics.terminalVelocity);
        
        // Calculate dynamic gravity based on the item's speed multiplier
        const baseGravity = GAME_CONFIG.physics.gravityY;
        const extraGravity = baseGravity * (this.itemConfig.speedMult - 1);
        this.body.setGravityY(extraGravity);
    }

    update(time, delta) {
        // Stop calculating sine waves if it's already splattered on the ground
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
        // Positioned slightly lower so it looks like it pooled under the item
        const splatter = this.scene.add.sprite(this.x, this.y + (this.height * 0.25 * this.scaleY), 'vfx_splatter');
        splatter.setScale(this.scaleX);
        splatter.setDepth(this.depth - 1);
        
        // 3. Visual Polish: Dull brown tint to show it's "dead/ruined"
        this.setTint(0x8b4513); 

        // 4. Fade out both the item and the splatter over 1.5 seconds (1500ms)
        this.scene.tweens.add({
            targets: [this, splatter],
            alpha: 0,
            duration: 1500,
            ease: 'Linear',
            onComplete: () => {
                splatter.destroy();
                this.destroy(); // Safely remove the item from memory
            }
        });
    }
}
