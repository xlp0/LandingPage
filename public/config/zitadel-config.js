/**
 * ZITADEL Configuration for PKC
 * 
 * IMPORTANT: You need to create an application in ZITADEL Console first:
 * 1. Go to https://zit.pkc.pub
 * 2. Create a new project (if not exists)
 * 3. Create a new application with type "Web" / "User Agent"
 * 4. Set redirect URIs to match your deployment URLs
 * 5. Copy the Client ID here
 */

const ZITADEL_CONFIG = {
  // ZITADEL instance URL
  issuer: 'https://zit.pkc.pub',
  
  // Client ID from ZITADEL Console
  clientId: '363313097403859529@landingpage',
  
  // Redirect URI - where ZITADEL redirects after login
  // For local development: http://localhost:3000/public/examples/games/monopoly-auth.html
  // For production: https://pkc.pub/public/examples/games/monopoly-auth.html
  redirectUri: window.location.origin + window.location.pathname,
  
  // OAuth scopes
  scope: 'openid profile email',
  
  // Optional: Organization ID if using multi-tenancy
  organizationId: null
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZITADEL_CONFIG;
}
