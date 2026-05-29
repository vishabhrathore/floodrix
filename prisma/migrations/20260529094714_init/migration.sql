-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "FormulaStability" AS ENUM ('STANDARD', 'EXPERIMENTAL');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "LibraryStatus" AS ENUM ('NONE', 'PENDING', 'LISTED', 'UNLISTED');

-- CreateEnum
CREATE TYPE "CollaboratorPermission" AS ENUM ('VIEW', 'EDIT', 'ADMIN');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'ERRORED', 'CANCELLED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "RunMode" AS ENUM ('SINGLE', 'BATCH', 'API');

-- CreateEnum
CREATE TYPE "NodeExecutionStatus" AS ENUM ('PENDING', 'WAITING', 'RUNNING', 'COMPLETED', 'SKIPPED', 'ERRORED');

-- CreateEnum
CREATE TYPE "CalcNodeType" AS ENUM ('INPUT', 'FORMULA', 'LOOKUP_TABLE', 'GRAPH_INTERPOLATION', 'DECISION', 'DISPLAY', 'COMMENT', 'MULTI_FORMULA', 'LOOP', 'SUBWORKFLOW', 'UNIT_CONVERSION', 'VALIDATION', 'API_CALL', 'CHART', 'TABLE_BUILDER', 'PDF_REPORT', 'GROUP', 'PARALLEL', 'CUSTOM_CODE', 'REFERENCE_IMAGE');

-- CreateEnum
CREATE TYPE "VariableDataType" AS ENUM ('NUMBER', 'STRING', 'BOOLEAN', 'ARRAY', 'OBJECT');

