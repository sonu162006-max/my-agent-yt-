'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';

const SUGGESTIONS = [
  'Explain quantum computing in simple terms',
  'Brainstorm 5 fun weekend road trip ideas',
  'How does memory buffering work in AI agents?',
  'Draft a warm, polite email thanking a colleague',
];

export default function ChatPage() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
    clearError,
    stop,
  } = useChat();

  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (trimmed.length > 4000) {
      alert('Your message exceeds the 4,000 character limit.');
      return;
    }

    clearError();
    sendMessage({ text: trimmed });
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleNewChat = () => {
    stop();
    setMessages([]);
    clearError();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    if (isLoading) return;
    clearError();
    sendMessage({ text: prompt });
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  // Friendly error message parser
  const getErrorMessage = () => {
    if (!error) return null;
    const msg = error.message || '';
    if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
      return {
        title: 'Rate Limit Reached',
        description: 'You have sent too many requests (limit: 20/min). Please pause for a moment before sending another message.',
        type: 'rate-limit',
      };
    }
    if (msg.includes('GROQ_API_KEY') || msg.includes('API key')) {
      return {
        title: 'Groq API Key Required',
        description: 'No Groq API key was found. Please add your GROQ_API_KEY into .env.local to enable chat responses.',
        type: 'config',
      };
    }
    if (msg.includes('4000') || msg.toLowerCase().includes('character')) {
      return {
        title: 'Character Limit Exceeded',
        description: 'Messages are capped at 4,000 characters per request.',
        type: 'validation',
      };
    }
    return {
      title: 'Something went wrong',
      description: msg || 'An unexpected error occurred while communicating with the assistant. Please try again.',
      type: 'general',
    };
  };

  const currentError = getErrorMessage();

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-900/70 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20 text-white font-bold text-lg">
              AI
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-zinc-100">Groq Assistant</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-medium hidden sm:inline-block">
                  openai/gpt-oss-120b
                </span>
              </div>
              <p className="text-xs text-zinc-400">Friendly general-purpose AI • 10-turn memory</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="new-chat-btn"
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 active:bg-zinc-800 rounded-lg border border-zinc-700/60 transition-colors shadow-sm cursor-pointer"
              title="Start a new conversation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.75a.75.75 0 00-.75.75v4.482a.75.75 0 001.5 0v-2.148l.456.455a7 7 0 0011.758-3.15.75.75 0 00-1.402-.594zm-10.624-2.848a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h4.48a.75.75 0 00.75-.75V2.687a.75.75 0 00-1.5 0v2.148l-.456-.455a7 7 0 00-11.758 3.15.75.75 0 001.402.594z"
                  clipRule="evenodd"
                />
              </svg>
              <span>New chat</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conversation Thread */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Empty State / Welcome Screen */}
          {messages.length === 0 && (
            <div className="py-12 sm:py-16 text-center space-y-6">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-10 h-10"
                >
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  <path d="M8 12h.01" />
                  <path d="M12 12h.01" />
                  <path d="M16 12h.01" />
                </svg>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  How can I help you today?
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  I answer clearly and concisely, remembering what you tell me throughout our conversation (up to the last 10 exchanges).
                </p>
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto pt-2 text-left">
                {SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(item)}
                    className="p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition text-xs text-zinc-300 hover:text-white flex items-start justify-between group cursor-pointer shadow-sm"
                  >
                    <span>{item}</span>
                    <span className="text-zinc-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-transform ml-2">
                      &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Bubbles */}
          {messages.map((message) => {
            const isUser = message.role === 'user';
            const textContent = message.parts
              ? message.parts
                  .filter((p) => p.type === 'text')
                  .map((p) => (p as { type: 'text'; text: string }).text)
                  .join('')
              : '';

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300 shrink-0 select-none">
                    AI
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/10 rounded-br-sm'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-sm rounded-bl-sm whitespace-pre-wrap'
                  }`}
                >
                  {textContent}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0 select-none">
                    You
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing / Generating Indicator */}
          {isLoading && (
            <div className="flex gap-3 items-center text-zinc-400">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300 shrink-0">
                AI
              </div>
              <div className="flex items-center gap-1.5 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                <span className="text-xs text-zinc-400 ml-1.5">Thinking...</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {currentError && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
                currentError.type === 'rate-limit'
                  ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                  : currentError.type === 'config'
                  ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200'
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 shrink-0 mt-0.5"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-xs tracking-wide uppercase mb-0.5">
                  {currentError.title}
                </p>
                <p className="text-xs opacity-90">{currentError.description}</p>
              </div>
              <button
                onClick={clearError}
                className="text-xs opacity-70 hover:opacity-100 underline ml-2 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Footer Area */}
      <footer className="border-t border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end rounded-2xl bg-zinc-900 border border-zinc-700/80 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all p-2 gap-2 shadow-lg">
              <textarea
                ref={textareaRef}
                id="chat-input"
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything... (Press Enter to send)"
                rows={1}
                maxLength={4000}
                disabled={isLoading}
                className="w-full resize-none bg-transparent px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50 max-h-44"
              />

              <button
                id="send-message-btn"
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white disabled:text-zinc-600 transition-colors shrink-0 shadow-md cursor-pointer disabled:cursor-not-allowed"
                title="Send message"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.112A28.896 28.896 0 003.105 2.29z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-zinc-500">
              <span>Shift + Enter for new line • Buffer memory (last 10 exchanges)</span>
              <span className={input.length > 3800 ? 'text-amber-400 font-medium' : ''}>
                {input.length} / 4000
              </span>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
}
