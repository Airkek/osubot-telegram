FROM node:18-alpine

WORKDIR /usr/osubot

COPY package.json .
RUN npm install

COPY . .
RUN npm build

CMD ["npm", "start"]