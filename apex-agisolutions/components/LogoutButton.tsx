'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' })
      // Clear any client-side state
      router.push('/')
      router.refresh()
    } catch {
      // Fallback: just redirect
      window.location.href = '/'
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 w-full"
    >
      <LogOut size={12} />
      Sign Out
    </button>
  )
}
