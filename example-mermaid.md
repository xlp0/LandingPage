# MCard Architecture with Mermaid Diagrams

This document demonstrates Mermaid diagram support in the MCard Manager.

## Hash-Based Hyperlinks

MCards use content-addressable storage, so each file has a unique SHA-256 hash. You can link between MCards using hash-based hyperlinks!

**Example:** Click this link to view another MCard → [View Related MCard](hash:c4a522a88ed4915ccc9b7b3c334b00eec018c1bc23aacfc0e4f63b5f4f1888d6)

You can also reference it inline: The [related document](hash:c4a522a88ed4915ccc9b7b3c334b00eec018c1bc23aacfc0e4f63b5f4f1888d6) contains important information about the MCard service.

**Multiple links:** You can create multiple links in the same document:
- [First MCard](hash:c4a522a88ed4915ccc9b7b3c334b00eec018c1bc23aacfc0e4f63b5f4f1888d6)
- [Second MCard](hash:f6058fe25ef47ae8554c58c01cb536aa71d8532277cf1900cbd1d64caad917cc)
- [Third MCard](hash:2e125d23a57866a17c3a20e45db0baa17c09e8e473851eb1da8cf39cff6c6df6)

## System Architecture

```mermaid
graph TB
    A[User] -->|Upload File| B[MCard Manager]
    B -->|Create MCard| C[MCard.create]
    C -->|Calculate Hash| D[SHA-256]
    D -->|Store| E[IndexedDB]
    B -->|Detect Type| F[detectContentType]
    F -->|Check Patterns| G{Content Type?}
    G -->|Markdown| H[MarkdownRenderer]
    G -->|Image| I[ImageRenderer]
    G -->|PDF| J[PDFRenderer]
    G -->|Text| K[TextRenderer]
```

## Content Rendering Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as MCard Manager
    participant Redux as Redux Store
    participant Renderer as Renderer Registry
    participant Marked as marked.js
    
    User->>UI: Click on MCard
    UI->>Redux: dispatch(renderContent)
    Redux->>Redux: Detect content type
    Redux-->>UI: Return type: 'markdown'
    UI->>Renderer: render('markdown', content)
    Renderer->>Marked: Load marked.js
    Marked-->>Renderer: Library loaded
    Renderer->>Marked: parse(markdown)
    Marked-->>Renderer: HTML output
    Renderer-->>UI: Rendered HTML
    UI->>User: Display content
```

## State Management

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: User uploads file
    Loading --> TypeDetection: File loaded
    TypeDetection --> Rendering: Type detected
    Rendering --> Displayed: Render complete
    Displayed --> Idle: User closes
    
    TypeDetection --> Error: Detection failed
    Rendering --> Error: Render failed
    Error --> Idle: User dismisses
```

## Data Flow

```mermaid
flowchart LR
    A[File Upload] --> B{Detect Type}
    B -->|Text| C[Check Patterns]
    B -->|Binary| D[Check Magic Bytes]
    
    C -->|Has Hash| E[Markdown]
    C -->|Has Braces| F[JSON]
    C -->|Plain| G[Text]
    
    D -->|89 50 4E 47| H[PNG]
    D -->|FF D8 FF| I[JPEG]
    D -->|25 50 44 46| J[PDF]
    
    E --> K[Render]
    F --> K
    G --> K
    H --> K
    I --> K
    J --> K
```

## Class Diagram

```mermaid
classDiagram
    class MCard {
        +String hash
        +Uint8Array content
        +String g_time
        +getContent()
        +getContentAsText()
        +create(data)
    }
    
    class BaseRenderer {
        <<abstract>>
        +render(content, options)
        +escapeHtml(text)
    }
    
    class MarkdownRenderer {
        +loadMarked()
        +loadHighlight()
        +processHandles()
        +render(content, options)
    }
    
    class ImageRenderer {
        +render(content, options)
    }
    
    class PDFRenderer {
        +loadPDFJS()
        +renderPDFPages()
        +render(content, options)
    }
    
    class RendererRegistry {
        -Map renderers
        +register(type, renderer)
        +hasRenderer(type)
        +render(type, content, options)
    }
    
    BaseRenderer <|-- MarkdownRenderer
    BaseRenderer <|-- ImageRenderer
    BaseRenderer <|-- PDFRenderer
    RendererRegistry o-- BaseRenderer
```

## Timeline

```mermaid
timeline
    title MCard Manager Development
    2024-12 : Initial Setup
            : IndexedDB Integration
            : Basic UI
    2024-12 : Content Detection
            : Type Detection System
            : Magic Byte Analysis
    2024-12 : Renderer System
            : Markdown Renderer
            : Image Renderer
            : PDF Renderer
    2024-12 : Redux Integration
            : State Management
            : Type Detection in Redux
    2024-12 : Pure MCard
            : Remove localStorage
            : Content-based Detection
```

## Entity Relationship

```mermaid
erDiagram
    MCARD ||--o{ CONTENT : contains
    MCARD {
        string hash PK
        bytes content
        datetime g_time
    }
    CONTENT ||--|| TYPE : has
    CONTENT {
        string data
        string type
    }
    TYPE {
        string name
        string mimeType
        string displayName
    }
    RENDERER ||--o{ TYPE : renders
    RENDERER {
        string name
        function render
    }
```

## Pie Chart: Content Types

```mermaid
pie title Content Types in MCard Manager
    "Markdown" : 30
    "Images" : 25
    "PDF" : 20
    "Text" : 15
    "JSON" : 10
```

## Git Graph

```mermaid
gitGraph
    commit id: "Initial commit"
    commit id: "Add IndexedDB"
    branch feature-renderers
    checkout feature-renderers
    commit id: "Add BaseRenderer"
    commit id: "Add MarkdownRenderer"
    commit id: "Add ImageRenderer"
    checkout main
    merge feature-renderers
    commit id: "Add Redux integration"
    branch refactor-pure-mcard
    checkout refactor-pure-mcard
    commit id: "Remove localStorage"
    commit id: "Add content detection"
    checkout main
    merge refactor-pure-mcard
    commit id: "Production ready"
```

## Conclusion

This example demonstrates various Mermaid diagram types:
- Flowcharts
- Sequence diagrams
- State diagrams
- Class diagrams
- Timeline
- Entity-relationship diagrams
- Pie charts
- Git graphs

All rendered beautifully in the MCard Manager! 🎨
