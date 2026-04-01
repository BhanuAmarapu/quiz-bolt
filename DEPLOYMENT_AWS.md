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
Create a `.env` file on the production server based on `.env.example`.

> [!IMPORTANT]
> Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are identical across ALL microservices to avoid authentication failures.

---

---

## 4. Detailed Component Deployment (PM2 + Nginx)

### A. Main Server (Port 5000)
1. **Navigate & Install**:
   ```bash
   cd server && npm install --production
   ```
2. **Environment**: Ensure `server/.env` contains `MONGO_URI`, `JWT_SECRET`, `REDIS_URL`, and `CLIENT_URL`.
3. **Start**:
   ```bash
   pm2 start server.js --name "quiz-server"
   ```

### B. Payment Service (Port 5001)
1. **Navigate & Install**:
   ```bash
   cd ../payment-service && npm install --production
   ```
2. **Environment**: Ensure `payment-service/.env` contains `DATABASE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and the **same** `JWT_SECRET` as the main server.
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
   # Ensure the server URL is correct in your .env or api.js
   npm run build
   ```
3. **Nginx Setup**: Copy the `dist` folder to `/var/www/quizbolt`.

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
- **Environment Conflicts**: Double-check that `JWT_SECRET` is identical in both `server/.env` and `payment-service/.env`.

