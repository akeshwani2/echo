import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { Email, EmailSearchResult } from '@/types/email';

export default function EmailSearchResults({
  isSearching,
  searchQuery,
  emails,
  onEmailClick,
}: EmailSearchResult) {
  return (
    <div className="space-y-4 text-white">
      {/* Search Status */}
      {isSearching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-zinc-400 text-sm bg-zinc-800/50 p-4 rounded-lg"
        >
          Let me search through your emails for any {searchQuery}-related information.
        </motion.div>
      )}

      {/* Search Results */}
      {emails.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-zinc-800/50 rounded-lg overflow-hidden border border-white/50"
        >
          {/* Header */}
          <div className="p-3 flex items-center gap-2 text-sm text-zinc-400 border-b border-zinc-700/50">
            <Search className="w-4 h-4" />
            <span>{emails.length} emails found</span>
          </div>

          {/* Scrollable Email List */}
          <div className="max-h-[240px] overflow-y-auto">
            <AnimatePresence>
              {emails.map((email) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 border-b border-zinc-700/50 last:border-b-0 cursor-pointer hover:bg-zinc-700/50 transition-colors"
                  onClick={() => onEmailClick(email)}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="text-sm font-medium">{email.from}</div>
                    <div className="text-xs text-zinc-400">{email.date}</div>
                  </div>
                  <div className="text-sm font-medium mb-1">{email.subject}</div>
                  <div className="text-xs text-zinc-400 line-clamp-2">
                    {email.snippet}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
} 