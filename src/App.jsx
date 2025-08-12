import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, MessageCircle, Brain, Sparkles, FileText, Trash2, Send,
  ArrowLeft, Users, Bot, Heart, Rocket, Shield, Camera, Plus, X, Check
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const App = () => {
  // pages
  const [currentPage, setCurrentPage] = useState('landing');
  // chat
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  // files
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // UI bits
  const [showWelcome, setShowWelcome] = useState(true);
  const [robotAnimation, setRobotAnimation] = useState('flying');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const messageRef = useRef(inputMessage || "");

  useEffect(() => {
    // Robot animation sequence
    const timer1 = setTimeout(() => setRobotAnimation('landed'), 2000);
    const timer2 = setTimeout(() => setRobotAnimation('waving'), 2500);
    const timer3 = setTimeout(() => setShowWelcome(false), 4500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // scroll to latest on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Ensure textarea keeps focus when on chat page
  useEffect(() => {
    if (currentPage === 'chat' && textareaRef.current) {
      setTimeout(() => {
        try { textareaRef.current.focus(); } catch (_) {}
      }, 50);
    }
  }, [currentPage, messages, isTyping]);

  // Helper: append message to local state
  const pushMessage = (text, sender = 'bot') => {
    setMessages(prev => [...prev, { text, sender, timestamp: new Date().toISOString() }]);
  };

  // Demo fallback response
  const getDemoResponse = (query) => {
    const q = (query || '').toLowerCase();
    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      return "Hello there! I'm EduBot, your intelligent assistant 🤖 I can help you analyze documents and answer your questions. How can I help you today? ✨";
    }
    if (q.includes('pdf') || q.includes('document') || q.includes('file')) {
      return "I can analyze PDF files using advanced RAG technology! Upload a PDF file and I'll be able to answer questions about its content with high accuracy 📄";
    }
    if (q.includes('how') && q.includes('work') || q.includes('what') && q.includes('do')) {
      return "I work by combining several smart technologies:\n\n• Document Processing: Extract and index content from PDFs\n• RAG System: Retrieve relevant information\n• Natural Language: Understand context and provide human-like responses\n• Memory: Maintain conversation history\n\nWhat would you like to know more about? 🤖";
    }
    const responses = [
      "Great question! In the real application, I'll search through your uploaded documents and my knowledge base to give you the most accurate answer possible 🎯",
      "Happy to help! With access to PDF files and advanced AI capabilities, I can provide detailed insights on this topic 📖",
      "Excellent question! I use advanced natural language processing to understand your queries and retrieve relevant information ✨"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Auto-Reconnect Handler
  const handleSessionExpired = async () => {
    console.log('Chat session expired, auto-reconnecting...');
    
    // Clear current session
    setChatId(null);
    
    // Show reconnection message
    pushMessage("🔄 Session expired. Reconnecting automatically...", 'bot');
    
    // Wait 2 seconds then reconnect
    setTimeout(async () => {
      const newChatId = 'chat-' + Date.now();
      setChatId(newChatId);
      
      pushMessage("✅ New session started! You can continue chatting now.", 'bot');
      
      // Focus back to input
      setTimeout(() => textareaRef.current?.focus(), 100);
    }, 2000);
  };

  // FIXED: Updated sendMessage function with proper JSON format
 // FIXED sendMessage function to work with your backend API
const sendMessage = async () => {
  const text = messageRef.current?.trim();
  if (!text || isLoading) return;

  // append user message locally
  const userMsg = { text, sender: 'user', timestamp: new Date().toISOString() };
  setMessages(prev => [...prev, userMsg]);

  setInputMessage('');
  messageRef.current = '';
  if (textareaRef.current) {
    textareaRef.current.value = '';
    textareaRef.current.style.height = 'auto';
  }
  
  setIsLoading(true);
  setIsTyping(true);

  try {
    // FIXED: Your backend expects query as form parameter, not FormData
    const params = new URLSearchParams();
    params.append('query', text);
    
    // Add chat_id only if it exists
    if (chatId && chatId.trim()) {
      params.append('chat_id', chatId.trim());
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    console.log('Sending request with params:', { query: text, chat_id: chatId });

    // FIXED: Use URLSearchParams for form data, not FormData
    const res = await fetch(API_BASE + '/chat/rag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMessage = 'Unknown error occurred';
      
      try {
        const errorData = await res.json();
        console.error('API Error Response:', errorData);
        errorMessage = errorData.detail || errorData.message || `HTTP ${res.status}`;
      } catch {
        errorMessage = await res.text() || `HTTP ${res.status}`;
      }

      console.error('API Error:', res.status, errorMessage);
      
      // Handle specific error codes with auto-reconnect
      if (res.status === 404) {
        // Chat session not found - auto reconnect
        pushMessage("💬 Chat session expired. Reconnecting...", 'bot');
        handleSessionExpired();
        return;
      } else if (res.status === 422) {
        pushMessage(`❌ Request validation error: ${errorMessage}. Please try again.`, 'bot');
      } else if (res.status === 429) {
        pushMessage("⚠️ Too many requests. Please wait a moment before trying again.", 'bot');
      } else if (res.status >= 500) {
        pushMessage("🔧 Server error occurred. Please try again later.", 'bot');
      } else if (res.status === 401 || res.status === 403) {
        // Unauthorized/Forbidden - might be session expired
        pushMessage("🔐 Session expired. Starting new session...", 'bot');
        handleSessionExpired();
        return;
      } else {
        pushMessage(`❌ Error: ${errorMessage}. Please try again.`, 'bot');
      }
      return;
    }

    const data = await res.json();
    console.log('Chat API Response:', data);
    
    // Handle response based on ResponseSchema: { chat_id, result, usage }
    if (data && typeof data === 'object') {
      // Extract response from 'result' field
      const answer = data.result || getDemoResponse(text);

      // Update chat ID from response
      if (data.chat_id) {
        console.log('Chat ID from response:', data.chat_id);
        setChatId(data.chat_id);
      }

      // Log usage if provided
      if (data.usage) {
        console.log('Token usage:', data.usage);
      }

      // Add bot response to chat
      pushMessage(answer, 'bot');

    } else {
      // Fallback if response format is unexpected
      console.warn('Unexpected response format:', data);
      const fallbackResponse = getDemoResponse(text);
      pushMessage(fallbackResponse, 'bot');
    }

  } catch (error) {
    console.error('Chat API Error:', error);
    
    if (error.name === 'AbortError') {
      pushMessage("⏱️ Request timed out. The server might be busy. Please try again.", 'bot');
    } else if (error.message?.includes('fetch')) {
      pushMessage("🌐 Network connection error. Please check your internet connection and try again.", 'bot');
    } else if (error.message?.includes('CORS')) {
      pushMessage("🔒 Connection blocked. Please contact support if this persists.", 'bot');
    } else {
      // Check if it might be a session expiry error
      if (error.message?.includes('session') || error.message?.includes('expired')) {
        pushMessage("🔄 Session may have expired. Reconnecting...", 'bot');
        handleSessionExpired();
        return;
      }
      
      // Use demo response as fallback
      const demo = getDemoResponse(text);
      pushMessage(`⚠️ Connection error. Here's a demo response: ${demo}`, 'bot');
    }
  } finally {
    setIsTyping(false);
    setIsLoading(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }
};

// FIXED: File upload handler to work with your backend
const handleFileInput = async (event) => {
  const f = event.target.files[0];
  if (!f) return;
  
  if (!f.name.toLowerCase().endsWith('.pdf')) {
    alert('❌ Only PDF files are supported. Please select a PDF file.');
    event.target.value = '';
    return;
  }
  
  const maxSize = 50 * 1024 * 1024;
  if (f.size > maxSize) {
    alert('❌ File is too large. Please select a PDF file smaller than 50MB.');
    event.target.value = '';
    return;
  }
  
  const subject = prompt('Enter file topic/category:') || 'General';
  if (!subject.trim()) {
    alert('❌ Subject is required. Please try again.');
    event.target.value = '';
    return;
  }
  
  setIsUploading(true);

  // FIXED: Your backend expects file as FormData + subject as query parameter
  const formData = new FormData();
  formData.append('file', f);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    // FIXED: Send FormData to /files/upload with subject as query parameter
    const url = `${API_BASE}/files/upload?subject=${encodeURIComponent(subject)}`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      // Don't set Content-Type header for FormData
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      let errorMessage = 'Upload failed';
      
      try {
        const errorData = await res.json();
        console.error('Upload Error Response:', errorData);
        errorMessage = errorData.detail || errorData.message || `HTTP ${res.status}`;
      } catch {
        errorMessage = await res.text() || `HTTP ${res.status}`;
      }

      console.error('Upload Error:', res.status, errorMessage);
      
      if (res.status === 400) {
        alert('❌ Invalid file format. Only PDF files are supported.');
      } else if (res.status === 413) {
        alert('❌ File is too large. Please try a smaller PDF file.');
      } else if (res.status === 422) {
        alert(`❌ Validation error: ${errorMessage}. Please check the file and subject.`);
      } else if (res.status === 429) {
        alert('⚠️ Too many uploads. Please wait before uploading another file.');
      } else if (res.status >= 500) {
        alert('🔧 Server error during upload. Please try again later.');
      } else {
        alert(`❌ Upload failed: ${errorMessage}`);
      }
      return;
    }
    
    const data = await res.json();
    console.log('Upload response:', data);
    
    // Create file entry for UI (your backend returns {"message": "File uploaded successfully"})
    const newFile = {
      id: Date.now().toString(), // Generate local ID for UI
      name: f.name,
      subject: subject,
      uploadDate: new Date().toISOString(),
      size: (f.size / 1024 / 1024).toFixed(2) + ' MB'
    };
    
    setUploadedFiles(prev => [newFile, ...prev]);
    
    // Show success message based on backend response
    const successMessage = data.message || 'File uploaded and processed successfully!';
    alert('✅ ' + successMessage);
    
  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.name === 'AbortError') {
      alert('⏱️ Upload timed out. Please try with a smaller file or check your connection.');
    } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
      alert('🌐 Network error during upload. Please check your connection and try again.');
    } else if (error.message?.includes('CORS')) {
      alert('🔒 Upload blocked by security settings. Please contact support.');
    } else {
      alert('⚠️ Upload error occurred. Please try again.');
    }
  } finally {
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
};

  // FIXED: Updated loadChatHistory function with proper endpoint
  const loadChatHistory = async (chatId, limit = 50) => {
    if (!chatId) return;
    
    try {
      // FIXED: Use the correct endpoint format
      const res = await fetch(`${API_BASE}/chat/history?chat_id=${encodeURIComponent(chatId)}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const history = await res.json(); // Array of Message objects
        console.log('Chat history loaded:', history);
        
        // Convert Message schema to your message format
        // Message: { chat_id, role, content, timestamp }
        const formattedMessages = history.map(msg => ({
          text: msg.content,
          sender: msg.role === 'user' ? 'user' : 'bot', // role can be 'user', 'assistant', 'system'
          timestamp: msg.timestamp
        }));
        
        // Sort by timestamp (newest to oldest from backend, reverse for display)
        formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        setMessages(formattedMessages);
      } else {
        console.warn('Could not load chat history:', res.status);
        // Don't show error to user for history loading failure
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Don't show error to user for history loading failure
    }
  };

  // Enhanced start new chat with auto-reconnect and history loading option
  const startNewChat = async (loadHistory = false, showMessage = true) => {
    const newChatId = 'chat-' + Date.now();
    setChatId(newChatId);
    
    if (loadHistory) {
      await loadChatHistory(newChatId);
    } else {
      const welcomeMsg = showMessage ? [{
        text: "Hello and welcome! I'm your intelligent assistant. How can I help you today? ✨",
        sender: 'bot',
        timestamp: new Date().toISOString()
      }] : [];
      setMessages(welcomeMsg);
    }
    
    setCurrentPage('chat');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };


  // Updated delete file handler - Compatible with your backend
  const deleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) return;
    
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, deleting: true } : f
    ));
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const res = await fetch(API_BASE + '/files/delete/' + encodeURIComponent(fileId), { 
        method: 'DELETE',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Delete response:', data);
        
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        
        // Show success message from backend response
        const successMessage = data.message || 'File deleted successfully!';
        alert('✅ ' + successMessage);
        
      } else {
        let errorMessage = 'Delete failed';
        
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || errorData.message || `HTTP ${res.status}`;
        } catch {
          errorMessage = await res.text() || `HTTP ${res.status}`;
        }

        console.error('Delete Error:', res.status, errorMessage);
        
        if (res.status === 404) {
          setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
          alert('ℹ️ File was already deleted or not found.');
        } else if (res.status === 403) {
          alert('❌ Not authorized to delete this file.');
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, deleting: undefined } : f
          ));
        } else if (res.status >= 500) {
          alert('🔧 Server error during deletion. Please try again later.');
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, deleting: undefined } : f
          ));
        } else {
          alert(`❌ Delete failed: ${errorMessage}`);
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, deleting: undefined } : f
          ));
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      
      if (error.name === 'AbortError') {
        alert('⏱️ Delete request timed out. Please try again.');
      } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
        alert('🌐 Network error during deletion. Please check your connection.');
      } else {
        alert('⚠️ Unexpected error during deletion.');
      }
      
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, deleting: undefined } : f
      ));
    }
  };

  // UI Components
  const FlyingRobot = ({ size = 160, animation }) => {
    const getTransform = () => {
      switch (animation) {
        case 'flying':
          return 'translate(-200px, -100px) rotate(-10deg) scale(0.3)';
        case 'landed':
          return 'translate(0, 0) rotate(0deg) scale(1)';
        case 'waving':
          return 'translate(0, -10px) rotate(0deg) scale(1.05)';
        default:
          return 'translate(0, 0) rotate(0deg) scale(1)';
      }
    };

    return (
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl blur-lg opacity-75 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
        
        {animation === 'flying' && (
          <div className="absolute -right-20 top-1/2 w-40 h-2 bg-gradient-to-r from-violet-400 to-transparent rounded-full opacity-60 animate-pulse"></div>
        )}
        
        <div
          className="relative bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-2000 ease-out"
          style={{ 
            width: size, 
            height: size,
            transform: getTransform()
          }}
        >
          <Bot 
            className={`text-white transition-all duration-1000 ${animation === 'waving' ? 'animate-bounce' : ''}`} 
            size={size * 0.6} 
          />
          
          {animation === 'waving' && (
            <div 
              className="absolute -top-8 -right-8 w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-2xl animate-bounce shadow-lg"
              style={{ animationDelay: '0.5s' }}
            >
              👋
            </div>
          )}
          
          {animation === 'waving' && (
            <div 
              className="absolute -top-20 -right-10 bg-white rounded-2xl px-4 py-2 shadow-xl animate-fade-in"
              style={{ animationDelay: '1s' }}
            >
              <div className="text-purple-600 font-bold text-lg">Hello! 🎉</div>
              <div className="absolute bottom-0 left-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
            </div>
          )}
        </div>

        {animation === 'landed' && (
          <>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-4 h-4 text-yellow-400 animate-ping"
                style={{
                  top: Math.random() * size + 'px',
                  left: Math.random() * size + 'px',
                  animationDelay: Math.random() * 2 + 's'
                }}
              >
                ✨
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  const FloatingParticles = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {[...Array(20)].map((_, i) => (
        <div key={i} className="absolute animate-pulse" style={{
          left: Math.random() * 100 + '%',
          top: Math.random() * 100 + '%',
          animationDelay: Math.random() * 3 + 's',
          animationDuration: (3 + Math.random() * 4) + 's'
        }}>
          <div className={'w-2 h-2 bg-gradient-to-r ' + 
            ['from-violet-400 to-purple-400', 'from-blue-400 to-cyan-400', 'from-emerald-400 to-teal-400', 'from-yellow-400 to-orange-400'][i % 4] +
            ' rounded-full opacity-30'}></div>
        </div>
      ))}
    </div>
  );

  const WelcomeAnimation = () => (
    <div className={'fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 z-50 flex items-center justify-center transition-all duration-1000 ' + (showWelcome ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
      <div className="text-center relative">
        <div className="relative">
          <div className="mb-8">
            <div className="relative mx-auto w-40 h-40 mb-8 flex items-center justify-center">
              <FlyingRobot size={160} animation={robotAnimation} />
            </div>
          </div>
          <h1 className="text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-violet-200 to-indigo-200 bg-clip-text text-transparent animate-pulse">
            EduBot
          </h1>
          <p className="text-violet-200 text-xl md:text-2xl font-light mb-8">Your Next-Generation AI Assistant ✨</p>
          
          {robotAnimation === 'waving' && (
            <div className="animate-fade-in mt-8">
              <p className="text-2xl text-yellow-300 font-bold animate-bounce">
                Hello & Welcome! 🎉
              </p>
              <p className="text-lg text-violet-200 mt-2">
                Ready to help you on your learning journey
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const ModernLogo = ({ size = 50 }) => (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl blur-lg opacity-75 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
      <div
        className="relative bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-300"
        style={{ width: size, height: size }}
      >
        <Bot className="text-white" size={size * 0.6} />
      </div>
    </div>
  );

  const LandingPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden text-center" style={{ width: '100%', margin: 0, padding: '1rem' }}>
      <FloatingParticles />
      <div className="pt-24 relative z-10" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '0 1rem' }}>
        <div className="mb-12 flex justify-center">
          <ModernLogo size={120} />
        </div>
        <h1 className="font-black mb-6 bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent animate-pulse" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', lineHeight: '1.1' }}>EduBot</h1>
        <p className="text-slate-300 mb-8 leading-relaxed" style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)', margin: '1rem 0 2rem 0' }}>
          Discover the power of AI with advanced RAG technology<br />
          Upload documents, ask questions, get intelligent answers
        </p>

        <button
          onClick={startNewChat}
          className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 mb-12"
          style={{ padding: 'clamp(0.75rem, 2vw, 1rem) clamp(2rem, 5vw, 3rem)', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}
        >
          Start Chatting →
        </button>

        <div className="grid gap-8 text-left" style={{ 
          width: '100%', 
          maxWidth: '1200px', 
          margin: '0 auto',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          padding: '0 1rem'
        }}>
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <FileText className="w-12 h-12 text-violet-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Document Analysis</h3>
            <p className="text-slate-300">Upload PDF files and get intelligent answers about their content using advanced RAG technology</p>
          </div>
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <Brain className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Smart Conversations</h3>
            <p className="text-slate-300">Engage in natural conversations with context-aware responses and interactive memory</p>
          </div>
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <Sparkles className="w-12 h-12 text-indigo-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">AI-Powered</h3>
            <p className="text-slate-300">Leverage cutting-edge AI technology to extract insights and answer complex questions</p>
          </div>
        </div>
      </div>
    </div>
  );

  const ChatPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Fixed Header with Logo - Always Visible and FIXED POSITION */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-violet-500/20 shadow-2xl">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentPage('landing')} 
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-3 rounded-xl hover:scale-110 transition-all duration-300 shadow-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <ModernLogo size={50} />
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">EduBot</h2>
              <p className="text-sm text-slate-400">AI Assistant with RAG Technology</p>
            </div>
          </div>
          <div className="text-right">
            {chatId ? (
              <div>
                <span className="text-sm text-slate-300">Chat: <span className="text-violet-400 font-mono">{chatId.slice(-8)}</span></span>
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Connected
                </div>
              </div>
            ) : (
              <div>
                <span className="text-sm text-amber-400 animate-pulse">Connecting...</span>
                <div className="text-xs text-amber-300 flex items-center gap-1">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
                  New Session
                </div>
              </div>
            )}
            
            {/* Manual Reconnect Button (Hidden by default, shows on errors) */}
            <button
              onClick={() => handleSessionExpired()}
              className="text-xs text-violet-400 hover:text-violet-300 mt-1 opacity-0 hover:opacity-100 transition-opacity"
              title="Reconnect Chat Session"
            >
              🔄 Reconnect
            </button>
          </div>
        </div>
      </div>

      {/* ADD TOP PADDING TO ACCOUNT FOR FIXED HEADER */}
      <div className="pt-20 flex flex-1 overflow-hidden">
        {/* Enhanced Sidebar with Better File Upload */}
        <div className="w-80 bg-slate-900/50 backdrop-blur-xl border-r border-violet-500/20 flex flex-col shadow-2xl">
          
          {/* Upload Section */}
          <div className="p-6 border-b border-violet-500/20">
            <div className="space-y-4">
              {/* Upload Button */}
              <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileInput} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white p-4 rounded-2xl flex items-center justify-center gap-3 transform hover:scale-105 transition-all duration-300 shadow-xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-medium">Processing PDF...</span>
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    <span className="font-medium">Upload PDF Document</span>
                  </>
                )}
              </button>

              {/* Upload Info */}
              <div className="bg-slate-800/40 backdrop-blur-sm border border-violet-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium text-white">Supported Format</span>
                </div>
                <p className="text-xs text-slate-400">PDF files only • Max 50MB</p>
              </div>
            </div>
          </div>

          {/* Files List Section */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">Document Library</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 bg-violet-500/20 px-3 py-1 rounded-full border border-violet-500/30">{uploadedFiles.length}</span>
                {uploadedFiles.length > 0 && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
              </div>
            </div>

            <div className="space-y-4">
              {uploadedFiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto border border-violet-500/30">
                      <FileText className="w-10 h-10 text-violet-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-slate-300 text-lg font-medium mb-2">No documents yet</p>
                  <p className="text-slate-400 text-sm">Upload PDF files to unlock advanced Q&A capabilities</p>
                </div>
              ) : (
                uploadedFiles.map((file, index) => (
                  <div key={file.id} className="group relative">
                    {/* File Card */}
                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 backdrop-blur-sm border border-violet-500/20 rounded-2xl p-4 hover:border-violet-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10">
                      
                      {/* File Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* File Icon */}
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            {/* File Index Badge */}
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                              {index + 1}
                            </div>
                          </div>
                          
                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-sm truncate group-hover:text-violet-200 transition-colors">
                              {file.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded-lg border border-violet-500/30">
                                {file.subject}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => deleteFile(file.id)}
                          disabled={file.deleting}
                          className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group/delete"
                          title="Delete file"
                        >
                          {file.deleting ? (
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={16} className="group-hover/delete:scale-110 transition-transform" />
                          )}
                        </button>
                      </div>

                      {/* File Details */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-700/40 rounded-lg p-2">
                          <span className="text-slate-400">Size:</span>
                          <span className="text-slate-200 ml-1 font-medium">{file.size}</span>
                        </div>
                        <div className="bg-slate-700/40 rounded-lg p-2">
                          <span className="text-slate-400">Added:</span>
                          <span className="text-slate-200 ml-1 font-medium">
                            {file.uploadDate ? new Date(file.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
                          </span>
                        </div>
                      </div>

                      {/* Processing Status */}
                      {file.deleting && (
                        <div className="mt-3 flex items-center gap-2 text-yellow-400 text-xs animate-pulse">
                          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                          Deleting file...
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Upload Tips */}
            {uploadedFiles.length === 0 && (
              <div className="mt-8 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium text-violet-300">Pro Tips</span>
                </div>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>• Upload research papers, textbooks, or documents</li>
                  <li>• Ask specific questions about the content</li>
                  <li>• Get instant, accurate answers with citations</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          
          {/* Chat Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-transparent to-slate-900/20">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="relative mb-8">
                    <ModernLogo size={80} />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-4">
                    Ready to help you learn! 🚀
                  </h3>
                  <p className="text-slate-400 text-lg mb-8">Ask me anything or upload a PDF to get started</p>
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <button 
                      onClick={() => {
                        messageRef.current = "What can you help me with?";
                        if (textareaRef.current) textareaRef.current.value = messageRef.current;
                        sendMessage();
                      }}
                      className="bg-slate-800/50 hover:bg-violet-500/20 border border-slate-700/50 hover:border-violet-500/50 rounded-xl p-4 text-left transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Brain className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform" />
                        <span className="font-medium text-white">General Questions</span>
                      </div>
                      <p className="text-sm text-slate-400">Ask about any topic or concept</p>
                    </button>
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-800/50 hover:bg-emerald-500/20 border border-slate-700/50 hover:border-emerald-500/50 rounded-xl p-4 text-left transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Upload className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="font-medium text-white">Upload & Analyze</span>
                      </div>
                      <p className="text-sm text-slate-400">Upload PDF for document analysis</p>
                    </button>
                  </div>
                </div>
              )}

              {messages.map((m, idx) => (
                <div key={idx} className={'flex ' + (m.sender === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className="flex items-start gap-3 max-w-[80%]">
                    {/* Avatar */}
                    {m.sender === 'bot' && (
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <div className={(m.sender === 'user'
                        ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-2xl rounded-br-lg'
                        : 'bg-slate-800/60 backdrop-blur-sm text-white border border-violet-500/20 rounded-2xl rounded-bl-lg'
                    ) + ' p-4 shadow-xl animate-fade-in relative group'}>
                      
                      {/* Message Text */}
                      <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      
                      {/* Timestamp */}
                      <p className={'text-xs mt-3 flex items-center gap-2 ' + (m.sender === 'user' ? 'text-violet-200' : 'text-slate-400')}>
                        <span>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        {m.sender === 'user' && <Check size={12} />}
                      </p>
                    </div>

                    {/* User Avatar */}
                    {m.sender === 'user' && (
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <span className="text-white font-bold text-sm">You</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-slate-800/60 backdrop-blur-sm border border-violet-500/20 p-4 rounded-2xl rounded-bl-lg shadow-xl">
                      <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <span className="ml-3 text-slate-400 text-sm">EduBot is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Enhanced Input Area */}
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-xl border-t border-violet-500/20 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-4 items-end">
                <div className="flex-1 relative">
                  {/* Input Container */}
                  <div className="relative bg-slate-800/50 backdrop-blur-sm border-2 border-violet-500/30 rounded-2xl focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/20 transition-all duration-300">
                    <textarea
                      ref={textareaRef}
                      onChange={(e) => {
                        messageRef.current = e.target.value;
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Ask me anything about your documents or any topic... (Shift+Enter for new line)"
                      disabled={isLoading}
                      rows={1}
                      style={{ minHeight: '56px', lineHeight: '1.5', resize: 'none' }}
                      className="w-full bg-transparent border-none rounded-2xl px-6 py-4 pr-20 text-white placeholder-slate-400 focus:outline-none text-lg max-h-[120px] overflow-y-auto disabled:opacity-50"
                    />
                    
                    {/* Character Count */}
                    {messageRef.current && messageRef.current.length > 100 && (
                      <div className="absolute bottom-2 right-20 text-xs text-slate-400">
                        {messageRef.current.length}/2000
                      </div>
                    )}
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={!messageRef.current?.trim() || isLoading}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl transition-all duration-300 hover:scale-110 shadow-xl flex items-center justify-center group min-w-[64px] h-[64px]"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send
                      size={24}
                      className="group-hover:translate-x-1 transition-transform duration-300"
                    />
                  )}
                </button>
              </div>

              {/* Input Helper Text */}
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span>💡 Try asking about uploaded PDFs or general topics</span>
                  {uploadedFiles.length > 0 && (
                    <span className="text-green-400">📄 {uploadedFiles.length} document{uploadedFiles.length > 1 ? 's' : ''} ready</span>
                  )}
                </div>
                <span>Shift+Enter for new line</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen" style={{ 
      width: '100%', 
      minWidth: '320px',
      margin: 0, 
      padding: 0, 
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      <WelcomeAnimation />
      <main className="relative">
        {currentPage === 'landing' && <LandingPage />}
        {currentPage === 'chat' && <ChatPage />}
      </main>
    </div>
  );
};

export default App;