# Build stage: install all deps and run Vite build
FROM node:22 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY index.html ./
COPY index.tsx ./
COPY App.tsx ./
COPY types.ts ./
COPY constants.ts ./
COPY achievements.ts ./
COPY firebaseConfig.ts ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY .env* ./
COPY components ./components
COPY services ./services
COPY utils ./utils
COPY lib ./lib
COPY public ./public
RUN npm run build

# Production stage: only runtime deps + built output
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY lib ./lib
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node", "server.js"]
