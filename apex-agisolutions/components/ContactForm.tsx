'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactSchema, ContactFormData } from '@/lib/validators/contact'

export default function ContactForm() {
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema)
  })

  async function onSubmit(data: ContactFormData) {
    setSuccessMsg('')
    setErrorMsg('')
    
    try {
      const res = await fetch('/api/v1/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      const resData = await res.json()
      
      if (!res.ok) {
        setErrorMsg(resData.error || 'Something went wrong')
        return
      }
      
      setSuccessMsg(resData.message)
      reset()
    } catch {
      setErrorMsg('Failed to connect to the server')
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-charcoal rounded-xl shadow-lg border border-gray-800">
      <h2 className="text-2xl font-display text-white mb-6 text-center">Request GSTSaathi Access</h2>
      
      {successMsg && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 text-green-300 rounded">
          {successMsg}
        </div>
      )}
      
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 text-red-300 rounded">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-sans text-gray-300 mb-1">Company/Business Name *</label>
          <input 
            {...register('businessName')} 
            className="w-full p-2 bg-void border border-gray-700 rounded text-white focus:outline-none focus:border-cyan"
            placeholder="Acme Corp"
          />
          {errors.businessName && <p className="text-red-400 text-xs mt-1">{errors.businessName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-sans text-gray-300 mb-1">Contact Name *</label>
          <input 
            {...register('name')} 
            className="w-full p-2 bg-void border border-gray-700 rounded text-white focus:outline-none focus:border-cyan"
            placeholder="John Doe"
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-sans text-gray-300 mb-1">Email *</label>
          <input 
            type="email"
            {...register('email')} 
            className="w-full p-2 bg-void border border-gray-700 rounded text-white focus:outline-none focus:border-cyan"
            placeholder="john@example.com"
          />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-sans text-gray-300 mb-1">Phone Number (10 digits) *</label>
          <input 
            type="tel"
            {...register('phone')} 
            className="w-full p-2 bg-void border border-gray-700 rounded text-white focus:outline-none focus:border-cyan"
            placeholder="9876543210"
          />
          {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-sans text-gray-300 mb-1">GSTIN (Optional)</label>
          <input 
            {...register('gstin')} 
            className="w-full p-2 bg-void border border-gray-700 rounded text-white focus:outline-none focus:border-cyan"
            placeholder="22AAAAA0000A1Z5"
          />
          {errors.gstin && <p className="text-red-400 text-xs mt-1">{errors.gstin.message}</p>}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-cyan text-void font-bold rounded hover:bg-cyan-dim focus:outline-none disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
        </button>
      </form>
    </div>
  )
}