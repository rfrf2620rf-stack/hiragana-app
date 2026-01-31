/* ===============================
   ファンシーひらがなレッスン
   メインアプリケーション
   =============================== */

// ========== 初期化 ==========
let audioCtx = null;
const synth = window.speechSynthesis;

// 現在の状態
let currentMode = null;

// Canvas関連
let linesCanvas, linesCtx;
let hiraganaCanvas, hiraganaCtx;

// 描画状態
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentColor = '#FF69B4';

// せんつなぎ用データ（4ステージ）
const lineStages = [
    { type: 'horizontal', start: { x: 50, y: 200 }, end: { x: 350, y: 200 } },
    { type: 'vertical', start: { x: 200, y: 50 }, end: { x: 200, y: 350 } },
    {
        type: 'zigzag', points: [
            { x: 50, y: 100 }, { x: 150, y: 300 }, { x: 250, y: 100 }, { x: 350, y: 300 }
        ]
    },
    { type: 'spiral', center: { x: 200, y: 200 }, maxRadius: 120 }
];

// ひらがなデータ（画数別）
const hiraganaLevel1 = ['し', 'つ', 'く', 'へ', 'の', 'こ', 'て', 'り']; // 1画
const hiraganaLevel2 = ['い', 'う', 'ち', 'に', 'は', 'ひ', 'ふ', 'み', 'も', 'ら', 'る', 'れ', 'ろ', 'ん']; // 2画
const hiraganaLevel3 = ['あ', 'お', 'か', 'き', 'け', 'さ', 'す', 'せ', 'そ', 'た', 'と', 'な', 'ぬ', 'ね', 'ほ', 'ま', 'む', 'め', 'や', 'ゆ', 'よ', 'わ', 'を']; // 3画以上

// ゲーム進行
let linesCurrentStage = 0;
let linesClearedCount = 0;

let hiraganaLevel = 1;
let hiraganaCurrentIndex = 0;
let hiraganaQuestions = [];

// ========== ページ読み込み時 ==========
document.addEventListener('DOMContentLoaded', () => {
    initSparkles();
});

// ========== キラキラ背景 ==========
function initSparkles() {
    const container = document.getElementById('sparkles');
    const sparkleChars = ['✨', '⭐', '💖', '🎀', '💫'];

    for (let i = 0; i < 15; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.textContent = sparkleChars[Math.floor(Math.random() * sparkleChars.length)];
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.top = Math.random() * 100 + '%';
        sparkle.style.animationDelay = Math.random() * 4 + 's';
        container.appendChild(sparkle);
    }
}

// ========== Canvas初期化 ==========
function initLinesCanvas() {
    linesCanvas = document.getElementById('lines-canvas');
    const container = linesCanvas.parentElement;
    const rect = container.getBoundingClientRect();
    linesCanvas.width = rect.width;
    linesCanvas.height = rect.height;
    linesCtx = linesCanvas.getContext('2d');
    setupLinesCanvasEvents(linesCanvas);
}

function setupLinesCanvasEvents(canvas) {
    canvas.onmousedown = (e) => startDraw(e, canvas, handleLinesDraw);
    canvas.onmousemove = (e) => draw(e, canvas, handleLinesDraw);
    canvas.onmouseup = () => { endDraw(); endLinesDraw(); };
    canvas.onmouseleave = () => { endDraw(); endLinesDraw(); };

    canvas.ontouchstart = (e) => {
        e.preventDefault();
        startDraw(e.touches[0], canvas, handleLinesDraw);
    };
    canvas.ontouchmove = (e) => {
        e.preventDefault();
        draw(e.touches[0], canvas, handleLinesDraw);
    };
    canvas.ontouchend = () => { endDraw(); endLinesDraw(); };
}

function initHiraganaCanvas() {
    hiraganaCanvas = document.getElementById('hiragana-canvas');
    const container = hiraganaCanvas.parentElement;
    const rect = container.getBoundingClientRect();
    hiraganaCanvas.width = rect.width;
    hiraganaCanvas.height = rect.height;
    hiraganaCtx = hiraganaCanvas.getContext('2d');
    setupHiraganaCanvasEvents(hiraganaCanvas);
}

