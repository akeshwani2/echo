"use client";
import {
  ArrowUpIcon,
  XIcon,
  InfoIcon,
  SearchIcon,
  Plane,
  ArrowLeftRight,
  User,
  ExternalLink,
  Search,
  Users,
  ShoppingBag,
  AlertCircle,
  CheckSquare,
  Inbox,
  Clock,
  Brain,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import EmailSearchResults from "@/components/EmailSearchResults";
import { Email } from "@/types/email";
import EmailPreview from "@/components/EmailPreview";
import { AnimatePresence } from "framer-motion";
import { Components } from 'react-markdown';
import EmailSummaryDashboard from "../../components/EmailSummaryDashboard";
import { motion } from "framer-motion";
import EmailDraftPreview from "@/components/EmailDraftPreview";

interface Message {
  text: string;
  isUser: boolean;
  // timestamp: Date;
  hasMemory?: boolean; // Add this flag to indicate memory was created
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
  dateRange?: any;
}

interface SuggestedAction {
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  startTime: string;
  date: string;
  attendees: any[];
  organizer: any;
  link: string;
}

const getGmailUrl = (emailId: string): string => {
  // Remove any special characters and get just the message ID
  const cleanId = emailId.replace(/[<>]/g, '');
  return `https://mail.google.com/mail/u/0/#inbox/${cleanId}`;
};
const SUGGESTED_ACTIONS: SuggestedAction[] = [
  {
    icon: <SearchIcon />,
    title: "Search Emails",
    description: "Find specific emails or conversations",
    prompt: "Find my recent emails about project updates",
  },
  {
    icon: <User />,
    title: "Summarize Meetings",
    description: "Get summaries of meeting-related emails",
    prompt: "Summarize my meeting emails from last week",
  },
  {
    icon: <ArrowLeftRight />,
    title: "Track Orders",
    description: "Find order confirmations and tracking info",
    prompt: "Find my recent order confirmations",
  },
  {
    icon: <Plane />,
    title: "Travel Plans",
    description: "Access travel-related emails and itineraries",
    prompt: "Show my upcoming travel itineraries",
  },
];

const DEFAULT_PROMPT = `You are Echo, an intelligent email assistant. Your primary purpose is to help users manage and understand their emails while providing relevant insights and assistance.

Core Functionality:
1. ALWAYS start responses with a clear overview:
   📊 **Summary Dashboard**
   - Total emails found: [number]
   - High priority: [number]
   - Needs action: [number]
   - Categories found: [list]

2. Format ALL email references exactly like this:
   Title/Subject [](email_id)

   Examples:
   • "Project Update" [](123456)
   • Meeting Invitation [](789012)

3. Group by category:
   📄 **Documents**
   • Document name [](email_id)
     └─ Status: ⏳ Pending

   📅 **Meetings**
   • Meeting title [](email_id)
     └─ ⏰ Time: 2 PM

4. Action items:
   ⚡ **Action Required**
   • [⚠️ High] Sign document [](email_id)
   • [📌 Medium] Review file [](email_id)

Style Guide:
- Keep responses concise
- Use headers with emojis
- Use status indicators: ✅ ⏳ ❌
- Use priority levels: [⚠️ High] [📌 Medium] [Low]
- Add dividers (---) between sections

IMPORTANT: Always put email IDs in empty markdown links: [](id_here)
Never show raw email IDs in the text.`;

// Add this function before the Chat component
const shouldSearchEmails = (query: string): boolean => {
  // Normalize the query
  const normalizedQuery = query.toLowerCase().trim();
  
  // If the query is too short, don't search emails
  if (normalizedQuery.length < 3) return false;
  
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
    "document",
    "sign",
    "signature",
    "contract",
    "docusign",
    "agreement",
    "form",
    "paperwork",
  ];

  // Check if query contains date-related patterns
  const hasDatePattern =
    /\b(today|yesterday|tomorrow|last|next|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|2023|2024|2022|2021|2020|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(
      normalizedQuery
    );

  // Check if query contains time period references
  const hasTimePeriodReference =
    /\b(this year|last year|current year|in 20\d\d|from 20\d\d|during 20\d\d|for 20\d\d|in january|in february|in march|in april|in may|in june|in july|in august|in september|in october|in november|in december)\b/i.test(
      normalizedQuery
    );

  // Check if query contains email-related terms
  const hasEmailTerm = emailRelatedTerms.some((term) =>
    normalizedQuery.includes(term)
  );

  // Check if query looks like it's asking about communication or information sharing
  const hasCommunicationPattern =
    /\b(did|does|has|have|when|what|who|sent|receive|say|tell|ask|mentioned|wrote|respond|contact)\b/i.test(
      normalizedQuery
    );
    
  // Check if query is specifically about documents to sign
  const isDocumentSigningQuery = 
    /\b(document|contract|agreement|form|sign|signature|docusign|paperwork)\b/i.test(normalizedQuery) &&
    /\b(need|have|to|pending|waiting|require|sign|review|approve|complete)\b/i.test(normalizedQuery);
    
  // Check if query is directly asking about emails
  const isDirectEmailQuery = 
    /\b(find|search|show|get|list|display|any|all|recent|latest|old|new)\b/i.test(normalizedQuery) &&
    /\b(email|mail|message|inbox)\b/i.test(normalizedQuery);
    
  // Check if query is asking about specific email types
  const isSpecificEmailTypeQuery =
    /\b(unread|important|starred|flagged|labeled|archived|deleted|spam|trash|draft)\b/i.test(normalizedQuery) &&
    /\b(email|mail|message|inbox)\b/i.test(normalizedQuery);

  return hasEmailTerm || 
         hasDatePattern || 
         hasTimePeriodReference ||
         hasCommunicationPattern || 
         isDocumentSigningQuery || 
         isDirectEmailQuery || 
         isSpecificEmailTypeQuery;
};

// Add this function to extract date range from query
function extractDateRangeFromQuery(query: string): { dateRange: any, cleanQuery: string } | null {
  // Default to current year if no specific date mentioned
  const currentYear = new Date().getFullYear();
  let dateRange = {
    after: `${currentYear}/01/01`,
    before: `${currentYear + 1}/01/01`
  };
  
  let cleanQuery = query;
  
  // Check for "this year" or "current year"
  if (/\b(this|current)\s+year\b/i.test(query)) {
    cleanQuery = query.replace(/\b(this|current)\s+year\b/i, '').trim();
    // Keep default date range (current year)
  }
  
  // Check for "last year"
  else if (/\blast\s+year\b/i.test(query)) {
    const lastYear = currentYear - 1;
    dateRange = {
      after: `${lastYear}/01/01`,
      before: `${lastYear + 1}/01/01`
    };
    cleanQuery = query.replace(/\blast\s+year\b/i, '').trim();
  }
  
  // Check for specific year mention (e.g., "in 2023" or "from 2023")
  else {
    const yearMatch = query.match(/\b(in|from|during|for)\s+(\d{4})\b/i);
    if (yearMatch && yearMatch[2]) {
      const year = parseInt(yearMatch[2]);
      if (year >= 2000 && year <= currentYear) {
        dateRange = {
          after: `${year}/01/01`,
          before: `${year + 1}/01/01`
        };
        cleanQuery = query.replace(yearMatch[0], '').trim();
      }
    }
  }
  
  // Check for specific month mention (e.g., "in January" or "from March")
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthPattern = new RegExp(`\\b(in|from|during|for)\\s+(${monthNames.join('|')})\\b`, 'i');
  const monthMatch = query.match(monthPattern);
  
  if (monthMatch && monthMatch[2]) {
    const monthName = monthMatch[2].toLowerCase();
    const monthIndex = monthNames.indexOf(monthName);
    
    if (monthIndex !== -1) {
      const month = monthIndex + 1;
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      
      // If year was already set, use that year, otherwise use current year
      const year = dateRange.after.split('/')[0];
      
      dateRange.after = `${year}/${monthStr}/01`;
      
      // Set before to the first day of the next month
      if (month === 12) {
        dateRange.before = `${parseInt(year) + 1}/01/01`;
      } else {
        const nextMonth = month + 1;
        const nextMonthStr = nextMonth < 10 ? `0${nextMonth}` : `${nextMonth}`;
        dateRange.before = `${year}/${nextMonthStr}/01`;
      }
      
      cleanQuery = query.replace(monthMatch[0], '').trim();
    }
  }
  
  return { dateRange, cleanQuery };
}

// Add this CSS at the top of your file or in a separate CSS module

// Add this helper function to generate unique keys for links
const generateUniqueLinkKey = (href: string, index: number): string => {
  if (!href) return `link-${index}`;
  return `link-${href}-${index}`;
};

// Add this to track link indices
let linkCounter = 0;

// Add this function to detect calendar-related queries
const shouldFetchCalendar = (query: string): boolean => {
  const calendarKeywords = [
    'schedule',
    'calendar',
    'event',
    'meeting',
    'appointment',
    'agenda',
    'what do i have',
    'what\'s on my calendar',
    'what is on my calendar',
    'what am i doing',
    'what\'s happening',
    'what is happening'
  ];
  
  const timeKeywords = [
    'today',
    'tomorrow',
    'this week',
    'next week',
    'this month',
    'upcoming'
  ];
  
  // Check if the query contains calendar-related keywords
  const hasCalendarKeyword = calendarKeywords.some(keyword => 
    query.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Check if the query contains time-related keywords
  const hasTimeKeyword = timeKeywords.some(keyword => 
    query.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Return true if the query contains both calendar and time keywords
  return hasCalendarKeyword && hasTimeKeyword;
};

// Add this function to determine the time range for calendar queries
const getCalendarTimeRange = (query: string): string => {
  const query_lower = query.toLowerCase();
  
  if (query_lower.includes('today')) {
    return 'today';
  } else if (query_lower.includes('tomorrow')) {
    return 'tomorrow';
  } else if (query_lower.includes('this week') || query_lower.includes('upcoming')) {
    return 'week';
  } else if (query_lower.includes('next week')) {
    return 'nextWeek';
  } else if (query_lower.includes('this month')) {
    return 'month';
  } else {
    // Default to week if no specific time range is mentioned
    return 'week';
  }
};

// Add this function to check if calendar access is available
const hasCalendarAccess = (tokens: any): boolean => {
  if (!tokens) return false;
  
  // Check if the token's scope includes calendar access
  const scope = tokens.scope || '';
  return scope.includes('https://www.googleapis.com/auth/calendar.readonly');
};

// Add this function to handle reconnecting Gmail with calendar permissions
const handleReconnectGmail = async () => {
  try {
    const response = await fetch('/api/gmail/auth');
    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Failed to get auth URL:', error);
  }
};

// Add this function to detect email commands
const isEmailCommand = (text: string): boolean => {
  const lowercaseText = text.toLowerCase();
  
  return lowercaseText.includes('send an email') || 
         lowercaseText.includes('send email') || 
         lowercaseText.includes('email to') ||
         (lowercaseText.includes('email') && lowercaseText.includes('send'));
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
  const [searchDateRange, setSearchDateRange] = useState<any>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  const inputRef = useRef<HTMLInputElement>(null);
  const [emailDraft, setEmailDraft] = useState<{
    to: string;
    subject: string;
    body: string;
    draftId?: string;
  } | null>(null);

  useEffect(() => {
    // Load messages and other initializations
    // The key check below is being removed
    // const apiKey = localStorage.getItem("openai_api_key");
    // if (!apiKey) {
    //   window.location.href = "/playground/keys";
    // }
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
    cache: EmailCache | null,
    currentDateRange: any
  ): boolean => {
    if (!isEmailCacheValid(cache)) return false;

    // If the date ranges are different, don't use cache
    if (currentDateRange && cache?.dateRange) {
      const cacheAfter = cache.dateRange.after;
      const cacheBefore = cache.dateRange.before;
      const currentAfter = currentDateRange.after;
      const currentBefore = currentDateRange.before;
      
      if (cacheAfter !== currentAfter || cacheBefore !== currentBefore) {
        return false;
      }
    }

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

    // Remove API key check
    // const apiKey = localStorage.getItem("openai_api_key");
    // if (!apiKey) {
    //   window.location.href = "/playground/keys";
    //   return;
    // }

    const newMessage: Message = {
      text: inputMessage,
      isUser: true,
      // timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsLoading(true);
    
    // Clear email results only if this is not an email command
    // This way we keep the relevant emails displayed for regular searches
    // but hide them for email sending commands
    if (!isEmailCommand(inputMessage)) {
      setFoundEmails([]);
    }

    try {
      let emailContext = null;
      let calendarContext = null;

      // Check if this is a calendar query but we don't have calendar access
      if (shouldFetchCalendar(inputMessage) && gmailTokens && !hasCalendarAccess(gmailTokens)) {
        setMessages((prev) => [
          ...prev,
          {
            text: inputMessage,
            isUser: true,
          },
          {
            text: "I need access to your Google Calendar to answer this question. Please reconnect your Gmail account with calendar permissions.",
            isUser: false,
          }
        ]);
        return;
      }

      // Check if we should search emails, but only if this is NOT an email command
      const tokens = localStorage.getItem("gmail_tokens");
      if (tokens && !isEmailCommand(inputMessage)) {
        // Check for calendar-related queries
        if (shouldFetchCalendar(inputMessage)) {
          try {
            const timeRange = getCalendarTimeRange(inputMessage);
            const calendarResponse = await fetch("/api/calendar/events", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                tokens: JSON.parse(tokens),
                timeRange: timeRange,
              }),
            });

            if (calendarResponse.ok) {
              const calendarData = await calendarResponse.json();
              calendarContext = calendarData.events;
            } else {
              const errorData = await calendarResponse.json();
              
              // If we need to reconnect for calendar access
              if (calendarResponse.status === 403 && errorData.needsReconnect) {
                setMessages((prev) => [
                  ...prev,
                  {
                    text: "I need access to your Google Calendar to answer this question. Please reconnect your Gmail account with calendar permissions using the button above.",
                    isUser: false,
                  }
                ]);
                setIsLoading(false);
                return;
              }
            }
          } catch (error) {
            console.error("Error fetching calendar events:", error);
          }
        }

        // Existing email search logic
        if (shouldSearchEmails(inputMessage)) {
          // Extract date range from query if present
          const dateInfo = extractDateRangeFromQuery(inputMessage);
          const searchQuery = dateInfo ? dateInfo.cleanQuery : inputMessage;
          const dateRange = dateInfo ? dateInfo.dateRange : null;
          
          // Check if we can use cached results
          if (shouldUseCachedEmails(searchQuery, emailCache, dateRange)) {
            console.log("Using cached email results");
            setFoundEmails(emailCache!.emails);
            setSearchDateRange(emailCache!.dateRange);
            emailContext = emailCache!.emails;
          } else {
            setIsSearchingEmails(true);
            setLastSearchQuery(searchQuery);

            const gmailResponse = await fetch("/api/gmail/search", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: searchQuery,
                tokens: JSON.parse(tokens),
                dateRange: dateRange
              }),
            });

            if (gmailResponse.ok) {
              const emailData = await gmailResponse.json();
              // Store the date range used for the search
              setSearchDateRange(emailData.dateRange);
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
                  relevanceScore: email.relevanceScore
                };
              });

              if (formattedEmails.length > 0) {
                // Update cache with new results
                setEmailCache({
                  emails: formattedEmails,
                  lastUpdated: new Date(),
                  searchQuery: searchQuery,
                  dateRange: emailData.dateRange
                });
                setFoundEmails(formattedEmails);
                emailContext = formattedEmails;
              }
            }
            setIsSearchingEmails(false);
          }
        }
      }

      // Make the chat API call with user message, email context, and calendar context
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
          calendarData: calendarContext, // Pass calendar events as separate data
          model,
          temperature,
          systemPrompt,
          gmailTokens: tokens ? JSON.parse(tokens) : null, // Pass Gmail tokens for email sending
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

      // Flag to track if memory was updated
      let memoryUpdated = false;

      if (data.memories && data.memories.length > 0) {
        memoryUpdated = true;
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
          hasMemory: memoryUpdated
        },
      ]);

      // Check if there's an email draft
      if (data.emailDraft) {
        setEmailDraft(data.emailDraft);
      }
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
      const response = await fetch("/api/messages/clear", {
        method: "DELETE",
      });
      if (response.ok) {
        setMessages([]);
        // Clear email-related states
        setFoundEmails([]);
        setLastSearchQuery("");
        setIsSearchingEmails(false);
        setEmailCache(null);
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error("Failed to clear messages:", error);
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

  const handleSendDraft = async () => {
    if (!emailDraft?.draftId) {
      throw new Error('No draft ID available');
    }

    const tokens = localStorage.getItem("gmail_tokens");
    if (!tokens) {
      throw new Error('Gmail not connected');
    }

    const response = await fetch('/api/gmail/draft/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        draftId: emailDraft.draftId,
        tokens: JSON.parse(tokens)
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    // Close the draft preview
    setEmailDraft(null);

    // Add a confirmation message
    setMessages((prev) => [
      ...prev,
      {
        text: `Email to ${emailDraft.to} has been sent successfully.`,
        isUser: false,
        // timestamp: new Date(),
      },
    ]);
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
            
            {/* Calendar access warning */}
            {isGmailConnected && gmailTokens && !hasCalendarAccess(gmailTokens) && (
              <div className="bg-yellow-600/20 text-yellow-200 px-4 py-2 text-sm flex items-center justify-between">
                <span>Calendar access is required for schedule-related queries.</span>
                <button 
                  onClick={handleReconnectGmail}
                  className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-500 transition-colors"
                >
                  Reconnect Gmail
                </button>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-container">
              {messages.length === 0 && !isLoading && (
                <div className="flex items-center justify-center h-full text-center px-4">
                  
                  {!isGmailConnected && (
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6 max-w-lg mb-8">
                      <h3 className="text-xl font-medium mb-3 text-blue-300">Connect Gmail</h3>
                      <p className="text-white/80 mb-4">
                        Connect your Gmail account to enable email search, draft creation, and sending functionality.
                      </p>
                      <button
                        onClick={async () => {
                          const response = await fetch("/api/gmail/auth");
                          const { url } = await response.json();
                          window.location.href = url;
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Connect Gmail
                      </button>
                    </div>
                  )}
                  
                  {/* Email Summary Dashboard - only show if Gmail is connected */}
                  {isGmailConnected && (
                    <EmailSummaryDashboard tokens={gmailTokens ? JSON.stringify(gmailTokens) : null} />
                  )}
                </div>
              )}

              {messages.length > 0 && (
                messages.map((message, index) => {
                  // Reset link counter for each message
                  linkCounter = 0;
                  
                  return (
                    <div
                      key={index}
                      className={`flex ${
                        message.isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 space-y-4 ${
                          message.isUser
                            ? "bg-zinc-800 text-white"
                            : "bg-zinc-900 text-gray-100"
                        }`}
                      >
                        {/* Memory indicator
                        {!message.isUser && message.hasMemory && (
                          <div className="flex items-center gap-1.5 text-xs text-purple-400 mb-1.5 bg-purple-900/20 py-1 px-2 rounded-md w-fit">
                            <Brain size={14} className="text-purple-300" />
                            <span className="tracking-tight">Memory updated</span>
                          </div>
                        )} */}
                        
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                                {children}
                              </p>
                            ),
                            h1: ({ children }) => (
                              <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-lg font-semibold mb-2 mt-3">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-base font-medium mb-1 mt-2">{children}</h3>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-none space-y-1 my-2">{children}</ul>
                            ),
                            li: ({ children }) => (
                              <li className="flex items-start space-x-2">
                                <span className="mt-1">•</span>
                                <span>{children}</span>
                              </li>
                            ),
                            hr: () => <hr className="my-3 border-zinc-700" />,
                            strong: ({ children }) => (
                              <strong className="font-semibold text-white">{children}</strong>
                            ),
                            a: ({ href, children }) => {
                              if (!href) return null;
                              
                              // Generate a unique key for this link
                              const linkKey = `link-${href}-${linkCounter++}`;
                              
                              // Render the link inline with any text
                              return (
                                <span key={linkKey} className="inline-flex items-center gap-1">
                                  {children}
                                  <a
                                    href={getGmailUrl(href)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center hover:bg-zinc-800 rounded transition-colors"
                                    title="Open in Gmail"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
                                  </a>
                                </span>
                              );
                            },
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-4">
                                <table className="min-w-full divide-y divide-zinc-700">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="px-3 py-2 text-left text-sm font-medium text-zinc-300 bg-zinc-800">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="px-3 py-2 text-sm text-zinc-400 border-t border-zinc-700">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Email Search Results */}
              {(isSearchingEmails || foundEmails.length > 0) && !emailDraft && (
                <EmailSearchResults
                  isSearching={isSearchingEmails}
                  searchQuery={lastSearchQuery}
                  emails={foundEmails}
                  onEmailClick={handleEmailClick}
                  dateRange={searchDateRange}
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
            {emailDraft && (
              <EmailDraftPreview
                draft={emailDraft}
                onClose={() => setEmailDraft(null)}
                onSend={handleSendDraft}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
