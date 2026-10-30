# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined at build time, so they must be build args.
ARG NEXT_PUBLIC_WP_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_HEADPRESS_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_STORE_LOCALE
ENV NEXT_PUBLIC_WP_URL=$NEXT_PUBLIC_WP_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_HEADPRESS_PUBLISHABLE_KEY=$NEXT_PUBLIC_HEADPRESS_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STORE_LOCALE=$NEXT_PUBLIC_STORE_LOCALE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
