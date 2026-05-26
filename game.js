const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const elements = {
  score: document.getElementById("score"),
  lives: document.getElementById("lives"),
  bestScore: document.getElementById("bestScore"),
  startBestScore: document.getElementById("startBestScore"),
  finalScore: document.getElementById("finalScore"),
  finalRating: document.getElementById("finalRating"),
  finalBestScore: document.getElementById("finalBestScore"),
  feedback: document.getElementById("feedback"),
  bgm: document.getElementById("bgm"),
  musicBtn: document.getElementById("musicBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  startBtn: document.getElementById("startBtn"),
  resumeBtn: document.getElementById("resumeBtn"),
  restartBtn: document.getElementById("restartBtn"),
  startPanel: document.getElementById("startPanel"),
  pausePanel: document.getElementById("pausePanel"),
  revivePanel: document.getElementById("revivePanel"),
  reviveForm: document.getElementById("reviveForm"),
  reviveAnswer: document.getElementById("reviveAnswer"),
  reviveError: document.getElementById("reviveError"),
  clearPanel: document.getElementById("clearPanel"),
  clearScore: document.getElementById("clearScore"),
  continueChallengeBtn: document.getElementById("continueChallengeBtn"),
  finishGameBtn: document.getElementById("finishGameBtn"),
  gameOverPanel: document.getElementById("gameOverPanel"),
  powerupStatus: document.getElementById("powerupStatus"),
  stageLabel: document.getElementById("stageLabel"),
  debugPanel: document.getElementById("debugPanel"),
  canvasWrap: document.querySelector(".canvas-wrap")
};

const CONFIG = {
  storage: {
    bestScore: "yinshen-plane-best-score",
    musicPaused: "yinshen-plane-music-paused"
  },
  player: {
    width: 44,
    height: 54,
    speed: 4,
    lives: 3,
    lifeCooldown: 90,
    invincibleTime: 90
  },
  bullet: {
    width: 6,
    height: 16,
    maxWidth: 18,
    maxHeight: 36,
    maxLevel: 6,
    speed: 9,
    cooldown: 18,
    laneGap: 13,
    lanePadding: 6,
    maxLanes: 5
  },
  enemies: {
    baseInterval: 82,
    minInterval: 32,
    firstDriftScore: 8,
    firstTankScore: 14,
    tankDropChance: 0.32,
    driftDropChance: 0.24,
    normalDropChance: 0.16
  },
  enemyTypes: {
    normal: {
      width: 36,
      height: 58,
      hp: 1,
      speed: 1.9,
      score: 1,
      color: "#5b2d1d",
      label: "巧"
    },
    tank: {
      width: 44,
      height: 66,
      hp: 3,
      speed: 1.35,
      score: 3,
      color: "#7f1d1d",
      label: "厚"
    },
    drift: {
      width: 38,
      height: 56,
      hp: 1,
      speed: 1.75,
      score: 2,
      color: "#155e75",
      label: "飘"
    }
  },
  powerups: {
    dropSpeed: 2.1,
    size: 26
  },
  boss: {
    firstScore: 45,
    scoreStep: 55,
    width: 150,
    height: 82,
    baseHp: 80,
    hpStep: 90,
    speed: 2,
    y: 48,
    score: 15,
    attackInterval: 74
  },
  bossTypes: [
    {
      name: "张老师的跑步机",
      subtitle: "越跑越上岸",
      color: "#4c1d95",
      accent: "#fbbf24",
      hp: 80,
      hpScale: 1,
      speedScale: 1,
      attackInterval: 78,
      attack: "treadmill"
    },
    {
      name: "张老师的雪碧",
      subtitle: "气泡压迫感",
      color: "#047857",
      accent: "#a7f3d0",
      hp: 170,
      hpScale: 1,
      speedScale: 1.08,
      attackInterval: 64,
      attack: "sprite"
    },
    {
      name: "张老师的夜宵",
      subtitle: "深夜加餐局",
      color: "#7c2d12",
      accent: "#fdba74",
      hp: 290,
      hpScale: 1,
      speedScale: 1.16,
      attackInterval: 58,
      attack: "snack"
    },
    {
      name: "张老师的最后一卷",
      subtitle: "压轴大题",
      color: "#7f1d1d",
      accent: "#fecaca",
      hp: 460,
      hpScale: 1,
      speedScale: 1.28,
      attackInterval: 48,
      attack: "paper"
    }
  ],
  feedbackDuration: 2200,
  debug: {
    enabled:
      new URLSearchParams(window.location.search).has("debug") ||
      window.location.hash.includes("debug")
  }
};

const feedbackMessages = [
  "你跑不过我你信吗？",
  "张雪峰老师，我还记得你。",
  "你一定能考上",
  "我给大家表演一个三口吃巧乐兹。"
];

const bossQuotes = [
  "选择比努力更重要。",
  "别只看热闹，要看门道。",
  "你要知道自己想去哪里。",
  "能上岸，就别在岸边犹豫。"
];

const keys = {
  left: false,
  right: false
};

const stars = Array.from({ length: 45 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 2 + 1,
  speed: Math.random() * 1.5 + 0.5
}));

const player = {
  x: canvas.width / 2 - CONFIG.player.width / 2,
  y: canvas.height - 72,
  width: CONFIG.player.width,
  height: CONFIG.player.height,
  speed: CONFIG.player.speed,
  invincibleTimer: 0
};

