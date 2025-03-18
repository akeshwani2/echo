import React, { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import EmailComposer from './EmailComposer';

interface EmailCommandInputProps {
  tokens: any;
}

export default function EmailCommandInput({ tokens }: EmailCommandInputProps) {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailData, setEmailData] = useState<{
    recipient: string;
    instructions: string;
  } | null>(null);

  const handleProcessCommand = async () => {
    if (!command.trim()) {
      setError('Please enter a command');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/gmail/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify({
          command,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process command');
      }

      if (data.action === 'send_email') {
        setEmailData({
          recipient: data.recipient,
          instructions: data.instructions,
        });
        setShowEmailComposer(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process command');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleProcessCommand();
    }
  };

  return (
    <div className="w-full">
      <div className="mb-2">
        <label htmlFor="command" className="block text-sm font-medium text-zinc-400 mb-1">
          Email Command
        </label>
        <div className="relative">
          <textarea
            id="command"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Example: Send an email to john@example.com wishing him a happy birthday"
            rows={2}
            className="w-full p-3 pl-10 bg-zinc-800 text-white rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Sparkles className="absolute left-3 top-3 w-4 h-4 text-blue-400" />
          <button
            onClick={handleProcessCommand}
            disabled={isProcessing || !command.trim()}
            className="absolute right-3 top-3 text-blue-400 hover:text-blue-300 disabled:text-zinc-600 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {showEmailComposer && emailData && (
        <EmailComposer
          tokens={tokens}
          onClose={() => {
            setShowEmailComposer(false);
            setEmailData(null);
            setCommand('');
          }}
          initialRecipient={emailData.recipient}
          initialInstructions={emailData.instructions}
        />
      )}
    </div>
  );
} 