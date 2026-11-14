# SMS Edge Function Deployment

## Prerequisites
1. Install Supabase CLI: `npm install -g supabase`
2. Login to Supabase: `supabase login`

## Deploy the Function
```bash
# From project root
supabase functions deploy send-sms
```

## Set Environment Variables
In your Supabase dashboard, go to Settings > Edge Functions and add:

- `TEXTSMS_API_KEY`: Your TextSMS API key
- `TEXTSMS_PARTNER_ID`: Your TextSMS Partner ID

## Test the Function
The function will be available at:
`https://[your-project-id].supabase.co/functions/v1/send-sms`

## How it Works
1. Frontend calls our Edge Function instead of TextSMS directly
2. Edge Function makes the actual API call to TextSMS
3. No CORS issues since server-to-server communication
4. API keys stay secure on server-side
5. SMS logs are created and updated in database

## Function URL
The SMS service is already configured to call:
`${VITE_SUPABASE_URL}/functions/v1/send-sms`