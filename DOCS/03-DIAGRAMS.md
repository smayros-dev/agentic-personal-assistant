# 📊 Documentation Technique - Diagrammes Mermaid

## 1. Diagramme d'Architecture Haute Niveau (C4 Model)

### System Context
```mermaid
graph TB
    User["👤 User<br/>(Browser)"]
    System["🏗️ Agentic Personal<br/>Assistant<br/>(Web Application)"]
    Ollama["🤖 Ollama<br/>(Local LLM)"]
    VectorDB["📚 Vector Store<br/>(Chroma/Pinecone)"]
    
    User -->|Chat, Upload, Export| System
    System -->|Query/Generate| Ollama
    System -->|Semantic Search| VectorDB
    Ollama -.->|Local inference| System
    VectorDB -.->|Search results| System
```

### Container Diagram
```mermaid
graph TB
    subgraph Client["Client Tier"]
        Browser["🌐 Web Browser<br/>React SPA<br/>Vite"]
    end
    
    subgraph API["API Tier"]
        Express["🔌 Express Server<br/>- Routes<br/>- Middleware<br/>- CORS/Auth"]
    end
    
    subgraph Business["Business Logic Tier"]
        Agent["Agent<br/>LLM orchestration"]
        Ingest["Ingest<br/>PDF processing"]
        Search["Search<br/>Query engine"]
        Export["Export<br/>Data export"]
    end
    
    subgraph Data["Data Tier"]
        SQLite["💾 SQLite<br/>- Documents<br/>- Conversations<br/>- Messages"]
        VectorStore["📚 Vector Store<br/>Chroma/Pinecone<br/>Embeddings"]
    end
    
    subgraph External["External Services"]
        Ollama["🤖 Ollama<br/>Language Model"]
        Pinecone["☁️ Pinecone<br/>Vector Database"]
    end
    
    Browser -->|HTTP/REST| Express
    Express -->|Orchestrate| Agent
    Express -->|Orchestrate| Ingest
    Express -->|Orchestrate| Search
    Express -->|Orchestrate| Export
    
    Agent --> SQLite
    Ingest --> SQLite
    Search --> SQLite
    Export --> SQLite
    
    Agent --> VectorStore
    Ingest --> VectorStore
    Search --> VectorStore
    
    Agent -->|Call| Ollama
    Ingest -->|Embeddings| Ollama
    VectorStore -->|Fallback| Pinecone
```

---

## 2. Diagrammes de Séquence

### Scénario 1: Chat avec Contexte de Document

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as Express API
    participant DB as SQLite
    participant VectorDB as Chroma/Pinecone
    participant LLM as Ollama
    
    User->>Frontend: Type message & Send
    Frontend->>Frontend: Validate & cache
    Frontend->>API: POST /api/chat<br/>{message, sessionId, model}
    
    API->>API: requireApiKey middleware ✓
    API->>API: rateLimiter check ✓
    
    API->>DB: saveMessage(user, message)
    Note over DB: Store user message
    DB-->>API: OK
    
    API->>VectorDB: Search similar chunks<br/>query=message
    VectorDB-->>API: [relevantChunks]
    
    API->>LLM: POST /api/generate<br/>prompt=context+message<br/>model=selected
    LLM-->>API: {response}
    
    API->>DB: saveMessage(assistant, response)
    DB-->>API: OK
    
    API-->>Frontend: {answer, model}
    Frontend->>Frontend: Update UI
    Frontend->>Frontend: Save to localStorage
    Frontend-->>User: Display answer
