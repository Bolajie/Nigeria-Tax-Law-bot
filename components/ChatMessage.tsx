
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
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start animate-in fade-in slide-in-from-left-2 duration-300'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar Placeholder */}
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg ${
          isUser ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white ml-3' : 'bg-neutral-800 text-neutral-400 mr-3 border border-neutral-700'
        }`}>
          {isUser ? 'ME' : 'AI'}
        </div>

        {/* Bubble */}
        <div className={`relative px-4 py-3 rounded-2xl shadow-xl text-sm md:text-base leading-relaxed ${
          isUser 
            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-none' 
            : 'bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-tl-none'
        }`}>
          <div className={`prose prose-sm md:prose-base max-w-none ${
            isUser 
              ? 'prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-li:text-white' 
              : 'prose-invert prose-p:text-neutral-200 prose-headings:text-white prose-strong:text-orange-400 prose-li:text-neutral-200'
          }`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.text}
            </ReactMarkdown>
          </div>
          <div className={`text-[10px] mt-2 opacity-60 ${isUser ? 'text-right text-orange-100' : 'text-left text-neutral-500'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
