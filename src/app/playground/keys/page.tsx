'use client'

import { useState, useEffect } from 'react'
import { KeyIcon, CheckIcon, XIcon, AlertCircleIcon, ExternalLinkIcon, ShieldIcon, DollarSignIcon } from 'lucide-react'

export default function KeysPage() {
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)

  useEffect(() => {
    const key = localStorage.getItem('openai_api_key')
    if (key) {
      setSavedKey(`sk-...${key.slice(-4)}`)
    }
  }, [])

  const validateAndSaveKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)
    setIsValid(null)

    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      if (response.ok) {
        localStorage.setItem('openai_api_key', apiKey)
        setSavedKey(`sk-...${apiKey.slice(-4)}`)
        setIsValid(true)
        setApiKey('')
        // Show success message
        setTimeout(() => setIsValid(null), 3000)
      } else {
        setIsValid(false)
      }
    } catch (error) {
      console.error('Error validating key:', error)
      setIsValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  const handleRemoveKey = () => {
    localStorage.removeItem('openai_api_key')
    setSavedKey(null)
    setApiKey('')
    setIsValid(null)
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 tracking-tight">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <KeyIcon className="w-8 h-8 text-purple-500" />
          <h1 className="text-2xl font-medium">API Configuration</h1>
        </div>

        {/* Main Key Section */}
        <div className="bg-zinc-900/50 rounded-xl p-8 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-medium mb-1">OpenAI API Key</h2>
              <p className="text-sm text-zinc-400">Required for Echo to communicate with OpenAI's API</p>
            </div>
            {savedKey && (
              <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-sm">
                <CheckIcon className="w-4 h-4" />
                <span>Active</span>
              </div>
            )}
          </div>
          
          <form onSubmit={validateAndSaveKey} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={savedKey ? '••••••••••••••••' : 'sk-...'}
                  disabled={savedKey !== null}
                  className={`w-full bg-black/50 text-white rounded-lg px-4 py-3 ring-1 
                    ${savedKey ? 'ring-green-500/50' : 
                      isValid === false ? 'ring-red-500/50' : 'ring-white/10'}
                    focus:ring-purple-500/50 transition-all focus:outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                {(savedKey || isValid !== null) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {(savedKey || isValid === true) ? (
                      <CheckIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <XIcon className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {isValid === false && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircleIcon className="w-4 h-4" />
                  <p>Invalid API key. Please check and try again.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={isValidating || !apiKey || savedKey !== null}
                className="bg-white text-black px-6 py-2 rounded-lg hover:bg-white/90 
                  transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  'Save Key'
                )}
              </button>
              
              {savedKey && (
                <button
                  onClick={handleRemoveKey}
                  className="text-red-500 hover:text-red-400 text-sm flex items-center gap-2 
                    transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                  Remove Key
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <ShieldIcon className="w-5 h-5 text-blue-500" />
              <h3 className="font-medium">Security</h3>
            </div>
            <p className="text-sm text-zinc-400">Your API key is stored locally and never sent to our servers. We only use it for OpenAI API requests.</p>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <DollarSignIcon className="w-5 h-5 text-green-500" />
              <h3 className="font-medium">Pricing</h3>
            </div>
            <p className="text-sm text-zinc-400">Usage is billed directly by OpenAI. Monitor your usage in the OpenAI dashboard.</p>
          </div>

          <div className="bg-zinc-900/50 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <KeyIcon className="w-5 h-5 text-purple-500" />
              <h3 className="font-medium">Get Started</h3>
            </div>
            <a 
              href="https://platform.openai.com/account/api-keys" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-purple-500 hover:text-purple-400 flex items-center gap-2 transition-colors"
            >
              Get your API key
              <ExternalLinkIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}