FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=http://localhost:5000/api
ARG VITE_USE_MOCK=true
ARG VITE_SITE_URL=http://localhost:8080
ARG VITE_DEPLOYMENT_TARGET=docker
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_DEPLOYMENT_TARGET=$VITE_DEPLOYMENT_TARGET
RUN npm run build

FROM nginx:1.29-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
