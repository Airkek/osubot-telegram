FROM node:20-alpine

WORKDIR /usr/osubot

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

CMD ["npm", "start"]