# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM node:20-slim
# Installing libvips-dev for sharp compatibility
RUN apt-get update && apt-get install libvips-dev -y
ARG NODE_ENV=production
# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Add Environment variables
#SERVER CONFIG
ENV STRAPI_HOST=0.0.0.0
ENV STRAPI_PORT=1337

# Install production dependencies.
RUN npm install

# Copy local code to the container image.
COPY . ./

# This build command will build the Web ui of the CMS
RUN npm run build
# Expose the Port Outside the container to the localhost
EXPOSE 1337

# Run the web service on container startup.
CMD [ "npm", "run" ,"start" ]