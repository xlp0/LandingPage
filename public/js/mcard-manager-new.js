/**
 * MCard Manager - Main Entry Point
 * Modular architecture for MCard file management
 */

import { MCardManager } from './mcard/MCardManager.js';

// Create global manager instance
const manager = new MCardManager();
window.mcardManager = manager;

// Mobile navigation state
let mobileNavState = 'types'; // 'types', 'cards', 'viewer'

// Mobile navigation functions
window.navigateToCards = () => {
  const mainContent = document.querySelector('.main-content');
  if (mainContent && window.innerWidth <= 640) {
    mainContent.classList.remove('show-viewer');
    mainContent.classList.add('show-cards');
    mobileNavState = 'cards';
  }
};

window.navigateToViewer = () => {
  const mainContent = document.querySelector('.main-content');
  if (mainContent && window.innerWidth <= 640) {
    mainContent.classList.remove('show-cards');
    mainContent.classList.add('show-viewer');
    mobileNavState = 'viewer';
  }
};

window.navigateBack = () => {
  const mainContent = document.querySelector('.main-content');
  if (!mainContent || window.innerWidth > 640) return;
  
  if (mobileNavState === 'viewer') {
    // Go back to cards
    mainContent.classList.remove('show-viewer');
    mainContent.classList.add('show-cards');
    mobileNavState = 'cards';
  } else if (mobileNavState === 'cards') {
    // Go back to types
    mainContent.classList.remove('show-cards');
    mainContent.classList.remove('show-viewer');
    mobileNavState = 'types';
  }
};

// Global functions for HTML onclick handlers
window.selectType = (typeId) => {
  manager.selectType(typeId);
  // On mobile, navigate to cards view
  if (window.innerWidth <= 640) {
    window.navigateToCards();
  }
};

window.viewCard = (hash) => {
  manager.viewCard(hash);
  // On mobile, navigate to viewer
  if (window.innerWidth <= 640) {
    window.navigateToViewer();
  }
};

window.downloadCurrentCard = () => manager.downloadCurrentCard();
window.deleteCurrentCard = () => manager.deleteCurrentCard();
window.createTextCard = () => manager.createTextCard();
window.toggleChat = () => {
  const chatPanel = document.getElementById('chatPanel');
  if (chatPanel) {
    chatPanel.style.display = chatPanel.style.display === 'none' ? 'flex' : 'none';
  }
};

// Edit panel functions
window.closeEditPanel = () => {
  const panel = document.getElementById('editPanel');
  if (panel) {
    panel.classList.add('hidden');
  }
};

window.saveEditedCard = async () => {
  const panel = document.getElementById('editPanel');
  const mode = panel.dataset.mode;
  const hash = panel.dataset.hash;
  const oldHandle = panel.dataset.handle;
  
  const handleInput = document.getElementById('editHandleName');
  const contentArea = document.getElementById('editContentArea');
  
  const newHandle = handleInput.value.trim();
  const content = contentArea.value;
  
  if (!content) {
    alert('Content cannot be empty');
    return;
  }
  
  try {
    if (mode === 'create') {
      // Create new card
      const { MCard } = await import('mcard-js');
      const card = await MCard.create(content);
      await manager.collection.add(card);
      
      // Add handle if provided
      if (newHandle) {
        await manager.collection.addWithHandle(card, newHandle);
      }
      
      await manager.loadCards();
      await manager.viewCard(card.hash);
      window.closeEditPanel();
      
      const message = newHandle ? `Created card with handle @${newHandle}` : 'Card created';
      const { UIComponents } = await import('./mcard/UIComponents.js');
      UIComponents.showToast(message, 'success');
      
    } else if (mode === 'edit') {
      // Update existing card - use updateHandle API
      const { MCard } = await import('mcard-js');
      const newCard = await MCard.create(content);
      await manager.collection.add(newCard);
      
      // ✅ Use updateHandle to point handle to new card (creates version history)
      if (newHandle) {
        await manager.collection.updateHandle(newHandle, newCard);
      }
      
      await manager.loadCards();
      await manager.viewCard(newCard.hash);
      window.closeEditPanel();
      
      const { UIComponents } = await import('./mcard/UIComponents.js');
      UIComponents.showToast(`Saved @${newHandle}`, 'success');
    }
  } catch (error) {
    console.error('[EditPanel] Error saving card:', error);
    alert('Failed to save card: ' + error.message);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[MCard] Starting MCard Manager...');
  await manager.init();
});

// Export for module usage
export default manager;
