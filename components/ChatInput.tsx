import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  return (
    <div className="p-4 bg-gradient-to-t from-orange-500/5 via-neutral-950 to-neutral-950 border-t border-neutral-900/50">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={isLoading ? "AI is processing..." : "Message AI..."}
          className={`w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-5 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all text-neutral-100 placeholder:text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner`}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${
            input.trim() && !isLoading 
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-400 hover:to-orange-500 shadow-lg shadow-orange-500/20 scale-100 active:scale-95' 
              : 'text-neutral-600 bg-transparent scale-90'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
      <p className="text-[10px] text-center text-neutral-600 mt-3 font-medium tracking-wide uppercase">
        (c) Bolaji Ilori 2026
      </p>
    </div>
  );
};

export default ChatInput;