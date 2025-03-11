export interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  html?: string;  // Optional HTML content
}

export interface EmailSearchResult {
  isSearching: boolean;
  searchQuery: string;
  emails: Email[];
  onEmailClick: (email: Email) => void;
} 

export const getGmailUrl = (emailId: string): string => {
  return `https://mail.google.com/mail/u/0/#search/rfc822msgid:${emailId}`;
};