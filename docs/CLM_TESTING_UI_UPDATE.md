# CLM Testing UI Update

## Overview

Dashboard header telah diperbarui untuk menampilkan informasi testing yang lebih jelas dan terstruktur.

## Layout Baru

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏢 CLM Dashboard [SINGLE VIEW] [1st testing]                        │
│                                                                      │
│              ✅ Latest Test: Success                                 │
│              [📊 View GitHub Actions]                                │
│                                                                 🔐 Login │
└─────────────────────────────────────────────────────────────────────┘
```

## Komponen UI

### 1. Test Run Badge (Next to SINGLE VIEW)
**Location**: Sebelah kanan "SINGLE VIEW" badge  
**Format**: `{ordinal} testing` (e.g., "1st testing", "2nd testing", "3rd testing")  
**Data Source**: `test_run` dari JSON  
**Color**: 
- Success: Green `rgba(46, 204, 113, 0.3)`
- Failure: Red `rgba(231, 76, 60, 0.3)`
- Unknown: Gray `rgba(255, 255, 255, 0.3)`

**Example**:
```html
<span id="testRunBadge" class="clm-badge">
  1st testing
</span>
```

### 2. Latest Test Status (Center Top)
**Location**: Center of header, top line  
**Format**: `{icon} Latest Test: {status}`  
**Data Source**: `status` dari JSON  
**Status Values**:
- ✅ Success (green text)
- ❌ Error (red text)
- ❓ Unknown (white text)

**Example**:
```html
<div id="testStatusText">
  ✅ Latest Test: <span style="color: #2ecc71;">Success</span>
</div>
```

### 3. GitHub Actions Link Button (Center Bottom)
**Location**: Center of header, below status text  
**Format**: Button with icon and text  
**Data Source**: `github_actions_url` dari JSON  
**Behavior**: 
- Opens GitHub Actions in new tab
- Hover effect: scale(1.05) + shadow
- Hidden if no data available

**Example**:
```html
<a id="testStatusLink" href="https://github.com/.../runs/123" target="_blank">
  📊 View GitHub Actions
</a>
```

## Data Mapping

### JSON Structure
```json
{
  "hash": "welcome",
  "timestamp": "2025-12-03T03:52:14Z",
  "test_run": 1,
  "status": "failure",
  "github_actions_url": "https://github.com/xlp0/LandingPage/actions/runs/19881718284",
  "commit_sha": "c7cc7e2d146d50d7a8b165e6d067b2f803a3fa80",
  "branch": "main",
  "actor": "alessandrorumampuk"
}
```

### UI Mapping

| JSON Field | UI Element | Display Format |
|------------|------------|----------------|
| `test_run` | Test Run Badge | "1st testing", "2nd testing", etc. |
| `status` | Status Text | "✅ Latest Test: Success" or "❌ Latest Test: Error" |
| `github_actions_url` | Link Button | "📊 View GitHub Actions" (clickable) |

## Ordinal Number Function

```javascript
const getOrdinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Examples:
getOrdinal(1)   // "1st"
getOrdinal(2)   // "2nd"
getOrdinal(3)   // "3rd"
getOrdinal(4)   // "4th"
getOrdinal(11)  // "11th"
getOrdinal(21)  // "21st"
getOrdinal(22)  // "22nd"
getOrdinal(100) // "100th"
```

## Color Scheme

### Success State
- Badge Background: `rgba(46, 204, 113, 0.3)` (green transparent)
- Text Color: `#2ecc71` (solid green)
- Icon: ✅

### Failure State
- Badge Background: `rgba(231, 76, 60, 0.3)` (red transparent)
- Text Color: `#e74c3c` (solid red)
- Icon: ❌

### Unknown/Error State
- Badge Background: `rgba(255, 193, 7, 0.2)` (yellow transparent)
- Text Color: `rgba(255, 193, 7, 0.9)` (yellow)
- Icon: ⚠️

## Responsive Behavior

### Desktop (> 768px)
- All elements visible
- Full text display
- Button with full text

### Mobile (< 768px)
- Elements stack vertically
- Abbreviated text
- Icon-only button (optional future enhancement)

## Error Handling

### When JSON Load Fails
```javascript
// Test Run Badge
testRunBadge.innerHTML = 'No data';
testRunBadge.style.background = 'rgba(255, 193, 7, 0.2)';

// Status Text
testStatusText.innerHTML = '⚠️ No test data available';
testStatusText.style.color = 'rgba(255, 193, 7, 0.9)';

// Link Button
testStatusLink.style.display = 'none';
```

## Auto-Refresh

- Initial load: On page load (DOMContentLoaded)
- Interval: Every 5 minutes (300,000ms)
- Method: `setInterval(loadTestStatus, 5 * 60 * 1000)`

## Tooltips

### Test Run Badge
```
Test run #1 - Success
```

### Status Text
```
Status: Success
Date: 12/3/2024 12:42:14 PM
Branch: main
Commit: c7cc7e2
```

## Interactive Effects

### Test Run Badge
- Hover: Tooltip appears
- Click: None (static display)

### Status Text
- Hover: Tooltip with full details
- Click: None (static display)

### GitHub Actions Button
- Hover: 
  - Scale: 1.05
  - Shadow: `0 4px 12px rgba(102, 126, 234, 0.4)`
- Click: Opens GitHub Actions in new tab

## Implementation Notes

1. **Ordinal Suffix**: Automatically calculates "1st", "2nd", "3rd", etc.
2. **Color Coordination**: Badge background and text color match status
3. **Graceful Degradation**: Shows warning if data unavailable
4. **Accessibility**: Tooltips provide additional context
5. **Performance**: Minimal DOM manipulation, efficient updates

## Future Enhancements

1. **Multiple Components**: Show status for all CLM components
2. **History Graph**: Mini chart showing test trend
3. **Notification**: Browser notification on test failure
4. **Filter**: Filter by component hash
5. **Export**: Download test history as CSV

---

**Last Updated**: 2024-12-03  
**Version**: 2.0.0
