import { GAME_CONFIG } from '../config.js';

export default class Item extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, itemKey) {
        const config = GAME_CONFIG.items[itemKey];
        let texturePrefix = 'item_';
        if (config.type === 'hazard') texturePrefix = 'hazard_';
        if (config.type === 'powerup') texturePrefix = 'power_';
        if (config.type === 'special') texturePrefix = 'special_';
        
        super(scene, x, y, texturePrefix + itemKey);

        this.scene = scene;
        this.itemKey = itemKey;
        this.itemConfig = config;
        
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        // --- v1.2 Visual Scaling ---
        this.setScale(config.displayScale || 1);

        this.startX = x;
        this.hasHitFloor = false;
        this.applyPhysics();
    }

    applyPhysics() {
        this.body.setMaxVelocity(2000, GAME_CONFIG.physics.terminalVelocity);
        const baseGravity = GAME_CONFIG.physics.gravityY;
        const extraGravity = baseGravity * (this.itemConfig.speedMult - 1);
        this.body.setGravityY(extraGravity);
    }

    update(time, delta) {
        if (this.hasHitFloor) return;
        if (this.itemConfig.behavior === 'sine_wave') {
            this.x = this.startX + Math.sin(time / 300) * 100;
        }
    }

    hitFloor() {
        if (this.hasHitFloor) return;
        this.hasHitFloor = true;
        this.body.setAllowGravity(false);
        this.body.setVelocity(0, 0);
        this.body.setImmovable(true);
        const splatter = this.scene.add.sprite(this.x, this.y + (this.height * 0.25 * this.scaleY), 'vfx_splatter');
        splatter.setScale(this.scaleX);
        splatter.setDepth(this.depth - 1);
        this.setTint(0x8b4513); 
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
