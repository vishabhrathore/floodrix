```mermaid
erDiagram

        GlobalRole {
            USER USER
SUPER_ADMIN SUPER_ADMIN
        }
    


        Visibility {
            PRIVATE PRIVATE
PUBLIC PUBLIC
        }
    


        OrgRole {
            OWNER OWNER
ADMIN ADMIN
MEMBER MEMBER
        }
    


        WorkflowStatus {
            DRAFT DRAFT
PUBLISHED PUBLISHED
ARCHIVED ARCHIVED
DEPRECATED DEPRECATED
        }
    


        LibraryStatus {
            NONE NONE
PENDING PENDING
LISTED LISTED
UNLISTED UNLISTED
        }
    


        CollaboratorPermission {
            VIEW VIEW
EDIT EDIT
ADMIN ADMIN
        }
    


        SessionStatus {
            PENDING PENDING
RUNNING RUNNING
PAUSED PAUSED
COMPLETED COMPLETED
ERRORED ERRORED
CANCELLED CANCELLED
TIMED_OUT TIMED_OUT
        }
    


        RunMode {
            SINGLE SINGLE
BATCH BATCH
API API
        }
    


        NodeExecutionStatus {
            PENDING PENDING
WAITING WAITING
RUNNING RUNNING
COMPLETED COMPLETED
SKIPPED SKIPPED
ERRORED ERRORED
        }
    


        CalcNodeType {
            INPUT INPUT
FORMULA FORMULA
LOOKUP_TABLE LOOKUP_TABLE
GRAPH_INTERPOLATION GRAPH_INTERPOLATION
DECISION DECISION
DISPLAY DISPLAY
COMMENT COMMENT
MULTI_FORMULA MULTI_FORMULA
LOOP LOOP
SUBWORKFLOW SUBWORKFLOW
UNIT_CONVERSION UNIT_CONVERSION
VALIDATION VALIDATION
API_CALL API_CALL
CHART CHART
TABLE_BUILDER TABLE_BUILDER
PDF_REPORT PDF_REPORT
GROUP GROUP
PARALLEL PARALLEL
CUSTOM_CODE CUSTOM_CODE
REFERENCE_IMAGE REFERENCE_IMAGE
        }
    


        VariableDataType {
            NUMBER NUMBER
STRING STRING
BOOLEAN BOOLEAN
ARRAY ARRAY
OBJECT OBJECT
        }
    


        VariableSourceType {
            USER_INPUT USER_INPUT
FORMULA_OUTPUT FORMULA_OUTPUT
LOOKUP_RESULT LOOKUP_RESULT
INTERPOLATION_RESULT INTERPOLATION_RESULT
DECISION_SET DECISION_SET
COMPUTED COMPUTED
EXTERNAL EXTERNAL
        }
    


        VariableScope {
            GLOBAL GLOBAL
GROUP_SCOPED GROUP_SCOPED
NODE_LOCAL NODE_LOCAL
        }
    


        TableType {
            RANGE_LOOKUP RANGE_LOOKUP
EXACT_LOOKUP EXACT_LOOKUP
MULTI_KEY_LOOKUP MULTI_KEY_LOOKUP
INTERPOLATION_1D INTERPOLATION_1D
INTERPOLATION_2D INTERPOLATION_2D
CLASSIFICATION CLASSIFICATION
        }
    


        WorkspaceNodeType {
            ROOT ROOT
FOLDER FOLDER
WORKFLOW_LINK WORKFLOW_LINK
SEPARATOR SEPARATOR
EXTERNAL_LINK EXTERNAL_LINK
NOTE NOTE
        }
    


        BatchStatus {
            PENDING PENDING
PROCESSING PROCESSING
COMPLETED COMPLETED
FAILED FAILED
CANCELLED CANCELLED
        }
    


        BatchRowStatus {
            PENDING PENDING
SUCCESS SUCCESS
ERROR ERROR
        }
    


        SubmissionStatus {
            PENDING PENDING
APPROVED APPROVED
REJECTED REJECTED
        }
    


        ExecutionStatus {
            RUNNING RUNNING
SUCCESS SUCCESS
FAILED FAILED
        }
    


        CredentialType {
            OPENAI OPENAI
ANTHROPIC ANTHROPIC
GEMINI GEMINI
        }
    


        NodeType {
            INITIAL INITIAL
MANUAL_TRIGGER MANUAL_TRIGGER
HTTP_REQUEST HTTP_REQUEST
GOOGLE_FORM_TRIGGER GOOGLE_FORM_TRIGGER
STRIPE_TRIGGER STRIPE_TRIGGER
ANTHROPIC ANTHROPIC
GEMINI GEMINI
OPENAI OPENAI
DISCORD DISCORD
SLACK SLACK
        }
    


        BillingType {
            SUBSCRIPTION SUBSCRIPTION
ONE_TIME ONE_TIME
        }
    


        BillingStatus {
            ACTIVE ACTIVE
CANCELED CANCELED
EXPIRED EXPIRED
        }
    


        AuditResourceType {
            WORKFLOW WORKFLOW
NODE NODE
EDGE EDGE
VARIABLE VARIABLE
FORMULA_REGISTRY FORMULA_REGISTRY
TABLE_REGISTRY TABLE_REGISTRY
WORKSPACE WORKSPACE
WORKSPACE_NODE WORKSPACE_NODE
BATCH_JOB BATCH_JOB
UPLOADED_DATASET UPLOADED_DATASET
        }
    


        AuditAction {
            CREATED CREATED
UPDATED UPDATED
DELETED DELETED
PUBLISHED PUBLISHED
ARCHIVED ARCHIVED
RESTORED RESTORED
DUPLICATED DUPLICATED
IMPORTED IMPORTED
EXPORTED EXPORTED
NODE_ADDED NODE_ADDED
NODE_REMOVED NODE_REMOVED
NODE_MOVED NODE_MOVED
NODE_CONFIG_CHANGED NODE_CONFIG_CHANGED
NODE_TYPE_CHANGED NODE_TYPE_CHANGED
EDGE_CREATED EDGE_CREATED
EDGE_DELETED EDGE_DELETED
EDGE_RECONNECTED EDGE_RECONNECTED
VARIABLE_ADDED VARIABLE_ADDED
VARIABLE_REMOVED VARIABLE_REMOVED
VARIABLE_RENAMED VARIABLE_RENAMED
VARIABLE_REBOUND VARIABLE_REBOUND
REGISTRY_ITEM_CREATED REGISTRY_ITEM_CREATED
REGISTRY_ITEM_UPDATED REGISTRY_ITEM_UPDATED
REGISTRY_VERSION_PUBLISHED REGISTRY_VERSION_PUBLISHED
REGISTRY_LINKED REGISTRY_LINKED
REGISTRY_UNLINKED REGISTRY_UNLINKED
REGISTRY_VERSION_PINNED REGISTRY_VERSION_PINNED
WORKFLOW_RUN_STARTED WORKFLOW_RUN_STARTED
WORKFLOW_RUN_COMPLETED WORKFLOW_RUN_COMPLETED
WORKFLOW_RUN_ERRORED WORKFLOW_RUN_ERRORED
WORKFLOW_RUN_CANCELLED WORKFLOW_RUN_CANCELLED
WORKFLOW_PAUSED WORKFLOW_PAUSED
WORKFLOW_RESUMED WORKFLOW_RESUMED
USER_INPUT_SUBMITTED USER_INPUT_SUBMITTED
FOLDER_CREATED FOLDER_CREATED
FOLDER_MOVED FOLDER_MOVED
FOLDER_DELETED FOLDER_DELETED
WORKFLOW_LINKED WORKFLOW_LINKED
WORKFLOW_UNLINKED WORKFLOW_UNLINKED
COLLABORATOR_ADDED COLLABORATOR_ADDED
COLLABORATOR_REMOVED COLLABORATOR_REMOVED
PERMISSION_CHANGED PERMISSION_CHANGED
        }
    
  "user" {
    String id "🗝️"
    String name 
    String email 
    Boolean emailVerified 
    String image "❓"
    GlobalRole globalRole 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "session" {
    String id "🗝️"
    DateTime expiresAt 
    String token 
    DateTime createdAt 
    DateTime updatedAt 
    String ipAddress "❓"
    String userAgent "❓"
    }
  

  "account" {
    String id "🗝️"
    String accountId 
    String providerId 
    String accessToken "❓"
    String refreshToken "❓"
    String idToken "❓"
    DateTime accessTokenExpiresAt "❓"
    DateTime refreshTokenExpiresAt "❓"
    String scope "❓"
    String password "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "verification" {
    String id "🗝️"
    String identifier 
    String value 
    DateTime expiresAt 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "organizations" {
    String id "🗝️"
    String name 
    Boolean isPersonal 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "organization_members" {
    String id "🗝️"
    OrgRole role 
    DateTime createdAt 
    }
  

  "calc_actors" {
    String id "🗝️"
    String displayName 
    DateTime createdAt 
    }
  

  "billing_plans" {
    String id "🗝️"
    String name 
    Int maxRunsPerMonth 
    Int maxRunsPerWorkflow "❓"
    Int priceMonthly "❓"
    Int priceOneTime "❓"
    String currency 
    Boolean isActive 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "org_billing" {
    String id "🗝️"
    BillingType billingType 
    Int remainingRuns "❓"
    BillingStatus status 
    DateTime startedAt 
    DateTime expiresAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "org_usage" {
    String id "🗝️"
    DateTime periodStart 
    DateTime periodEnd 
    Int totalRuns 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Workflow" {
    String id "🗝️"
    String name 
    WorkflowStatus status 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Credential" {
    String id "🗝️"
    String name 
    String value 
    CredentialType type 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Node" {
    String id "🗝️"
    String name 
    NodeType type 
    Json position 
    Json data 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Connection" {
    String id "🗝️"
    String fromOutput 
    String toInput 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Execution" {
    String id "🗝️"
    ExecutionStatus status 
    String error "❓"
    String errorStack "❓"
    DateTime startedAt 
    DateTime completedAt "❓"
    String inngestEventId 
    Json output "❓"
    }
  

  "calc_workflows" {
    String id "🗝️"
    String name 
    String slug 
    String description "❓"
    String category "❓"
    Json tags 
    Json metadata 
    Json canvasState 
    WorkflowStatus status 
    Visibility visibility 
    String publicSlug "❓"
    LibraryStatus libraryStatus 
    Int maxRunsPerUser "❓"
    Int windowSizeMin "❓"
    Int maxRunsTotal "❓"
    DateTime deletedAt "❓"
    DateTime publishedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "calc_versions" {
    String id "🗝️"
    Int version 
    Json snapshot 
    String changelog "❓"
    DateTime publishedAt 
    }
  

  "calc_drafts" {
    String id "🗝️"
    Json canvasState 
    DateTime savedAt 
    }
  

  "calc_nodes" {
    String id "🗝️"
    CalcNodeType type 
    String label 
    String description "❓"
    Float positionX 
    Float positionY 
    Json config 
    Json style 
    Int sortOrder 
    DateTime deletedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "calc_edges" {
    String id "🗝️"
    String sourceHandle 
    String targetHandle 
    Json condition "❓"
    String label "❓"
    Json style 
    Int sortOrder 
    DateTime deletedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "calc_variables" {
    String id "🗝️"
    String contextKey 
    String displayLabel 
    String notation 
    VariableDataType dataType 
    String unit "❓"
    Json defaultValue "❓"
    Json constraints "❓"
    VariableSourceType sourceType "❓"
    VariableScope scope 
    String scopeGroupId "❓"
    String description "❓"
    Int sortOrder 
    DateTime deletedAt "❓"
    }
  

  "calc_collaborators" {
    String id "🗝️"
    CollaboratorPermission permission 
    DateTime createdAt 
    }
  

  "formula_registry" {
    String id "🗝️"
    String slug 
    String name 
    String description "❓"
    String category 
    String subCategory "❓"
    Json tags 
    String expressionNotation 
    String displayExpression 
    Json inputVariables 
    Json outputVariable 
    Json intermediateSteps 
    String reference "❓"
    String sourceStandard "❓"
    Int yearIntroduced "❓"
    String region "❓"
    String applicability "❓"
    String limitations "❓"
    Int currentVersion 
    Boolean isPublished 
    Boolean isSystem 
    Visibility visibility 
    DateTime createdAt 
    DateTime updatedAt 
    DateTime deletedAt "❓"
    }
  

  "formula_registry_versions" {
    String id "🗝️"
    Int version 
    Json snapshot 
    String changelog "❓"
    DateTime createdAt 
    }
  

  "table_registry" {
    String id "🗝️"
    String slug 
    String name 
    String description "❓"
    String category 
    String subCategory "❓"
    Json tags 
    TableType tableType 
    Json inputKeys 
    Json outputKey 
    Json columns 
    Json data 
    Json interpolationConfig "❓"
    String fallbackMode 
    Json fallbackValue "❓"
    Boolean allowOverride 
    Boolean showInOutput 
    String reference "❓"
    String sourceStandard "❓"
    String sourcePage "❓"
    String sourceImage "❓"
    Int currentVersion 
    Boolean isPublished 
    Boolean isSystem 
    Visibility visibility 
    DateTime createdAt 
    DateTime updatedAt 
    DateTime deletedAt "❓"
    }
  

  "table_registry_versions" {
    String id "🗝️"
    Int version 
    Json snapshot 
    String changelog "❓"
    DateTime createdAt 
    }
  

  "formula_registry_usages" {
    String id "🗝️"
    Int pinnedVersion "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "table_registry_usages" {
    String id "🗝️"
    Int pinnedVersion "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "workspaces" {
    String id "🗝️"
    String name 
    String description "❓"
    String icon "❓"
    String color "❓"
    Visibility visibility 
    Boolean isTemplate 
    Json metadata 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "workspace_nodes" {
    String id "🗝️"
    WorkspaceNodeType nodeType 
    String name 
    String description "❓"
    String icon "❓"
    String color "❓"
    Int linkedVersion "❓"
    String externalUrl "❓"
    String noteContent "❓"
    Int sortOrder 
    Boolean isExpanded 
    Boolean isLocked 
    Float canvasX "❓"
    Float canvasY "❓"
    Json metadata 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "calc_sessions" {
    String id "🗝️"
    Int versionNum 
    SessionStatus status 
    Json variables 
    String currentNodeId "❓"
    DateTime pausedAt "❓"
    String pauseReason "❓"
    Json executionOrder 
    Int currentIndex 
    Json inputSnapshot "❓"
    DateTime startedAt "❓"
    DateTime completedAt "❓"
    Int duration "❓"
    Json error "❓"
    RunMode runMode 
    Json metadata 
    String idempotencyKey "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "calc_node_executions" {
    String id "🗝️"
    NodeExecutionStatus status 
    Int stepNumber 
    Json inputVars "❓"
    Json outputVars "❓"
    Json result "❓"
    String error "❓"
    String errorType "❓"
    Json userInput "❓"
    DateTime userInputAt "❓"
    DateTime startedAt "❓"
    DateTime completedAt "❓"
    Int durationMs "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "workspace_sessions" {
    String id "🗝️"
    Json sharedVariables 
    SessionStatus status 
    DateTime startedAt 
    DateTime completedAt "❓"
    }
  

  "workspace_session_runs" {
    String id "🗝️"
    Int sortOrder 
    SessionStatus status 
    DateTime createdAt 
    }
  

  "library_submissions" {
    String id "🗝️"
    SubmissionStatus status 
    String adminFeedback "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "calc_ratings" {
    String id "🗝️"
    Int score 
    String review "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "calc_rating_aggregates" {
    String id "🗝️"
    Float averageRating 
    Int ratingCount 
    DateTime updatedAt 
    }
  

  "batch_jobs" {
    String id "🗝️"
    String fileName 
    String fileUrl "❓"
    Int totalRows 
    Json columns 
    Json columnMapping 
    BatchStatus status 
    Int processedRows 
    Int successRows 
    Int errorRows 
    String errorSummary "❓"
    String resultFileUrl "❓"
    DateTime startedAt "❓"
    DateTime completedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "batch_row_executions" {
    String id "🗝️"
    Int rowNumber 
    Json inputData 
    BatchRowStatus status 
    Json outputData "❓"
    Json variables "❓"
    String error "❓"
    Int durationMs "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "uploaded_datasets" {
    String id "🗝️"
    String fileName 
    String fileType 
    Int fileSize 
    String storageUrl 
    Int rowCount 
    Json columns 
    Json columnMapping "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "node_templates" {
    String id "🗝️"
    CalcNodeType type 
    String label 
    String description "❓"
    Json config 
    Json style 
    String category "❓"
    Json tags 
    Visibility visibility 
    Boolean isSystem 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "audit_logs" {
    String id "🗝️"
    AuditResourceType resourceType 
    String resourceId 
    AuditAction action 
    Json changes "❓"
    Json beforeSnapshot "❓"
    Json afterSnapshot "❓"
    String ipAddress "❓"
    String userAgent "❓"
    String sessionId "❓"
    String batchId "❓"
    DateTime expiresAt "❓"
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
