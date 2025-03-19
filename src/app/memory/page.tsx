"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, RefreshCw } from 'lucide-react';
import { useUser } from "@clerk/nextjs";
import { GlowingEffect } from '../components/glowing-effect';

interface Memory {
  id: string;
  text: string;
  timestamp: Date;
  createdAt: Date;
}

const MemoryPage = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoaded, isSignedIn } = useUser();

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/memory');
      if (!response.ok) {
        throw new Error('Failed to fetch memories');
      }
      const data = await response.json();
      setMemories(data.memories);
      setError(null);
    } catch (err) {
      setError('Failed to load memories. Please try again.');
      console.error('Error fetching memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchMemories();
    }
  }, [isLoaded, isSignedIn]);

  const handleDeleteMemory = async (id: string) => {
    try {
      const response = await fetch('/api/memory/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete memory');
      }
      
      // Remove the memory from the state
      setMemories(memories.filter(memory => memory.id !== id));
    } catch (err) {
      setError('Failed to delete memory. Please try again.');
      console.error('Error deleting memory:', err);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-xl text-white">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Memories</h1>
          <p className="text-zinc-400">These are the memories that AI has learned about you during your conversations.</p>
        </header>

        <div className="mb-6 flex justify-between items-center">
          <button 
            onClick={fetchMemories}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center my-12">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw size={32} className="text-purple-500" />
            </motion.div>
          </div>
        ) : error ? (
          <div className="text-red-500 bg-red-500/10 rounded-lg p-4 my-4">
            {error}
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center my-12">
            <p className="text-zinc-400">No memories found. Chat with the AI to create memories.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {memories.map((memory) => (
              <motion.div 
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-xl border border-white/10 p-1 bg-black/40"
              >
                <GlowingEffect
                  blur={0}
                  borderWidth={1}
                  spread={80}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                />
                <div className="relative p-4 rounded-lg bg-gradient-to-br from-black/80 to-black/40">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-white text-md">{memory.text}</p>
                      <p className="text-zinc-500 text-xs mt-2">{formatDate(memory.timestamp)}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteMemory(memory.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      aria-label="Delete memory"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryPage;