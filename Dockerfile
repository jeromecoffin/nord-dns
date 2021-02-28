FROM node:current-alpine

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --production

COPY . .

LABEL org.opencontainers.image.source https://github.com/IAmFrench/nord-dns

CMD ["npm", "start"]
