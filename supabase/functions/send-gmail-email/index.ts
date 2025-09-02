import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const emailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Register your Callsheet account</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, sans-serif; background-color:#f9f9f9;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f9f9f9">
    <tr>
      <td align="center" style="padding:40px 0;">
        <!-- Main container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:40px; text-align:left;">
              <h1 style="margin:0 0 20px; font-size:24px; color:#111;">
                Register your Callsheet account today!
              </h1>
              <p style="margin:0 0 15px; font-size:16px; line-height:1.5; color:#444;">
                Callsheet is the communications backbone of the Chicago International Film Festival, powered by <a href="https://www.acaciaconsultinggroup.com" style="color:#4F46E5; text-decoration:none;">Acacia</a>. Here, you will see detailed information about each title screening during the Festival, as well as information that pertains to your work with the Festival including filmmaker attendance, screening schedules, special events, and more.
              </p>
              <p style="margin:0 0 30px; font-size:16px; line-height:1.5; color:#444;">
                Follow this link to set up your account:
              </p>
              <!-- CTA button -->
              <table cellspacing="0" cellpadding="0" align="center" style="margin:0 0 30px;">
                <tr>
                  <td bgcolor="#4F46E5" style="border-radius:6px;">
                    <a href="{{SETUP_URL}}" target="_blank" style="display:inline-block; padding:14px 28px; font-size:16px; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:6px;">
                      Set Up My Account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0; font-size:16px; line-height:1.5; color:#444;">
                Thank you!
              </p>
            </td>
          </tr>
        </table>
        <!-- End container -->
      </td>
    </tr>
  </table>
</body>
</html>`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, setupUrl, type } = await req.json()

    // Get service account credentials
    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const privateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n')

    if (!serviceAccountEmail || !privateKey) {
      throw new Error('Gmail API credentials not configured')
    }

    // Create JWT for Gmail API
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/gmail.send',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    }

    const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/]/g, (m) => ({'+': '-', '/': '_'}[m] as string)).replace(/=/g, '')
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/]/g, (m) => ({'+': '-', '/': '_'}[m] as string)).replace(/=/g, '')

    // Import private key and sign
    const key = await crypto.subtle.importKey(
      'pkcs8',
      new TextEncoder().encode(privateKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    )

    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
      .replace(/[+/]/g, (m) => ({'+': '-', '/': '_'}[m] as string))
      .replace(/=/g, '')

    const jwt = `${encodedHeader}.${encodedPayload}.${signature}`

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    })

    const tokenData = await tokenResponse.json()
    if (!tokenData.access_token) {
      throw new Error('Failed to get access token: ' + JSON.stringify(tokenData))
    }

    // Prepare email content
    let htmlContent = emailTemplate
    if (type === 'password_reset') {
      htmlContent = htmlContent
        .replace('Register your Callsheet account today!', 'Reset your Callsheet password')
        .replace('Follow this link to set up your account:', 'Reset your Callsheet password at this link:')
        .replace('Set Up My Account', 'Reset My Password')
    }
    
    htmlContent = htmlContent.replace('{{SETUP_URL}}', setupUrl)

    // Create email message
    const emailContent = [
      `To: ${to}`,
      `From: Morgan Harris <morgan@teamacacia.com>`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlContent
    ].join('\r\n')

    const base64Email = btoa(emailContent)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    // Send email via Gmail API
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: base64Email })
    })

    const gmailData = await gmailResponse.json()
    
    if (!gmailResponse.ok) {
      throw new Error('Gmail API error: ' + JSON.stringify(gmailData))
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        messageId: gmailData.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Email function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})