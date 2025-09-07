import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Undo, History, Sparkles, Loader } from 'lucide-react';

const WireframeChat = ({ onWireframeGenerated }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  // Sample prompts for inspiration
  const samplePrompts = [
    "Create an e-commerce store homepage",
    "Design a blog website with sidebar",
    "Build a portfolio landing page",
    "Make a dashboard for analytics"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Handle sending messages and wireframe generation
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          sessionId: sessionId
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage = { type: 'assistant', content: data.message || 'Wireframe generated successfully!', timestamp: new Date().toISOString(), version: data.isModification ? 'Modified' : 'Generated' };
        setMessages(prev => [...prev, aiMessage]);
        setSessionId(data.sessionId);
        if (data.wireframe && onWireframeGenerated) {
          onWireframeGenerated(data.wireframe);
        } else if (data.rawWireframe && onWireframeGenerated) {
          onWireframeGenerated({ rawContent: data.rawWireframe });
        }
      } else {
        // Add error message
        const errorMessage = {
          type: 'error',
          content: data.error || 'Failed to generate wireframe. Please try again.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        type: 'error',
        content: 'Network error. Please check your connection and try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle undo functionality
  const handleUndo = () => {
    if (messages.length > 0) {
      setMessages(prev => prev.slice(0, -2)); // Remove last user and AI message pair
    }
  };

  return (
    <motion.div 
      className="wireframe-chat h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Enhanced Header */}
      <div className="chat-header p-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">AI Wireframe Assistant</h3>
            <p className="text-blue-100 text-sm">Describe your vision, I'll create the wireframe</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-area flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div 
              className="welcome-screen text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-6xl mb-6">🎨</div>
              <h4 className="text-xl font-semibold text-white mb-3">Let's Create Something Amazing</h4>
              <p className="text-gray-300 mb-8">Start by describing the wireframe you'd like to create</p>
              
              <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
                {samplePrompts.map((prompt, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setInputValue(prompt)}
                    className="p-3 bg-gray-800 bg-opacity-50 hover:bg-opacity-70 border border-gray-600 rounded-lg text-left text-gray-300 hover:text-white transition-all text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    💡 {prompt}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message List */}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`message flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`message-bubble max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                msg.type === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : msg.type === 'error'
                  ? 'bg-red-600 text-white rounded-bl-sm'
                  : msg.type === 'system'
                  ? 'bg-yellow-600 text-white rounded-bl-sm'
                  : 'bg-gray-700 text-gray-100 rounded-bl-sm'
              }`}>
                <div className="text-sm leading-relaxed">{msg.content}</div>
                {msg.version && (
                  <div className="text-xs mt-2 opacity-75 bg-black bg-opacity-20 px-2 py-1 rounded-full inline-block">
                    v{msg.version}
                  </div>
                )}
                <div className="text-xs mt-1 opacity-75">
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-3 text-gray-400"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm">Crafting your wireframe...</span>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Area */}
      <div className="input-area p-6 bg-gray-800 bg-opacity-50 backdrop-blur-sm border-t border-gray-700">
        {/* Quick Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <motion.button
              onClick={handleUndo}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Undo className="w-4 h-4" />
              <span>Undo</span>
            </motion.button>
            
            <motion.button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </motion.button>
          </div>

          <div className="text-xs text-gray-400">
            {messages.length} messages
          </div>
        </div>

        {/* Input Field */}
        <div className="relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Describe your wireframe or request modifications..."
            className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 resize-none"
            rows={2}
            disabled={isLoading}
          />
          
          <motion.button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>

        {/* Helper Text */}
        <div className="mt-3 text-xs text-gray-400 flex items-center justify-between">
          <span>💡 Try: "Create an e-commerce store", "Make the header blue", "Add a contact form"</span>
          <span>Press Shift+Enter for new line</span>
        </div>
      </div>
    </motion.div>
  );
};

export default WireframeChat;
