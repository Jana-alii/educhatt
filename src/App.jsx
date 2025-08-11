import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, MessageCircle, Brain, Sparkles, FileText, Trash2, Send,
  ArrowLeft, Users, Bot, Heart, Rocket, Shield, Camera
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
  const [robotAnimation, setRobotAnimation] = useState('flying'); // 'flying', 'landed', 'waving'
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

  // start new chat
  const startNewChat = () => {
    setChatId('demo-' + Date.now());
    setMessages([{
      text: "Hello and welcome! I'm your intelligent assistant. How can I help you today? ✨",
      sender: 'bot',
      timestamp: new Date().toISOString()
    }]);
    setCurrentPage('chat');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // API: send message to backend
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
      const formData = new FormData();
      formData.append('query', text);
      if (chatId) {
        formData.append('chat_id', chatId);
      }

      const res = await fetch(API_BASE + '/chat/rag', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const demo = getDemoResponse(text);
        pushMessage(demo, 'bot');
      } else {
        const data = await res.json();
        const answer = data.result || data.answer || data.message || getDemoResponse(text);
        if (data.chat_id) setChatId(data.chat_id);
        pushMessage(answer, 'bot');
      }

    } catch (e) {
      const demo = getDemoResponse(text);
      pushMessage(demo, 'bot');
    } finally {
      setIsTyping(false);
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  // File upload handler
  const handleFileInput = async (event) => {
    const f = event.target.files[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are supported 📄');
      event.target.value = '';
      return;
    }
    const subject = prompt('Enter file topic/category:') || 'General';
    setIsUploading(true);

    const form = new FormData();
    form.append('file', f);
    
    try {
      const res = await fetch(API_BASE + '/files/upload?subject=' + encodeURIComponent(subject), {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        throw new Error('Upload failed');
      }
      const data = await res.json();
      const newFile = {
        id: data.file_id || data.id || (Date.now().toString()),
        name: data.filename || f.name,
        subject: data.subject || subject,
        uploadDate: data.uploaded_at || data.created_at || new Date().toISOString(),
        size: data.size ? (data.size / 1024 / 1024).toFixed(2) + ' MB' : (f.size / 1024 / 1024).toFixed(2) + ' MB'
      };
      setUploadedFiles(prev => [newFile, ...prev]);
    } catch (err) {
      const newFile = {
        id: Date.now().toString(),
        name: f.name,
        subject,
        uploadDate: new Date().toISOString(),
        size: (f.size / 1024 / 1024).toFixed(2) + ' MB'
      };
      setUploadedFiles(prev => [newFile, ...prev]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // delete file handler
  const deleteFile = async (fileId) => {
    if (!confirm('Delete this file?')) return;
    try {
      const res = await fetch(API_BASE + '/files/delete/' + encodeURIComponent(fileId), { method: 'DELETE' });
      if (res.ok) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      } else {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      }
    } catch (e) {
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
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
        {/* Robot glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl blur-lg opacity-75 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
        
        {/* Flying trail effect */}
        {animation === 'flying' && (
          <div className="absolute -right-20 top-1/2 w-40 h-2 bg-gradient-to-r from-violet-400 to-transparent rounded-full opacity-60 animate-pulse"></div>
        )}
        
        {/* Robot body */}
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
          
          {/* Waving hand */}
          {animation === 'waving' && (
            <div 
              className="absolute -top-8 -right-8 w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-2xl animate-bounce shadow-lg"
              style={{ animationDelay: '0.5s' }}
            >
              👋
            </div>
          )}
          
          {/* Speech bubble */}
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

        {/* Sparkles around robot */}
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
          
          {/* Welcome message sequence */}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden text-center p-8">
      <FloatingParticles />
      <div className="max-w-4xl mx-auto pt-24 relative z-10">
        <div className="mb-12 flex justify-center">
          <ModernLogo size={120} />
        </div>
        <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 my-8">EduBot</h1>
        <p className="text-2xl text-slate-300 mb-8 leading-relaxed">
          Discover the power of AI with advanced RAG technology<br />
          Upload documents, ask questions, get intelligent answers
        </p>

        <button
          onClick={startNewChat}
          className="px-12 py-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xl font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 mb-12"
        >
          Start Chatting →
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Sidebar */}
      <div className="w-80 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setCurrentPage('landing')} className="bg-gradient-to-r from-violet-500 to-purple-500 text-white p-2 rounded-lg hover:scale-110 transition-transform">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">EduBot</h2>
              <p className="text-sm text-slate-400">Demo Version - PDF + RAG</p>
            </div>
          </div>

          <div className="relative">
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileInput} className="hidden" />
            <button
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white p-3 rounded-2xl flex items-center justify-center gap-3 transform hover:scale-105 transition-all duration-300"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload size={16} />
              {isUploading ? 'Uploading...' : 'Upload PDF File'}
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Uploaded Files</h3>
            <span className="text-sm text-slate-400 bg-slate-700/50 px-3 py-1 rounded-full">{uploadedFiles.length}</span>
          </div>

          <div className="space-y-3">
            {uploadedFiles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No files uploaded</p>
                <p className="text-slate-500 text-sm mt-2">Upload PDF files to enable Q&A features</p>
              </div>
            ) : (
              uploadedFiles.map(file => (
                <div key={file.id} className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-3 group hover:bg-slate-700/50 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-white font-medium text-sm truncate">{file.name}</h4>
                        <p className="text-slate-400 text-xs">{file.subject}</p>
                        <p className="text-slate-500 text-xs">{file.size}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => deleteFile(file.id)}
                        className="text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-slate-600/50 transition-all duration-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{file.uploadDate ? new Date(file.uploadDate).toLocaleDateString('en-US') : ''}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* header */}
        <div className="bg-slate-800/30 backdrop-blur-xl border-b border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ModernLogo size={48} />
              <div>
                <h2 className="text-2xl font-bold text-white">EduBot Assistant</h2>
                <p className="text-slate-400">Ask about uploaded files or any general inquiry</p>
              </div>
            </div>
            <div className="text-right">
              {chatId ? (
                <div>
                  <span className="text-sm text-slate-300">Chat ID: <b>{chatId}</b></span>
                  <div className="text-xs text-green-400">● Connected</div>
                </div>
              ) : (
                <span className="text-sm text-amber-400">New Chat</span>
              )}
            </div>
          </div>
        </div>

        {/* messages */}
        <div className="flex-1 p-6 overflow-y-auto" style={{ height: 'calc(100vh - 260px)' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((m, idx) => (
              <div key={idx} className={'flex ' + (m.sender === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={(m.sender === 'user'
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-3xl rounded-br-lg'
                    : 'bg-slate-800/50 backdrop-blur-sm text-white border border-slate-700/50 rounded-3xl rounded-bl-lg'
                ) + ' p-6 shadow-xl max-w-[75%] animate-fade-in'}>
                  <p className="leading-relaxed text-lg whitespace-pre-wrap">{m.text}</p>
                  <p className={'text-xs mt-3 ' + (m.sender === 'user' ? 'text-violet-200' : 'text-slate-400')}>
                    {m.timestamp ? (new Date(m.timestamp)).toLocaleTimeString('en-US') : ''}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800/50 backdrop-blur-sm text-white border border-slate-700/50 p-6 rounded-3xl rounded-bl-lg shadow-xl">
                  <div className="flex gap-2 items-center">
                    <div className="w-3 h-3 bg-violet-400 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <span className="ml-3 text-slate-400">EduBot is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* input */}
        <div className="p-6 bg-slate-800/30 backdrop-blur-xl border-t border-slate-700/50">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-4 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  onChange={(e) => {
                    messageRef.current = e.target.value;
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask me anything (Shift+Enter for new line)..."
                  disabled={isLoading}
                  rows={1}
                  style={{ minHeight: '48px', lineHeight: '1.5' }}
                  className="w-full resize-none max-h-40 overflow-y-auto bg-slate-700/50 backdrop-blur-sm border-2 border-slate-600/50 rounded-2xl px-6 py-4 text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all duration-300 text-lg disabled:opacity-50"
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!messageRef.current?.trim() || isLoading}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl transition-all duration-300 hover:scale-110 shadow-lg flex items-center justify-center group min-w-[60px] h-[60px]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send
                    size={20}
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  />
                )}
              </button>
            </div>
          </div>
        </div>

      </div> 
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <WelcomeAnimation />
      <main className="relative">
        {currentPage === 'landing' && <LandingPage />}
        {currentPage === 'chat' && <ChatPage />}
      </main>
    </div>
  );
};

export default App;