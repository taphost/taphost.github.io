/**
 * JEDI - Armi e Controllo Sistema 
 * Script principale per l'interfaccia di controllo del sistema d'arma
 */

// =============================================
// COSTANTI E CONFIGURAZIONE GLOBALE
// =============================================
const CONFIG = {
  DEFAULT_ROUNDS: 500,
  DEFAULT_TIME: 33.33,
  DEFAULT_TEMP_LEVEL: 30,
  DEFAULT_RXM_LEVEL: 0,
  DEFAULT_SPECTRAL_PROFILE: "BIO",
  LOW_AMMO_THRESHOLD: 100,
  GAUGE_UPDATE_INTERVAL: 500, // ms
  TEST_SEQUENCE_DURATION: 3000, // ms
  TEST_COMPLETE_DISPLAY_TIME: 1000, // ms
};

// =============================================
// GESTIONE AUDIO
// =============================================
class AudioManager {
  constructor() {
    this.sounds = {
      buttonClick: new Audio('sounds/buttonclick.opus'),
      criticalWarning: new Audio('sounds/bip.opus'),
      gameOver: new Audio('sounds/gameover.opus'),
      // Spazio per futuri suoni
    };
    
    // Precarica tutti i suoni
    this._preloadSounds();
  }
  
  _preloadSounds() {
    Object.values(this.sounds).forEach(sound => {
      sound.preload = 'auto';
    });
  }
  
  playSound(soundName, options = {}) {
    const sound = this.sounds[soundName];
    if (!sound) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }
    
    // Reset audio to start
    sound.currentTime = 0;
    
    // Apply options
    if (options.loop !== undefined) sound.loop = options.loop;
    if (options.volume !== undefined) sound.volume = options.volume;
    
    // Play the sound
    sound.play().catch(error => {
      console.warn(`Error playing '${soundName}' sound:`, error);
    });
  }
  
  stopSound(soundName) {
    const sound = this.sounds[soundName];
    if (!sound) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }
    
    sound.pause();
    sound.currentTime = 0;
    sound.loop = false;
  }
}

// =============================================
// GESTIONE INTERFACCIA UTENTE
// =============================================
class UIManager {
  constructor() {
    this.elements = {
      // Display elements
      roundsValue: document.getElementById('rounds-value'),
      timeValue: document.getElementById('time-value'),
      tempGauge: document.getElementById('temp-gauge'),
      rxmGauge: document.getElementById('rxm-gauge'),
      scanLine: document.querySelector('.scan-line'),
      criticalWarning: document.getElementById('critical-warning'),
      criticalText: document.getElementById('critical-text'),
      
      // Control options
      weaponStatusOptions: document.querySelectorAll('#weapon-status-options .control-option'),
      iffStatusOptions: document.querySelectorAll('#iff-status-options .control-option'),
      targetProfileOptions: document.querySelectorAll('#target-profile-options .control-option'),
      targetSelectOptions: document.querySelectorAll('#target-select-options .control-option'),
      spectralProfileOptions: document.querySelectorAll('#spectral-profile-options .control-option'),
    };
  }
  
  // Ottieni l'opzione selezionata per un gruppo di controlli
  getSelectedOption(optionGroup) {
    const selector = `#${optionGroup}-options .selected`;
    const selectedElement = document.querySelector(selector);
    return selectedElement ? selectedElement.getAttribute('data-value') : null;
  }
  
  // Seleziona una nuova opzione in un gruppo
  selectOption(optionGroup, optionValue) {
    // Deseleziona tutte le opzioni nel gruppo
    document.querySelectorAll(`#${optionGroup}-options .control-option`).forEach(opt => {
      opt.classList.remove('selected');
    });
    
    // Seleziona l'opzione specificata
    const optionElement = document.querySelector(`#${optionGroup}-options [data-value="${optionValue}"]`);
    if (optionElement) {
      optionElement.classList.add('selected');
      return true;
    }
    return false;
  }
  
  // Aggiorna l'indicatore di livelli
  updateGauges(tempLevel, rxmLevel) {
    this.elements.tempGauge.style.height = `${tempLevel}%`;
    this.elements.rxmGauge.style.height = `${rxmLevel}%`;
  }
  
