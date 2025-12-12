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
        await manager.collection.setHandle(newHandle, card.hash);
      }
      
      await manager.loadCards();
      await manager.viewCard(card.hash);
      window.closeEditPanel();
      
      const message = newHandle ? `Created card with handle @${newHandle}` : 'Card created';
      const { UIComponents } = await import('./mcard/UIComponents.js');
      UIComponents.showToast(message, 'success');
      
    } else if (mode === 'edit') {
      // Update existing card
      const { MCard } = await import('mcard-js');
      const newCard = await MCard.create(content);
      await manager.collection.add(newCard);
      
      // Update handle to point to new card
      if (newHandle) {
        await manager.collection.setHandle(newHandle, newCard.hash);
      }
      
      await manager.loadCards();
      await manager.viewCard(newCard.hash);
      window.closeEditPanel();
      
      const { UIComponents } = await import('./mcard/UIComponents.js');
      UIComponents.showToast(`Updated @${newHandle}`, 'success');
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
