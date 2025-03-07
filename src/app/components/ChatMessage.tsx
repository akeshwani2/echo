
interface ChatMessageProps {
  content: string;
  role: 'user' | 'assistant';
  timestamp?: string;
}

export function ChatMessage({ content, role, timestamp }: ChatMessageProps) {
  // Pre-process content to handle double asterisks
  const processContent = (text: string) => {
    // Replace **text** with <strong>text</strong>
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-lg p-4 ${
        role === 'user' ? 'bg-blue-600' : 'bg-zinc-800'
      }`}>
        <div 
          className="prose prose-invert prose-sm"
          dangerouslySetInnerHTML={{ __html: processContent(content) }}
        />
        {timestamp && (
          <div className="text-xs text-white/50 mt-2">
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}