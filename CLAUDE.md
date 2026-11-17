# Dirty Dog — notes for Claude

Static site in `src/` (plain HTML/CSS/JS, no build step, no framework). Dev server: `npm start` → http://localhost:5173.
Hosting target: Azure Static Web Apps, deployed from GitHub on push to `main`, app_location `/src`. Same setup as the sibling project `../apophenia`.

Game rules as the owner plays them
- 15 hands: 8,7,6,5,4,3,2,1,2,3,4,5,6,7,8 cards. 3–6 players (default 4; 6 is the 52-card limit at 8 cards).
- Exact bid: 10 + tricks. Miss: tricks − 10.
- Deal rotates left; bidding starts left of the dealer.

Conventions
- Game state lives in localStorage key `dirtydog:game` (`v: 1`). Bump `v` if the shape changes.
- Keep it dependency-free in the browser; fonts from Google Fonts only.
- The owner is learning VS Code, git, GitHub and Azure: explain those steps plainly when they come up.
