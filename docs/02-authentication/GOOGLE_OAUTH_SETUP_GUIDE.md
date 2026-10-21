# Cara Mendapatkan Google OAuth Credentials untuk ZITADEL

Panduan lengkap untuk membuat Google OAuth 2.0 Client ID dan Client Secret yang diperlukan untuk mengaktifkan "Sign in with Google" di ZITADEL.

---

## 📋 Yang Anda Butuhkan

- Akun Google (Gmail)
- Akses ke Google Cloud Console
- URL Callback dari ZITADEL: `https://zit.pkc.pub/ui/login/externalidp/callback`

---

## 🚀 Langkah-Langkah Lengkap

### **Step 1: Buka Google Cloud Console**

1. Kunjungi: **https://console.cloud.google.com**
2. Login dengan akun Google Anda
3. Jika ini pertama kali, Anda akan diminta menyetujui Terms of Service

---

### **Step 2: Buat Project Baru (atau Gunakan yang Ada)**

1. **Klik dropdown project** di bagian atas (sebelah logo Google Cloud)
2. **Klik "NEW PROJECT"**
3. **Isi detail project:**
   - **Project name:** `ZITADEL PKC Auth` (atau nama lain yang Anda inginkan)
   - **Organization:** (biarkan default jika tidak punya)
4. **Klik "CREATE"**
5. **Tunggu beberapa detik** sampai project dibuat
6. **Pilih project** yang baru dibuat dari dropdown

---

### **Step 3: Aktifkan OAuth Consent Screen**

Sebelum membuat credentials, Anda harus mengkonfigurasi OAuth consent screen:

1. **Di sidebar kiri**, klik **"APIs & Services"** → **"OAuth consent screen"**
   
   Atau langsung ke: https://console.cloud.google.com/apis/credentials/consent

2. **Pilih User Type:**
   - **External** (untuk testing dan production)
   - Klik **"CREATE"**

3. **Isi OAuth Consent Screen (Page 1 - App Information):**
   - **App name:** `PKC Monopoly Game` atau `ZITADEL PKC`
   - **User support email:** Pilih email Anda dari dropdown
   - **App logo:** (optional - bisa dilewati)
   - **Application home page:** `https://pkc.pub`
   - **Application privacy policy link:** `https://pkc.pub/privacy` (buat halaman ini nanti)
   - **Application terms of service link:** `https://pkc.pub/terms` (buat halaman ini nanti)
   - **Authorized domains:** Klik **"ADD DOMAIN"** dan masukkan:
     - `pkc.pub`
     - `zit.pkc.pub`
   - **Developer contact information:** Masukkan email Anda
   - Klik **"SAVE AND CONTINUE"**

4. **Scopes (Page 2):**
   - Klik **"ADD OR REMOVE SCOPES"**
   - Pilih scopes berikut:
     - ✅ `.../auth/userinfo.email`
     - ✅ `.../auth/userinfo.profile`
     - ✅ `openid`
   - Klik **"UPDATE"**
   - Klik **"SAVE AND CONTINUE"**

5. **Test Users (Page 3):**
   - Jika app masih dalam mode "Testing", tambahkan email Anda sebagai test user
   - Klik **"ADD USERS"**
   - Masukkan email Google Anda
   - Klik **"ADD"**
   - Klik **"SAVE AND CONTINUE"**

6. **Summary (Page 4):**
   - Review semua informasi
   - Klik **"BACK TO DASHBOARD"**

---

### **Step 4: Buat OAuth 2.0 Client ID**

1. **Di sidebar kiri**, klik **"Credentials"**
   
   Atau langsung ke: https://console.cloud.google.com/apis/credentials

2. **Klik tombol "+ CREATE CREDENTIALS"** di bagian atas

3. **Pilih "OAuth client ID"**

4. **Isi form Create OAuth client ID:**

   **Application type:** Pilih **"Web application"**

   **Name:** `ZITADEL PKC Login` (atau nama lain)

   **Authorized JavaScript origins:** (optional untuk ZITADEL)
   - Klik **"ADD URI"**
   - Masukkan: `https://zit.pkc.pub`

   **Authorized redirect URIs:** ⚠️ **PENTING!**
   - Klik **"ADD URI"**
   - Masukkan **EXACTLY**: `https://zit.pkc.pub/ui/login/externalidp/callback`
   - ⚠️ Pastikan tidak ada typo atau spasi!

5. **Klik "CREATE"**

---

### **Step 5: Copy Credentials**

Setelah klik CREATE, akan muncul popup dengan credentials:

