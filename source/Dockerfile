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
# Copy .env files if they exist (package.json is included to guarantee the glob never fails)
COPY package.json .env* ./
COPY components ./components
COPY context ./context
COPY hooks ./hooks
COPY server ./server
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
COPY --from=build /app/server ./server
COPY --from=build /app/lib ./lib
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["npx", "tsx", "server/index.js"]
