/**
 * MORT'S HUNGRY - GAME CONFIGURATION (v1.2)
 * Centralized tuning for physics, spawning, economy, and visual scaling.
 */

export const GAME_CONFIG = {
    physics: {
        gravityY: 1200,
        terminalVelocity: 1500
    },

    player: {
        baseLives: 3,
        baseSpeed: 600,
        friction: 0.85,
        displayScale: 1,      // Visual size (50% of source PNG)
        hitboxScaleX: 0.85,     // Physics hitbox (relative to scaled sprite)
        hitboxScaleY: 0.85,
        juice: {
            squashY: 0.6,
            stretchX: 1.2,
            tweenDuration: 150,
            iFrameDuration: 1500
        }
    },

    spawning: {
        initialRate: 2000,
        minRate: 500,
        rateDecay: 25,
        safeDistanceX: 100
    },

    items: {
        mango: { 
            type: 'food', weight: 50, points: 10, speedMult: 1.0, 
            behavior: 'linear', displayScale: 1 
        },
        coconut: { 
            type: 'food', weight: 25, points: 25, speedMult: 1.5, 
            behavior: 'linear', displayScale: 1 
        },
        papaya: { 
            type: 'food', weight: 15, points: 50, speedMult: 1.0, 
            behavior: 'sine_wave', displayScale: 1 
        },
        anvil: { 
            type: 'hazard', weight: 5, damage: 1, speedMult: 2.0, 
            behavior: 'linear', displayScale: 1 
        },
        trap: { 
            type: 'hazard', weight: 3, damage: 1, speedMult: 0.5, 
            behavior: 'linear', haltDuration: 1500, displayScale: 1 
        },
        rotten: { 
            type: 'hazard', weight: 2, damage: 0, speedMult: 1.0, 
            behavior: 'linear', breaksCombo: true, displayScale: 1 
        },
        pill: { 
            type: 'powerup', weight: 1, speedMult: 0.5, 
            behavior: 'linear', duration: 10000, effect: 'expand_jaw', displayScale: 1 
        },
        syringe: { 
            type: 'powerup', weight: 1, speedMult: 0.5, 
            behavior: 'linear', duration: 10000, effect: 'magnet', displayScale: 1 
        },
        special_star: { 
            type: 'special', weight: 1, speedMult: 0.5, 
            behavior: 'linear', event: 'random_special', displayScale: 1 
        },
        special_foot: { 
            type: 'special', weight: 0, speedMult: 0.5, 
            behavior: 'linear', event: 'clear_hazards', displayScale: 1 
        }
    },

    economy: {
        currencyConversion: 1,
        upgrades: {
            agility: { tiers: [1000, 3000, 10000], effectValue: 0.10 },
            jaw_dislocation: { tiers: [1500, 5000, 15000], effectValue: 0.05 },
            telekinesis: { tiers: [5000, 12000, 25000], effectValue: 1 }
        },
        cosmetics: {
            goggles: { cost: 5000, asset: 'ui_goggles' },
            crown:   { cost: 20000, asset: 'ui_crown' },
            skull:   { cost: 50000, asset: 'ui_skull' }
        }
    }
};
