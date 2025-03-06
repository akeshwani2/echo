'use client'
import { ArrowUpIcon, CircleArrowUpIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';

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

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('gpt-4');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are Echo, a super friendly AI assistant, excited to meet a new person. Your goal is to save memories of things I tell you."
  );
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  useEffect(() => {
    async function loadMemories() {
      try {
        const response = await fetch('/api/memory');
        if (response.ok) {
          const data = await response.json();
          setMemories(data.memories.map((m: any) => ({
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const newMessage: Message = {
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, newMessage],
          temperature,
          model,
          systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const aiMessage = await response.json();
      
      if (aiMessage.memories && aiMessage.memories.length > 0) {
        // Fetch the newly created memories to get their IDs
        const memoryResponse = await fetch('/api/memory');
        if (memoryResponse.ok) {
          const { memories: updatedMemories } = await memoryResponse.json();
          setMemories(updatedMemories.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        }
      }

      setMessages(prev => [...prev, {
        text: aiMessage.text,
        isUser: false,
        timestamp: new Date(aiMessage.timestamp)
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

  return (
    <div className="flex h-screen">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-black">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <p className="whitespace-pre-wrap">{message.text}</p>
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
        </div>
        <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-zinc-900 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
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
      <div className="w-80 bg-zinc-900 p-6">
        <div className="space-y-8">
          {/* System Prompt section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-zinc-400 text-sm">System Prompt</label>
              <button 
                onClick={() => setSystemPrompt(
                  "You are Echo, a super friendly AI assistant, excited to meet a new person. Your goal is to save memories of things I tell you."
                )}
                className="text-zinc-500 text-xs hover:text-zinc-300"
              >
                Reset
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-zinc-800/50 text-zinc-300 text-sm rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-1 focus:ring-zinc-700 resize-none"
              placeholder="Enter system prompt..."
            />
          </div>

          {/* Model & Temperature controls */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-zinc-400 text-sm">Model</label>
                <span className="text-zinc-500 text-xs">{model}</span>
              </div>
              <div className="relative h-[120px] overflow-hidden bg-zinc-800/50 rounded-lg">
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-zinc-900/20 via-transparent to-zinc-900/20" />
                <div className="relative h-full flex flex-col items-center py-2 overflow-y-auto hide-scrollbar">
                  {[
                    "gpt-4",
                    "gpt-4-turbo",
                    "gpt-3.5-turbo",
                    "claude-3-opus",
                    "claude-3-sonnet",
                  ].map((modelOption) => (
                    <button
                      key={modelOption}
                      onClick={() => setModel(modelOption)}
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
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-zinc-400 text-sm">Temperature</label>
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
          </div>

          {/* Memories section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-400 text-sm font-medium">Memories</h3>
              <span className="text-zinc-500 text-xs">{memories.length} saved</span>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {memories.map((memory) => (
                <div 
                  key={memory.id} 
                  className="group relative bg-zinc-800/50 rounded-lg p-3 transition-all hover:bg-zinc-800"
                >
                  <p className="text-zinc-300 text-sm">{memory.text}</p>
                  <p className="text-zinc-600 text-xs mt-1">
                    {memory.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  <button 
                    onClick={() => handleDeleteMemory(memory.id)}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
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
    </div>


  );
} 