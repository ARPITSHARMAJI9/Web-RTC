# Share WebRTC

A browser-based peer-to-peer file transfer app using Express and WebSockets.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000

## Deploy

This project needs a Node server because it uses WebSockets and WebRTC signaling, so GitHub Pages is not suitable.

Recommended hosting providers:
- Render
- Railway
- Fly.io
- DigitalOcean App Platform

## Notes

- The app listens on `process.env.PORT` for deployment.
- Maximum file size is 100 MB per file.