```

### Scénario 2: Upload & Ingestion de Document PDF

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as Express API
    participant FileSystem
    participant PDFParser as PDFLoader
    participant Chunker as Text Splitter
    participant VectorDB as Vector Store
    participant SQLite
    
    User->>Frontend: Select PDF file
    Frontend->>Frontend: Validate file type & size
    Frontend->>API: POST /api/ingest<br/>multipart/form-data
    
    API->>API: receiveFile middleware
    API->>FileSystem: Save temp file<br/>/tmp/filename
    
    API->>PDFParser: Load PDF from path
    PDFParser-->>API: [pages]
    
    API->>Chunker: Split text into chunks<br/>chunk_size=1000
    Chunker-->>API: [chunks]
    
    API->>API: Filter metadata<br/>(remove non-serializable)
    
    API->>VectorDB: Store embeddings<br/>chunks + metadata
    VectorDB-->>API: collection_id
    
    API->>SQLite: insertDocument<br/>fileName, fileSize, pageCount
    SQLite-->>API: OK
    
    API->>FileSystem: Delete temp file
    
    API-->>Frontend: {success, chunksCount, pageCount}
    Frontend-->>User: Success notification
```

### Scénario 3: Export Multi-Format

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as Express API
    participant DB as SQLite
    participant Export as Export Module
    
    User->>Frontend: Click "Export as CSV"
    Frontend->>API: GET /api/export/documents/csv
    
    API->>API: requireApiKey middleware ✓
    
    API->>Export: exportDocumentsAsCSV(docs)
    API->>DB: SELECT * FROM documents
    DB-->>API: [documents]
    
    Export->>Export: Format as CSV<br/>- Add headers<br/>- Escape quotes
    Export-->>API: csvString
    
    API->>API: Set headers<br/>Content-Disposition: attachment<br/>Content-Type: text/csv
    
    API-->>Frontend: csvString
    Frontend->>Frontend: Trigger download<br/>documents.csv
    Frontend-->>User: File saved
```

### Scénario 4: Recherche Avancée avec Facettes

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as Express API
    participant SearchModule as advancedSearch.js
    participant SQLite
    
    User->>Frontend: Enter search query<br/>"quarterly report"
    Frontend->>API: POST /api/documents/search/advanced<br/>{query, sortBy, limit, offset}
    
    API->>API: requireApiKey middleware ✓
    
    API->>SearchModule: advancedSearch(options)
    
    SearchModule->>SQLite: SELECT COUNT(*) FROM documents<br/>WHERE LOWER(fileName) LIKE ?
    SQLite-->>SearchModule: total count
    
    SearchModule->>SQLite: SELECT * FROM documents<br/>WHERE LOWER(fileName) LIKE ?<br/>ORDER BY uploadedAt DESC<br/>LIMIT ? OFFSET ?
    SQLite-->>SearchModule: [results]
    
    SearchModule-->>API: {results, pagination}
    
    API->>SearchModule: getSearchFacets()
    SearchModule->>SQLite: GROUP BY queries
    SQLite-->>SearchModule: facetData
    
    SearchModule-->>API: facets
    
    API-->>Frontend: {results, pagination, facets}
    Frontend->>Frontend: Display results<br/>+ facet filters
    Frontend-->>User: Show search results
```

---

## 3. Diagramme de Classe / Entités

### Modèle Objet (Frontend)

```mermaid
classDiagram
    class Message {
        +String id
        +String conversationId
        +String role (user|assistant)
        +String content
        +String model
        +Date createdAt
    }
    
    class Conversation {
        +String id
        +String sessionId
        +Date createdAt
        +Date updatedAt
        +Message[] messages
        +addMessage(msg): void
        +clearMessages(): void
    }
    
    class Document {
        +String id
        +String fileName
        +Number fileSize
        +Number pageCount
        +Date uploadedAt
        +String[] chunks
    }
    
    class Session {
        +String id
        +String name
        +Conversation conversation
        +Document[] documents
        +String selectedModel
        +close(): void
    }
    
    class ChatState {
        +Session[] sessions
        +Session currentSession
        +Message[] messages
        +setSessions(sessions): void
        +setCurrentSession(session): void
    }
    
    Conversation "1" *-- "many" Message
    Session "1" o-- "1" Conversation
    Session "1" *-- "many" Document
    ChatState "1" o-- "many" Session
```

### Modèle Données (Backend)

