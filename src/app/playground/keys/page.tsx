'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RedirectPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to playground
    router.replace('/playground')
  }, [router])
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-medium mb-2">Redirecting...</h1>
        <p className="text-zinc-400">You are being redirected to the playground.</p>
      </div>
    </div>
  )
} 