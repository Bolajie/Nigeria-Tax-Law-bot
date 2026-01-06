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

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const responseText = await sendMessageToWebhook(text);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      setError(err.message || 'Communication error. Please check your n8n webhook status.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-neutral-950 text-neutral-100 overflow-hidden selection:bg-orange-500/30">
      {/* Header with subtle orange gradient */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-gradient-to-b from-orange-500/5 via-neutral-900/40 to-neutral-900/40 backdrop-blur-xl border-b border-neutral-900/50 z-10">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="h-8 w-8 md:h-10 md:w-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
              <path d="M12 12L2.1 12.1"></path>
              <path d="M12 12l9.9-0.1"></path>
              <path d="M12 12V22"></path>
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-base text-neutral-100 leading-tight tracking-tight">Tax Q&A Agent</h1>
            <div className="flex items-center space-x-1.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              <span className="text-[8px] md:text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Active System</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setMessages([INITIAL_MESSAGE])}
          className="text-neutral-500 hover:text-orange-500 p-2 rounded-lg hover:bg-neutral-800 transition-all duration-200"
          title="Clear Conversation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"></path>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
      </header>

      {/* Main Chat Area */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 md:p-8 bg-neutral-950"
      >
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            
            {isLoading && (
              <div className="flex items-center space-x-3 text-orange-500/70 text-xs md:text-sm py-4 ml-8 md:ml-11">
                <div className="flex space-x-1">
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-orange-500 rounded-full animate-bounce [animation-duration:0.8s]"></div>
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-orange-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.15s]"></div>
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-orange-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.3s]"></div>
                </div>
                <span className="font-medium tracking-wide">Processing query...</span>
              </div>
            )}

            {error && (
              <div className="max-w-md mx-auto mt-6 p-4 bg-neutral-900 border border-red-500/20 rounded-2xl flex items-start space-x-3 text-red-400 text-xs md:text-sm animate-in slide-in-from-bottom-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span className="break-words">{error}</span>
              </div>
            )}
          </div>
          {/* Bottom spacer for padding */}
          <div className="h-4 w-full flex-shrink-0"></div>
        </div>
      </main>

      {/* Input Area */}
      <div className="relative flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-t from-neutral-950 to-transparent -translate-y-full pointer-events-none"></div>
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default App;