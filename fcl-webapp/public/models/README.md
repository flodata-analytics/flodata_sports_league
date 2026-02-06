# public/models

Place GLB model files here so the app can serve them at `/models/<name>.glb`.

Required files for your setup (optional but recommended):
- `Ayush.glb` — 3D model for Ayush Rathaur
- `Shubhankit.glb` — 3D model for Shubhankit

How to add a file (PowerShell):

```powershell
# From repo root
# Copy a local file into the public models folder
Copy-Item -Path "C:\path\to\Ayush.glb" -Destination ".\public\models\Ayush.glb"
```

Verify locally served URL (dev server must be running on localhost:3000 or your configured port):

```powershell
# HEAD request to verify file exists
Invoke-WebRequest -Method Head -Uri http://localhost:3000/models/Ayush.glb -UseBasicParsing
```

If you prefer, upload the files to a CDN and set the `modelUrl` field on the player document to that absolute URL.
