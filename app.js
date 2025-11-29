// Timer State
const state = {
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    remainingSeconds: 0,
    isRunning: false,
    intervalId: null,
    startTime: null,
    pausedTime: null,
    animationFrameId: null
};

// DOM Elements
const homePage = document.getElementById('home-page');
const timerPage = document.getElementById('timer-page');
const hoursDisplay = document.getElementById('hours-display');
const minutesDisplay = document.getElementById('minutes-display');
const secondsDisplay = document.getElementById('seconds-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const pauseIcon = document.getElementById('pause-icon');
const homeBtn = document.getElementById('home-btn');
const timerTime = document.getElementById('timer-time');
const progressCircle = document.getElementById('progress-ring-circle');

// Progress ring constants
const CIRCUMFERENCE = 2 * Math.PI * 90;

// Initialize
function init() {
    // Set up progress ring
    progressCircle.style.strokeDasharray = CIRCUMFERENCE;
    progressCircle.style.strokeDashoffset = 0;
    
    // Event listeners for adjustment buttons
    document.querySelectorAll('.btn-adjust').forEach(btn => {
        btn.addEventListener('click', handleAdjust);
    });
    
    // Start button
    startBtn.addEventListener('click', startTimer);
    
    // Pause button
    pauseBtn.addEventListener('click', togglePause);
    
    // Home button
    homeBtn.addEventListener('click', goHome);
    
    // Update start button state
    updateStartButton();
}

// Handle time adjustment
function handleAdjust(e) {
    const button = e.currentTarget;
    const unit = button.dataset.unit;
    const amount = parseInt(button.dataset.amount);
    
    switch(unit) {
        case 'hours':
            state.hours = Math.max(0, Math.min(99, state.hours + amount));
            hoursDisplay.textContent = padZero(state.hours);
            break;
        case 'minutes':
            state.minutes = Math.max(0, Math.min(59, state.minutes + amount));
            minutesDisplay.textContent = padZero(state.minutes);
            break;
        case 'seconds':
            state.seconds = Math.max(0, Math.min(59, state.seconds + amount));
            secondsDisplay.textContent = padZero(state.seconds);
            break;
    }
    
    updateStartButton();
}

// Pad number with zero
function padZero(num) {
    return num.toString().padStart(2, '0');
}

// Update start button state
function updateStartButton() {
    const totalTime = state.hours * 3600 + state.minutes * 60 + state.seconds;
    startBtn.disabled = totalTime === 0;
}

// Start timer
function startTimer() {
    state.totalSeconds = state.hours * 3600 + state.minutes * 60 + state.seconds;
    state.remainingSeconds = state.totalSeconds;
    
    if (state.totalSeconds === 0) return;
    
    // Switch to timer page
    homePage.classList.remove('active');
    timerPage.classList.add('active');
    
    // Update display
    updateTimerDisplay();
    updateProgressSmooth(state.remainingSeconds);
    
    // Start countdown
    state.isRunning = true;
    state.startTime = Date.now();
    state.pausedTime = null;
    pauseIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    
    // Start animation loop for smooth progress
    startAnimationLoop();
}

// Start animation loop for smooth progress
function startAnimationLoop() {
    function animate() {
        if (!state.isRunning) return;
        
        const elapsed = (Date.now() - state.startTime) / 1000;
        const remaining = Math.max(0, state.totalSeconds - elapsed);
        
        // Update progress ring continuously
        updateProgressSmooth(remaining);
        
        // Update display every second
        const newRemainingSeconds = Math.ceil(remaining);
        if (newRemainingSeconds !== state.remainingSeconds) {
            state.remainingSeconds = newRemainingSeconds;
            updateTimerDisplay();
            
            if (state.remainingSeconds <= 0) {
                stopTimer();
                timerComplete();
                return;
            }
        }
        
        state.animationFrameId = requestAnimationFrame(animate);
    }
    
    state.animationFrameId = requestAnimationFrame(animate);
}

// Update progress ring smoothly
function updateProgressSmooth(remaining) {
    const progress = remaining / state.totalSeconds;
    const offset = CIRCUMFERENCE * (1 - progress);
    progressCircle.style.strokeDashoffset = offset;
}

// Update timer display
function updateTimerDisplay() {
    const hours = Math.floor(state.remainingSeconds / 3600);
    const minutes = Math.floor((state.remainingSeconds % 3600) / 60);
    const seconds = state.remainingSeconds % 60;
    
    timerTime.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

// Toggle pause/resume
function togglePause() {
    if (state.remainingSeconds <= 0) {
        // If timer is complete, restart
        state.remainingSeconds = state.totalSeconds;
        state.isRunning = true;
        state.startTime = Date.now();
        state.pausedTime = null;
        pauseIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        startAnimationLoop();
    } else if (state.isRunning) {
        // Pause
        state.isRunning = false;
        state.pausedTime = Date.now();
        pauseIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>';
        if (state.animationFrameId) {
            cancelAnimationFrame(state.animationFrameId);
            state.animationFrameId = null;
        }
    } else {
        // Resume - adjust start time to account for pause duration
        const pauseDuration = Date.now() - state.pausedTime;
        state.startTime += pauseDuration;
        state.isRunning = true;
        pauseIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        startAnimationLoop();
    }
}

// Stop timer
function stopTimer() {
    state.isRunning = false;
    pauseIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>';
    if (state.intervalId) {
        clearInterval(state.intervalId);
        state.intervalId = null;
    }
    if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
    }
}

// Timer complete - play notification
function timerComplete() {
    // Vibrate if supported
    if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // Change progress ring color to indicate completion
    const COMPLETION_INDICATOR_DURATION = 3000;
    progressCircle.style.stroke = '#4caf50';
    setTimeout(() => {
        progressCircle.style.stroke = '';
    }, COMPLETION_INDICATOR_DURATION);
}

// Go back to home
function goHome() {
    stopTimer();
    
    // Reset progress ring
    progressCircle.style.strokeDashoffset = 0;
    
    // Switch pages
    timerPage.classList.remove('active');
    homePage.classList.add('active');
}

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .catch(() => {
                // Service worker registration failed - app will work without offline support
            });
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', init);
