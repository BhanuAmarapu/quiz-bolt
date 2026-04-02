# AWS Production Deployment Guide: QuizBolt

This guide ensures a stable, failure-proof deployment of the QuizBolt v1 platform on AWS.

## 1. Prerequisites
- **AWS Account** with CLI configured.
- **Docker & Docker-Compose** installed on the EC2 instance.
- **MongoDB Atlas** (Cloud) or DocumentDB instance.
- **Redis** (ElastiCache or local Docker).

## 2. Infrastructure Setup (Recommended)

### EC2 Instance
- **Type**: `t3.medium` (Minimum for 50+ concurrent quiz participants).
- **Security Groups**:
  - `80` (HTTP) - Inbound from everywhere.
  - `443` (HTTPS) - Inbound from everywhere.
  - `5000`, `5001` - Restricted (Internal only if using Nginx as proxy).

### Database
- Use **MongoDB Atlas** for managed replication and backups.
- Update your `MONGO_URI` to use the Atlas connection string.

---

## 3. Environment Configuration
Create a single root `.env` file on the production server based on [.env.example](.env.example).

This repo now uses one shared environment file for the client, main server, and payment service. The backend services load the root `.env` directly, and the client uses proxy-based API paths, so you do not need separate `.env` files inside `server/` or `payment-service/`.

> [!IMPORTANT]
> Keep `JWT_SECRET` and `JWT_REFRESH_SECRET` the same for all services that issue or verify tokens.
>
> Required shared variables include `SERVER_PORT`, `PAYMENT_SERVICE_PORT`, `MONGO_URI`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `CLIENT_URL`, `PAYMENT_SERVICE_URL`, `CORS_ORIGIN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `WEBHOOK_SECRET`, and `VITE_API_URL`.

---

---

## 4. Detailed Component Deployment (PM2 + Nginx)

### A. Main Server
1. **Navigate & Install**:
   ```bash
   cd server && npm install --production
   ```
2. **Environment**: The server reads the root `.env`. Make sure `SERVER_PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `CLIENT_URL`, and `PAYMENT_SERVICE_URL` are set in the repository root.
3. **Start**:
   ```bash
   pm2 start server.js --name "quiz-server"
   ```

### B. Payment Service
1. **Navigate & Install**:
   ```bash
   cd ../payment-service && npm install --production
   ```
2. **Environment**: The payment service also reads the root `.env`. Make sure `PAYMENT_SERVICE_PORT`, `DATABASE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `WEBHOOK_SECRET`, `CORS_ORIGIN`, and the shared `JWT_SECRET` are set in the repository root.
3. **Start**:
   ```bash
   pm2 start server.js --name "payment-service"
   ```

### C. Client (React App)
1. **Navigate & Install**:
   ```bash
   cd ../client && npm install
   ```
2. **Build**:
   ```bash
   npm run build
   ```
3. **Runtime**: The client uses `VITE_API_URL=/api` in the root `.env`, so the built app talks to the reverse proxy instead of hardcoded service URLs.
4. **Nginx Setup**: Copy the `dist` folder to `/var/www/quizbolt`.

---

## 5. Nginx Configuration (The "Glue")
Create an Nginx config (e.g., `/etc/nginx/sites-available/quizbolt`) to handle routing and WebSockets:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 1. Frontend Client
    location / {
        root /var/www/quizbolt;
        index index.html;
        try_files $uri /index.html;
    }

    # 2. Main Server API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # 3. Socket.io (WebSocket)
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # 4. Payment Service
    location /payment/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

If you are using Docker on AWS, the same path structure applies through the container network. The client should still call `/api`, `/socket.io/`, and `/payment/`, with Nginx forwarding those requests to the appropriate service.

---

## 6. Post-Deployment Checklist
1. **Health Checks**: 
   - Verify `http://your-domain.com/api/health` returns `healthy`.
   - Verify `http://your-domain.com/payment/health` returns `healthy`.
2. **SSL/TLS**: Run `sudo certbot --nginx -d yourdomain.com` for HTTPS.
3. **Persist PM2**: Run `pm2 save && pm2 startup`.

## 7. Troubleshooting Production Failures
- **Socket Disconnects**: Verify the `proxy_set_header Upgrade` lines in Nginx.
- **Payment Failures**: Verify `RAZORPAY_KEY_ID` matches the environment (Test/Live).
- **Environment Conflicts**: Double-check that the root `.env` is the only source of truth and that `JWT_SECRET` / `JWT_REFRESH_SECRET` are shared consistently.

