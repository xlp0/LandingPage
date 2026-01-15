function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');

  // Re-initialize Lucide icons after DOM change
  if (window.lucide) {
    setTimeout(() => lucide.createIcons(), 100);
  }
}

// Initialize sidebar state - keep expanded on all devices
function initializeSidebarState() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) {
    console.warn('[Sidebar] Element not found');
    return;
  }

  // Always keep sidebar expanded (remove collapsed class if present)
  if (sidebar.classList.contains('collapsed')) {
    sidebar.classList.remove('collapsed');
  }
  console.log('[Sidebar] Initialized as expanded (width: ' + window.innerWidth + 'px)');
}

// Run immediately when script loads
initializeSidebarState();

// Also run on DOMContentLoaded to be safe
window.addEventListener('DOMContentLoaded', initializeSidebarState);

// Note: Removed auto-collapse on resize - sidebar stays expanded unless user manually collapses it
// Users can still manually toggle using the collapse button

// Search filter functionality
function toggleSearchFilters() {
  const filtersPanel = document.getElementById('searchFilters');
  const toggleBtn = document.getElementById('filterToggleBtn');

  console.log('[Filter] Toggle clicked, current display:', filtersPanel.style.display);

  if (filtersPanel.style.display === 'none' || filtersPanel.style.display === '') {
    filtersPanel.style.display = 'block';
    toggleBtn.classList.add('active');
    console.log('[Filter] Showing filters panel');
  } else {
    filtersPanel.style.display = 'none';
    toggleBtn.classList.remove('active');
    console.log('[Filter] Hiding filters panel');
  }

  // Re-initialize Lucide icons
  if (window.lucide) {
    setTimeout(() => lucide.createIcons(), 100);
  }
}

function applySearchFilters() {
  // Get filter values
  const withHandles = document.getElementById('filterWithHandles').checked;
  const capital = document.getElementById('filterCapital').checked;
  const markdown = document.getElementById('filterMarkdown').checked;
  const images = document.getElementById('filterImages').checked;
  const videos = document.getElementById('filterVideos').checked;
  const sortBy = document.querySelector('input[name="sortBy"]:checked').value;

  // Store filters in window object for MCardManager to access
  window.searchFilters = {
    withHandles,
    capital,
    markdown,
    images,
    videos,
    sortBy
  };

  // Trigger search update
  if (window.mcardManager) {
    window.mcardManager.applyFiltersAndSearch();
  }
}

function clearSearchFilters() {
  // Uncheck all checkboxes
  document.getElementById('filterWithHandles').checked = false;
  document.getElementById('filterCapital').checked = false;
  document.getElementById('filterMarkdown').checked = false;
  document.getElementById('filterImages').checked = false;
  document.getElementById('filterVideos').checked = false;

  // Reset sort to newest
  document.querySelector('input[name="sortBy"][value="newest"]').checked = true;

  // Clear filters and refresh
  window.searchFilters = null;
  if (window.mcardManager) {
    window.mcardManager.applyFiltersAndSearch();
  }
}

// Close filters when clicking outside
document.addEventListener('click', function (event) {
  const filtersPanel = document.getElementById('searchFilters');
  const toggleBtn = document.getElementById('filterToggleBtn');
  const searchBox = document.getElementById('searchBox');

  if (filtersPanel && toggleBtn && searchBox) {
    if (!filtersPanel.contains(event.target) &&
      !toggleBtn.contains(event.target) &&
      !searchBox.contains(event.target)) {
      filtersPanel.style.display = 'none';
      toggleBtn.classList.remove('active');
    }
  }
});
