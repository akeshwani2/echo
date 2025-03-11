"use client"
import React, { useState } from 'react'

function page() {
    const [isGmailConnected, setIsGmailConnected] = useState(false);
    const [gmailTokens, setGmailTokens] = useState<any>(null);
  return (
    <div>
    <div className="flex items-center justify-between mb-2">
      <label className="text-zinc-400 text-sm">Gmail Integration</label>
      <button 
        onClick={async () => {
          const response = await fetch('/api/gmail/auth');
          const { url } = await response.json();
          window.location.href = url;
        }}
        className={`text-xs px-2 py-1 rounded-lg transition-all ${
          isGmailConnected 
            ? 'bg-green-600 text-white' 
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
        }`}
      >
        {isGmailConnected ? 'Gmail Connected' : 'Connect Gmail'}
      </button>
    </div>
  </div>
  )
}

export default page