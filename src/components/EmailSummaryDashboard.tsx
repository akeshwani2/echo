import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Calendar, CheckSquare, Clock, ExternalLink, Inbox, Mail } from 'lucide-react';
import { Email } from '@/types/email';

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

export default function EmailSummaryDashboard({ tokens }: EmailSummaryDashboardProps) {
  const [summary, setSummary] = useState<EmailSummary>({
    immediateAction: [],
    mediumPriority: [],
    other: [],
    isLoading: false
  });

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
        
        setSummary({
          immediateAction: immediateActionEmails,
          mediumPriority: mediumPriorityEmails,
          other: otherEmails,
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
        <div className="bg-zinc-900/80 rounded-xl p-6 border border-zinc-800">
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center">
              <div className="flex space-x-2 mb-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
      className="w-full max-w-4xl"
    >
      <h3 className="text-xl tracking-tight text-zinc-400 mb-4 text-center">Your Email Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Immediate Action Emails */}
        {summary.immediateAction.length > 0 && (
          <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h4 className="text-lg text-white tracking-tight">Immediate Action</h4>
            </div>
            <div className="space-y-3">
              {summary.immediateAction.map((email) => (
                <a 
                  key={email.id} 
                  href={getGmailUrl(email.id)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-medium text-white line-clamp-1">{email.subject}</div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-1" />
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">{email.from}</div>
                  <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {email.date}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Medium Priority */}
        {summary.mediumPriority.length > 0 && (
          <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="w-5 h-5 text-yellow-400" />
              <h4 className="text-lg font-medium text-white">Medium Priority</h4>
            </div>
            <div className="space-y-3">
              {summary.mediumPriority.map((email) => (
                <a 
                  key={email.id} 
                  href={getGmailUrl(email.id)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-medium text-white line-clamp-1">{email.subject}</div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-1" />
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">{email.from}</div>
                  <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {email.date}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Other Emails */}
        {summary.other.length > 0 && (
          <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Inbox className="w-5 h-5 text-green-400" />
              <h4 className="text-lg font-medium text-white">Other</h4>
            </div>
            <div className="space-y-3">
              {summary.other.map((email) => (
                <a 
                  key={email.id} 
                  href={getGmailUrl(email.id)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-medium text-white line-clamp-1">{email.subject}</div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-1" />
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">{email.from}</div>
                  <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {email.date}
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