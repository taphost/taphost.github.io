// Add this at the top of your script, after other variable declarations
let buttonClickSound = new Audio('sounds/buttonclick.opus');
let criticalWarningSound = new Audio('sounds/bip.opus');

// Modify the existing click handler to play sound
document.querySelectorAll('.control-option').forEach(option => {
  option.addEventListener('click', function() {
    // Play button click sound
    buttonClickSound.currentTime = 0; // Reset to start to allow rapid clicking
    buttonClickSound.play().catch(error => {
      console.warn('Error playing button click sound:', error);
    });

    // Deselect all options in the same group
    const optionsGroup = this.parentElement;
    optionsGroup.querySelectorAll('.control-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    
    // Select the clicked option
    this.classList.add('selected');
    
    // Check if TEST mode was selected
    if (this.getAttribute('data-value') === 'TEST' && 
        optionsGroup.id === 'iff-status-options') {
      runTestSequence();
    } else if (optionsGroup.id === 'target-select-options') {
      // Handle scan line color change based on target select
      updateScanLineColor(this.getAttribute('data-value'));
    } else {
      // Otherwise simulate engagement based on selected options
      simulateEngagement();
    }
  });
});

// Update the CSS for LCD grid and scan line
const scanLine = document.querySelector('.scan-line');

// Function to update scan line color based on Target Select
function updateScanLineColor(targetSelect) {
  const scanLine = document.querySelector('.scan-line');
  
  switch(targetSelect) {
    case "INFRA RED":
      scanLine.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
      scanLine.style.display = 'block'; // Ensure visible
      break;
    case "UV":
      scanLine.style.backgroundColor = 'rgba(138, 43, 226, 0.3)'; // Violet color
      scanLine.style.display = 'block'; // Ensure visible
      break;
    default: // MULTI SPEC
      scanLine.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'; // Yellow (default)
      scanLine.style.display = 'block'; // Ensure visible
      break;
  }
}


// Function to handle Spectral Profile selection
function handleSpectralProfileSelection() {
  document.querySelectorAll('#spectral-profile-options .control-option').forEach(option => {
    option.addEventListener('click', function() {
      const spectralProfile = this.getAttribute('data-value');
      const scanLine = document.querySelector('.scan-line');
      
      // Toggle scan line visibility based on selection
      if (spectralProfile === "INERT") {
        scanLine.style.display = 'none'; // Hide scan line
      } else if (spectralProfile === "BIO") {
        scanLine.style.display = 'block'; // Show scan line
        
        // Apply current color based on target select
        const currentTargetSelect = document.querySelector('#target-select-options .selected').getAttribute('data-value');
        updateScanLineColor(currentTargetSelect);
      }
    });
  });
}

// Call the new function to initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize existing audio elements
  /* ... existing code ... */
  
  // Initialize the spectral profile handlers
  handleSpectralProfileSelection();
});


// System variables
let rounds = 500;
let time = 33.33;
let tempLevel = 30;
let rxmLevel = 0;
let firingInterval;
let criticalWarningInterval;
let isWarningActive = false;
let currentRound = rounds;
let targetRound = rounds;
let currentTime = time;
let targetTime = time;
let inTestMode = false;
let isPaused = false; // Flag for paused countdown

// Function to format time as "09.09", "08.88", etc.
function formatTime(time) {
  let seconds = Math.floor(time); // Get the whole seconds part
  let centiseconds = Math.floor((time - seconds) * 100); // Get the decimal part (hundredths of seconds)

  // Ensure seconds are always two digits (e.g., 09 instead of 9)
  let formattedSeconds = seconds < 10 ? '0' + seconds : seconds;
  let formattedCentiseconds = centiseconds < 10 ? '0' + centiseconds : centiseconds;
  
  return `${formattedSeconds}.${formattedCentiseconds}`;
}

