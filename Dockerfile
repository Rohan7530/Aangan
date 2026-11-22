# One container for Render: the Node server (Nexconn, website) and the Python
# 3.14 AI service it starts as a child process on 127.0.0.1.

# ---- build the web app and the server ---------------------------------------
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY server server
COPY web web
RUN npm run build && npm prune --omit=dev

# ---- runtime: Python 3.14 + the Node binary ---------------------------------
FROM python:3.14-slim
WORKDIR /app
COPY --from=build /usr/local/bin/node /usr/local/bin/node

COPY ai/requirements.txt ai/requirements.txt
RUN pip install --no-cache-dir -r ai/requirements.txt
COPY ai/aangan_ai ai/aangan_ai

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/server/package.json server/
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/web/dist web/dist

ENV NODE_ENV=production \
    AI_PYTHON=python3 \
    PYTHONDONTWRITEBYTECODE=1
# Render sets PORT; config is read from the environment (no .env in the image).
EXPOSE 10000
CMD ["node", "server/dist/index.js"]
