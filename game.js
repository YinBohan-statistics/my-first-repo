const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const finalScoreElement = document.getElementById("finalScore");
const feedbackElement = document.getElementById("feedback");
const bgm = document.getElementById("bgm");
const musicBtn = document.getElementById("musicBtn");
const gameOverPanel = document.getElementById("gameOverPanel");
const restartBtn = document.getElementById("restartBtn");

const feedbackMessages = [
  "你跑不过我你信吗？",
  "张雪峰老师，我还记得你。"
];

const player = {
  x: canvas.width / 2 - 22,
  y: canvas.height - 72,
  width: 44,
  height: 54,
  speed: 6
};

const keys = {
  left: false,
  right: false,
  shoot: false
};

const stars = Array.from({ length: 45 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 2 + 1,
  speed: Math.random() * 1.5 + 0.5
}));

let bullets = [];
let enemies = [];
let score = 0;
let gameOver = false;
let shootCooldown = 0;
let enemyTimer = 0;
let animationId = null;
let feedbackTimer = null;
let audioContext = null;

function startGame() {
  bullets = [];
  enemies = [];
  score = 0;
  gameOver = false;
  shootCooldown = 0;
  enemyTimer = 0;
  player.x = canvas.width / 2 - player.width / 2;

  scoreElement.textContent = score;
  finalScoreElement.textContent = score;
  feedbackElement.classList.add("hidden");
  gameOverPanel.classList.add("hidden");
  clearTimeout(feedbackTimer);

  cancelAnimationFrame(animationId);
  gameLoop();
}

function gameLoop() {
  updateGame();
  drawGame();

  if (!gameOver) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function updateGame() {
  updateStars();
  movePlayer();
  shootBullet();
  moveBullets();
  createEnemies();
  moveEnemies();
  checkCollisions();
}

function updateStars() {
  stars.forEach((star) => {
    star.y += star.speed;

    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  });
}

function movePlayer() {
  if (keys.left) {
    player.x -= player.speed;
  }

  if (keys.right) {
    player.x += player.speed;
  }

  if (player.x < 0) {
    player.x = 0;
  }

  if (player.x + player.width > canvas.width) {
    player.x = canvas.width - player.width;
  }
}

function shootBullet() {
  if (shootCooldown > 0) {
    shootCooldown -= 1;
  }

  if (!keys.shoot || shootCooldown > 0) {
    return;
  }

  bullets.push({
    x: player.x + player.width / 2 - 3,
    y: player.y - 14,
    width: 6,
    height: 16,
    speed: 9
  });

  playShootSound();
  shootCooldown = 15;
}

function moveBullets() {
  bullets.forEach((bullet) => {
    bullet.y -= bullet.speed;
  });

  bullets = bullets.filter((bullet) => bullet.y + bullet.height > 0);
}

function createEnemies() {
  const enemyInterval = Math.max(28, 70 - Math.floor(score / 5) * 4);
  enemyTimer += 1;

  if (enemyTimer < enemyInterval) {
    return;
  }

  const size = 38;

  enemies.push({
    x: Math.random() * (canvas.width - size),
    y: -size,
    width: size,
    height: size,
    speed: 2.1 + Math.random() * 1.4 + score * 0.015
  });

  enemyTimer = 0;
}

function moveEnemies() {
  enemies.forEach((enemy) => {
    enemy.y += enemy.speed;
  });
}

function checkCollisions() {
  for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
    const enemy = enemies[enemyIndex];

    if (isColliding(enemy, player) || enemy.y + enemy.height >= canvas.height) {
      endGame();
      return;
    }

    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = bullets[bulletIndex];

      if (isColliding(enemy, bullet)) {
        enemies.splice(enemyIndex, 1);
        bullets.splice(bulletIndex, 1);
        score += 1;
        scoreElement.textContent = score;

        if (score % 10 === 0) {
          showFeedback();
        }

        break;
      }
    }
  }
}

function showFeedback() {
  const message = feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)];
  feedbackElement.textContent = `${message} ${score} 分`;
  feedbackElement.classList.remove("hidden");

  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    feedbackElement.classList.add("hidden");
  }, 900);
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function prepareAudio() {
  const context = getAudioContext();

  if (context && context.state === "suspended") {
    context.resume();
  }
}

function playShootSound() {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(900, now);
  oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.12);

  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.13);
}

function updateMusicButton() {
  if (bgm.paused) {
    musicBtn.textContent = "播放音乐";
    musicBtn.setAttribute("aria-pressed", "false");
    return;
  }

  musicBtn.textContent = "暂停音乐";
  musicBtn.setAttribute("aria-pressed", "true");
}

async function tryPlayMusic() {
  try {
    await bgm.play();
  } catch (error) {
    // Some browsers block autoplay until the player interacts with the page.
  }

  updateMusicButton();
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function endGame() {
  gameOver = true;
  finalScoreElement.textContent = score;
  gameOverPanel.classList.remove("hidden");
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPlayer();
  bullets.forEach(drawBullet);
  enemies.forEach(drawEnemy);
}

function drawBackground() {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  stars.forEach((star) => {
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  ctx.save();
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

  ctx.restore();
}

function drawBullet(bullet) {
  ctx.fillStyle = "#facc15";
  ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

  ctx.fillStyle = "#fb7185";
  ctx.beginPath();
  ctx.moveTo(0, enemy.height / 2);
  ctx.lineTo(enemy.width / 2, -enemy.height / 2 + 8);
  ctx.lineTo(0, -enemy.height / 2 + 16);
  ctx.lineTo(-enemy.width / 2, -enemy.height / 2 + 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fecdd3";
  ctx.fillRect(-4, -6, 8, 18);

  ctx.restore();
}

document.addEventListener("keydown", (event) => {
  if (event.code === "ArrowLeft") {
    keys.left = true;
  }

  if (event.code === "ArrowRight") {
    keys.right = true;
  }

  if (event.code === "Space") {
    event.preventDefault();
    prepareAudio();
    keys.shoot = true;
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft") {
    keys.left = false;
  }

  if (event.code === "ArrowRight") {
    keys.right = false;
  }

  if (event.code === "Space") {
    keys.shoot = false;
  }
});

restartBtn.addEventListener("click", startGame);

musicBtn.addEventListener("click", async () => {
  if (bgm.paused) {
    try {
      await bgm.play();
    } catch (error) {
      updateMusicButton();
    }

    updateMusicButton();
    return;
  }

  bgm.pause();
  updateMusicButton();
});

startGame();
tryPlayMusic();
