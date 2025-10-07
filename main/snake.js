// --- Lấy đối tượng canvas và context để vẽ ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Cấu hình chung ---
const BOX = 20; // kích thước 1 ô vuông
const COLS = canvas.width / BOX;  // số cột trên canvas
const ROWS = canvas.height / BOX; // số hàng trên canvas

// --- Biến trạng thái game ---
let snake = [];            // mảng chứa từng phần thân rắn (mỗi phần có x, y)
let direction = 'RIGHT';   // hướng hiện tại
let nextDirection = direction; // hướng sắp tới (dùng để tránh quay ngược)
let food = null;           // tọa độ thức ăn
let score = 0;             // điểm hiện tại
let best = Number(localStorage.getItem('snake_best') || 0); // điểm cao nhất lưu local

// --- Lấy các phần tử DOM ---
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
bestEl.textContent = best;

const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnRestart = document.getElementById('btnRestart');

// --- Cấu hình tốc độ ---
const speedInit = 120;  // tốc độ ban đầu (ms)
let currentSpeed = speedInit;
const speedStepEvery = 5;  // mỗi 5 điểm giảm tốc độ
const speedDecrease = 10;  // giảm 10ms mỗi lần
const speedMin = 40;       // tốc độ nhanh nhất (giới hạn)

let gameIntervalId = null; // ID của vòng lặp setInterval
let running = false;       // cờ kiểm tra xem game đang chạy không

// ------------------------------------------------------------
// Hàm khởi tạo lại game
function initGame() {
    // Reset lại vị trí ban đầu của rắn ở giữa khung
    snake = [{ x: Math.floor(COLS/2) * BOX, y: Math.floor(ROWS/2) * BOX }];
    direction = 'RIGHT';
    nextDirection = direction;
    score = 0;
    currentSpeed = speedInit;

    // Tạo thức ăn ngẫu nhiên
    placeFood();

    // Cập nhật điểm hiển thị
    updateHUD();

    // Dừng vòng lặp hiện tại (nếu đang chạy)
    clearLoop();

    running = false;

    // Vẽ lại trạng thái ban đầu
    draw();
}

// ------------------------------------------------------------
// Tạo vị trí ngẫu nhiên cho thức ăn (không trùng thân rắn)
function placeFood() {
    while(true) {
        const fx = Math.floor(Math.random() * COLS) * BOX;
        const fy = Math.floor(Math.random() * ROWS) * BOX;

        // kiểm tra xem có trùng thân rắn không
        const collision = snake.some(seg => seg.x === fx && seg.y === fy);
        if(!collision) {
            food = { x: fx, y: fy };
            break;
        }
    }
}

// ------------------------------------------------------------
// Cập nhật giao diện điểm số
function updateHUD() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
}

// ------------------------------------------------------------
// Hàm vẽ rắn và thức ăn
function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // --- Vẽ thức ăn ---
    if(food) {
        ctx.fillStyle = '#ff4d4d';
        ctx.fillRect(food.x, food.y, BOX, BOX);
    }

    // --- Vẽ rắn ---
    for(let i=0;i<snake.length;i++){
        ctx.fillStyle = (i===0) ? '#0b8b3a' : '#6fe08b'; // đầu đậm hơn
        ctx.fillRect(snake[i].x, snake[i].y, BOX, BOX);
        ctx.strokeStyle = '#145c2f'; // viền đậm
        ctx.strokeRect(snake[i].x, snake[i].y, BOX, BOX);
    }
}

// ------------------------------------------------------------
// Kiểm tra va chạm với thân
function collisionWithBody(head) {
    for(let i=0;i<snake.length;i++){
        if(head.x === snake[i].x && head.y === snake[i].y) return true;
    }
    return false;
}

