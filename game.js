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
  "张雪峰老师，我还记得你。",
  "你一定能考上",
  "我给大家表演一个三口吃巧乐兹。"
];

const player = {
  x: canvas.width / 2 - 22,
  y: canvas.height - 72,
  width: 44,
  height: 54,
  speed: 4
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
let userPausedMusic = false;

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

  const enemyWidth = 36;
  const enemyHeight = 58;

  enemies.push({
    x: Math.random() * (canvas.width - enemyWidth),
    y: -enemyHeight,
    width: enemyWidth,
    height: enemyHeight,
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
  }, 2200);
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
  if (userPausedMusic) {
    return;
  }

  try {
    await bgm.play();
  } catch (error) {
    // Some browsers block autoplay until the player interacts with the page.
  }

  updateMusicButton();
}

function tryPlayMusicAfterInteraction(event) {
  if (event.target === musicBtn) {
    return;
  }

  if (bgm.paused) {
    tryPlayMusic();
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

  const bodyWidth = enemy.width;
  const bodyHeight = enemy.height - 14;
  const bodyX = -bodyWidth / 2;
  const bodyY = -enemy.height / 2;
  const stickWidth = 8;
  const radius = 9;

  ctx.fillStyle = "#d6a15f";
  ctx.fillRect(-stickWidth / 2, bodyY + bodyHeight - 2, stickWidth, 16);

  ctx.fillStyle = "#5b2d1d";
  ctx.beginPath();
  ctx.moveTo(bodyX + radius, bodyY);
  ctx.lineTo(bodyX + bodyWidth - radius, bodyY);
  ctx.quadraticCurveTo(bodyX + bodyWidth, bodyY, bodyX + bodyWidth, bodyY + radius);
  ctx.lineTo(bodyX + bodyWidth, bodyY + bodyHeight);
  ctx.lineTo(bodyX, bodyY + bodyHeight);
  ctx.lineTo(bodyX, bodyY + radius);
  ctx.quadraticCurveTo(bodyX, bodyY, bodyX + radius, bodyY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f8e6b8";
  ctx.fillRect(bodyX + 7, bodyY + 6, 6, bodyHeight - 10);

  ctx.strokeStyle = "#f2c94c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bodyX + 19, bodyY + 10);
  ctx.lineTo(bodyX + bodyWidth - 7, bodyY + 20);
  ctx.lineTo(bodyX + 18, bodyY + 32);
  ctx.lineTo(bodyX + bodyWidth - 8, bodyY + 40);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.fillText("巧", 0, bodyY + 29);

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
    userPausedMusic = false;

    try {
      await bgm.play();
    } catch (error) {
      updateMusicButton();
    }

    updateMusicButton();
    return;
  }

  userPausedMusic = true;
  bgm.pause();
  updateMusicButton();
});

document.addEventListener("keydown", tryPlayMusicAfterInteraction);
document.addEventListener("pointerdown", tryPlayMusicAfterInteraction);

startGame();
tryPlayMusic();
