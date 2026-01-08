import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync internal submission state with parent loading state
  useEffect(() => {
    if (!isLoading) {
      setIsSubmitting(false);
    }
  }, [isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Strict guard against double submission
    if (input.trim() && !isLoading && !isSubmitting) {
      const message = input.trim();
      setIsSubmitting(true);
      setInput('');
      onSendMessage(message);
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200); 
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    if (!isLoading && !isSubmitting && window.matchMedia('(min-width: 768px)').matches) {
      textareaRef.current?.focus();
    }
  }, [isLoading, isSubmitting]);

  const disabled = isLoading || isSubmitting;

  return (
    <div className="p-3 md:p-4 bg-gradient-to-t from-orange-500/5 via-neutral-950 to-neutral-950 border-t border-neutral-900/50 shrink-0 z-20">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group flex items-end gap-2">
        <div className="relative flex-grow">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={disabled ? "Jumoke is processing..." : "Ask Jumoke about Nigeria tax law..."}
              rows={1}
              className={`w-full bg-neutral-900/50 border border-neutral-800 rounded-xl md:rounded-2xl px-4 md:px-5 py-3.5 md:py-4 pr-12 md:pr-16 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all text-base text-neutral-100 placeholder:text-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner resize-none custom-scrollbar leading-relaxed`}
            />
            <button
              type="submit"
              disabled={!input.trim() || disabled}
              className={`absolute right-1.5 bottom-1.5 md:right-2 md:bottom-2 p-2 rounded-lg md:rounded-xl transition-all ${
                  input.trim() && !disabled 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-400 hover:to-orange-500 shadow-lg shadow-orange-500/20 scale-100 active:scale-95' 
                  : 'text-neutral-600 bg-transparent scale-90'
              }`}
              aria-label="Send message"
            >
              {disabled ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-[22px] md:h-[22px]">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              )}
            </button>
        </div>
      </form>
      <p className="text-[10px] md:text-xs text-center text-neutral-600 mt-2 md:mt-3 font-medium tracking-wide uppercase">
        (c) Bolaji Ilori 2026
      </p>
    </div>
  );
};

export default ChatInput;