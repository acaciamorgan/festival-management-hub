import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const passwordResetTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Reset your Callsheet password</title>
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
                Reset your Callsheet password
              </h1>
              <p style="margin:0 0 15px; font-size:16px; line-height:1.5; color:#444;">
                Callsheet is the communications backbone of the Chicago International Film Festival, powered by <a href="https://www.acaciaconsultinggroup.com" style="color:#4F46E5; text-decoration:none;">Acacia</a>. Here, you will see detailed information about each title screening during the Festival, as well as information that pertains to your work with the Festival including filmmaker attendance, screening schedules, special events, and more.
              </p>
              <p style="margin:0 0 30px; font-size:16px; line-height:1.5; color:#444;">
                Reset your Callsheet password at this link:
              </p>
              <!-- CTA button -->
              <table cellspacing="0" cellpadding="0" align="center" style="margin:0 0 30px;">
                <tr>
                  <td bgcolor="#4F46E5" style="border-radius:6px;">
                    <a href="{{RESET_URL}}" target="_blank" style="display:inline-block; padding:14px 28px; font-size:16px; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:6px;">
                      Reset My Password
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
    const { email, redirectTo } = await req.json()

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Generate password reset link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo || 'https://callsheet.acaciaconsultinggroup.com/auth/reset-password'
      }
    })

    if (error) {
      console.error('Password reset error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send custom email using your email service (Gmail API or SMTP)
    // For now, return the link so you can set up the email template in Supabase dashboard
    const resetUrl = data.properties?.action_link || ''
    const emailHtml = passwordResetTemplate.replace('{{RESET_URL}}', resetUrl)

    // TODO: Send via your email service (Gmail API)
    // For now, use Supabase's built-in reset (will use default template)
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || 'https://callsheet.acaciaconsultinggroup.com/auth/reset-password'
    })

    if (resetError) {
      return new Response(
        JSON.stringify({ error: resetError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset email sent successfully',
        template: emailHtml // Return template for you to copy to Supabase dashboard
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})