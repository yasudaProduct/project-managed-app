FROM node:22-alpine

ENV NODE_ENV=development

WORKDIR /app
COPY ./package.json /app
RUN npm install