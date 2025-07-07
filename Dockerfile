FROM node:24-alpine

WORKDIR /usr/osubot

COPY . .
RUN npm ci
RUN npm run build

CMD ["npm", "start"]