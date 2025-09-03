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
  <title>{{EMAIL_TITLE}}</title>
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
                {{EMAIL_HEADER}}
              </h1>
              <p style="margin:0 0 15px; font-size:16px; line-height:1.5; color:#444;">
                Callsheet is the communications backbone of the Chicago International Film Festival, powered by <a href="https://www.acaciaconsultinggroup.com" style="color:#4F46E5; text-decoration:none;">Acacia</a>. Here, you will see detailed information about each title screening during the Festival, as well as information that pertains to your work with the Festival including filmmaker attendance, screening schedules, special events, and more.
              </p>
              <p style="margin:0 0 15px; font-size:16px; line-height:1.5; color:#444;">
                Your login credentials are:
              </p>
              <div style="background:#f8f9fa; border:1px solid #dee2e6; border-radius:6px; padding:20px; margin:0 0 20px;">
                <p style="margin:0 0 10px; font-size:14px; color:#666;"><strong>Email:</strong> {{USER_EMAIL}}</p>
                <p style="margin:0; font-size:14px; color:#666;"><strong>Temporary Password:</strong> <code style="background:#e9ecef; padding:2px 6px; border-radius:3px; font-family:monospace;">{{TEMP_PASSWORD}}</code></p>
              </div>
              <p style="margin:0 0 30px; font-size:16px; line-height:1.5; color:#444;">
                {{LOGIN_INSTRUCTION}}
              </p>
              <!-- CTA button -->
              <table cellspacing="0" cellpadding="0" align="center" style="margin:0 0 30px;">
                <tr>
                  <td bgcolor="#4F46E5" style="border-radius:6px;">
                    <a href="{{LOGIN_URL}}" target="_blank" style="display:inline-block; padding:14px 28px; font-size:16px; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:6px;">
                      {{BUTTON_TEXT}}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 15px; font-size:14px; line-height:1.5; color:#666;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <span style="color:#4F46E5; word-break:break-all;">{{LOGIN_URL}}</span>
              </p>
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
    const { to, subject, tempPassword, loginUrl, type } = await req.json()

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
      sub: 'morgan@teamacacia.com', // Impersonate this user for SENDING only
      scope: 'https://www.googleapis.com/auth/gmail.send',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    }

    const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/]/g, (m) => ({'+': '-', '/': '_'}[m] as string)).replace(/=/g, '')
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/]/g, (m) => ({'+': '-', '/': '_'}[m] as string)).replace(/=/g, '')

    // Import private key and sign
    // Remove PEM headers/footers and decode base64
    const pemKey = privateKey.replace(/-----BEGIN PRIVATE KEY-----|\-----END PRIVATE KEY-----|\n|\r/g, '')
    const keyBuffer = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0))
    
    const key = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
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

    // Prepare email content with template replacements
    let htmlContent = emailTemplate
    
    if (type === 'password_reset') {
      htmlContent = htmlContent
        .replaceAll('{{EMAIL_TITLE}}', 'Reset your Callsheet password')
        .replaceAll('{{EMAIL_HEADER}}', 'Reset your Callsheet password')
        .replaceAll('{{LOGIN_INSTRUCTION}}', 'Use your temporary password below to log in, then you will be prompted to create a new password.')
        .replaceAll('{{BUTTON_TEXT}}', 'Login to Reset Password')
    } else if (type === 'invite_with_password') {
      htmlContent = htmlContent
        .replaceAll('{{EMAIL_TITLE}}', 'Callsheet Access Reminder')
        .replaceAll('{{EMAIL_HEADER}}', 'Callsheet Access Reminder')
        .replaceAll('{{LOGIN_INSTRUCTION}}', 'Here are your updated login credentials. You will be prompted to change your password on login.')
        .replaceAll('{{BUTTON_TEXT}}', 'Login to Callsheet')
    } else {
      htmlContent = htmlContent
        .replaceAll('{{EMAIL_TITLE}}', 'Welcome to Callsheet')
        .replaceAll('{{EMAIL_HEADER}}', 'Welcome to Callsheet!')
        .replaceAll('{{LOGIN_INSTRUCTION}}', 'Use the credentials below to log in. You will be prompted to change your password on first login.')
        .replaceAll('{{BUTTON_TEXT}}', 'Login to Callsheet')
    }
    
    htmlContent = htmlContent
      .replaceAll('{{USER_EMAIL}}', to)
      .replaceAll('{{TEMP_PASSWORD}}', tempPassword)
      .replaceAll('{{LOGIN_URL}}', loginUrl)

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
      console.error('Gmail API Error Details:', {
        status: gmailResponse.status,
        statusText: gmailResponse.statusText,
        data: gmailData
      })
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