function setupHiraganaCanvasEvents(canvas) {
    canvas.onmousedown = (e) => startDraw(e, canvas, handleHiraganaDraw);
    canvas.onmousemove = (e) => draw(e, canvas, handleHiraganaDraw);
    canvas.onmouseup = () => { endDraw(); endHiraganaDraw(); };
    canvas.onmouseleave = () => { endDraw(); endHiraganaDraw(); };

    canvas.ontouchstart = (e) => {
        e.preventDefault();
        startDraw(e.touches[0], canvas, handleHiraganaDraw);
    };
    canvas.ontouchmove = (e) => {
        e.preventDefault();
        draw(e.touches[0], canvas, handleHiraganaDraw);
    };
    canvas.ontouchend = () => { endDraw(); endHiraganaDraw(); };
}

function setupCanvasEvents(canvas, drawHandler) {
    canvas.onmousedown = (e) => startDraw(e, canvas, drawHandler);
    canvas.onmousemove = (e) => draw(e, canvas, drawHandler);
    canvas.onmouseup = endDraw;
    canvas.onmouseleave = endDraw;

    canvas.ontouchstart = (e) => {
        e.preventDefault();
        startDraw(e.touches[0], canvas, drawHandler);
    };
    canvas.ontouchmove = (e) => {
        e.preventDefault();
        draw(e.touches[0], canvas, drawHandler);
    };
    canvas.ontouchend = endDraw;
}

function getCanvasCoords(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

function startDraw(e, canvas, handler) {
    isDrawing = true;
    const coords = getCanvasCoords(e, canvas);
    lastX = coords.x;
    lastY = coords.y;
    handler(coords.x, coords.y, true);
    createParticle(e.clientX, e.clientY);
}

function draw(e, canvas, handler) {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e, canvas);
    handler(coords.x, coords.y, false);
    lastX = coords.x;
    lastY = coords.y;

    if (Math.random() > 0.7) {
        createParticle(e.clientX, e.clientY);
    }
}

function endDraw() {
    isDrawing = false;
}

// ========== モード切り替え ==========
function startMode(mode) {
    currentMode = mode;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`${mode}-screen`).classList.add('active');

    playSound('start');

    setTimeout(() => {
        if (mode === 'lines') {
            linesCurrentStage = 0;
            linesClearedCount = 0;
            initLinesCanvas();
            setupLinesCanvas();
            updateLinesProgress();
        } else if (mode === 'hiragana') {
            hiraganaLevel = 1;
            hiraganaCurrentIndex = 0;
            generateHiraganaQuestions();
            initHiraganaCanvas();
            setupHiraganaCanvas();
            updateHiraganaProgress();
            updateHiraganaLevelTitle();
        }
    }, 100);
}

function goHome() {
    currentMode = null;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('main-menu').classList.add('active');
    playSound('pop');
}

// ========== せんつなぎ ==========
let linePathPoints = [];
let linesHasDrawn = false;
let linesCheckTimer = null;
let lineClearTriggered = false;

