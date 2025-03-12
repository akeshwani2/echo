export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  html?: string;  // Optional HTML content
  type: 'meeting' | 'order' | 'travel' | 'document' | 'general';
  importance: 'high' | 'medium' | 'low';
  hasAttachments: boolean;
  labels: string[];
  relevanceScore?: number;
}

export interface EmailSearchResult {
  isSearching: boolean;
  searchQuery: string;
  emails: Email[];
  onEmailClick: (email: Email) => void;
  dateRange?: any; // Date range used for the search
} 

export const getGmailUrl = (emailId: string): string => {
  return `https://mail.google.com/mail/u/0/#search/rfc822msgid:${emailId}`;
};