const state = {
  phase: "ready",
  score: 0,
  lives: CONFIG.player.lives,
  bestScore: readNumber(CONFIG.storage.bestScore, 0),
  nextBossScore: CONFIG.boss.firstScore,
  shootCooldown: 0,
  enemyTimer: 0,
  lifeCooldown: 0,
  lastFrameTime: null,
  feedbackTimer: null,
  animationId: null,
  audioContext: null,
  userPausedMusic: readBoolean(CONFIG.storage.musicPaused, false),
  showHitboxes: false,
  reviveAvailable: true,
  hasCleared: false,
  bossIndex: 0,
  boss: null,
  bullets: [],
  enemies: [],
  powerups: [],
  bossProjectiles: [],
  particles: [],
  floatingTexts: [],
  bossIntro: {
    timer: 0,
    level: 0,
    color: "#fbbf24"
  },
  weapon: {
    lanes: 1,
    bulletLevel: 0
  },
  shake: {
    time: 0,
    strength: 0
  }
};

function readNumber(key, fallback) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? value : fallback;
  } catch (error) {
    return fallback;
  }
}

function readBoolean(key, fallback) {
  let value = null;

  try {
    value = localStorage.getItem(key);
  } catch (error) {
    return fallback;
  }

  if (value === null) {
    return fallback;
  }

  return value === "true";
}

function saveValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    // Ignore storage failures in private or restricted browser modes.
  }
}

function startGame() {
  resetGameState();
  setPhase("playing");
  prepareAudio();
  tryPlayMusic();
}

function resetGameState() {
  state.score = 0;
  state.lives = CONFIG.player.lives;
  state.nextBossScore = CONFIG.boss.firstScore;
  state.bossIndex = 0;
  state.shootCooldown = 0;
  state.enemyTimer = 0;
  state.lifeCooldown = 0;
  state.lastFrameTime = null;
  state.boss = null;
  state.bullets = [];
  state.enemies = [];
  state.powerups = [];
  state.bossProjectiles = [];
  state.particles = [];
  state.floatingTexts = [];
  state.bossIntro.timer = 0;
  state.bossIntro.level = 0;
  state.weapon.lanes = 1;
  state.weapon.bulletLevel = 0;
  state.reviveAvailable = true;
  state.hasCleared = false;
  state.shake.time = 0;
  state.shake.strength = 0;
  player.x = canvas.width / 2 - player.width / 2;
  player.invincibleTimer = 0;

  clearTimeout(state.feedbackTimer);
  elements.feedback.classList.add("hidden");
  elements.reviveAnswer.value = "";
  elements.reviveError.classList.add("hidden");
  updateUI();
}

function setPhase(phase) {
  state.phase = phase;
  updateUI();
  updatePanels();
}

function togglePause() {
  if (state.phase === "playing") {
    setPhase("paused");
    return;
  }

  if (state.phase === "paused") {
    state.lastFrameTime = null;
    setPhase("playing");
  }
}

function gameLoop(currentTime = 0) {
  const speedScale = getSpeedScale(currentTime);

  if (state.phase === "playing") {
    updateGame(speedScale);
  } else if (state.phase === "revive" || state.phase === "clear" || state.phase === "gameover") {
    updateEffects(speedScale);
  }

  drawGame();
  state.animationId = requestAnimationFrame(gameLoop);
}

function getSpeedScale(currentTime) {
  if (state.lastFrameTime === null) {
    state.lastFrameTime = currentTime;
    return 1;
  }

  const frameTime = currentTime - state.lastFrameTime;
  state.lastFrameTime = currentTime;

  return Math.min(Math.max(frameTime / 16.67, 0.5), 2);
}

function updateGame(speedScale) {
  updateTimers(speedScale);
  updateStars(speedScale);
  movePlayer(speedScale);
  shootBullets(speedScale);
  moveBullets(speedScale);
  updateBoss(speedScale);
  moveBossProjectiles(speedScale);
  createEnemies(speedScale);
  moveEnemies(speedScale);
  updatePowerups(speedScale);
  updateEffects(speedScale);
  checkCollisions();
  updateUI();
}

function updateTimers(speedScale) {
  state.lifeCooldown = Math.max(0, state.lifeCooldown - speedScale);
  player.invincibleTimer = Math.max(0, player.invincibleTimer - speedScale);
  state.bossIntro.timer = Math.max(0, state.bossIntro.timer - speedScale);

  state.enemies.forEach((enemy) => {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - speedScale);
  });

  if (state.boss) {
    state.boss.hitFlash = Math.max(0, state.boss.hitFlash - speedScale);
  }
}

function updateStars(speedScale) {
  stars.forEach((star) => {
    star.y += star.speed * speedScale;

    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  });
}

function movePlayer(speedScale) {
  if (keys.left) {
    player.x -= player.speed * speedScale;
  }

  if (keys.right) {
    player.x += player.speed * speedScale;
  }

  player.x = clamp(player.x, 0, canvas.width - player.width);
}

function shootBullets(speedScale) {
  if (state.shootCooldown > 0) {
    state.shootCooldown -= speedScale;
    return;
  }

  const bulletStats = getBulletStats();
  const offsets = getLaneOffsets(bulletStats.width);

  offsets.forEach((offset) => {
    state.bullets.push({
      x: player.x + player.width / 2 - bulletStats.width / 2 + offset,
      y: player.y - bulletStats.height + 2,
      width: bulletStats.width,
      height: bulletStats.height,
      speed: CONFIG.bullet.speed,
      damage: bulletStats.damage,
      level: state.weapon.bulletLevel
    });
  });

  playSound("shoot");
  state.shootCooldown = CONFIG.bullet.cooldown;
}

function getBulletStats() {
  const level = state.weapon.bulletLevel;

  return {
    width: Math.min(CONFIG.bullet.width + level * 2, CONFIG.bullet.maxWidth),
    height: Math.min(CONFIG.bullet.height + level * 3, CONFIG.bullet.maxHeight),
    damage: 1 + Math.floor(level / 2)
  };
}

function getLaneOffsets(bulletWidth = CONFIG.bullet.width) {
  const lanes = state.weapon.lanes;
  const center = (lanes - 1) / 2;
  const laneGap = Math.max(CONFIG.bullet.laneGap, bulletWidth + CONFIG.bullet.lanePadding);

  return Array.from({ length: lanes }, (_, index) => (index - center) * laneGap);
}

