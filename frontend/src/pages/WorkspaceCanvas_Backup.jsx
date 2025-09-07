import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Layout, Zap, Eye, Download, Undo, Settings, Monitor, Tablet, Smartphone } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import WireframeChat from '../components/WireframeChat';
import PageNavigation from '../components/PageNavigation';
import { useCanvasStore } from '../store/canvasStore';
import { useWireframeGeneration } from '../hooks/useWireframeGeneration';

const WorkspaceCanvas = () => {
  const { projectName } = useParams();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [showProperties, setShowProperties] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [wireframeData, setWireframeData] = useState(null);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [wireframeComponents, setWireframeComponents] = useState([]);
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sessionId, setSessionId] = useState(null);
  const [viewMode, setViewMode] = useState('desktop');
  const [deviceTheme, setDeviceTheme] = useState('web');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [showGrid, setShowGrid] = useState(true);
  const [performance, setPerformance] = useState({ fps: 60, components: 0 });
  const [propertiesPanelWidth, setPropertiesPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [designMode, setDesignMode] = useState('select'); // 'select', 'hand', 'comment'
  const [showRulers, setShowRulers] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [collaborators, setCollaborators] = useState([
    { id: 1, name: 'Alex', avatar: '👨‍💻', color: '#3B82F6', active: true },
    { id: 2, name: 'Sarah', avatar: '👩‍🎨', color: '#EF4444', active: true },
    { id: 3, name: 'Mike', avatar: '👨‍🚀', color: '#10B981', active: false }
  ]);
  const [comments, setComments] = useState([]);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newComment, setNewComment] = useState({ x: 0, y: 0, text: '', author: 'You' });
  const stageRef = useRef(null);
  const layerRef = useRef(null);
  const chatRef = useRef(null);
  const resizeRef = useRef(null);

  // Canvas interaction handlers
  const handleCanvasClick = (e) => {
    if (designMode === 'comment') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setNewComment({ x, y, text: '', author: 'You' });
      setIsAddingComment(true);
    }
  };

  const handleAddComment = () => {
    if (newComment.text.trim()) {
      setComments(prev => [...prev, {
        id: Date.now(),
        x: newComment.x,
        y: newComment.y,
        text: newComment.text,
        author: newComment.author,
        timestamp: new Date().toLocaleTimeString()
      }]);
      setNewComment({ x: 0, y: 0, text: '', author: 'You' });
      setIsAddingComment(false);
    }
  };

  const handleAutoLayout = () => {
    if (wireframeComponents.length === 0) return;
    
    const updatedComponents = wireframeComponents.map((comp, index) => {
      const cols = Math.ceil(Math.sqrt(wireframeComponents.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      return {
        ...comp,
        x: 50 + (col * 200),
        y: 50 + (row * 100)
      };
    });
    
    setWireframeComponents(updatedComponents);
    // Add to history for undo/redo
    setCanvasHistory(prev => [...prev.slice(0, historyIndex + 1), updatedComponents]);
    setHistoryIndex(prev => prev + 1);
  };

  const handleAIEnhance = async () => {
    if (wireframeComponents.length === 0) return;
    
    try {
      setIsLoading(true);
      const enhancedComponents = wireframeComponents.map(comp => ({
        ...comp,
        style: {
          ...comp.style,
          backgroundColor: comp.type === 'button' ? '#3B82F6' : comp.style?.backgroundColor || '#ffffff',
          borderRadius: comp.type === 'button' ? '8px' : comp.style?.borderRadius || '4px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }
      }));
      
      setWireframeComponents(enhancedComponents);
      setCanvasHistory(prev => [...prev.slice(0, historyIndex + 1), enhancedComponents]);
      setHistoryIndex(prev => prev + 1);
    } catch (error) {
      console.error('AI Enhancement failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addComponent = (type) => {
    const newComponent = {
      id: Date.now(),
      type,
      x: Math.random() * 300 + 50,
      y: Math.random() * 200 + 50,
      width: type === 'button' ? 120 : type === 'input' ? 200 : 150,
      height: type === 'button' ? 40 : type === 'input' ? 35 : 30,
      text: type === 'button' ? 'Button' : type === 'input' ? '' : 'Text',
      style: {
        backgroundColor: type === 'button' ? '#3B82F6' : '#ffffff',
        color: type === 'button' ? '#ffffff' : '#000000',
        borderRadius: '4px',
        border: '1px solid #e5e7eb'
      }
    };
    
    const updatedComponents = [...wireframeComponents, newComponent];
    setWireframeComponents(updatedComponents);
    setCanvasHistory(prev => [...prev.slice(0, historyIndex + 1), updatedComponents]);
    setHistoryIndex(prev => prev + 1);
  };

  // Performance monitoring
  useEffect(() => {
    const updatePerformance = () => {
      setPerformance(prev => ({
        ...prev,
        components: wireframeComponents.length
      }));
    };
    updatePerformance();
  }, [wireframeComponents]);

  // Responsive canvas sizing - Full canvas utilization
  const getCanvasSize = () => {
    const availableWidth = window.innerWidth * (isCollapsed ? 0.85 : 0.67);
    const availableHeight = window.innerHeight - 160;
    
    switch (viewMode) {
      case 'mobile':
        // Mobile: Use full available space but maintain mobile aspect ratio
        return { 
          width: Math.max(375, Math.min(availableWidth, 500)), 
          height: Math.max(812, Math.min(availableHeight, 1000)) 
        };
      case 'tablet':
        // Tablet: Use more space while maintaining tablet proportions
        return { 
          width: Math.max(768, Math.min(availableWidth, 900)), 
          height: Math.max(1024, Math.min(availableHeight, 1200)) 
        };
      default:
        // Desktop: Use full available canvas space
        return { 
          width: Math.max(1200, availableWidth), 
          height: Math.max(800, availableHeight) 
        };
    }
  };

  // Device-specific styling
  const getDeviceStyles = () => {
    const styles = {
      web: { borderRadius: 8, shadow: 'rgba(0,0,0,0.1)' },
      ios: { borderRadius: 20, shadow: 'rgba(0,0,0,0.2)' },
      android: { borderRadius: 12, shadow: 'rgba(0,0,0,0.15)' }
    };
    return styles[deviceTheme] || styles.web;
  };

  // Keyboard shortcuts with performance optimization
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' && selectedObject) {
        deleteSelectedObject();
      }
      
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
      
      if (e.key === 'Escape') {
        setSelectedObject(null);
        setShowProperties(false);
      }

      // Advanced shortcuts
      if (e.key === '1') setViewMode('desktop');
      if (e.key === '2') setViewMode('tablet');
      if (e.key === '3') setViewMode('mobile');
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setIsCollapsed(!isCollapsed);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, isCollapsed]);

  // Resize functionality for properties panel
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 250;
      const maxWidth = 600;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setPropertiesPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Local storage functions for wireframe persistence
  const saveWireframeToStorage = (wireframe, sessionId) => {
    try {
      const storageKey = `wireframe_${sessionId}`;
      const wireframeHistory = JSON.parse(localStorage.getItem(`${storageKey}_history`) || '[]');
      
      // Add current wireframe to history
      wireframeHistory.push({
        timestamp: Date.now(),
        wireframe: wireframe,
        id: Date.now()
      });
      
      // Keep only last 10 versions
      if (wireframeHistory.length > 10) {
        wireframeHistory.shift();
      }
      
      localStorage.setItem(storageKey, JSON.stringify(wireframe));
      localStorage.setItem(`${storageKey}_history`, JSON.stringify(wireframeHistory));
      localStorage.setItem(`${storageKey}_current`, JSON.stringify(wireframe));
      
      console.log('Wireframe saved to localStorage:', storageKey);
    } catch (error) {
      console.error('Error saving wireframe to localStorage:', error);
    }
  };

  const loadWireframeFromStorage = (sessionId) => {
    try {
      const storageKey = `wireframe_${sessionId}`;
      const stored = localStorage.getItem(`${storageKey}_current`);
      if (stored) {
        const wireframe = JSON.parse(stored);
        console.log('Wireframe loaded from localStorage:', storageKey);
        return wireframe;
      }
    } catch (error) {
      console.error('Error loading wireframe from localStorage:', error);
    }
    return null;
  };

  const getWireframeHistory = (sessionId) => {
    try {
      const storageKey = `wireframe_${sessionId}_history`;
      const history = localStorage.getItem(storageKey);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error loading wireframe history:', error);
      return [];
    }
  };

  // Enhanced undo/redo functionality using localStorage versions
  const undoToStoredVersion = () => {
    const history = getWireframeHistory(sessionId);
    if (history.length > 1) {
      // Get the previous version (second to last)
      const previousVersion = history[history.length - 2];
      if (previousVersion && previousVersion.wireframe) {
        generateWireframeOnCanvas(previousVersion.wireframe);
        
        // Remove the last version from history
        history.pop();
        const storageKey = `wireframe_${sessionId}_history`;
        localStorage.setItem(storageKey, JSON.stringify(history));
        
        console.log('Reverted to previous wireframe version');
        
        // Add message to chat
        const undoMessage = { 
          type: 'system', 
          content: 'Reverted to previous wireframe version' 
        };
        setMessages(prev => [...prev, undoMessage]);
      }
    }
  };

  const goBackToPreviousVersion = () => {
    undoToStoredVersion();
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { type: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Load existing wireframe from localStorage for follow-up conversations
      const existingWireframe = loadWireframeFromStorage(sessionId);
      
      const requestBody = {
        prompt: inputValue,
        sessionId: sessionId,
        existingWireframe: existingWireframe || wireframeData
      };

      const response = await fetch('http://localhost:5000/api/wireframe/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        // Update session ID for future modifications
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }

        const botMessage = { 
          type: 'bot', 
          content: data.isModification 
            ? `Modified wireframe: ${data.message}` 
            : `Generated wireframe: ${data.message}`,
          wireframe: data.wireframe,
          isModification: data.isModification
        };
        setMessages(prev => [...prev, botMessage]);
        
        // Generate or update wireframe on canvas
        if (data.wireframe) {
          generateWireframeOnCanvas(data.wireframe);
          // Save wireframe to localStorage
          saveWireframeToStorage(data.wireframe, sessionId);
        }
      } else {
        const errorMessage = { type: 'error', content: `Error: ${data.error}` };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage = { type: 'error', content: `Error: ${error.message}` };
      setMessages(prev => [...prev, errorMessage]);
    }

    setInputValue('');
    setIsLoading(false);
  };

  const generateWireframeOnCanvas = (data) => {
    console.log("Received wireframe data:", data);
    
    // Handle multi-page website structure
    if (data && data.json && data.json.pages) {
      console.log("Processing multi-page website:", data.json.projectType);
      
      // Convert pages to wireframe format with responsive scaling
      const canvasSize = getCanvasSize();
      const scaleFactorX = canvasSize.width / 1200; // Base desktop width
      const scaleFactorY = canvasSize.height / 800;  // Base desktop height
      
      const convertedPages = data.json.pages.map(page => ({
        id: page.id,
        name: page.name,
        components: (page.components || []).map((comp, index) => ({
          id: comp.id || Date.now() + index + Math.random(),
          type: comp.type || 'text',
          label: comp.label || comp.text || 'Component',
          text: comp.text || comp.label || '',
          placeholder: comp.placeholder || '',
          x: (comp.x || 50) * scaleFactorX,
          y: (comp.y || 50 + (index * 70)) * scaleFactorY,
          width: (comp.width || (comp.type === 'button' ? 200 : comp.type === 'input' ? 250 : 200)) * scaleFactorX,
          height: (comp.height || (comp.type === 'button' ? 40 : comp.type === 'input' ? 35 : 30)) * scaleFactorY,
          backgroundColor: comp.backgroundColor || (comp.type === 'button' ? '#3B82F6' : comp.type === 'input' ? '#ffffff' : 'transparent'),
          textColor: comp.textColor || (comp.type === 'button' ? '#ffffff' : '#1F2937'),
          fontSize: (comp.fontSize || (comp.type === 'text' ? 16 : 14)) * Math.min(scaleFactorX, scaleFactorY),
          fontWeight: comp.fontWeight || 'normal',
          borderColor: comp.borderColor || (comp.type === 'input' ? '#E5E7EB' : '#D1D5DB'),
          borderRadius: comp.borderRadius || (comp.type === 'button' ? 8 : comp.type === 'input' ? 6 : 4),
          opacity: comp.opacity || 1
        }))
      }));

      const wireframeStructure = {
        title: data.json.title,
        projectType: data.json.projectType,
        pages: convertedPages
      };
      
      setWireframeData(wireframeStructure);
      setCurrentPageId(convertedPages[0]?.id);
      setWireframeComponents(convertedPages[0]?.components || []);
      
      console.log("Multi-page wireframe loaded:", wireframeStructure);
      console.log(`Generated ${convertedPages.length} pages:`, convertedPages.map(p => p.name));
    }
    // Handle single page Groq AI format
    else if (data && data.json && data.json.components) {
      console.log("Processing single-page Groq AI wireframe");
      const canvasSize = getCanvasSize();
      const scaleFactorX = canvasSize.width / 1200; // Base desktop width
      const scaleFactorY = canvasSize.height / 800;  // Base desktop height
      
      const convertedComponents = data.json.components.map((comp, index) => ({
        id: comp.id || Date.now() + index,
        type: comp.type || 'text',
        x: (comp.x || 50) * scaleFactorX,
        y: (comp.y || 50 + (index * 70)) * scaleFactorY,
        width: (comp.width || (comp.type === 'button' ? 200 : comp.type === 'input' ? 250 : 200)) * scaleFactorX,
        height: (comp.height || (comp.type === 'button' ? 40 : comp.type === 'input' ? 35 : 30)) * scaleFactorY,
        label: comp.label || comp.text || 'Component',
        text: comp.text || comp.label || '',
        placeholder: comp.placeholder || '',
        backgroundColor: comp.backgroundColor || (comp.type === 'button' ? '#3B82F6' : comp.type === 'input' ? '#ffffff' : 'transparent'),
        textColor: comp.textColor || (comp.type === 'button' ? '#ffffff' : '#1F2937'),
        fontSize: (comp.fontSize || (comp.type === 'text' ? 16 : 14)) * Math.min(scaleFactorX, scaleFactorY),
        fontWeight: comp.fontWeight || 'normal',
        borderColor: comp.borderColor || (comp.type === 'input' ? '#E5E7EB' : '#D1D5DB'),
        borderRadius: comp.borderRadius || (comp.type === 'button' ? 8 : comp.type === 'input' ? 6 : 4),
        opacity: comp.opacity || 1
      }));
      
      setWireframeComponents(convertedComponents);
      setCanvasHistory(prev => [...prev.slice(0, historyIndex + 1), convertedComponents]);
      setHistoryIndex(prev => prev + 1);
    }
    // Handle legacy multi-page format
    else if (data && data.pages) {
      setWireframeData(data);
      setCurrentPageId(data.pages[0]?.id);
      setWireframeComponents(data.pages[0]?.components || []);
    } 
    // Handle legacy single page format
    else if (data && data.components) {
      setWireframeComponents(data.components);
    }
    else {
      console.warn("Unknown wireframe data format:", data);
    }
    
    saveCanvasState();
  };

  const switchToPage = (pageId) => {
    if (!wireframeData || !wireframeData.pages) return;
    
    const page = wireframeData.pages.find(p => p.id === pageId);
    if (page) {
      setCurrentPageId(pageId);
      setWireframeComponents(page.components);
      setSelectedObject(null);
      setShowProperties(false);
    }
  };

  const getCurrentPage = () => {
    if (!wireframeData || !wireframeData.pages || !currentPageId) return null;
    return wireframeData.pages.find(p => p.id === currentPageId);
  };

  const updateObjectProperty = (property, value) => {
    if (!selectedObject) return;
    
    setWireframeComponents(prev => 
      prev.map(comp => 
        comp.id === selectedObject.id 
          ? { ...comp, [property]: value }
          : comp
      )
    );
    
    // Update selected object to reflect changes immediately
    setSelectedObject(prev => ({ ...prev, [property]: value }));
    saveCanvasState();
  };

  const deleteSelectedObject = () => {
    if (!selectedObject) return;
    
    setWireframeComponents(prev => 
      prev.filter(comp => comp.id !== selectedObject.id)
    );
    setSelectedObject(null);
    setShowProperties(false);
    saveCanvasState();
  };

  const saveCanvasState = () => {
    const newHistory = canvasHistory.slice(0, historyIndex + 1);
    newHistory.push([...wireframeComponents]);
    
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(prev => prev + 1);
    }
    
    setCanvasHistory(newHistory);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    
    const prevState = canvasHistory[historyIndex - 1];
    setWireframeComponents(prevState);
    setHistoryIndex(prev => prev - 1);
  };

  const redo = () => {
    if (historyIndex >= canvasHistory.length - 1) return;
    
    const nextState = canvasHistory[historyIndex + 1];
    setWireframeComponents(nextState);
    setHistoryIndex(prev => prev + 1);
  };

  const exportAsPNG = () => {
    if (!stageRef.current) return;
    
    const dataURL = stageRef.current.toDataURL({
      mimeType: 'image/png',
      quality: 1,
      pixelRatio: 2
    });
    
    const link = document.createElement('a');
    link.download = `wireframe-${projectName || 'untitled'}.png`;
    link.href = dataURL;
    link.click();
  };

  const exportAsJSON = () => {
    const dataStr = JSON.stringify(wireframeComponents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.download = `wireframe-${projectName || 'untitled'}.json`;
    link.href = URL.createObjectURL(dataBlob);
    link.click();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const KonvaComponent = ({ component, isSelected, onSelect }) => {
    const { type, x, y, width, height, label, text } = component;
    
    const handleClick = () => {
      onSelect(component);
      setShowProperties(true);
    };

    const handleDragEnd = (e) => {
      const newX = e.target.x();
      const newY = e.target.y();
      
      setWireframeComponents(prev => 
        prev.map(comp => 
          comp.id === component.id 
            ? { ...comp, x: newX, y: newY }
            : comp
        )
      );
      
      // Update selected object if this is the selected component
      if (selectedObject && selectedObject.id === component.id) {
        setSelectedObject(prev => ({ ...prev, x: newX, y: newY }));
      }
      
      saveCanvasState();
    };

    // Get the display text - prioritize label over text
    const displayText = label || text || component.placeholder || 'Component';
    
    // Get proper colors with fallbacks
    const backgroundColor = component.backgroundColor || (type === 'button' ? '#3B82F6' : type === 'input' ? '#ffffff' : 'transparent');
    const textColor = component.textColor || (type === 'button' ? '#ffffff' : '#1F2937');
    const borderColor = component.borderColor || (type === 'input' ? '#E5E7EB' : type === 'button' ? '#3B82F6' : '#D1D5DB');

    if (type === 'text') {
      return (
        <Text
          key={component.id}
          x={x}
          y={y}
          text={displayText}
          fontSize={component.fontSize || 16}
          fontFamily={component.fontFamily || 'Inter, Arial, sans-serif'}
          fontStyle={component.fontWeight || 'normal'}
          fill={textColor}
          opacity={component.opacity || 1}
          draggable
          onClick={handleClick}
          onDragEnd={handleDragEnd}
          stroke={isSelected ? '#3B82F6' : 'transparent'}
          strokeWidth={isSelected ? 2 : 0}
          shadowColor={component.shadow ? '#00000020' : undefined}
          shadowBlur={component.shadow ? 4 : 0}
          shadowOffset={component.shadow ? { x: 0, y: 2 } : { x: 0, y: 0 }}
        />
      );
    }

    return (
      <Group
        key={component.id}
        x={x}
        y={y}
        draggable
        onClick={handleClick}
        onDragEnd={handleDragEnd}
      >
        {/* Background/Container Rectangle */}
        <Rect
          width={width}
          height={height}
          fill={backgroundColor}
          stroke={isSelected ? '#3B82F6' : borderColor}
          strokeWidth={isSelected ? 2 : 1}
          cornerRadius={component.borderRadius || (type === 'button' ? 8 : type === 'input' ? 6 : 4)}
          opacity={component.opacity || 1}
          shadowColor={type === 'button' ? '#3B82F620' : '#00000010'}
          shadowBlur={type === 'button' ? 8 : 4}
          shadowOffset={{ x: 0, y: type === 'button' ? 4 : 2 }}
        />
        
        {/* Component Text */}
        <Text
          x={type === 'input' ? 12 : width / 2}
          y={height / 2 - (component.fontSize || 14) / 2}
          text={displayText}
          fontSize={component.fontSize || 14}
          fontFamily={component.fontFamily || 'Inter, Arial, sans-serif'}
          fontStyle={component.fontWeight || 'normal'}
          fill={textColor}
          align={type === 'button' ? 'center' : 'left'}
          verticalAlign="middle"
          width={type === 'button' ? width : width - 24}
          ellipsis={true}
        />
        
        {/* Input placeholder text if empty */}
        {type === 'input' && component.placeholder && !displayText && (
          <Text
            x={12}
            y={height / 2 - 7}
            text={component.placeholder}
            fontSize={component.fontSize || 14}
            fontFamily={component.fontFamily || 'Inter, Arial, sans-serif'}
            fill="#9CA3AF"
            width={width - 24}
            ellipsis={true}
          />
        )}
      </Group>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-x"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Enhanced Navbar */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-all duration-300">
              <motion.div
                whileHover={{ x: -4 }}
                className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </motion.div>
              <span className="font-medium">Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  {projectName?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'New Project'}
                </h1>
                <p className="text-xs text-gray-400">AI-Powered Wireframe Studio</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Performance Monitor */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2 px-3 py-2 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl"
            >
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-300 font-medium">{performance.fps}fps</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-300 font-medium">{performance.components} objects</span>
            </motion.div>
            
            {/* View Mode Switcher */}
            <div className="flex items-center space-x-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-1">
              {[
                { mode: 'desktop', icon: Monitor, label: 'Desktop' },
                { mode: 'tablet', icon: Tablet, label: 'Tablet' },
                { mode: 'mobile', icon: Smartphone, label: 'Mobile' }
              ].map(({ mode, icon: Icon, label }) => (
                <motion.button
                  key={mode}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode(mode)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === mode 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={`${label} View`}
                >
                  <Icon className="w-4 h-4" />
                </motion.button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGrid(!showGrid)}
                className={`p-2 rounded-lg transition-colors ${
                  showGrid ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Grid"
              >
                <Grid className="w-4 h-4" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </motion.button>
            </div>

            <div className="h-6 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            
            {/* History Controls */}
            <div className="flex items-center space-x-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={redo}
                disabled={historyIndex >= canvasHistory.length - 1}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </motion.button>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-2 rounded-lg transition-colors ${
                isCollapsed ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Sidebar"
            >
              <Layers className="w-4 h-4" />
            </motion.button>
            
            <div className="h-6 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            
            {/* Export Buttons */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportAsPNG}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg hover:shadow-green-500/25 transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                <span>Export PNG</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGrid(!showGrid)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-purple-500/25 transition-all duration-200"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className={`flex-1 flex ${isFullscreen ? 'fixed inset-0 z-40 pt-20' : ''}`}>
        {/* Enhanced Chat Panel */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-1/3 min-w-96 bg-white border-r border-gray-200"
            >
              {/* Chat Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">AI Assistant</h2>
                      <p className="text-xs text-gray-400">Wireframe Generation</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400 font-medium">Online</span>
                  </div>
                </div>
                
                {/* Tab Switcher */}
                <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-1">
                  {[
                    { id: 'chat', label: 'Chat', icon: MessageSquare },
                    { id: 'components', label: 'Components', icon: Layers }
                  ].map(({ id, label, icon: Icon }) => (
                    <motion.button
                      key={id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(id)}
                      className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        activeTab === id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
              
              {/* Chat Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'chat' && (
                  <motion.div 
                    key="chat"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                    ref={chatRef}
                  >
                    {messages.length === 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-12"
                      >
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Start Creating</h3>
                        <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                          Describe your wireframe idea and I'll generate it for you using AI
                        </p>
                      </motion.div>
                    )}
                    
                    {messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] p-4 rounded-2xl backdrop-blur-sm ${
                          message.type === 'user'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                            : message.type === 'error'
                            ? 'bg-red-500/20 border border-red-500/30 text-red-200'
                            : 'bg-white/10 border border-white/10 text-gray-100'
                        }`}>
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          {message.wireframe && (
                            <div className="mt-3 p-3 bg-black/20 rounded-lg">
                              <p className="text-xs text-gray-300 mb-2">Generated wireframe with {message.wireframe.components?.length || 0} components</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    
                    <AnimatePresence>
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="flex justify-start"
                        >
                          <div className="bg-white/10 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                            <div className="flex items-center space-x-3">
                              <div className="flex space-x-1">
                                {[0, 1, 2].map((i) => (
                                  <motion.div
                                    key={i}
                                    className="w-2 h-2 bg-blue-400 rounded-full"
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-300">Generating wireframe...</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
                
                {activeTab === 'components' && (
                  <motion.div 
                    key="components"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex-1 overflow-y-auto p-4"
                  >
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-white mb-4">Add Components</h3>
                      {[
                        { type: 'button', icon: Square, label: 'Button', desc: 'Interactive button element' },
                        { type: 'input', icon: Type, label: 'Input Field', desc: 'Text input component' },
                        { type: 'text', icon: Type, label: 'Text', desc: 'Static text element' },
                        { type: 'navigation', icon: Navigation, label: 'Navigation', desc: 'Navigation bar' },
                        { type: 'container', icon: Layout, label: 'Container', desc: 'Layout container' },
                        { type: 'image', icon: Image, label: 'Image', desc: 'Image placeholder' }
                      ].map(({ type, icon: Icon, label, desc }) => (
                        <motion.button
                          key={type}
                          whileHover={{ scale: 1.02, x: 4 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => addComponent(type)}
                          className="w-full p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl text-left text-white hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{label}</div>
                              <div className="text-xs text-gray-400">{desc}</div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Enhanced Input Area */}
              <div className="p-4 border-t border-white/10">
                <div className="space-y-3">
                  {activeTab === 'chat' && (
                    <div className="flex space-x-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Describe your wireframe idea..."
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleSendMessage}
                            disabled={isLoading || !inputValue.trim()}
                            className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            <Send className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center space-x-2">
                      <span>Press Enter to send</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>{performance.components} components</span>
                      <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                      <span>{performance.fps} FPS</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex relative z-10">
          {/* Chat Panel */}
          <motion.div 
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-96 bg-black/40 backdrop-blur-xl border-r border-white/10"
          >
            <WireframeChat 
              onWireframeGenerated={handleWireframeGenerated}
              currentWireframe={wireframeData}
            />
          </motion.div>

          {/* Canvas Area */}
          <div className="flex-1 relative bg-white overflow-hidden">
            <PageNavigation 
              wireframeData={wireframeData}
              currentPageId={currentPageId}
              onPageChange={(page) => {
                setCurrentPageId(page.id);
                setWireframeComponents(page.components || []);
              }}
            />
              
              {/* Zoom Controls */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-2 bg-white/10 rounded-xl border border-white/10">
                  <Eye className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300 font-medium">{zoomLevel}%</span>
                </div>
                
                <div className="flex items-center space-x-1 bg-white/10 rounded-xl p-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const stage = stageRef.current;
                      if (stage) {
                        const newScale = Math.max(0.1, stage.scaleX() / 1.2);
                        stage.scale({ x: newScale, y: newScale });
                        setZoomLevel(Math.round(newScale * 100));
                        stage.batchDraw();
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const stage = stageRef.current;
                      if (stage) {
                        stage.scale({ x: 1, y: 1 });
                        stage.position({ x: 0, y: 0 });
                        setZoomLevel(100);
                        stage.batchDraw();
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const stage = stageRef.current;
                      if (stage) {
                        const newScale = Math.min(5, stage.scaleX() * 1.2);
                        stage.scale({ x: newScale, y: newScale });
                        setZoomLevel(Math.round(newScale * 100));
                        stage.batchDraw();
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Page Tabs */}
            {wireframeData && wireframeData.pages && wireframeData.pages.length > 1 && (
              <div className="flex items-center space-x-1 mb-4">
                <span className="text-sm font-medium text-gray-300 mr-3">Pages:</span>
                {wireframeData.pages.map(page => (
                  <motion.button
                    key={page.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => switchToPage(page.id)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      currentPageId === page.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {page.title}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Figma-Inspired Design Tools */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Design Mode Selector */}
                <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDesignMode('select')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      designMode === 'select'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                    title="Select Tool (V)"
                  >
                    <MousePointer className="w-4 h-4" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDesignMode('hand')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      designMode === 'hand'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                    title="Hand Tool (H) - Pan Canvas"
                  >
                    <Hand className="w-4 h-4" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDesignMode('comment')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      designMode === 'comment'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                    title="Comment Tool (C) - Click to add comments"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Layers Toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowProperties(!showProperties)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showProperties 
                      ? 'bg-blue-500 text-white shadow-lg' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Layers</span>
                </motion.button>

                {/* Grid Toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowGrid(!showGrid)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showGrid 
                      ? 'bg-purple-500 text-white shadow-lg' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span>Grid</span>
                </motion.button>
              </div>

              {/* Advanced Tools */}
              <div className="flex items-center space-x-2">
                {/* Collaboration Avatars */}
                <div className="flex items-center space-x-1 mr-3">
                  {collaborators.map((collaborator) => (
                    <motion.div
                      key={collaborator.id}
                      whileHover={{ scale: 1.1 }}
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer ${
                        collaborator.active ? 'ring-2 ring-white/30' : 'opacity-50'
                      }`}
                      style={{ backgroundColor: collaborator.color }}
                      title={`${collaborator.name} ${collaborator.active ? '(Active)' : '(Away)'}`}
                    >
                      {collaborator.avatar}
                      {collaborator.active && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900"></div>
                      )}
                    </motion.div>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    className="w-8 h-8 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center text-white/60 hover:text-white hover:border-white/50 transition-colors"
                    title="Invite collaborators"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAIEnhance}
                  disabled={isLoading || wireframeComponents.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="AI Enhance - Improve component styling"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isLoading ? 'Enhancing...' : 'AI Enhance'}</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAutoLayout}
                  disabled={wireframeComponents.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Auto Layout - Arrange components automatically"
                >
                  <Layout className="w-4 h-4" />
                  <span>Auto Layout</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    // Could add toast notification here
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                  title="Share - Copy link to clipboard"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Canvas */}
          <div className="flex-1 bg-gray-100 overflow-hidden relative">
            {/* Rulers */}
            {showRulers && (
              <>
                {/* Top Ruler */}
                <div className="absolute top-0 left-8 right-8 h-6 bg-gray-800/90 border-b border-white/10 flex items-end text-xs text-gray-400 z-20">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="flex-1 relative">
                      <div className="absolute bottom-0 left-0 w-px h-2 bg-white/20"></div>
                      {i % 5 === 0 && (
                        <span className="absolute bottom-0 left-1 text-xs">{i * 50}</span>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Left Ruler */}
                <div className="absolute top-6 bottom-8 left-0 w-8 bg-gray-800/90 border-r border-white/10 flex flex-col justify-end text-xs text-gray-400 z-20">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="flex-1 relative">
                      <div className="absolute bottom-0 left-0 h-px w-2 bg-white/20"></div>
                      {i % 5 === 0 && (
                        <span className="absolute bottom-0 left-1 text-xs transform -rotate-90 origin-left">{i * 50}</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Canvas Container */}
            <div className="flex items-center justify-center h-full p-8" style={{ paddingTop: showRulers ? '56px' : '32px', paddingLeft: showRulers ? '56px' : '32px' }}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className={`bg-white relative overflow-hidden shadow-2xl border border-gray-300 ${
                  designMode === 'hand' ? 'cursor-grab active:cursor-grabbing' : 
                  designMode === 'comment' ? 'cursor-crosshair' : 'cursor-default'
                }`}
                style={{
                  width: getCanvasSize().width,
                  height: getCanvasSize().height,
                  borderRadius: viewMode === 'mobile' ? 24 : viewMode === 'tablet' ? 16 : 8,
                  border: viewMode !== 'desktop' ? '4px solid #e5e7eb' : '2px solid #e5e7eb'
                }}
                onClick={handleCanvasClick}
              >
                {/* Guides */}
                {showGuides && (
                  <>
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-cyan-400/30 pointer-events-none"></div>
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-cyan-400/30 pointer-events-none"></div>
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-cyan-400/30 pointer-events-none"></div>
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-cyan-400/30 pointer-events-none"></div>
                  </>
                )}

                {/* Device Frame Indicator */}
                {viewMode !== 'desktop' && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-white/10 rounded-full text-xs text-white font-medium">
                    {viewMode === 'mobile' ? '📱 iPhone 14 Pro' : '📱 iPad Pro'}
                  </div>
                )}

                {/* Comments */}
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute z-10"
                    style={{ left: comment.x, top: comment.y }}
                  >
                    <div className="relative">
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                        💬
                      </div>
                      <div className="absolute left-8 top-0 bg-black/90 text-white p-3 rounded-lg shadow-xl min-w-48 max-w-64">
                        <div className="text-sm font-medium text-blue-300">{comment.author}</div>
                        <div className="text-sm mt-1">{comment.text}</div>
                        <div className="text-xs text-gray-400 mt-2">{comment.timestamp}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Comment Input Modal */}
                {isAddingComment && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute z-20 bg-black/90 p-4 rounded-lg shadow-xl"
                    style={{ left: newComment.x, top: newComment.y }}
                  >
                    <div className="text-white text-sm font-medium mb-2">Add Comment</div>
                    <textarea
                      value={newComment.text}
                      onChange={(e) => setNewComment(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="Type your comment..."
                      className="w-64 h-20 bg-gray-800 text-white p-2 rounded text-sm resize-none"
                      autoFocus
                    />
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        onClick={() => setViewMode('desktop')}
                        className={`px-3 py-1 rounded text-sm ${viewMode === 'desktop' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                      >
                        Desktop
                      </button>
                      <button
                        onClick={() => setViewMode('tablet')}
                        className={`px-3 py-1 rounded text-sm ${viewMode === 'tablet' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                      >
                        Tablet
                      </button>
                      <button
                        onClick={() => setViewMode('mobile')}
                        className={`px-3 py-1 rounded text-sm ${viewMode === 'mobile' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                      >
                        Mobile
                      </button>
                      <button
                        onClick={goBackToPreviousVersion}
                        className="px-3 py-1 rounded text-sm bg-orange-500 text-white hover:bg-orange-600"
                        title="Go back to previous wireframe version"
                      >
                        ↶ Undo
                      </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleAddComment}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setIsAddingComment(false)}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
                {/* Animated Grid Background */}
                <AnimatePresence>
                  {showGrid && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0"
                    >
                      <div className="grid grid-cols-20 grid-rows-20 h-full w-full">
                        {Array.from({ length: 400 }).map((_, i) => (
                          <motion.div 
                            key={i} 
                            className="border border-blue-400/20"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.001 }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Performance Optimized Canvas */}
                <Stage
                  ref={stageRef}
                  width={getCanvasSize().width}
                  height={getCanvasSize().height}
                  draggable
                  className="relative z-10"
                  onWheel={(e) => {
                    e.evt.preventDefault();
                    const scaleBy = 1.05;
                    const stage = e.target.getStage();
                    const oldScale = stage.scaleX();
                    const pointer = stage.getPointerPosition();
                    
                    if (!pointer) return;
                    
                    const mousePointTo = {
                      x: (pointer.x - stage.x()) / oldScale,
                      y: (pointer.y - stage.y()) / oldScale,
                    };
                    
                    let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
                    
                    // Limit zoom range
                    newScale = Math.max(0.1, Math.min(5, newScale));
                    setZoomLevel(Math.round(newScale * 100));
                    
                    stage.scale({ x: newScale, y: newScale });
                    
                    const newPos = {
                      x: pointer.x - mousePointTo.x * newScale,
                      y: pointer.y - mousePointTo.y * newScale,
                    };
                    stage.position(newPos);
                    stage.batchDraw();
                  }}
                >
                  <Layer ref={layerRef}>
                    {wireframeComponents.length === 0 ? (
                      <Text
                        x={getCanvasSize().width / 2}
                        y={getCanvasSize().height / 2}
                        text={`${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} wireframe will appear here\nCanvas: ${getCanvasSize().width}x${getCanvasSize().height}px`}
                        fontSize={18}
                        fill="#374151"
                        align="center"
                        offsetX={150}
                        offsetY={20}
                      />
                    ) : (
                      wireframeComponents.map(component => (
                        <Group key={component.id}>
                          <Rect
                            x={component.x}
                            y={component.y}
                            width={component.width}
                            height={component.height}
                            fill={component.backgroundColor || '#ffffff'}
                            stroke={component.borderColor || '#e5e7eb'}
                            strokeWidth={component.borderWidth || 1}
                            cornerRadius={component.borderRadius || 0}
                            shadowColor="rgba(0,0,0,0.1)"
                            shadowBlur={4}
                            shadowOffsetY={2}
                            draggable
                            onClick={() => setSelectedObject(component)}
                          />
                          <Text
                            x={component.x + (component.padding || 10)}
                            y={component.y + (component.padding || 10)}
                            text={component.text || component.label || component.type}
                            fontSize={component.fontSize || 14}
                            fontFamily={component.fontFamily || 'Inter, Arial, sans-serif'}
                            fill={component.textColor || '#111827'}
                            width={component.width - (component.padding || 10) * 2}
                            height={component.height - (component.padding || 10) * 2}
                            verticalAlign="middle"
                            align={component.textAlign || 'left'}
                            wrap="word"
                          />
                        </Group>
                      ))
                    )}
                  </Layer>
                </Stage>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        {showProperties && selectedObject && (
          <div 
            className="bg-gray-800 border-l border-gray-700 overflow-y-auto relative"
            style={{ width: propertiesPanelWidth }}
          >
            {/* Resize Handle */}
            <div
              className="absolute left-0 top-0 w-1 h-full bg-gray-600 hover:bg-blue-500 cursor-col-resize transition-colors duration-200 z-10"
              onMouseDown={handleResizeStart}
              title="Drag to resize panel"
            />
            <div className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Properties</h3>
            
            <div className="space-y-6">
              {/* Text Content */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Text Content
                </label>
                <input
                  type="text"
                  value={selectedObject.text || ''}
                  onChange={(e) => updateObjectProperty('text', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Typography */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-200 border-b border-gray-600 pb-1">Typography</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Font Size</label>
                    <input
                      type="number"
                      min="8"
                      max="72"
                      value={selectedObject.fontSize || 14}
                      onChange={(e) => updateObjectProperty('fontSize', parseInt(e.target.value))}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Font Weight</label>
                    <select
                      value={selectedObject.fontWeight || 'normal'}
                      onChange={(e) => updateObjectProperty('fontWeight', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Text Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={selectedObject.textColor || '#000000'}
                      onChange={(e) => updateObjectProperty('textColor', e.target.value)}
                      className="w-12 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedObject.textColor || '#000000'}
                      onChange={(e) => updateObjectProperty('textColor', e.target.value)}
                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Background & Fill */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-200 border-b border-gray-600 pb-1">Background</h4>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Background Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={selectedObject.fill || '#ffffff'}
                      onChange={(e) => updateObjectProperty('fill', e.target.value)}
                      className="w-12 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedObject.fill || '#ffffff'}
                      onChange={(e) => updateObjectProperty('fill', e.target.value)}
                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Opacity</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={selectedObject.opacity || 1}
                      onChange={(e) => updateObjectProperty('opacity', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-400 w-8">{Math.round((selectedObject.opacity || 1) * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Border */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-200 border-b border-gray-600 pb-1">Border</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Border Width</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={selectedObject.borderWidth || 1}
                      onChange={(e) => updateObjectProperty('borderWidth', parseInt(e.target.value))}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Border Radius</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={selectedObject.borderRadius || 4}
                      onChange={(e) => updateObjectProperty('borderRadius', parseInt(e.target.value))}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Border Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={selectedObject.borderColor || '#6b7280'}
                      onChange={(e) => updateObjectProperty('borderColor', e.target.value)}
                      className="w-12 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedObject.borderColor || '#6b7280'}
                      onChange={(e) => updateObjectProperty('borderColor', e.target.value)}
                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Effects */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-200 border-b border-gray-600 pb-1">Effects</h4>
                
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Drop Shadow</label>
                  <input
                    type="checkbox"
                    checked={selectedObject.shadow || false}
                    onChange={(e) => updateObjectProperty('shadow', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                </div>

                {selectedObject.shadow && (
                  <div className="space-y-2 pl-4 border-l-2 border-gray-600">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Shadow Color</label>
                      <input
                        type="color"
                        value={selectedObject.shadowColor || '#000000'}
                        onChange={(e) => updateObjectProperty('shadowColor', e.target.value)}
                        className="w-full h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Blur</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={selectedObject.shadowBlur || 4}
                          onChange={(e) => updateObjectProperty('shadowBlur', parseInt(e.target.value))}
                          className="w-full px-1 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">X</label>
                        <input
                          type="number"
                          min="-20"
                          max="20"
                          value={selectedObject.shadowOffset?.x || 2}
                          onChange={(e) => updateObjectProperty('shadowOffset', { ...selectedObject.shadowOffset, x: parseInt(e.target.value) })}
                          className="w-full px-1 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Y</label>
                        <input
                          type="number"
                          min="-20"
                          max="20"
                          value={selectedObject.shadowOffset?.y || 2}
                          onChange={(e) => updateObjectProperty('shadowOffset', { ...selectedObject.shadowOffset, y: parseInt(e.target.value) })}
                          className="w-full px-1 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-600">
                <button
                  onClick={deleteSelectedObject}
                  className="flex items-center justify-center space-x-2 w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Component</span>
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default WorkspaceCanvas;
