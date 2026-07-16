# Second Smile — Multi-Tenant Deployment Guide

## Architecture

```
*.second-smile.uz  →  Frontend (single build, subdomain detection)
api.second-smile.uz  →  Node.js backend (port 5000)
admin.second-smile.uz  →  Super admin panel (separate build)
```

## Prerequisites

- Ubuntu/Debian server with Node.js 18+, PostgreSQL 15+, Nginx
- Domain `second-smile.uz` with DNS access
- Wildcard SSL certificate

## 1. DNS Setup

Add these records to your DNS provider:

```
A     second-smile.uz         → <server-ip>
A     *.second-smile.uz       → <server-ip>
CNAME www.second-smile.uz     → second-smile.uz
```

## 2. SSL (Wildcard Certificate)

Using Certbot with Cloudflare DNS validation:

```bash
sudo apt install certbot python3-certbot-dns-cloudflare

# Create /etc/letsencrypt/cloudflare.ini with your API token
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d second-smile.uz \
  -d "*.second-smile.uz"
```

Or use Cloudflare Universal SSL (free) if proxying through Cloudflare.

## 3. Database

```bash
sudo -u postgres psql

CREATE DATABASE dental_clinic;
CREATE USER second_smile WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE dental_clinic TO second_smile;
```

## 4. Backend Deployment

```bash
cd /var/www/dental-clinic-backend
npm install --production

# Create .env from .env.example
cp .env.example .env
# Edit .env with real values

# Run migrations
npm run migrate
npm run seed

# Start with PM2
pm2 start index.js --name second-smile-api
pm2 save
```

## 5. Frontend Build

```bash
cd /var/www/second-smile
npm install
VITE_API_URL=https://api.second-smile.uz/api npm run build
```

## 6. Super Admin Panel Build

```bash
cd /var/www/super-admin-panel
npm install
VITE_API_URL=https://api.second-smile.uz/api/super-admin npm run build
```

## 7. Nginx

```bash
sudo cp nginx/second-smile.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/second-smile.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Add SSL directives to each server block after obtaining the certificate.

## 8. Verify

1. Visit `https://admin.second-smile.uz` — login with admin/admin123, change password immediately
2. Create a clinic with slug "demo" 
3. Visit `https://demo.second-smile.uz` — should show login page with clinic branding
4. Test Click payment in sandbox mode

## Environment Variables (.env)

```
DATABASE_URL=postgres://second_smile:password@localhost:5432/dental_clinic
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dental_clinic
DB_USER=second_smile
DB_PASSWORD=your-secure-password

JWT_SECRET=generate-a-random-64-char-string
SUPER_ADMIN_JWT_SECRET=generate-another-random-64-char-string

CLICK_SERVICE_ID=your-click-service-id
CLICK_MERCHANT_ID=your-click-merchant-id
CLICK_SECRET_KEY=your-click-secret-key

PORT=5000
```

## Local Development

For testing subdomains locally, add to `/etc/hosts`:

```
127.0.0.1  demo.second-smile.local
127.0.0.1  api.second-smile.local
127.0.0.1  admin.second-smile.local
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:5000/api
VITE_CLINIC_SLUG=secondsmile
```
