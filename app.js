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
    animationFrameId: null,
    lastMillisecondUpdate: 0
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
const resetBtn = document.getElementById('reset-btn');
const timerTime = document.getElementById('timer-time');
const timerPercentage = document.getElementById('timer-percentage');
const progressCircle = document.getElementById('progress-ring-circle');

// Progress ring constants
const CIRCUMFERENCE = 2 * Math.PI * 90;

// LocalStorage constants
/** @const {string} STORAGE_KEY - The localStorage key for storing timer configuration history */
const STORAGE_KEY = 'timer-history';
/** @const {number} MAX_HISTORY - Maximum number of configurations to keep (current + 3 previous for shortcuts) */
const MAX_HISTORY = 4;

// SVG Icons
const PAUSE_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
const PLAY_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>';

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
    
    // Reset button
    resetBtn.addEventListener('click', resetTimer);
    
    // Shortcut buttons
    document.querySelectorAll('.btn-shortcut').forEach(btn => {
        btn.addEventListener('click', handleShortcutClick);
    });
    
    // Load last used configuration
    loadLastConfiguration();
    
    // Update shortcut buttons
    updateShortcutButtons();
    
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
    
    // Save configuration to history
    saveConfiguration();
    
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
    pauseIcon.innerHTML = PAUSE_ICON;
    
    // Start animation loop for smooth progress
    startAnimationLoop();
}

