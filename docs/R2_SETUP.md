# Cloudflare R2 Object Storage Setup

**Secure credential management for R2 integration**

---

## ⚠️ Security Warning

**NEVER commit credentials to Git!**

- ❌ Do not put credentials in ConfigMaps
- ❌ Do not commit secrets to Git
- ❌ Do not share credentials in plain text
- ✅ Use Kubernetes Secrets
- ✅ Use sealed-secrets or external-secrets for GitOps
- ✅ Rotate credentials regularly

---

## 🔧 R2 Configuration

### Bucket Information

**Production Bucket:**
```
Name: production-onlyfencig
Location: Asia-Pacific (APAC)
Custom Domain: https://pr2.onlyfencing.org
S3 API Endpoint: https://f8c899f6dbb63138d5497117c40cd5e8.r2.cloudflarestorage.com
```

**Test Bucket:**
```
Name: onlyfencingtest
Custom Domain: https://r2.onlyfencing.org
```

---

## 🔐 Step 1: Create R2 API Token

### In Cloudflare Dashboard:

1. Go to **R2** → **Overview**
2. Click **Manage R2 API Tokens**
3. Click **Create API Token**
4. Configure:
   - **Token Name:** `landingpage-argocd-prod`
   - **Permissions:** Object Read & Write
   - **Bucket:** `production-onlyfencig`
   - **TTL:** No expiry (or set expiry)
5. Click **Create API Token**
6. **Copy and save** the credentials:
   - Access Key ID
   - Secret Access Key
7. **Store securely** (password manager)

---

## 🔐 Step 2: Create Kubernetes Secret

### Option A: Direct kubectl (Recommended for Manual Setup)

```bash
# Create secret in default namespace
kubectl create secret generic cloudflare-r2-credentials \
  --from-literal=CLOUDFLARE_ACCOUNT_ID=f8c899f6dbb63138d5497117c40cd5e8 \
  --from-literal=CLOUDFLARE_R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID \
  --from-literal=CLOUDFLARE_R2_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY \
  --from-literal=CLOUDFLARE_R2_BUCKET_NAME=production-onlyfencig \
  --from-literal=CLOUDFLARE_R2_PUBLIC_URL=https://pr2.onlyfencing.org \
  --from-literal=CLOUDFLARE_R2_ENDPOINT=https://f8c899f6dbb63138d5497117c40cd5e8.r2.cloudflarestorage.com \
  -n default

# Verify secret created
kubectl get secret cloudflare-r2-credentials -n default
```

### Option B: Using YAML File (Local Only - DO NOT COMMIT)

```bash
# Create a local file (NOT tracked by Git)
cat > k8s/secret-r2-credentials-real.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: cloudflare-r2-credentials
  namespace: default
type: Opaque
stringData:
  CLOUDFLARE_ACCOUNT_ID: "f8c899f6dbb63138d5497117c40cd5e8"
  CLOUDFLARE_R2_ACCESS_KEY_ID: "YOUR_ACCESS_KEY_ID"
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "YOUR_SECRET_ACCESS_KEY"
  CLOUDFLARE_R2_BUCKET_NAME: "production-onlyfencig"
  CLOUDFLARE_R2_PUBLIC_URL: "https://pr2.onlyfencing.org"
  CLOUDFLARE_R2_ENDPOINT: "https://f8c899f6dbb63138d5497117c40cd5e8.r2.cloudflarestorage.com"
EOF

# Apply the secret
kubectl apply -f k8s/secret-r2-credentials-real.yaml

# Delete the file immediately
rm k8s/secret-r2-credentials-real.yaml
```

### Option C: Sealed Secrets (Recommended for GitOps)

```bash
# Install sealed-secrets controller (if not already installed)
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Create secret and seal it
kubectl create secret generic cloudflare-r2-credentials \
  --from-literal=CLOUDFLARE_ACCOUNT_ID=f8c899f6dbb63138d5497117c40cd5e8 \
  --from-literal=CLOUDFLARE_R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID \
  --from-literal=CLOUDFLARE_R2_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY \
  --from-literal=CLOUDFLARE_R2_BUCKET_NAME=production-onlyfencig \
  --from-literal=CLOUDFLARE_R2_PUBLIC_URL=https://pr2.onlyfencing.org \
  --from-literal=CLOUDFLARE_R2_ENDPOINT=https://f8c899f6dbb63138d5497117c40cd5e8.r2.cloudflarestorage.com \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > k8s/sealed-secret-r2.yaml

# Now you can safely commit sealed-secret-r2.yaml to Git
git add k8s/sealed-secret-r2.yaml
git commit -m "Add sealed R2 credentials"
git push
```

---

## 📝 Step 3: Update Application Code

### Add R2 Client to Application

```javascript
// Add to ws-server.js or create new r2-client.js

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// R2 configuration from environment variables
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

// Upload file to R2
async function uploadToR2(key, body, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  
  await r2Client.send(command);
  
  // Return public URL
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

// Download file from R2
async function downloadFromR2(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
  });
  
  const response = await r2Client.send(command);
  return response.Body;
}

module.exports = { uploadToR2, downloadFromR2, r2Client };
```

