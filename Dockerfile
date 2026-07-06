FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build -- --base=/
EXPOSE 8080
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server/index.js"]