```
OAuth client created
Your Client ID
[YOUR_CLIENT_ID].apps.googleusercontent.com

Your Client Secret
[YOUR_CLIENT_SECRET]
```

**⚠️ PENTING: Copy kedua nilai ini sekarang!**

1. **Copy Client ID** → Simpan di notepad
2. **Copy Client Secret** → Simpan di notepad
3. Klik **"OK"**

**Note:** Anda bisa melihat credentials ini lagi nanti di halaman Credentials.

---

### **Step 6: Masukkan ke ZITADEL**

Kembali ke ZITADEL Console di `https://zit.pkc.pub`:

1. **Navigate to:** Settings → Identity Providers → Add Provider → Google

2. **ZITADEL Callback URL** (sudah otomatis terisi):
   ```
   https://zit.pkc.pub/ui/login/externalidp/callback
   ```

3. **Paste credentials dari Google Cloud Console:**
   - **Client ID:** Paste Client ID yang Anda copy
   - **Client Secret:** Paste Client Secret yang Anda copy

4. **Klik "Save"** atau "Add"

5. **Enable the provider** jika ada toggle switch

---

## ✅ Verifikasi Setup

### Test Login dengan Google:

1. **Logout dari ZITADEL** jika sedang login
2. **Buka Monopoly game:** Apps → Monopoly (Auth) → Open Authenticated Game
3. **Klik "Login with ZITADEL"**
4. **Anda sekarang akan melihat tombol "Sign in with Google"** ✅
5. **Klik tombol Google** dan login dengan akun Google Anda
6. **Seharusnya berhasil!** 🎉

---

## 🔧 Troubleshooting

### Error: "Access blocked: This app's request is invalid"
**Penyebab:** Redirect URI tidak cocok
**Solusi:** 
- Pastikan redirect URI di Google Cloud Console adalah **EXACTLY**:
  ```
  https://zit.pkc.pub/ui/login/externalidp/callback
  ```
- Tidak ada spasi, tidak ada trailing slash

### Error: "Access blocked: Authorization Error - disabled_client"
**Penyebab:** OAuth client dinonaktifkan
**Solusi:**
- Buka Google Cloud Console → Credentials
- Pastikan OAuth client status adalah **Enabled**

### Error: "This app isn't verified"
**Penyebab:** App masih dalam testing mode
**Solusi:**
- Ini normal untuk app dalam development
- Klik **"Advanced"** → **"Go to [App Name] (unsafe)"**
- Atau submit app untuk verification (untuk production)

### Tidak melihat tombol "Sign in with Google" di ZITADEL
**Penyebab:** Provider belum diaktifkan
**Solusi:**
- Buka ZITADEL Console → Settings → Identity Providers
- Pastikan Google provider status adalah **Active/Enabled**

---

## 📝 Ringkasan Credentials

Setelah selesai, Anda akan memiliki:

```yaml
Google Cloud Project: ZITADEL PKC Auth
OAuth Client Name: ZITADEL PKC Login

Client ID: 
  [YOUR_CLIENT_ID].apps.googleusercontent.com

Client Secret: 
  [YOUR_CLIENT_SECRET]

Authorized Redirect URI:
  https://zit.pkc.pub/ui/login/externalidp/callback

Scopes:
  - openid
  - email
  - profile
```

---

## 🔐 Keamanan

**⚠️ PENTING:**
- **Jangan share Client Secret** di public repository atau chat
- **Simpan credentials dengan aman**
- **Gunakan environment variables** untuk production
- **Rotate credentials** secara berkala untuk keamanan

---

## 📚 Referensi

- [Google Cloud Console](https://console.cloud.google.com)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [ZITADEL Identity Providers Guide](https://zitadel.com/docs/guides/manage/console/instance-settings#identity-providers)

---

## ✅ Checklist Setup

- [ ] Buat Google Cloud Project
- [ ] Konfigurasi OAuth Consent Screen
- [ ] Tambahkan authorized domains (pkc.pub, zit.pkc.pub)
- [ ] Tambahkan scopes (openid, email, profile)
- [ ] Buat OAuth 2.0 Client ID
- [ ] Set application type: Web application
- [ ] Tambahkan redirect URI: `https://zit.pkc.pub/ui/login/externalidp/callback`
- [ ] Copy Client ID dan Client Secret
- [ ] Paste ke ZITADEL Console
- [ ] Enable Google provider di ZITADEL
- [ ] Test login dengan Google

---

Setelah mengikuti semua langkah ini, user akan bisa login ke Monopoly game menggunakan akun Google mereka! 🎮🔐
