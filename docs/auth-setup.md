# Wildball authentication activation

Code is implemented locally. Provider activation and email confirmation must
also be configured on the hosted Supabase project before deploying.

## Supabase

Project: `iuaadtiijverhgyqqzas`.

1. Authentication → URL Configuration: set Site URL to `https://wildball.io`.
2. Add these exact allowed redirect URLs:
   - `https://wildball.io/auth/callback`
   - `https://www.wildball.io/auth/callback`
   - `http://localhost:3000/auth/callback` (development only)
3. Authentication → Sign In / Providers → Email: enable Confirm email.
   Keep email signup enabled. Existing auto-confirmed accounts remain confirmed;
   this change requires confirmation for new email accounts.
4. Configure a production SMTP provider in Authentication → Email / SMTP.
   Supabase's default sender has delivery restrictions and is unsuitable for
   general public signup. Verify the sending domain and its SPF/DKIM records.
5. For email links that also work when opened on another device, set the
   confirmation email's link target to:

   ```html
   <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
   ```

   The default ConfirmationURL also works with PKCE in the browser that started
   signup. The custom token-hash template avoids that same-browser requirement.
   Do not enable email link click tracking or prefetching in the SMTP provider.

## Google

Create a Google Cloud OAuth client with application type Web application.
Configure the consent screen and publish it for the intended audience.

- Authorized JavaScript origins: `https://wildball.io`, `https://www.wildball.io`.
- Authorized redirect URI:
  `https://iuaadtiijverhgyqqzas.supabase.co/auth/v1/callback`.
- In Supabase Authentication → Sign In / Providers → Google, enter the client
  ID and client secret, enable Google, and save. Enter secrets only in the
  provider dashboard, never in browser code or Git.

## Facebook

Create a Meta app with Facebook Login for the website. Configure the app domain
`wildball.io`, website URL `https://wildball.io`, privacy policy, and user-data
deletion instructions. Set Valid OAuth Redirect URIs to:

`https://iuaadtiijverhgyqqzas.supabase.co/auth/v1/callback`

In Supabase → Authentication → Sign In / Providers → Facebook, enter the App ID
and App Secret, enable Facebook, and save. The code requests the email scope.
Complete Meta's required access/review and switch the app to Live for public
users; development mode only admits app roles/testers.

## Deployment and verification

Set the VPS environment `NEXT_PUBLIC_SITE_URL=https://wildball.io` and ensure the
two NEXT_PUBLIC_SUPABASE variables point to this project. Rebuild and restart
the app. `/api/auth/providers` returns only provider availability flags, never
credentials. Unconfigured providers are disabled and email signup fails closed
until hosted email confirmation is enabled.

1. Register a fresh email: see Check your inbox, no authenticated session yet.
2. Before confirmation, password login must fail and offer a resend.
3. Open the email link: arrive on the HTTPS site with a session and one profile.
4. Check resend cooldown, expired links, and already-used links.
5. Test Google and Facebook using real non-developer accounts; verify a profile
   is created and remains the same on subsequent login.
6. Cancel provider consent: return to a useful error and retry.
7. Repeat through `www`, on mobile, and with the custom email link in a different
   browser. Already verified Google/Facebook identities do not require a
   separate Wildball email confirmation.

References:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/social-login/auth-facebook
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp
