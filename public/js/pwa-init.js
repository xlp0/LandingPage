// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered successfully:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[PWA] New service worker found, installing...');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version available! Refresh to update.');

              // Show update notification
              if (confirm('A new version of MCard Manager is available. Reload to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });

    // Handle service worker updates
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

// PWA Install prompt
let deferredPrompt;
let installPromptShown = false;

window.addEventListener('beforeinstallprompt', (e) => {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isChrome = /Chrome/i.test(navigator.userAgent);

  console.log('[PWA] ✅ Native install prompt available!');
  console.log('[PWA] Event details:', e);
  console.log('[PWA] Browser:', navigator.userAgent);
  console.log('[PWA] Is Android:', isAndroid);
  console.log('[PWA] Is Chrome:', isChrome);
  console.log('[PWA] Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
  console.log('[PWA] Screen width:', window.innerWidth);

  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();

  // Store the event so it can be triggered later
  deferredPrompt = e;

  // Show modal immediately when native prompt is available (Android Chrome/Edge, Desktop Chrome/Edge)
  if (!installPromptShown && !window.matchMedia('(display-mode: standalone)').matches && !window.navigator.standalone) {
    console.log('[PWA] 🚀 Showing install modal with native prompt support');
    if (isAndroid) {
      console.log('[PWA] 📱 Android device detected - will show native Add to Home Screen');
    }
    installPromptShown = true;
    showInstallPromotion();
  } else {
    console.log('[PWA] ℹ️  Install prompt not shown (already shown or app installed)');
  }
});

// Diagnostic check after 3 seconds
setTimeout(() => {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isChrome = /Chrome/i.test(navigator.userAgent);

  console.log('[PWA] 🔍 Diagnostic Check:');
  console.log('  - beforeinstallprompt fired:', !!deferredPrompt);
  console.log('  - Service worker registered:', !!navigator.serviceWorker.controller);
  console.log('  - Is HTTPS:', location.protocol === 'https:' || location.hostname === 'localhost');
  console.log('  - Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
  console.log('  - Is Android:', isAndroid);
  console.log('  - Is Chrome:', isChrome);
  console.log('  - Screen width:', window.innerWidth);
  console.log('  - User agent:', navigator.userAgent);

  if (!deferredPrompt) {
    console.log('[PWA] ⚠️  Possible reasons for no beforeinstallprompt:');
    console.log('  1. App already installed');
    console.log('  2. User dismissed prompt too many times (Chrome blocks it)');
    console.log('  3. Manifest or service worker issue');
    console.log('  4. Browser does not support PWA install');
    console.log('  5. PWA criteria not met (check manifest icons)');
    if (isAndroid) {
      console.log('  6. Android-specific: May need PNG icons instead of SVG');
      console.log('  7. Android-specific: Check if Chrome version supports PWA');
    }
  }
}, 3000);

// Fallback: Show modal after 5 seconds if beforeinstallprompt hasn't fired
// (for browsers that don't support it or if user doesn't meet criteria)
setTimeout(() => {
  if (!installPromptShown && !window.matchMedia('(display-mode: standalone)').matches && !window.navigator.standalone) {
    console.log('[PWA] ⚠️  Native prompt not available after 5s, showing manual instructions');
    console.log('[PWA] deferredPrompt status:', !!deferredPrompt);
    installPromptShown = true;
    showInstallPromotion();
  } else if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    console.log('[PWA] ✅ Already installed, skipping modal');
  }
}, 5000);

function showInstallPromotion() {
  // Check if already dismissed
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
    console.log('[PWA] Install prompt dismissed recently');
    return;
  }

  // Create modal backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'pwa-install-backdrop';
  backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
        padding: 20px;
      `;

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'pwa-install-modal';
  modal.style.cssText = `
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 480px;
        width: 100%;
        animation: slideUp 0.3s ease-out;
        overflow: hidden;
      `;

  modal.innerHTML = `
        <style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { 
              opacity: 0;
              transform: translateY(30px) scale(0.95);
            }
            to { 
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes slideDown {
            from { 
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            to { 
              opacity: 0;
              transform: translateY(30px) scale(0.95);
            }
          }
        </style>
        
        <!-- Modal Header -->
        <div style="
          background: linear-gradient(135deg, #007acc 0%, #005a9e 100%);
          padding: 32px 24px;
          text-align: center;
          color: white;
        ">
          <div style="
            width: 80px;
            height: 80px;
            margin: 0 auto 16px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <i data-lucide="download-cloud" style="width: 48px; height: 48px;"></i>
          </div>
          <h2 style="
            margin: 0 0 8px 0;
            font-size: 24px;
            font-weight: 700;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">Install MCard Manager</h2>
          <p style="
            margin: 0;
            font-size: 15px;
            opacity: 0.95;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">Get the best experience with our app</p>
        </div>

        <!-- Modal Body -->
        <div style="padding: 24px;">
          <div style="
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="display: flex; align-items: start; gap: 12px;">
              <div style="
                width: 40px;
                height: 40px;
                min-width: 40px;
                background: #e3f2fd;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <i data-lucide="zap" style="width: 20px; height: 20px; color: #007acc;"></i>
              </div>
              <div>
                <div style="font-weight: 600; font-size: 15px; color: #1a1a1a; margin-bottom: 4px;">
                  Lightning Fast
                </div>
                <div style="font-size: 14px; color: #666; line-height: 1.5;">
                  Instant loading and smooth performance
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: start; gap: 12px;">
              <div style="
                width: 40px;
                height: 40px;
                min-width: 40px;
                background: #e8f5e9;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <i data-lucide="wifi-off" style="width: 20px; height: 20px; color: #4caf50;"></i>
              </div>
              <div>
                <div style="font-weight: 600; font-size: 15px; color: #1a1a1a; margin-bottom: 4px;">
                  Works Offline
                </div>
                <div style="font-size: 14px; color: #666; line-height: 1.5;">
                  Access your cards without internet
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: start; gap: 12px;">
              <div style="
                width: 40px;
                height: 40px;
                min-width: 40px;
                background: #fff3e0;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <i data-lucide="smartphone" style="width: 20px; height: 20px; color: #ff9800;"></i>
              </div>
              <div>
                <div style="font-weight: 600; font-size: 15px; color: #1a1a1a; margin-bottom: 4px;">
                  Native Experience
                </div>
                <div style="font-size: 14px; color: #666; line-height: 1.5;">
                  Feels like a native mobile app
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 12px;">
            <button id="modal-install-btn" style="
              flex: 1;
              background: linear-gradient(135deg, #007acc 0%, #005a9e 100%);
              color: white;
              border: none;
              padding: 14px 24px;
              border-radius: 10px;
              font-weight: 600;
              cursor: pointer;
              font-size: 15px;
              transition: all 0.2s;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3);
            ">
              Install Now
            </button>
            <button id="modal-dismiss-btn" style="
              flex: 1;
              background: #f5f5f5;
              color: #666;
              border: none;
              padding: 14px 24px;
              border-radius: 10px;
              font-weight: 600;
              cursor: pointer;
              font-size: 15px;
              transition: all 0.2s;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
              Maybe Later
            </button>
          </div>
        </div>
      `;

  // Add hover effects
  const style = document.createElement('style');
  style.textContent = `
        #modal-install-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 122, 204, 0.4);
        }
        #modal-install-btn:active {
          transform: translateY(0);
        }
        #modal-dismiss-btn:hover {
          background: #e0e0e0;
        }
        @media (max-width: 480px) {
          #pwa-install-modal {
            margin: 0 16px;
          }
        }
      `;
  document.head.appendChild(style);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Close modal function
  function closeModal() {
    backdrop.style.animation = 'fadeOut 0.2s ease-out';
    modal.style.animation = 'slideDown 0.2s ease-out';
    setTimeout(() => backdrop.remove(), 200);
  }

  // Install button handler
  document.getElementById('modal-install-btn').addEventListener('click', async () => {
    console.log('[PWA] 🎯 Install button clicked!');
    console.log('[PWA] deferredPrompt available:', !!deferredPrompt);
    console.log('[PWA] deferredPrompt object:', deferredPrompt);
    console.log('[PWA] User agent:', navigator.userAgent);
    console.log('[PWA] Is standalone:', window.matchMedia('(display-mode: standalone)').matches);
    console.log('[PWA] Navigator standalone:', window.navigator.standalone);

    // Force check if we're on desktop Chrome and should have native prompt
    const isDesktopChrome = /Chrome/i.test(navigator.userAgent) &&
      !/Mobile|Android/i.test(navigator.userAgent) &&
      !/Edge/i.test(navigator.userAgent);
    console.log('[PWA] Is desktop Chrome:', isDesktopChrome);

    if (deferredPrompt) {
      // Native install prompt available (Chrome/Edge/Android)
      console.log('[PWA] 🚀 Triggering native install prompt!');

      try {
        // Show the native install prompt
        const promptResult = await deferredPrompt.prompt();
        console.log('[PWA] Prompt result:', promptResult);

        // Wait for the user's response
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] User choice:', outcome);

        if (outcome === 'accepted') {
          console.log('[PWA] ✅ App installed successfully!');
          // Show success message
          closeModal();
          setTimeout(() => {
            const successMsg = document.createElement('div');
            successMsg.style.cssText = `
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);
                  color: white;
                  padding: 24px 32px;
                  border-radius: 12px;
                  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                  z-index: 10001;
                  font-size: 16px;
                  font-weight: 600;
                  text-align: center;
                  animation: fadeIn 0.3s ease-out;
                `;
            successMsg.innerHTML = `
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <i data-lucide="check-circle" style="width: 24px; height: 24px;"></i>
                    <div>
                      <div style="font-size: 18px; margin-bottom: 4px;">✅ Installation Successful!</div>
                      <div style="font-size: 14px; opacity: 0.9;">MCard Manager is now on your home screen</div>
                    </div>
                  </div>
                `;
            document.body.appendChild(successMsg);
            if (window.lucide) lucide.createIcons();
            setTimeout(() => successMsg.remove(), 4000);
          }, 300);
        } else {
          console.log('[PWA] ❌ User cancelled installation');
          closeModal();
        }

        // Clear the deferred prompt
        deferredPrompt = null;
      } catch (error) {
        console.error('[PWA] ❌ Install prompt error:', error);
        console.error('[PWA] Error details:', error.message, error.stack);

        // Check if it's because app is already installed
        if (error.message && error.message.includes('The app is already installed')) {
          closeModal();
          alert('✅ MCard Manager is already installed on your device!');
        } else {
          // If native prompt fails, show manual instructions
          showManualInstructions();
        }
      }
    } else {
      // No native prompt available - show manual instructions
      console.log('[PWA] ⚠️  Native prompt not available, showing manual instructions');
      console.log('[PWA] Possible reasons:');
      console.log('  - App already installed');
      console.log('  - Browser does not support PWA install');
      console.log('  - User has dismissed prompt too many times');
      console.log('  - Not served over HTTPS (localhost is OK)');
      console.log('  - Service worker not registered');

      // Check if already installed
      if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        closeModal();
        alert('✅ MCard Manager is already installed on your device!');
      } else {
        showManualInstructions();
      }
    }
  });

  // Helper function for manual installation instructions
  function showManualInstructions() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent) && !/Edge/i.test(navigator.userAgent);
    const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);

    let instructions = '';

    if (isIOS) {
      instructions = `
📱 Install on iOS:

1. Tap the Share button (⬆️ square with arrow)
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" in the top right
4. The app icon will appear on your home screen!

✨ You can then open it like any other app.
          `.trim();
    } else if (isAndroid) {
      instructions = `
📱 Install on Android:

1. Tap the menu (⋮) in the top right corner
2. Look for "Add to Home screen" or "Install app"
3. Tap it and confirm
4. The app icon will appear on your home screen!

✨ You can then open it like any other app.

Note: Make sure you're using Chrome or Edge browser.
          `.trim();
    } else if (isChrome) {
      instructions = `
💻 Install on Desktop (Chrome):

1. Click the install icon (⊕) in the address bar
   OR
2. Click menu (⋮) → "Install MCard Manager"
3. Click "Install" in the popup
4. The app will open in its own window!

✨ You can then find it in your applications.
          `.trim();
    } else if (isSafari) {
      instructions = `
💻 Install on Safari:

Safari doesn't support PWA installation on desktop.

Please use Chrome, Edge, or Firefox for the best experience.

Or visit on your iPhone/iPad to install as an app!
          `.trim();
    } else {
      instructions = `
💻 Install on Desktop:

1. Look for an install icon in your browser's address bar
2. Or check your browser's menu for "Install" option
3. Click it to install the app

Supported browsers:
✅ Chrome
✅ Edge
✅ Firefox
✅ Opera

✨ The app will open in its own window!
          `.trim();
    }

    alert(instructions);
    closeModal();
  }

  // Dismiss button handler
  document.getElementById('modal-dismiss-btn').addEventListener('click', () => {
    localStorage.setItem('pwa-install-dismissed', Date.now());
    console.log('[PWA] Install prompt dismissed for 7 days');
    closeModal();
  });

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeModal();
    }
  });

  // Close on ESC key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// Online/Offline Detection
function updateOnlineStatus() {
  const indicator = document.getElementById('offline-indicator');
  if (!navigator.onLine) {
    console.log('[PWA] 🔌 OFFLINE MODE - Working from cache');
    indicator.style.display = 'block';
    if (window.lucide) lucide.createIcons();
  } else {
    console.log('[PWA] 🌐 ONLINE MODE');
    indicator.style.display = 'none';
  }
}

window.addEventListener('online', () => {
  console.log('[PWA] ✅ Connection restored!');
  updateOnlineStatus();
  // Show brief notification
  const indicator = document.getElementById('offline-indicator');
  indicator.style.background = 'linear-gradient(135deg, #51cf66 0%, #37b24d 100%)';
  indicator.innerHTML = '<i data-lucide="wifi" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 8px;"></i>Back online!';
  indicator.style.display = 'block';
  if (window.lucide) lucide.createIcons();
  setTimeout(() => {
    indicator.style.display = 'none';
    indicator.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)';
    indicator.innerHTML = '<i data-lucide="wifi-off" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 8px;"></i>You\'re offline - Working from cache';
  }, 3000);
});

window.addEventListener('offline', () => {
  console.log('[PWA] ⚠️  Connection lost - Switching to offline mode');
  updateOnlineStatus();
});

// Check initial status
window.addEventListener('load', () => {
  updateOnlineStatus();

  // Detect if app is running as PWA
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    console.log('[PWA] Running as installed app');
    document.body.classList.add('pwa-mode');
  }
});

// Handle share target (if app receives shared content)
if (window.location.search.includes('share-target')) {
  console.log('[PWA] Received shared content');
  // Handle shared content here
}

// Apps Toggle Function
function toggleApps() {
  const appsSubmenu = document.getElementById('appsSubmenu');
  const appsChevron = document.getElementById('appsChevron');

  if (appsSubmenu.style.display === 'none') {
    appsSubmenu.style.display = 'block';
    if (appsChevron) {
      appsChevron.style.transform = 'rotate(180deg)';
    }
  } else {
    appsSubmenu.style.display = 'none';
    if (appsChevron) {
      appsChevron.style.transform = 'rotate(0deg)';
    }
  }

  // Re-initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Calendar View Functions
function showCalendar() {
  console.log('[Calendar] Opening calendar view');
  const calendarView = document.getElementById('calendarView');
  const mainContent = document.querySelector('.main-content');

  // Hide main content
  if (mainContent) {
    mainContent.style.display = 'none';
  }

  // Show calendar view
  calendarView.style.display = 'flex';

  // Re-initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  console.log('[Calendar] Calendar view opened');
}

function hideCalendar() {
  console.log('[Calendar] Closing calendar view');
  const calendarView = document.getElementById('calendarView');
  const mainContent = document.querySelector('.main-content');

  // Hide calendar view
  calendarView.style.display = 'none';

  // Show main content
  if (mainContent) {
    mainContent.style.display = 'flex';
  }

  console.log('[Calendar] Calendar view closed');
}

// Map View Functions
function showMap() {
  console.log('[Map] Opening map view');
  const mapView = document.getElementById('mapView');
  const mainContent = document.querySelector('.main-content');

  // Hide main content
  if (mainContent) {
    mainContent.style.display = 'none';
  }

  // Show map view
  mapView.style.display = 'flex';

  // Re-initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  console.log('[Map] Map view opened');
}

function hideMap() {
  console.log('[Map] Closing map view');
  const mapView = document.getElementById('mapView');
  const mainContent = document.querySelector('.main-content');

  // Hide map view
  mapView.style.display = 'none';

  // Show main content
  if (mainContent) {
    mainContent.style.display = 'flex';
  }

  console.log('[Map] Map view closed');
}

// 3D Viewer Functions
function show3DViewer() {
  console.log('[3D Viewer] Opening 3D theater');
  const threeDView = document.getElementById('threeDView');
  const mainContent = document.querySelector('.main-content');

  // Hide main content
  if (mainContent) {
    mainContent.style.display = 'none';
  }

  // Show 3D view
  threeDView.style.display = 'flex';

  // Re-initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  console.log('[3D Viewer] 3D theater opened');
}

function hide3DViewer() {
  console.log('[3D Viewer] Closing 3D theater');
  const threeDView = document.getElementById('threeDView');
  const mainContent = document.querySelector('.main-content');

  // Hide 3D view
  threeDView.style.display = 'none';

  // Show main content
  if (mainContent) {
    mainContent.style.display = 'flex';
  }

  console.log('[3D Viewer] 3D theater closed');
}

/**
 * Toggle Apps submenu visibility
 * Expands/collapses the Apps section in the sidebar to show/hide:
 * - Calendar, Map, 3D Viewer
 * - Music Visualizer V5
 * - Morphism Cube v1 & v2
 */
// NOTE: toggleApps is defined twice in the original file, keeping duplicate for safety
// function toggleApps() { ... } // Already defined above

/**
 * Music Visualizer V5 - Show/Hide Functions
 * Opens the Music Visualizer V5 in full-width iframe
 * Features: Sheet music rendering, 3D frequency visualization, Web Workers, FileLoader caching
 */
function showMusicVisualizer() {
  console.log('[Music] Opening music visualizer');
  const musicView = document.getElementById('musicView');
  const mainContent = document.querySelector('.main-content');

  if (mainContent) {
    mainContent.style.display = 'none';
  }

  musicView.style.display = 'flex';

  if (window.lucide) {
    lucide.createIcons();
  }

  console.log('[Music] Music visualizer opened');
}

function hideMusicVisualizer() {
  console.log('[Music] Closing music visualizer');
  const musicView = document.getElementById('musicView');
  const mainContent = document.querySelector('.main-content');

  musicView.style.display = 'none';

  if (mainContent) {
    mainContent.style.display = 'flex';
  }

  console.log('[Music] Music visualizer closed');
}

/**
 * Morphism Cube v1 - Show/Hide Functions
 * Opens the first version of the Morphism Cube visualization
 * Features: Category theory recursion schemes (catamorphism, anamorphism, etc.) in 3D
 */
function showMorphismV1() {
  console.log('[Morphism] Opening Morphism Cube v1');
  const morphismV1View = document.getElementById('morphismV1View');
  const mainContent = document.querySelector('.main-content');

  if (mainContent) {
    mainContent.style.display = 'none';
  }

  morphismV1View.style.display = 'flex';

  if (window.lucide) {
    lucide.createIcons();
  }

  console.log('[Morphism] Morphism Cube v1 opened');
}

function hideMorphismV1() {
  console.log('[Morphism] Closing Morphism Cube v1');
  const morphismV1View = document.getElementById('morphismV1View');
  const mainContent = document.querySelector('.main-content');

  morphismV1View.style.display = 'none';

  if (mainContent) {
    mainContent.style.display = 'flex';
  }

  console.log('[Morphism] Morphism Cube v1 closed');
}

/**
 * Morphism Cube v2 - Show/Hide Functions
 * Opens the second version of the Morphism Cube visualization
 * Features: Enhanced category theory recursion schemes visualization
 */
function showMorphismV2() {
  console.log('[Morphism] Opening Morphism Cube v2');
  const morphismV2View = document.getElementById('morphismV2View');
  const mainContent = document.querySelector('.main-content');

  if (mainContent) {
    mainContent.style.display = 'none';
  }

  morphismV2View.style.display = 'flex';

  if (window.lucide) {
    lucide.createIcons();
  }

  console.log('[Morphism] Morphism Cube v2 opened');
}

function hideMorphismV2() {
  console.log('[Morphism] Closing Morphism Cube v2');
  const morphismV2View = document.getElementById('morphismV2View');
  const mainContent = document.querySelector('.main-content');

  morphismV2View.style.display = 'none';

  if (mainContent) {
    mainContent.style.display = 'flex';
  }

  console.log('[Morphism] Morphism Cube v2 closed');
}

// ESC key to close any open view
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.getElementById('calendarView').style.display === 'flex') {
      hideCalendar();
    }
    if (document.getElementById('mapView').style.display === 'flex') {
      hideMap();
    }
    if (document.getElementById('threeDView').style.display === 'flex') {
      hide3DViewer();
    }
    if (document.getElementById('musicView').style.display === 'flex') {
      hideMusicVisualizer();
    }
    if (document.getElementById('morphismV1View').style.display === 'flex') {
      hideMorphismV1();
    }
    if (document.getElementById('morphismV2View').style.display === 'flex') {
      hideMorphismV2();
    }
  }
});