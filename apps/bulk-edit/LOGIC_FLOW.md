# Bulk Edit App - Logic Flow Documentation

This document describes the architecture, logic flow, and key components of the Bulk Edit Contentful App.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Component Structure](#component-structure)
- [Data Flow](#data-flow)
- [Key Features](#key-features)
- [State Management](#state-management)
- [API Interactions](#api-interactions)

---

## Overview

The Bulk Edit app enables users to edit multiple entry fields simultaneously within a Contentful space. It provides a spreadsheet-like interface for selecting and modifying field values across entries of a selected content type.

### Key Capabilities

- Browse and filter entries by content type
- Search entries with text and numeric queries
- Filter by entry status (Draft, Changed, Published)
- Select individual cells or entire columns for bulk editing
- Apply the same value to multiple selected entry fields
- Undo bulk edit operations
- Field validation before saving

---

## Architecture

### High-Level Application Flow

```mermaid
flowchart TB
    subgraph Init["Initialization"]
        A[App.tsx] --> B{Check Location}
        B -->|Page Location| C[Page Component]
        C --> D[Initialize i18n]
        D --> E[Fetch Content Types]
    end

    subgraph Main["Main Interface"]
        E --> F[Content Type Sidebar]
        F -->|Select Content Type| G[Fetch Fields & Entries]
        G --> H[Entry Table]
    end

    subgraph Actions["User Actions"]
        H --> I{User Selection}
        I -->|Select Cells| J[Enable Edit Button]
        J --> K[Open Bulk Edit Modal]
        K --> L[Field Editor + Validation]
        L --> M{Valid?}
        M -->|Yes| N[Batch Update Entries]
        M -->|No| L
        N --> O[Success Notification]
        O --> P{Undo?}
        P -->|Yes| Q[Undo Modal]
        Q --> R[Restore Backups]
        P -->|No| H
    end
```

---

## Component Structure

### Component Hierarchy

```mermaid
flowchart TB
    App[App.tsx] --> Page[Page/index.tsx]

    Page --> Sidebar[ContentTypeSidebar]
    Page --> Search[SearchBar]
    Page --> Filters[Filter Components]
    Page --> Table[EntryTable]
    Page --> EditModal[BulkEditModal]
    Page --> UndoModal[UndoBulkEditModal]

    Filters --> SortMenu
    Filters --> StatusFilter[FilterMultiselect - Status]
    Filters --> ColumnFilter[FilterMultiselect - Columns]

    Table --> TableHeader
    Table --> TableRow

    EditModal --> FieldEditor
    EditModal --> FieldValidation

    FieldValidation --> ValidationExecutor
    ValidationExecutor --> ValidationCommands[Validation Commands]
```

### Component Responsibilities

| Component            | Responsibility                                 |
| -------------------- | ---------------------------------------------- |
| `Page`               | Main orchestrator, state management, API calls |
| `ContentTypeSidebar` | Content type navigation and selection          |
| `SearchBar`          | Text/numeric search with debouncing            |
| `FilterMultiselect`  | Status and column filtering                    |
| `SortMenu`           | Entry sorting options                          |
| `EntryTable`         | Virtual scrolling table with selection         |
| `TableHeader`        | Column headers with bulk selection             |
| `TableRow`           | Individual entry row with cell checkboxes      |
| `BulkEditModal`      | Field editing interface                        |
| `FieldEditor`        | Dynamic field type editors                     |
| `FieldValidation`    | Real-time validation display                   |
| `UndoBulkEditModal`  | Undo confirmation dialog                       |

---

## Data Flow

### Content Type and Entry Loading

```mermaid
sequenceDiagram
    participant User
    participant Page
    participant CMA as Contentful CMA
    participant State

    Note over Page: On Mount
    Page->>CMA: getAllContentTypes()
    CMA-->>Page: ContentTypeProps[]
    Page->>State: setContentTypes()
    Page->>State: setSelectedContentTypeId(first)

    Note over Page: On Content Type Change
    Page->>CMA: contentType.get()
    CMA-->>Page: ContentTypeProps
    Page->>CMA: editorInterface.get()
    CMA-->>Page: EditorInterfaceProps
    Page->>Page: mapContentTypePropsToFields()
    Page->>State: setFields()
    Page->>State: setCurrentContentType()

    Note over Page: Fetch Entries
    Page->>Page: buildQuery()
    Page->>CMA: fetchEntriesWithBatching()
    CMA-->>Page: EntryProps[]
    Page->>Page: filterEntriesByStatus()
    Page->>Page: filterEntriesByNumericSearch()
    Page->>State: setEntries()
    Page->>State: setTotalEntries()
```

### Entry Fetching Strategy

```mermaid
flowchart TB
    Start[Build Query] --> Check{Needs Client Filtering?}

    Check -->|No| ServerPagination[Server-side Pagination]
    ServerPagination --> FetchBatch[Fetch with skip/limit]

    Check -->|Yes| ClientPagination[Client-side Pagination]
    ClientPagination --> FetchAll[Fetch up to 1000 entries]
    FetchAll --> StatusFilter[Filter by Status]
    StatusFilter --> NumericFilter{Numeric Search?}
    NumericFilter -->|Yes| FilterNumeric[Filter by numeric value]
    NumericFilter -->|No| Skip[Skip numeric filter]
    FilterNumeric --> Paginate
    Skip --> Paginate
    Paginate[Client-side Paginate]

    FetchBatch --> Display[Display in Table]
    Paginate --> Display
```

---

## Key Features

### Cell Selection and Keyboard Navigation

```mermaid
stateDiagram-v2
    [*] --> NoFocus: Page Load

    NoFocus --> CellFocused: Click Cell
    CellFocused --> CellFocused: Arrow Keys
    CellFocused --> RangeSelected: Shift+Arrow
    CellFocused --> ColumnSelected: Alt+Space
    RangeSelected --> RangeSelected: Shift+Arrow
    RangeSelected --> CellFocused: Arrow (no shift)
    ColumnSelected --> CellFocused: Arrow Key
    CellFocused --> NoFocus: Escape
    RangeSelected --> NoFocus: Escape

    CellFocused --> CheckboxToggled: Space
    CheckboxToggled --> CellFocused: Complete
```

#### Keyboard Shortcuts

| Key                 | Action                 |
| ------------------- | ---------------------- |
| Arrow Keys          | Navigate cells         |
| Shift + Arrow       | Extend selection range |
| Alt + Shift + Arrow | Select to edge         |
| Alt + Space         | Select entire column   |
| Space               | Toggle cell checkbox   |
| Tab                 | Move to next cell      |
| Escape              | Clear focus            |

### Bulk Edit Flow

```mermaid
sequenceDiagram
    participant User
    participant Table as EntryTable
    participant Page
    participant Modal as BulkEditModal
    participant Editor as FieldEditor
    participant Validator as ValidationExecutor
    participant CMA

    User->>Table: Select cells (checkboxes)
    Table->>Page: onSelectionChange()
    Page->>Page: setSelectedEntryIds()
    Page->>Page: setSelectedField()

    User->>Page: Click "Bulk edit"
    Page->>Modal: Open (isOpen=true)
    Modal->>Editor: Render field editor

    User->>Editor: Enter new value
    Editor->>Modal: onChange(value)
    Modal->>Validator: validate(value)
    Validator-->>Modal: ValidationResult

    alt Has Errors
        Modal->>Modal: Disable Save button
    else No Errors
        User->>Modal: Click Save
        Modal->>Page: onSave(value)

        loop For each batch
            Page->>Page: Create backup
            Page->>CMA: entry.update()
            CMA-->>Page: Updated entry
            Page->>Page: Update editionCount
        end

        Page->>Page: updateEntriesList()
        Page->>User: Success notification
    end
```

### Undo Operation Flow

```mermaid
sequenceDiagram
    participant User
    participant Notification
    participant UndoModal
    participant Page
    participant CMA

    Note over Page: After successful bulk edit
    Page->>Page: Store backups in lastUpdateBackup
    Page->>Notification: Show success with Undo link

    User->>Notification: Click Undo
    Notification->>Page: Open Undo Modal
    Page->>UndoModal: Show confirmation

    User->>UndoModal: Confirm Undo
    UndoModal->>Page: onUndo()

    Page->>CMA: Fetch current entries
    CMA-->>Page: Current EntryProps[]

    loop For each entry in backup
        Page->>CMA: entry.update(backup.fields)
        CMA-->>Page: Restored entry
    end

    Page->>Page: updateEntriesList()
    Page->>Page: Clear lastUpdateBackup
    Page->>User: "Undo complete" notification
```

---

## State Management

### Main Page State

```mermaid
flowchart LR
    subgraph ContentTypes["Content Type State"]
        CT1[contentTypes]
        CT2[selectedContentTypeId]
        CT3[currentContentType]
        CT4[contentTypeLoading]
    end

    subgraph Entries["Entry State"]
        E1[entries]
        E2[entriesLoading]
        E3[totalEntries]
        E4[initialTotal]
    end

    subgraph Fields["Field State"]
        F1[fields]
        F2[selectedColumns]
        F3[selectedField]
    end

    subgraph Selection["Selection State"]
        S1[selectedEntryIds]
        S2[tableKey]
    end

    subgraph Filters["Filter State"]
        FI1[searchQuery]
        FI2[selectedStatuses]
        FI3[sortOption]
    end

    subgraph Pagination["Pagination State"]
        P1[activePage]
        P2[itemsPerPage]
    end

    subgraph Modal["Modal State"]
        M1[isModalOpen]
        M2[isUndoModalOpen]
        M3[isSaving]
    end

    subgraph Updates["Update State"]
        U1[failedUpdates]
        U2[lastUpdateBackup]
        U3[totalUpdateCount]
        U4[editionCount]
    end
```

### State Update Triggers

```mermaid
flowchart TB
    subgraph Triggers["User Actions"]
        T1[Select Content Type]
        T2[Change Search Query]
        T3[Change Status Filter]
        T4[Change Sort Option]
        T5[Change Page]
        T6[Select Cells]
        T7[Save Edit]
    end

    subgraph Effects["Side Effects"]
        E1[Fetch Content Type + Fields]
        E2[Fetch Entries]
        E3[Update Selection]
        E4[Update Entry List]
    end

    T1 --> E1
    T1 --> E2
    T2 --> E2
    T3 --> E2
    T4 --> E2
    T5 --> E2
    T6 --> E3
    T7 --> E4
```

---

## API Interactions

### Batch Processing Strategy

The app uses batch processing to handle Contentful API rate limits:

```mermaid
flowchart TB
    subgraph Fetching["Entry Fetching"]
        F1[Start with batch size 100]
        F1 --> F2{Response too large?}
        F2 -->|Yes| F3[Reduce batch size by half]
        F3 --> F2
        F2 -->|No| F4[Process batch]
        F4 --> F5{More entries?}
        F5 -->|Yes| F1
        F5 -->|No| F6[Return all entries]
    end

    subgraph Updating["Entry Updating"]
        U1[Group entries in batches of 50]
        U1 --> U2[Process batch concurrently]
        U2 --> U3[Wait 200ms delay]
        U3 --> U4{More batches?}
        U4 -->|Yes| U2
        U4 -->|No| U5[Return results]
    end
```

### API Constants

| Constant                      | Value | Purpose                          |
| ----------------------------- | ----- | -------------------------------- |
| `DEFAULT_BATCH_SIZE` (fetch)  | 100   | Entries per fetch batch          |
| `MIN_BATCH_SIZE`              | 2     | Minimum batch size on errors     |
| `DEFAULT_BATCH_SIZE` (update) | 50    | Entries per update batch         |
| `DEFAULT_DELAY_MS`            | 200   | Delay between update batches     |
| `DEFAULT_PAGINATION_LIMIT`    | 1000  | Max entries for client filtering |

---

## Validation System

### Validation Architecture

```mermaid
flowchart TB
    subgraph Input["Input"]
        Field[ContentTypeField]
        Value[User Input Value]
    end

    subgraph Executor["ValidationExecutor"]
        Init[Initialize with field]
        Init --> CreateCommands[Create validation commands]
        CreateCommands --> FieldValidations[Field-level validations]
        CreateCommands --> ItemValidations[Array item validations]
    end

    subgraph Commands["Validation Commands"]
        RequiredValidation
        SizeValidation
        RangeValidation
        RegexpValidation
        ProhibitRegexpValidation
        InValidation
        DateRangeValidation
    end

    subgraph Output["Output"]
        Result[ValidationResult]
        Errors[Error Messages]
    end

    Field --> Init
    Value --> Execute[Execute validations]
    FieldValidations --> Execute
    ItemValidations --> Execute
    Execute --> Result
    Result --> Errors
```

### Validation Command Pattern

Each validation type implements the `ValidationCommand` interface:

```mermaid
classDiagram
    class ValidationCommand {
        <<interface>>
        +validate(value: any): ValidationError | null
    }

    class BaseValidationCommand {
        #customMessage?: string
        +validate(value: any): ValidationError | null
    }

    class RequiredValidation {
        +validate(value: any): ValidationError | null
    }

    class SizeValidation {
        -min?: number
        -max?: number
        +validate(value: any): ValidationError | null
    }

    class RangeValidation {
        -min?: number
        -max?: number
        +validate(value: any): ValidationError | null
    }

    class RegexpValidation {
        -pattern: string
        -flags?: string
        +validate(value: any): ValidationError | null
    }

    class InValidation {
        -allowedValues: any[]
        +validate(value: any): ValidationError | null
    }

    class DateRangeValidation {
        -min?: string
        -max?: string
        +validate(value: any): ValidationError | null
    }

    ValidationCommand <|.. BaseValidationCommand
    BaseValidationCommand <|-- RequiredValidation
    BaseValidationCommand <|-- SizeValidation
    BaseValidationCommand <|-- RangeValidation
    BaseValidationCommand <|-- RegexpValidation
    BaseValidationCommand <|-- InValidation
    BaseValidationCommand <|-- DateRangeValidation
```

---

## Field Editor System

### Supported Field Types and Editors

```mermaid
flowchart LR
    subgraph FieldTypes["Field Types"]
        Symbol
        Text
        Number
        Integer
        Date
        Boolean
        Array
        Object
    end

    subgraph Editors["Field Editors"]
        SingleLine[SingleLineEditor]
        MultipleLine[MultipleLineEditor]
        NumberEd[NumberEditor]
        DateEd[DateEditor]
        BooleanEd[BooleanEditor]
        TagsEd[TagsEditor]
        DropdownEd[DropdownEditor]
        RadioEd[RadioEditor]
        ListEd[ListEditor]
        CheckboxEd[CheckboxEditor]
        JsonEd[JsonEditor]
    end

    Symbol --> SingleLine
    Symbol --> DropdownEd
    Symbol --> RadioEd
    Text --> MultipleLine
    Number --> NumberEd
    Integer --> NumberEd
    Date --> DateEd
    Boolean --> BooleanEd
    Array --> TagsEd
    Array --> ListEd
    Array --> CheckboxEd
    Object --> JsonEd
```

### Non-Editable Field Types

The following field types cannot be bulk edited:

- Location
- Link (Asset/Entry references)
- ResourceLink
- RichText
- Arrays of references (Entry/Asset links)

---

## Entry Status Logic

### Status Determination

```mermaid
flowchart TB
    Entry[Entry] --> Check1{publishedVersion exists?}
    Check1 -->|No| Draft[Draft]
    Check1 -->|Yes| Check2{version >= publishedVersion + 2?}
    Check2 -->|Yes| Changed[Changed]
    Check2 -->|No| Check3{version === publishedVersion + 1?}
    Check3 -->|Yes| Published[Published]
    Check3 -->|No| Unknown[Unknown]

    Draft --> Yellow[Warning Badge]
    Changed --> Blue[Primary Badge]
    Published --> Green[Positive Badge]
```

### Status Filtering Logic

| Selected Statuses   | API Filter                  | Client Filter       |
| ------------------- | --------------------------- | ------------------- |
| Draft only          | `publishedAt[exists]=false` | None                |
| Published only      | `publishedAt[exists]=true`  | Filter to Published |
| Changed only        | `publishedAt[exists]=true`  | Filter to Changed   |
| Published + Changed | `publishedAt[exists]=true`  | None                |
| All statuses        | None                        | None                |

---

## Error Handling

### Update Error Flow

```mermaid
flowchart TB
    Start[Batch Update] --> Try{Try Update}
    Try -->|Success| Success[Add to successful list]
    Try -->|Fail| Fail[Add to failedUpdates]

    Success --> Next{More entries?}
    Fail --> Next

    Next -->|Yes| Try
    Next -->|No| Check{Any failures?}

    Check -->|Yes| ShowError[Display ErrorNote]
    Check -->|No| ShowSuccess[Display Success Notification]

    ShowError --> UserAction{User Action}
    UserAction -->|Dismiss| ClearErrors[Clear failedUpdates]
    UserAction -->|Retry| Start
```

---

## Performance Optimizations

### Virtual Scrolling

The `EntryTable` component uses `@tanstack/react-virtual` for efficient rendering of large entry lists, only rendering visible rows.

### Debounced Search

The `SearchBar` component debounces user input (300ms default) to prevent excessive API calls during typing.

### Batch Processing

- Entry fetching uses adaptive batch sizes, reducing on response size errors
- Entry updates process in batches of 50 with 200ms delays to respect rate limits

### Memoization

- Field mappings are memoized to prevent unnecessary recalculations
- Field API objects are memoized in FieldEditor to prevent recreation
