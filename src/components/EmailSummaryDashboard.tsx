import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Calendar, CheckSquare, Clock, ExternalLink, Inbox, Mail, ListTodo, RefreshCw } from 'lucide-react';
import { Email } from '@/types/email';
import { useUser } from "@clerk/nextjs";

interface EmailSummaryDashboardProps {
  tokens: string | null;
}

interface EmailSummary {
  immediateAction: Email[];
  mediumPriority: Email[];
  other: Email[];
  isLoading: boolean;
}

const getGmailUrl = (emailId: string): string => {
  // Remove any special characters and get just the message ID
  const cleanId = emailId.replace(/[<>]/g, '');
  return `https://mail.google.com/mail/u/0/#inbox/${cleanId}`;
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

export default function EmailSummaryDashboard({ tokens }: EmailSummaryDashboardProps) {
  const { isSignedIn, user } = useUser();
  const [summary, setSummary] = useState<EmailSummary>({
    immediateAction: [],
    mediumPriority: [],
    other: [],
    isLoading: false
  });
  
  const [parsedTokens, setParsedTokens] = useState<any>(null);
  
  useEffect(() => {
    if (tokens) {
      try {
        const parsed = JSON.parse(tokens);
        setParsedTokens(parsed);
      } catch (e) {
        console.error('Failed to parse tokens:', e);
      }
    }
  }, [tokens]);

  // Function to generate AI summary for an email
  const generateAISummary = async (email: Email): Promise<string> => {
    try {
      const response = await fetch('/api/gmail/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      
      const data = await response.json();
      return data.summary || email.subject;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      return email.subject; // Fallback to subject if summary generation fails
    }
  };

  // Function to generate summaries for a batch of emails
  const generateSummariesForEmails = async (emails: Email[]): Promise<Email[]> => {
    return Promise.all(
      emails.map(async (email) => {
        const emailWithLoading = {
          ...email,
          isSummaryLoading: true
        };
        
        const aiSummary = await generateAISummary(emailWithLoading);
        
        return {
          ...emailWithLoading,
          aiSummary,
          isSummaryLoading: false
        };
      })
    );
  };

  // Function to handle quick action clicks
  const handleQuickAction = (action: string) => {
    const messageElement = document.querySelector('textarea') || document.querySelector('input[type="text"]');
    if (messageElement) {
      const inputElement = messageElement as HTMLInputElement | HTMLTextAreaElement;
      
      if (action === 'summarize') {
        inputElement.value = "Summarize my recent emails";
      } else if (action === 'todo') {
        inputElement.value = "Create a to-do list from my urgent emails";
      }
      
      // Simulate Enter key press to send the message
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      inputElement.dispatchEvent(enterEvent);
    }
  };

  useEffect(() => {
    const fetchEmailSummary = async () => {
      if (!tokens) return;
      
      setSummary(prev => ({ ...prev, isLoading: true }));
      
      try {
        // Fetch immediate action emails (highest priority)
        const immediateActionResponse = await fetch('/api/gmail/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: JSON.parse(tokens),
            query: '(category:primary OR label:important) AND (is:important OR label:important OR subject:urgent OR subject:"action required" OR subject:"action needed" OR subject:"ASAP")',
            dateRange: { after: getDateString(7) } // Last 7 days
          })
        });
        
        // Fetch medium priority emails
        const mediumPriorityResponse = await fetch('/api/gmail/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: JSON.parse(tokens),
            query: '(category:primary OR label:important) AND (subject:"please review" OR subject:"approval needed" OR calendar invite OR meeting OR zoom OR google meet OR teams meeting)',
            dateRange: { after: getDateString(14) } // Last 14 days
          })
        });
        
        // Fetch other emails
        const otherResponse = await fetch('/api/gmail/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: JSON.parse(tokens),
            query: '(category:primary OR label:important) AND is:inbox',
            dateRange: { after: getDateString(3) } // Last 3 days
          })
        });
        
        const immediateActionData = await immediateActionResponse.json();
        const mediumPriorityData = await mediumPriorityResponse.json();
        const otherData = await otherResponse.json();
        
        // Format all emails
        const immediateActionEmails = formatEmails(immediateActionData.emails).slice(0, 3);
        const immediateActionIds = new Set(immediateActionEmails.map(email => email.id));
        
        // Filter out emails that are already in immediate action
        const mediumPriorityEmails = formatEmails(mediumPriorityData.emails)
          .filter(email => !immediateActionIds.has(email.id))
          .slice(0, 3);
        
        const mediumPriorityIds = new Set(mediumPriorityEmails.map(email => email.id));
        
        // Filter out emails that are in immediate action or medium priority
        const otherEmails = formatEmails(otherData.emails)
          .filter(email => !immediateActionIds.has(email.id) && !mediumPriorityIds.has(email.id))
          .slice(0, 3);
        
        // Generate AI summaries for all emails
        const immediateActionWithSummaries = await generateSummariesForEmails(immediateActionEmails);
        const mediumPriorityWithSummaries = await generateSummariesForEmails(mediumPriorityEmails);
        const otherWithSummaries = await generateSummariesForEmails(otherEmails);
        
        setSummary({
          immediateAction: immediateActionWithSummaries,
          mediumPriority: mediumPriorityWithSummaries,
          other: otherWithSummaries,
          isLoading: false
        });
      } catch (error) {
        console.error('Error fetching email summary:', error);
        setSummary(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    fetchEmailSummary();
  }, [tokens]);
  
  // Helper function to format date string for Gmail search
  const getDateString = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };
  
  // Helper function to format emails
  const formatEmails = (emails: any[]): Email[] => {
    if (!emails) return [];
    
    return emails.map(email => ({
      id: email.id,
      from: email.from?.split("<")[0]?.trim() || email.from,
      to: email.to || "",
      subject: email.subject || "",
      date: new Date(email.date).toLocaleString(),
      snippet: email.snippet || "",
      body: email.body || "",
      html: email.html || "",
      type: email.type || "general",
      importance: email.importance || "low",
      hasAttachments: email.hasAttachments || false,
      labels: email.labels || []
    }));
  };
  
  // Helper function to determine if a meeting is in the future
  const isFutureMeeting = (email: Email): boolean => {
    // Simple heuristic: check if the email contains future date indicators
    const emailText = `${email.subject} ${email.snippet}`.toLowerCase();
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const todayStr = today.toLocaleDateString();
    const tomorrowStr = tomorrow.toLocaleDateString();
    
    return emailText.includes('upcoming') || 
           emailText.includes('scheduled') || 
           emailText.includes('tomorrow') || 
           emailText.includes(tomorrowStr) ||
           (emailText.includes('today') && new Date(email.date).getDate() === today.getDate());
  };
  
  if (summary.isLoading) {
    return (
      <div className="w-full max-w-4xl">
        <div className="bg-black rounded-xl p-6 border border-zinc-800">
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center">
              <div className="flex space-x-2 mb-4">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-zinc-400">Loading your email summary...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // If no tokens or no emails found
  if (!tokens || (
    summary.immediateAction.length === 0 && 
    summary.mediumPriority.length === 0 && 
    summary.other.length === 0
  )) {
    return null;
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl mx-auto"
    >
      <h3 className="text-2xl tracking-tight text-zinc-400 mb-6 text-center">
        <span className="text-white">
          {isSignedIn ? (
            `Hello, ${
              user?.username || user?.firstName
                ? user?.username || user?.firstName
                : "there"
            }!`
          ) : (
            <>Your Email Summary</>
          )}
        </span>
      </h3>
      
      {/* Quick Actions Section */}
      
      
      {/* Calendar Access Section */}
      {parsedTokens && !hasCalendarAccess(parsedTokens) && (
        <div className="mb-6 bg-black rounded-xl p-5 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-white" />
            <h4 className="text-lg font-medium text-white">Calendar Access</h4>
          </div>
          <div className="flex flex-col space-y-4">
            <p className="text-zinc-400 text-sm">
              To enable calendar-related features like checking your schedule, please reconnect your Gmail account with calendar permissions.
            </p>
            <div>
              <button
                onClick={handleReconnectGmail}
                className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-zinc-800 transition-colors border border-zinc-700"
              >
                Connect Calendar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
        {/* Immediate Action Emails */}
        {summary.immediateAction.length > 0 && (
          <div className="bg-black rounded-xl p-5 border border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-white" />
              <h4 className="text-lg text-white tracking-tight font-medium">Immediate Action</h4>
            </div>
            <div className="space-y-4">
              {summary.immediateAction.map((email) => (
                <a 
                  key={email.id} 
                  href={getGmailUrl(email.id)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-white line-clamp-2 leading-snug">
                      {email.isSummaryLoading ? (
                        <span className="inline-flex items-center">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-2"></span>
                          {email.subject}
                        </span>
                      ) : (
                        <span className="text-white">{email.aiSummary || email.subject}</span>
                      )}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-1 ml-2" />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <div className="text-xs text-zinc-300">
                      {email.from}
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {email.date}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Medium Priority */}
        {summary.mediumPriority.length > 0 && (
          <div className="bg-black rounded-xl p-5 border border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare className="w-5 h-5 text-white" />
              <h4 className="text-lg font-medium text-white">Medium Priority</h4>
            </div>
            <div className="space-y-4">
              {summary.mediumPriority.map((email) => (
                <a 
                  key={email.id} 
                  href={getGmailUrl(email.id)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-white line-clamp-2 leading-snug">
                      {email.isSummaryLoading ? (
                        <span className="inline-flex items-center">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-2"></span>
                          {email.subject}
                        </span>
                      ) : (
                        <span className="text-white">{email.aiSummary || email.subject}</span>
                      )}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-1 ml-2" />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <div className="text-xs text-zinc-300">
                      {email.from}
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {email.date}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Other Emails */}
        {summary.other.length > 0 && (
          <div className="bg-black rounded-xl p-5 border border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
              <Inbox className="w-5 h-5 text-white" />
              <h4 className="text-lg font-medium text-white">Other</h4>
            </div>
            <div className="space-y-4">
              {summary.other.map((email) => (
                <a 
                  key={email.id} 
                  href={getGmailUrl(email.id)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-white line-clamp-2 leading-snug">
                      {email.isSummaryLoading ? (
                        <span className="inline-flex items-center">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-2"></span>
                          {email.subject}
                        </span>
                      ) : (
                        <span className="text-white">{email.aiSummary || email.subject}</span>
                      )}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-1 ml-2" />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <div className="text-xs text-zinc-300">
                      {email.from}
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {email.date}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}