FROM node:22-alpine

# Create app directory
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install dependencies
RUN npm ci --omit=dev

EXPOSE 3000
CMD [ "npm", "start" ]
