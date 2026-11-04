// Store the routes as row and column pairs so the board stays easy to edit.
const levelRoutes = [
	[[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
	[[2, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 3], [2, 4]],
	[[2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [2, 4]],
	[[2, 0], [1, 0], [1, 1], [2, 1], [2, 2], [2, 3], [2, 4]],
	[[2, 0], [3, 0], [3, 1], [2, 1], [2, 2], [2, 3], [2, 4]],
	[[2, 0], [1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3], [2, 3], [2, 4]],
	[[2, 0], [3, 0], [3, 1], [3, 2], [2, 2], [1, 2], [1, 3], [2, 3], [2, 4]]
];

const directions = {
	N: [-1, 0],
	E: [0, 1],
	S: [1, 0],
	W: [0, -1]
};
const oppositeDirection = { N: 'S', E: 'W', S: 'N', W: 'E' };
const baseConnections = {
	straight: ['N', 'S'],
	elbow: ['N', 'E'],
	tee: ['N', 'E', 'W'],
	cross: ['N', 'E', 'S', 'W']
};
const pipeImageFiles = {
	straight: { dry: 'straight_dry.png', flowing: 'straight_flowing.png' },
	elbow: { dry: 'elbow_dry.png', flowing: 'elbow_flowing.png' },
	tee: { dry: 'tee_dry.png', flowing: 'tee_flowing.png' },
	cross: { dry: 'cross_dry.png', flowing: 'cross_flowing.png' }
};
const pipeImageRotations = {
	straight: 1,
	elbow: 2,
	tee: 2,
	cross: 0
};
const storageKey = 'charity-city-pipeline-save';
const cityEndpointImages = {
	'The Pool': 'img/Tropical Village Fountain Playground.png',
	'The Spring': 'img/spring.png',
	'The Well': 'img/well.png'
};
const boardBackgroundImages = {
	'The Pool': 'img/group_backgrounds/the_pool_background.png',
	'The Spring': 'img/group_backgrounds/the_spring_background.png',
	'The Well': 'img/group_backgrounds/the_well_background.png'
};
const groupCompletionImages = {
	'The Pool': 'img/transition_screens/the_pool_complete.png',
	'The Spring': 'img/transition_screens/the_spring_complete.png',
	'The Well': 'img/transition_screens/the_well_complete.png'
};
const quickSoundThresholds = {
	'The Pool': 30,
	'The Spring': 40,
	'The Well': 50
};
const stageSoundFiles = {
	'The Pool': 'pool.mp3',
	'The Spring': 'spring.mp3',
	'The Well': 'well.mp3'
};
const startPointImage = 'img/start_well.png';
const obstacleImages = [
	'boulder_cluster.png',
	'boulder_small.png',
	'cones_and_blocks.png',
	'construction_barricade.png',
	'exposed_roots.png',
	'fallen_branches.png',
	'fallen_log.png',
	'landslide_large.png',
	'mud_puddle.png',
	'mud_trench.png',
	'pipe_blocked.png',
	'pipe_debris.png',
	'pipe_leak.png',
	'pipe_mossy.png',
	'rocky_water_crossing.png',
	'rubble_low.png',
	'thorn_bush_large.png',
	'thorn_bush_small.png',
	'tree_stump.png',
	'water_puddle.png'
];
const homeScreen = document.querySelector('#home-screen');
const gameScreen = document.querySelector('#game-screen');
const gameBoard = document.querySelector('#game-board');
const overlay = document.querySelector('#game-overlay');
const overlayCard = document.querySelector('#overlay-card');
const overlayTitle = document.querySelector('#overlay-title');
const overlayEyebrow = document.querySelector('#overlay-eyebrow');
const overlayCopy = document.querySelector('#overlay-copy');
const overlayActions = document.querySelector('#overlay-actions');
const overlaySymbol = document.querySelector('#overlay-symbol');
const transitionImage = document.querySelector('#transition-image');
const menuRules = document.querySelector('#menu-rules');
const previewShape = document.querySelector('#preview-shape');
const piecePreviewButton = document.querySelector('#piece-preview-button');
const movePieceButton = document.querySelector('#move-piece-button');
const toast = document.querySelector('#toast');
const boardWrap = document.querySelector('.board-wrap');

let state = null;
let selectedMode = 'timed';
let timerInterval = null;
let toastTimeout = null;
let groupTransitionTimeout = null;
let soundOn = true;
let backgroundAudio = null;
let gameStartAudio = null;
let quickAudio = null;
let pipeAudio = null;
let switchAudio = null;
const stageAudios = {};

function getRoutePositions(level) {
	const boardSize = getBoardSize(level);
	const { sourceRow, cityRow } = getEndpointRows(level);
	const rowOffset = sourceRow - 2;
	const route = levelRoutes[(level - 1) % levelRoutes.length]
		.map(([row, column]) => [row + rowOffset, column]);

	for (let column = 5; column < boardSize - 1; column += 1) {
		route.push([sourceRow, column]);
	}

	const rowStep = Math.sign(cityRow - sourceRow);
	let row = sourceRow;
	while (row !== cityRow) {
		row += rowStep;
		route.push([row, boardSize - 2]);
	}
	route.push([cityRow, boardSize - 1]);
	return route;
}

function getEndpointRows(level) {
	const center = Math.floor(getBoardSize(level) / 2);
	if (level === 1) {
		return { sourceRow: center, cityRow: center };
	}

	// Cycle both endpoints through five rows while keeping them on the board.
	const sourceRow = center + ((level - 1) % 5) - 2;
	let cityRow = center + ((level * 2) % 5) - 2;
	if (cityRow === sourceRow) {
		cityRow = sourceRow < getBoardSize(level) - 1 ? sourceRow + 1 : sourceRow - 1;
	}

	return { sourceRow, cityRow };
}

// Place one obstacle per level, keeping the route and placed pipes clear.
function makeObstacleCells(level, occupiedCells = []) {
	if (level < 2) {
		return [];
	}

	const obstacleCount = level;
	const boardSize = getBoardSize(level);
	const unavailableCells = new Set(occupiedCells);
	getRoutePositions(level).forEach(([row, column]) => unavailableCells.add(row * boardSize + column));
	const availableCells = [];
	for (let cellIndex = 0; cellIndex < boardSize * boardSize; cellIndex += 1) {
		if (!unavailableCells.has(cellIndex)) {
			availableCells.push(cellIndex);
		}
	}

	return Array.from({ length: Math.min(obstacleCount, availableCells.length) }, (_, index) => {
		const placementIndex = Math.floor((index + 1) * availableCells.length / (obstacleCount + 1));
		const cellIndex = availableCells[placementIndex];
		return {
			row: Math.floor(cellIndex / boardSize),
			column: cellIndex % boardSize,
			width: 1,
			height: 1,
			image: obstacleImages[(level + index - 2) % obstacleImages.length]
		};
	});
}

function getObstacleCellIndices(obstacles = state.obstacles, boardSize = state.boardSize) {
	const cells = new Set();

	obstacles.forEach(({ row, column, width, height }) => {
		for (let rowOffset = 0; rowOffset < height; rowOffset += 1) {
			for (let columnOffset = 0; columnOffset < width; columnOffset += 1) {
				cells.add((row + rowOffset) * boardSize + column + columnOffset);
			}
		}
	});

	return cells;
}

function getBranchingPieceLimit(level) {
	if (level === 1) {
		return 0;
	}
	if (level === 2) {
		return 2;
	}
	return Math.min(14, 3 + Math.floor((level - 3) / 2));
}

function makePiece(level, pieceIndex, recentPieceTypes = [], placedPieces = []) {
	const availableTypes = ['straight', 'elbow'];
	const branchingPieceLimit = getBranchingPieceLimit(level);
	const teeCount = placedPieces.filter((piece) => piece && piece.type === 'tee').length;
	const crossCount = placedPieces.filter((piece) => piece && piece.type === 'cross').length;
	if (teeCount < branchingPieceLimit) {
		availableTypes.push('tee');
	}
	if (crossCount < branchingPieceLimit) {
		availableTypes.push('cross');
	}

	const lastThreeTypes = recentPieceTypes.slice(-3);
	const repeatsThreeTimes = lastThreeTypes.length === 3
		&& lastThreeTypes.every((type) => type === lastThreeTypes[0]);
	const nextTypes = repeatsThreeTimes
		? availableTypes.filter((type) => type !== lastThreeTypes[0])
		: availableTypes;

	return {
		id: `level-${level}-piece-${pieceIndex}`,
		type: nextTypes[Math.floor(Math.random() * nextTypes.length)],
		rotation: Math.floor(Math.random() * 4)
	};
}

function getBoardSize(level) {
	return Math.min(7 + (level - 1) * 2, 19);
}

function rotateConnections(connections) {
	const clockwise = { N: 'E', E: 'S', S: 'W', W: 'N' };
	return connections.map((direction) => clockwise[direction]);
}

function getCurrentConnections(piece) {
	let connections = baseConnections[piece.type];

	for (let turn = 0; turn < piece.rotation; turn += 1) {
		connections = rotateConnections(connections);
	}

	return connections;
}

function getPipeImageMarkup(piece, isFlowing = false) {
	const imageFile = pipeImageFiles[piece.type][isFlowing ? 'flowing' : 'dry'];
	const rotation = (piece.rotation + pipeImageRotations[piece.type]) % 4 * 90;
	return `
		<span class="pipe-image-frame" style="--pipe-rotation: ${rotation}deg">
			<img class="pipe-image ${piece.type}" src="img/Floral_Pipes_Corrected/${imageFile}" alt="">
		</span>`;
}

function createNewGame(mode) {
	selectedMode = mode;
	playGameStartSound();
	state = {
		mode,
		level: 1,
		score: 0,
		timeLeft: 120,
		board: [],
		pieceIndex: 0,
		currentPiece: null,
		recentPieceTypes: [],
		pendingPiece: false,
		rewardedPieceIds: [],
		active: true
	};
	startLevel();
}

function startLevel() {
	clearInterval(timerInterval);
	state.boardSize = getBoardSize(state.level);
	state.obstacles = makeObstacleCells(state.level);
	state.board = Array(state.boardSize * state.boardSize).fill(null);
	state.pieceIndex = 0;
	state.recentPieceTypes = [];
	state.currentPiece = makePiece(state.level, state.pieceIndex, state.recentPieceTypes, state.board);
	state.recentPieceTypes.push(state.currentPiece.type);
	state.pendingPiece = false;
	state.timeLeft = getLevelTimeLimit(state.level);
	state.active = true;
	showGame();
	renderGame();
	saveGame();
	startTimer();
}

function saveGame() {
	if (!state || !state.active) {
		return;
	}

	localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadSavedGame() {
	try {
		return JSON.parse(localStorage.getItem(storageKey));
	} catch (error) {
		return null;
	}
}

function showGame() {
	document.body.classList.add('game-active');
	homeScreen.classList.add('hidden');
	gameScreen.classList.remove('hidden');
	playBackgroundMusic();
}

function showHome() {
	clearInterval(timerInterval);
	stopGroupTransition();
	overlay.classList.add('hidden');
	document.body.classList.remove('game-active');
	gameScreen.classList.add('hidden');
	homeScreen.classList.remove('hidden');
	updateHomeActions();
}

function updateHomeActions() {
	const savedGame = loadSavedGame();
	const hasSavedGame = savedGame && savedGame.active;

	document.querySelector('#continue-button').classList.toggle('hidden', !hasSavedGame);
	document.querySelector('#restart-button').classList.toggle('hidden', !hasSavedGame);
	document.querySelector('#start-button').textContent = hasSavedGame ? 'Choose a new game' : 'Start a new game';
}

function renderGame() {
	const levelName = getLevelName(state.level);
	const stage = `${getStageName(state.level)} · ${getStageDifficulty(state.level)} difficulty`;

	document.querySelector('#campaign-label').textContent = stage.toUpperCase();
	document.querySelector('#level-title').innerHTML = `Level ${String(state.level).padStart(2, '0')} <span>·</span> ${levelName}`;
	document.querySelector('#level-value').textContent = `LEVEL ${String(state.level).padStart(2, '0')} / 21`;
	document.querySelector('#score-value').textContent = String(state.score).padStart(4, '0');
	document.querySelector('#timer-label').textContent = state.mode === 'timed' ? 'TIME LEFT' : 'PACE';
	document.querySelector('#timer-value').textContent = state.mode === 'timed' ? formatTime(state.timeLeft) : '∞';
	document.querySelector('#mode-note').textContent = state.mode === 'timed'
		? 'Finish quickly for a time bonus.'
		: 'No clock. Find your own rhythm.';
	document.querySelector('#game-prompt').textContent = state.mode === 'timed'
		? 'Turn the pipe and build a route before time runs out.'
		: 'Turn the pipe and build a route at your own pace.';

	renderBoard();
	renderPreview();
	updatePieceControls();
}

function getLevelName(level) {
	if (level <= 7) {
		return ['Main Street', 'Parkside', 'River Ward', 'East Market', 'Old Town', 'Hill District', 'City Center'][level - 1];
	}
	if (level <= 14) {
		return ['North County', 'Mill Creek', 'Pine Valley', 'Lake District', 'Redstone', 'Cedar County', 'Crossroads'][level - 8];
	}
	return ['High Plains', 'Blue Ridge', 'South Fork', 'Green Valley', 'West Basin', 'Great Lakes', 'Continental Supply Success'][level - 15];
}

function getStageName(level) {
	if (level <= 7) {
		return 'The Pool';
	}
	if (level <= 14) {
		return 'The Spring';
	}
	return 'The Well';
}

function getLevelTimeLimit(level) {
	const stageTimeBonuses = {
		'The Pool': 10,
		'The Spring': 15,
		'The Well': 20
	};
	let timeLimit = 120;

	for (let levelNumber = 2; levelNumber <= level; levelNumber += 1) {
		timeLimit += stageTimeBonuses[getStageName(levelNumber)];
	}

	return timeLimit;
}

function getStageDifficulty(level) {
	if (level <= 7) {
		return 'Easy';
	}
	if (level <= 14) {
		return 'Medium';
	}
	return 'Hard';
}

function renderBoard() {
	const flowingCells = getFlowingCells();
	const boardSize = state.boardSize;
	const { sourceRow, cityRow } = getEndpointRows(state.level);
	const obstaclesByAnchor = new Map((state.obstacles || []).map((obstacle) => {
		return [obstacle.row * boardSize + obstacle.column, obstacle];
	}));
	const obstacleCells = getObstacleCellIndices(state.obstacles || [], boardSize);
	gameBoard.innerHTML = '';
	boardWrap.style.aspectRatio = `${boardSize + 2} / ${boardSize}`;
	boardWrap.style.maxWidth = `${34 * (boardSize + 2) / boardSize}rem`;
	boardWrap.style.gridTemplateColumns = `repeat(${boardSize + 2}, minmax(0, 1fr))`;
	boardWrap.style.gridTemplateRows = `repeat(${boardSize}, minmax(0, 1fr))`;
	gameBoard.style.gridColumn = `2 / span ${boardSize}`;
	gameBoard.style.gridRow = `1 / span ${boardSize}`;
	gameBoard.style.gridTemplateColumns = `repeat(${boardSize}, minmax(0, 1fr))`;
	gameBoard.style.gridTemplateRows = `repeat(${boardSize}, minmax(0, 1fr))`;
	gameBoard.style.backgroundImage = `url("${boardBackgroundImages[getStageName(state.level)]}")`;
	gameBoard.setAttribute('aria-label', `${boardSize} by ${boardSize} pipe grid`);
	document.querySelector('.source-marker .endpoint-image').src = startPointImage;
	document.querySelector('.city-marker .endpoint-image').src = cityEndpointImages[getStageName(state.level)];
	document.querySelector('.source-marker').style.gridRow = `${sourceRow + 1}`;
	document.querySelector('.city-marker').style.gridColumn = `${boardSize + 2}`;
	document.querySelector('.city-marker').style.gridRow = `${cityRow + 1}`;

	for (let cellIndex = 0; cellIndex < state.board.length; cellIndex += 1) {
		const obstacle = obstaclesByAnchor.get(cellIndex);
		if (obstacleCells.has(cellIndex) && !obstacle) {
			continue;
		}

		const piece = state.board[cellIndex];
		const cell = document.createElement('div');
		const row = Math.floor(cellIndex / boardSize);
		const column = cellIndex % boardSize;
		cell.className = 'board-cell';
		cell.dataset.cell = cellIndex;
		cell.style.gridRow = `${row + 1} / span ${obstacle ? obstacle.height : 1}`;
		cell.style.gridColumn = `${column + 1} / span ${obstacle ? obstacle.width : 1}`;
		cell.setAttribute('role', 'gridcell');

		if (obstacle) {
			cell.classList.add('obstacle');
			cell.setAttribute('aria-label', `${obstacle.width} by ${obstacle.height} obstacle at row ${row + 1}, column ${column + 1}`);
			cell.innerHTML = '<span class="obstacle-art" aria-hidden="true"></span>';
			cell.querySelector('.obstacle-art').style.backgroundImage = `url("img/obstacles/${obstacle.image}")`;
		} else if (piece) {
			cell.classList.add('occupied');
			const isFlowing = flowingCells.has(cellIndex);
			if (isFlowing) {
				cell.classList.add('flowing');
			}
			cell.innerHTML = `
				<span class="placed-pipe ${piece.type}" role="img" aria-label="${piece.type} pipe">
					${getPipeImageMarkup(piece, isFlowing)}
				</span>`;
		} else {
			cell.innerHTML = `<button class="place-button" type="button" data-cell="${cellIndex}" aria-label="Place pipe in row ${row + 1}, column ${column + 1}"></button>`;
		}

		gameBoard.append(cell);
	}

}

// Follow only pipes whose openings face each other, beginning at the well.
function getFlowingCells() {
	const flowing = new Set();
	const { sourceRow } = getEndpointRows(state.level);
	const queue = [{ row: sourceRow, column: -1, direction: 'E' }];

	while (queue.length > 0) {
		const current = queue.shift();

		for (const direction of getConnectionsAt(current)) {
			const [rowChange, columnChange] = directions[direction];
			const nextRow = current.row + rowChange;
			const nextColumn = current.column + columnChange;

			if (nextRow < 0 || nextRow >= state.boardSize || nextColumn < 0 || nextColumn >= state.boardSize) {
				continue;
			}

			const nextIndex = nextRow * state.boardSize + nextColumn;
			const nextPiece = state.board[nextIndex];
			if (!nextPiece || !getCurrentConnections(nextPiece).includes(oppositeDirection[direction])) {
				continue;
			}

			if (!flowing.has(nextIndex)) {
				flowing.add(nextIndex);
				queue.push({ row: nextRow, column: nextColumn, piece: nextPiece });
			}
		}
	}

	return flowing;
}

function getConnectionsAt(position) {
	if (position.piece) {
		return getCurrentConnections(position.piece);
	}

	return [position.direction];
}

function hasReachedCity(flowingCells) {
	const { cityRow } = getEndpointRows(state.level);
	const cityIndex = cityRow * state.boardSize + state.boardSize - 1;
	const finalCell = state.board[cityIndex];
	return Boolean(finalCell && flowingCells.has(cityIndex) && getCurrentConnections(finalCell).includes('E'));
}

function hasOpenFlowExit(flowingCells) {
	const { sourceRow } = getEndpointRows(state.level);
	const sourceIndex = sourceRow * state.boardSize;
	const obstacleCells = getObstacleCellIndices();
	const sourcePiece = state.board[sourceIndex];
	if (!sourcePiece && !obstacleCells.has(sourceIndex)) {
		return true;
	}

	for (const cellIndex of flowingCells) {
		const piece = state.board[cellIndex];
		const row = Math.floor(cellIndex / state.boardSize);
		const column = cellIndex % state.boardSize;

		for (const direction of getCurrentConnections(piece)) {
			const [rowChange, columnChange] = directions[direction];
			const nextRow = row + rowChange;
			const nextColumn = column + columnChange;
			if (nextRow < 0 || nextRow >= state.boardSize || nextColumn < 0 || nextColumn >= state.boardSize) {
				continue;
			}

			const nextIndex = nextRow * state.boardSize + nextColumn;
			if (!state.board[nextIndex] && !obstacleCells.has(nextIndex)) {
				return true;
			}
		}
	}

	return false;
}

function hasAvailableBoardCell() {
	const obstacleCells = getObstacleCellIndices();
	return state.board.some((piece, cellIndex) => !piece && !obstacleCells.has(cellIndex));
}

function renderPreview() {
	if (!state.currentPiece) {
		return;
	}

	previewShape.className = 'piece-shape';
	previewShape.innerHTML = getPipeImageMarkup(state.currentPiece);
	const pieceDetails = {
		straight: 'Straight pipe · 12 pts',
		elbow: 'Elbow pipe · 20 pts',
		tee: 'Three-way pipe · 24 pts',
		cross: 'Four-way pipe · 28 pts'
	};
	document.querySelector('#piece-name').textContent = pieceDetails[state.currentPiece.type];
	piecePreviewButton.disabled = state.pendingPiece;
}

function updatePieceControls() {
	document.querySelector('#placed-message').textContent = state.pendingPiece
		? 'Double-click your pipe to lock it in.'
		: 'Your next pipe is ready.';
	movePieceButton.disabled = !state.pendingPiece;
}

function moveLastPiece() {
	if (!state || !state.active || !state.pendingPiece) {
		return;
	}

	const cellIndex = state.board.findIndex((piece) => piece && piece.id === state.currentPiece.id);
	if (cellIndex === -1) {
		return;
	}

	const piece = state.board[cellIndex];
	const piecePoints = { straight: 12, elbow: 20, tee: 24, cross: 28 };
	if (state.rewardedPieceIds.includes(piece.id)) {
		state.score -= piecePoints[piece.type];
		state.rewardedPieceIds = state.rewardedPieceIds.filter((pieceId) => pieceId !== piece.id);
	}

	state.board[cellIndex] = null;
	state.pendingPiece = false;
	renderGame();
	saveGame();
	showToast('Piece moved back. Choose a new place.');
}

function placeCurrentPiece(cellIndex) {
	if (!state.currentPiece || state.pendingPiece || state.board[cellIndex] || getObstacleCellIndices().has(cellIndex)) {
		return;
	}

	state.board[cellIndex] = { ...state.currentPiece };
	state.pendingPiece = true;
	const pipeSoundPlayback = playPipeSound();

	const flowingCells = getFlowingCells();
	const placedPiece = state.board[cellIndex];
	if (flowingCells.has(cellIndex) && !state.rewardedPieceIds.includes(placedPiece.id)) {
		const piecePoints = { straight: 12, elbow: 20, tee: 24, cross: 28 };
		const points = piecePoints[placedPiece.type];
		state.score += points;
		state.rewardedPieceIds.push(placedPiece.id);
		showToast(`+${points} · Water is flowing`);
	} else if (!flowingCells.has(cellIndex)) {
		showToast('No flow yet. Check the pipe direction.');
	}

	renderGame();
	saveGame();

	if (hasReachedCity(flowingCells)) {
		completeLevel(pipeSoundPlayback);
	}
}

function continueToNextPiece() {
	if (!state.pendingPiece) {
		return;
	}

	state.pieceIndex += 1;
	state.pendingPiece = false;
	const flowingCells = getFlowingCells();
	if (!hasAvailableBoardCell()) {
		endGame('The board filled before water reached Charity City.');
		return;
	}
	if (!hasOpenFlowExit(flowingCells)) {
		endGame('The water flow stopped before reaching Charity City.');
		return;
	}

	state.currentPiece = makePiece(state.level, state.pieceIndex, state.recentPieceTypes, state.board);
	state.recentPieceTypes.push(state.currentPiece.type);
	state.recentPieceTypes = state.recentPieceTypes.slice(-3);
	renderGame();
	saveGame();
}

function completeLevel(pipeSoundPlayback = Promise.resolve()) {
	if (state.mode === 'timed') {
		const bonus = state.timeLeft * 3;
		state.score += bonus;
		showToast(`City connected · +${bonus} time bonus`);
	}

	clearInterval(timerInterval);
	state.active = false;
	localStorage.removeItem(storageKey);
	const completedLevel = state.level;
	const playQuickSoundForLevel = state.mode === 'timed'
		&& state.timeLeft > quickSoundThresholds[getStageName(completedLevel)];
	pipeSoundPlayback.then(() => {
		const quickSoundPlayback = playQuickSoundForLevel ? playQuickSound() : Promise.resolve();
		quickSoundPlayback.then(() => playStageSound(completedLevel));
	});

	if (state.level === 21) {
		showGroupTransition(state.level, showCampaignComplete);
		return;
	}

	const nextLevel = Math.min(21, state.level + 1);
	const changedStage = getStageName(nextLevel) !== getStageName(state.level);
	if (changedStage) {
		showGroupTransition(state.level, () => {
			stopGroupTransition();
			overlay.classList.add('hidden');
			state.level = nextLevel;
			startLevel();
		});
		return;
	}

	showOverlay({
		kind: 'level-up',
		symbol: '✦',
		eyebrow: 'A new connection',
		title: 'Level Up',
		copy: `Level ${nextLevel} is ready.`,
		actions: [
			{ label: `Start level ${nextLevel}`, style: 'primary', action: () => { state.level = nextLevel; startLevel(); overlay.classList.add('hidden'); } },
			{ label: 'Home screen', style: 'text', action: showHome }
		]
	});
}

function stopGroupTransition() {
	clearTimeout(groupTransitionTimeout);
	groupTransitionTimeout = null;
	transitionImage.onload = null;
	transitionImage.onerror = null;
}

function showGroupTransition(level, onComplete) {
	const stage = getStageName(level);
	showOverlay({
		kind: 'group-transition',
		symbol: '',
		eyebrow: '',
		title: `${stage} complete!`,
		image: groupCompletionImages[stage],
		copy: '',
		actions: []
	});

	// Wait for the image so its full four-second transition is visible.
	const startTransition = () => {
		transitionImage.onload = null;
		overlayCard.classList.add('transition-playing');
		groupTransitionTimeout = setTimeout(onComplete, 4000);
	};
	transitionImage.onload = startTransition;
	transitionImage.onerror = () => {
		console.error(`Unable to load the group transition image: ${groupCompletionImages[stage]}`);
		showToast('The completion image could not load. Continuing your game.');
		onComplete();
	};
	if (transitionImage.complete) {
		if (transitionImage.naturalWidth > 0) {
			startTransition();
		} else {
			transitionImage.onerror();
		}
	}
}

function showCampaignComplete() {
	showOverlay({
		kind: 'finale',
		symbol: '✦',
		eyebrow: '21 levels · one connected world',
		title: 'Clean Water For All',
		copy: `Continental Supply Success is connected. Final score: ${state.score.toLocaleString()}.`,
		actions: [
			{ label: 'Save success card', style: 'primary', action: saveSuccessCard },
			{ label: 'Share success', style: 'outline', action: shareSuccess },
			{ label: 'Home screen', style: 'text', action: showHome }
		]
	});
}

function endGame(message) {
	clearInterval(timerInterval);
	state.active = false;
	localStorage.removeItem(storageKey);
	showOverlay({
		kind: 'game-over',
		symbol: '',
		eyebrow: 'The line broke',
		title: 'Game Over',
		copy: `${message} You reached level ${state.level}. Score: ${state.score.toLocaleString()}.`,
		actions: [
			{ label: 'Try this level again', style: 'primary', action: () => { startLevel(); overlay.classList.add('hidden'); } },
			{ label: 'Home screen', style: 'text', action: showHome }
		]
	});
}

function showOverlay(options) {
	stopGroupTransition();
	overlayCard.className = `overlay-card ${options.kind}`;
	overlayCard.classList.toggle('group-complete', Boolean(options.image));
	menuRules.classList.toggle('hidden', options.kind !== 'settings');
	// Clear the artwork for menus and ordinary level-completion dialogs.
	transitionImage.classList.toggle('hidden', !options.image);
	if (options.image) {
		transitionImage.src = options.image;
		transitionImage.alt = options.title;
	} else {
		transitionImage.removeAttribute('src');
		transitionImage.alt = '';
	}
	overlaySymbol.classList.toggle('hidden', Boolean(options.image));
	overlaySymbol.textContent = options.symbol;
	overlayEyebrow.textContent = options.eyebrow;
	overlayTitle.textContent = options.title;
	overlayCopy.textContent = options.copy;
	overlayActions.innerHTML = '';

	options.actions.forEach((item) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = `button button-${item.style}`;
		button.textContent = item.label;
		button.addEventListener('click', item.action);
		overlayActions.append(button);
	});

	overlay.classList.remove('hidden');
}

function startTimer() {
	clearInterval(timerInterval);
	if (state.mode !== 'timed') {
		return;
	}

	timerInterval = setInterval(() => {
		state.timeLeft -= 1;
		document.querySelector('#timer-value').textContent = formatTime(state.timeLeft);
		if (state.timeLeft <= 0) {
			endGame('Time ran out before the city was connected.');
		} else {
			saveGame();
		}
	}, 1000);
}

function formatTime(seconds) {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function showToast(message) {
	toast.textContent = message;
	toast.classList.add('visible');
	clearTimeout(toastTimeout);
	toastTimeout = setTimeout(() => toast.classList.remove('visible'), 1800);
}

function createSoundEffectAudio(source) {
	const audio = new Audio(source);
	audio.volume = 0.75;
	return audio;
}

function playPipeSound() {
	if (!soundOn) {
		return Promise.resolve();
	}

	if (!pipeAudio) {
		pipeAudio = createSoundEffectAudio('Sound FX/pipe.wav');
	}
	return playSoundFile(pipeAudio, 'Unable to play the pipe sound effect:');
}

function playSwitchSound() {
	if (!soundOn) {
		return Promise.resolve();
	}

	if (!switchAudio) {
		switchAudio = createSoundEffectAudio('Sound FX/switch.mp3');
	}
	return playSoundFile(switchAudio, 'Unable to play the switch sound effect:');
}

function playQuickSound() {
	if (!soundOn) {
		return Promise.resolve();
	}

	if (!quickAudio) {
		quickAudio = createSoundEffectAudio('Sound FX/quick.mp3');
	}
	return playSoundFile(quickAudio, 'Unable to play the quick sound effect:');
}

function playStageSound(level) {
	if (!soundOn) {
		return Promise.resolve();
	}

	const stageName = getStageName(level);
	if (!stageAudios[stageName]) {
		stageAudios[stageName] = createSoundEffectAudio(`Sound FX/${stageSoundFiles[stageName]}`);
	}
	return playSoundFile(stageAudios[stageName], `Unable to play the ${stageName} sound effect:`);
}

function playSoundFile(audio, errorMessage) {
	audio.currentTime = 0;
	return new Promise((resolve) => {
		const finishPlayback = () => {
			audio.removeEventListener('ended', finishPlayback);
			resolve();
		};
		audio.addEventListener('ended', finishPlayback, { once: true });
		audio.play().catch((error) => {
			audio.removeEventListener('ended', finishPlayback);
			console.error(errorMessage, error);
			resolve();
		});
	});
}

function playBackgroundMusic() {
	if (!soundOn) {
		return;
	}

	if (!backgroundAudio) {
		backgroundAudio = new Audio('Sound FX/long.mp3');
		backgroundAudio.volume = 0.5;
		backgroundAudio.loop = true;
	}
	if (!backgroundAudio.paused) {
		return;
	}

	backgroundAudio.play().catch((error) => {
		if (error.name !== 'NotAllowedError') {
			console.error('Unable to play the background music:', error);
		}
	});
}

function startBackgroundMusicAfterInteraction() {
	document.removeEventListener('pointerdown', startBackgroundMusicAfterInteraction);
	document.removeEventListener('keydown', startBackgroundMusicAfterInteraction);
	playBackgroundMusic();
}

function playGameStartSound() {
	if (!soundOn) {
		return;
	}

	if (!gameStartAudio) {
		gameStartAudio = createSoundEffectAudio('Sound FX/game_start.mp3');
	}
	gameStartAudio.currentTime = 0;
	gameStartAudio.play().catch((error) => {
		console.error('Unable to play the game start sound effect:', error);
	});
}

function saveSuccessCard() {
	const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#f5f8f2"/><circle cx="930" cy="180" r="92" fill="#ffc907"/><path d="M0 470 Q260 390 480 485 T930 460 T1200 485 V800 H0Z" fill="#a8d9d3"/><path d="M0 575 Q260 500 520 580 T1000 550 T1200 570 V800 H0Z" fill="#2e9df7"/><path d="M160 580 H420 V500 H690 V570 H970" fill="none" stroke="#153a3c" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/><circle cx="160" cy="580" r="26" fill="#ffc907"/><circle cx="970" cy="570" r="26" fill="#ff902a"/><text x="100" y="150" fill="#153a3c" font-family="Georgia,serif" font-size="36">CHARITY CITY PIPELINE</text><text x="100" y="275" fill="#153a3c" font-family="Georgia,serif" font-size="76" font-weight="bold">Clean Water For All</text><text x="100" y="355" fill="#42666a" font-family="Arial,sans-serif" font-size="30">21 levels connected · Score ${state.score.toLocaleString()}</text><text x="100" y="730" fill="#153a3c" font-family="Arial,sans-serif" font-size="22">Every connection counts.</text></svg>`;
	const file = new Blob([card], { type: 'image/svg+xml' });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(file);
	link.download = 'clean-water-for-all.svg';
	link.click();
	URL.revokeObjectURL(link.href);
	showToast('Success card saved.');
}

async function shareSuccess() {
	const message = `I connected all 21 levels of Charity City Pipeline. Final score: ${state.score.toLocaleString()}!`;

	if (navigator.share) {
		await navigator.share({ title: 'Clean Water For All', text: message });
	} else if (navigator.clipboard) {
		await navigator.clipboard.writeText(message);
		showToast('Success message copied.');
	} else {
		showToast(message);
	}
}

function openSettings() {
	clearInterval(timerInterval);
	showOverlay({
		kind: 'settings',
		symbol: '≋',
		eyebrow: 'Game menu',
		title: 'Menu',
		copy: `Sound is ${soundOn ? 'on' : 'off'}. Your current game is saved automatically.`,
		actions: [
			{ label: soundOn ? 'Turn sound off' : 'Turn sound on', style: 'outline', action: () => {
				soundOn = !soundOn;
				if (soundOn) {
					playBackgroundMusic();
				} else if (backgroundAudio) {
					backgroundAudio.pause();
				}
				openSettings();
			} },
			...(state && state.active ? [{ label: 'Resume game', style: 'primary', action: () => { overlay.classList.add('hidden'); startTimer(); } }] : []),
			{ label: 'Home screen', style: 'text', action: showHome }
		]
	});
}

function showGameStylePicker() {
	const savedGame = loadSavedGame();
	const hasSavedGame = savedGame && savedGame.active;
	const timedLabel = hasSavedGame && savedGame.mode === 'timed' ? 'Continue timed game' : 'Beat the clock';
	const relaxedLabel = hasSavedGame && savedGame.mode === 'relaxed' ? 'Continue Just for Fun' : 'Just for fun';
	const copy = hasSavedGame
		? `Your paused ${savedGame.mode === 'timed' ? 'timed' : 'Just for Fun'} game can be continued. Choosing another style starts a new game.`
		: 'Play against the clock for time bonuses, or take your time.';

	showOverlay({
		kind: 'game-style',
		symbol: '≋',
		eyebrow: 'A new connection',
		title: 'Choose a game style',
		copy,
		actions: [
			{ label: timedLabel, style: 'primary', action: () => selectGameMode('timed') },
			{ label: relaxedLabel, style: 'outline', action: () => selectGameMode('relaxed') }
		]
	});
}

function selectGameMode(mode) {
	const savedGame = loadSavedGame();
	if (savedGame && savedGame.active && savedGame.mode === mode) {
		resumeSavedGame();
		return;
	}

	overlay.classList.add('hidden');
	createNewGame(mode);
}

function resumeSavedGame() {
	const savedGame = loadSavedGame();
	if (!savedGame || !savedGame.active) {
		return;
	}

	playGameStartSound();
	state = savedGame;
	state.boardSize = state.boardSize || getBoardSize(state.level);
	state.pieceIndex = Math.max(state.pieceIndex || 0, state.route ? state.route.length : 0);
	delete state.route;
	if (!Array.isArray(state.recentPieceTypes)) {
		const previousPieces = state.board
			.filter(Boolean)
			.sort((first, second) => {
				const firstIndex = Number(first.id.match(/piece-(\d+)$/)?.[1] || 0);
				const secondIndex = Number(second.id.match(/piece-(\d+)$/)?.[1] || 0);
				return firstIndex - secondIndex;
			});
		if (state.currentPiece && !previousPieces.some((piece) => piece.id === state.currentPiece.id)) {
			previousPieces.push(state.currentPiece);
		}
		state.recentPieceTypes = previousPieces.slice(-3).map((piece) => piece.type);
	}
	if (!state.obstacles || !state.obstacles.every((obstacle) => typeof obstacle === 'object')) {
		const occupiedCells = state.board.flatMap((piece, index) => piece ? [index] : []);
		state.obstacles = makeObstacleCells(state.level, occupiedCells);
	}
	const hasOutdatedObstacleLayout = state.obstacles.length !== (state.level < 2 ? 0 : state.level)
		|| state.obstacles.some((obstacle) => obstacle.width !== 1 || obstacle.height !== 1);
	if (hasOutdatedObstacleLayout) {
		const occupiedCells = state.board.flatMap((piece, index) => piece ? [index] : []);
		state.obstacles = makeObstacleCells(state.level, occupiedCells);
	}
	selectedMode = state.mode;
	saveGame();
	overlay.classList.add('hidden');
	showGame();
	renderGame();
	startTimer();
}

document.querySelector('#start-button').addEventListener('click', showGameStylePicker);
document.querySelector('#restart-button').addEventListener('click', () => {
	const savedGame = loadSavedGame();
	createNewGame(savedGame ? savedGame.mode : selectedMode);
});
document.querySelector('#continue-button').addEventListener('click', () => {
	resumeSavedGame();
});
piecePreviewButton.addEventListener('click', () => {
	if (!state || !state.currentPiece || state.pendingPiece) {
		return;
	}
	state.currentPiece.rotation = (state.currentPiece.rotation + 1) % 4;
	playSwitchSound();
	renderPreview();
});
movePieceButton.addEventListener('click', moveLastPiece);
gameBoard.addEventListener('click', (event) => {
	const placeButton = event.target.closest('.place-button[data-cell]');
	if (placeButton && state) {
		placeCurrentPiece(Number(placeButton.dataset.cell));
	}
});
gameBoard.addEventListener('dblclick', (event) => {
	const cell = event.target.closest('.board-cell[data-cell]');
	if (!cell || !state || !state.active || !state.pendingPiece) {
		return;
	}

	const piece = state.board[Number(cell.dataset.cell)];
	if (piece && piece.id === state.currentPiece.id) {
		continueToNextPiece();
	}
});
document.querySelector('#settings-button').addEventListener('click', openSettings);
document.querySelector('#overlay-close').addEventListener('click', () => {
	overlay.classList.add('hidden');
	if (state && state.active) {
		startTimer();
	}
});

document.addEventListener('pointerdown', startBackgroundMusicAfterInteraction);
document.addEventListener('keydown', startBackgroundMusicAfterInteraction);
playBackgroundMusic();
updateHomeActions();