// Start animation loop for smooth progress
function startAnimationLoop() {
    function animate() {
        if (!state.isRunning) return;
        
        const now = Date.now();
        const elapsed = (now - state.startTime) / 1000;
        const remaining = Math.max(0, state.totalSeconds - elapsed);
        
        // Update progress ring continuously
        updateProgressSmooth(remaining);
        
        // Check if timer has completed
        if (remaining <= 0) {
            // Force final display update to show 00.0
            state.remainingSeconds = 0;
            updateTimerDisplay();
            stopTimer();
            timerComplete();
            return;
        }
        
        // Check if we need to show milliseconds (only seconds, no minutes or hours)
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const showMilliseconds = hours === 0 && minutes === 0;
        
        if (showMilliseconds) {
            // Update tenth-second display at ~60fps (every 16ms) for smooth visualization
            if (now - state.lastMillisecondUpdate >= 16) {
                state.remainingSeconds = remaining;
                updateTimerDisplay();
                state.lastMillisecondUpdate = now;
            }
        } else {
            // Update display every second for minutes/hours
            const newRemainingSeconds = Math.ceil(remaining);
            if (newRemainingSeconds !== Math.ceil(state.remainingSeconds)) {
                state.remainingSeconds = remaining;
                updateTimerDisplay();
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
    const seconds = Math.floor(state.remainingSeconds % 60);
    
    // Show only significant digits
    let timeHTML;
    if (hours > 0) {
        timeHTML = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    } else if (minutes > 0) {
        timeHTML = `${padZero(minutes)}:${padZero(seconds)}`;
    } else {
        // When only seconds, show tenths of a second with 1 decimal place in smaller font
        const secondsWithMillis = Math.max(0, state.remainingSeconds % 60);
        const wholePart = Math.floor(secondsWithMillis);
        const tenths = Math.min(9, Math.floor((secondsWithMillis - wholePart) * 10));
        timeHTML = `${padZero(wholePart)}<span class="timer-millis">.${tenths}</span>`;
    }
    
    timerTime.innerHTML = timeHTML;
    
    // Update percentage
    const percentage = state.totalSeconds > 0 
        ? Math.round((1 - state.remainingSeconds / state.totalSeconds) * 100)
        : 0;
    timerPercentage.textContent = `${percentage}%`;
}

// Toggle pause/resume
function togglePause() {
    if (state.remainingSeconds <= 0) {
        // If timer is complete, restart
        state.remainingSeconds = state.totalSeconds;
        state.isRunning = true;
        state.startTime = Date.now();
        state.pausedTime = null;
        pauseIcon.innerHTML = PAUSE_ICON;
        // Reset progress ring color to default (may have been set to green on completion)
        progressCircle.style.stroke = '';
        startAnimationLoop();
    } else if (state.isRunning) {
        // Pause
        state.isRunning = false;
        state.pausedTime = Date.now();
        pauseIcon.innerHTML = PLAY_ICON;
        if (state.animationFrameId) {
            cancelAnimationFrame(state.animationFrameId);
            state.animationFrameId = null;
        }
    } else {
        // Resume - adjust start time to account for pause duration
        const pauseDuration = Date.now() - state.pausedTime;
        state.startTime += pauseDuration;
        state.isRunning = true;
        pauseIcon.innerHTML = PAUSE_ICON;
        startAnimationLoop();
    }
}

// Stop timer
function stopTimer() {
    state.isRunning = false;
    pauseIcon.innerHTML = PLAY_ICON;
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
    
    // Update shortcut buttons
    updateShortcutButtons();
    
    // Switch pages
    timerPage.classList.remove('active');
    homePage.classList.add('active');
}

// Reset timer to original time
function resetTimer() {
    // Stop any running timer
    stopTimer();
    
    // Reset to original total time
    state.remainingSeconds = state.totalSeconds;
    
    // Reset timing state so resume starts from beginning
    // Both values set to now so that togglePause() calculates zero pause duration
    state.startTime = Date.now();
    state.pausedTime = Date.now();
    
    // Update display
    updateTimerDisplay();
    updateProgressSmooth(state.remainingSeconds);
    
    // Reset progress ring color to default (may have been set to green on completion)
    progressCircle.style.stroke = '';
    
    // Set icon to play (paused state)
    pauseIcon.innerHTML = PLAY_ICON;
}

// LocalStorage functions for configuration history
/**
 * Saves the current timer configuration to localStorage history
 * Configurations are stored with timestamp, most recent first
 * Duplicate consecutive configurations update timestamp only
 */
function saveConfiguration() {
    const config = {
        hours: state.hours,
        minutes: state.minutes,
        seconds: state.seconds,
        timestamp: Date.now()
    };
    
    // Skip if configuration is zero
    if (config.hours === 0 && config.minutes === 0 && config.seconds === 0) {
        return;
    }
    
    let history = getConfigurationHistory();
    
    // Check if this exact configuration is already at the top
    if (history.length > 0) {
        const last = history[0];
        if (last.hours === config.hours && 
            last.minutes === config.minutes && 
            last.seconds === config.seconds) {
            // Update timestamp but keep it at the top
            history[0].timestamp = config.timestamp;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
            return;
        }
    }
    
    // Add new configuration to the beginning
    history.unshift(config);
    
    // Keep only the last MAX_HISTORY configurations
    if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/**
 * Retrieves the configuration history from localStorage
 * @returns {Array<{hours: number, minutes: number, seconds: number, timestamp: number}>} Array of configuration objects, empty array on error
 */
function getConfigurationHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

/**
 * Loads the most recent configuration from history and updates the display
 */
function loadLastConfiguration() {
    const history = getConfigurationHistory();
    if (history.length > 0) {
        const last = history[0];
        applyConfiguration(last);
    }
}

/**
 * Applies a configuration to the timer state and updates the display
 * @param {{hours: number, minutes: number, seconds: number}} config - Configuration to apply
 */
function applyConfiguration(config) {
    state.hours = config.hours;
    state.minutes = config.minutes;
    state.seconds = config.seconds;
    
    hoursDisplay.textContent = padZero(state.hours);
    minutesDisplay.textContent = padZero(state.minutes);
    secondsDisplay.textContent = padZero(state.seconds);
    
    updateStartButton();
}

/**
 * Updates the shortcut buttons with the 3 most recent configurations (excluding current)
 * Shortcuts are always visible and sorted in ascending order (shortest to longest)
 * If insufficient history exists, default values are used: 1m, 10m, 20m
 */
function updateShortcutButtons() {
    // Default configurations in ascending order
    const defaultConfigs = [
        { hours: 0, minutes: 1, seconds: 0 },   // 1m
        { hours: 0, minutes: 10, seconds: 0 },  // 10m
        { hours: 0, minutes: 20, seconds: 0 }   // 20m
    ];
    
    const history = getConfigurationHistory();
    
    // Get the 3 previous configurations (skip the first one which is current)
    let shortcuts = history.slice(1, 4);
    
    // Convert to total seconds for sorting
    const toSeconds = (config) => config.hours * 3600 + config.minutes * 60 + config.seconds;
    
    // Sort in ascending order (shortest to longest)
    shortcuts.sort((a, b) => toSeconds(a) - toSeconds(b));
    
    // Fill with defaults if we don't have enough shortcuts
    for (let i = shortcuts.length; i < 3; i++) {
        shortcuts.push(defaultConfigs[i]);
    }
    
    // Update each shortcut button
    for (let i = 0; i < 3; i++) {
        const btn = document.getElementById(`shortcut-${i + 1}`);
        if (btn) {
            const config = shortcuts[i];
            const timeStr = formatConfigurationTime(config);
            btn.textContent = timeStr;
            btn.dataset.hours = config.hours;
            btn.dataset.minutes = config.minutes;
            btn.dataset.seconds = config.seconds;
        }
    }
}

/**
 * Formats a configuration time as a compact string
 * @param {{hours: number, minutes: number, seconds: number}} config - Configuration to format
 * @returns {string} Formatted time string (e.g., "1h 5m 30s", "2m", "45s")
 */
function formatConfigurationTime(config) {
    const parts = [];
    if (config.hours > 0) {
        parts.push(`${config.hours}h`);
    }
    if (config.minutes > 0) {
        parts.push(`${config.minutes}m`);
    }
    if (config.seconds > 0) {
        parts.push(`${config.seconds}s`);
    }
    return parts.length > 0 ? parts.join(' ') : '0s';
}

/**
 * Handles click events on shortcut buttons
 * Loads the configuration stored in the button's data attributes
 * @param {Event} e - Click event with currentTarget being the button element
 */
function handleShortcutClick(e) {
    const button = e.currentTarget;
    const config = {
        hours: parseInt(button.dataset.hours) || 0,
        minutes: parseInt(button.dataset.minutes) || 0,
        seconds: parseInt(button.dataset.seconds) || 0
    };
    applyConfiguration(config);
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