function moveBullets(speedScale) {
  state.bullets.forEach((bullet) => {
    bullet.y -= bullet.speed * speedScale;
  });

  state.bullets = state.bullets.filter((bullet) => bullet.y + bullet.height > 0);
}

function createEnemies(speedScale) {
  if (state.boss) {
    return;
  }

  const difficulty = getDifficulty();
  state.enemyTimer += speedScale;

  if (state.enemyTimer < difficulty.enemyInterval) {
    return;
  }

  state.enemies.push(createEnemy(pickEnemyType(difficulty)));
  state.enemyTimer = 0;
}

function getDifficulty() {
  const tier = Math.floor(state.score / 12);
  const enemyInterval = Math.max(
    CONFIG.enemies.minInterval,
    CONFIG.enemies.baseInterval - tier * 7
  );

  return {
    tier,
    enemyInterval,
    speedBonus: tier * 0.13,
    driftChance: state.score >= CONFIG.enemies.firstDriftScore ? Math.min(0.1 + tier * 0.04, 0.32) : 0,
    tankChance: state.score >= CONFIG.enemies.firstTankScore ? Math.min(0.08 + tier * 0.035, 0.28) : 0
  };
}

function pickEnemyType(difficulty) {
  const roll = Math.random();

  if (roll < difficulty.tankChance) {
    return "tank";
  }

  if (roll < difficulty.tankChance + difficulty.driftChance) {
    return "drift";
  }

  return "normal";
}

function createEnemy(type, options = {}) {
  const template = CONFIG.enemyTypes[type];
  const difficulty = getDifficulty();
  const width = template.width;
  const height = template.height;

  return {
    type,
    x: options.x ?? Math.random() * (canvas.width - width),
    y: options.y ?? -height,
    width,
    height,
    speed: template.speed + Math.random() * 0.7 + difficulty.speedBonus,
    hp: template.hp,
    maxHp: template.hp,
    score: template.score,
    driftPhase: Math.random() * Math.PI * 2,
    driftDirection: Math.random() > 0.5 ? 1 : -1,
    hitFlash: 0
  };
}

function moveEnemies(speedScale) {
  state.enemies.forEach((enemy) => {
    enemy.y += enemy.speed * speedScale;

    if (enemy.type === "drift") {
      enemy.driftPhase += 0.05 * speedScale;
      enemy.x += Math.sin(enemy.driftPhase) * 1.9 * enemy.driftDirection * speedScale;
      enemy.x = clamp(enemy.x, 0, canvas.width - enemy.width);
    }
  });
}

function updateBoss(speedScale) {
  if (!state.boss && state.score >= state.nextBossScore) {
    spawnBoss();
  }

  if (!state.boss) {
    return;
  }

  const boss = state.boss;
  boss.y += (boss.targetY - boss.y) * 0.06 * speedScale;
  boss.x += boss.speed * boss.direction * speedScale;

  if (boss.attack === "sprite") {
    boss.y += Math.sin(boss.attackTimer * 0.04) * 0.45 * speedScale;
  }

  if (boss.attack === "paper") {
    boss.x += Math.sin(boss.attackTimer * 0.08) * 1.1 * speedScale;
  }

  if (boss.x <= 16 || boss.x + boss.width >= canvas.width - 16) {
    boss.direction *= -1;
    boss.x = clamp(boss.x, 16, canvas.width - boss.width - 16);
  }

  if (boss.introTimer > 0) {
    boss.introTimer -= speedScale;
    boss.attackTimer = 0;
    return;
  }

  boss.attackTimer += speedScale;

  if (boss.attackTimer >= boss.attackInterval) {
    runBossAttack(boss);
    boss.attackTimer = 0;
  }
}

function spawnBoss() {
  const bossTypeIndex = Math.min(state.bossIndex, CONFIG.bossTypes.length - 1);
  const bossType = CONFIG.bossTypes[bossTypeIndex];
  const overflowLevel = Math.max(0, state.bossIndex - bossTypeIndex);
  const maxHp = Math.round((bossType.hp + overflowLevel * CONFIG.boss.hpStep) * bossType.hpScale);

  state.boss = {
    x: canvas.width / 2 - CONFIG.boss.width / 2,
    y: -CONFIG.boss.height,
    targetY: CONFIG.boss.y,
    width: CONFIG.boss.width,
    height: CONFIG.boss.height,
    hp: maxHp,
    maxHp,
    speed: (CONFIG.boss.speed + state.bossIndex * 0.12) * bossType.speedScale,
    direction: Math.random() > 0.5 ? 1 : -1,
    name: bossType.name,
    subtitle: bossType.subtitle,
    color: bossType.color,
    accent: bossType.accent,
    attack: bossType.attack,
    level: bossTypeIndex + 1 + overflowLevel,
    attackInterval: Math.max(34, bossType.attackInterval - overflowLevel * 4),
    attackTimer: 0,
    introTimer: 95 + bossTypeIndex * 20,
    hitFlash: 0
  };

  state.enemies = [];
  state.bullets = [];
  state.bossProjectiles = [];
  state.bossIntro.timer = state.boss.introTimer;
  state.bossIntro.level = state.boss.level;
  state.bossIntro.color = state.boss.accent;
  addBossIntroBurst(state.boss);
  addShake(18 + bossTypeIndex * 8, 5 + bossTypeIndex * 2);
  showFeedback(`${bossType.name}：${bossQuotes[Math.floor(Math.random() * bossQuotes.length)]}`);
  playSound("boss");
}

