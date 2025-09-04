FROM node:22-alpine

ENV NODE_ENV=development
ENV TZ=Asia/Tokyo

WORKDIR /app
COPY ./package.json /app
RUN npm install --legacy-peer-deps