// ------------------------------------------------------------
// Cập nhật logic game mỗi lần tick (di chuyển, ăn, chết,...)
function update() {
    direction = nextDirection; // hướng mới

    let headX = snake[0].x;
    let headY = snake[0].y;

    if(direction === 'LEFT') headX -= BOX;
    if(direction === 'RIGHT') headX += BOX;
    if(direction === 'UP') headY -= BOX;
    if(direction === 'DOWN') headY += BOX;

    // --- Kiểm tra va vào tường ---
    if(headX < 0 || headX >= canvas.width || headY < 0 || headY >= canvas.height) {
        gameOver();
        return;
    }

    const newHead = { x: headX, y: headY };

    // --- Kiểm tra va vào thân ---
    if(collisionWithBody(newHead)) {
        gameOver();
        return;
    }

    // --- Kiểm tra ăn thức ăn ---
    if(food && newHead.x === food.x && newHead.y === food.y) {
        score += 1;

        // Cập nhật điểm cao nhất
        if(score > best) {
            best = score;
            localStorage.setItem('snake_best', best);
        }
        updateHUD();
        placeFood();
        adjustSpeed(); // tăng tốc độ nếu đủ điểm
    } else {
        // nếu không ăn, bỏ phần đuôi (di chuyển)
        snake.pop();
    }

    // Thêm đầu mới vào
    snake.unshift(newHead);

    // Vẽ lại toàn bộ
    draw();
}

// ------------------------------------------------------------
// Điều chỉnh tốc độ dựa vào điểm số
function adjustSpeed() {
    const steps = Math.floor(score / speedStepEvery);
    let newSpeed = speedInit - steps * speedDecrease;
    if(newSpeed < speedMin) newSpeed = speedMin;

    // Nếu tốc độ thay đổi thì restart vòng lặp
    if(newSpeed !== currentSpeed) {
        currentSpeed = newSpeed;
        if(running) restartLoop();
    }
}

// ------------------------------------------------------------
// Quản lý vòng lặp game
function startLoop() {
    if(running) return;
    running = true;
    gameIntervalId = setInterval(update, currentSpeed);
}

function clearLoop() {
    if(gameIntervalId) {
        clearInterval(gameIntervalId);
        gameIntervalId = null;
    }
    running = false;
}

function restartLoop() {
    clearLoop();
    startLoop();
}

// ------------------------------------------------------------
// Kết thúc game
function gameOver() {
    clearLoop();
    alert('Game Over! Điểm của bạn: ' + score);
    // Khi chết, chờ người chơi nhấn Enter để bắt đầu lại
    document.addEventListener('keydown', handleRestartKey);
}

// ------------------------------------------------------------
// Khi nhấn Enter sau khi chết thì restart game
function handleRestartKey(e) {
    if (e.key === 'Enter') {
        // Gỡ sự kiện để tránh gắn lặp lại
        document.removeEventListener('keydown', handleRestartKey);
        // Gọi hành động như nút Start
        btnStart.click();
    }
}

// ------------------------------------------------------------
// Xử lý phím điều khiển
document.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowUp' && direction !== 'DOWN') nextDirection = 'UP';
    if(e.key === 'ArrowDown' && direction !== 'UP') nextDirection = 'DOWN';
    if(e.key === 'ArrowLeft' && direction !== 'RIGHT') nextDirection = 'LEFT';
    if(e.key === 'ArrowRight' && direction !== 'LEFT') nextDirection = 'RIGHT';

    // --- Space để pause / resume nhanh ---
    if(e.key === ' ') {
        e.preventDefault();
        if(running) clearLoop();
        else startLoop();
    }

    // --- Enter cũng có thể Restart ---
    if(e.key === 'Enter' && !running) {
        e.preventDefault();
        btnRestart.click(); // Giống như bấm nút Restart
    }
});

// ------------------------------------------------------------
// Các nút bấm giao diện
btnStart.addEventListener('click', () => {
    if(!running) startLoop();
});
btnPause.addEventListener('click', () => {
    if(running) clearLoop();
});
btnRestart.addEventListener('click', () => {
    initGame();
    startLoop();
});

// ------------------------------------------------------------
// Khởi tạo ban đầu
initGame();
