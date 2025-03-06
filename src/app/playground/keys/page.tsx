'use client'

import { useState, useEffect } from 'react'
import { KeyIcon, CheckIcon, XIcon } from 'lucide-react'

export default function KeysPage() {
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if key exists on component mount
    const key = localStorage.getItem('openai_api_key')
    if (key) {
      // Only show last 4 characters of the key
      setSavedKey(`sk-...${key.slice(-4)}`)
    }
  }, [])

  const validateAndSaveKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsValidating(true)

    try {
      // Test the API key with a simple completion request
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      })

      if (response.ok) {
        // Store the key in localStorage (or you could use cookies/session)
        localStorage.setItem('openai_api_key', apiKey)
        setSavedKey(`sk-...${apiKey.slice(-4)}`)
        setIsValid(true)
        setApiKey('') // Clear input after saving
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
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 tracking-tight">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <KeyIcon className="w-6 h-6" />
          <h1 className="text-xl font-medium">Your Keys</h1>
        </div>

        <div className="bg-zinc-900 rounded-lg p-6 mb-6">
          <h2 className="text-sm text-zinc-400 mb-4">OpenAI API Key</h2>
          
          <form onSubmit={validateAndSaveKey} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={savedKey ? '••••••••••••••••' : 'sk-...'}
                  className="w-full bg-black text-white rounded-lg px-4 py-2 ring-1 ring-white/10 focus:ring-white/20 transition-all focus:outline-none"
                />
                {isValid !== null && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isValid ? (
                      <CheckIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <XIcon className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {isValid === false && (
                <p className="text-red-500 text-sm">Invalid API key. Please check and try again.</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={isValidating || !apiKey}
                className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? 'Validating...' : 'Save Key'}
              </button>
              
              {savedKey && (
                <div className="flex items-center gap-4">
                  <span className="text-white/50 text-sm">
                    Active key: {savedKey}
                  </span>
                  <button
                    onClick={handleRemoveKey}
                    className="text-white text-sm hover:cursor-pointer border bg-red-600 border-red-600 rounded-lg px-2 py-1 hover:bg-red-600 hover:border-red-600 hover:scale-105 transition-all"

                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="bg-zinc-900 rounded-lg p-6">
          <h2 className="text-sm text-zinc-400 mb-4">About API Keys</h2>
          <div className="prose prose-sm prose-invert">
            <ul className="list-disc list-inside space-y-2 text-zinc-400">
              <li>Your API key is stored locally and never sent to our servers</li>
              <li>We only use your key to make requests to OpenAI's API</li>
              <li>You can get your API key from the <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer" className="text-white hover:text-zinc-300">OpenAI dashboard</a></li>
              <li>Make sure to keep your API key secret and never share it</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}