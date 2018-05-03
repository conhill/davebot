FROM node:carbon
WORKDIR /davebot
COPY package.json /davebot
RUN npm install
COPY . /davebot
CMD node app.js
EXPOSE 8081