# Unicorn 404 Runner

I was recently dusting off some old side project ideas, and one of them was a custom 404 page game inspired by Google's T-Rex Runner.

Back when I was working on top-of-funnel web experiences, I thought it would be fun to make 404 pages a bit more playful and interactive. The idea never really went anywhere, but I finally decided to build my own version of it.

Anyway, here it is:

[![Unicorn 404 Runner — Demo](https://cdn.loom.com/sessions/thumbnails/bbf74fbfdaf24253800240dc86480b29-with-play.gif)](https://www.loom.com/share/bbf74fbfdaf24253800240dc86480b29)

---

## Self-host in one click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hytonylee/Unicorn-Runner)

After deploying, set these environment variables in your Vercel project settings:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your [Google Gemini API key](https://aistudio.google.com/app/apikey) |
| `APP_URL` | The URL of your deployed app (e.g. `https://your-app.vercel.app`) |

---

## Run Locally

**Prerequisites:** Node.js 22+, [pnpm](https://pnpm.io)

1. Install dependencies:
   `pnpm install`
2. Copy `.env.example` to `.env.local` and set your `GEMINI_API_KEY`
3. Run the app:
   `pnpm dev`
