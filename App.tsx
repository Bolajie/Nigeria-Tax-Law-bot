import React, { useState, useEffect, useRef } from 'react';
import { Message } from './types.ts';
import ChatMessage from './components/ChatMessage.tsx';
import ChatInput from './components/ChatInput.tsx';
import { sendMessageToWebhook } from './services/webhookService.ts';

const INITIAL_MESSAGE: Message = {
  id: 'jumoke-intro',
  text: "Hi, my name is Jumoke. I am here to answer all your questions regarding the Nigeria tax law.",
  sender: 'ai',
  timestamp: new Date()
};

const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  const [sessionId] = useState<string>(() => generateSessionId());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, shouldAutoScroll]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isAtBottom);
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    const aiPlaceholderMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: 'Jumoke is reasoning...',
      sender: 'ai',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, aiPlaceholderMessage]);
    setShouldAutoScroll(true);
    setIsLoading(true);
    setError(null);

    try {
      await sendMessageToWebhook(text, sessionId, (streamedText) => {
        // IMPORTANT: Only update if streamedText is not empty.
        // This keeps the 'Reasoning' placeholder visible while intermediate noisy chunks are being filtered out.
        if (!streamedText) return;

        setMessages(prev => {
          const newMessages = [...prev];
          const index = newMessages.findIndex(m => m.id === aiPlaceholderMessage.id);
          if (index !== -1) {
            newMessages[index] = { ...newMessages[index], text: streamedText };
          }
          return newMessages;
        });
      });
    } catch (err: any) {
      console.error("Chat Error:", err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== aiPlaceholderMessage.id || m.text.length > 0));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([INITIAL_MESSAGE]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-neutral-950 text-neutral-100 overflow-hidden selection:bg-orange-500/30">
      <header className="flex-none flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-gradient-to-b from-orange-500/5 via-neutral-900/40 to-neutral-900/40 backdrop-blur-xl border-b border-neutral-900/50 z-10">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 md:h-10 md:w-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-base md:text-lg font-bold text-white tracking-tight leading-tight">Jumoke AI</h1>
            <p className="text-[10px] md:text-xs text-orange-400/80 font-medium leading-tight">Tax Law Expert</p>
          </div>
        </div>
        <button 
          onClick={handleClear}
          className="px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors border border-neutral-800 hover:border-neutral-700 rounded-lg bg-neutral-900/50 active:bg-neutral-800"
        >
          Clear
        </button>
      </header>

      <main 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-8 custom-scrollbar scroll-smooth w-full"
      >
        <div className="max-w-4xl mx-auto w-full">
          {messages.map((msg, index) => (
            <ChatMessage 
              key={msg.id} 
              message={msg} 
              isLatest={index === messages.length - 1}
              isLoading={isLoading}
              index={index}
            />
          ))}
          {error && (
            <div className="mb-6 p-3 md:p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-xs md:text-sm rounded-xl text-center animate-zoom-in mx-4">
              {error}
            </div>
          )}
        </div>
      </main>

      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default App;