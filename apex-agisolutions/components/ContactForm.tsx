'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactSchema, ContactFormData } from '@/lib/validators/contact'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

export default function ContactForm({ className = '' }: { className?: string }) {
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
    <Card className={`shadow-sm ${className}`}>
      <CardContent className="p-6 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 text-center">Request TaxApex Access</h2>
        
        {successMsg && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700 text-sm">{successMsg}</AlertDescription>
          </Alert>
        )}
        
        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-sm">{errorMsg}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-slate-500 text-xs font-medium">Company/Business Name *</Label>
            <Input 
              {...register('businessName')} 
              placeholder="Acme Corp"
              className="bg-white border-slate-200 mt-1"
            />
            {errors.businessName && <p className="text-red-600 text-xs mt-1">{errors.businessName.message}</p>}
          </div>

          <div>
            <Label className="text-slate-500 text-xs font-medium">Contact Name *</Label>
            <Input 
              {...register('name')} 
              placeholder="John Doe"
              className="bg-white border-slate-200 mt-1"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label className="text-slate-500 text-xs font-medium">Email *</Label>
            <Input 
              type="email"
              {...register('email')} 
              placeholder="john@example.com"
              className="bg-white border-slate-200 mt-1"
            />
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label className="text-slate-500 text-xs font-medium">Phone Number (10 digits) *</Label>
            <Input 
              type="tel"
              {...register('phone')} 
              placeholder="9876543210"
              className="bg-white border-slate-200 mt-1"
            />
            {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <Label className="text-slate-500 text-xs font-medium">GSTIN (Optional)</Label>
            <Input 
              {...register('gstin')} 
              placeholder="22AAAAA0000A1Z5"
              className="bg-white border-slate-200 mt-1"
            />
            {errors.gstin && <p className="text-red-600 text-xs mt-1">{errors.gstin.message}</p>}
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white hover:bg-slate-800 h-11"
          >
            {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}