  // Aggiorna display munizioni e tempo
  updateDisplayValues(rounds, time) {
    this.elements.roundsValue.textContent = rounds;
    this.elements.timeValue.textContent = this.formatTime(time);
  }
  
  // Aggiorna colore linea di scansione
  updateScanLineColor(targetSelect, spectralProfile) {
    // Se profilo spettrale è INERT, nascondi linea di scansione
    if (spectralProfile === "INERT") {
      this.elements.scanLine.style.display = 'none';
      return;
    }
    
    // Altrimenti, mostra linea con colore appropriato
    this.elements.scanLine.style.display = 'block';
    
    switch(targetSelect) {
      case "INFRA RED":
        this.elements.scanLine.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        break;
      case "UV":
        this.elements.scanLine.style.backgroundColor = 'rgba(138, 43, 226, 0.3)';
        break;
      default: // MULTI SPEC
        this.elements.scanLine.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
        break;
    }
  }
  
  // Attiva allarme critico
  showCriticalWarning(message = "CRITICAL") {
    this.elements.criticalText.textContent = message;
    this.elements.criticalWarning.style.display = 'block';
  }
  
  // Disattiva allarme critico
  hideCriticalWarning() {
    this.elements.criticalWarning.style.display = 'none';
  }
  
  // Imposta lo stile dell'allarme di test
  setTestWarningStyle(isComplete = false) {
    if (isComplete) {
      this.elements.criticalText.textContent = "COMPLETE";
      this.elements.criticalText.style.backgroundColor = '#ffff00';
      this.elements.criticalText.style.color = '#000';
    } else {
      this.elements.criticalText.textContent = "TESTING";
      this.elements.criticalText.style.backgroundColor = ''; // Reset to default
      this.elements.criticalText.style.color = ''; // Reset to default
    }
  }
  
  // Imposta effetto lampeggiante
  setBlinking(elements, blinking = true) {
    elements.forEach(element => {
      if (blinking) {
        element.classList.add('blinking');
      } else {
        element.classList.remove('blinking');
      }
    });
  }
  
  // Formatta il tempo come "09.09", "08.88", ecc.
  formatTime(time) {
    const seconds = Math.floor(time);
    const centiseconds = Math.floor((time - seconds) * 100);
    
    const formattedSeconds = seconds < 10 ? '0' + seconds : seconds;
    const formattedCentiseconds = centiseconds < 10 ? '0' + centiseconds : centiseconds;
    
    return `${formattedSeconds}.${formattedCentiseconds}`;
  }
}

// =============================================
// CONTROLLER DEL SISTEMA D'ARMA
// =============================================
class WeaponSystem {
  constructor(audioManager, uiManager) {
    this.audioManager = audioManager;
    this.ui = uiManager;
    
    // Stato del sistema
    this.state = {
      currentRounds: CONFIG.DEFAULT_ROUNDS,
      currentTime: CONFIG.DEFAULT_TIME,
      tempLevel: CONFIG.DEFAULT_TEMP_LEVEL,
      rxmLevel: CONFIG.DEFAULT_RXM_LEVEL,
      spectralProfile: CONFIG.DEFAULT_SPECTRAL_PROFILE,
      
      targetRounds: CONFIG.DEFAULT_ROUNDS,
      targetTime: CONFIG.DEFAULT_TIME,
      
      isWarningActive: false,
      inTestMode: false,
      isPaused: false,
      
      // Intervalli
      firingInterval: null,
      cooldownInterval: null,
    };
    
    // Inizializza il sistema
    this._initializeEventListeners();
    this._initializeUI();
  }
  
  // Inizializza tutti gli event listener
  _initializeEventListeners() {
    // Aggiungi event listener per tutte le opzioni di controllo
    document.querySelectorAll('.control-option').forEach(option => {
      option.addEventListener('click', this._handleControlOptionClick.bind(this));
    });
    
    // Inizializzazione al caricamento della pagina
    document.addEventListener('DOMContentLoaded', this._handleDOMContentLoaded.bind(this));
  }
  
