import { GAME_CONFIG } from '../config.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'mort_idle');

        this.scene = scene;
        this.config = GAME_CONFIG.player;
        
        // Add to scene and enable physics
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        // Core Physics Setup
        this.body.setCollideWorldBounds(true);
        this.body.setAllowGravity(false); // Mort is locked to the floor, no gravity
        this.body.setImmovable(true);     // Falling items shouldn't push him down

        // Hitbox Forgiveness ("Coyote Time" - 15% reduction from config)
        const hitboxWidth = this.width * this.config.hitboxScaleX;
        const hitboxHeight = this.height * this.config.hitboxScaleY;
        this.body.setSize(hitboxWidth, hitboxHeight);
        
        // Center the new smaller hitbox
        this.body.setOffset(
            (this.width - hitboxWidth) / 2, 
            (this.height - hitboxHeight) / 2
        );

        // Movement friction (Drag)
        this.body.setDragX(this.config.baseSpeed * this.config.friction);

        // Input mapping
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.keys = this.scene.input.keyboard.addKeys('A,D');

        // State variables
        this.isInvulnerable = false;
        this.currentSpeed = this.config.baseSpeed;
    }

    update(time, delta) {
        this.handleInput();
    }

    handleInput() {
        let moving = false;

        // Keyboard Input
        if (this.cursors.left.isDown || this.keys.A.isDown) {
            this.body.setVelocityX(-this.currentSpeed);
            this.setFlipX(true); // Face left
            moving = true;
        } else if (this.cursors.right.isDown || this.keys.D.isDown) {
            this.body.setVelocityX(this.currentSpeed);
            this.setFlipX(false); // Face right
            moving = true;
        }

        // Touch / Pointer Input (Mobile support)
        if (this.scene.input.activePointer.isDown) {
            const pointerX = this.scene.input.activePointer.x;
            // Add a small deadzone so he doesn't jitter when directly under the finger
            if (Math.abs(pointerX - this.x) > 10) { 
                if (pointerX < this.x) {
                    this.body.setVelocityX(-this.currentSpeed);
                    this.setFlipX(true);
                } else {
                    this.body.setVelocityX(this.currentSpeed);
                    this.setFlipX(false);
                }
                moving = true;
            }
        }

        // Return to idle texture if not catching/hurt
        if (!this.scene.tweens.isTweening(this) && this.texture.key !== 'mort_hurt') {
            this.setTexture('mort_idle');
        }
    }

    /**
     * Called when Mort successfully catches a food item.
     * Triggers the squash & stretch juice and mouth-open texture.
     */
    playCatchJuice() {
        this.setTexture('mort_catch');
        
        // Stop any existing scale tweens to prevent distortion bugs
        this.scene.tweens.killTweensOf(this, 'scaleX');
        this.scene.tweens.killTweensOf(this, 'scaleY');
        this.setScale(1);

        this.scene.tweens.add({
            targets: this,
            scaleX: this.config.juice.stretchX,
            scaleY: this.config.juice.squashY,
            duration: this.config.juice.tweenDuration,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
    }

    /**
     * Called when Mort hits a hazard.
     * Triggers dizzy texture, iFrames, and blinking effect.
     */
    takeDamage() {
        if (this.isInvulnerable) return false; // Prevent multi-hits

        this.isInvulnerable = true;
        this.setTexture('mort_hurt');

        // iFrame Blinking Tween
        this.scene.tweens.add({
            targets: this,
            alpha: 0.3,
            duration: 150,
            yoyo: true,
            repeat: Math.floor(this.config.juice.iFrameDuration / 300), // Blink for the iFrame duration
            onComplete: () => {
                this.isInvulnerable = false;
                this.alpha = 1;
                this.setTexture('mort_idle');
            }
        });

        return true; // Successfully took damage
    }
}