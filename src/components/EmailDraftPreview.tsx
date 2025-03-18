import React, { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, X, Edit, ArrowUpCircleIcon } from "lucide-react";

interface EmailDraftPreviewProps {
  draft: {
    to: string;
    subject: string;
    body: string;
    draftId?: string;
  };
  onClose: () => void;
  onSend: () => Promise<void>;
  onEdit?: () => void;
}

export default function EmailDraftPreview({
  draft,
  onClose,
  onSend,
  onEdit,
}: EmailDraftPreviewProps) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setError("");
    setIsSending(true);
    try {
      await onSend();
      // onClose will be called by the parent after successful send
    } catch (err: any) {
      setError(err.message || "Failed to send email");
      setIsSending(false);
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 20 }}
      className="fixed inset-y-0 right-0 w-[500px] bg-[#1a1a1a] shadow-xl flex flex-col border-l border-zinc-800 z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <h2 className="text-lg text-zinc-400">Email Draft</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Recipient
          </label>
          <div className="p-3 bg-zinc-800 text-white rounded-md border border-zinc-700">
            {draft.to}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Subject
          </label>
          <div className="p-3 bg-zinc-800 text-white rounded-md border border-zinc-700">
            {draft.subject}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Message
          </label>
          <div className="p-3 bg-zinc-800 text-white rounded-md border border-zinc-700 whitespace-pre-wrap min-h-[200px]">
            {draft.body}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-md text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Footer with actions */}
      <div className="p-4 border-t border-zinc-800 flex justify-between">
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        )}

        <button
          onClick={handleSend}
          disabled={isSending}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md hover:bg-zinc-200 cursor-pointer transition-colors ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
            </>
          ) : (
            <>
              <ArrowUpCircleIcon className="w-6 h-6" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
