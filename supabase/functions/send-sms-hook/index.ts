import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
      },
    })
  }

  try {
    const payload = await req.json()
    const { user, sms } = payload

    const phone = (user?.phone || '').replace('+', '')
    const otp = sms?.otp

    if (!phone || !otp) {
      console.error('Missing phone or OTP:', { phone: !!phone, otp: !!otp })
      return new Response(
        JSON.stringify({ error: { http_code: 400, message: 'Missing phone or OTP' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch dynamic template
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: template } = await supabase
      .from('sms_templates')
      .select('message')
      .eq('slug', 'otp_signup')
      .single()

    let message: string
    if (template?.message) {
      message = template.message.replace(/\{otp\}/g, otp)
    } else {
      message = `GoodyHut OTP is ${otp}. Valid for 5 minutes.`
    }

    const apiKey = Deno.env.get('BULKSMSBD_API_KEY')!
    const senderId = Deno.env.get('BULKSMSBD_SENDER_ID')!

    const smsUrl = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${phone}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`

    console.log('Sending SMS to:', phone)
    const smsResponse = await fetch(smsUrl)
    const smsText = await smsResponse.text()
    console.log('BulkSMSBD response:', smsText)

    return new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-sms-hook error:', error)
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: error.message } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
