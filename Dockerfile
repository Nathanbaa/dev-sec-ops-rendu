FROM node:24-alpine AS Builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

FROM node:24-alpine AS SonarScanner

# Installer SonarQube Scanner
RUN apk add --no-cache openjdk17-jre unzip curl && \
    curl -sSLo sonar-scanner.zip https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip && \
    unzip sonar-scanner.zip -d /opt && \
    mv /opt/sonar-scanner-* /opt/sonar-scanner && \
    rm sonar-scanner.zip && \
    chmod +x /opt/sonar-scanner/bin/sonar-scanner

ENV PATH="/opt/sonar-scanner/bin:${PATH}"

WORKDIR /app
COPY . .

FROM node:24-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
COPY --from=Builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs scripts ./scripts
COPY --chown=nodejs:nodejs openapi.yaml ./

RUN mkdir -p uploads logs && chown -R nodejs:nodejs uploads logs

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000

USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => {process.exit(res.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/server.js"]