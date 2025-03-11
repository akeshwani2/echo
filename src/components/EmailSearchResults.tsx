import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, ExternalLink, AlertCircle, Clock } from 'lucide-react';
import { Email, EmailSearchResult } from '@/types/email';

// Update the helper function
const getGmailUrl = (emailId: string): string => {
  // Remove any special characters and get just the message ID
  const cleanId = emailId.replace(/[<>]/g, '');
  return `https://mail.google.com/mail/u/0/#inbox/${cleanId}`;
};

export default function EmailSearchResults({
  isSearching,
  searchQuery,
  emails,
  onEmailClick,
}: EmailSearchResult) {
  // Don't render anything if not searching and no emails found
  if (!isSearching && emails.length === 0) {
    return null;
  }

  // Get only relevant emails (those with a relevance score above a threshold)
  const relevantEmails = emails.filter(email => (email as any).relevanceScore > 10);
  
  // Get highly relevant emails (those with a very high relevance score)
  const highlyRelevantEmails = emails.filter(email => (email as any).relevanceScore > 50);
  
  // Get recent emails (those with low relevance scores)
  const recentEmails = emails.filter(email => (email as any).relevanceScore <= 10);
  
  return (
    <div className="space-y-4 text-white">
      {/* Search Status */}
      {isSearching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-zinc-400 text-sm bg-zinc-800/50 p-4 rounded-lg"
        >
          Searching through your emails for relevant information...
        </motion.div>
      )}

      {/* Search Results */}
      {!isSearching && emails.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }} 
          className="overflow-hidden border border-white/50 rounded-2xl"
        >
          {/* Header */}
          <div className="p-3 flex items-center gap-2 text-sm">
            <Search className="w-4 h-4" />
            <span className="text-white/90">
              {highlyRelevantEmails.length > 0 
                ? `Found ${highlyRelevantEmails.length} highly relevant emails` 
                : relevantEmails.length > 0
                  ? `Found ${relevantEmails.length} relevant emails`
                  : `Showing ${emails.length} recent emails`
              }
              {highlyRelevantEmails.length > 0 && recentEmails.length > 0 && 
                ` and ${recentEmails.length} other recent emails`
              }
            </span>
          </div>

          {/* Scrollable Email List */}
          <div className="max-h-[240px] overflow-y-auto space-y-2 px-4 pb-4 pt-4">
            <AnimatePresence>
              {/* Show section header if we have both relevant and recent emails */}
              {relevantEmails.length > 0 && recentEmails.length > 0 && (
                <div className="text-xs text-zinc-400 font-medium mb-2 flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  <span>RELEVANT TO YOUR QUERY</span>
                </div>
              )}
              
              {/* Render relevant emails first */}
              {relevantEmails.map((email) => {
                const relevanceScore = (email as any).relevanceScore || 0;
                const isHighlyRelevant = relevanceScore > 50;
                
                return (
                  <motion.div
                    key={email.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`p-4 rounded-lg ${isHighlyRelevant 
                      ? 'bg-zinc-800/90 border-l-4 border-l-blue-500 border border-white/50' 
                      : 'bg-zinc-900/90 border border-white/50'
                      } hover:bg-zinc-800/90 transition-all group relative cursor-pointer`}
                    onClick={() => onEmailClick(email)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-sm text-white/90 flex items-center gap-2">
                        {isHighlyRelevant && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                            Relevant
                          </span>
                        )}
                        {email.from}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-zinc-500">{email.date}</div>
                        <a
                          href={getGmailUrl(email.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-zinc-700 rounded transition-colors"
                          title="Open in Gmail"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4 text-zinc-400 hover:text-white" />
                        </a>
                      </div>
                    </div>
                    <div className="text-sm text-white/80 mb-1">{email.subject}</div>
                    <div className="text-xs text-zinc-500 line-clamp-2">
                      {email.snippet}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                );
              })}
              
              {/* Show section header for recent emails if we have both types */}
              {relevantEmails.length > 0 && recentEmails.length > 0 && (
                <div className="text-xs text-zinc-400 font-medium mt-4 mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>RECENT EMAILS</span>
                </div>
              )}
              
              {/* Render recent emails */}
              {recentEmails.map((email) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-lg bg-zinc-950/90 border border-white/20 hover:bg-zinc-900/90 transition-all group relative cursor-pointer"
                  onClick={() => onEmailClick(email)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-sm text-white/80">{email.from}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-zinc-500">{email.date}</div>
                      <a
                        href={getGmailUrl(email.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-zinc-700 rounded transition-colors"
                        title="Open in Gmail"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4 text-zinc-400 hover:text-white" />
                      </a>
                    </div>
                  </div>
                  <div className="text-sm text-white/70 mb-1">{email.subject}</div>
                  <div className="text-xs text-zinc-600 line-clamp-2">
                    {email.snippet}
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-700 absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
} 