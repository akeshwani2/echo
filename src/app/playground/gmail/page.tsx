"use client";
import {
  AlertCircleIcon,
  CheckIcon,
  DollarSignIcon,
  ExternalLinkIcon,
  KeyIcon,
  Mail,
  ShieldIcon,
  XIcon,
} from "lucide-react";
import React, { useState, useEffect } from "react";

function page() {
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [gmailTokens, setGmailTokens] = useState<any>(null);

  // Add useEffect to check Gmail connection status on component mount
  useEffect(() => {
    // Check if Gmail tokens exist in localStorage
    const tokens = localStorage.getItem("gmail_tokens");
    if (tokens) {
      setGmailTokens(JSON.parse(tokens));
      setIsGmailConnected(true);
    }

    // Check for tokens in URL after OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const urlTokens = urlParams.get("tokens");
    if (urlTokens) {
      localStorage.setItem("gmail_tokens", urlTokens);
      setGmailTokens(JSON.parse(urlTokens));
      setIsGmailConnected(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    //     <div>
    //       <div className="border border-white mt-4 ml-10 rounded-lg">
    //       <div className="tracking-tight text-3xl p-4 flex items-center gap-2 justify-center">
    //         <Mail className="w-10 h-10 text-green-500" />
    //         Gmail Integration
    //       </div>
    //       <div className="flex items-center justify-between mb-2 p-4">
    //         <label className="text-zinc-400 text-sm">Gmail Integration</label>
    //         <button
    //           onClick={async () => {
    //             const response = await fetch("/api/gmail/auth");
    //             const { url } = await response.json();
    //             window.location.href = url;
    //           }}
    //           className={`text-xs px-2 py-1 rounded-lg transition-all ${
    //             isGmailConnected
    //               ? "bg-green-600 text-white"
    //               : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
    //           }`}
    //         >
    //           {isGmailConnected ? "Gmail Connected" : "Connect Gmail"}
    //         </button>
    //       </div>
    //       </div>
    //     </div>
    //   );
    // }
    <div className="min-h-screen bg-black text-white p-8 tracking-tight">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Mail className="w-10 h-10 text-green-500" />
          <h1 className="text-2xl font-medium">Gmail Integration</h1>
        </div>

        {/* Main Key Section */}
        <div className="bg-zinc-900/50 rounded-xl p-8 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-medium mb-4">
                Gmail Connection Status
              </h2>
              <div className="flex items-center justify-between">
                <button
                  onClick={async () => {
                    const response = await fetch("/api/gmail/auth");
                    const { url } = await response.json();
                    window.location.href = url;
                  }}
                  className={`text-xs px-2 py-1 rounded-lg transition-all ${
                    isGmailConnected
                      ? "bg-green-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {isGmailConnected ? "Gmail Connected" : "Connect Gmail"}
                </button>
              </div>
            </div>
          </div>
        </div>        
      </div>
    </div>
  );
}

export default page;
