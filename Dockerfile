FROM node:24-trixie

RUN mkdir -p /opt/app
WORKDIR /opt/app

COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/

RUN npm install
RUN npx prisma generate
RUN npm run build

COPY start.sh ./start.sh
RUN chmod +x ./start.sh


EXPOSE 3000
CMD [ "./start.sh" ]