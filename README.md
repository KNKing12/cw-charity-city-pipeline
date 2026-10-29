# Charity: water Game Prototype

In this project, you’ll begin transforming your game concept from last week into a working interactive prototype using HTML, CSS, and JavaScript.

This first version should focus on core functionality — clickable elements, score tracking, and a basic layout. The goal is to bring your idea to life with simple, working mechanics that you’ll refine and expand in the next milestone.

Each level supplies new pipe pieces until water reaches Charity City, the flow is blocked, or every open board space is filled.

Pipe segments are drawn from their directional connections, and obstacle sprites are stored under `img/obstacles/`. Each level places one obstacle per level from level 2 onward; each obstacle blocks one board cell while its sprite scales to fit. Home and game backgrounds stay fixed inside a 7px viewport inset and stretch to fill it on all screen sizes, preserving the yellow 7px frame on every side.

The 21 levels are grouped by difficulty: levels 1–7 are The Pool (easy), levels 8–14 are The Spring (medium), and levels 15–21 are The Well (hard).
