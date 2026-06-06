FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Set environment variables for the build phase
ARG NEXT_PUBLIC_API_URL=https://api-vacamake.francescoer.dev
ARG NEXT_PUBLIC_SOCKET_URL=https://api-vacamake.francescoer.dev

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

RUN npm run build

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "run", "start"]