function runBossAttack(boss) {
  if (boss.attack === "treadmill") {
    spawnBossMinion(Math.random() > 0.55 ? "drift" : "normal");
    return;
  }

  if (boss.attack === "sprite") {
    spawnBossProjectileFan(boss, 3, 2.7, "泡");
    return;
  }

  if (boss.attack === "snack") {
    spawnBossMinion(Math.random() > 0.45 ? "tank" : "drift");
    spawnBossProjectileFan(boss, 3, 2.45, "宵");
    return;
  }

  spawnBossProjectileFan(boss, 5, 3.1, "卷");

  if (Math.random() > 0.46) {
    spawnBossMinion(Math.random() > 0.55 ? "tank" : "drift");
  }
}

function spawnBossMinion(forcedType = null) {
  if (!state.boss) {
    return;
  }

  const type = forcedType ?? (Math.random() > 0.62 ? "drift" : "normal");
  const minion = createEnemy(type, {
    x: state.boss.x + state.boss.width / 2 - CONFIG.enemyTypes[type].width / 2 + randomBetween(-36, 36),
    y: state.boss.y + state.boss.height - 8
  });

  minion.speed += 0.55;
  state.enemies.push(minion);
}

function spawnBossProjectileFan(boss, count, speed, label) {
  const centerX = boss.x + boss.width / 2;
  const startY = boss.y + boss.height - 6;
  const center = (count - 1) / 2;

  for (let index = 0; index < count; index += 1) {
    const offset = index - center;
    const size = label === "卷" ? 24 : 20;

    state.bossProjectiles.push({
      x: centerX - size / 2 + offset * 18,
      y: startY,
      width: size,
      height: size,
      vx: offset * 0.55,
      vy: speed + Math.abs(offset) * 0.1,
      color: boss.accent,
      label,
      spin: 0,
      damage: 1
    });
  }
}

function moveBossProjectiles(speedScale) {
  state.bossProjectiles.forEach((projectile) => {
    projectile.x += projectile.vx * speedScale;
    projectile.y += projectile.vy * speedScale;
    projectile.spin += 0.08 * speedScale;
  });

  state.bossProjectiles = state.bossProjectiles.filter(
    (projectile) =>
      projectile.y < canvas.height + projectile.height &&
      projectile.x + projectile.width > -24 &&
      projectile.x < canvas.width + 24
  );
}

function addBossIntroBurst(boss) {
  const cx = boss.x + boss.width / 2;
  const cy = CONFIG.boss.y + boss.height / 2;
  const count = 18 + boss.level * 10;

  addParticles(cx, cy, boss.accent, count);
}

function updatePowerups(speedScale) {
  state.powerups.forEach((powerup) => {
    powerup.y += powerup.speed * speedScale;
    powerup.spin += 0.04 * speedScale;
  });

  state.powerups = state.powerups.filter((powerup) => powerup.y < canvas.height + powerup.size);
}

function updateEffects(speedScale) {
  state.particles.forEach((particle) => {
    particle.x += particle.vx * speedScale;
    particle.y += particle.vy * speedScale;
    particle.vy += 0.04 * speedScale;
    particle.life -= speedScale;
  });

  state.floatingTexts.forEach((text) => {
    text.y -= 0.5 * speedScale;
    text.life -= speedScale;
  });

  state.particles = state.particles.filter((particle) => particle.life > 0);
  state.floatingTexts = state.floatingTexts.filter((text) => text.life > 0);

  if (state.shake.time > 0) {
    state.shake.time -= speedScale;
  }
}

function checkCollisions() {
  checkEnemyCollisions();
  checkBossCollisions();
  checkBossProjectileCollisions();
  checkPowerupCollisions();
}

function checkEnemyCollisions() {
  for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
    const enemy = state.enemies[enemyIndex];

    if (enemy.y + enemy.height >= canvas.height) {
      state.enemies.splice(enemyIndex, 1);
      loseLife("漏掉了一个敌人");
      continue;
    }

    if (isColliding(enemy, player)) {
      state.enemies.splice(enemyIndex, 1);
      loseLife("被撞到了");
      continue;
    }

    for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = state.bullets[bulletIndex];

      if (!isColliding(enemy, bullet)) {
        continue;
      }

      state.bullets.splice(bulletIndex, 1);
      enemy.hp -= bullet.damage;
      enemy.hitFlash = 8;
      addParticles(bullet.x + bullet.width / 2, bullet.y, bullet.level > 0 ? "#fef3c7" : "#facc15", 5);
      playSound("hit");

      if (enemy.hp <= 0) {
        destroyEnemy(enemyIndex, enemy);
      }

      break;
    }
  }
}

function checkBossCollisions() {
  if (!state.boss) {
    return;
  }

  const boss = state.boss;

  for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bullet = state.bullets[bulletIndex];

    if (!isColliding(boss, bullet)) {
      continue;
    }

    state.bullets.splice(bulletIndex, 1);
    boss.hp -= bullet.damage;
    boss.hitFlash = 8;
    addParticles(bullet.x + bullet.width / 2, bullet.y, "#fde68a", 7);
    addFloatingText(`-${bullet.damage}`, bullet.x, bullet.y, "#fde68a");
    playSound("hit");

    if (boss.hp <= 0) {
      defeatBoss();
    }

    return;
  }
}

function checkBossProjectileCollisions() {
  for (let index = state.bossProjectiles.length - 1; index >= 0; index -= 1) {
    const projectile = state.bossProjectiles[index];

    if (!isColliding(projectile, player)) {
      continue;
    }

    state.bossProjectiles.splice(index, 1);
    addParticles(projectile.x + projectile.width / 2, projectile.y + projectile.height / 2, projectile.color, 10);
    loseLife("被 Boss 考到了");
  }
}

function checkPowerupCollisions() {
  for (let index = state.powerups.length - 1; index >= 0; index -= 1) {
    const powerup = state.powerups[index];

    if (!isColliding(powerup, player)) {
      continue;
    }

    state.powerups.splice(index, 1);
    applyPowerup(powerup.type);
  }
}