-- CreateEnum
CREATE TYPE "VariableSourceType" AS ENUM ('USER_INPUT', 'FORMULA_OUTPUT', 'LOOKUP_RESULT', 'INTERPOLATION_RESULT', 'DECISION_SET', 'COMPUTED', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "VariableScope" AS ENUM ('GLOBAL', 'GROUP_SCOPED', 'NODE_LOCAL');

-- CreateEnum
CREATE TYPE "TableType" AS ENUM ('RANGE_LOOKUP', 'EXACT_LOOKUP', 'MULTI_KEY_LOOKUP', 'INTERPOLATION_1D', 'INTERPOLATION_2D', 'CLASSIFICATION');

-- CreateEnum
CREATE TYPE "WorkspaceNodeType" AS ENUM ('ROOT', 'FOLDER', 'WORKFLOW_LINK', 'SEPARATOR', 'EXTERNAL_LINK', 'NOTE');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BatchRowStatus" AS ENUM ('PENDING', 'SUCCESS', 'ERROR');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('INITIAL', 'MANUAL_TRIGGER', 'HTTP_REQUEST', 'GOOGLE_FORM_TRIGGER', 'STRIPE_TRIGGER', 'ANTHROPIC', 'GEMINI', 'OPENAI', 'DISCORD', 'SLACK');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('SUBSCRIPTION', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditResourceType" AS ENUM ('WORKFLOW', 'NODE', 'EDGE', 'VARIABLE', 'FORMULA_REGISTRY', 'TABLE_REGISTRY', 'WORKSPACE', 'WORKSPACE_NODE', 'BATCH_JOB', 'UPLOADED_DATASET', 'SESSION');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'PUBLISHED', 'ARCHIVED', 'RESTORED', 'DUPLICATED', 'IMPORTED', 'EXPORTED', 'NODE_ADDED', 'NODE_REMOVED', 'NODE_MOVED', 'NODE_CONFIG_CHANGED', 'NODE_TYPE_CHANGED', 'EDGE_CREATED', 'EDGE_DELETED', 'EDGE_RECONNECTED', 'VARIABLE_ADDED', 'VARIABLE_REMOVED', 'VARIABLE_RENAMED', 'VARIABLE_REBOUND', 'REGISTRY_ITEM_CREATED', 'REGISTRY_ITEM_UPDATED', 'REGISTRY_VERSION_PUBLISHED', 'REGISTRY_LINKED', 'REGISTRY_UNLINKED', 'REGISTRY_VERSION_PINNED', 'WORKFLOW_RUN_STARTED', 'WORKFLOW_RUN_COMPLETED', 'WORKFLOW_RUN_ERRORED', 'WORKFLOW_RUN_CANCELLED', 'WORKFLOW_PAUSED', 'WORKFLOW_RESUMED', 'USER_INPUT_SUBMITTED', 'FOLDER_CREATED', 'FOLDER_MOVED', 'FOLDER_DELETED', 'WORKFLOW_LINKED', 'WORKFLOW_UNLINKED', 'COLLABORATOR_ADDED', 'COLLABORATOR_REMOVED', 'PERMISSION_CHANGED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "globalRole" "GlobalRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_actors" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calc_actors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxRunsPerMonth" INTEGER NOT NULL,
    "maxRunsPerWorkflow" INTEGER,
    "priceMonthly" INTEGER,
    "priceOneTime" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_billing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingType" "BillingType" NOT NULL,
    "remainingRuns" INTEGER,
    "status" "BillingStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "NodeType" NOT NULL,
    "position" JSONB NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "credentialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "fromOutput" TEXT NOT NULL DEFAULT 'main',
    "toInput" TEXT NOT NULL DEFAULT 'main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "error" TEXT,
    "errorStack" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "inngestEventId" TEXT NOT NULL,
    "output" JSONB,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_workflows" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "canvasState" JSONB NOT NULL DEFAULT '{}',
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "currentVersionId" TEXT,
    "publicSlug" TEXT,
    "libraryStatus" "LibraryStatus" NOT NULL DEFAULT 'NONE',
    "maxRunsPerUser" INTEGER,
    "windowSizeMin" INTEGER,
    "maxRunsTotal" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calc_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_versions" (
    "id" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changelog" TEXT,
    "publishedBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calc_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_drafts" (
    "id" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "canvasState" JSONB NOT NULL DEFAULT '{}',
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calc_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_nodes" (
    "id" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "type" "CalcNodeType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "style" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calc_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_edges" (
    "id" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "sourceHandle" TEXT NOT NULL DEFAULT 'output',
    "targetHandle" TEXT NOT NULL DEFAULT 'input',
    "condition" JSONB,
    "label" TEXT,
    "style" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calc_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_variables" (
    "id" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "contextKey" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "notation" TEXT NOT NULL,
    "dataType" "VariableDataType" NOT NULL DEFAULT 'NUMBER',
    "unit" TEXT,
    "defaultValue" JSONB,
    "constraints" JSONB,
    "sourceNodeId" TEXT,
    "sourceType" "VariableSourceType",
    "scope" "VariableScope" NOT NULL DEFAULT 'GLOBAL',
    "scopeGroupId" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "calc_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_collaborators" (
    "id" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "permission" "CollaboratorPermission" NOT NULL DEFAULT 'VIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calc_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formula_registry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "expressionNotation" TEXT NOT NULL,
    "displayExpression" TEXT NOT NULL,
    "inputVariables" JSONB NOT NULL,
    "outputVariable" JSONB NOT NULL,
    "intermediateSteps" JSONB NOT NULL DEFAULT '[]',
    "reference" TEXT,
    "sourceStandard" TEXT,
    "yearIntroduced" INTEGER,
    "region" TEXT,
    "applicability" TEXT,
    "limitations" TEXT,
    "stability" "FormulaStability" NOT NULL DEFAULT 'STANDARD',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "formula_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_registry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "tableType" "TableType" NOT NULL,
    "inputKeys" JSONB NOT NULL,
    "outputKey" JSONB NOT NULL,
    "columns" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "interpolationConfig" JSONB,
    "fallbackMode" TEXT NOT NULL DEFAULT 'error',
    "fallbackValue" JSONB,
    "allowOverride" BOOLEAN NOT NULL DEFAULT false,
    "showInOutput" BOOLEAN NOT NULL DEFAULT true,
    "reference" TEXT,
    "sourceStandard" TEXT,
    "sourcePage" TEXT,
    "sourceImage" TEXT,
    "stability" "FormulaStability" NOT NULL DEFAULT 'STANDARD',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "table_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formula_registry_usages" (
    "id" TEXT NOT NULL,
    "formulaRegistryId" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "calcNodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formula_registry_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_registry_usages" (
    "id" TEXT NOT NULL,
    "tableRegistryId" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "calcNodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "table_registry_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_nodes" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "parentId" TEXT,
    "nodeType" "WorkspaceNodeType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "linkedWorkflowId" TEXT,
    "linkedVersion" INTEGER,
    "externalUrl" TEXT,
    "noteContent" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isExpanded" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "canvasX" DOUBLE PRECISION,
    "canvasY" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_sessions" (
    "id" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "versionId" TEXT,
    "versionNum" INTEGER NOT NULL DEFAULT 1,
    "actorId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "variables" JSONB NOT NULL DEFAULT '{}',
    "currentNodeId" TEXT,
    "pausedAt" TIMESTAMP(3),
    "pauseReason" TEXT,
    "executionOrder" JSONB NOT NULL DEFAULT '[]',
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "inputSnapshot" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "error" JSONB,
    "runMode" "RunMode" NOT NULL DEFAULT 'SINGLE',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calc_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_node_executions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "calcNodeId" TEXT,
    "status" "NodeExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "stepNumber" INTEGER NOT NULL,
    "inputVars" JSONB,
    "outputVars" JSONB,
    "result" JSONB,
    "error" TEXT,
    "errorType" TEXT,
    "userInput" JSONB,
    "userInputAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calc_node_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_sessions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "sharedVariables" JSONB NOT NULL DEFAULT '{}',
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "workspace_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_session_runs" (
    "id" TEXT NOT NULL,
    "workspaceSessionId" TEXT NOT NULL,
    "workspaceNodeId" TEXT NOT NULL,
    "calcSessionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_session_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_submissions" (
    "id" TEXT NOT NULL,
    "calcVersionId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "adminFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_ratings" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "versionId" TEXT,
    "score" SMALLINT NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calc_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_rating_aggregates" (
    "id" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calc_rating_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_jobs" (
    "id" TEXT NOT NULL,
    "calcWorkflowId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "totalRows" INTEGER NOT NULL,
    "columns" JSONB NOT NULL,
    "columnMapping" JSONB NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "resultFileUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_row_executions" (
    "id" TEXT NOT NULL,
    "batchJobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "inputData" JSONB NOT NULL,
    "status" "BatchRowStatus" NOT NULL DEFAULT 'PENDING',
    "outputData" JSONB,
    "variables" JSONB,
    "error" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_row_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_datasets" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "workflowId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "columns" JSONB NOT NULL,
    "columnMapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "CalcNodeType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "style" JSONB NOT NULL DEFAULT '{}',
    "category" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "node_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "resourceType" "AuditResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "calcWorkflowId" TEXT,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "batchId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "organizations_founderId_idx" ON "organizations"("founderId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_userId_organizationId_key" ON "organization_members"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "calc_actors_userId_organizationId_key" ON "calc_actors"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "org_billing_organizationId_status_idx" ON "org_billing"("organizationId", "status");

-- CreateIndex
CREATE INDEX "org_usage_organizationId_periodStart_idx" ON "org_usage"("organizationId", "periodStart");

-- CreateIndex
CREATE INDEX "Workflow_userId_idx" ON "Workflow"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_fromNodeId_toNodeId_fromOutput_toInput_key" ON "Connection"("fromNodeId", "toNodeId", "fromOutput", "toInput");

-- CreateIndex
CREATE UNIQUE INDEX "Execution_inngestEventId_key" ON "Execution"("inngestEventId");

-- CreateIndex
CREATE UNIQUE INDEX "calc_workflows_currentVersionId_key" ON "calc_workflows"("currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "calc_workflows_publicSlug_key" ON "calc_workflows"("publicSlug");

-- CreateIndex
CREATE INDEX "calc_workflows_organizationId_idx" ON "calc_workflows"("organizationId");

-- CreateIndex
CREATE INDEX "calc_workflows_libraryStatus_idx" ON "calc_workflows"("libraryStatus");

-- CreateIndex
CREATE INDEX "calc_workflows_organizationId_deletedAt_idx" ON "calc_workflows"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "calc_workflows_organizationId_status_idx" ON "calc_workflows"("organizationId", "status");

-- CreateIndex
CREATE INDEX "calc_workflows_organizationId_visibility_idx" ON "calc_workflows"("organizationId", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "calc_workflows_organizationId_slug_key" ON "calc_workflows"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "calc_versions_calcWorkflowId_version_key" ON "calc_versions"("calcWorkflowId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "calc_drafts_calcWorkflowId_actorId_key" ON "calc_drafts"("calcWorkflowId", "actorId");

-- CreateIndex
CREATE INDEX "calc_nodes_calcWorkflowId_idx" ON "calc_nodes"("calcWorkflowId");

-- CreateIndex
CREATE INDEX "calc_nodes_calcWorkflowId_deletedAt_idx" ON "calc_nodes"("calcWorkflowId", "deletedAt");

-- CreateIndex
CREATE INDEX "calc_edges_calcWorkflowId_idx" ON "calc_edges"("calcWorkflowId");

-- CreateIndex
CREATE INDEX "calc_edges_calcWorkflowId_deletedAt_idx" ON "calc_edges"("calcWorkflowId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "calc_edges_sourceNodeId_targetNodeId_sourceHandle_targetHan_key" ON "calc_edges"("sourceNodeId", "targetNodeId", "sourceHandle", "targetHandle");

-- CreateIndex
CREATE INDEX "calc_variables_calcWorkflowId_idx" ON "calc_variables"("calcWorkflowId");

-- CreateIndex
CREATE INDEX "calc_variables_calcWorkflowId_deletedAt_idx" ON "calc_variables"("calcWorkflowId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "calc_variables_calcWorkflowId_contextKey_key" ON "calc_variables"("calcWorkflowId", "contextKey");

-- CreateIndex
CREATE UNIQUE INDEX "calc_collaborators_calcWorkflowId_actorId_key" ON "calc_collaborators"("calcWorkflowId", "actorId");

-- CreateIndex
CREATE INDEX "formula_registry_organizationId_idx" ON "formula_registry"("organizationId");

-- CreateIndex
CREATE INDEX "formula_registry_isPublished_visibility_idx" ON "formula_registry"("isPublished", "visibility");

-- CreateIndex
CREATE INDEX "formula_registry_organizationId_deletedAt_idx" ON "formula_registry"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "formula_registry_organizationId_slug_key" ON "formula_registry"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "table_registry_organizationId_idx" ON "table_registry"("organizationId");

-- CreateIndex
CREATE INDEX "table_registry_isPublished_visibility_idx" ON "table_registry"("isPublished", "visibility");

-- CreateIndex
CREATE INDEX "table_registry_organizationId_deletedAt_idx" ON "table_registry"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "table_registry_organizationId_slug_key" ON "table_registry"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "formula_registry_usages_calcNodeId_formulaRegistryId_key" ON "formula_registry_usages"("calcNodeId", "formulaRegistryId");

-- CreateIndex
CREATE UNIQUE INDEX "table_registry_usages_calcNodeId_tableRegistryId_key" ON "table_registry_usages"("calcNodeId", "tableRegistryId");

-- CreateIndex
CREATE INDEX "workspaces_organizationId_idx" ON "workspaces"("organizationId");

-- CreateIndex
CREATE INDEX "workspace_nodes_workspaceId_parentId_idx" ON "workspace_nodes"("workspaceId", "parentId");

-- CreateIndex
CREATE INDEX "workspace_nodes_linkedWorkflowId_idx" ON "workspace_nodes"("linkedWorkflowId");

-- CreateIndex
CREATE INDEX "calc_sessions_calcWorkflowId_status_idx" ON "calc_sessions"("calcWorkflowId", "status");

-- CreateIndex
CREATE INDEX "calc_sessions_calcWorkflowId_actorId_idx" ON "calc_sessions"("calcWorkflowId", "actorId");

-- CreateIndex
CREATE INDEX "calc_sessions_actorId_calcWorkflowId_status_idx" ON "calc_sessions"("actorId", "calcWorkflowId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "calc_sessions_calcWorkflowId_idempotencyKey_key" ON "calc_sessions"("calcWorkflowId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "calc_node_executions_sessionId_idx" ON "calc_node_executions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "calc_node_executions_sessionId_calcNodeId_key" ON "calc_node_executions"("sessionId", "calcNodeId");

-- CreateIndex
CREATE INDEX "workspace_session_runs_workspaceSessionId_idx" ON "workspace_session_runs"("workspaceSessionId");

-- CreateIndex
CREATE INDEX "library_submissions_status_idx" ON "library_submissions"("status");

-- CreateIndex
CREATE INDEX "library_submissions_submitterId_idx" ON "library_submissions"("submitterId");

-- CreateIndex
CREATE INDEX "calc_ratings_calcWorkflowId_idx" ON "calc_ratings"("calcWorkflowId");

-- CreateIndex
CREATE UNIQUE INDEX "calc_ratings_calcWorkflowId_actorId_key" ON "calc_ratings"("calcWorkflowId", "actorId");

-- CreateIndex
CREATE UNIQUE INDEX "calc_rating_aggregates_calcWorkflowId_key" ON "calc_rating_aggregates"("calcWorkflowId");

-- CreateIndex
CREATE INDEX "batch_jobs_calcWorkflowId_idx" ON "batch_jobs"("calcWorkflowId");

-- CreateIndex
CREATE INDEX "batch_jobs_actorId_status_idx" ON "batch_jobs"("actorId", "status");

-- CreateIndex
CREATE INDEX "batch_row_executions_batchJobId_status_idx" ON "batch_row_executions"("batchJobId", "status");

-- CreateIndex
CREATE INDEX "uploaded_datasets_actorId_idx" ON "uploaded_datasets"("actorId");

-- CreateIndex
CREATE INDEX "uploaded_datasets_workflowId_idx" ON "uploaded_datasets"("workflowId");

-- CreateIndex
CREATE INDEX "node_templates_type_idx" ON "node_templates"("type");

-- CreateIndex
CREATE INDEX "node_templates_organizationId_idx" ON "node_templates"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_resourceId_idx" ON "audit_logs"("resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_calcWorkflowId_idx" ON "audit_logs"("calcWorkflowId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_actors" ADD CONSTRAINT "calc_actors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_actors" ADD CONSTRAINT "calc_actors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_billing" ADD CONSTRAINT "org_billing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_billing" ADD CONSTRAINT "org_billing_planId_fkey" FOREIGN KEY ("planId") REFERENCES "billing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_usage" ADD CONSTRAINT "org_usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_workflows" ADD CONSTRAINT "calc_workflows_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "calc_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_workflows" ADD CONSTRAINT "calc_workflows_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_versions" ADD CONSTRAINT "calc_versions_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_versions" ADD CONSTRAINT "calc_versions_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "calc_actors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_drafts" ADD CONSTRAINT "calc_drafts_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "calc_actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_drafts" ADD CONSTRAINT "calc_drafts_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_nodes" ADD CONSTRAINT "calc_nodes_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_edges" ADD CONSTRAINT "calc_edges_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_edges" ADD CONSTRAINT "calc_edges_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "calc_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_edges" ADD CONSTRAINT "calc_edges_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "calc_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_variables" ADD CONSTRAINT "calc_variables_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_variables" ADD CONSTRAINT "calc_variables_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "calc_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_collaborators" ADD CONSTRAINT "calc_collaborators_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "calc_actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_collaborators" ADD CONSTRAINT "calc_collaborators_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_registry" ADD CONSTRAINT "formula_registry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "calc_actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_registry" ADD CONSTRAINT "formula_registry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_registry" ADD CONSTRAINT "table_registry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "calc_actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_registry" ADD CONSTRAINT "table_registry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_registry_usages" ADD CONSTRAINT "formula_registry_usages_calcNodeId_fkey" FOREIGN KEY ("calcNodeId") REFERENCES "calc_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_registry_usages" ADD CONSTRAINT "formula_registry_usages_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_registry_usages" ADD CONSTRAINT "formula_registry_usages_formulaRegistryId_fkey" FOREIGN KEY ("formulaRegistryId") REFERENCES "formula_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_registry_usages" ADD CONSTRAINT "table_registry_usages_calcNodeId_fkey" FOREIGN KEY ("calcNodeId") REFERENCES "calc_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_registry_usages" ADD CONSTRAINT "table_registry_usages_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_registry_usages" ADD CONSTRAINT "table_registry_usages_tableRegistryId_fkey" FOREIGN KEY ("tableRegistryId") REFERENCES "table_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_nodes" ADD CONSTRAINT "workspace_nodes_linkedWorkflowId_fkey" FOREIGN KEY ("linkedWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_nodes" ADD CONSTRAINT "workspace_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "workspace_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_nodes" ADD CONSTRAINT "workspace_nodes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_sessions" ADD CONSTRAINT "calc_sessions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "calc_actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_sessions" ADD CONSTRAINT "calc_sessions_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_sessions" ADD CONSTRAINT "calc_sessions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "calc_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_node_executions" ADD CONSTRAINT "calc_node_executions_calcNodeId_fkey" FOREIGN KEY ("calcNodeId") REFERENCES "calc_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_node_executions" ADD CONSTRAINT "calc_node_executions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "calc_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_sessions" ADD CONSTRAINT "workspace_sessions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "calc_actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_sessions" ADD CONSTRAINT "workspace_sessions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_session_runs" ADD CONSTRAINT "workspace_session_runs_calcSessionId_fkey" FOREIGN KEY ("calcSessionId") REFERENCES "calc_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_session_runs" ADD CONSTRAINT "workspace_session_runs_workspaceNodeId_fkey" FOREIGN KEY ("workspaceNodeId") REFERENCES "workspace_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_session_runs" ADD CONSTRAINT "workspace_session_runs_workspaceSessionId_fkey" FOREIGN KEY ("workspaceSessionId") REFERENCES "workspace_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_submissions" ADD CONSTRAINT "library_submissions_calcVersionId_fkey" FOREIGN KEY ("calcVersionId") REFERENCES "calc_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_submissions" ADD CONSTRAINT "library_submissions_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "calc_actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_submissions" ADD CONSTRAINT "library_submissions_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "calc_actors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_ratings" ADD CONSTRAINT "calc_ratings_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "calc_actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_ratings" ADD CONSTRAINT "calc_ratings_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_ratings" ADD CONSTRAINT "calc_ratings_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "calc_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calc_rating_aggregates" ADD CONSTRAINT "calc_rating_aggregates_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "calc_actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_row_executions" ADD CONSTRAINT "batch_row_executions_batchJobId_fkey" FOREIGN KEY ("batchJobId") REFERENCES "batch_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_datasets" ADD CONSTRAINT "uploaded_datasets_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "calc_actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_datasets" ADD CONSTRAINT "uploaded_datasets_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "calc_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_templates" ADD CONSTRAINT "node_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "calc_actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_calcWorkflowId_fkey" FOREIGN KEY ("calcWorkflowId") REFERENCES "calc_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
