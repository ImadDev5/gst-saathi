import { NextResponse } from 'next/server'
import { contactSchema } from '@/lib/validators/contact'
import { supabaseServer } from '@/lib/supabase/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Zod validation
    const parsedData = contactSchema.safeParse(body)
    
    if (!parsedData.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedData.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, phone, businessName, gstin } = parsedData.data

    // Rate Limiting goes here (Upstash setup later)
    // Duplicate email check
    const { data: existingContact } = await supabaseServer
      .from('contacts')
      .select('id')
      .eq('email', email)
      .single()

    if (existingContact) {
      return NextResponse.json(
        { error: 'You have already submitted an inquiry with this email.' },
        { status: 409 }
      )
    }

    // Insert into DB
    const { data, error } = await supabaseServer
      .from('contacts')
      .insert([
        {
          name,
          email,
          phone,
          business_name: businessName,
          gstin: gstin || null
        }
      ])
      .select('id')
      .single()

    if (error) {
      console.error('Supabase DB Insert Error:', error)
      return NextResponse.json(
        { error: 'Failed to save contact information.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Inquiry submitted successfully. We will reach out shortly!', id: data.id },
      { status: 201 }
    )

  } catch (err: unknown) {
    console.error('Contact endpoint error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred processing your request.' },
      { status: 500 }
    )
  }
}