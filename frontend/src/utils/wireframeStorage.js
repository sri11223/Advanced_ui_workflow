// utils/wireframeStorage.js
class WireframeStateManager {
  constructor() {
    this.storageKey = 'wireframe_state';
    this.historyKey = 'wireframe_history';
    this.maxHistorySteps = 20;
  }

  // Save current wireframe state
  saveState(wireframeData, sessionId) {
    const state = {
      sessionId,
      wireframe: wireframeData,
      timestamp: Date.now(),
      version: this.getNextVersion()
    };
    
    localStorage.setItem(this.storageKey, JSON.stringify(state));
    this.addToHistory(state);
    
    console.log('State saved:', state.version);
    return state;
  }

  // Get current state
  getCurrentState() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : null;
  }

  // Add to history for undo/redo
  addToHistory(state) {
    let history = this.getHistory();
    history.push(state);
    
    // Keep only last N steps
    if (history.length > this.maxHistorySteps) {
      history = history.slice(-this.maxHistorySteps);
    }
    
    localStorage.setItem(this.historyKey, JSON.stringify(history));
  }

  // Get version history
  getHistory() {
    const stored = localStorage.getItem(this.historyKey);
    return stored ? JSON.parse(stored) : [];
  }

  // Undo to previous state
  undo() {
    const history = this.getHistory();
    if (history.length < 2) return null;
    
    // Remove current state and get previous
    history.pop(); // Remove current
    const previousState = history[history.length - 1];
    
    // Update current state
    localStorage.setItem(this.storageKey, JSON.stringify(previousState));
    localStorage.setItem(this.historyKey, JSON.stringify(history));
    
    console.log('Undo to version:', previousState.version);
    return previousState;
  }

  // Redo functionality
  getAllVersions() {
    return this.getHistory();
  }

  // Go back to specific version
  goToVersion(version) {
    const history = this.getHistory();
    const targetState = history.find(state => state.version === version);
    
    if (targetState) {
      localStorage.setItem(this.storageKey, JSON.stringify(targetState));
      console.log('Restored to version:', version);
      return targetState;
    }
    
    return null;
  }

  getNextVersion() {
    const current = this.getCurrentState();
    return current ? current.version + 1 : 1;
  }

  // Clear all state
  clearState() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.historyKey);
  }
}

export const stateManager = new WireframeStateManager();
