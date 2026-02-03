FROM node:18-alpine AS build
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY . .
RUN npx tsc -p ./tsconfig.json

FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json .
RUN npm install --production
COPY --from=build /usr/src/app/dist dist
CMD ["npm", "run", "start"]