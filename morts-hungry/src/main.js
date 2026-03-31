import { GAME_CONFIG } from './config.js';
import Boot from './scenes/Boot.js';
import Menu from './scenes/Menu.js';
import Game from './scenes/Game.js';

// Core Phaser Configuration
const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    parent: 'game-container', // Ties to the div we will create in index.html
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            // Pull the base world gravity from our central Source of Truth
            gravity: { y: GAME_CONFIG.physics.gravityY },
            debug: false // Set to true if you ever need to see the custom hitboxes
        }
    },
    // The Boot scene is listed first, so it auto-starts, loads assets, then routes to Menu
    scene: [Boot, Menu, Game]
};

// Initialize the Game
const game = new Phaser.Game(config);