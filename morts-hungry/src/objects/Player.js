import { GAME_CONFIG } from '../config.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'mort_idle');

        this.scene = scene;
        this.config = GAME_CONFIG.player;
        
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        // --- v1.2 Visual Scaling ---
        this.setScale(this.config.displayScale || 1);

        this.body.setCollideWorldBounds(true);
        this.body.setAllowGravity(false);
        this.body.setImmovable(true);

        const hitboxWidth = this.width * this.config.hitboxScaleX;
        const hitboxHeight = this.height * this.config.hitboxScaleY;
        this.body.setSize(hitboxWidth, hitboxHeight);
        this.body.setOffset((this.width - hitboxWidth) / 2, (this.height - hitboxHeight) / 2);

        this.body.setDragX(this.config.baseSpeed * this.config.friction);
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.keys = this.scene.input.keyboard.addKeys('A,D');
        this.isInvulnerable = false;
        this.currentSpeed = this.config.baseSpeed;

        this.powerUpBar = this.scene.add.graphics();
        this.powerUpBar.setDepth(this.depth + 1);
        this.powerUpTween = null;
    }

    update(time, delta) {
        this.handleInput();
        if (this.powerUpBar) {
            this.powerUpBar.setPosition(this.x, this.y + (this.displayHeight / 2) + 10);
        }
    }

    handleInput() {
        let moving = false;
        if (this.cursors.left.isDown || this.keys.A.isDown) {
            this.body.setVelocityX(-this.currentSpeed);
            this.setFlipX(true);
            moving = true;
        } else if (this.cursors.right.isDown || this.keys.D.isDown) {
            this.body.setVelocityX(this.currentSpeed);
            this.setFlipX(false);
            moving = true;
        }

        if (this.scene.input.activePointer.isDown) {
            const pointerX = this.scene.input.activePointer.x;
            const screenCenter = this.scene.cameras.main.centerX;
            if (Math.abs(pointerX - screenCenter) > 5) { 
                if (pointerX < screenCenter) {
                    this.body.setVelocityX(-this.currentSpeed);
                    this.setFlipX(true);
                } else {
                    this.body.setVelocityX(this.currentSpeed);
                    this.setFlipX(false);
                }
                moving = true;
            }
        }

        if (!this.scene.tweens.isTweening(this) && this.texture.key !== 'mort_hurt') {
            this.setTexture('mort_idle');
        }
    }

    playCatchJuice() {
        this.setTexture('mort_catch');
        this.scene.tweens.killTweensOf(this, 'scaleX');
        this.scene.tweens.killTweensOf(this, 'scaleY');
        this.setScale(this.config.displayScale); // Reset to base scale

        this.scene.tweens.add({
            targets: this,
            scaleX: this.config.displayScale * this.config.juice.stretchX,
            scaleY: this.config.displayScale * this.config.juice.squashY,
            duration: this.config.juice.tweenDuration,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
    }

    takeDamage() {
        if (this.isInvulnerable) return false;
        this.isInvulnerable = true;
        this.setTexture('mort_hurt');
        this.scene.tweens.add({
            targets: this,
            alpha: 0.3,
            duration: 150,
            yoyo: true,
            repeat: Math.floor(this.config.juice.iFrameDuration / 300),
            onComplete: () => {
                this.isInvulnerable = false;
                this.alpha = 1;
                this.setTexture('mort_idle');
            }
        });
        return true;
    }

    startPowerUpTimer(duration, color) {
        if (this.powerUpTween) this.powerUpTween.stop();
        this.powerUpBar.clear();
        this.powerUpBar.fillStyle(color, 1);
        this.powerUpBar.fillRect(-40, 0, 80, 10); 
        this.powerUpBar.setScale(1, 1);
        this.powerUpBar.setAlpha(1);

        this.powerUpTween = this.scene.tweens.add({
            targets: this.powerUpBar,
            scaleX: 0,
            duration: duration,
            ease: 'Linear',
            onComplete: () => { this.powerUpBar.setAlpha(0); }
        });
    }

    destroy(fromScene) {
        if (this.powerUpBar) this.powerUpBar.destroy();
        super.destroy(fromScene);
    }
}
