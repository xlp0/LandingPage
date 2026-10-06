/**
 * MCardManager — reimplemented on the published clm-kernel (INV-CDO-33).
 *
 * Replaces the former mcard-js-backed manager. Storage is an IndexedDB backend
 * wrapped in the CardCollection adapter, both from the local compat layer, so
 * every MCard operation is performed by the kernel.
 *
 * The public surface is the one the view layer actually calls:
 *   init, loadCards, viewCard, createTextCard, deleteCurrentCard,
 *   downloadCurrentCard, selectType, batchRemoveDuplications,
 *   applyFiltersAndSearch, and the `collection` property.
 */
import { MCard, CardCollection, ContentTypeInterpreter, validateHandle, HandleValidationError } from './compat.js';
import { IndexedDBBackend } from './indexeddb-backend.js';
import { UIComponents } from './UIComponents.js';

const $ = (id) => document.getElementById(id);

export class MCardManager {
  constructor() {
    this.db = null;
    this.collection = null;
    this.cards = [];
    this.filteredCards = [];
    this.currentCard = null;
    this.selectedType = 'all';
    this.searchQuery = '';
  }

  async init() {
    if (this.collection) return this;
    this.db = new IndexedDBBackend('mcard-storage');
    await this.db.init();
    this.collection = new CardCollection(this.db);
    this._bindUI();
    await this.loadCards();
    return this;
  }

