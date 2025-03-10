'use client'
import { ArrowUpIcon, XIcon, InfoIcon } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface Memory {
  id: string;
  text: string;
  timestamp: Date;
}

interface APIMemory {
  id: string;
  text: string;
  timestamp: string;
}

interface APIMessage {
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface APIMemoryResponse {
  memories: APIMemory[];
}

interface APIMessageResponse {
  messages: APIMessage[];
  chatId: string;
}

interface FormattedEmail {
  from: string;
  subject: string;
  date: string;
  content: string;
}

const DEFAULT_PROMPT = `You are Echo, a friendly AI companion. Your primary purpose is to engage in conversations while remembering important details shared by the user. You can also access the user's Gmail when they ask about their emails.

Conversation Guidelines:
- Only use greetings for the first message in a conversation
- Focus on continuing the natural flow of conversation
- Use the user's name occasionally but not in every message
- Maintain a friendly tone without being overly formal
- Remember and reference previous context naturally
- Don't save any memories about the emails. Any info you get from the emails should be used to answer the user's question, that's it, don't save any memories about the emails.
You can handle email queries like "When is my flight?" or "Show me my recent Amazon orders." Listen carefully and store meaningful information about preferences and experiences.`;
export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selected_model') || 'gemini-1.5-flash';
    }
    return 'gemini-1.5-flash';
  });
  const [memories, setMemories] = useState<Memory[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [systemPrompt, setSystemPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('system_prompt') || DEFAULT_PROMPT;
    }
    return DEFAULT_PROMPT;
  });
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [showTempInfo, setShowTempInfo] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [maxTokens, setMaxTokens] = useState(256);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [gmailTokens, setGmailTokens] = useState<any>(null);
  const [geminiWarning, setGeminiWarning] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState<number>(60);

  useEffect(() => {
    // Check for API key on component mount
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      window.location.href = '/playground/keys';
    }
  }, []);

  useEffect(() => {
    async function loadMemories() {
      try {
        const response = await fetch('/api/memory');
        if (response.ok) {
          const data = (await response.json()) as APIMemoryResponse;
          setMemories(data.memories.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        }
      } catch (error) {
        console.error('Failed to load memories:', error);
      }
    }
    loadMemories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && 
          buttonRef.current && 
          !tooltipRef.current.contains(event.target as Node) && 
          !buttonRef.current.contains(event.target as Node)) {
        setShowTempInfo(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadMessages() {
      try {
        const response = await fetch('/api/messages');
        if (response.ok) {
          const data = (await response.json()) as APIMessageResponse;
          setMessages(data.messages.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
          setChatId(data.chatId);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsInitializing(false);
      }
    }
    loadMessages();
  }, []);

  useEffect(() => {
    // Check if Gmail tokens exist in localStorage
    const tokens = localStorage.getItem('gmail_tokens');
    if (tokens) {
      setGmailTokens(JSON.parse(tokens));
      setIsGmailConnected(true);
    }
  }, []);

  useEffect(() => {
    // Check for tokens in URL after OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const tokens = urlParams.get('tokens');
    if (tokens) {
      localStorage.setItem('gmail_tokens', tokens);
      setGmailTokens(JSON.parse(tokens));
      setIsGmailConnected(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleDeleteMemory = async (id: string) => {
    try {
      const response = await fetch('/api/memory/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setMemories(prev => prev.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      window.location.href = '/playground/keys';
      return;
    }

    const newMessage: Message = {
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let emailContext = null;
      
      // First, check and fetch emails if needed
      if (inputMessage.toLowerCase().includes('email') || 
          inputMessage.toLowerCase().includes('flight') ||
          inputMessage.toLowerCase().includes('order') ||
          inputMessage.toLowerCase().includes('appointment')) {
        
        const tokens = localStorage.getItem('gmail_tokens');
        if (tokens) {
          const gmailResponse = await fetch('/api/gmail/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              query: inputMessage,
              tokens: JSON.parse(tokens)
            }),
          });
          
          if (gmailResponse.ok) {
            const emailData = await gmailResponse.json();
            emailContext = emailData.emails.map((email: any) => {
              const decodeHtml = (html: string) => {
                const txt = document.createElement('textarea');
                txt.innerHTML = html;
                return txt.value;
              };

              return {
                from: email.from?.split('<')[0]?.trim() || email.from,
                subject: decodeHtml(email.subject || ''),
                date: new Date(email.date).toLocaleString(),
                content: decodeHtml(email.snippet || ''),
                raw: email // Keep the raw email data in case we need it
              };
            });
          }
        }
      }

      // Then make the chat API call with both user message and email context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            newMessage
          ].map(msg => ({
            text: msg.text,
            isUser: msg.isUser
          })),
          emailData: emailContext, // Pass emails as separate data
          model,
          temperature,
          systemPrompt,
          apiKey,
          chatId,
          maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response from AI');
      }

      const data = await response.json();
      
      if (data.remainingRequests !== undefined) {
        setRemainingRequests(data.remainingRequests);
      }

      if (data.memories && data.memories.length > 0) {
        const memoryResponse = await fetch('/api/memory');
        if (memoryResponse.ok) {
          const data = (await memoryResponse.json()) as APIMemoryResponse;
          setMemories(data.memories.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        }
      }

      setMessages(prev => [...prev, {
        text: data.text,
        isUser: false,
        timestamp: new Date(data.timestamp)
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        text: "I apologize, but I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearMessages = async () => {
    try {
      const response = await fetch('/api/messages/clear', {
        method: 'DELETE'
      });
      if (response.ok) {
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  };

  const handleSystemPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setSystemPrompt(newPrompt);
    localStorage.setItem('system_prompt', newPrompt);
  };

  const handleResetPrompt = () => {
    setSystemPrompt(DEFAULT_PROMPT);
    localStorage.setItem('system_prompt', DEFAULT_PROMPT);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const LoadingScreen = () => (
    <div className="flex-1 flex items-center justify-center bg-black">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="40" 
        height="40" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="white" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="animate-pulse"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M15 6l-7 12" />
        <path d="M20 6l-7 12" />
        <path d="M5 14v.015" />
        <path d="M5 10.015v.015" />
      </svg>
    </div>
  );

  const handleModelChange = (modelOption: string) => {
    setModel(modelOption);
    localStorage.setItem('selected_model', modelOption);
  };

  return (
    <div className="flex h-screen tracking-tight">
      {isInitializing ? (
        <LoadingScreen />
      ) : (
        <>
          {/* Main chat area */}
          <div className="flex-1 flex flex-col bg-black">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-zinc-400 text-lg tracking-tight font-medium">Playground</h2>
              <button
                onClick={handleClearMessages}
                className="text-white hover:cursor-pointer flex items-center gap-2 text-xs border bg-red-600 border-red-600 rounded-lg px-2 py-1 hover:bg-red-600 hover:border-red-600 hover:scale-105 transition-all"
              >
                Clear All Messages
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-container">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.isUser
                        ? 'bg-zinc-800 text-white'
                        : 'bg-zinc-900 text-gray-100'
                    }`}
                  >
                    <ReactMarkdown
                      components={{
                        p: ({children}) => <p className="whitespace-pre-wrap prose prose-invert prose-sm max-w-none">{children}</p>
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                    <p className="text-xs text-gray-500 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 text-gray-100 rounded-lg p-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask Echo anything..."
                  className="flex-1 bg-black text-white rounded-lg px-4 py-2 ring-1 ring-white/20 focus:ring-white/30 transition-all focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  <ArrowUpIcon/>
                </button>
              </div>
            </form>
          </div>

          {/* Settings panel */}
          <div className="w-80 bg-black p-6 border-l border-zinc-800 tracking-tight">
            <div className="space-y-8">
              {/* System Prompt section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-zinc-400 text-sm">System Prompt</label>
                  <button 
                    onClick={handleResetPrompt}
                    className="text-zinc-500 text-xs hover:text-zinc-300 hover:cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={handleSystemPromptChange}
                  className="w-full bg-zinc-800/50 text-zinc-300 text-sm rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-1 focus:ring-zinc-700 resize-none"
                  placeholder="Enter system prompt..."
                />
              </div>

              {/* Gmail Integration */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-zinc-400 text-sm">Gmail Integration</label>
                  <button 
                    onClick={async () => {
                      const response = await fetch('/api/gmail/auth');
                      const { url } = await response.json();
                      window.location.href = url;
                    }}
                    className={`text-xs px-2 py-1 rounded-lg transition-all ${
                      isGmailConnected 
                        ? 'bg-green-600 text-white' 
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {isGmailConnected ? 'Gmail Connected' : 'Connect Gmail'}
                  </button>
                </div>
              </div>

              {/* Model & Temperature controls */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-zinc-400 text-sm">Model</label>
                    <span className="text-zinc-500 text-xs">
                      {model === 'gemini-1.5-flash' && 'Free'}
                      {model === 'gpt-3.5-turbo' && '$0.002/1K tokens'}
                      {model === 'gpt-3.5-turbo-16k' && '$0.003/1K tokens'}
                      {model === 'gpt-4' && '$0.03/1K tokens'}
                      {model === 'gpt-4-32k' && '$0.06/1K tokens'}
                      {model === 'gpt-4-turbo-preview' && '$0.01/1K tokens'}
                      {model === 'gpt-4o-mini' && '$0.0015/1K tokens'}
                    </span>
                  </div>
                  <div className="relative h-[120px] overflow-hidden bg-zinc-800/50 rounded-lg">
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-zinc-900/20 via-transparent to-zinc-900/20" />
                    <div className="relative h-full flex flex-col items-center py-2 overflow-y-auto hide-scrollbar">
                      {[
                        "gemini-1.5-flash",
                        "gpt-4o-mini",
                        "gpt-3.5-turbo",
                        "gpt-3.5-turbo-16k",
                        "gpt-4",
                        "gpt-4-turbo-preview",
                        "gpt-4-32k",
                      ].map((modelOption) => (
                        <button
                          key={modelOption}
                          onClick={() => handleModelChange(modelOption)}
                          onMouseEnter={() => setHoveredModel(modelOption)}
                          onMouseLeave={() => setHoveredModel(null)}
                          className={`
                            w-full px-4 py-2 transition-all duration-200 text-sm
                            ${model === modelOption ? 'text-white' : 'text-zinc-400'}
                            ${hoveredModel === modelOption ? 'text-zinc-200' : ''}
                          `}
                          style={{
                            transform: `scale(${model === modelOption ? 1.1 : 
                                         hoveredModel === modelOption ? 1.05 : 1})
                                       translateY(${model === modelOption ? '0px' : '0px'})`,
                            opacity: model === modelOption ? 1 : 0.7,
                          }}
                        >
                          {modelOption}
                        </button>
                      ))}
                    </div>
                  </div>
                  {model === 'gemini-1.5-flash' && (
                    <div className="text-xs text-zinc-500 mt-2 text-center">
                      {remainingRequests} requests remaining this minute
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 relative">
                      <label className="text-zinc-400 text-sm">Temperature</label>
                      <button 
                        ref={buttonRef}
                        onClick={() => setShowTempInfo(!showTempInfo)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors hover:cursor-pointer"
                      >
                        <InfoIcon className="w-4 h-4" />
                      </button>
                      {showTempInfo && (
                        <div 
                          ref={tooltipRef}
                          className="absolute mt-2 w-64 p-2 bg-zinc-800 rounded-lg shadow-lg text-xs text-zinc-300 z-10"
                        >
                          <p>Controls response randomness:</p>
                          <ul className="mt-1 space-y-1">
                            <li>• 0: Focused, consistent</li>
                            <li>• 0.7: Balanced creativity</li>
                            <li>• 1: Maximum randomness</li>
                          </ul>
                        </div>
                      )}
                    </div>
                    <span className="text-zinc-500 text-xs">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 relative">
                      <label className="text-zinc-400 text-sm">Response Length</label>
                      <button 
                        onClick={() => setShowTempInfo(!showTempInfo)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors hover:cursor-pointer"
                      >
                        <InfoIcon className="w-4 h-4" />
                      </button>
                      {showTempInfo && (
                        <div 
                          className="absolute mt-2 w-64 p-2 bg-zinc-800 rounded-lg shadow-lg text-xs text-zinc-300 z-10"
                        >
                          <p>Controls response length:</p>
                          <ul className="mt-1 space-y-1">
                            <li>• 128: Short responses</li>
                            <li>• 256: Medium responses</li>
                            <li>• 512: Long responses</li>
                            <li>• 1024: Very detailed responses</li>
                          </ul>
                        </div>
                      )}
                    </div>
                    <span className="text-zinc-500 text-xs">{maxTokens} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="128"
                    max="1024"
                    step="128"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>
              </div>

              {/* Memories section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-zinc-400 text-sm font-medium">Memories</h3>
                  <span className="text-zinc-500 text-xs">{memories.length} saved</span>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 chat-container">
                  {memories.map((memory) => (
                    <div 
                      key={memory.id} 
                      className="group relative bg-zinc-800/50 rounded-lg p-3 pr-8 transition-all hover:bg-zinc-800"
                    >
                      <p className="text-zinc-300 text-sm">{memory.text}</p>
                      <p className="text-zinc-600 text-xs mt-1">
                        {memory.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} • {memory.timestamp.toLocaleDateString()}
                      </p>
                      <button 
                        onClick={() => handleDeleteMemory(memory.id)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity hover:cursor-pointer"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {memories.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-zinc-600 text-sm">No memories saved yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Warning banner */}
          {geminiWarning && (
            <div className="bg-yellow-600/20 text-yellow-200 px-4 py-2 text-sm">
              Gemini rate limit reached. Switched to GPT backup model.
            </div>
          )}
        </>
      )}
    </div>
  );
} 