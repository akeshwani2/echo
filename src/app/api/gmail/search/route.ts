// src/app/api/gmail/search/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { gmail_v1 } from 'googleapis';

interface EmailHeader {
  name: string;
  value: string;
}

// Add interface for date range
interface DateRange {
  after?: string; // Format: YYYY/MM/DD
  before?: string; // Format: YYYY/MM/DD
}

function getOAuthClient(tokens: any): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

// Function to build Gmail search query with date filters
function buildSearchQuery(baseQuery: string, dateRange?: DateRange): string {
  let query = baseQuery;
  
  if (dateRange) {
    // Add after: filter if provided
    if (dateRange.after) {
      query += ` after:${dateRange.after.replace(/-/g, '/')}`;
    }
    
    // Add before: filter if provided
    if (dateRange.before) {
      query += ` before:${dateRange.before.replace(/-/g, '/')}`;
    }
  }
  
  return query.trim();
}

// Function to get default date range for current year
function getCurrentYearDateRange(): DateRange {
  const currentYear = new Date().getFullYear();
  return {
    after: `${currentYear}/01/01`,
    before: `${currentYear + 1}/01/01`
  };
}

// Function to calculate relevance score based on query and email content
function calculateRelevanceScore(query: string, email: any): number {
  // Clean and normalize the query
  const normalizedQuery = query.toLowerCase().trim();
  const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 2);
  if (queryTerms.length === 0) return 0;
  
  const subject = email.subject?.toLowerCase() || '';
  const body = email.body?.toLowerCase() || '';
  const snippet = email.snippet?.toLowerCase() || '';
  const from = email.from?.toLowerCase() || '';
  const labels = email.labels || [];
  
  let score = 0;
  
  // Handle queries specifically about emails from a person
  const isFromQuery = normalizedQuery.includes('from') || 
                      normalizedQuery.includes('emails from') || 
                      normalizedQuery.includes('any emails from') || 
                      normalizedQuery.includes('do i have') || 
                      normalizedQuery.startsWith('from:');
  
  // Extract potential name from query (after "from" or similar phrases)
  let personName = '';
  if (isFromQuery) {
    // Try to extract name after common patterns
    const fromPatterns = [
      /from\s+([a-z\s]+)/i,
      /emails\s+from\s+([a-z\s]+)/i,
      /email\s+from\s+([a-z\s]+)/i, 
      /do\s+i\s+have\s+any\s+emails\s+from\s+([a-z\s]+)/i
    ];
    
    for (const pattern of fromPatterns) {
      const match = normalizedQuery.match(pattern);
      if (match && match[1]) {
        personName = match[1].trim();
        break;
      }
    }
    
    // If we found a potential name, this becomes a very specific query
    if (personName) {
      // Direct match with sender name is highly relevant
      if (from.includes(personName)) {
        score += 100;
      } else {
        // If no match with the sender, this email is not relevant
        return 10; // Return a very low score
      }
    }
  }
  
  // Exact phrase match in key fields
  if (subject.includes(normalizedQuery) || 
      from.includes(normalizedQuery) || 
      body.includes(normalizedQuery)) {
    score += 100;
  }
  
  // Check for document signing and high-priority emails
  if (normalizedQuery.includes('document') || 
      normalizedQuery.includes('sign') || 
      normalizedQuery.includes('documenso')) {
    
    const signTerms = ['sign', 'documenso', 'document', 'signature', 'agreement', 'contract'];
    for (const term of signTerms) {
      if (subject.includes(term) || from.includes(term)) {
        score += 70;
      }
      if (body.includes(term) || snippet.includes(term)) {
        score += 30;
      }
    }
  }
  
  // For searches about specific people that aren't in a "from X" format
  for (const term of queryTerms) {
    if (term.length > 3 && from.includes(term)) {
      // If a significant word in the query matches the sender, likely they're looking for emails from this person
      score += 80;
    }
  }
  
  // Check for individual term matches (with less weight)
  for (const term of queryTerms) {
    if (subject.includes(term)) {
      score += 15;
    }
    if (snippet.includes(term)) {
      score += 8;
    }
    if (body.includes(term)) {
      score += 4;
    }
  }
  
  // Boost score for recent emails, but much less than before
  const emailDate = new Date(email.date);
  const now = new Date();
  const daysDifference = Math.floor((now.getTime() - emailDate.getTime()) / (1000 * 3600 * 24));
  
  if (daysDifference < 1) {
    score += 5; // Today
  } else if (daysDifference < 7) {
    score += 3; // This week
  }
  
  return score;
}