  // Inizializzazione UI
  _initializeUI() {
    // Imposta lo stato iniziale dell'UI
    this.ui.updateGauges(this.state.tempLevel, this.state.rxmLevel);
    this.ui.updateDisplayValues(this.state.currentRounds, this.state.currentTime);
    
    // Imposta colore linea di scansione iniziale
    const targetSelect = this.ui.getSelectedOption('target-select');
    this.ui.updateScanLineColor(targetSelect, this.state.spectralProfile);
  }
  
  // Gestisci click su opzioni di controllo
  _handleControlOptionClick(event) {
    const option = event.currentTarget;
    const optionsGroup = option.parentElement;
    const optionValue = option.getAttribute('data-value');
    const groupId = optionsGroup.id.replace('-options', '');
    
    // Riproduci suono di click
    this.audioManager.playSound('buttonClick');
    
    // Deseleziona tutte le opzioni nel gruppo e seleziona quella cliccata
    optionsGroup.querySelectorAll('.control-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    option.classList.add('selected');
    
    // Gestisci azioni in base al gruppo e valore
    switch(groupId) {
      case 'iff-status':
        if (optionValue === 'TEST') {
          this.runTestSequence();
        } else {
          this.simulateEngagement();
        }
        break;
        
      case 'weapon-status':
        this.simulateEngagement();
        break;
        
      case 'target-select':
        this.ui.updateScanLineColor(optionValue, this.state.spectralProfile);
        break;
        
      case 'spectral-profile':
        this.state.spectralProfile = optionValue;
        const currentTargetSelect = this.ui.getSelectedOption('target-select');
        this.ui.updateScanLineColor(currentTargetSelect, optionValue);
        break;
        
      default:
        this.simulateEngagement();
        break;
    }
  }
  
  // Gestione evento DOMContentLoaded
  _handleDOMContentLoaded() {
    // Ottieni profilo spettrale iniziale
    const initialSpectralProfile = document.querySelector('#spectral-profile-options .selected');
    if (initialSpectralProfile) {
      this.state.spectralProfile = initialSpectralProfile.getAttribute('data-value');
    }
    
    // Inizializza linea di scansione
    const currentTargetSelect = this.ui.getSelectedOption('target-select');
    this.ui.updateScanLineColor(currentTargetSelect, this.state.spectralProfile);
  }
  
  // Esegui la sequenza di test
  runTestSequence() {
    // Previeni sequenze di test multiple
    if (this.state.inTestMode) return;
    this.state.inTestMode = true;
    
    // Salva valori originali
    const originalRounds = this.ui.elements.roundsValue.textContent;
    const originalTime = this.ui.elements.timeValue.textContent;
    const originalTempLevel = this.state.tempLevel;
    const originalRxmLevel = this.state.rxmLevel;
    
    // Interrompi eventuali operazioni in corso
    this.stopFiring();
    this.deactivateCriticalWarning();
    
    // Attiva lampeggiamento valori
    this.ui.setBlinking([this.ui.elements.roundsValue, this.ui.elements.timeValue], true);
    
    // Animazione indicatori
    let gaugeAnimStep = 0;
    const gaugeAnimInterval = setInterval(() => {
      gaugeAnimStep++;
      if (gaugeAnimStep <= 10) {
        // Fase crescente
        this.state.tempLevel = Math.min(originalTempLevel + (gaugeAnimStep * 7), 100);
        this.state.rxmLevel = Math.min(gaugeAnimStep * 10, 100);
      } else if (gaugeAnimStep <= 20) {
        // Fase decrescente
        this.state.tempLevel = Math.max(100 - ((gaugeAnimStep - 10) * 7), originalTempLevel);
        this.state.rxmLevel = Math.max(100 - ((gaugeAnimStep - 10) * 10), originalRxmLevel);
      }
      this.ui.updateGauges(this.state.tempLevel, this.state.rxmLevel);
    }, 150);
    
    // Mostra messaggio TESTING
    this.ui.showCriticalWarning("TESTING");
    
    // Dopo 3 secondi, completa il test
    setTimeout(() => {
      // Interrompi l'animazione
      clearInterval(gaugeAnimInterval);
      
      // Mostra messaggio COMPLETE
      this.ui.setTestWarningStyle(true);
      
      // Dopo 1 secondo, nascondi avviso e ripristina tutto
      setTimeout(() => {
        this.ui.hideCriticalWarning();
        this.ui.setBlinking([this.ui.elements.roundsValue, this.ui.elements.timeValue], false);
        
        // Ripristina valori originali
        this.ui.elements.roundsValue.textContent = originalRounds;
        this.ui.elements.timeValue.textContent = originalTime;
        this.state.tempLevel = originalTempLevel;
        this.state.rxmLevel = originalRxmLevel;
        this.ui.updateGauges(this.state.tempLevel, this.state.rxmLevel);
        
        // Ripristina stile di default per avviso critico
        this.ui.setTestWarningStyle(false);
        
        // Ripristina stato IFF a SEARCH
        this.ui.selectOption('iff-status', 'SEARCH');
        
        this.state.inTestMode = false;
      }, CONFIG.TEST_COMPLETE_DISPLAY_TIME);
    }, CONFIG.TEST_SEQUENCE_DURATION);
  }
  
  // Simula uno scenario di ingaggio
  simulateEngagement() {
    const weaponStatus = this.ui.getSelectedOption('weapon-status');
    const iffStatus = this.ui.getSelectedOption('iff-status');
    
    // Aggiorna stato in base a stato arma e IFF
    if (weaponStatus === "ARMED" && iffStatus === "ENGAGED") {
      this.state.tempLevel = 60;
      this.ui.updateGauges(this.state.tempLevel, this.state.rxmLevel);
      
      // Riprendi o inizia il fuoco
      this.state.isPaused = false;
      this.startFiring();
    } else if (weaponStatus === "SAFE") {
      // Sospendi il fuoco se SAFE è selezionato
      this.stopFiring();
      this.state.isPaused = true;
      
      // Resetta IFF a SEARCH
      this.ui.selectOption('iff-status', 'SEARCH');
      
      this.state.rxmLevel = 0;
      this.state.tempLevel = 30;
      this.ui.updateGauges(this.state.tempLevel, this.state.rxmLevel);
    } else {
      // Se l'arma è ARMED ma non ENGAGED
      this.stopFiring();
      this.state.isPaused = true;
      
      this.state.rxmLevel = 0;
      this.ui.updateGauges(this.state.tempLevel, this.state.rxmLevel);
    }
    
    // Aggiorna frequenza di fuoco se necessario
    if (this.state.firingInterval && !this.state.isPaused) {
      clearInterval(this.state.firingInterval);
      this.startFiring();
    }
  }
  
  // Ottieni parametri della cadenza di fuoco
  getFireRate() {
    const targetProfile = this.ui.getSelectedOption('target-profile');
    
    switch(targetProfile) {
      case "SOFT":
        // Colpo singolo con ritardo evidente
        return { 
          fireInterval: 500, // 0.5 secondi per colpo
          burstSize: 1,
          pauseAfterBurst: 0
        };
      case "STANDARD":
        // Raffica di tre colpi seguita da pausa
        return {
          fireInterval: 100, // 0.1 secondi tra colpi in raffica
          burstSize: 3,
          pauseAfterBurst: 200 // 0.2 secondi pausa dopo raffica
        };
      case "HARD":
        // Full auto continuo
        return {
          fireInterval: 50, // Cadenza massima
          burstSize: Infinity, // Nessun limite alla raffica
          pauseAfterBurst: 0
        };
      default:
        // Comportamento di default
        return { 
          fireInterval: 300,
          burstSize: 1,
          pauseAfterBurst: 0
        };
    }
  }
  
  // Inizia sequenza di fuoco
  startFiring() {
    if (this.state.firingInterval) clearInterval(this.state.firingInterval);
    
    // Imposta valori target per countdown
    if (!this.state.isPaused) {
      this.state.targetRounds = 0;
      this.state.targetTime = 0;
    }
    
    // Ottieni parametri di fuoco in base al profilo target
    const fireParams = this.getFireRate();
    let shotCounter = 0;
    
    this.state.firingInterval = setInterval(() => {
      if (!this.state.isPaused && this.state.currentRounds > this.state.targetRounds) {
        this.state.currentRounds--;
        this.state.currentTime = (33.33 * this.state.currentRounds) / 500;
        
        // Aggiorna valori visualizzati
        this.ui.updateDisplayValues(this.state.currentRounds, this.state.currentTime);
        
        // Aumenta gradualmente livelli
        this.state.rxmLevel = Math.min(this.state.rxmLevel + 1, 100);
        this.state.tempLevel = Math.min(this.state.tempLevel + 0.5, 90);
        this.ui.updateGauges(this.state.tempLevel, this.state.rxmLevel);
        
        // Verifica se deve essere mostrato l'avviso CRITICAL
        this.checkCriticalStatus();
        
        // Incrementa contatore colpi
        shotCounter++;
        
        // Se raggiunta dimensione raffica, pausa prima dei colpi successivi
        if (shotCounter >= fireParams.burstSize && fireParams.pauseAfterBurst > 0) {
          clearInterval(this.state.firingInterval);
          setTimeout(() => {
            this.startFiring();
          }, fireParams.pauseAfterBurst);
          shotCounter = 0;
        }
      }
      
      if (this.state.currentRounds <= 0) {
        this.state.currentRounds = 0;
        this.ui.updateDisplayValues(0, 0);
        this.stopFiring();
        
        // Imposta stato arma a SAFE
        this.ui.selectOption('weapon-status', 'SAFE');
        
        // Resetta IFF a SEARCH
        this.ui.selectOption('iff-status', 'SEARCH');
      }
    }, fireParams.fireInterval);
  }
  
  // Termina sequenza di fuoco
  stopFiring() {
    if (this.state.firingInterval) clearInterval(this.state.firingInterval);
    
    if (this.state.cooldownInterval) clearInterval(this.state.cooldownInterval);
    
    this.state.cooldownInterval = setInterval(() => {
      this.state.tempLevel = Math.max(this.state.tempLevel - 5, 30);
      this.state.rxmLevel = Math.max(this.state.rxmLevel - 10, 0);
      this.ui.updateGauges(this.state.tempLevel, this.state.rxmLevel);
      
      if (this.state.tempLevel <= 30 && this.state.rxmLevel <= 0) {
        clearInterval(this.state.cooldownInterval);
        this.state.cooldownInterval = null;
      }
    }, CONFIG.GAUGE_UPDATE_INTERVAL);
    
    // Disattiva avviso se munizioni esaurite
    if (this.state.currentRounds <= 0) {
      this.deactivateCriticalWarning();
      // Riproduci suono di game over
    this.audioManager.playSound('gameOver');
    }
  }
  
  // Verifica stato critico
  checkCriticalStatus() {
    if (this.state.currentRounds <= CONFIG.LOW_AMMO_THRESHOLD && this.state.currentRounds > 0) {
      this.activateCriticalWarning();
    } else if (this.state.currentRounds <= 0) {
      this.deactivateCriticalWarning();
    }
  }
  
  // Attiva avviso CRITICAL
  activateCriticalWarning() {
    if (this.state.isWarningActive) return;
    this.state.isWarningActive = true;
    
    // Riproduci suono di avviso in loop
    this.audioManager.playSound('criticalWarning', { loop: true });
    
    // Imposta testo "CRITICAL"
    this.ui.showCriticalWarning();
  }
  
  // Disattiva avviso CRITICAL
  deactivateCriticalWarning() {
    this.ui.hideCriticalWarning();
    this.state.isWarningActive = false;
    
    // Ferma suono di avviso
    this.audioManager.stopSound('criticalWarning');
  }
}

// =============================================
// INIZIALIZZAZIONE DELL'APPLICAZIONE
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  // Crea istanze dei manager
  const audioManager = new AudioManager();
  const uiManager = new UIManager();
  
  // Inizializza il sistema d'arma
  const weaponSystem = new WeaponSystem(audioManager, uiManager);
  
  // Esponi le istanze globalmente per debug se necessario
  window.audioManager = audioManager;
  window.uiManager = uiManager;
  window.weaponSystem = weaponSystem;
});
