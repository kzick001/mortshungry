/**
 * MORT'S HUNGRY - GAME CONFIGURATION
 * The central tuning dictionary. All game mechanics, physics, spawning logic, 
 * and economy values must reference this file. NO HARDCODED VALUES IN SCENES.
 */

export const GAME_CONFIG = {
    // ---------------------------------------------------
    // CORE PHYSICS
    // ---------------------------------------------------
    physics: {
        gravityY: 1200,          // Base downward pull for the Arcade Physics world
        terminalVelocity: 1500   // Hard-capped max downward velocity to prevent physics tunneling
    },

    // ---------------------------------------------------
    // PLAYER (MORT) STATS
    // ---------------------------------------------------
    player: {
        baseLives: 3,            // Starting lives per run
        baseSpeed: 600,          // Base horizontal movement speed
        friction: 0.85,          // Deceleration drag when input stops
        hitboxScaleX: 0.85,      // 15% smaller than visual sprite for "Coyote Time" forgiveness
        hitboxScaleY: 0.85,      // 15% smaller than visual sprite for "Coyote Time" forgiveness
        juice: {
            squashY: 0.6,        // Y-scale during hard impact/catch
            stretchX: 1.2,       // X-scale during lateral movement
            tweenDuration: 150,  // ms for squash/stretch recovery
            iFrameDuration: 1500 // Invincibility frames duration in ms
        }
    },

    // ---------------------------------------------------
    // SPAWNING SYSTEM (DIFFICULTY SCALING)
    // ---------------------------------------------------
    spawning: {
        initialRate: 2000,       // Start spawning an item every 2000ms
        minRate: 500,            // Absolute fastest spawn rate (caps difficulty)
        rateDecay: 25,           // How many ms to shave off spawn rate per successful catch
        safeDistanceX: 100       // Minimum X-axis distance between sequential spawns to prevent impossible traps
    },

    // ---------------------------------------------------
    // ITEMS DIRECTORY (Food, Hazards, Power-Ups, Specials)
    // ---------------------------------------------------
    items: {
        // --- FOOD ---
        mango: { 
            type: 'food', weight: 50, points: 10, speedMult: 1.0, 
            behavior: 'linear'
        },
        coconut: { 
            type: 'food', weight: 25, points: 25, speedMult: 1.5, 
            behavior: 'linear'
        },
        papaya: { 
            type: 'food', weight: 15, points: 50, speedMult: 1.0, 
            behavior: 'sine_wave' // Drifts left/right
        },

        // --- HAZARDS ---
        anvil: { 
            type: 'hazard', weight: 5, damage: 1, speedMult: 2.0, 
            behavior: 'linear' 
        },
        trap: { 
            type: 'hazard', weight: 3, damage: 1, speedMult: 0.5, 
            behavior: 'linear', haltDuration: 1500 // Halts X-axis movement
        },
        rotten: { 
            type: 'hazard', weight: 2, damage: 0, speedMult: 1.0, 
            behavior: 'linear', breaksCombo: true // Breaks combo, no life lost
        },

        // --- POWER-UPS ---
        pill: { 
            type: 'powerup', weight: 1, speedMult: 0.5, 
            behavior: 'linear', duration: 10000, effect: 'expand_jaw' // 2x horizontal mouth hitbox
        },
        syringe: { 
            type: 'powerup', weight: 1, speedMult: 0.5, 
            behavior: 'linear', duration: 10000, effect: 'magnet' // Gravity well
        },

        // --- SPECIAL EVENTS ---
        special_star: { 
            type: 'special', weight: 1, speedMult: 0.5, 
            behavior: 'linear', event: 'random_special' // Triggers Frenzy, Protocol, or Foot
        },
        special_foot: { 
            type: 'special', weight: 0, speedMult: 0.5, 
            behavior: 'linear', event: 'clear_hazards' // Clears hazards, +1 life
        }
    },

    // ---------------------------------------------------
    // ECONOMY & UPGRADES
    // ---------------------------------------------------
    economy: {
        currencyConversion: 1,   // 1 Point = 1 Currency at Game Over
        
        upgrades: {
            agility: { 
                tiers: [1000, 3000, 10000], 
                effectValue: 0.10 // +10% horizontal acceleration per tier
            },
            jaw_dislocation: { 
                tiers: [1500, 5000, 15000], 
                effectValue: 0.05 // +5% width per tier
            },
            telekinesis: { 
                tiers: [5000, 12000, 25000], 
                effectValue: 1 // Enables/Strengthens weak permanent gravity well
            }
        },

        cosmetics: {
            goggles: { cost: 5000, asset: 'ui_goggles' },
            crown:   { cost: 20000, asset: 'ui_crown' },
            skull:   { cost: 50000, asset: 'ui_skull' }
        }
    }
};