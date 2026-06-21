# Stage 1: Build the React bundle
FROM node:20-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the static files using Nginx
FROM nginx:alpine

COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy a basic nginx configuration that redirects API queries to backend
# For simple setups, Nginx hosts the static bundle on port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
