FROM node:current-alpine

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --production

COPY . .

LABEL org.opencontainers.image.source https://github.com/IAmFrench/nord-dns
LABEL org.opencontainers.image.title "DoHjs Web Interface"
LABEL org.opencontainers.image.description "Provides a Web Interface to test DoH services"

CMD ["npm", "start"]