export async function POST(req: Request) {
  try {
    const { tokens, query, dateRange } = await req.json();
    const gmail = google.gmail({ version: 'v1', auth: getOAuthClient(tokens) });

    // Use provided date range or default to current year
    const searchDateRange = dateRange || getCurrentYearDateRange();
    
    // First, always fetch recent emails to ensure we have results
    // Apply date range to primary category search
    const primaryQuery = buildSearchQuery('category:primary', searchDateRange);
    const searchResponse = await gmail.users.messages.list({
      userId: 'me',
      q: primaryQuery,
      maxResults: 20, // Fetch 20 recent emails
    });

    if (!searchResponse.data.messages) {
      return NextResponse.json({ emails: [] });
    }

    // If we have a meaningful query, also try to search for it specifically
    let queryMessages: gmail_v1.Schema$Message[] = [];
    if (query && query.length > 3) {
      try {
        // Apply date range to specific query search
        const specificQuery = buildSearchQuery(query, searchDateRange);
        const queryResponse = await gmail.users.messages.list({
          userId: 'me',
          q: specificQuery,
          maxResults: 30, // Fetch up to 30 query-specific emails
        });
        
        if (queryResponse.data.messages) {
          queryMessages = queryResponse.data.messages;
        }
      } catch (error) {
        console.error('Query-specific search failed:', error);
        // Continue with just the recent emails
      }
    }

    // Combine and deduplicate message IDs
    const messageIds = new Set<string>();
    const allMessages: gmail_v1.Schema$Message[] = [];
    
    // Add recent messages first
    searchResponse.data.messages!.forEach(message => {
      if (message.id && !messageIds.has(message.id)) {
        messageIds.add(message.id);
        allMessages.push(message);
      }
    });
    
    // Then add query-specific messages
    queryMessages.forEach(message => {
      if (message.id && !messageIds.has(message.id)) {
        messageIds.add(message.id);
        allMessages.push(message);
      }
    });

    const emails = await Promise.all(
      allMessages.map(async (message) => {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });
        
        const headers = email.data.payload?.headers || [];
        const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';
        
        // Get the email body
        const body = email.data.payload?.parts?.[0]?.body?.data || 
                    email.data.payload?.body?.data;

        const decodedBody = body ? 
          Buffer.from(body, 'base64').toString('utf-8') : 
          '';

        // Enhanced metadata processing
        const subject = getHeader('Subject');
        const type = determineEmailType(subject, decodedBody);
        const importance = determineImportance(email.data.labelIds || [], subject);
        const hasAttachments = email.data.payload?.parts?.some(part => part.filename && part.filename.length > 0) || false;
        
        return {
          id: email.data.id,
          snippet: email.data.snippet,
          type,
          importance,
          hasAttachments,
          headers,
          date: getHeader('Date'),
          subject: subject,
          from: getHeader('From'),
          to: getHeader('To'),
          body: decodedBody,
          labels: email.data.labelIds || []
        };
      })
    );

    // Calculate relevance scores and sort emails
    const scoredEmails = emails.map(email => ({
      ...email,
      relevanceScore: calculateRelevanceScore(query, email)
    }));

    // Sort by relevance score (highest first)
    scoredEmails.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Helper function to determine email type
    function determineEmailType(subject: string, body: string): string {
      const lowerSubject = subject.toLowerCase();
      const lowerBody = body.toLowerCase();
      
      if (lowerSubject.includes('meeting') || lowerSubject.includes('invite') || 
          lowerBody.includes('zoom.us') || lowerBody.includes('meet.google.com')) {
        return 'meeting';
      }
      
      if (lowerSubject.includes('order') || lowerSubject.includes('shipping') || 
          lowerSubject.includes('tracking') || lowerSubject.includes('delivered')) {
        return 'order';
      }
      
      if (lowerSubject.includes('flight') || lowerSubject.includes('itinerary') || 
          lowerSubject.includes('booking') || lowerBody.includes('reservation')) {
        return 'travel';
      }
      
      if (lowerSubject.includes('document') || lowerSubject.includes('shared') || 
          lowerBody.includes('google doc') || lowerBody.includes('google sheet') ||
          lowerSubject.includes('sign') || lowerBody.includes('signature') ||
          lowerSubject.includes('contract') || lowerBody.includes('docusign')) {
        return 'document';
      }
      
      return 'general';
    }

    // Helper function to determine importance
    function determineImportance(labels: string[], subject: string): 'high' | 'medium' | 'low' {
      const lowerSubject = subject.toLowerCase();
      
      // Check for explicit importance markers
      if (labels.includes('IMPORTANT') || 
          lowerSubject.includes('urgent') || 
          lowerSubject.includes('asap') ||
          lowerSubject.includes('important')) {
        return 'high';
      }
      
      // Check for potential medium importance indicators
      if (labels.includes('CATEGORY_UPDATES') ||
          lowerSubject.includes('reminder') ||
          lowerSubject.includes('action required')) {
        return 'medium';
      }
      
      return 'low';
    }

    // Return emails along with the date range used
    return NextResponse.json({ 
      emails: scoredEmails,
      dateRange: searchDateRange
    });
  } catch (error) {
    console.error('Gmail search error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}