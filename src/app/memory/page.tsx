"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, RefreshCw, Plus, PencilIcon, X, Save, Check, AlertCircle } from 'lucide-react';
import { useUser } from "@clerk/nextjs";
import { GlowingEffect } from '../components/glowing-effect';
import { areSimilarMemories, isUniqueMemory } from '@/lib/memory';

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
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editedMemoryText, setEditedMemoryText] = useState('');
  const [showNewMemoryForm, setShowNewMemoryForm] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [isCreatingMemory, setIsCreatingMemory] = useState(false);
  const [isEditingMemory, setIsEditingMemory] = useState(false);
  const [similarMemory, setSimilarMemory] = useState<Memory | null>(null);
  const [showSimilarWarning, setShowSimilarWarning] = useState(false);

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

  // Check if text is similar to any existing memory
  const checkForSimilarMemories = (text: string, excludeMemoryId?: string): Memory | null => {
    // Convert memories to the right format for isUniqueMemory function
    const filteredMemories = memories.filter(m => 
      !excludeMemoryId || m.id !== excludeMemoryId
    );

    for (const memory of filteredMemories) {
      if (areSimilarMemories(text, memory.text)) {
        return memory;
      }
    }
    return null;
  };

  // Handle changes to edited memory text
  const handleEditedMemoryTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEditedMemoryText(text);
    
    // If we're in edit mode, check for similar memories excluding the current one
    if (editingMemoryId) {
      const similar = checkForSimilarMemories(text, editingMemoryId);
      setSimilarMemory(similar);
      setShowSimilarWarning(!!similar);
    }
  };

  // Handle changes to new memory text
  const handleNewMemoryTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewMemoryText(text);
    
    // Check for similar memories
    const similar = checkForSimilarMemories(text);
    setSimilarMemory(similar);
    setShowSimilarWarning(!!similar);
  };

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

  const handleEditMemory = (memory: Memory) => {
    setEditingMemoryId(memory.id);
    setEditedMemoryText(memory.text);
    setIsEditingMemory(false);
    setSimilarMemory(null);
    setShowSimilarWarning(false);
  };

  const handleCancelEdit = () => {
    setEditingMemoryId(null);
    setEditedMemoryText('');
    setIsEditingMemory(false);
    setSimilarMemory(null);
    setShowSimilarWarning(false);
  };

  const handleSaveEdit = async () => {
    if (!editingMemoryId || !editedMemoryText.trim()) return;
    
    // Check for similar memories one last time
    const similar = checkForSimilarMemories(editedMemoryText, editingMemoryId);
    if (similar) {
      setSimilarMemory(similar);
      setShowSimilarWarning(true);
      return; // Don't save if there's a similar memory
    }
    
    console.log('Saving edit for memory:', editingMemoryId);
    setIsEditingMemory(true);
    try {
      const response = await fetch('/api/memory/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: editingMemoryId, 
          text: editedMemoryText 
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('API error response:', responseData);
        throw new Error(`Failed to update memory: ${responseData.error || 'Unknown error'}`);
      }
      
      console.log('Update successful, received data:', responseData);
      
      // Update the memory in the state with the response from the server
      setMemories(memories.map(memory => 
        memory.id === editingMemoryId 
          ? { ...responseData, timestamp: new Date(responseData.timestamp) } 
          : memory
      ));
      
      // Reset edit state
      setEditingMemoryId(null);
      setEditedMemoryText('');
      setSimilarMemory(null);
      setShowSimilarWarning(false);
    } catch (err) {
      console.error('Error updating memory:', err);
      setError(`Failed to update memory: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsEditingMemory(false);
    }
  };

  const handleCreateMemory = async () => {
    if (!newMemoryText.trim()) return;
    
    // Check for similar memories one last time
    const similar = checkForSimilarMemories(newMemoryText);
    if (similar) {
      setSimilarMemory(similar);
      setShowSimilarWarning(true);
      return; // Don't save if there's a similar memory
    }
    
    console.log('Creating new memory');
    setIsCreatingMemory(true);
    try {
      const response = await fetch('/api/memory/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newMemoryText }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('API error response:', responseData);
        throw new Error(`Failed to create memory: ${responseData.error || 'Unknown error'}`);
      }
      
      console.log('Memory created successfully:', responseData);
      
      // Add the new memory to the state with properly converted dates
      setMemories([
        { 
          ...responseData, 
          timestamp: new Date(responseData.timestamp),
          createdAt: new Date(responseData.createdAt) 
        }, 
        ...memories
      ]);
      
      // Reset form
      setNewMemoryText('');
      setShowNewMemoryForm(false);
      setSimilarMemory(null);
      setShowSimilarWarning(false);
    } catch (err) {
      console.error('Error creating memory:', err);
      setError(`Failed to create memory: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCreatingMemory(false);
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

  // Function to handle forcing save despite similar memories
  const handleForceSave = () => {
    setShowSimilarWarning(false);
    if (editingMemoryId) {
      handleSaveEdit();
    } else {
      handleCreateMemory();
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-xl text-white"></h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-3">
          <h1 className="text-3xl tracking-tight">Memories</h1>
          <p className="text-zinc-400 text-sm">These are the memories that AI has learned about you during your conversations.</p>
        </header>

        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-2">
            <button 
              onClick={fetchMemories}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm cursor-pointer hover:scale-105 duration-300 transition-all"
              disabled={loading}
            >
              Refresh
            </button>
            
            <button 
              onClick={() => {
                setShowNewMemoryForm(true);
                setSimilarMemory(null);
                setShowSimilarWarning(false);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-100 text-sm cursor-pointer hover:scale-105 duration-300 transition-all"
            >
              New Memory
            </button>
          </div>
        </div>

        {/* Similar Memory Warning */}
        {showSimilarWarning && similarMemory && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 text-yellow-300"
          >
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle size={20} className="mt-0.5" />
              <div>
                <p className="font-medium">Similar memory already exists</p>
                <p className="text-sm text-yellow-300/80 mt-1">"{similarMemory.text}"</p>
                <p className="text-xs text-yellow-300/70 mt-1">Created: {formatDate(similarMemory.timestamp)}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button 
                onClick={() => setShowSimilarWarning(false)}
                className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleForceSave}
                className="px-3 py-1 text-xs bg-yellow-700 hover:bg-yellow-600 text-white rounded"
              >
                Save Anyway
              </button>
            </div>
          </motion.div>
        )}

        {/* New Memory Form */}
        {showNewMemoryForm && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 relative rounded-xl border border-white/30 p-1 bg-black/40"
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
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg tracking-tight">Create New Memory</h3>
                <button 
                  onClick={() => {
                    setShowNewMemoryForm(false);
                    setNewMemoryText('');
                    setSimilarMemory(null);
                    setShowSimilarWarning(false);
                  }}
                  className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <textarea
                value={newMemoryText}
                onChange={handleNewMemoryTextChange}
                placeholder="Enter a new memory..."
                className="w-full p-3 rounded-lg bg-zinc-900 text-white border border-zinc-700 focus:border-white focus:outline-none focus:ring-white mb-3"
                rows={3}
              />
              
              <div className="flex justify-end">
                <button
                  onClick={handleCreateMemory}
                  disabled={isCreatingMemory || !newMemoryText.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-white text-black hover:bg-zinc-100 disabled:bg-zinc-700 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer hover:scale-105 duration-300 transition-all"
                >
                  {isCreatingMemory ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Save Memory
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="text-red-500 bg-red-500/10 rounded-lg p-4 my-4">
            {error}
          </div>
        )}

        {loading && !error ? (
          <div className="flex justify-center my-12">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw size={32} className="text-white" />
            </motion.div>
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center my-12">
            <p className="text-zinc-400 text-sm">No memories found. Chat with the AI to create memories or add them manually.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
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
                  {editingMemoryId === memory.id ? (
                    /* Edit Mode */
                    <div>
                      <textarea
                        value={editedMemoryText}
                        onChange={handleEditedMemoryTextChange}
                        className="w-full p-3 rounded-lg bg-zinc-900 text-white border border-zinc-700 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 mb-3"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={handleCancelEdit}
                          className="p-2 text-zinc-400 hover:text-white cursor-pointer hover:scale-105 duration-300 transition-all"
                        >
                          <X size={16} />
                        </button>
                        <button 
                          onClick={handleSaveEdit}
                          disabled={isEditingMemory || !editedMemoryText.trim()}
                          className="p-2 text-green-500 hover:text-green-400 disabled:text-zinc-600 cursor-pointer hover:scale-105 duration-300 transition-all"
                        >
                          {isEditingMemory ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <Check size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-white text-md">{memory.text}</p>
                        <p className="text-zinc-500 text-xs mt-2">{formatDate(memory.timestamp)}</p>
                      </div>
                      <div className="flex">
                        <button 
                          onClick={() => handleEditMemory(memory)}
                          className="p-2 text-zinc-400 hover:text-blue-500 transition-colors cursor-pointer"
                          aria-label="Edit memory"
                        >
                          <PencilIcon size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMemory(memory.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                          aria-label="Delete memory"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
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