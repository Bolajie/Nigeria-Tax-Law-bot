
import React, { useState, useEffect, useRef } from 'react';
import { Message } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { sendMessageToWebhook } from './services/webhookService';

const INITIAL_MESSAGE: Message = {
  id: 'jumoke-intro',
  text: "Hi, my name is Jumoke. I am here to answer all your questions regarding the Nigeria tax law.",
  sender: 'ai',
  timestamp: new Date()
};

const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Main App component for the Tax Law AI Chatbot.
 */
const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // sessionID remains persistent until page refresh or manual clear
  const [sessionId, setSessionId] = useState<string>(() => generateSessionId());
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Pass the sessionId to the webhook to maintain conversation state
      const responseText = await sendMessageToWebhook(text, sessionId);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      setError(err.message || 'Communication error. Please check your connection or agent status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([INITIAL_MESSAGE]);
    // Reset session ID to start a fresh context in the AI agent
    setSessionId(generateSessionId());
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-neutral-950 text-neutral-100 overflow-hidden selection:bg-orange-500/30">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-gradient-to-b from-orange-500/5 via-neutral-900/40 to-neutral-900/40 backdrop-blur-xl border-b border-neutral-900/50 z-10">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="h-8 w-8 md:h-10 md:w-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-white tracking-tight">Jumoke AI</h1>
            <p className="text-[10px] md:text-xs text-orange-400/80 font-medium">Tax Law Expert</p>
          </div>
        </div>
        <button 
          onClick={handleClear}
          className="px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors border border-neutral-800 hover:border-neutral-700 rounded-lg bg-neutral-900/50"
        >
          Clear
        </button>
      </header>

      {/* Messages */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-8 custom-scrollbar scroll-smooth"
      >
        <div className="max-w-4xl mx-auto">
          {messages.map((msg, index) => (
            <ChatMessage 
              key={msg.id} 
              message={msg} 
              isLatest={index === messages.length - 1}
              index={index}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-neutral-800 mr-2 md:mr-3 border border-neutral-700 flex items-center justify-center text-[8px] md:text-[10px] font-bold text-neutral-400">
                AI
              </div>
              <div className="bg-neutral-900 border border-neutral-800 px-4 py-3 rounded-2xl rounded-tl-none flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="text-xs text-neutral-400 font-medium italic">Jumoke is typing...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-6 p-3 md:p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-xs md:text-sm rounded-xl text-center animate-in zoom-in-95">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default App;
