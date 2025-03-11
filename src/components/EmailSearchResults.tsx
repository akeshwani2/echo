import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight } from 'lucide-react';
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
          Let me search through your emails for any '{searchQuery}' -related information.
          </motion.div>
      )}

      {/* Search Results */}
      {emails.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }} 
          className="rounded-lg overflow-hidden border border-white/50"
        >
          {/* Header */}
          <div className="p-3 flex items-center gap-2 text-sm border-b border-white/50">
            <Search className="w-4 h-4" />
            <span className="text-white/90">{emails.length} emails found</span>
          </div>

          {/* Scrollable Email List */}
          <div className="max-h-[240px] overflow-y-auto space-y-2 px-4 pb-4 pt-4">
            <AnimatePresence>
              {emails.map((email) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-lg bg-zinc-900/90 border border-white/50 cursor-pointer hover:bg-zinc-800/90 transition-all group relative"
                  onClick={() => onEmailClick(email)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-sm text-white/90">{email.from}</div>
                    <div className="text-xs text-zinc-500">{email.date}</div>
                  </div>
                  <div className="text-sm text-white/80 mb-1">{email.subject}</div>
                  <div className="text-xs text-zinc-500 line-clamp-2">
                    {email.snippet}
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
} 