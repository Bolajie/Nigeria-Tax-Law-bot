import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types.ts';

interface ChatMessageProps {
  message: Message;
  isLatest?: boolean;
  index: number;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLatest, index }) => {
  const isUser = message.sender === 'user';
  const [displayText, setDisplayText] = useState(isUser || !isLatest ? message.text : '');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (!isUser && isLatest && displayText.length < message.text.length) {
      const timeout = setTimeout(() => {
        const remaining = message.text.length - displayText.length;
        let increment = 6;
        if (remaining > 500) increment = 50;
        else if (remaining > 200) increment = 25;
        else if (remaining > 50) increment = 12;
        
        setDisplayText(message.text.slice(0, displayText.length + increment));
      }, 10);
      return () => clearTimeout(timeout);
    } else if (!isUser && !isLatest && displayText !== message.text) {
        setDisplayText(message.text);
    } else if (isUser && displayText !== message.text) {
        setDisplayText(message.text);
    }
  }, [message.text, displayText, isUser, isLatest]);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const animationDelay = index < 3 ? `${index * 100}ms` : '0ms';
  const isTyping = !isUser && isLatest && (displayText.length < message.text.length || message.text.length === 0);

  return (
    <div 
      className={`flex w-full mb-4 md:mb-6 group transition-all duration-500 ease-out ${
        isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{
        transitionDelay: animationDelay
      }}
    >
      <div className={`flex max-w-[90%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shadow-lg mt-0.5 md:mt-1 transition-transform group-hover:scale-110 duration-300 ${
          isUser 
            ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white ml-2 md:ml-3' 
            : 'bg-neutral-800 text-neutral-400 mr-2 md:mr-3 border border-neutral-700'
        }`}>
          {isUser ? 'YOU' : 'AI'}
        </div>

        <div className={`relative px-3.5 py-2.5 md:px-5 md:py-4 rounded-2xl shadow-xl leading-relaxed transition-all duration-300 hover:shadow-orange-500/10 ${
          isUser 
            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-none' 
            : 'bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-tl-none'
        }`}>
          <div className={`prose prose-sm md:prose-base max-w-none break-words ${
            isUser 
              ? 'prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-li:text-white' 
              : 'prose-invert prose-p:text-neutral-200 prose-headings:text-neutral-100 prose-strong:text-orange-400 prose-li:text-neutral-200'
          }`}>
            {displayText ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ ...props }) => (
                    <a {...props} className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors break-all" target="_blank" rel="noopener noreferrer" />
                  ),
                  table: ({ ...props }) => (
                    <div className="overflow-x-auto my-3 md:my-4 custom-scrollbar rounded-lg border border-neutral-800 shadow-inner bg-neutral-950/50">
                      <table {...props} className="min-w-full divide-y divide-neutral-800" />
                    </div>
                  ),
                  th: ({ ...props }) => (
                    <th {...props} className="px-2 py-1.5 md:px-3 md:py-2 bg-neutral-800/50 text-left text-[10px] md:text-xs font-bold uppercase tracking-wider text-neutral-400 whitespace-nowrap" />
                  ),
                  td: ({ ...props }) => (
                    <td {...props} className="px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border-t border-neutral-800" />
                  ),
                  pre: ({ ...props }) => (
                    <pre {...props} className="bg-transparent p-0 m-0 border-none shadow-none overflow-visible" />
                  ),
                  code: ({ node, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                        <code {...props} className="block bg-neutral-950 p-2.5 md:p-3 rounded-lg border border-neutral-800 overflow-x-auto text-[11px] md:text-sm font-mono my-2">
                            {children}
                        </code>
                    ) : (
                        <code {...props} className="bg-neutral-800 text-orange-400 px-1.5 py-0.5 rounded text-[11px] md:text-xs font-mono">
                            {children}
                        </code>
                    );
                  },
                  p: ({ ...props }) => (
                    <p {...props} className="mb-2 last:mb-0" />
                  ),
                  ul: ({ ...props }) => (
                    <ul {...props} className="list-disc pl-4 mb-2 space-y-1" />
                  ),
                  ol: ({ ...props }) => (
                    <ol {...props} className="list-decimal pl-4 mb-2 space-y-1" />
                  )
                }}
              >
                {displayText}
              </ReactMarkdown>
            ) : isTyping ? (
              <div className="flex items-center space-x-2 py-1 text-neutral-500 italic text-sm font-medium">
                <span className="flex space-x-1">
                  <span className="w-1 h-1 bg-orange-500/60 rounded-full animate-bounce"></span>
                  <span className="w-1 h-1 bg-orange-500/60 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1 h-1 bg-orange-500/60 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </span>
                <span className="animate-pulse">AI is typing...</span>
              </div>
            ) : null}

            {displayText && isTyping && (
              <span className="inline-block w-1 h-4 ml-1 bg-orange-500/80 animate-pulse align-middle" aria-hidden="true" />
            )}
          </div>
          
          <div className={`text-[10px] md:text-xs mt-1.5 md:mt-2 font-medium opacity-60 flex items-center gap-1 ${isUser ? 'justify-end text-orange-100' : 'justify-start text-neutral-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;