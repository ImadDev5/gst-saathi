'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, KeyRound, ArrowRight } from 'lucide-react'

interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (!isOpen) return null

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/v1/auth/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      })

      const json = await res.json()

      if (json.success) {
        // Close modal and redirect to appropriate dashboard
        onClose()
        router.push(json.redirect || '/dashboard')
        router.refresh()
      } else {
        setError(json.error || 'Invalid token')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-gray-950 border border-gray-800 rounded-2xl p-8 shadow-2xl shadow-cyan-500/10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <KeyRound className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="font-mono text-2xl tracking-tight">
            GST<span className="text-cyan-400">Saathi</span>{' '}
            <span className="text-sm text-gray-500 font-normal">Sign In</span>
          </h2>
          <p className="mt-2 text-gray-400 text-sm">
            Enter your access token to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleValidate} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Your access token"
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500 focus:outline-none font-mono pr-12"
              autoFocus
            />
            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Validating...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-gray-600">
            Don&apos;t have a token?{' '}
            <button 
              onClick={() => { onClose(); window.location.href = '/#contact'; }}
              className="text-cyan-400 hover:underline"
            >
              Request access
            </button>
          </p>
          <p className="text-xs text-gray-600">
            Admin?{' '}
            <a href="/admin/signin" className="text-amber-400 hover:underline">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