function destroyEnemy(enemyIndex, enemy) {
  state.enemies.splice(enemyIndex, 1);
  state.score += enemy.score;
  addScoreFeedback(enemy);
  addParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, getEnemyColor(enemy), 14);
  maybeDropPowerup(enemy);
  addShake(8, enemy.type === "tank" ? 4 : 2);
  playSound("explosion");

  if (state.score > 0 && state.score % 10 === 0) {
    showFeedback();
  }
}

function defeatBoss() {
  const boss = state.boss;
  const reward = CONFIG.boss.score + boss.level * 5;
  const clearedFinalBoss = !state.hasCleared && state.bossIndex >= CONFIG.bossTypes.length - 1;

  state.score += reward;
  state.nextBossScore += CONFIG.boss.scoreStep;
  state.bossIndex += 1;
  addParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, "#f97316", 32);
  addFloatingText(`+${reward}`, boss.x + boss.width / 2, boss.y + boss.height / 2, "#f97316");
  addShake(24, 7);
  spawnPowerup(state.weapon.lanes < CONFIG.bullet.maxLanes ? "double" : "big", boss.x + boss.width / 2, boss.y + boss.height / 2);
  state.bossProjectiles = [];
  state.boss = null;

  if (clearedFinalBoss) {
    completeGame();
    return;
  }

  showFeedback("这波上岸了，继续冲！");
  playSound("bossDown");
}

function completeGame() {
  state.hasCleared = true;
  state.score = Math.max(state.score, 300);
  state.nextBossScore = state.score + CONFIG.boss.scoreStep;
  state.bestScore = Math.max(state.bestScore, state.score);
  saveValue(CONFIG.storage.bestScore, state.bestScore);
  addShake(36, 9);
  showFeedback("孩子你考上小学博士了！");
  playSound("bossDown");
  updateUI();
  setPhase("clear");
}

function continueChallenge() {
  state.lastFrameTime = null;
  showFeedback("继续挑战，看看小学博士后面是什么。");
  setPhase("playing");
}

function finishGame() {
  endGame();
}

function addScoreFeedback(enemy) {
  addFloatingText(`+${enemy.score}`, enemy.x + enemy.width / 2, enemy.y, "#ffffff");
}

