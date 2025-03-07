'use client'

import NavBar from '../components/NavBar'
import Footer from '../components/Footer'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white ">
      <NavBar />
      <main className="px-20 py-20 tracking-tighter">

        {/* Getting Started */}
        <section className="mb-20">
          <h2 className="text-2xl font-medium mb-2">Welcome to Echo</h2>
          <p className="text-neutral-400 text-lg mb-12 w-full">
            Echo is an AI memory system that helps create more personalized and contextual conversations. 
            It remembers important details from your chats and uses them to provide more relevant responses.
          </p>

          <div className="grid grid-cols-1 gap-8">
            <div className="p-8 rounded-xl border border-neutral-800/50 bg-neutral-900/20">
              <h3 className="text-xl font-medium">1. Set up your API key</h3>
              <p className="text-neutral-400 mb-6">First, you'll need to add your OpenAI API key to start using echo.</p>
              <code className="block bg-black p-4 rounded-lg text-neutral-300">
                Playground → Keys → Add OpenAI Key
              </code>
            </div>

            <div className="p-8 rounded-xl border border-neutral-800/50 bg-neutral-900/20">
              <h3 className="text-xl font-medium">2. Start a conversation</h3>
              <p className="text-neutral-400 mb-2">Begin chatting with echo. It will automatically start building memory from your conversations.</p>
              <ul className="space-y-3 text-neutral-400">
                <li>• Echo remembers context from previous messages</li>
                <li>• Information is stored securely and privately</li>
                <li>• Memory improves with more conversations</li>
              </ul>
            </div>

            <div className="p-8 rounded-xl border border-neutral-800/50 bg-neutral-900/20">
              <h3 className="text-xl font-medium">3. Customize your experience</h3>
              <p className="text-neutral-400 mb-2">Adjust settings to make echo work better for you:</p>
              <ul className="space-y-3 text-neutral-400">
                <li>• Set custom AI instructions</li>
                <li>• Adjust temperature settings</li>
                <li>• Manage conversation history</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Need Help? */}
      </main>
      <Footer />
    </div>
  )
}