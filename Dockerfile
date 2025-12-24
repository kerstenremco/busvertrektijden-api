FROM node:22-bookworm AS bustijdenapi-build

WORKDIR /app
ARG DATABASE_URL
COPY *.json ./
COPY *.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npm install
RUN npx prisma generate
RUN npx prisma migrate deploy
RUN npm run build

FROM node:22-bookworm
WORKDIR /app
COPY --from=bustijdenapi-build /app/package*.json ./
RUN npm install --omit=dev
COPY --from=bustijdenapi-build /app/dist ./dist
COPY --from=bustijdenapi-build /app/prisma ./prisma
COPY entrypoint.sh ./
RUN chmod +x ./entrypoint.sh
EXPOSE 3000
ENTRYPOINT [ "/app/entrypoint.sh" ]