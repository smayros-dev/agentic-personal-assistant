FROM node:20-alpine

WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer dépendances
RUN npm ci

# Copier code serveur
COPY . .

# Exposer port
EXPOSE 3001

# Démarrer serveur
CMD ["npm", "start"]
