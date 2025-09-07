import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import Konva from 'konva';
import { 
  ArrowLeft, Download, Undo, Redo, Trash2, Plus, Monitor, Tablet, 
  Smartphone, Zap, Layers, Send, Loader, Sparkles, Lightbulb
} from 'lucide-react';

const WorkspaceCanvas = () => {
  const { projectName } = useParams();
  const location = useLocation();
  
  // Chat states
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Canvas states
  const [wireframeData, setWireframeData] = useState(null);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [wireframeComponents, setWireframeComponents] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [showProperties, setShowProperties] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [viewMode, setViewMode] = useState('desktop');
  const [deviceTheme, setDeviceTheme] = useState('web');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [performance, setPerformance] = useState({ fps: 60, components: 0 });
  const [quickLoading, setQuickLoading] = useState(false);
  
  const stageRef = useRef(null);
  const layerRef = useRef(null);

  // Sample prompts for chat
  const samplePrompts = [
    "Create a login page with email and password",
    "Design an e-commerce homepage", 
    "Build a dashboard with charts",
    "Make a contact form layout"
  ];

  // Quick load wireframes from project data
  useEffect(() => {
    if (location.state?.quickLoad && location.state?.wireframeData) {
      const { wireframeData, projectData, templateData, isTemplate } = location.state;
      
      if (wireframeData && wireframeData.length > 0) {
        // Load the first wireframe instantly
        const firstWireframe = wireframeData[0];
        setWireframeData(firstWireframe);
        
        if (firstWireframe.pages && firstWireframe.pages.length > 0) {
          const firstPage = firstWireframe.pages[0];
          setCurrentPageId(firstPage.id);
          setWireframeComponents(firstPage.components || []);
        }
        
        // Add success message
        const message = isTemplate 
          ? `🎨 Template "${templateData.name}" loaded successfully! Start customizing your design.`
          : `✨ Loaded "${projectData.name}" with ${wireframeData.length} wireframe(s). Ready to continue designing!`;
          
        setMessages([{
          type: 'assistant',
          content: message,
          timestamp: new Date().toISOString()
        }]);
      }
    }
  }, [location.state]);

  // Auto-scroll chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Performance monitoring
  useEffect(() => {
    setPerformance(prev => ({
      ...prev,
      components: wireframeComponents.length,
      fps: Math.round(60 - (wireframeComponents.length * 0.1))
    }));
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

  // Chat message handler
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/wireframe/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage.content,
          sessionId: sessionId,
          existingWireframe: wireframeData ? {
            components: wireframeComponents,
            pages: wireframeData.pages,
            websiteType: wireframeData.websiteType || wireframeData.appType,
            currentPageId: currentPageId
          } : null
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage = {
          type: 'assistant',
          content: data.message || 'Wireframe generated successfully!',
          timestamp: new Date().toISOString(),
          version: data.isModification ? 'Modified' : 'Generated',
          hasQuestions: data.hasQuestions,
          questions: data.questions,
          suggestions: data.suggestions,
          sessionState: data.sessionState
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setSessionId(data.sessionId);
        
        // Load wireframe into canvas
        if (data.wireframe) {
          handleWireframeGenerated(data.wireframe);
        }
      } else {
        const errorMessage = {
          type: 'error',
          content: data.error || 'Failed to generate wireframe',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        type: 'error',
        content: 'Network error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle wireframe generation
  const handleWireframeGenerated = (wireframeData) => {
    console.log("🎨 Loading wireframe data:", wireframeData);
    
    if (wireframeData && wireframeData.json) {
      setWireframeData(wireframeData.json);
      
      if (wireframeData.json.pages && wireframeData.json.pages.length > 0) {
        const firstPage = wireframeData.json.pages[0];
        setCurrentPageId(firstPage.id);
        setWireframeComponents(firstPage.components || []);
      } else if (wireframeData.json.components) {
        setWireframeComponents(wireframeData.json.components);
      }
      
      setSelectedObject(null);
      setShowProperties(false);
      saveCanvasState();
      
      console.log("✅ Wireframe loaded successfully");
    }
  };

  // Canvas operations
  const switchToPage = (pageId) => {
    if (!wireframeData || !wireframeData.pages) return;
    
    const page = wireframeData.pages.find(p => p.id === pageId);
    if (page) {
      setCurrentPageId(pageId);
      setWireframeComponents(page.components || []);
      setSelectedObject(null);
      setShowProperties(false);
    }
  };

  const addComponent = (type) => {
    const centerX = getCanvasSize().width / 2;
    const centerY = getCanvasSize().height / 2;
    
    const componentConfigs = {
      text: {
        width: 150, height: 40, text: 'Sample Text',
        fill: 'transparent', textColor: '#374151', fontSize: 16,
        borderWidth: 0, borderRadius: 0
      },
      button: {
        width: 120, height: 40, text: 'Button',
        fill: '#3b82f6', textColor: '#ffffff', fontSize: 14,
        borderWidth: 0, borderRadius: 8, fontWeight: 'bold'
      },
      input: {
        width: 200, height: 40, text: 'Enter text...',
        fill: '#ffffff', textColor: '#9ca3af', fontSize: 14,
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6
      },
      image: {
        width: 200, height: 150, text: '🖼️ Image Placeholder',
        fill: '#f3f4f6', textColor: '#6b7280', fontSize: 14,
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8
      },
      container: {
        width: 300, height: 200, text: 'Container',
        fill: '#f9fafb', textColor: '#374151', fontSize: 12,
        borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 8
      },
      navigation: {
        width: 400, height: 60, text: 'Home | About | Services | Contact',
        fill: '#1f2937', textColor: '#ffffff', fontSize: 14,
        borderWidth: 0, borderRadius: 0, fontWeight: 'medium'
      },
      card: {
        width: 250, height: 180, text: 'Card Title\n\nCard content goes here...',
        fill: '#ffffff', textColor: '#374151', fontSize: 14,
        borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12
      },
      list: {
        width: 200, height: 120, text: '• List item 1\n• List item 2\n• List item 3',
        fill: 'transparent', textColor: '#374151', fontSize: 14,
        borderWidth: 0, borderRadius: 0
      },
      form: {
        width: 300, height: 250, text: 'Form\n\nName: [____]\nEmail: [____]\n\n[Submit]',
        fill: '#ffffff', textColor: '#374151', fontSize: 12,
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8
      },
      table: {
        width: 350, height: 150, text: 'Header 1 | Header 2 | Header 3\nRow 1    | Data 1   | Data 2\nRow 2    | Data 3   | Data 4',
        fill: '#ffffff', textColor: '#374151', fontSize: 12,
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6
      },
      chart: {
        width: 300, height: 200, text: '📊 Chart Visualization',
        fill: '#f8fafc', textColor: '#475569', fontSize: 16,
        borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8
      },
      modal: {
        width: 400, height: 250, text: 'Modal Title\n\nModal content goes here...\n\n[Close] [Save]',
        fill: '#ffffff', textColor: '#374151', fontSize: 14,
        borderWidth: 2, borderColor: '#374151', borderRadius: 12
      }
    };

    const config = componentConfigs[type] || componentConfigs.text;
    
    const newComponent = {
      id: Date.now(),
      type,
      x: centerX - config.width / 2,
      y: centerY - config.height / 2,
      width: config.width,
      height: config.height,
      text: config.text,
      fill: config.fill,
      textColor: config.textColor,
      fontSize: config.fontSize,
      fontFamily: 'Arial',
      fontWeight: config.fontWeight || 'normal',
      borderColor: config.borderColor || '#d1d5db',
      borderWidth: config.borderWidth,
      borderRadius: config.borderRadius,
      opacity: 1
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
    const dataStr = JSON.stringify({
      components: wireframeComponents,
      wireframeData,
      viewMode,
      timestamp: new Date().toISOString()
    }, null, 2);
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `wireframe-${projectName || 'untitled'}.json`;
    link.href = URL.createObjectURL(dataBlob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Keyboard shortcuts
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
  }, [selectedObject, isCollapsed, historyIndex, canvasHistory]);

  // Konva component renderer
  const KonvaComponent = ({ component, isSelected, onSelect }) => {
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
      
      if (selectedObject && selectedObject.id === component.id) {
        setSelectedObject(prev => ({ ...prev, x: newX, y: newY }));
      }
      
      saveCanvasState();
    };

    if (component.type === 'text') {
      return (
        <Text
          key={component.id}
          x={component.x}
          y={component.y}
          text={component.text || 'Text'}
          fontSize={component.fontSize || 16}
          fontFamily={component.fontFamily || 'Arial'}
          fontStyle={component.fontWeight || 'normal'}
          fill={component.textColor || '#374151'}
          opacity={component.opacity || 1}
          draggable
          onClick={handleClick}
          onDragEnd={handleDragEnd}
          stroke={isSelected ? '#3b82f6' : 'transparent'}
          strokeWidth={2}
        />
      );
    }

    return (
      <Group
        key={component.id}
        x={component.x}
        y={component.y}
        draggable
        onClick={handleClick}
        onDragEnd={handleDragEnd}
      >
        <Rect
          width={component.width || 200}
          height={component.height || 40}
          fill={component.fill || '#ffffff'}
          stroke={isSelected ? '#3b82f6' : (component.borderColor || '#d1d5db')}
          strokeWidth={isSelected ? 2 : (component.borderWidth || 1)}
          cornerRadius={component.borderRadius || 4}
          opacity={component.opacity || 1}
        />
        <Text
          x={8}
          y={(component.height || 40) / 2 - 7}
          text={component.text || 'Component'}
          fontSize={component.fontSize || 14}
          fontFamily={component.fontFamily || 'Arial'}
          fontStyle={component.fontWeight || 'normal'}
          fill={component.textColor || '#374151'}
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
        {/* Integrated Chat Panel */}
        <div className={`${isCollapsed ? 'w-0 overflow-hidden' : 'w-80 min-w-80'} bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300`}>
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Wireframe Assistant</h3>
                <p className="text-blue-100 text-xs">Describe your vision, I'll create it</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎨</div>
                <h4 className="text-lg font-semibold text-white mb-2">Let's Create Something Amazing</h4>
                <p className="text-gray-300 text-sm mb-6">Start by describing your wireframe</p>
                
                <div className="grid grid-cols-1 gap-2">
                  {samplePrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setInputValue(prompt)}
                      className="p-2 bg-gray-700 bg-opacity-50 hover:bg-opacity-70 border border-gray-600 rounded-lg text-left text-gray-300 hover:text-white transition-all text-xs flex items-center space-x-2"
                    >
                      <Lightbulb className="w-3 h-3 flex-shrink-0" />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`message-bubble max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  msg.type === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : msg.type === 'error'
                    ? 'bg-red-600 text-white rounded-bl-sm'
                    : 'bg-gray-700 text-gray-100 rounded-bl-sm'
                }`}>
                  <div className="leading-relaxed">{msg.content}</div>
                  
                  {/* Follow-up Questions */}
                  {msg.hasQuestions && msg.questions && msg.questions.length > 0 && (
                    <div className="mt-3 p-2 bg-black bg-opacity-20 rounded-lg">
                      <div className="text-xs font-semibold mb-2 text-blue-200">Follow-up Questions:</div>
                      <div className="space-y-1">
                        {msg.questions.map((question, qIndex) => (
                          <div key={qIndex} className="text-xs text-gray-200">
                            {qIndex + 1}. {question}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3 p-2 bg-black bg-opacity-20 rounded-lg">
                      <div className="text-xs font-semibold mb-2 text-green-200">Suggestions:</div>
                      <div className="flex flex-wrap gap-1">
                        {msg.suggestions.map((suggestion, sIndex) => (
                          <button
                            key={sIndex}
                            onClick={() => setInputValue(suggestion)}
                            className="px-2 py-1 text-xs bg-green-600 bg-opacity-30 hover:bg-opacity-50 text-green-200 rounded transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {msg.version && (
                    <div className="text-xs mt-2 opacity-75 bg-black bg-opacity-20 px-2 py-1 rounded-full inline-block">
                      {msg.version}
                    </div>
                  )}
                  <div className="text-xs mt-1 opacity-60">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-400 bg-gray-700 rounded-lg p-3 mr-8">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm">Generating wireframe...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-700 bg-gray-800">
            {messages.length === 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-2">Quick start:</div>
                <div className="flex flex-wrap gap-1">
                  {["Login page", "Dashboard", "E-commerce", "Blog"].map((quick, i) => (
                    <button
                      key={i}
                      onClick={() => setInputValue(`Create a ${quick.toLowerCase()} wireframe`)}
                      className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={messages.length === 0 ? "Describe your wireframe..." : "Modify or add to wireframe..."}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
                {inputValue && (
                  <button
                    onClick={() => setInputValue('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
              >
                {isLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                {sessionId && (
                  <span className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Session active</span>
                  </span>
                )}
              </div>
              <span>Press Enter to send</span>
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
                    <span>Type: {wireframeData.websiteType || 'Wireframe'}</span>
                    {wireframeData.pages && (
                      <>
                        <span>•</span>
                        <span>{wireframeData.pages.length} page(s)</span>
                      </>
                    )}
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
              </div>
            </div>

            {/* Page Navigation Tabs */}
            {wireframeData && wireframeData.pages && wireframeData.pages.length > 1 && (
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-sm text-gray-300 mr-2">Pages:</span>
                {wireframeData.pages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => switchToPage(page.id)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      currentPageId === page.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {page.name}
                  </button>
                ))}
              </div>
            )}

            {/* Component Toolbar */}
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-sm text-gray-300 mr-2">Add:</span>
              <button
                onClick={() => addComponent('text')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Text</span>
              </button>
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
                onClick={() => addComponent('image')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Image</span>
              </button>
              <button
                onClick={() => addComponent('container')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Container</span>
              </button>
              <button
                onClick={() => addComponent('navigation')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Navigation</span>
              </button>
              <button
                onClick={() => addComponent('card')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Card</span>
              </button>
              <button
                onClick={() => addComponent('list')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>List</span>
              </button>
              <button
                onClick={() => addComponent('form')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Form</span>
              </button>
              <button
                onClick={() => addComponent('table')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Table</span>
              </button>
              <button
                onClick={() => addComponent('chart')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Chart</span>
              </button>
              <button
                onClick={() => addComponent('modal')}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Modal</span>
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-gray-900 overflow-hidden relative">
            <div className="flex items-center justify-center h-full p-8">
              <div 
                className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden"
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
                  <svg width="100%" height="100%">
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#6b7280" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
                
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
                  onMouseDown={(e) => {
                    if (e.target === e.target.getStage()) {
                      setSelectedObject(null);
                      setShowProperties(false);
                    }
                  }}
                >
                  <Layer ref={layerRef}>
                    {wireframeComponents.length === 0 ? (
                      <>
                        <Text
                          x={getCanvasSize().width / 2}
                          y={getCanvasSize().height / 2 - 40}
                          text={`${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Canvas`}
                          fontSize={24}
                          fill="#6b7280"
                          fontStyle="bold"
                          offsetX={80}
                          offsetY={12}
                        />
                        <Text
                          x={getCanvasSize().width / 2}
                          y={getCanvasSize().height / 2}
                          text="Start by describing your wireframe in the chat"
                          fontSize={16}
                          fill="#9ca3af"
                          offsetX={150}
                          offsetY={8}
                        />
                        <Text
                          x={getCanvasSize().width / 2}
                          y={getCanvasSize().height / 2 + 30}
                          text="Or use the component toolbar above to add elements manually"
                          fontSize={14}
                          fill="#9ca3af"
                          offsetX={200}
                          offsetY={7}
                        />
                      </>
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

              {/* Position & Size */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-200 border-b border-gray-600 pb-1">Position & Size</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">X Position</label>
                    <input
                      type="number"
                      value={Math.round(selectedObject.x || 0)}
                      onChange={(e) => updateObjectProperty('x', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Y Position</label>
                    <input
                      type="number"
                      value={Math.round(selectedObject.y || 0)}
                      onChange={(e) => updateObjectProperty('y', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Width</label>
                    <input
                      type="number"
                      min="10"
                      value={Math.round(selectedObject.width || 100)}
                      onChange={(e) => updateObjectProperty('width', parseInt(e.target.value) || 100)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Height</label>
                    <input
                      type="number"
                      min="10"
                      value={Math.round(selectedObject.height || 40)}
                      onChange={(e) => updateObjectProperty('height', parseInt(e.target.value) || 40)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Background & Appearance */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-200 border-b border-gray-600 pb-1">Background & Appearance</h4>
                
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Border Width</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={selectedObject.borderWidth || 1}
                      onChange={(e) => updateObjectProperty('borderWidth', parseInt(e.target.value) || 0)}
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
                      onChange={(e) => updateObjectProperty('borderRadius', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Border Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={selectedObject.borderColor || '#d1d5db'}
                      onChange={(e) => updateObjectProperty('borderColor', e.target.value)}
                      className="w-12 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedObject.borderColor || '#d1d5db'}
                      onChange={(e) => updateObjectProperty('borderColor', e.target.value)}
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

              {/* Advanced Styling */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-200 border-b border-gray-600 pb-1">Advanced Styling</h4>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Component Type</label>
                  <select
                    value={selectedObject.type || 'text'}
                    onChange={(e) => updateObjectProperty('type', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="button">Button</option>
                    <option value="input">Input Field</option>
                    <option value="container">Container</option>
                    <option value="image">Image</option>
                    <option value="navigation">Navigation</option>
                  </select>
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Rotation (°)</label>
                    <input
                      type="number"
                      min="-180"
                      max="180"
                      value={selectedObject.rotation || 0}
                      onChange={(e) => updateObjectProperty('rotation', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Z-Index</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={selectedObject.zIndex || 1}
                      onChange={(e) => updateObjectProperty('zIndex', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

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
                          onChange={(e) => updateObjectProperty('shadowBlur', parseInt(e.target.value) || 0)}
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
                          onChange={(e) => updateObjectProperty('shadowOffset', { 
                            ...(selectedObject.shadowOffset || {}), 
                            x: parseInt(e.target.value) || 0 
                          })}
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
                          onChange={(e) => updateObjectProperty('shadowOffset', { 
                            ...(selectedObject.shadowOffset || {}), 
                            y: parseInt(e.target.value) || 0 
                          })}
                          className="w-full px-1 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-200 border-b border-gray-600 pb-1">Quick Actions</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      updateObjectProperty('x', 50);
                      updateObjectProperty('y', 50);
                    }}
                    className="px-2 py-1 bg-blue-600 bg-opacity-30 hover:bg-opacity-50 text-blue-200 rounded text-xs transition-colors"
                  >
                    Reset Position
                  </button>
                  
                  <button
                    onClick={() => {
                      updateObjectProperty('width', 200);
                      updateObjectProperty('height', 40);
                    }}
                    className="px-2 py-1 bg-green-600 bg-opacity-30 hover:bg-opacity-50 text-green-200 rounded text-xs transition-colors"
                  >
                    Reset Size
                  </button>
                  
                  <button
                    onClick={() => {
                      const newComponent = { 
                        ...selectedObject, 
                        id: Date.now(), 
                        x: selectedObject.x + 20, 
                        y: selectedObject.y + 20 
                      };
                      setWireframeComponents(prev => [...prev, newComponent]);
                      saveCanvasState();
                    }}
                    className="px-2 py-1 bg-purple-600 bg-opacity-30 hover:bg-opacity-50 text-purple-200 rounded text-xs transition-colors"
                  >
                    Duplicate
                  </button>
                  
                  <button
                    onClick={() => {
                      updateObjectProperty('fill', '#3b82f6');
                      updateObjectProperty('textColor', '#ffffff');
                      updateObjectProperty('borderRadius', 6);
                    }}
                    className="px-2 py-1 bg-yellow-600 bg-opacity-30 hover:bg-opacity-50 text-yellow-200 rounded text-xs transition-colors"
                  >
                    Make Button
                  </button>
                </div>
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
