FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_API_URL=http://graphql.localhost:8080/
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_FRONTEND_URL=http://tarefas-ui.localhost:8080
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL

RUN npm run build

# Serve with nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