```mermaid
erDiagram
    DOCUMENTS ||--o{ CHUNKS : contains
    CONVERSATIONS ||--o{ MESSAGES : contains
    DOCUMENTS ||--o{ SEARCH_HISTORY : searched
    
    DOCUMENTS {
        string id PK
        string fileName
        integer fileSize
        integer pageCount
        timestamp uploadedAt
        timestamp createdAt
    }
    
    CONVERSATIONS {
        string id PK
        string sessionId UK
        timestamp createdAt
        timestamp updatedAt
    }
    
    MESSAGES {
        string id PK
        string conversationId FK
        string role
        text content
        string model
        timestamp createdAt
    }
    
    CHUNKS {
        string id PK
        string documentId FK
        text content
        string embedding
        integer chunkIndex
    }
    
    SEARCH_HISTORY {
        string id PK
        string documentId FK
        string query
        integer ranking
        timestamp searchedAt
    }
```

---

## 4. Diagramme Entity-Relationship (ERD) Détaillé

```mermaid
erDiagram
    %%{init: {'theme': 'default', 'themeVariables': { 'primaryColor':'#fff', 'primaryTextColor':'#000', 'primaryBorderColor':'#333', 'fontSize':'12px'}}}%%
    
    USERS ||--o{ SESSIONS : creates
    SESSIONS ||--o{ CONVERSATIONS : has
    CONVERSATIONS ||--o{ MESSAGES : contains
    DOCUMENTS ||--o{ CHUNKS : splits_into
    CONVERSATIONS ||--o{ DOCUMENTS : uses
    
    USERS {
        string user_id PK
        string email UK
        string password_hash
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    SESSIONS {
        string session_id PK
        string user_id FK
        string name
        string model
        timestamp created_at
        timestamp updated_at
        boolean is_active
    }
    
    CONVERSATIONS {
        string conversation_id PK
        string session_id FK
        timestamp created_at
        timestamp updated_at
        integer message_count
    }
    
    MESSAGES {
        string message_id PK
        string conversation_id FK
        string role "user|assistant"
        text content
        string model
        integer tokens_used
        timestamp created_at
    }
    
    DOCUMENTS {
        string document_id PK
        string file_name
        integer file_size
        integer page_count
        string file_hash
        string mime_type
        timestamp uploaded_at
        timestamp created_at
    }
    
    CHUNKS {
        string chunk_id PK
        string document_id FK
        text content
        integer chunk_index
        integer char_count
        float[] embedding "vector"
        timestamp created_at
    }
```

---

## 5. Diagrammes d'État

### Message State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft
    
    Draft --> Sending: User clicks Send
    Draft --> Cancelled: User cancels
    
    Sending --> Processing: Request sent
    Sending --> NetworkError: Connection failed
    
    Processing --> LLMProcessing: Ollama generating
    Processing --> VectorSearch: Searching context
    
    LLMProcessing --> Received: Response ready
    VectorSearch --> Received: Results ready
    
    Received --> Displaying: Rendering in UI
    Displaying --> Saved: Persisted to DB
    
    Saved --> [*]
    
    NetworkError --> Draft: Retry
    LLMError --> Draft: Retry
    
    Cancelled --> [*]
```

### Document Upload State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> FileSelected: User selects PDF
    FileSelected --> Validating: Check size & type
    
    Validating --> ValidationFailed: Invalid file
    ValidationFailed --> Idle: Try again
    
    Validating --> Uploading: Valid file
    Uploading --> Parsing: Processing at server
    
    Parsing --> Chunking: Splitting text
    Chunking --> Embedding: Computing vectors
    
    Embedding --> VectorStorage: Storing in DB
    VectorStorage --> Persisting: Registering document
    
    Persisting --> Success: Upload complete
    Success --> [*]
    
    Uploading --> UploadError: Transfer failed
    Parsing --> ParseError: Invalid PDF
    Embedding --> EmbedError: LLM error
    
    UploadError --> Idle: Retry
    ParseError --> Idle: Retry
    EmbedError --> Idle: Retry
```

