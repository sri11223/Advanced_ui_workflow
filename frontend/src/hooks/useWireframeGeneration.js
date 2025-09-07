// hooks/useWireframeGeneration.js
import { useState, useCallback, useEffect } from 'react';
import { stateManager } from '../utils/wireframeStorage';

export const useWireframeGeneration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentWireframe, setCurrentWireframe] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const generateWireframe = useCallback(async (prompt, isModification = false) => {
    setIsLoading(true);
    
    try {
      // Get existing state for modifications
      const existingState = stateManager.getCurrentState();
      const contextWireframe = existingState?.wireframe;
      
      const requestBody = {
        prompt,
        sessionId: sessionId || Date.now().toString(),
        existingWireframe: isModification ? contextWireframe : null,
        isModification
      };

      const response = await fetch('http://localhost:5000/api/wireframe/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success) {
        // Save state with history
        const savedState = stateManager.saveState(data.wireframe, data.sessionId);
        
        setCurrentWireframe(data.wireframe);
        setSessionId(data.sessionId);
        
        return {
          success: true,
          wireframe: data.wireframe,
          message: data.message,
          version: savedState.version
        };
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const undoLastChange = useCallback(() => {
    const previousState = stateManager.undo();
    if (previousState) {
      setCurrentWireframe(previousState.wireframe);
      setSessionId(previousState.sessionId);
      return previousState;
    }
    return null;
  }, []);

  const getVersionHistory = useCallback(() => {
    return stateManager.getAllVersions();
  }, []);

  const goToVersion = useCallback((version) => {
    const targetState = stateManager.goToVersion(version);
    if (targetState) {
      setCurrentWireframe(targetState.wireframe);
      setSessionId(targetState.sessionId);
      return targetState;
    }
    return null;
  }, []);

  // Initialize with existing state on mount
  useEffect(() => {
    const existingState = stateManager.getCurrentState();
    if (existingState) {
      setCurrentWireframe(existingState.wireframe);
      setSessionId(existingState.sessionId);
    }
  }, []);

  return {
    generateWireframe,
    undoLastChange,
    getVersionHistory,
    goToVersion,
    currentWireframe,
    isLoading,
    sessionId
  };
};