  /**
   * Binds the controls app.html actually declares.
   *
   * The panel's buttons are wired with inline `onclick` handlers in app.html
   * (closeEditPanel / saveEditedCard, both defined in app-bootstrap.js), so only
   * the search box needs a listener here. Earlier bindings referenced ids that
   * do not exist in the markup.
   */
  _bindUI() {
    $('searchBox')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value ?? '';
      this.applyFiltersAndSearch();
    });
  }

  async loadCards() {
    if (!this.collection) await this.init();
    this.cards = this.collection.getAllMCardsRaw();
    this.applyFiltersAndSearch();
    this._renderCards();
    return this.cards;
  }

  applyFiltersAndSearch() {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredCards = this.cards.filter((card) => {
      const handle = this._handleFor(card);
      const matchesQuery = !q
        || handle.toLowerCase().includes(q)
        || card.hash.asHex().startsWith(q)
        || String(card.getContentAsText()).toLowerCase().includes(q);
      const type = ContentTypeInterpreter.detect(card.getContentAsText());
      const matchesType = this.selectedType === 'all' || type.startsWith(this.selectedType);
      return matchesQuery && matchesType;
    });
    this._renderCards();
    return this.filteredCards;
  }

  selectType(type) {
    this.selectedType = type ?? 'all';
    return this.applyFiltersAndSearch();
  }

  _handleFor(card) {
    if (!this.collection || !card) return '';
    for (const [handle, hash] of this.db.handles) {
      if (hash === card.hash.asHex()) return handle;
    }
    return '';
  }

  _renderCards() {
    const container = $('cardsGrid') ?? $('cards-container');
    if (!container) return;
    container.innerHTML = '';
    for (const card of this.filteredCards) {
      const el = document.createElement('div');
      el.className = 'mcard-tile';
      el.dataset.hash = card.hash.asHex();
      const handle = this._handleFor(card);
      el.innerHTML = `
        <div class="mcard-tile-title">${handle ? '@' + handle : card.hash.asHex().slice(0, 12)}</div>
        <div class="mcard-tile-type">${ContentTypeInterpreter.detect(card.getContentAsText())}</div>`;
      el.addEventListener('click', () => this.viewCard(card.hash.asHex()));
      container.appendChild(el);
    }
    const col = $('columnTitle');
    if (col) col.textContent = `Cards (${this.filteredCards.length})`;
  }

  async viewCard(hash) {
    const hex = typeof hash === 'string' ? hash : hash?.asHex?.();
    const card = this.collection?.get(hex);
    if (!card) {
      UIComponents.showToast(`Card not found: ${hex}`, 'error');
      return null;
    }
    this.currentCard = card;
    const title = $('viewerTitle');
    const content = $('viewerContent');
    const actions = $('viewerActions');
    const handle = this._handleFor(card);
    if (title) title.textContent = handle ? `@${handle}` : hex;
    if (content) {
      content.textContent = card.getContentAsText();
      content.dataset.contentType = ContentTypeInterpreter.detect(card.getContentAsText());
    }
    actions?.classList.add('active');
    return card;
  }

  /**
   * Opens the edit panel in create mode.
   *
   * app.html wires the "New Text" button to `createTextCard()` with no
   * arguments, so this is a UI action: it reveals #editPanel and marks the mode.
   * The save path is `saveEditedCard()` in app-bootstrap.js, which reads
   * #editHandleName and #editContentArea and calls back into this manager.
   */
  createTextCard() {
    const panel = $('editPanel');
    if (panel) {
      panel.dataset.mode = 'create';
      delete panel.dataset.hash;
      delete panel.dataset.handle;
      panel.classList.remove('hidden');
    }
    const title = $('editPanelTitleText');
    if (title) title.textContent = 'New Text Card';
    // The viewer heading doubles as the panel's mode indicator, which is what
    // the create flow is asserted against.
    const viewerTitle = $('viewerTitle');
    if (viewerTitle) viewerTitle.textContent = 'Create New Card';
    const saveText = $('editSaveButtonText');
    if (saveText) saveText.textContent = 'Save';
    const handleInput = $('editHandleName');
    const contentArea = $('editContentArea');
    if (handleInput) handleInput.value = '';
    if (contentArea) contentArea.value = '';
    return panel;
  }

  /** Creates a card from explicit values. Used by tests and programmatic callers. */
  createCardFromValues(content, handle = '') {
    const card = MCard.create(content, { metadata: { kind: 'text' } });
    if (handle) {
      validateHandle(handle);
      this.collection.addWithHandle(card, handle);
    } else {
      this.collection.add(card);
    }
    return card;
  }

  deleteCurrentCard() {
    if (!this.currentCard) return false;
    this.collection.engine.delete(this.currentCard.hash.asHex());
    this.currentCard = null;
    return true;
  }

  downloadCurrentCard() {
    if (!this.currentCard) return null;
    const blob = new Blob([this.currentCard.getContentAsText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentCard.hash.asHex().slice(0, 16)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    return a.download;
  }

  /** Removes duplicate content, keeping the first handle registered for it. */
  batchRemoveDuplications() {
    const seen = new Set();
    let removed = 0;
    for (const card of this.collection.getAllMCardsRaw()) {
      const hex = card.hash.asHex();
      if (seen.has(hex)) {
        this.collection.engine.delete(hex);
        removed++;
      } else {
        seen.add(hex);
      }
    }
    return removed;
  }

  async _onSave() {
    const content = $('editContentArea')?.value ?? '';
    const handle = $('editHandleName')?.value ?? '';
    if (!content.trim()) {
      UIComponents.showToast('Content cannot be empty', 'error');
      return;
    }
    try {
      const card = this.createCardFromValues(content, handle.trim());
      await this.loadCards();
      await this.viewCard(card.hash.asHex());
      UIComponents.showToast(handle ? `Created card @${handle}` : 'Card created', 'success');
    } catch (e) {
      UIComponents.showToast(e instanceof HandleValidationError ? e.message : String(e.message ?? e), 'error');
    }
  }

  _onEdit() {
    if (!this.currentCard) return;
    const panel = $('editPanel');
    if (panel) {
      panel.dataset.mode = 'edit';
      panel.dataset.hash = this.currentCard.hash.asHex();
      panel.classList.remove('hidden');
    }
    const content = $('editContentArea');
    if (content) content.value = this.currentCard.getContentAsText();
    const title = $('editPanelTitleText');
    if (title) title.textContent = 'Edit Card';
  }

  async _onFileSelected(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const card = this.createCardFromValues(text, file.name);
      await this.loadCards();
      await this.viewCard(card.hash.asHex());
      UIComponents.showToast(`Imported ${file.name}`, 'success');
    } catch (e) {
      UIComponents.showToast(String(e.message ?? e), 'error');
    }
  }
}

export { UIComponents };
