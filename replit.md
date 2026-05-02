# AI Agronom — Telegram Bot + Dashboard

## Overview

Qishloq xo'jaligi bo'yicha AI agronom Telegram boti va uning boshqaruv paneli.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Telegram Bot**: Telegraf v4
- **AI**: OpenAI via Replit AI Integrations (gpt-5.4 with vision)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Architecture

### Telegram Bot (`artifacts/api-server/src/bot/agro-bot.ts`)
- Runs in long-polling mode alongside the Express server
- Handles `/start`, `/help` commands
- **Photo messages**: Downloads image, sends to OpenAI vision (gpt-5.4) for crop/disease analysis
- **Text messages**: Sends to OpenAI for agronomist Q&A in Uzbek
- Saves all users and analyses to PostgreSQL

### API Server (`artifacts/api-server`)
- `GET /api/bot/stats` — dashboard statistics
- `GET /api/bot/analyses` — paginated list of crop analyses
- `GET /api/bot/analyses/:id` — single analysis detail
- `GET /api/bot/users` — list of bot users
- `GET /api/bot/recent-activity` — latest 10 analyses feed

### Dashboard (`artifacts/agro-dashboard`)
- Dark, earthy theme (forest greens + harvest golds)
- Pages: Mission Control (stats), Analyses table, Analysis detail, Farmers
- Uses generated React Query hooks from `@workspace/api-client-react`

## Database Schema

- `bot_users` — Telegram users (id, telegram_id, username, first/last name)
- `analyses` — Crop analyses (image_url, analysis_text, disease_detected, crop_type, severity)
- `conversations` + `messages` — OpenAI integration tables

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Environment Variables

- `TELEGRAM_BOT_TOKEN` — Telegram bot token from @BotFather
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — auto-set by Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_API_KEY` — auto-set by Replit AI Integrations
- `DATABASE_URL` — PostgreSQL connection string

## Bot Usage

1. Telegram'da botga `/start` yuboring
2. O'simlik rasmi yuboring → kasallik tahlili
3. Qishloq xo'jaligi bo'yicha savol yozing → maslahat
