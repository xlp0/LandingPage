/**
 * MCard Manager - Main Entry Point
 * Modular architecture for MCard file management
 */

import { MCardManager } from './mcard/MCardManager.js';

// Create global manager instance
const manager = new MCardManager();
window.mcardManager = manager;

// Global functions for HTML onclick handlers
window.selectType = (typeId) => manager.selectType(typeId);
window.viewCard = (hash) => manager.viewCard(hash);
window.downloadCurrentCard = () => manager.downloadCurrentCard();
window.deleteCurrentCard = () => manager.deleteCurrentCard();
window.createTextCard = () => manager.createTextCard();
window.toggleChat = () => {
  const chatPanel = document.getElementById('chatPanel');
  if (chatPanel) {
    chatPanel.style.display = chatPanel.style.display === 'none' ? 'flex' : 'none';
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[MCard] Starting MCard Manager...');
  await manager.init();
});

// Export for module usage
export default manager;
