import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  if (cleaned.startsWith('+880')) cleaned = cleaned.slice(1)
  else if (cleaned.startsWith('0')) cleaned = '880' + cleaned.slice(1)
  else if (!cleaned.startsWith('880')) cleaned = '880' + cleaned
  return cleaned
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phone, purpose } = await req.json()

    if (!phone || !purpose || !['signup', 'reset'].includes(purpose)) {
      return new Response(JSON.stringify({ error: 'Invalid phone or purpose' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const normalizedPhone = normalizePhone(phone)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // For signup: check if phone already exists in profiles
    if (purpose === 'signup') {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle()

      if (existing) {
        return new Response(JSON.stringify({
          error: 'phone_exists',
          message: 'এই ফোন নাম্বার দিয়ে আগেই একাউন্ট আছে। পাসওয়ার্ড রিসেট করে লগইন করুন।'
        }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // For reset: check if phone exists
    if (purpose === 'reset') {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle()

      if (!existing) {
        return new Response(JSON.stringify({
          error: 'phone_not_found',
          message: 'এই ফোন নাম্বারে কোনো একাউন্ট নেই।'
        }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Delete old OTPs for this phone+purpose
    await supabase.from('otp_codes').delete().eq('phone', normalizedPhone).eq('purpose', purpose)

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))

    // Store OTP
    await supabase.from('otp_codes').insert({
      phone: normalizedPhone,
      otp_code: otp,
      purpose,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    // Fetch dynamic SMS template
    const templateSlug = purpose === 'signup' ? 'otp_signup' : 'otp_reset'
    const { data: template } = await supabase
      .from('sms_templates')
      .select('message')
      .eq('slug', templateSlug)
      .single()

    // Use template if available, fallback to hardcoded
    let message: string
    if (template?.message) {
      message = template.message.replace(/\{otp\}/g, otp)
    } else {
      message = `GoodyHut OTP is ${otp}. Valid for 5 minutes.`
    }

    // Send SMS via BulkSMSBD
    const apiKey = Deno.env.get('BULKSMSBD_API_KEY')!
    const senderId = Deno.env.get('BULKSMSBD_SENDER_ID')!

    const smsUrl = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${normalizedPhone}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`

    const smsResponse = await fetch(smsUrl)
    const smsText = await smsResponse.text()

    console.log('BulkSMSBD response:', smsText)

    return new Response(JSON.stringify({ success: true, message: 'OTP sent successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('send-otp error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