function setupLinesCanvas() {
    linesHasDrawn = false;
    lineClearTriggered = false;
    if (linesCheckTimer) clearTimeout(linesCheckTimer);
    linesCheckTimer = null;

    linesCtx.fillStyle = 'white';
    linesCtx.fillRect(0, 0, linesCanvas.width, linesCanvas.height);

    const stage = lineStages[linesCurrentStage];
    linePathPoints = [];

    // スケール調整
    const scaleX = linesCanvas.width / 400;
    const scaleY = linesCanvas.height / 400;

    linesCtx.setLineDash([10, 10]);
    linesCtx.strokeStyle = '#DDA0DD';
    linesCtx.lineWidth = 5;
    linesCtx.lineCap = 'round';

    if (stage.type === 'horizontal' || stage.type === 'vertical') {
        const sx = stage.start.x * scaleX;
        const sy = stage.start.y * scaleY;
        const ex = stage.end.x * scaleX;
        const ey = stage.end.y * scaleY;

        linesCtx.beginPath();
        linesCtx.moveTo(sx, sy);
        linesCtx.lineTo(ex, ey);
        linesCtx.stroke();
        linePathPoints = [{ x: sx, y: sy }, { x: ex, y: ey }];

        linesCtx.font = '40px serif';
        linesCtx.fillText('🐕', sx - 25, sy + 15);
        linesCtx.fillText('🍰', ex - 15, ey + 15);

    } else if (stage.type === 'zigzag') {
        const points = stage.points.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));
        linesCtx.beginPath();
        linesCtx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            linesCtx.lineTo(points[i].x, points[i].y);
        }
        linesCtx.stroke();
        linePathPoints = points;

        linesCtx.font = '40px serif';
        linesCtx.fillText('🐕', points[0].x - 25, points[0].y + 15);
        linesCtx.fillText('🍰', points[points.length - 1].x - 15, points[points.length - 1].y + 15);

    } else if (stage.type === 'spiral') {
        const cx = stage.center.x * scaleX;
        const cy = stage.center.y * scaleY;
        const maxR = stage.maxRadius * Math.min(scaleX, scaleY);

        linesCtx.beginPath();
        for (let angle = 0; angle < Math.PI * 6; angle += 0.1) {
            const r = (angle / (Math.PI * 6)) * maxR;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (angle === 0) {
                linesCtx.moveTo(x, y);
            } else {
                linesCtx.lineTo(x, y);
            }
            linePathPoints.push({ x, y });
        }
        linesCtx.stroke();

        linesCtx.font = '40px serif';
        linesCtx.fillText('🐕', cx - 20, cy + 15);
        const last = linePathPoints[linePathPoints.length - 1];
        linesCtx.fillText('🍰', last.x - 15, last.y + 15);
    }

    linesCtx.setLineDash([]);
}

function handleLinesDraw(x, y, isStart) {
    if (lineClearTriggered) return;

    linesHasDrawn = true;

    // 描いている間はタイマーをリセット
    if (linesCheckTimer) {
        clearTimeout(linesCheckTimer);
        linesCheckTimer = null;
    }

    linesCtx.beginPath();
    linesCtx.arc(x, y, 10, 0, Math.PI * 2);
    linesCtx.fillStyle = currentColor;
    linesCtx.fill();

    if (!isStart) {
        linesCtx.beginPath();
        linesCtx.moveTo(lastX, lastY);
        linesCtx.lineTo(x, y);
        linesCtx.strokeStyle = currentColor;
        linesCtx.lineWidth = 20;
        linesCtx.lineCap = 'round';
        linesCtx.stroke();
    }
}

// 線つなぎ描き終わり判定
function endLinesDraw() {
    if (!linesHasDrawn || lineClearTriggered) return;

    // 1.5秒後にさいてんちゅう画面を表示
    linesCheckTimer = setTimeout(() => {
        showLinesCheckingScreen();
    }, 1500);
}

function showLinesCheckingScreen() {
    lineClearTriggered = true;
    document.getElementById('checking').classList.remove('hidden');
    speak('さいてんちゅう');

    // 1.5秒後に正解！
    setTimeout(() => {
        document.getElementById('checking').classList.add('hidden');
        linesClearedCount++;
        showLinesCelebration();
    }, 1500);
}

function updateLinesProgress() {
    const progress = document.getElementById('lines-progress');
    let html = '';
    for (let i = 0; i < lineStages.length; i++) {
        html += `<span>${i < linesClearedCount ? '💗' : '🤍'}</span>`;
    }
    progress.innerHTML = html;
}

function showLinesCelebration() {
    updateLinesProgress();

    if (linesClearedCount >= lineStages.length) {
        // 全クリア
        document.getElementById('all-clear').classList.remove('hidden');
        playSound('fanfare');
        speak('ぜんぶクリア！すごーい！');
        createConfetti();
    } else {
        // 次へ
        document.getElementById('celebration-title').textContent = 'すごーい！✨';
        document.getElementById('celebration-sub').textContent = 'つぎの せんに いこう！';
        document.getElementById('next-btn').textContent = 'つぎへ ▶';
        document.getElementById('celebration').classList.remove('hidden');
        playSound('fanfare');
        speak('すごーい！');
        createConfetti();
    }
}

