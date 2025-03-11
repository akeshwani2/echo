"use client";
import { ArrowUpIcon, XIcon, InfoIcon } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import EmailSearchResults from "@/components/EmailSearchResults";
import { Email } from "@/types/email";
import EmailPreview from "@/components/EmailPreview";
import { AnimatePresence } from "framer-motion";

interface Message {
  text: string;
  isUser: boolean;
  // timestamp: Date;
}

interface Memory {
  id: string;
  text: string;
  timestamp: Date;
}

interface APIMemory {
  id: string;
  text: string;
  timestamp: string;
}

interface APIMessage {
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface APIMemoryResponse {
  memories: APIMemory[];
}

interface APIMessageResponse {
  messages: APIMessage[];
  chatId: string;
}

interface FormattedEmail {
  from: string;
  subject: string;
  date: string;
  content: string;
}

interface EmailCache {
  emails: Email[];
  lastUpdated: Date;
  searchQuery: string;
}

interface SuggestedAction {
  title: string;
  description: string;
  prompt: string;
}

const SUGGESTED_ACTIONS: SuggestedAction[] = [
  {
    title: "Search Emails",
    description: "Find specific emails or conversations",
    prompt: "Find my recent emails about project updates",
  },
  {
    title: "Summarize Meetings",
    description: "Get summaries of meeting-related emails",
    prompt: "Summarize my meeting emails from last week",
  },
  {
    title: "Track Orders",
    description: "Find order confirmations and tracking info",
    prompt: "Find my recent order confirmations",
  },
  {
    title: "Travel Plans",
    description: "Access travel-related emails and itineraries",
    prompt: "Show my upcoming travel itineraries",
  },
];

const DEFAULT_PROMPT = `You are Echo, an intelligent email assistant. Your primary purpose is to help users manage and understand their emails while providing relevant insights and assistance.

Core Functionality:
1. ALWAYS check email context first for any query, even if it doesn't explicitly mention emails
2. When email context is relevant:
   - Analyze email data thoroughly
   - Present information clearly and concisely
   - Extract key details (dates, times, locations, numbers)
   - Provide context about which emails were used
3. When email context isn't relevant or sufficient:
   - Clearly state that you're using general knowledge
   - Provide helpful information from your general knowledge
   - Explain why email context wasn't applicable

Email Processing Guidelines:
- For appointments/meetings: Extract dates, times, locations, participants
- For orders/purchases: Show order details, tracking, delivery dates
- For travel: Highlight flight times, confirmation numbers, itineraries
- For general correspondence: Summarize key points and action items

Communication Style:
- Be concise and professional
- Focus on email-centric assistance
- Maintain conversation flow naturally
- Use the user's name occasionally
- Don't save memories about email content between conversations

Remember: Your primary context is the user's emails, but you can provide general assistance when email context isn't relevant or available.`;

// Add this function before the Chat component
const shouldSearchEmails = (query: string): boolean => {
  // List of terms that suggest email relevance
  const emailRelatedTerms = [
    "email",
    "mail",
    "gmail",
    "message",
    "inbox",
    "sent",
    "received",
    "from",
    "to",
    "meeting",
    "appointment",
    "schedule",
    "order",
    "purchase",
    "tracking",
    "flight",
    "booking",
    "reservation",
    "contact",
    "reply",
    "forward",
    "calendar",
    "invite",
    "notification",
    "newsletter",
    "subscription",
  ];

  // Check if query contains date-related patterns
  const hasDatePattern =
    /\b(today|yesterday|tomorrow|last|next|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(
      query
    );

  // Check if query contains email-related terms
  const hasEmailTerm = emailRelatedTerms.some((term) =>
    query.toLowerCase().includes(term)
  );

  // Check if query looks like it's asking about communication or information sharing
  const hasCommunicationPattern =
    /\b(did|does|has|have|when|what|who|sent|receive|say|tell|ask|mentioned|wrote|respond|contact)\b/i.test(
      query
    );

  return hasEmailTerm || hasDatePattern || hasCommunicationPattern;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selected_model") || "gemini-1.5-flash";
    }
    return "gemini-1.5-flash";
  });
  const [memories, setMemories] = useState<Memory[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [systemPrompt, setSystemPrompt] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("system_prompt") || DEFAULT_PROMPT;
    }
    return DEFAULT_PROMPT;
  });
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [showTempInfo, setShowTempInfo] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [maxTokens, setMaxTokens] = useState(256);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [gmailTokens, setGmailTokens] = useState<any>(null);
  const [geminiWarning, setGeminiWarning] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState<number>(60);
  const [isSearchingEmails, setIsSearchingEmails] = useState(false);
  const [foundEmails, setFoundEmails] = useState<Email[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [emailCache, setEmailCache] = useState<EmailCache | null>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check for API key on component mount
    const apiKey = localStorage.getItem("openai_api_key");
    if (!apiKey) {
      window.location.href = "/playground/keys";
    }
  }, []);

  useEffect(() => {
    async function loadMemories() {
      try {
        const response = await fetch("/api/memory");
        if (response.ok) {
          const data = (await response.json()) as APIMemoryResponse;
          setMemories(
            data.memories.map((m) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load memories:", error);
      }
    }
    loadMemories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        buttonRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowTempInfo(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadMessages() {
      try {
        const response = await fetch("/api/messages");
        if (response.ok) {
          const data = (await response.json()) as APIMessageResponse;
          setMessages(
            data.messages.map((m) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }))
          );
          setChatId(data.chatId);
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsInitializing(false);
      }
    }
    loadMessages();
  }, []);

  useEffect(() => {
    // Check if Gmail tokens exist in localStorage
    const tokens = localStorage.getItem("gmail_tokens");
    if (tokens) {
      setGmailTokens(JSON.parse(tokens));
      setIsGmailConnected(true);
    }
  }, []);

  useEffect(() => {
    // Check for tokens in URL after OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const tokens = urlParams.get("tokens");
    if (tokens) {
      localStorage.setItem("gmail_tokens", tokens);
      setGmailTokens(JSON.parse(tokens));
      setIsGmailConnected(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleDeleteMemory = async (id: string) => {
    try {
      const response = await fetch("/api/memory/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete memory:", error);
    }
  };

  // Add this function to check if cache is valid
  const isEmailCacheValid = (cache: EmailCache | null): boolean => {
    if (!cache) return false;
    const now = new Date();
    return now.getTime() - cache.lastUpdated.getTime() < CACHE_DURATION;
  };

  // Add this function to check if we should use cached results
  const shouldUseCachedEmails = (
    query: string,
    cache: EmailCache | null
  ): boolean => {
    if (!isEmailCacheValid(cache)) return false;

    // If the new query is a follow-up or related to the cached query
    const isFollowUp =
      query.toLowerCase().includes(cache!.searchQuery.toLowerCase()) ||
      cache!.searchQuery.toLowerCase().includes(query.toLowerCase());

    // Check if query contains reference words like "it", "that", "those", "these", etc.
    const hasReferenceWords =
      /\b(it|that|those|these|this|they|them|the meeting|the email|the message)\b/i.test(
        query
      );

    return isFollowUp || hasReferenceWords;
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const apiKey = localStorage.getItem("openai_api_key");
    if (!apiKey) {
      window.location.href = "/playground/keys";
      return;
    }

    const newMessage: Message = {
      text: inputMessage,
      isUser: true,
      // timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsLoading(true);
    setFoundEmails([]);

    try {
      let emailContext = null;

      // Check if we should search emails
      const tokens = localStorage.getItem("gmail_tokens");
      if (tokens && shouldSearchEmails(inputMessage)) {
        // Check if we can use cached results
        if (shouldUseCachedEmails(inputMessage, emailCache)) {
          console.log("Using cached email results");
          setFoundEmails(emailCache!.emails);
          emailContext = emailCache!.emails;
        } else {
          setIsSearchingEmails(true);
          setLastSearchQuery(inputMessage);

          const gmailResponse = await fetch("/api/gmail/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: inputMessage,
              tokens: JSON.parse(tokens),
            }),
          });

          if (gmailResponse.ok) {
            const emailData = await gmailResponse.json();
            const formattedEmails = emailData.emails.map((email: any) => {
              const decodeHtml = (html: string) => {
                const txt = document.createElement("textarea");
                txt.innerHTML = html;
                return txt.value;
              };

              return {
                id: email.id,
                from: email.from?.split("<")[0]?.trim() || email.from,
                subject: decodeHtml(email.subject || ""),
                date: new Date(email.date).toLocaleString(),
                snippet: decodeHtml(email.snippet || ""),
                body: decodeHtml(email.body || ""),
              };
            });

            if (formattedEmails.length > 0) {
              // Update cache with new results
              setEmailCache({
                emails: formattedEmails,
                lastUpdated: new Date(),
                searchQuery: inputMessage,
              });
              setFoundEmails(formattedEmails);
              emailContext = formattedEmails;
            }
          }
          setIsSearchingEmails(false);
        }
      }

      // Make the chat API call with both user message and email context
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, newMessage].map((msg) => ({
            text: msg.text,
            isUser: msg.isUser,
          })),
          emailData: emailContext, // Pass emails as separate data
          model,
          temperature,
          systemPrompt,
          apiKey,
          chatId,
          maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response from AI");
      }

      const data = await response.json();

      if (data.remainingRequests !== undefined) {
        setRemainingRequests(data.remainingRequests);
      }

      if (data.memories && data.memories.length > 0) {
        const memoryResponse = await fetch("/api/memory");
        if (memoryResponse.ok) {
          const data = (await memoryResponse.json()) as APIMemoryResponse;
          setMemories(
            data.memories.map((m) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }))
          );
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          text: data.text,
          isUser: false,
          timestamp: new Date(data.timestamp),
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: "I apologize, but I encountered an error. Please try again.",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsSearchingEmails(false);
    }
  };

  const handleClearMessages = async () => {
    try {
      const response = await fetch('/api/messages/clear', {
        method: 'DELETE'
      });
      if (response.ok) {
        setMessages([]);
        // Clear email-related states
        setFoundEmails([]);
        setLastSearchQuery('');
        setIsSearchingEmails(false);
        setEmailCache(null);
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  };

  const handleSystemPromptChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newPrompt = e.target.value;
    setSystemPrompt(newPrompt);
    localStorage.setItem("system_prompt", newPrompt);
  };

  const handleResetPrompt = () => {
    setSystemPrompt(DEFAULT_PROMPT);
    localStorage.setItem("system_prompt", DEFAULT_PROMPT);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const LoadingScreen = () => (
    <div className="flex-1 flex items-center justify-center bg-black">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-pulse"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M15 6l-7 12" />
        <path d="M20 6l-7 12" />
        <path d="M5 14v.015" />
        <path d="M5 10.015v.015" />
      </svg>
    </div>
  );

  const handleModelChange = (modelOption: string) => {
    setModel(modelOption);
    localStorage.setItem("selected_model", modelOption);
  };

  const handleEmailClick = async (email: Email) => {
    try {
      console.log("Clicking email:", {
        id: email.id,
        hasHtml: !!email.html,
        htmlLength: email.html?.length,
        hasBody: !!email.body,
        bodyLength: email.body?.length,
      });

      // Just set the selected email directly
      setSelectedEmail(email);
    } catch (error) {
      console.error("Failed to handle email click:", error);
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setInputMessage(prompt);
    // Auto-focus the input field
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-screen tracking-tight">
      {isInitializing ? (
        <LoadingScreen />
      ) : (
        <>
          {/* Main chat area */}
          <div className="flex-1 flex flex-col bg-black">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-zinc-400 text-lg tracking-tight font-medium">
                Playground
              </h2>
              <button
                onClick={handleClearMessages}
                className="text-white hover:cursor-pointer flex items-center gap-2 text-xs border bg-red-600 border-red-600 rounded-lg px-2 py-1 hover:bg-red-600 hover:border-red-600 hover:scale-105 transition-all"
              >
                Clear All Messages
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-container">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <h3 className="text-zinc-400 text-lg mb-6">
                    How can I help you today?
                  </h3>
                  <div className="grid grid-cols-2 gap-4 max-w-2xl w-full">
                    {SUGGESTED_ACTIONS.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(action.prompt)}
                        className="bg-zinc-900 hover:bg-zinc-800 transition-colors p-4 rounded-lg text-left group"
                      >
                        <h4 className="text-white font-medium mb-1">
                          {action.title}
                        </h4>
                        <p className="text-zinc-400 text-sm">
                          {action.description}
                        </p>
                        <p className="text-zinc-500 text-xs mt-2 group-hover:text-zinc-400">
                          "{action.prompt}"
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.isUser
                          ? "bg-zinc-800 text-white"
                          : "bg-zinc-900 text-gray-100"
                      }`}
                    >
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                              {children}
                            </p>
                          ),
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                      {/* <p className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p> */}
                    </div>
                  </div>
                ))
              )}

              {/* Email Search Results */}
              {(isSearchingEmails || foundEmails.length > 0) && (
                <EmailSearchResults
                  isSearching={isSearchingEmails}
                  searchQuery={lastSearchQuery}
                  emails={foundEmails}
                  onEmailClick={handleEmailClick}
                />
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 text-gray-100 rounded-lg p-3">
                    <div className="flex space-x-2">
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-zinc-800"
            >
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask Echo anything..."
                  className="flex-1 bg-black text-white rounded-lg px-4 py-2 ring-1 ring-white/20 focus:ring-white/30 transition-all focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  <ArrowUpIcon />
                </button>
              </div>
            </form>
          </div>

          {/* Warning banner */}
          {geminiWarning && (
            <div className="bg-yellow-600/20 text-yellow-200 px-4 py-2 text-sm">
              Gemini rate limit reached. Switched to GPT backup model.
            </div>
          )}

          <AnimatePresence>
            {selectedEmail && (
              <EmailPreview
                email={selectedEmail}
                onClose={() => setSelectedEmail(null)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
