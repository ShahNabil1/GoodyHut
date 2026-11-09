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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action } = body

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    if (!anonKey) {
      console.error('Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.includes('SUPABASE')))
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      anonKey
    )

    if (action === 'signup') {
      const { phone, password, full_name, otp } = body
      const normalizedPhone = normalizePhone(phone)

      // Verify OTP
      const { data: otpData } = await supabaseAdmin
        .from('otp_codes')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('otp_code', otp)
        .eq('purpose', 'signup')
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (!otpData) {
        return jsonResponse({ error: 'invalid_otp', message: 'ভুল বা মেয়াদোত্তীর্ণ OTP' }, 400)
      }

      // Mark OTP verified
      await supabaseAdmin.from('otp_codes').update({ verified: true }).eq('id', otpData.id)

      // Check phone not taken (double check)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle()

      if (existingProfile) {
        return jsonResponse({ error: 'phone_exists', message: 'এই নাম্বার দিয়ে আগেই একাউন্ট আছে' }, 409)
      }

      // Create user with fake email
      const fakeEmail = `${normalizedPhone}@phone.goodyhut.bd`

      const { data: authData, error: signupError } = await supabaseAdmin.auth.admin.createUser({
        email: fakeEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name, phone: normalizedPhone }
      })

      if (signupError) {
        console.error('Signup error:', signupError)
        return jsonResponse({ error: 'signup_failed', message: signupError.message }, 500)
      }

      // Update profile with phone
      await supabaseAdmin.from('profiles').update({
        full_name,
        phone: normalizedPhone,
      }).eq('id', authData.user.id)

      // Sign in to get session
      const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: fakeEmail,
        password,
      })

      if (signInError) {
        console.error('Post-signup sign-in error:', signInError)
        return jsonResponse({ error: 'signin_failed', message: 'একাউন্ট তৈরি হয়েছে, লগইন করুন' }, 500)
      }

      return jsonResponse({
        success: true,
        session: sessionData.session,
        user: sessionData.user,
      })

    } else if (action === 'login') {
      const { phone, password } = body
      const normalizedPhone = normalizePhone(phone)

      // Look up user by phone in profiles
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle()

      if (!profile) {
        return jsonResponse({ error: 'not_found', message: 'এই ফোন নাম্বারে কোনো একাউন্ট নেই' }, 404)
      }

      // Get user's email from auth
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      if (!userData?.user?.email) {
        return jsonResponse({ error: 'not_found', message: 'একাউন্ট পাওয়া যায়নি' }, 404)
      }

      // Sign in
      const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: userData.user.email,
        password,
      })

      if (signInError) {
        return jsonResponse({ error: 'invalid_credentials', message: 'ভুল পাসওয়ার্ড' }, 401)
      }

      return jsonResponse({
        success: true,
        session: sessionData.session,
        user: sessionData.user,
      })

    } else if (action === 'reset_password') {
      const { phone, otp, new_password } = body
      const normalizedPhone = normalizePhone(phone)

      // Verify OTP
      const { data: otpData } = await supabaseAdmin
        .from('otp_codes')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('otp_code', otp)
        .eq('purpose', 'reset')
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (!otpData) {
        return jsonResponse({ error: 'invalid_otp', message: 'ভুল বা মেয়াদোত্তীর্ণ OTP' }, 400)
      }

      // Mark OTP verified
      await supabaseAdmin.from('otp_codes').update({ verified: true }).eq('id', otpData.id)

      // Find user by phone
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle()

      if (!profile) {
        return jsonResponse({ error: 'not_found', message: 'একাউন্ট পাওয়া যায়নি' }, 404)
      }

      // Update password via admin
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        profile.id,
        { password: new_password }
      )

      if (updateError) {
        console.error('Password update error:', updateError)
        return jsonResponse({ error: 'update_failed', message: 'পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে' }, 500)
      }

      return jsonResponse({ success: true, message: 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে' })

    } else {
      return jsonResponse({ error: 'invalid_action' }, 400)
    }

  } catch (error) {
    console.error('phone-auth error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})
