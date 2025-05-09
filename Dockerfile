FROM node:lts-alpine

WORKDIR /app

RUN apk update && \
    apk add --no-cache sqlite && \
    chown node:node /app

USER node

COPY --chown=node:node . .

RUN npm install

RUN sqlite3 database.db < database.sql && \
    rm -f database.sql

EXPOSE 3000

CMD [ "npm", "start" ]