// src/components/GmailSearch.tsx
'use client';

import { useState } from 'react';

export default function GmailSearch() {
  const [query, setQuery] = useState('');
  const [maxResults, setMaxResults] = useState(20);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [results, setResults] = useState([]);

  const handleAuth = async () => {
    const response = await fetch('/api/gmail/auth');
    const { url } = await response.json();
    window.location.href = url;
  };

  const handleSearch = async () => {
    const response = await fetch('/api/gmail/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query,
        maxResults,
        unreadOnly
      }),
    });
    const data = await response.json();
    setResults(data.emails);
  };

  return (
    <div className="p-4">
      <button
        onClick={handleAuth}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Connect Gmail
      </button>
      
      <div className="mt-4 space-y-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emails..."
          className="border p-2 rounded w-full"
        />
        
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            placeholder="Max results"
            className="border p-2 rounded w-32"
          />
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="form-checkbox"
            />
            Unread Only
          </label>
        </div>

        <button
          onClick={handleSearch}
          className="bg-green-500 text-white px-4 py-2 rounded w-full"
        >
          Search
        </button>
      </div>

      <div className="mt-4">
        {results.map((email: any) => (
          <div key={email.id} className="border p-2 my-2 rounded">
            <h3>{email.snippet}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}