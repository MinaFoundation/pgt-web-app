### Building stage
FROM node:20.3.0-alpine as builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY next.config.js .
COPY tsconfig.json .
COPY tailwind.config.ts .
COPY postcss.config.mjs .
COPY prisma ./prisma/
COPY public ./public

RUN npx prisma generate

RUN npm run build && \
    npm prune --production && \
    npm cache clean --force

### Production stage
FROM node:20.3.0-alpine
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir .next
RUN chown nextjs:nodejs .next

RUN npm install prisma -g && rm -rf /root/.npm /root/.cache

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

USER nextjs
CMD ["npm", "run", "start:prod"]
