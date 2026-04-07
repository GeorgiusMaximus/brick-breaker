# Neon Brick Breaker

A modern, neon-styled brick breaker game with cyberpunk aesthetics. Built with vanilla JavaScript, HTML5 Canvas, and CSS.

## Features

- **5 Levels** with increasing difficulty and different brick types
- **Power-ups**: Multiball, Wide Paddle, Slow Motion, Extra Life, Fireball
- **Visual Effects**: Ball trails, screen shake, particle explosions
- **Settings**: Customize difficulty, paddle/ball speed, sound, and more
- **Responsive Design**: Play on desktop, tablet, or mobile
- **Touch Controls**: On-screen buttons for mobile devices
- **Sound Effects**: Synthesized audio feedback

## Controls

### Desktop
- **Mouse**: Move paddle left/right
- **Arrow Keys**: Move paddle left/right
- **Space**: Launch ball
- **P**: Pause game
- **R**: Restart game

### Mobile
- **Touch Buttons**: Use on-screen left/right buttons to move paddle
- **Tap Canvas**: Launch ball

## How to Play

1. Open `index.html` in a web browser
2. Click **START GAME** to begin
3. Move the paddle to keep the ball in play
4. Break all bricks to complete the level
5. Collect power-ups for special abilities
6. Don't lose all your lives!

## Power-ups

| Power-up | Color | Effect |
|----------|-------|--------|
| **M** (Multiball) | Cyan | Splits balls into three |
| **W** (Wide) | Purple | Expands paddle size |
| **S** (Slow) | Blue | Slows ball speed |
| **L** (Life) | Magenta | Adds an extra life |
| **F** (Fire) | Orange | Ball destroys bricks instantly |

## Settings

- **Difficulty**: Easy / Normal / Hard
- **Paddle Speed**: Adjust paddle movement speed
- **Ball Speed**: Adjust ball movement speed
- **Starting Lives**: 1-5 lives at game start
- **Sound Effects**: Toggle audio on/off
- **Sound Volume**: Adjust volume (0-100%)
- **Ball Trail**: Toggle ball trail effect
- **Screen Shake**: Toggle screen shake on impacts
- **Show FPS**: Display frames per second
- **Touch Controls**: Toggle on-screen buttons
- **Auto-Launch**: Ball auto-launches on level start

Settings are saved to localStorage and persist between sessions.

## Files

- `index.html` - Game structure and UI
- `style.css` - Neon styling and responsive design
- `script.js` - Game logic, physics, and audio

## Browser Support

Works in all modern browsers that support HTML5 Canvas:
- Chrome
- Firefox
- Safari
- Edge

## License

MIT License
