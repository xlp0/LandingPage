# PKC Documentation Viewer

A modern web-based viewer for PKC (Personal Knowledge Container) design documentation with support for markdown rendering, LaTeX mathematical equations, and Mermaid diagrams.

## 🚀 Features

### **Rich Content Rendering**
- **Full Markdown Support**: Headers, lists, tables, code blocks, images, and links
- **LaTeX Math Rendering**: Mathematical equations using KaTeX (Obsidian-compatible)
  - Inline math: `$E = mc^2$`
  - Display math: `$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) \times V$$`
- **Mermaid Diagrams**: Flowcharts, sequence diagrams, class diagrams, and more
- **Syntax Highlighting**: Code blocks with language-specific highlighting

### **Modern UI/UX**
- Beautiful gradient design with card-based navigation
- Responsive layout for all devices
- Sticky navigation header
- Clean typography and color-coded elements
- Document metadata display (frontmatter support)

### **Technical Stack**
- **Marked.js** (v11.0.0) - Markdown to HTML conversion
- **KaTeX** (v0.16.9) - Fast LaTeX math rendering
- **Mermaid.js** (v10) - Diagram rendering
- **Highlight.js** (v11.9.0) - Code syntax highlighting
- **Pure HTML/CSS/JavaScript** - No build process required

## 📁 Project Structure

```
├── README.md                    # This file
├── PKC-DOCS-README.md           # Detailed project documentation
├── LATEX-SUPPORT-SUMMARY.md     # LaTeX implementation details
├── index.html                   # PKC landing page with features
├── pkc-docs-index.html          # Main landing page with document cards
├── pkc-viewer.html              # Dynamic markdown viewer
├── mermaid-test.html            # Mermaid diagram testing
├── nginx-pkc.conf               # Nginx server configuration
├── iisstart.htm                 # IIS default page (modified)
├── iisstart.png                 # IIS logo
└── pkc-docs/                    # Documents directory
    ├── web.config               # IIS configuration
    ├── MVP Cards Design Rationale.md
    ├── PKC as the Network.md
    ├── Personal Knowledge Container.md
    ├── Yoneda Arithmetic.md
    └── LaTeX-Test.md            # LaTeX math examples
```

## 🛠️ Quick Start