function maybeDropPowerup(enemy) {
  const dropChance = getDropChance(enemy.type);

  if (Math.random() > dropChance) {
    return;
  }

  const type = Math.random() > 0.5 ? "big" : "double";
  spawnPowerup(type, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
}

function getDropChance(enemyType) {
  if (enemyType === "tank") {
    return CONFIG.enemies.tankDropChance;
  }

  if (enemyType === "drift") {
    return CONFIG.enemies.driftDropChance;
  }

  return CONFIG.enemies.normalDropChance;
}

function spawnPowerup(type, x, y) {
  state.powerups.push({
    type,
    x: x - CONFIG.powerups.size / 2,
    y: y - CONFIG.powerups.size / 2,
    width: CONFIG.powerups.size,
    height: CONFIG.powerups.size,
    size: CONFIG.powerups.size,
    speed: CONFIG.powerups.dropSpeed,
    spin: 0
  });
}

function applyPowerup(type) {
  if (type === "big") {
    if (state.weapon.bulletLevel < CONFIG.bullet.maxLevel) {
      state.weapon.bulletLevel += 1;
      showFeedback(`子弹变大 Lv.${state.weapon.bulletLevel}`);
    } else {
      state.score += 2;
      showFeedback("子弹已经够大了，转成 2 分！");
    }
  }

  if (type === "double") {
    if (state.weapon.lanes < CONFIG.bullet.maxLanes) {
      state.weapon.lanes += 1;
      showFeedback(`新增弹道：${state.weapon.lanes} 条`);
    } else {
      state.score += 2;
      showFeedback("弹道已经满了，转成 2 分！");
    }
  }

  addFloatingText(type === "big" ? "子弹变大" : "弹道+1", player.x + player.width / 2, player.y, "#22c55e");
  playSound("pickup");
}

function loseLife(reason) {
  if (state.lifeCooldown > 0 || state.phase !== "playing") {
    return;
  }

  state.lives -= 1;
  state.lifeCooldown = CONFIG.player.lifeCooldown;
  player.invincibleTimer = CONFIG.player.invincibleTime;
  addShake(22, 6);
  addFloatingText("-1 生命", player.x + player.width / 2, player.y, "#fb7185");
  playSound("damage");

  if (state.lives <= 0) {
    requestRevive();
    return;
  }

  showFeedback(`${reason}，还剩 ${state.lives} 条命`);
}

function requestRevive() {
  if (!state.reviveAvailable) {
    endGame();
    return;
  }

  state.reviveAvailable = false;
  state.bossProjectiles = [];
  setPhase("revive");
  showFeedback("最后一题，答对就还能抢救一下！");
  playSound("gameOver");

  setTimeout(() => {
    elements.reviveAnswer.focus();
  }, 0);
}

function submitReviveAnswer(event) {
  event.preventDefault();

  if (state.phase !== "revive") {
    return;
  }

  const answer = elements.reviveAnswer.value.trim();

  if (answer === "神了") {
    revivePlayer();
    return;
  }

  elements.reviveError.classList.remove("hidden");
  endGame();
}

function revivePlayer() {
  state.lives = 1;
  state.lifeCooldown = CONFIG.player.lifeCooldown;
  player.invincibleTimer = CONFIG.player.invincibleTime * 1.4;
  state.bossProjectiles = [];
  state.enemies = state.enemies.filter((enemy) => enemy.y < canvas.height * 0.65);
  elements.reviveAnswer.value = "";
  elements.reviveError.classList.add("hidden");
  showFeedback("殷神神了！一条命复活！");
  addShake(24, 7);
  playSound("pickup");
  state.lastFrameTime = null;
  setPhase("playing");
}

function endGame() {
  setPhase("gameover");
  state.bestScore = Math.max(state.bestScore, state.score);
  saveValue(CONFIG.storage.bestScore, state.bestScore);
  showFeedback("游戏结束");
  playSound("gameOver");
  updateUI();
}

function updateUI() {
  elements.score.textContent = state.score;
  elements.lives.textContent = state.lives;
  elements.bestScore.textContent = state.bestScore;
  elements.startBestScore.textContent = state.bestScore;
  elements.finalScore.textContent = state.score;
  elements.finalRating.textContent = getScoreRating(state.score);
  elements.finalBestScore.textContent = Math.max(state.bestScore, state.score);
  elements.clearScore.textContent = state.score;
  elements.powerupStatus.textContent = getPowerupStatus();
  elements.stageLabel.textContent = getStageLabel();
  elements.pauseBtn.disabled =
    state.phase === "ready" ||
    state.phase === "revive" ||
    state.phase === "clear" ||
    state.phase === "gameover";
  elements.pauseBtn.textContent = state.phase === "paused" ? "继续" : "暂停";
  updateMusicButton();
  updateDebugPanel();
}

function updatePanels() {
  elements.startPanel.classList.toggle("hidden", state.phase !== "ready");
  elements.pausePanel.classList.toggle("hidden", state.phase !== "paused");
  elements.revivePanel.classList.toggle("hidden", state.phase !== "revive");
  elements.clearPanel.classList.toggle("hidden", state.phase !== "clear");
  elements.gameOverPanel.classList.toggle("hidden", state.phase !== "gameover");
}

function getScoreRating(score) {
  if (score >= 300) {
    return "小学博士";
  }

  if (score >= 210) {
    return "清北";
  }

  if (score >= 180) {
    return "985";
  }

  if (score >= 150) {
    return "211";
  }

  if (score >= 120) {
    return "双非";
  }

  if (score >= 90) {
    return "大专";
  }

  if (score >= 30) {
    return "职高";
  }

  return "中专";
}

function getPowerupStatus() {
  return `弹道 ${state.weapon.lanes}/${CONFIG.bullet.maxLanes} / 子弹 Lv.${state.weapon.bulletLevel}/${CONFIG.bullet.maxLevel}`;
}

function getStageLabel() {
  if (state.boss) {
    return state.boss.name;
  }

  if (state.score >= state.nextBossScore - 8) {
    return "Boss 将至";
  }

  if (state.score >= 28) {
    return "高压";
  }

  if (state.score >= 12) {
    return "加速";
  }

  return "热身";
}

function updateDebugPanel() {
  if (!CONFIG.debug.enabled) {
    elements.debugPanel.classList.add("hidden");
    return;
  }

  elements.debugPanel.classList.remove("hidden");
  elements.debugPanel.innerHTML = [
    "DEBUG",
    "1 加10分 / 2 厚敌 / 3 漂敌",
    "4 切Boss / B Boss / P 道具",
    "K 击败Boss / R 复活题 / C 碰撞框"
  ].join("<br>");
}

function showFeedback(message) {
  const text = message ?? `${feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)]} ${state.score} 分`;
  elements.feedback.textContent = text;
  elements.feedback.classList.remove("hidden");

  clearTimeout(state.feedbackTimer);
  state.feedbackTimer = setTimeout(() => {
    elements.feedback.classList.add("hidden");
  }, CONFIG.feedbackDuration);
}

function prepareAudio() {
  const context = getAudioContext();

  if (context && context.state === "suspended") {
    context.resume();
  }
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  return state.audioContext;
}

function playSound(type) {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const sounds = {
    shoot: [880, 160, 0.1, 0.09],
    hit: [420, 210, 0.08, 0.08],
    explosion: [170, 80, 0.16, 0.16],
    pickup: [520, 980, 0.12, 0.12],
    damage: [140, 70, 0.18, 0.18],
    boss: [120, 420, 0.26, 0.18],
    bossDown: [260, 760, 0.32, 0.22],
    gameOver: [260, 90, 0.32, 0.2]
  };

  const [startFrequency, endFrequency, duration, volume] = sounds[type] ?? sounds.hit;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type === "pickup" || type === "bossDown" ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

async function tryPlayMusic() {
  if (state.userPausedMusic) {
    updateMusicButton();
    return;
  }

  try {
    await elements.bgm.play();
  } catch (error) {
    // Browsers often require a click before audio playback.
  }

  updateMusicButton();
}

function updateMusicButton() {
  if (elements.bgm.paused) {
    elements.musicBtn.textContent = "播放音乐";
    elements.musicBtn.setAttribute("aria-pressed", "false");
    return;
  }

  elements.musicBtn.textContent = "暂停音乐";
  elements.musicBtn.setAttribute("aria-pressed", "true");
}

function tryPlayMusicAfterInteraction(event) {
  if (event.target === elements.musicBtn) {
    return;
  }

  prepareAudio();

  if (elements.bgm.paused) {
    tryPlayMusic();
  }
}

function drawGame() {
  applyScreenShake();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPowerups();
  drawPlayer();
  state.bullets.forEach(drawBullet);
  state.enemies.forEach(drawEnemy);
  state.bossProjectiles.forEach(drawBossProjectile);
  drawBoss();
  drawBossIntro();
  drawParticles();
  drawFloatingTexts();

  if (state.showHitboxes) {
    drawHitboxes();
  }
}

function applyScreenShake() {
  if (state.shake.time <= 0) {
    state.shake.strength = 0;
    elements.canvasWrap.style.transform = "";
    return;
  }

  const strength = state.shake.strength;
  const x = randomBetween(-strength, strength);
  const y = randomBetween(-strength, strength);
  elements.canvasWrap.style.transform = `translate(${x}px, ${y}px)`;
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(0.55, "#0f172a");
  gradient.addColorStop(1, "#172554");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach((star) => {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  ctx.save();

  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 6) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);

  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.moveTo(0, -player.height / 2);
  ctx.lineTo(player.width / 2, player.height / 2);
  ctx.lineTo(0, player.height / 2 - 12);
  ctx.lineTo(-player.width / 2, player.height / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e0f2fe";
  ctx.fillRect(-4, -8, 8, 24);

  if (state.weapon.lanes > 1) {
    ctx.fillStyle = "#22c55e";
    getLaneOffsets(getBulletStats().width)
      .filter((offset) => offset !== 0)
      .forEach((offset) => {
        ctx.fillRect(offset - 3, 12, 6, 16);
      });
  }

  ctx.restore();
}

function drawBullet(bullet) {
  ctx.fillStyle = bullet.level > 0 ? "#fde047" : "#facc15";
  ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

  if (bullet.level > 0) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#fef9c3";
    ctx.fillRect(bullet.x - 2, bullet.y + 4, bullet.width + 4, bullet.height - 8);
    ctx.globalAlpha = 1;
  }
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

  if (enemy.type === "drift") {
    ctx.rotate(Math.sin(enemy.driftPhase) * 0.18);
  }

  const bodyWidth = enemy.width;
  const bodyHeight = enemy.height - 14;
  const bodyX = -bodyWidth / 2;
  const bodyY = -enemy.height / 2;
  const stickWidth = enemy.type === "tank" ? 10 : 8;
  const radius = enemy.type === "tank" ? 11 : 9;

  ctx.fillStyle = "#d6a15f";
  ctx.fillRect(-stickWidth / 2, bodyY + bodyHeight - 2, stickWidth, 16);

  ctx.fillStyle = enemy.hitFlash > 0 ? "#fef3c7" : getEnemyColor(enemy);
  roundedRect(bodyX, bodyY, bodyWidth, bodyHeight, radius);
  ctx.fill();

  ctx.fillStyle = "#f8e6b8";
  ctx.fillRect(bodyX + 7, bodyY + 6, 6, bodyHeight - 10);

  ctx.strokeStyle = enemy.type === "drift" ? "#67e8f9" : "#f2c94c";
  ctx.lineWidth = enemy.type === "tank" ? 4 : 3;
  ctx.beginPath();
  ctx.moveTo(bodyX + 19, bodyY + 10);
  ctx.lineTo(bodyX + bodyWidth - 7, bodyY + 20);
  ctx.lineTo(bodyX + 18, bodyY + 32);
  ctx.lineTo(bodyX + bodyWidth - 8, bodyY + 40);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px Arial, Microsoft YaHei";
  ctx.textAlign = "center";
  ctx.fillText(CONFIG.enemyTypes[enemy.type].label, 0, bodyY + 31);

  if (enemy.maxHp > 1) {
    drawMiniHealthBar(-bodyWidth / 2, bodyY - 8, bodyWidth, 4, enemy.hp / enemy.maxHp);
  }

  ctx.restore();
}

function drawBoss() {
  if (!state.boss) {
    return;
  }

  const boss = state.boss;

  ctx.save();
  ctx.translate(boss.x + boss.width / 2, boss.y + boss.height / 2);

  ctx.fillStyle = boss.hitFlash > 0 ? "#fde68a" : boss.color;
  roundedRect(-boss.width / 2, -boss.height / 2, boss.width, boss.height, 18);
  ctx.fill();

  ctx.fillStyle = boss.accent;
  ctx.fillRect(-boss.width / 2 + 14, -boss.height / 2 + 16, boss.width - 28, 12);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial, Microsoft YaHei";
  ctx.textAlign = "center";
  ctx.fillText("BOSS", 0, 8);

  ctx.font = "bold 13px Arial, Microsoft YaHei";
  ctx.fillText(boss.name, 0, 30);
  ctx.restore();

  drawMiniHealthBar(54, 18, canvas.width - 108, 10, boss.hp / boss.maxHp, "#ef4444");
}

function drawBossProjectile(projectile) {
  ctx.save();
  ctx.translate(projectile.x + projectile.width / 2, projectile.y + projectile.height / 2);
  ctx.rotate(projectile.spin);
  ctx.fillStyle = projectile.color;

  if (projectile.label === "泡") {
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    ctx.arc(0, 0, projectile.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    roundedRect(-projectile.width / 2, -projectile.height / 2, projectile.width, projectile.height, 5);
    ctx.fill();
  }

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 12px Arial, Microsoft YaHei";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(projectile.label, 0, 1);
  ctx.restore();
}

function drawBossIntro() {
  if (state.bossIntro.timer <= 0 || !state.boss) {
    return;
  }

  const boss = state.boss;
  const progress = 1 - state.bossIntro.timer / (95 + (Math.min(boss.level, 4) - 1) * 20);
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  const rings = Math.min(4, boss.level);

  ctx.save();
  ctx.globalAlpha = clamp(1 - progress, 0.12, 0.75);
  ctx.strokeStyle = state.bossIntro.color;
  ctx.lineWidth = 3;

  for (let index = 0; index < rings; index += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, 42 + progress * (86 + index * 28), 0, Math.PI * 2);
    ctx.stroke();
  }

  if (boss.level >= 3) {
    ctx.fillStyle = state.bossIntro.color;
    ctx.globalAlpha = clamp(0.24 - progress * 0.16, 0.04, 0.24);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.globalAlpha = clamp(1 - progress * 0.8, 0.2, 1);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial, Microsoft YaHei";
  ctx.textAlign = "center";
  ctx.fillText(`第 ${boss.level} 题：${boss.name}`, canvas.width / 2, 116);
  ctx.restore();
}

function drawPowerups() {
  state.powerups.forEach((powerup) => {
    const cx = powerup.x + powerup.width / 2;
    const cy = powerup.y + powerup.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(powerup.spin);
    ctx.fillStyle = powerup.type === "big" ? "#f97316" : "#22c55e";
    roundedRect(-powerup.size / 2, -powerup.size / 2, powerup.size, powerup.size, 7);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Arial, Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(powerup.type === "big" ? "大" : "道", 0, 1);
    ctx.restore();
  });
}

function drawParticles() {
  state.particles.forEach((particle) => {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawFloatingTexts() {
  state.floatingTexts.forEach((text) => {
    ctx.globalAlpha = clamp(text.life / text.maxLife, 0, 1);
    ctx.fillStyle = text.color;
    ctx.font = "bold 16px Arial, Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.fillText(text.value, text.x, text.y);
  });
  ctx.globalAlpha = 1;
}

function drawHitboxes() {
  ctx.save();
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 1;
  strokeBox(player);

  ctx.strokeStyle = "#f87171";
  state.enemies.forEach(strokeBox);

  if (state.boss) {
    ctx.strokeStyle = "#facc15";
    strokeBox(state.boss);
  }

  ctx.strokeStyle = "#93c5fd";
  state.powerups.forEach(strokeBox);
  ctx.strokeStyle = "#f97316";
  state.bossProjectiles.forEach(strokeBox);
  ctx.restore();
}

function strokeBox(box) {
  ctx.strokeRect(box.x, box.y, box.width, box.height);
}

function drawMiniHealthBar(x, y, width, height, percent, color = "#22c55e") {
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * clamp(percent, 0, 1), height);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}

function addParticles(x, y, color, count) {
  for (let index = 0; index < count; index += 1) {
    state.particles.push({
      x,
      y,
      vx: randomBetween(-2.4, 2.4),
      vy: randomBetween(-2.4, 1.2),
      size: randomBetween(2, 4.5),
      color,
      life: randomBetween(18, 34),
      maxLife: 34
    });
  }
}

function addFloatingText(value, x, y, color) {
  state.floatingTexts.push({
    value,
    x,
    y,
    color,
    life: 48,
    maxLife: 48
  });
}

function addShake(time, strength) {
  state.shake.time = Math.max(state.shake.time, time);
  state.shake.strength = Math.max(state.shake.strength, strength);
}

function getEnemyColor(enemy) {
  return CONFIG.enemyTypes[enemy.type].color;
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function movePlayerToClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const canvasX = (clientX - rect.left) * scaleX;

  player.x = clamp(canvasX - player.width / 2, 0, canvas.width - player.width);
}

function handlePointerControl(event) {
  if (event.pointerType === "mouse") {
    return;
  }

  event.preventDefault();
  prepareAudio();

  if (state.phase !== "playing") {
    return;
  }

  if (event.type === "pointerdown" && canvas.setPointerCapture) {
    canvas.setPointerCapture(event.pointerId);
  }

  movePlayerToClientX(event.clientX);
  tryPlayMusicAfterInteraction(event);
}

function handleKeyDown(event) {
  if (event.code === "ArrowLeft") {
    prepareAudio();
    keys.left = true;
  }

  if (event.code === "ArrowRight") {
    prepareAudio();
    keys.right = true;
  }

  if (event.code === "Escape" && (state.phase === "playing" || state.phase === "paused")) {
    togglePause();
  }

  if (CONFIG.debug.enabled) {
    handleDebugKey(event);
  }
}

function handleKeyUp(event) {
  if (event.code === "ArrowLeft") {
    keys.left = false;
  }

  if (event.code === "ArrowRight") {
    keys.right = false;
  }
}

function handleDebugKey(event) {
  if (event.code === "Digit1") {
    state.score += 10;
    showFeedback("调试加分");
  }

  if (event.code === "Digit2") {
    state.enemies.push(createEnemy("tank"));
  }

  if (event.code === "Digit3") {
    state.enemies.push(createEnemy("drift"));
  }

  if (event.code === "Digit4") {
    state.bossIndex = (state.bossIndex + 1) % CONFIG.bossTypes.length;
    showFeedback(`下个 Boss：${CONFIG.bossTypes[state.bossIndex].name}`);
  }

  if (event.code === "KeyB") {
    state.score = Math.max(state.score, state.nextBossScore);
    spawnBoss();
  }

  if (event.code === "KeyK" && state.boss) {
    defeatBoss();
  }

  if (event.code === "KeyP") {
    spawnPowerup(Math.random() > 0.5 ? "big" : "double", player.x + player.width / 2, player.y - 40);
  }

  if (event.code === "KeyC") {
    state.showHitboxes = !state.showHitboxes;
  }

  if (event.code === "KeyR") {
    state.lives = 1;
    loseLife("调试复活题");
  }
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

elements.startBtn.addEventListener("click", startGame);
elements.restartBtn.addEventListener("click", startGame);
elements.resumeBtn.addEventListener("click", togglePause);
elements.pauseBtn.addEventListener("click", togglePause);
elements.reviveForm.addEventListener("submit", submitReviveAnswer);
elements.continueChallengeBtn.addEventListener("click", continueChallenge);
elements.finishGameBtn.addEventListener("click", finishGame);

elements.musicBtn.addEventListener("click", async () => {
  if (elements.bgm.paused) {
    state.userPausedMusic = false;
    saveValue(CONFIG.storage.musicPaused, false);

    try {
      await elements.bgm.play();
    } catch (error) {
      updateMusicButton();
    }

    updateMusicButton();
    return;
  }

  state.userPausedMusic = true;
  saveValue(CONFIG.storage.musicPaused, true);
  elements.bgm.pause();
  updateMusicButton();
});

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
document.addEventListener("keydown", tryPlayMusicAfterInteraction);
document.addEventListener("pointerdown", tryPlayMusicAfterInteraction);
canvas.addEventListener("pointerdown", handlePointerControl);
canvas.addEventListener("pointermove", handlePointerControl);

if (state.userPausedMusic) {
  elements.bgm.pause();
}

updateUI();
updatePanels();
gameLoop();
tryPlayMusic();
