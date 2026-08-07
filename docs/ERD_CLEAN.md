```mermaid
erDiagram
  user {
    String id PK
    String name
    String email
    Boolean emailVerified
    String image Nullable
    GlobalRole globalRole
    DateTime createdAt
    DateTime updatedAt
    }
  session {
    String id PK
    DateTime expiresAt
    String token
    DateTime createdAt
    DateTime updatedAt
    String ipAddress Nullable
    String userAgent Nullable
    }
  account {
    String id PK
    String accountId
    String providerId
    String accessToken Nullable
    String refreshToken Nullable
    String idToken Nullable
    DateTime accessTokenExpiresAt Nullable
    DateTime refreshTokenExpiresAt Nullable
    String scope Nullable
    String password Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  verification {
    String id PK
    String identifier
    String value
    DateTime expiresAt
    DateTime createdAt
    DateTime updatedAt
    }
  organizations {
    String id PK
    String name
    Boolean isPersonal
    DateTime createdAt
    DateTime updatedAt
    }
  organization_members {
    String id PK
    OrgRole role
    DateTime createdAt
    }
  calc_actors {
    String id PK
    String displayName
    DateTime createdAt
    }
  billing_plans {
    String id PK
    String name
    Int maxRunsPerMonth
    Int maxRunsPerWorkflow Nullable
    Int priceMonthly Nullable
    Int priceOneTime Nullable
    String currency
    Boolean isActive
    DateTime createdAt
    DateTime updatedAt
    }
  org_billing {
    String id PK
    BillingType billingType
    Int remainingRuns Nullable
    BillingStatus status
    DateTime startedAt
    DateTime expiresAt Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  org_usage {
    String id PK
    DateTime periodStart
    DateTime periodEnd
    Int totalRuns
    DateTime createdAt
    DateTime updatedAt
    }
  Workflow {
    String id PK
    String name
    WorkflowStatus status
    DateTime createdAt
    DateTime updatedAt
    }
  Credential {
    String id PK
    String name
    String value
    CredentialType type
    DateTime createdAt
    DateTime updatedAt
    }
  Node {
    String id PK
    String name
    NodeType type
    Json position
    Json data
    DateTime createdAt
    DateTime updatedAt
    }
  Connection {
    String id PK
    String fromOutput
    String toInput
    DateTime createdAt
    DateTime updatedAt
    }
  Execution {
    String id PK
    ExecutionStatus status
    String error Nullable
    String errorStack Nullable
    DateTime startedAt
    DateTime completedAt Nullable
    String inngestEventId
    Json output Nullable
    }
  calc_workflows {
    String id PK
    String name
    String slug
    String description Nullable
    String category Nullable
    Json tags
    Json metadata
    Json canvasState
    WorkflowStatus status
    Visibility visibility
    String publicSlug Nullable
    LibraryStatus libraryStatus
    Int maxRunsPerUser Nullable
    Int windowSizeMin Nullable
    Int maxRunsTotal Nullable
    DateTime deletedAt Nullable
    DateTime publishedAt Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  calc_versions {
    String id PK
    Int version
    Json snapshot
    String changelog Nullable
    DateTime publishedAt
    }
  calc_drafts {
    String id PK
    Json canvasState
    DateTime savedAt
    }
  calc_nodes {
    String id PK
    CalcNodeType type
    String label
    String description Nullable
    Float positionX
    Float positionY
    Json config
    Json style
    Int sortOrder
    DateTime deletedAt Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  calc_edges {
    String id PK
    String sourceHandle
    String targetHandle
    Json condition Nullable
    String label Nullable
    Json style
    Int sortOrder
    DateTime deletedAt Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  calc_variables {
    String id PK
    String contextKey
    String displayLabel
    String notation
    VariableDataType dataType
    String unit Nullable
    Json defaultValue Nullable
    Json constraints Nullable
    VariableSourceType sourceType Nullable
    VariableScope scope
    String scopeGroupId Nullable
    String description Nullable
    Int sortOrder
    DateTime deletedAt Nullable
    }
  calc_collaborators {
    String id PK
    CollaboratorPermission permission
    DateTime createdAt
    }
  formula_registry {
    String id PK
    String slug
    String name
    String description Nullable
    String category
    String subCategory Nullable
    Json tags
    String expressionNotation
    String displayExpression
    Json inputVariables
    Json outputVariable
    Json intermediateSteps
    String reference Nullable
    String sourceStandard Nullable
    Int yearIntroduced Nullable
    String region Nullable
    String applicability Nullable
    String limitations Nullable
    Int currentVersion
    Boolean isPublished
    Boolean isSystem
    Visibility visibility
    DateTime createdAt
    DateTime updatedAt
    DateTime deletedAt Nullable
    }
  formula_registry_versions {
    String id PK
    Int version
    Json snapshot
    String changelog Nullable
    DateTime createdAt
    }
  table_registry {
    String id PK
    String slug
    String name
    String description Nullable
    String category
    String subCategory Nullable
    Json tags
    TableType tableType
    Json inputKeys
    Json outputKey
    Json columns
    Json data
    Json interpolationConfig Nullable
    String fallbackMode
    Json fallbackValue Nullable
    Boolean allowOverride
    Boolean showInOutput
    String reference Nullable
    String sourceStandard Nullable
    String sourcePage Nullable
    String sourceImage Nullable
    Int currentVersion
    Boolean isPublished
    Boolean isSystem
    Visibility visibility
    DateTime createdAt
    DateTime updatedAt
    DateTime deletedAt Nullable
    }
  table_registry_versions {
    String id PK
    Int version
    Json snapshot
    String changelog Nullable
    DateTime createdAt
    }
  formula_registry_usages {
    String id PK
    Int pinnedVersion Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  table_registry_usages {
    String id PK
    Int pinnedVersion Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  workspaces {
    String id PK
    String name
    String description Nullable
    String icon Nullable
    String color Nullable
    Visibility visibility
    Boolean isTemplate
    Json metadata
    DateTime createdAt
    DateTime updatedAt
    }
  workspace_nodes {
    String id PK
    WorkspaceNodeType nodeType
    String name
    String description Nullable
    String icon Nullable
    String color Nullable
    Int linkedVersion Nullable
    String externalUrl Nullable
    String noteContent Nullable
    Int sortOrder
    Boolean isExpanded
    Boolean isLocked
    Float canvasX Nullable
    Float canvasY Nullable
    Json metadata
    DateTime createdAt
    DateTime updatedAt
    }
  calc_sessions {
    String id PK
    Int versionNum
    SessionStatus status
    Json variables
    String currentNodeId Nullable
    DateTime pausedAt Nullable
    String pauseReason Nullable
    Json executionOrder
    Int currentIndex
    Json inputSnapshot Nullable
    DateTime startedAt Nullable
    DateTime completedAt Nullable
    Int duration Nullable
    Json error Nullable
    RunMode runMode
    Json metadata
    String idempotencyKey Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  calc_node_executions {
    String id PK
    NodeExecutionStatus status
    Int stepNumber
    Json inputVars Nullable
    Json outputVars Nullable
    Json result Nullable
    String error Nullable
    String errorType Nullable
    Json userInput Nullable
    DateTime userInputAt Nullable
    DateTime startedAt Nullable
    DateTime completedAt Nullable
    Int durationMs Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  workspace_sessions {
    String id PK
    Json sharedVariables
    SessionStatus status
    DateTime startedAt
    DateTime completedAt Nullable
    }
  workspace_session_runs {
    String id PK
    Int sortOrder
    SessionStatus status
    DateTime createdAt
    }
  library_submissions {
    String id PK
    SubmissionStatus status
    String adminFeedback Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  calc_ratings {
    String id PK
    Int score
    String review Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  calc_rating_aggregates {
    String id PK
    Float averageRating
    Int ratingCount
    DateTime updatedAt
    }
  batch_jobs {
    String id PK
    String fileName
    String fileUrl Nullable
    Int totalRows
    Json columns
    Json columnMapping
    BatchStatus status
    Int processedRows
    Int successRows
    Int errorRows
    String errorSummary Nullable
    String resultFileUrl Nullable
    DateTime startedAt Nullable
    DateTime completedAt Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  batch_row_executions {
    String id PK
    Int rowNumber
    Json inputData
    BatchRowStatus status
    Json outputData Nullable
    Json variables Nullable
    String error Nullable
    Int durationMs Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  uploaded_datasets {
    String id PK
    String fileName
    String fileType
    Int fileSize
    String storageUrl
    Int rowCount
    Json columns
    Json columnMapping Nullable
    DateTime createdAt
    DateTime updatedAt
    }
  node_templates {
    String id PK
    CalcNodeType type
    String label
    String description Nullable
    Json config
    Json style
    String category Nullable
    Json tags
    Visibility visibility
    Boolean isSystem
    DateTime createdAt
    DateTime updatedAt
    }
  audit_logs {
    String id PK
    AuditResourceType resourceType
    String resourceId
    AuditAction action
    Json changes Nullable
    Json beforeSnapshot Nullable
    Json afterSnapshot Nullable
    String ipAddress Nullable
    String userAgent Nullable
    String sessionId Nullable
    String batchId Nullable
    DateTime expiresAt Nullable
    DateTime createdAt
    }
    "user" |o--|| "GlobalRole" : "enum:globalRole"
    "session" }o--|| user : "user"
    "account" }o--|| user : "user"
    "organizations" }o--|| user : "founder"
    "organization_members" |o--|| "OrgRole" : "enum:role"
    "organization_members" }o--|| organizations : "organization"
    "organization_members" }o--|| user : "user"
    "calc_actors" }o--|| organizations : "organization"
    "calc_actors" }o--|o user : "user"
    "org_billing" |o--|| "BillingType" : "enum:billingType"
    "org_billing" |o--|| "BillingStatus" : "enum:status"
    "org_billing" }o--|| organizations : "organization"
    "org_billing" }o--|| billing_plans : "plan"
    "org_usage" }o--|| organizations : "organization"
    "Workflow" |o--|| "WorkflowStatus" : "enum:status"
    "Workflow" }o--|| user : "user"
    "Credential" |o--|| "CredentialType" : "enum:type"
    "Credential" }o--|| user : "user"
    "Node" |o--|| "NodeType" : "enum:type"
    "Node" }o--|o "Credential" : "credential"
    "Node" }o--|| "Workflow" : "workflow"
    "Connection" }o--|| "Node" : "fromNode"
    "Connection" }o--|| "Node" : "toNode"
    "Connection" }o--|| "Workflow" : "workflow"
    "Execution" |o--|| "ExecutionStatus" : "enum:status"
    "Execution" }o--|| "Workflow" : "workflow"
    "calc_workflows" |o--|| "WorkflowStatus" : "enum:status"
    "calc_workflows" |o--|| "Visibility" : "enum:visibility"
    "calc_workflows" |o--|| "LibraryStatus" : "enum:libraryStatus"
    "calc_workflows" |o--|o calc_versions : "currentVersion"
    "calc_workflows" }o--|| organizations : "organization"
    "calc_versions" }o--|| calc_workflows : "calcWorkflow"
    "calc_versions" }o--|| calc_actors : "publisher"
    "calc_drafts" }o--|| calc_actors : "actor"
    "calc_drafts" }o--|| calc_workflows : "calcWorkflow"
    "calc_nodes" |o--|| "CalcNodeType" : "enum:type"
    "calc_nodes" }o--|| calc_workflows : "calcWorkflow"
    "calc_edges" }o--|| calc_workflows : "calcWorkflow"
    "calc_edges" }o--|| calc_nodes : "sourceNode"
    "calc_edges" }o--|| calc_nodes : "targetNode"
    "calc_variables" |o--|| "VariableDataType" : "enum:dataType"
    "calc_variables" |o--|o "VariableSourceType" : "enum:sourceType"
    "calc_variables" |o--|| "VariableScope" : "enum:scope"
    "calc_variables" }o--|| calc_workflows : "calcWorkflow"
    "calc_variables" }o--|o calc_nodes : "sourceNode"
    "calc_collaborators" |o--|| "CollaboratorPermission" : "enum:permission"
    "calc_collaborators" }o--|| calc_actors : "actor"
    "calc_collaborators" }o--|| calc_workflows : "calcWorkflow"
    "formula_registry" |o--|| "Visibility" : "enum:visibility"
    "formula_registry" }o--|o calc_actors : "creator"
    "formula_registry" }o--|| organizations : "organization"
    "formula_registry_versions" }o--|o calc_actors : "changer"
    "formula_registry_versions" }o--|| formula_registry : "formulaRegistry"
    "table_registry" |o--|| "TableType" : "enum:tableType"
    "table_registry" |o--|| "Visibility" : "enum:visibility"
    "table_registry" }o--|o calc_actors : "creator"
    "table_registry" }o--|| organizations : "organization"
    "table_registry_versions" }o--|o calc_actors : "changer"
    "table_registry_versions" }o--|| table_registry : "tableRegistry"
    "formula_registry_usages" }o--|| calc_nodes : "calcNode"
    "formula_registry_usages" }o--|| calc_workflows : "calcWorkflow"
    "formula_registry_usages" }o--|| formula_registry : "formulaRegistry"
    "table_registry_usages" }o--|| calc_nodes : "calcNode"
    "table_registry_usages" }o--|| calc_workflows : "calcWorkflow"
    "table_registry_usages" }o--|| table_registry : "tableRegistry"
    "workspaces" |o--|| "Visibility" : "enum:visibility"
    "workspaces" }o--|| organizations : "organization"
    "workspace_nodes" |o--|| "WorkspaceNodeType" : "enum:nodeType"
    "workspace_nodes" }o--|o calc_workflows : "linkedWorkflow"
    "workspace_nodes" |o--|o workspace_nodes : "parent"
    "workspace_nodes" }o--|| workspaces : "workspace"
    "calc_sessions" |o--|| "SessionStatus" : "enum:status"
    "calc_sessions" |o--|| "RunMode" : "enum:runMode"
    "calc_sessions" }o--|| calc_actors : "actor"
    "calc_sessions" }o--|| calc_workflows : "calcWorkflow"
    "calc_sessions" }o--|o calc_versions : "version"
    "calc_node_executions" |o--|| "NodeExecutionStatus" : "enum:status"
    "calc_node_executions" }o--|o calc_nodes : "node"
    "calc_node_executions" }o--|| calc_sessions : "session"
    "workspace_sessions" |o--|| "SessionStatus" : "enum:status"
    "workspace_sessions" }o--|| calc_actors : "actor"
    "workspace_sessions" }o--|| workspaces : "workspace"
    "workspace_session_runs" |o--|| "SessionStatus" : "enum:status"
    "workspace_session_runs" }o--|| calc_sessions : "calcSession"
    "workspace_session_runs" }o--|| workspace_nodes : "workspaceNode"
    "workspace_session_runs" }o--|| workspace_sessions : "workspaceSession"
    "library_submissions" |o--|| "SubmissionStatus" : "enum:status"
    "library_submissions" }o--|| calc_versions : "calcVersion"
    "library_submissions" }o--|o calc_actors : "reviewer"
    "library_submissions" }o--|| calc_actors : "submitter"
    "calc_ratings" }o--|| calc_actors : "actor"
    "calc_ratings" }o--|| calc_workflows : "calcWorkflow"
    "calc_ratings" }o--|o calc_versions : "version"
    "calc_rating_aggregates" |o--|| calc_workflows : "calcWorkflow"
    "batch_jobs" |o--|| "BatchStatus" : "enum:status"
    "batch_jobs" }o--|| calc_actors : "actor"
    "batch_jobs" }o--|| calc_workflows : "calcWorkflow"
    "batch_row_executions" |o--|| "BatchRowStatus" : "enum:status"
    "batch_row_executions" }o--|| batch_jobs : "batchJob"
    "uploaded_datasets" }o--|| calc_actors : "actor"
    "uploaded_datasets" }o--|o calc_workflows : "workflow"
    "node_templates" |o--|| "CalcNodeType" : "enum:type"
    "node_templates" |o--|| "Visibility" : "enum:visibility"
    "node_templates" }o--|| organizations : "organization"
    "audit_logs" |o--|| "AuditResourceType" : "enum:resourceType"
    "audit_logs" |o--|| "AuditAction" : "enum:action"
    "audit_logs" }o--|o calc_actors : "actor"
    "audit_logs" }o--|o calc_workflows : "calcWorkflow"
```