### Install AWS SDK

```bash
npm install @aws-sdk/client-s3
```

---

## 🔄 Step 4: Deploy

### Deployment will automatically pick up the secret:

```yaml
# Already configured in deployment-dev-with-configmap.yaml
envFrom:
  - configMapRef:
      name: landingpage-dev-config
  - secretRef:
      name: cloudflare-r2-credentials
      optional: true
```

### Verify Environment Variables in Pod:

```bash
# Get pod name
kubectl get pods -n default | grep argocd-test-landingpage

# Check environment variables
kubectl exec -it <pod-name> -n default -- env | grep CLOUDFLARE
```

Expected output:
```
CLOUDFLARE_ACCOUNT_ID=f8c899f6dbb63138d5497117c40cd5e8
CLOUDFLARE_R2_ACCESS_KEY_ID=67747d3498009d764b52c7ca8f59dbc8
CLOUDFLARE_R2_SECRET_ACCESS_KEY=70b8dacf8c3318afd20ec5af4fe86fcdf27a277a0039f61eb1a3fd51ad6a085d
CLOUDFLARE_R2_BUCKET_NAME=production-onlyfencig
CLOUDFLARE_R2_PUBLIC_URL=https://pr2.onlyfencing.org
CLOUDFLARE_R2_ENDPOINT=https://f8c899f6dbb63138d5497117c40cd5e8.r2.cloudflarestorage.com
```

---

## 🧪 Step 5: Test R2 Integration

### Test Upload:

```bash
# Create test endpoint in ws-server.js
app.post('/api/r2/test', async (req, res) => {
  try {
    const testData = 'Hello from ArgoCD deployment!';
    const url = await uploadToR2(
      'test/hello.txt',
      testData,
      'text/plain'
    );
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

# Test from command line
curl -X POST https://argocd-test.pkc.pub/api/r2/test
```

### Test Download:

```bash
# Access via public URL
curl https://pr2.onlyfencing.org/test/hello.txt
```

---

## 🔒 Security Best Practices

### 1. Rotate Credentials Regularly

```bash
# Create new API token in Cloudflare
# Update Kubernetes secret
kubectl create secret generic cloudflare-r2-credentials \
  --from-literal=CLOUDFLARE_R2_ACCESS_KEY_ID=NEW_KEY \
  --from-literal=CLOUDFLARE_R2_SECRET_ACCESS_KEY=NEW_SECRET \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods to pick up new secret
kubectl rollout restart deployment/argocd-test-landingpage-dev -n default

# Revoke old token in Cloudflare dashboard
```

### 2. Use RBAC

```yaml
# Limit who can view secrets
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: default
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["cloudflare-r2-credentials"]
  verbs: ["get"]
```

### 3. Audit Access

```bash
# Check who has accessed the secret
kubectl get events -n default | grep cloudflare-r2-credentials
```

### 4. Use Separate Buckets per Environment

```
Development: onlyfencingtest
Production: production-onlyfencig
```

---

## 📊 R2 Usage Monitoring

### Check Bucket Metrics:

1. Go to Cloudflare Dashboard
2. R2 → `production-onlyfencig`
3. Click **Metrics** tab
4. Monitor:
   - Class A Operations (writes)
   - Class B Operations (reads)
   - Storage usage
   - Bandwidth

### Set Up Alerts:

1. Go to **Notifications**
2. Create alert for:
   - High storage usage
   - High bandwidth usage
   - Unusual access patterns

---

## 🐛 Troubleshooting

### Secret Not Found

```bash
# Check if secret exists
kubectl get secret cloudflare-r2-credentials -n default

# If not, create it
kubectl create secret generic cloudflare-r2-credentials ...
```

### Permission Denied

```bash
# Check API token permissions in Cloudflare dashboard
# Ensure token has Read & Write access to the bucket
```

### Connection Timeout

```bash
# Check network connectivity from pod
kubectl exec -it <pod-name> -n default -- curl -I https://f8c899f6dbb63138d5497117c40cd5e8.r2.cloudflarestorage.com
```

### Invalid Credentials

```bash
# Verify credentials in secret
kubectl get secret cloudflare-r2-credentials -n default -o jsonpath='{.data.CLOUDFLARE_R2_ACCESS_KEY_ID}' | base64 -d

# Rotate credentials if compromised
```

---

## 📚 References

- **Cloudflare R2 Docs:** https://developers.cloudflare.com/r2/
- **AWS SDK for JavaScript:** https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
- **Kubernetes Secrets:** https://kubernetes.io/docs/concepts/configuration/secret/
- **Sealed Secrets:** https://github.com/bitnami-labs/sealed-secrets

---

## ✅ Checklist

- [ ] Created R2 API token in Cloudflare
- [ ] Stored credentials securely (password manager)
- [ ] Created Kubernetes secret
- [ ] Verified secret in cluster
- [ ] Updated application code
- [ ] Installed AWS SDK dependencies
- [ ] Tested upload/download
- [ ] Verified public URL access
- [ ] Set up monitoring
- [ ] Documented for team
- [ ] Added to .gitignore
- [ ] Rotated test credentials

---

**Remember: Security first! Never commit credentials to Git.**
