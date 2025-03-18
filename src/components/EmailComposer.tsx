import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, X } from 'lucide-react';

interface EmailComposerProps {
  tokens: any;
  onClose: () => void;
  initialRecipient?: string;
  initialInstructions?: string;
}

interface DraftEmail {
  to: string;
  subject: string;
  body: string;
  draftId?: string;
}

export default function EmailComposer({ 
  tokens, 
  onClose,
  initialRecipient = '',
  initialInstructions = ''
}: EmailComposerProps) {
  const [instructions, setInstructions] = useState(initialInstructions);
  const [recipient, setRecipient] = useState(initialRecipient);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [draft, setDraft] = useState<DraftEmail | null>(null);
  const [error, setError] = useState('');

  // Auto-generate when initial values are provided
  useEffect(() => {
    if (initialRecipient && initialInstructions) {
      handleGenerateEmail();
    }
  }, []);

  const handleGenerateEmail = async () => {
    if (!instructions || !recipient) {
      setError('Please provide both instructions and recipient email');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/gmail/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify({
          instructions,
          to: recipient,
          saveDraft: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate email');
      }

      setDraft({
        to: recipient,
        subject: data.emailContent.subject,
        body: data.emailContent.body,
        draftId: data.draftId,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!draft?.draftId) {
      setError('No draft available to send');
      return;
    }

    setIsProcessingRequest(true);
    setError('');

    try {
      const response = await fetch('/api/gmail/draft/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify({
          draftId: draft.draftId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      // Close the composer after sending
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setIsProcessingRequest(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div className="bg-zinc-900 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-medium text-white">Compose Email</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-4">
          {!draft ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="recipient" className="block text-sm font-medium text-zinc-400 mb-1">
                  Recipient Email
                </label>
                <input
                  id="recipient"
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Email address"
                  className="w-full p-3 bg-zinc-800 text-white rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="instructions" className="block text-sm font-medium text-zinc-400 mb-1">
                  Email Instructions
                </label>
                <textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Example: Send an email to John wishing him a happy birthday and mention our dinner plans next week"
                  rows={5}
                  className="w-full p-3 bg-zinc-800 text-white rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateEmail}
                  disabled={isGenerating || !instructions || !recipient}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Email'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-zinc-400">To:</p>
                <p className="text-white">{draft.to}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-400">Subject:</p>
                <p className="text-white">{draft.subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-400">Message:</p>
                <div className="p-3 bg-zinc-800 text-white rounded-md border border-zinc-700 whitespace-pre-wrap">
                  {draft.body}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex justify-between">
                <button
                  onClick={() => setDraft(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isProcessingRequest}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessingRequest ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
} 