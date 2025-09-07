import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import Konva from 'konva';
import { ArrowLeft, Home, Settings, Download, Upload, Undo, Redo, Trash2, Plus, Monitor, Tablet, Smartphone, Palette, Zap, Eye, Layers } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState('desktop'); // desktop, tablet, mobile
  const [deviceTheme, setDeviceTheme] = useState('web'); // web, ios, android
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [performance, setPerformance] = useState({ fps: 60, components: 0 });
  const stageRef = useRef(null);
  const layerRef = useRef(null);

  // Performance monitoring
  useEffect(() => {
    const updatePerformance = () => {
      setPerformance(prev => ({
        ...prev,
        components: wireframeComponents.length,
        fps: Math.round(60 - (wireframeComponents.length * 0.1))
      }));
    };
    updatePerformance();
  }, [wireframeComponents]);

  // Responsive canvas sizing
  const getCanvasSize = () => {
    const baseWidth = window.innerWidth * (isCollapsed ? 0.85 : 0.67);
    const baseHeight = window.innerHeight - 160;
    
    switch (viewMode) {
      case 'mobile':
        return { width: Math.min(baseWidth, 375), height: Math.min(baseHeight, 812) };
      case 'tablet':
        return { width: Math.min(baseWidth, 768), height: Math.min(baseHeight, 1024) };
      default:
        return { width: baseWidth, height: baseHeight };
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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { type: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const requestBody = {
        prompt: inputValue,
        sessionId: sessionId,
        existingWireframe: wireframeData
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
    if (data && data.pages) {
      // Multi-page wireframe
      setWireframeData(data);
      setCurrentPageId(data.pages[0]?.id);
      setWireframeComponents(data.pages[0]?.components || []);
    } else if (data && data.components) {
      // Single page wireframe (legacy)
      setWireframeComponents(data.components);
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

  const addComponent = (type) => {
    const centerX = 400;
    const centerY = 300;
    
    const newComponent = {
      id: Date.now(),
      type,
      x: centerX - 50,
      y: centerY - 15,
      width: type === 'text' ? 100 : (type === 'navigation' ? 300 : 150),
      height: type === 'text' ? 20 : (type === 'navigation' ? 40 : 30),
      text: type === 'button' ? 'Button' : 
            type === 'input' ? 'Enter text...' : 
            type === 'text' ? 'Sample Text' :
            type === 'navigation' ? 'Navigation' : 
            type.charAt(0).toUpperCase() + type.slice(1),
      // Enhanced styling properties
      fill: type === 'button' ? '#3b82f6' : 
            type === 'navigation' ? '#1f2937' : '#ffffff',
      textColor: type === 'navigation' ? '#ffffff' : '#000000',
      fontSize: type === 'text' ? 16 : 14,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      borderColor: '#6b7280',
      borderWidth: 1,
      borderRadius: type === 'button' ? 6 : 4,
      opacity: 1,
      shadow: false,
      shadowColor: '#000000',
      shadowBlur: 4,
      shadowOffset: { x: 2, y: 2 }
    };
    
    setWireframeComponents(prev => [...prev, newComponent]);
    saveCanvasState();
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
    const { type, x, y, width, height, text, fill } = component;
    
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

    if (type === 'text') {
      return (
        <Text
          key={component.id}
          x={x}
          y={y}
          text={text}
          fontSize={component.fontSize || 16}
          fontFamily={component.fontFamily || 'Arial'}
          fontStyle={component.fontWeight || 'normal'}
          fill={component.textColor || '#333'}
          opacity={component.opacity || 1}
          draggable
          onClick={handleClick}
          onDragEnd={handleDragEnd}
          stroke={isSelected ? '#007bff' : 'transparent'}
          strokeWidth={2}
          shadowColor={component.shadow ? component.shadowColor : undefined}
          shadowBlur={component.shadow ? component.shadowBlur : 0}
          shadowOffset={component.shadow ? component.shadowOffset : { x: 0, y: 0 }}
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
        <Rect
          width={width}
          height={height}
          fill={fill || '#f8f9fa'}
          stroke={isSelected ? '#007bff' : (component.borderColor || '#333')}
          strokeWidth={isSelected ? 2 : (component.borderWidth || 1)}
          cornerRadius={component.borderRadius || (type === 'button' ? 4 : 2)}
          opacity={component.opacity || 1}
          shadowColor={component.shadow ? component.shadowColor : undefined}
          shadowBlur={component.shadow ? component.shadowBlur : 0}
          shadowOffset={component.shadow ? component.shadowOffset : { x: 0, y: 0 }}
        />
        <Text
          x={10}
          y={height / 2 - 8}
          text={text}
          fontSize={component.fontSize || 14}
          fontFamily={component.fontFamily || 'Arial'}
          fontStyle={component.fontWeight || 'normal'}
          fill={component.textColor || (type === 'navigation' ? 'white' : '#333')}
        />
      </Group>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Navbar */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-gray-600"></div>
            <h1 className="text-xl font-bold text-white">
              {projectName || 'Untitled Project'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Performance Monitor */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded-lg">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-300">{performance.fps}fps</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-300">{performance.components} components</span>
            </div>
            
            {/* View Mode Switcher */}
            <div className="flex items-center space-x-1 bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('desktop')}
                className={`p-2 rounded transition-colors ${viewMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Desktop View (1)"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('tablet')}
                className={`p-2 rounded transition-colors ${viewMode === 'tablet' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Tablet View (2)"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`p-2 rounded transition-colors ${viewMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Mobile View (3)"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* Device Theme Switcher */}
            <select
              value={deviceTheme}
              onChange={(e) => setDeviceTheme(e.target.value)}
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="web">Web</option>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
            </select>

            <div className="h-6 w-px bg-gray-600"></div>
            
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= canvasHistory.length - 1}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Toggle Sidebar (Ctrl+H)"
            >
              <Layers className="w-5 h-5" />
            </button>
            
            <div className="h-6 w-px bg-gray-600"></div>
            <button
              onClick={exportAsPNG}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>PNG</span>
            </button>
            <button
              onClick={exportAsJSON}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Panel */}
        <div className={`${isCollapsed ? 'w-0 overflow-hidden' : 'w-1/3'} bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300`}>
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">AI Wireframe Chat</h2>
            <p className="text-sm text-gray-400">Describe your wireframe and I'll generate it</p>
          </div>
        
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white ml-8'
                    : message.type === 'error'
                    ? 'bg-red-600 text-white mr-8'
                    : 'bg-gray-700 text-gray-100 mr-8'
                }`}
              >
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div className="bg-gray-700 text-gray-100 mr-8 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <span>Generating wireframe...</span>
                </div>
              </div>
            )}
          </div>
        
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your wireframe..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Canvas Panel */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Header */}
          <div className="bg-gray-800 border-b border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                {wireframeData && (
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <span>App Type: {wireframeData.appType}</span>
                    <span>•</span>
                    <span>{wireframeData.totalPages} Pages</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">Zoom: {zoomLevel}%</span>
                <button
                  onClick={() => {
                    const stage = stageRef.current;
                    if (stage) {
                      stage.scale({ x: 1, y: 1 });
                      stage.position({ x: 0, y: 0 });
                      setZoomLevel(100);
                      stage.batchDraw();
                    }
                  }}
                  className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    const stage = stageRef.current;
                    if (stage) {
                      const newScale = Math.max(0.1, stage.scaleX() / 1.2);
                      stage.scale({ x: newScale, y: newScale });
                      setZoomLevel(Math.round(newScale * 100));
                      stage.batchDraw();
                    }
                  }}
                  className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
                >
                  -
                </button>
                <button
                  onClick={() => {
                    const stage = stageRef.current;
                    if (stage) {
                      const newScale = Math.min(5, stage.scaleX() * 1.2);
                      stage.scale({ x: newScale, y: newScale });
                      setZoomLevel(Math.round(newScale * 100));
                      stage.batchDraw();
                    }
                  }}
                  className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Page Tabs */}
            {wireframeData && wireframeData.pages && wireframeData.pages.length > 1 && (
              <div className="flex items-center space-x-1 mb-4">
                <span className="text-sm font-medium text-gray-300 mr-3">Pages:</span>
                {wireframeData.pages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => switchToPage(page.id)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      currentPageId === page.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {page.title}
                  </button>
                ))}
              </div>
            )}

            {/* Component Toolbar */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-300 mr-2">Add:</span>
              <button
                onClick={() => addComponent('button')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Button</span>
              </button>
              <button
                onClick={() => addComponent('input')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Input</span>
              </button>
              <button
                onClick={() => addComponent('text')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Text</span>
              </button>
              <button
                onClick={() => addComponent('navigation')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Nav</span>
              </button>
              <button
                onClick={() => addComponent('container')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Container</span>
              </button>
              <button
                onClick={() => addComponent('image')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Image</span>
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-gray-900 overflow-hidden relative">
            {/* Device Frame */}
            <div className="flex items-center justify-center h-full p-8">
              <div 
                className={`bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden`}
                style={{
                  width: getCanvasSize().width,
                  height: getCanvasSize().height,
                  borderRadius: getDeviceStyles().borderRadius,
                  boxShadow: `0 20px 40px ${getDeviceStyles().shadow}`,
                  border: viewMode !== 'desktop' ? '8px solid #374151' : 'none'
                }}
              >
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-5">
                  <div className="grid grid-cols-20 grid-rows-20 h-full w-full">
                    {Array.from({ length: 400 }).map((_, i) => (
                      <div key={i} className="border border-gray-600"></div>
                    ))}
                  </div>
                </div>
                
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
                        text={`${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} wireframe will appear here`}
                        fontSize={18}
                        fill="#9ca3af"
                        offsetX={120}
                        offsetY={9}
                      />
                    ) : (
                      wireframeComponents.map(component => (
                        <KonvaComponent
                          key={component.id}
                          component={component}
                          isSelected={selectedObject?.id === component.id}
                          onSelect={setSelectedObject}
                        />
                      ))
                    )}
                  </Layer>
                </Stage>
              </div>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        {showProperties && selectedObject && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
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
                      <option value="lighter">Light</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Font Family</label>
                  <select
                    value={selectedObject.fontFamily || 'Arial'}
                    onChange={(e) => updateObjectProperty('fontFamily', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
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
        )}
      </div>
    </div>
  );
};

export default WorkspaceCanvas;