function runTestSequence() {
  // Prevent multiple test sequences from running simultaneously
  if (inTestMode) return;
  inTestMode = true;
  
  // Save original values to restore after test
  const originalRounds = document.getElementById('rounds-value').textContent;
  const originalTime = document.getElementById('time-value').textContent;
  const originalTempLevel = tempLevel;
  const originalRxmLevel = rxmLevel;
  
  // Stop any ongoing firing or critical warning
  if (firingInterval) clearInterval(firingInterval);
  deactivateCriticalWarning();
  
  // 1. Make the rounds and time values blink
  const roundsValue = document.getElementById('rounds-value');
  const timeValue = document.getElementById('time-value');
  roundsValue.classList.add('blinking');
  timeValue.classList.add('blinking');
  
  // 2. Animate the gauges to max and then back
  let gaugeAnimStep = 0;
  const gaugeAnimInterval = setInterval(() => {
    gaugeAnimStep++;
    if (gaugeAnimStep <= 10) {
      // Increasing phase
      tempLevel = Math.min(originalTempLevel + (gaugeAnimStep * 7), 100);
      rxmLevel = Math.min(gaugeAnimStep * 10, 100);
    } else if (gaugeAnimStep <= 20) {
      // Decreasing phase
      tempLevel = Math.max(100 - ((gaugeAnimStep - 10) * 7), originalTempLevel);
      rxmLevel = Math.max(100 - ((gaugeAnimStep - 10) * 10), originalRxmLevel);
    }
    updateGauges();
  }, 150);
  
  // 3. Show TESTING message in critical warning box
  const criticalWarning = document.getElementById('critical-warning');
  const criticalText = document.getElementById('critical-text');
  criticalText.textContent = "TESTING";
  criticalWarning.style.display = 'block';
  
  // After 3 seconds, complete the test
  setTimeout(() => {
    // Stop the blinking and animations
    clearInterval(gaugeAnimInterval);
    
    // Show COMPLETE message for 1 second
    criticalText.textContent = "COMPLETE";
    criticalText.style.backgroundColor = '#ffff00';
    criticalText.style.color = '#000';
    
    // After 1 second, hide the warning and reset everything
    setTimeout(() => {
      criticalWarning.style.display = 'none';
      roundsValue.classList.remove('blinking');
      timeValue.classList.remove('blinking');
      
      // Restore original values
      roundsValue.textContent = originalRounds;
      timeValue.textContent = originalTime;
      tempLevel = originalTempLevel;
      rxmLevel = originalRxmLevel;
      updateGauges();
      
      // Fix: Reset IFF status to SEARCH properly by first removing the 'selected' 
      // class from ALL options including TEST before adding it to SEARCH
      document.querySelectorAll('#iff-status-options .control-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      document.querySelector('#iff-status-options [data-value="SEARCH"]').classList.add('selected');
      
      inTestMode = false;
    }, 1000);
  }, 3000);
}

function getFireRate() {
  const targetProfile = document.querySelector('#target-profile-options .selected').getAttribute('data-value');
  
  switch(targetProfile) {
    case "SOFT":
      // Single shot with a noticeable delay between rounds
      return { 
        fireInterval: 500, // 0.5 seconds per shot
        burstSize: 1,
        pauseAfterBurst: 0
      };
    case "STANDARD":
      // Burst of three shots followed by a pause
      return {
        fireInterval: 100, // 0.1 seconds between shots in the burst
        burstSize: 3,
        pauseAfterBurst: 200 // 0.2 seconds pause after each burst
      };
    case "HARD":
      // Continuous full auto mode
      return {
        fireInterval: 50, // Fastest firing rate
        burstSize: Infinity, // No limit to burst size; continuous firing
        pauseAfterBurst: 0
      };
    default:
      // Default behavior if none match
      return { 
        fireInterval: 300,
        burstSize: 1,
        pauseAfterBurst: 0
      };
  }
}

// Simulate an engagement scenario
function simulateEngagement() {
  const weaponStatus = document.querySelector('#weapon-status-options .selected').getAttribute('data-value');
  const iffStatus = document.querySelector('#iff-status-options .selected').getAttribute('data-value');
  
  // Update state based on weapon status and IFF status
  if (weaponStatus === "ARMED" && iffStatus === "ENGAGED") {
    tempLevel = 60;
    updateGauges();
    
    // Resume or start firing
    isPaused = false;
    startFiring();
  } else if (weaponStatus === "SAFE") {
    // Pause firing if SAFE is selected
    stopFiring();
    isPaused = true;
    
    // Reset IFF status to SEARCH when SAFE is selected
    document.querySelectorAll('#iff-status-options .control-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    document.querySelector('#iff-status-options [data-value="SEARCH"]').classList.add('selected');
    
    rxmLevel = 0;
    tempLevel = 30;
    updateGauges();
  } else {
    // If weapon is ARMED but not ENGAGED
    stopFiring();
    isPaused = true;
    
    rxmLevel = 0;
    updateGauges();
  }
  
  // Update firing rate if necessary
  if (firingInterval && !isPaused) {
    clearInterval(firingInterval);
    startFiring();
  }
}

function startFiring() {
  if (firingInterval) clearInterval(firingInterval);
  
  // Set target values for countdown
  if (!isPaused) {
    targetRound = 0;
    targetTime = 0;
  }
  
  // Get the fire rate parameters based on Target Profile
  const fireParams = getFireRate();
  let shotCounter = 0;
  
  firingInterval = setInterval(() => {
    if (!isPaused && currentRound > targetRound) {
      currentRound--;
      currentTime = (33.33 * currentRound) / 500;
      
      // Update displayed values
      document.getElementById('rounds-value').textContent = currentRound;
      document.getElementById('time-value').textContent = formatTime(currentTime);
      
      // Gradually increase rxmLevel and tempLevel
      rxmLevel = Math.min(rxmLevel + 1, 100);
      tempLevel = Math.min(tempLevel + 0.5, 90);
      updateGauges();
      
      // Check if CRITICAL warning should be shown
      checkCriticalStatus();
      
      // Increment shot counter
      shotCounter++;
      
      // If burst size is reached, pause before next shots
      if (shotCounter >= fireParams.burstSize && fireParams.pauseAfterBurst > 0) {
        clearInterval(firingInterval);
        setTimeout(() => {
          startFiring();
        }, fireParams.pauseAfterBurst);
        shotCounter = 0;
      }
    }
    
    if (currentRound <= 0) {
      currentRound = 0;
      document.getElementById('rounds-value').textContent = "0";
      document.getElementById('time-value').textContent = formatTime(0);
      stopFiring();
      
      // Set weapon status to SAFE
      document.querySelectorAll('#weapon-status-options .control-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      document.querySelector('#weapon-status-options [data-value="SAFE"]').classList.add('selected');
      
      // Reset IFF status to SEARCH
      document.querySelectorAll('#iff-status-options .control-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      document.querySelector('#iff-status-options [data-value="SEARCH"]').classList.add('selected');
    }
  }, fireParams.fireInterval);
}

function stopFiring() {
  if (firingInterval) clearInterval(firingInterval);
  
  let cooldownInterval = setInterval(() => {
    tempLevel = Math.max(tempLevel - 5, 30);
    rxmLevel = Math.max(rxmLevel - 10, 0);
    updateGauges();
    
    if (tempLevel <= 30 && rxmLevel <= 0) {
      clearInterval(cooldownInterval);
    }
  }, 500);
  
  // Deactivate warning if zero rounds
  if (currentRound <= 0) {
    deactivateCriticalWarning();
  }
}

function updateGauges() {
  document.getElementById('temp-gauge').style.height = tempLevel + '%';
  document.getElementById('rxm-gauge').style.height = rxmLevel + '%';
}

// Function to check critical status
function checkCriticalStatus() {
  if (currentRound <= 100 && currentRound > 0) {
    activateCriticalWarning();
  } else if (currentRound <= 0) {
    deactivateCriticalWarning();
  }
}

// Activate CRITICAL warning
function activateCriticalWarning() {
  const warningBox = document.getElementById('critical-warning');
  const criticalText = document.getElementById('critical-text');
  
  if (isWarningActive) return;
  isWarningActive = true;
  
  // Play critical warning sound in loop
  criticalWarningSound.currentTime = 0;
  criticalWarningSound.loop = true;  // Imposta il loop
  criticalWarningSound.play().catch(error => {
  console.warn('Error playing critical warning sound:', error);
});
  
  
  
  // Set initial text to "CRITICAL"
  criticalText.textContent = "CRITICAL";
  warningBox.style.display = 'block';
}

// Deactivate CRITICAL warning
function deactivateCriticalWarning() {
  document.getElementById('critical-warning').style.display = 'none';
  isWarningActive = false;
  
  criticalWarningSound.loop = false; // Disattiva il loop
  criticalWarningSound.pause();  // Ferma il suono
  criticalWarningSound.currentTime = 0; // Resetta il suono se necessario
  
}




// Initialize scan line color based on default target select
updateScanLineColor(document.querySelector('#target-select-options .selected').getAttribute('data-value'));

// Add audio elements to HTML if they don't exist
document.addEventListener('DOMContentLoaded', function() {
  // Add the critical warning sound if it doesn't exist
  if (!document.getElementById('critical-warning-sound')) {
    const criticalSoundElement = document.createElement('audio');
    criticalSoundElement.id = 'critical-warning-sound';
    criticalSoundElement.src = 'sounds/bip.opus';
    criticalSoundElement.preload = 'auto';
    document.body.appendChild(criticalSoundElement);
  }
});