// ========== ひらがななぞり ==========
let currentHiragana = 'し';
let hiraganaHasDrawn = false;
let hiraganaCheckTimer = null;
let hiraganaCheckingInProgress = false;

function generateHiraganaQuestions() {
    let pool;
    if (hiraganaLevel === 1) pool = [...hiraganaLevel1];
    else if (hiraganaLevel === 2) pool = [...hiraganaLevel2];
    else pool = [...hiraganaLevel3];

    // シャッフルして5問選ぶ
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    hiraganaQuestions = pool.slice(0, 5);
    hiraganaCurrentIndex = 0;
}

function setupHiraganaCanvas() {
    currentHiragana = hiraganaQuestions[hiraganaCurrentIndex];
    hiraganaHasDrawn = false;
    hiraganaCheckingInProgress = false;
    if (hiraganaCheckTimer) clearTimeout(hiraganaCheckTimer);
    hiraganaCheckTimer = null;

    document.getElementById('current-hiragana').textContent = currentHiragana;

    hiraganaCtx.fillStyle = 'white';
    hiraganaCtx.fillRect(0, 0, hiraganaCanvas.width, hiraganaCanvas.height);

    // 薄いグレーでひらがなを描く（教科書体フォント）
    const fontSize = Math.min(hiraganaCanvas.width, hiraganaCanvas.height) * 0.7;
    hiraganaCtx.font = `600 ${fontSize}px 'Klee One', serif`;
    hiraganaCtx.textAlign = 'center';
    hiraganaCtx.textBaseline = 'middle';
    hiraganaCtx.fillStyle = '#EEE';
    hiraganaCtx.fillText(currentHiragana, hiraganaCanvas.width / 2, hiraganaCanvas.height / 2);

    // 点線で輪郭
    hiraganaCtx.strokeStyle = '#FFB6C1';
    hiraganaCtx.lineWidth = 3;
    hiraganaCtx.setLineDash([5, 5]);
    hiraganaCtx.strokeText(currentHiragana, hiraganaCanvas.width / 2, hiraganaCanvas.height / 2);
    hiraganaCtx.setLineDash([]);
}

function handleHiraganaDraw(x, y, isStart) {
    hiraganaHasDrawn = true;

    // 描いている間はタイマーをリセット
    if (hiraganaCheckTimer) {
        clearTimeout(hiraganaCheckTimer);
        hiraganaCheckTimer = null;
    }

    hiraganaCtx.beginPath();
    hiraganaCtx.arc(x, y, 12, 0, Math.PI * 2);
    hiraganaCtx.fillStyle = currentColor;
    hiraganaCtx.fill();

    if (!isStart) {
        hiraganaCtx.beginPath();
        hiraganaCtx.moveTo(lastX, lastY);
        hiraganaCtx.lineTo(x, y);
        hiraganaCtx.strokeStyle = currentColor;
        hiraganaCtx.lineWidth = 25;
        hiraganaCtx.lineCap = 'round';
        hiraganaCtx.stroke();
    }
}

// ひらがな描き終わり判定
function endHiraganaDraw() {
    if (!hiraganaHasDrawn || hiraganaCheckingInProgress) return;

    // 1.5秒後にさいてんちゅう画面を表示
    hiraganaCheckTimer = setTimeout(() => {
        showCheckingScreen();
    }, 1500);
}

function showCheckingScreen() {
    if (hiraganaCheckingInProgress) return;
    hiraganaCheckingInProgress = true;

    document.getElementById('checking').classList.remove('hidden');
    speak('さいてんちゅう');

    // 1.5秒後に正解！
    setTimeout(() => {
        document.getElementById('checking').classList.add('hidden');
        speak(currentHiragana);
        setTimeout(() => showHiraganaCelebration(), 500);
    }, 1500);
}