### Search Query State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> Typing: User types query
    Typing --> Debouncing: Waiting for user
    
    Debouncing --> Executing: Search triggered
    Typing --> Executing: User clicks search
    
    Executing --> Querying: Database query
    Querying --> Aggregating: Collecting facets
    
    Aggregating --> Results: Results ready
    Results --> Displaying: Render UI
    
    Displaying --> [*]
    
    Querying --> Error: Query failed
    Error --> Idle: Retry
    
    Displaying --> Idle: User clears search
```

### Export Process State Machine

```mermaid
stateDiagram-v2
    [*] --> SelectFormat
    
    SelectFormat --> JSON: User chooses JSON
    SelectFormat --> CSV: User chooses CSV
    SelectFormat --> Text: User chooses Text
    
    JSON --> Serializing: Convert to JSON
    CSV --> Formatting: Add headers & escape
    Text --> Rendering: Format report
    
    Serializing --> Generating
    Formatting --> Generating
    Rendering --> Generating: Finalize
    
    Generating --> Downloading: Send file
    Downloading --> SaveLocal: Browser saves
    SaveLocal --> [*]
```

---

## 6. Diagramme de Flux API

```mermaid
graph LR
    Client["Client<br/>Request"]
    
    Client -->|POST /api/chat| ChatRoute["Chat Route<br/>handler"]
    Client -->|POST /api/ingest| IngestRoute["Ingest Route<br/>handler"]
    Client -->|GET /api/documents| ListRoute["List Route<br/>handler"]
    Client -->|POST /api/documents/search/advanced| SearchRoute["Search Route<br/>handler"]
    Client -->|GET /api/export/documents/csv| ExportRoute["Export Route<br/>handler"]
    
    ChatRoute --> ChatBusiness["Business Logic<br/>agent.runAgent()"]
    IngestRoute --> IngestBusiness["Business Logic<br/>ingest.processFile()"]
    ListRoute --> ListBusiness["Business Logic<br/>documents.list()"]
    SearchRoute --> SearchBusiness["Business Logic<br/>advancedSearch.query()"]
    ExportRoute --> ExportBusiness["Business Logic<br/>export.asCSV()"]
    
    ChatBusiness --> ChatDB["Database<br/>chatHistory<br/>documents"]
    IngestBusiness --> IngestDB["Database<br/>documents"]
    ListBusiness --> ListDB["Database<br/>documents"]
    SearchBusiness --> SearchDB["Database<br/>documents"]
    ExportBusiness --> ExportDB["Database<br/>documents<br/>conversations"]
    
    ChatBusiness --> ChatExt["External<br/>Ollama<br/>VectorDB"]
    IngestBusiness --> IngestExt["External<br/>VectorDB"]
    
    ChatDB --> Response["Response<br/>{answer}"]
    IngestDB --> Response
    ListDB --> Response
    SearchDB --> Response
    ExportDB --> Response
    
    ChatExt -.-> Response
    IngestExt -.-> Response
    
    Response -->|JSON| Client
```

---

## 7. Diagramme de Composants Frontend

```mermaid
graph TB
    App["App.jsx<br/>Main Container"]
    
    App --> ChatInterface["ChatInterface<br/>- Message display<br/>- Input box<br/>- Send button"]
    
    App --> DocumentManager["DocumentManager<br/>- File upload<br/>- Document list<br/>- Search/Filter<br/>- Export buttons"]
    
    App --> ModelSelector["ModelSelector<br/>- Dropdown menu<br/>- Model list<br/>- onChange handler"]
    
    App --> SessionManager["SessionManager<br/>- Session list<br/>- Create/Delete<br/>- Switch session"]
    
    ChatInterface --> Hooks["useChat Hook<br/>- sendMessage()<br/>- clearChat()"]
    DocumentManager --> DocHooks["useDocuments Hook<br/>- uploadFile()<br/>- searchDocs()<br/>- deleteDoc()"]
    ModelSelector --> ModelHooks["useModels Hook<br/>- loadModels()<br/>- selectModel()"]
    
    Hooks --> API["API Client<br/>fetch() wrapper"]
    DocHooks --> API
    ModelHooks --> API
    
    API --> Backend["Express Backend<br/>/api/..."]
```

---

**Document Version**: 1.0  
**Dernière mise à jour**: Février 2025
