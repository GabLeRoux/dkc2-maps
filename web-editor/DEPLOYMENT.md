# Deployment Guide for DKC2 Web Level Editor

This guide covers deploying the DKC2 Web Level Editor to various hosting platforms.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git repository access

## Netlify Deployment (Recommended)

Netlify is the recommended platform for deploying this application due to its excellent support for Single Page Applications (SPAs).

### Quick Deploy with Netlify

#### Method 1: One-Click Deploy

1. Click the "Deploy to Netlify" button in the README
2. Authorize Netlify to access your GitHub account
3. Configure the repository settings
4. Click "Deploy site"

The site will be automatically built and deployed.

#### Method 2: Connect Repository

1. Sign up/login at [netlify.com](https://www.netlify.com)
2. Click "New site from Git"
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select the `dkc2-maps` repository
5. Configure build settings:
   ```
   Base directory: web-editor
   Build command: npm install && npm run build
   Publish directory: web-editor/dist
   ```
6. Click "Deploy site"

#### Method 3: Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Navigate to web-editor directory
cd web-editor

# Login to Netlify
netlify login

# Initialize Netlify site (first time only)
netlify init

# Deploy to production
netlify deploy --prod

# Or deploy preview
netlify deploy
```

### Configuration

The project includes two `netlify.toml` files:

1. **Root `/netlify.toml`**: Main configuration with base directory
2. **`/web-editor/netlify.toml`**: Local configuration (optional)

Key configurations:
- **SPA Routing**: All routes redirect to `index.html`
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options
- **Caching**: Assets cached for 1 year, HTML revalidated
- **Compression**: Automatic gzip/brotli
- **Build Optimization**: CSS/JS bundling and minification

### Environment Variables

No environment variables are required for basic deployment. The app runs entirely client-side.

### Custom Domain

1. Go to Site Settings > Domain Management
2. Add custom domain
3. Configure DNS:
   ```
   Type: CNAME
   Name: www (or subdomain)
   Value: [your-site].netlify.app
   ```
4. Enable HTTPS (automatic with Let's Encrypt)

## Vercel Deployment

Vercel is another excellent option for SPA deployment.

### Deploy with Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to web-editor
cd web-editor

# Deploy
vercel --prod
```

### Vercel Configuration

Create `vercel.json` in the `web-editor` directory:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## GitHub Pages Deployment

GitHub Pages can host the static build.

### Deploy to GitHub Pages

1. **Build the project**:
   ```bash
   cd web-editor
   npm run build
   ```

2. **Deploy using gh-pages**:
   ```bash
   # Install gh-pages
   npm install -g gh-pages

   # Deploy dist folder
   gh-pages -d dist -b gh-pages
   ```

3. **Configure GitHub Pages**:
   - Go to repository Settings > Pages
   - Select `gh-pages` branch
   - Click Save

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web-editor

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./web-editor/dist
```

## Cloudflare Pages

### Deploy with Cloudflare Pages

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to Pages > Create a project
3. Connect your Git repository
4. Configure build:
   ```
   Build command: npm run build
   Build output directory: dist
   Root directory: web-editor
   ```
5. Click "Save and Deploy"

### Cloudflare Workers (Optional)

For edge caching and headers, create `_headers` file in `public/`:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

## AWS S3 + CloudFront

### Deploy to AWS

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Create S3 bucket**:
   ```bash
   aws s3 mb s3://dkc2-editor
   ```

3. **Upload files**:
   ```bash
   aws s3 sync dist/ s3://dkc2-editor --delete
   ```

4. **Configure bucket for static hosting**:
   - Enable static website hosting
   - Set index document: `index.html`
   - Set error document: `index.html` (for SPA routing)

5. **Create CloudFront distribution**:
   - Origin: S3 bucket
   - Default root object: `index.html`
   - Custom error response: 404 → 200 → `/index.html`

## Docker Deployment

For self-hosting with Docker:

### Dockerfile

Create `Dockerfile` in `web-editor`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Build and Run

```bash
# Build image
docker build -t dkc2-editor .

# Run container
docker run -d -p 8080:80 dkc2-editor
```

## Performance Optimization

### Build Optimization

The Vite build process automatically:
- Tree-shakes unused code
- Minifies JavaScript and CSS
- Splits code into chunks
- Generates source maps (production)
- Optimizes assets

### CDN Configuration

For optimal performance, configure CDN caching:

```
# HTML files
Cache-Control: public, max-age=0, must-revalidate

# JavaScript/CSS with hash in filename
Cache-Control: public, max-age=31536000, immutable

# Images
Cache-Control: public, max-age=2592000
```

### Monitoring

Post-deployment monitoring:

1. **Netlify Analytics**: Built-in analytics and performance monitoring
2. **Google Lighthouse**: Run audits for performance, accessibility, SEO
3. **Web Vitals**: Monitor Core Web Vitals (LCP, FID, CLS)

## Troubleshooting

### Build Failures

**Issue**: Build fails with memory error
```bash
# Solution: Increase Node.js memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

**Issue**: Module not found errors
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### SPA Routing Issues

**Issue**: 404 on refresh
- Ensure redirects are configured (check `netlify.toml` or equivalent)
- Verify `_redirects` file in `public/` directory

### CORS Errors

The app runs entirely client-side, so CORS shouldn't be an issue. If you encounter CORS:
- Check browser console for specific errors
- Ensure you're accessing via HTTPS
- Verify CSP headers aren't blocking requests

## Security Checklist

Before deploying to production:

- ✅ HTTPS enabled (automatic with Netlify/Vercel)
- ✅ Security headers configured (CSP, X-Frame-Options, etc.)
- ✅ No sensitive data in client code
- ✅ Dependencies up to date (`npm audit`)
- ✅ Proper cache headers set
- ✅ Asset compression enabled

## Post-Deployment

After deployment:

1. **Test the site**: Load a ROM file and verify functionality
2. **Run Lighthouse audit**: Check performance scores
3. **Test on mobile devices**: Ensure responsive design works
4. **Monitor errors**: Set up error tracking (Sentry, LogRocket, etc.)
5. **Update DNS**: Point custom domain if applicable

## Support

For deployment issues:
- Check Netlify/Vercel deployment logs
- Review browser console for errors
- Verify build completes locally
- Check platform-specific documentation

---

**Last Updated**: 2024
**Minimum Node Version**: 18.x
**Build Tool**: Vite 5.x
