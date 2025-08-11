# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# انسخ ملفات الحزم فقط
COPY package.json ./

# اعمل install جوه الـ Docker (بدون package-lock.json)
RUN npm install

# انسخ باقي الملفات
COPY . .

# اعمل build
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]