function updateHiraganaProgress() {
    const progress = document.getElementById('hiragana-progress');
    let html = '';
    for (let i = 0; i < 5; i++) {
        html += `<span>${i < hiraganaCurrentIndex ? '💗' : '🤍'}</span>`;
    }
    progress.innerHTML = html;
}

function updateHiraganaLevelTitle() {
    const titles = ['', 'レベル１ 🌟', 'レベル２ 🌟🌟', 'レベル３ 🌟🌟🌟'];
    document.getElementById('hiragana-level-title').textContent = titles[hiraganaLevel];
}

function showHiraganaCelebration() {
    hiraganaCurrentIndex++;
    updateHiraganaProgress();

    if (hiraganaCurrentIndex >= 5) {
        // レベルクリア
        if (hiraganaLevel >= 3) {
            // 全レベルクリア
            document.getElementById('all-clear').classList.remove('hidden');
            playSound('fanfare');
            speak('ぜんぶクリア！すごーい！');
            createConfetti();
        } else {
            // 次のレベルへ
            document.getElementById('celebration-title').textContent = `レベル${hiraganaLevel} クリア！🎉`;
            document.getElementById('celebration-sub').textContent = 'つぎの レベルに いこう！';
            document.getElementById('next-btn').textContent = `レベル${hiraganaLevel + 1}へ ▶`;
            document.getElementById('next-btn').onclick = () => {
                hiraganaLevel++;
                hiraganaCurrentIndex = 0;
                generateHiraganaQuestions();
                updateHiraganaProgress();
                updateHiraganaLevelTitle();
                setupHiraganaCanvas();
                document.getElementById('celebration').classList.add('hidden');
                playSound('start');
            };
            document.getElementById('celebration').classList.remove('hidden');
            playSound('fanfare');
            speak(`レベル${hiraganaLevel}クリア！`);
            createConfetti();
        }
    } else {
        // 次の文字へ
        document.getElementById('celebration-title').textContent = 'すごーい！✨';
        document.getElementById('celebration-sub').textContent = `「${currentHiragana}」ができたね！`;
        document.getElementById('next-btn').textContent = 'つぎへ ▶';
        document.getElementById('next-btn').onclick = () => nextStage();
        document.getElementById('celebration').classList.remove('hidden');
        playSound('fanfare');
        speak('すごーい！');
        createConfetti();
    }
}

// ========== 共通 ==========
function nextStage() {
    document.getElementById('celebration').classList.add('hidden');

    if (currentMode === 'lines') {
        linesCurrentStage++;
        setupLinesCanvas();
    } else if (currentMode === 'hiragana') {
        setupHiraganaCanvas();
    }

    playSound('start');
}

// ========== パーティクル ==========
function createParticle(x, y) {
    const particles = ['✨', '⭐', '💖', '🌟'];
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = particles[Math.floor(Math.random() * particles.length)];
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.setProperty('--tx', (Math.random() - 0.5) * 100 + 'px');
    particle.style.setProperty('--ty', (Math.random() - 0.5) * 100 - 50 + 'px');
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1000);
}

function createConfetti() {
    const colors = ['#FF69B4', '#87CEEB', '#DDA0DD', '#FFD700'];
    for (let i = 0; i < 15; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-20px';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.borderRadius = '50%';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 2000);
    }
}

// ========== 音声・効果音 ==========
function initAudioContext() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('AudioContext not supported');
        }
    }
}

function playSound(type) {
    initAudioContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start();
        osc.stop(now + 0.15);
    } else if (type === 'start') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        osc.frequency.setValueAtTime(784, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start();
        osc.stop(now + 0.4);
    } else if (type === 'fanfare') {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, now + i * 0.15);
            g.gain.setValueAtTime(0.1, now + i * 0.15);
            g.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.3);
            o.start(now + i * 0.15);
            o.stop(now + i * 0.15 + 0.3);
        });
    }
}

function speak(text) {
    if (synth.speaking) synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ja-JP';
    utter.pitch = 1.3;
    utter.rate = 0.9;
    synth.speak(utter);
}