### Option 1: Local Development
1. Clone this repository
2. Serve files with any web server (IIS, Apache, Nginx, or Python's built-in server)
3. Open `pkc-docs-index.html` in your browser

### Option 2: Python Simple Server
```bash
python -m http.server 8000
# Then visit http://localhost:8000/pkc-docs-index.html
```

### Option 3: Node.js Server
```bash
npx serve .
# Then visit http://localhost:3000/pkc-docs-index.html
```

### Option 4: Nginx on Mac (Recommended for Production)

#### Prerequisites
- Homebrew package manager installed
- Basic terminal/command line knowledge

#### Installation Steps

1. **Install Nginx via Homebrew**
   ```bash
   brew install nginx
   ```

2. **Create Nginx Configuration Directory** (if not exists)
   ```bash
   sudo mkdir -p /opt/homebrew/etc/nginx/servers
   ```

3. **Create Configuration File**
   
   Create a file named `nginx-pkc.conf` in your project directory with the following content:
   
   ```nginx
   server {
       listen 8081;
       server_name localhost pkc.local;

       # Root directory for PKC Landing Page
       root /Users/YOUR_USERNAME/Documents/Development/GovTech/PKC/LandingPage;
       
       # Default file to serve
       index index.html;

       # Main location block
       location / {
           try_files $uri $uri/ =404;
       }

       # Enable gzip compression
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
       
       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;

       # Cache static assets
       location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }

       # Handle 404 errors
       error_page 404 /404.html;
       location = /404.html {
           internal;
       }
   }
   ```
   
   **Important**: Replace `/Users/YOUR_USERNAME/...` with your actual project path.

4. **Copy Configuration to Nginx**
   ```bash
   sudo cp nginx-pkc.conf /opt/homebrew/etc/nginx/servers/
   ```

5. **Test Configuration**
   ```bash
   nginx -t
   ```
   
   You should see:
   ```
   nginx: the configuration file /opt/homebrew/etc/nginx/nginx.conf syntax is ok
   nginx: configuration file /opt/homebrew/etc/nginx/nginx.conf test is successful
   ```

6. **Start Nginx Service**
   ```bash
   brew services start nginx
   ```

7. **Access Your Site**
   
   Open your browser and navigate to:
   - Main landing page: `http://localhost:8081`
   - Documentation index: `http://localhost:8081/pkc-docs-index.html`

#### Managing Nginx

**Check Nginx Status**
```bash
brew services list | grep nginx
```

**Stop Nginx**
```bash
brew services stop nginx
```

**Restart Nginx**
```bash
brew services restart nginx
```

**Reload Configuration** (without stopping)
```bash
nginx -s reload
```

**View Nginx Logs**
```bash
# Error log
tail -f /opt/homebrew/var/log/nginx/error.log

# Access log
tail -f /opt/homebrew/var/log/nginx/access.log
```

**Check Which Ports Nginx is Using**
```bash
lsof -i :8081
```

#### Updating Configuration

After making changes to `nginx-pkc.conf`:

1. Copy updated config to nginx directory:
   ```bash
   sudo cp nginx-pkc.conf /opt/homebrew/etc/nginx/servers/
   ```

2. Test the new configuration:
   ```bash
   nginx -t
   ```

3. Reload nginx to apply changes:
   ```bash
   nginx -s reload
   ```

#### Troubleshooting

**Port Already in Use**
- If port 8081 is already in use, change the `listen` directive in the config file to another port (e.g., 8082)
- Update the config and reload nginx

**Permission Denied**
- Ensure you have read permissions on all files in the project directory
- Use `sudo` when copying config files to `/opt/homebrew/etc/nginx/servers/`

**404 Errors**
- Verify the `root` path in the config matches your actual project directory
- Check file permissions: `ls -la /path/to/your/project`

**Configuration Test Fails**
- Review error messages from `nginx -t`
- Check for syntax errors in `nginx-pkc.conf`
- Ensure the nginx servers directory exists

#### Configuration Features

The provided nginx configuration includes:
- ✅ **Gzip Compression**: Reduces file sizes for faster loading
- ✅ **Security Headers**: Protects against common web vulnerabilities
- ✅ **Static Asset Caching**: Improves performance with 1-year cache
- ✅ **Clean URLs**: Proper handling of directories and files
- ✅ **Error Handling**: Custom 404 error pages

#### Performance Benefits

Using nginx provides several advantages over simple development servers:
- **Production-grade performance**: Handle concurrent connections efficiently
- **Static file optimization**: Fast serving of HTML, CSS, JS, images
- **Compression**: Automatic gzip for text-based files
- **Caching**: Browser caching for static assets
- **Security**: Built-in security headers and protection

## 📖 Usage

### Viewing Documents
1. Start at the index page: `pkc-docs-index.html`
2. Click any document card to open it in the viewer
3. Use the "Back to Index" button to return

### Direct Document Access
You can link directly to any document:
```
pkc-viewer.html?doc=Personal%20Knowledge%20Container.md
pkc-viewer.html?doc=Yoneda%20Arithmetic.md
pkc-viewer.html?doc=LaTeX-Test.md
```

### Adding New Documents
1. Add markdown files to the `pkc-docs/` directory
2. Update `pkc-docs-index.html` to include a new card:
```html
<a href="pkc-viewer.html?doc=Your%20Document.md" class="doc-card">
    <div class="icon">📄</div>
    <h2>Your Document Title</h2>
    <p>Document description</p>
    <div class="meta">
        <span class="size">XX KB</span>
        <span class="view-btn">View Document →</span>
    </div>
</a>
```

## 🧮 LaTeX Math Support

The viewer supports Obsidian-compatible LaTeX syntax:

### Inline Math
```markdown
The equation $E = mc^2$ is Einstein's famous formula.
```

### Display Math
```markdown
$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) \times V
$$
```

### Supported Features
- Greek letters: `$\alpha, \beta, \gamma$`
- Fractions: `$\frac{a}{b}$`
- Superscripts/subscripts: `$x^2, x_i$`
- Integrals: `$\int_0^\infty f(x) dx$`
- Matrices: `$\begin{bmatrix} a & b \\ c & d \end{bmatrix}$`
- And much more!

## 📊 Mermaid Diagrams

All Mermaid diagram types are supported:

```mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    C --> D
```

Supported diagram types:
- Flowcharts
- Sequence diagrams
- Class diagrams
- State diagrams
- Gantt charts
- Pie charts
- And more!

## 🌐 Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## 🎨 Customization

### Changing Colors
Edit the CSS variables in the HTML files:
```css
/* Main gradient colors */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Typography
Modify the font families and sizes in the CSS sections.

## 🔧 Technical Details

### IIS Configuration
The `web.config` file ensures:
- Correct MIME types for markdown files
- CORS headers for local development
- Proper static content handling

### Performance
- **Fast Rendering**: KaTeX renders equations in ~10ms
- **Lightweight**: Total library size ≈ 500KB (CDN cached)
- **Progressive**: Content renders as it loads
- **No Build Step**: Pure HTML/CSS/JS

## 📝 Documentation

- **PKC-DOCS-README.md**: Comprehensive project documentation
- **LATEX-SUPPORT-SUMMARY.md**: Detailed LaTeX implementation guide
- **LaTeX-Test.md**: Comprehensive LaTeX examples and test cases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is provided as-is for viewing PKC design documentation.

## 📊 Project Stats

- **Lines of Code**: ~1,800 lines
- **Documents**: 5 PKC design documents
- **Libraries**: 4 modern JavaScript libraries
- **Browser Support**: All modern browsers
- **Server Options**: 4 (Python, Node.js, Nginx, IIS)
- **Last Updated**: November 7, 2025

## 🚀 Live Demo

To see the viewer in action:
1. Serve the files locally
2. Navigate to `pkc-docs-index.html`
3. Explore the PKC documentation with rich math and diagrams!

---

**Built with ❤️ for the PKC Design Community**
