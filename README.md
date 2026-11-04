# Charity: water Game Prototype

In this project, you’ll begin transforming your game concept from last week into a working interactive prototype using HTML, CSS, and JavaScript.

This first version should focus on core functionality — clickable elements, score tracking, and a basic layout. The goal is to bring your idea to life with simple, working mechanics that you’ll refine and expand in the next milestone.

Each level supplies new pipe pieces until water reaches Charity City, the flow is blocked, or every open board space is filled. Pipe pieces use the corrected dry and flowing floral images in `img/Floral_Pipes_Corrected/`.

Tee and cross pieces have separate limits per level: each type is limited to none at level 1, up to 2 at level 2, and up to 3 at levels 3–4. Each limit increases by 1 every 2 levels (4 at levels 5–6, 5 at levels 7–8, and so on), capped at 14; level 21 allows up to 12 of each type. Once a type reaches its limit, that type is no longer supplied, but the other can still appear until it reaches its own limit. No more than 3 identical pipe types are supplied in a row. Moving or rotating a piece does not use another allowance, and resuming a saved game retains the count of placed pieces.

Pipe connections and rotation are controlled by the game code, and obstacle sprites are stored under `img/obstacles/`. Each level places one obstacle per level from level 2 onward; each obstacle blocks one board cell while its sprite scales to fit. Home and game backgrounds stay fixed inside a 7px viewport inset and stretch to fill it on all screen sizes, preserving the yellow 7px frame on every side.

Only audio files from `Sound FX/` are played. The `long.mp3` track loops on the home screen and during gameplay at 50% volume; it only pauses when sound is muted in the menu, and resumes when sound is turned back on. Sound effects play at 75% volume: `game_start.mp3` when entering or continuing a game, `switch.mp3` when rotating the next pipe in its preview box, and `pipe.wav` each time a pipe piece is placed. After a successful level, its group's sound plays after the placement sound: `pool.mp3` for levels 1–7, `spring.mp3` for levels 8–14, or `well.mp3` for levels 15–21. The `quick.mp3` clip plays before the group sound when a timed level is completed with more than 30 seconds remaining in The Pool, 40 seconds in The Spring, or 50 seconds in The Well.

The 21 levels are grouped by difficulty: levels 1–7 are The Pool (easy), levels 8–14 are The Spring (medium), and levels 15–21 are The Well (hard).

Group-completion screens use the images extracted from `img/Charity_City_3_Transition_Screens.zip` into `img/transition_screens/`: `the_pool_complete.png` after level 7 (before level 8), `the_spring_complete.png` after level 14 (before level 15), and `the_well_complete.png` after level 21. Once the image loads, it fades in for 1 second, stays visible for 2 seconds, and fades out for 1 second, without cropping. Levels 8 and 15 then start automatically; after level 21, the final score and save/share buttons appear. The illustrated banners are not interactive buttons. With reduced motion enabled, the image stays visible for the same 4 seconds without fading.

Each seven-level group uses one full-board background from `img/group_backgrounds/`: The Pool, The Spring, and The Well. Board cells stay transparent so the background remains visible, with grid lines, pipes, and obstacles rendered above it.
