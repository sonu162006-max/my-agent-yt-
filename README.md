# Friendly AI Agent (Next.js + Groq)

A friendly, production-ready general-purpose AI chat assistant built with Next.js (App Router, TypeScript) and the Vercel AI SDK, powered by Groq's `openai/gpt-oss-120b` model.

## Features
- **Model**: Groq `openai/gpt-oss-120b` (temperature: 0.7)
- **Memory**: Buffer window of the last 10 interactions (up to 20 messages)
- **Streaming**: Fast real-time response streaming
- **Protection**: In-memory rate limiting (20 requests/minute per IP) and 4,000 character maximum per input
- **Vercel Hobby Plan Ready**: Conservative `maxDuration` configured

---

## 1. Local Setup

### Step 1: Add your Groq API Key
Open `.env.local` and add your Groq API key:
```env
GROQ_API_KEY=gsk_your_actual_key_here
```
*(Get a free key at [console.groq.com](https://console.groq.com))*

### Step 2: Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Deploying to Vercel (Hobby Free Plan)

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. In the **Environment Variables** section, add:
   - **Key**: `GROQ_API_KEY`
   - **Value**: `gsk_your_actual_key_here`
4. Click **Deploy**.
