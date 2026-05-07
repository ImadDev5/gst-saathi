'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LogoutButton({ collapsed }: { collapsed?: boolean }) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' })
      router.push('/')
      router.refresh()
    } catch {
      window.location.href = '/'
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-white/5 h-8 text-xs"
    >
      <LogOut className="w-3.5 h-3.5 mr-2" />
      Sign Out
    </Button>
  )
}