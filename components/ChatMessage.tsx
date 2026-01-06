import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex w-full mb-4 md:mb-6 ${isUser ? 'justify-end' : 'justify-start animate-in fade-in slide-in-from-left-2 duration-300'}`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 h-7 w-7 md:h-9 md:w-9 rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-bold shadow-lg mt-1 ${
          isUser ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white ml-2 md:ml-3' : 'bg-neutral-800 text-neutral-400 mr-2 md:mr-3 border border-neutral-700'
        }`}>
          {isUser ? 'YOU' : 'AI'}
        </div>

        {/* Message Bubble */}
        <div className={`relative px-3 py-2 md:px-4 md:py-3 rounded-2xl shadow-xl leading-relaxed ${
          isUser 
            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-none' 
            : 'bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-tl-none'
        }`}>
          <div className={`prose prose-sm md:prose-base max-w-none break-words ${
            isUser 
              ? 'prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-li:text-white' 
              : 'prose-invert prose-p:text-neutral-200 prose-headings:text-neutral-100 prose-strong:text-orange-400 prose-li:text-neutral-200'
          }`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom link styling for AI messages
                a: ({ node, ...props }) => (
                  <a {...props} className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors break-all" target="_blank" rel="noopener noreferrer" />
                ),
                // Handle tables with horizontal scroll on small screens
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4 custom-scrollbar rounded-lg border border-neutral-800">
                    <table {...props} className="min-w-full divide-y divide-neutral-800" />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th {...props} className="px-2 py-1 md:px-3 md:py-2 bg-neutral-800 text-left text-[10px] md:text-xs font-bold uppercase tracking-wider text-neutral-400" />
                ),
                td: ({ node, ...props }) => (
                  <td {...props} className="px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm border-t border-neutral-800" />
                ),
                // Better code block styling
                code: ({ node, inline, ...props }: any) => (
                  inline 
                    ? <code {...props} className="bg-neutral-800 text-orange-400 px-1 rounded text-[10px] md:text-xs font-mono" />
                    : <code {...props} className="block bg-neutral-950 p-2 md:p-3 rounded-lg border border-neutral-800 overflow-x-auto text-[10px] md:text-sm font-mono my-2" />
                )
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
          <div className={`text-[9px] md:text-[10px] mt-2 font-medium opacity-60 ${isUser ? 'text-right text-orange-100' : 'text-left text-neutral-500'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;