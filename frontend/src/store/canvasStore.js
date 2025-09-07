import { create } from 'zustand';

export const useCanvasStore = create((set, get) => ({
  // Canvas state
  canvasWidth: 1200,
  canvasHeight: 800,
  scale: 1,
  stagePosition: { x: 0, y: 0 },
  
  // Components state
  components: [],
  selectedComponent: null,
  
  // View mode
  viewMode: 'desktop', // desktop, tablet, mobile
  
  // History for undo/redo
  history: [],
  historyIndex: -1,
  maxHistorySteps: 50,
  
  // Canvas dimensions based on view mode
  getCanvasDimensions: () => {
    const { viewMode } = get();
    switch (viewMode) {
      case 'mobile':
        return { width: 375, height: 812 };
      case 'tablet':
        return { width: 768, height: 1024 };
      case 'desktop':
      default:
        return { width: 1200, height: 800 };
    }
  },
  
  // Actions
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setCanvasSize: (width, height) => set({ 
    canvasWidth: width, 
    canvasHeight: height 
  }),
  
  setScale: (scale) => set({ scale }),
  
  setStagePosition: (position) => set({ stagePosition: position }),
  
  addComponent: (component) => set((state) => {
    const newComponents = [...state.components, component];
    return {
      components: newComponents,
      selectedComponent: component.id
    };
  }),
  
  updateComponent: (id, updates) => set((state) => ({
    components: state.components.map(comp => 
      comp.id === id ? { ...comp, ...updates } : comp
    )
  })),
  
  removeComponent: (id) => set((state) => ({
    components: state.components.filter(comp => comp.id !== id),
    selectedComponent: state.selectedComponent === id ? null : state.selectedComponent
  })),
  
  setSelectedComponent: (id) => set({ selectedComponent: id }),
  
  clearComponents: () => set({ 
    components: [], 
    selectedComponent: null 
  }),
  
  setComponents: (components) => set({ 
    components,
    selectedComponent: null
  }),
  
  // History management
  saveToHistory: () => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({
      components: JSON.parse(JSON.stringify(state.components)),
      timestamp: Date.now()
    });
    
    // Keep only last N steps
    if (newHistory.length > state.maxHistorySteps) {
      newHistory.shift();
    }
    
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),
  
  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const prevState = state.history[state.historyIndex - 1];
      return {
        components: prevState.components,
        historyIndex: state.historyIndex - 1,
        selectedComponent: null
      };
    }
    return state;
  }),
  
  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const nextState = state.history[state.historyIndex + 1];
      return {
        components: nextState.components,
        historyIndex: state.historyIndex + 1,
        selectedComponent: null
      };
    }
    return state;
  }),
  
  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },
  
  canRedo: () => {
    const { historyIndex, history } = get();
    return historyIndex < history.length - 1;
  }
}));
