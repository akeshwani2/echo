// src/components/EmailPreview.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, Clock, Star, Reply, MoreVertical, Paperclip } from 'lucide-react';
import { Email } from '@/types/email';
import DOMPurify from 'isomorphic-dompurify';

interface EmailPreviewProps {
  email: Email | null;
  onClose: () => void;
}

export default function EmailPreview({ email, onClose }: EmailPreviewProps) {
  if (!email) return null;

  console.log('Email preview data:', {
    hasHtml: !!email.html,
    htmlLength: email.html?.length,
    hasBody: !!email.body,
    bodyLength: email.body?.length,
    subject: email.subject,
    from: email.from,
  });

  // Sanitize HTML content
  const sanitizedHtml = email.html ? DOMPurify.sanitize(email.html) : '';
  
  console.log('Sanitized HTML length:', sanitizedHtml.length);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 20 }}
      className="fixed inset-y-0 right-0 w-[800px] bg-[#1a1a1a] shadow-xl flex flex-col border-l border-zinc-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <h2 className="text-lg text-white font-medium line-clamp-1">{email.subject}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Email Info */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-1">{email.subject}</h3>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Clock className="w-4 h-4" />
              <span>{new Date(email.date).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <Star className="w-5 h-5 text-zinc-400" />
            </button>
            <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <Reply className="w-5 h-5 text-zinc-400" />
            </button>
            <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
            {email.from.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{email.from}</div>
                <div className="text-sm text-zinc-400">to me</div>
              </div>
              <div className="text-sm text-zinc-500">
                {new Date(email.date).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {sanitizedHtml ? (
            <div 
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              className="prose prose-invert max-w-none
                prose-headings:text-zinc-200
                prose-p:text-zinc-300
                prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-zinc-200
                prose-ul:text-zinc-300 prose-ol:text-zinc-300
                prose-blockquote:text-zinc-400 prose-blockquote:border-zinc-700
                prose-hr:border-zinc-800
                prose-img:rounded-lg prose-img:max-w-full
                prose-pre:bg-zinc-800 prose-pre:text-zinc-300
                prose-code:text-zinc-300 prose-code:bg-zinc-800 prose-code:rounded
                [&_*]:leading-normal"
            />
          ) : (
            <div className="whitespace-pre-wrap text-zinc-300">
              {email.body}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}