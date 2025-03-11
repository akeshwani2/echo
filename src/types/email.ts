export interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
}

export interface EmailSearchResult {
  isSearching: boolean;
  searchQuery: string;
  emails: Email[];
  onEmailClick: (email: Email) => void;
} 