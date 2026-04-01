export default class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    init() {
        // Initialize localStorage for save data if it doesn't exist
        const saveKey = 'morts_hungry_save';
        if (!localStorage.getItem(saveKey)) {
            const defaultSave = {
                highScore: 0,
                totalCurrency: 0,
                unlockedUpgrades: {
                    agility: 0,
                    jaw_dislocation: 0,
                    telekinesis: 0
                },
                unlockedCosmetics: []
            };
            localStorage.setItem(saveKey, JSON.stringify(defaultSave));
        }
    }

    preload() {
        // Display Loading Progress Bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: { font: '20px monospace', fill: '#ffffff' }
        });
        loadingText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // ---------------------------------------------------
        // FALLBACK GENERATOR (v1.1 Hotfix)
        // ---------------------------------------------------
        this.load.on('loaderror', (file) => {
            console.warn(`Asset failed to load: ${file.key}. Generating fallback texture.`);
            
            // Dynamically generate a Phaser.Textures.CanvasTexture as a fallback
            const texture = this.textures.createCanvas(file.key, 128, 128);
            if (texture) {
                const ctx = texture.getContext();
                
                // Fill the canvas with a bright, noticeable color (hot pink)
                ctx.fillStyle = '#FF69B4'; 
                ctx.fillRect(0, 0, 128, 128);
                
                // Draw the missing file.key text onto it
                ctx.fillStyle = '#000000';
                ctx.font = '16px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Wrap or truncate text if it's too long, simple split for visibility
                ctx.fillText(file.key, 64, 64);
                
                // Update the WebGL texture
                texture.refresh();
            }
        });

        // Load Player Animations (Texture Swaps)
        this.load.image('mort_idle', 'assets/images/mort_idle.png');
        this.load.image('mort_catch', 'assets/images/mort_catch.png');
        this.load.image('mort_hurt', 'assets/images/mort_hurt.png');

        // Load Food Items
        this.load.image('item_mango', 'assets/images/item_mango.png');
        this.load.image('item_coconut', 'assets/images/item_coconut.png');
        this.load.image('item_papaya', 'assets/images/item_papaya.png');

        // Load Hazards
        this.load.image('hazard_anvil', 'assets/images/hazard_anvil.png');
        this.load.image('hazard_trap', 'assets/images/hazard_trap.png');
        this.load.image('hazard_rotten', 'assets/images/hazard_rotten.png');

        // Load Power-Ups & Specials
        this.load.image('power_pill', 'assets/images/power_pill.png');
        this.load.image('power_syringe', 'assets/images/power_syringe.png');
        this.load.image('special_star', 'assets/images/special_star.png');
        this.load.image('special_foot', 'assets/images/special_foot.png');

        // Load Environment
        this.load.image('bg_jungle', 'assets/images/bg_jungle.png');
        this.load.image('bg_neon', 'assets/images/bg_neon.png');
        this.load.image('bg_dark', 'assets/images/bg_dark.png');
        this.load.image('env_floor', 'assets/images/env_floor.png');

        // Load VFX & UI Elements
        this.load.image('vfx_splatter', 'assets/images/vfx_splatter.png');
        this.load.image('vfx_dust', 'assets/images/vfx_dust.png');
        this.load.image('vfx_fire', 'assets/images/vfx_fire.png');
        this.load.image('ui_telegraph', 'assets/images/ui_telegraph.png');
        this.load.image('ui_goggles', 'assets/images/ui_goggles.png');
        this.load.image('ui_crown', 'assets/images/ui_crown.png');
        this.load.image('ui_skull', 'assets/images/ui_skull.png');

        // Load Audio - SWAPPED TO .WAV FOR DEVELOPMENT
        this.load.audio('bgm_jungle_loop', 'assets/audio/bgm_jungle_loop.wav'); 
        this.load.audio('sfx_gulp', 'assets/audio/sfx_gulp.wav');
        this.load.audio('sfx_crunch', 'assets/audio/sfx_crunch.wav');
        this.load.audio('sfx_clang', 'assets/audio/sfx_clang.wav');
        this.load.audio('sfx_splat', 'assets/audio/sfx_splat.wav');
        this.load.audio('sfx_powerup', 'assets/audio/sfx_powerup.wav');
        this.load.audio('sfx_hurt', 'assets/audio/sfx_hurt.wav');
        this.load.audio('sfx_ui_click', 'assets/audio/sfx_ui_click.wav');
    }

    create() {
        // Transition directly to the Menu scene upon completion
        this.scene.start('Menu');
    }
}
