// prisma/seed.ts
//
// Run with:   npx prisma db seed
// Or directly: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
//
// Adds a super admin user + 5 orgs + calc workflows + sessions + registry
// items + audit events so the admin dashboard has real-looking data to show.
//
// Safe to re-run — every upsert is idempotent on a stable identifier.

import {
    PrismaClient,
    GlobalRole,
    OrgRole,
    WorkflowStatus,
    LibraryStatus,
    Visibility,
    CalcNodeType,
    VariableDataType,
    VariableSourceType,
    VariableScope,
    SessionStatus,
    RunMode,
    NodeExecutionStatus,
    TableType,
    WorkspaceNodeType,
    BatchStatus,
    AuditResourceType,
    AuditAction,
    BillingType,
    BillingStatus,
    SubmissionStatus,
} from "../../src/generated/prisma";

// ─── Better Auth requires bcrypt-compatible password hashes ──────────────────
// If you use a different hasher (argon2, etc.) swap this helper out.
// For seeding we just store a bcrypt hash of "password123" so you can log in.
const SEED_PASSWORD_HASH =
    "5e7359a729b35ae4fa9cfaef75b2c9f1:eaf63c0df16524467ec4c61ffc6af14056735741057ef120ed2736f129392b658af14f9f58381bb61e39e947c39d7971f3414cea4c476a9f40c5f5834ea2722e"; // password123

const db = new PrismaClient({ log: ["warn", "error"] });

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

function hoursAgo(n: number): Date {
    return new Date(Date.now() - n * 60 * 60 * 1000);
}

function randomBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SEED
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    console.log("🌱  Starting FloodRix dev seed…\n");

    // ── 1. BILLING PLANS ────────────────────────────────────────────────────────

    const planFree = await db.billingPlan.upsert({
        where: { id: "plan-free" },
        update: {},
        create: {
            id: "plan-free",
            name: "Free",
            maxRunsPerMonth: 100,
            maxRunsPerWorkflow: 10,
            priceMonthly: 0,
            currency: "INR",
            isActive: true,
        },
    });

    const planPro = await db.billingPlan.upsert({
        where: { id: "plan-pro" },
        update: {},
        create: {
            id: "plan-pro",
            name: "Pro",
            maxRunsPerMonth: 1000,
            priceMonthly: 400000, // ₹4,000 in paise
            currency: "INR",
            isActive: true,
        },
    });

    const planEnterprise = await db.billingPlan.upsert({
        where: { id: "plan-enterprise" },
        update: {},
        create: {
            id: "plan-enterprise",
            name: "Enterprise",
            maxRunsPerMonth: 50000,
            priceMonthly: 4900000, // ₹49,000 in paise
            currency: "INR",
            isActive: true,
        },
    });

    console.log("✅  Billing plans");

    // ── 2. USERS ────────────────────────────────────────────────────────────────
    // User IDs use the "user_" prefix that Better Auth expects.

    const superAdminUser = await db.user.upsert({
        where: { email: "admin@floodrix.com" },
        update: {},
        create: {
            id: "user_superadmin",
            name: "Super Admin",
            email: "admin@floodrix.com",
            emailVerified: true,
            globalRole: GlobalRole.SUPER_ADMIN,
            createdAt: daysAgo(60),
        },
    });

    // Better Auth account row so email+password login works
    await db.account.upsert({
        where: { providerId_accountId: { providerId: "credential", accountId: "admin@floodrix.com" } },
        update: { password: SEED_PASSWORD_HASH },
        create: {
            id: "acct_superadmin",
            providerId: "credential",
            accountId: "admin@floodrix.com",
            userId: superAdminUser.id,
            password: SEED_PASSWORD_HASH,
            createdAt: daysAgo(60),
            updatedAt: daysAgo(60),
        },
    });

    const users = await Promise.all(
        [
            { id: "user_priya", name: "Priya Mehta", email: "priya@bridgehouse.in" },
            { id: "user_arjun", name: "Arjun Kumar", email: "arjun@techroads.co.in" },
            { id: "user_meera", name: "Meera Sharma", email: "meera@nhinfra.com" },
            { id: "user_ravi", name: "Ravi Patel", email: "ravi@civilsynth.io" },
            { id: "user_anita", name: "Anita Desai", email: "anita@waterflow.co" },
        ].map((u) =>
            db.user.upsert({
                where: { email: u.email },
                update: {},
                create: {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    emailVerified: true,
                    globalRole: GlobalRole.USER,
                    createdAt: daysAgo(randomBetween(10, 45)),
                },
            })
        )
    );

    console.log("✅  Users (1 super admin + 5 org users)");

    // ── 3. ORGANIZATIONS ────────────────────────────────────────────────────────

    const orgs = await Promise.all([
        db.organization.upsert({
            where: { id: "org_bridgehouse" },
            update: {},
            create: {
                id: "org_bridgehouse",
                name: "Bridge House Consultants",
                founderId: users[0].id,
                isPersonal: false,
                createdAt: daysAgo(40),
                updatedAt: daysAgo(1),
            },
        }),
        db.organization.upsert({
            where: { id: "org_techroads" },
            update: {},
            create: {
                id: "org_techroads",
                name: "TechRoads Engineering",
                founderId: users[1].id,
                isPersonal: false,
                createdAt: daysAgo(35),
                updatedAt: daysAgo(2),
            },
        }),
        db.organization.upsert({
            where: { id: "org_nhinfra" },
            update: {},
            create: {
                id: "org_nhinfra",
                name: "NH Infra Pvt Ltd",
                founderId: users[2].id,
                isPersonal: false,
                createdAt: daysAgo(28),
                updatedAt: daysAgo(3),
            },
        }),
        db.organization.upsert({
            where: { id: "org_civilsynth" },
            update: {},
            create: {
                id: "org_civilsynth",
                name: "CivilSynth Labs",
                founderId: users[3].id,
                isPersonal: false,
                createdAt: daysAgo(14),
                updatedAt: daysAgo(7),
            },
        }),
        db.organization.upsert({
            where: { id: "org_waterflow" },
            update: {},
            create: {
                id: "org_waterflow",
                name: "Waterflow Design Inc",
                founderId: users[4].id,
                isPersonal: false,
                createdAt: daysAgo(20),
                updatedAt: daysAgo(10),
            },
        }),
        // Super admin gets a personal org (isPersonal = true per D-01)
        db.organization.upsert({
            where: { id: "org_admin_personal" },
            update: {},
            create: {
                id: "org_admin_personal",
                name: "Admin Personal",
                founderId: superAdminUser.id,
                isPersonal: true,
                createdAt: daysAgo(60),
                updatedAt: daysAgo(60),
            },
        }),
    ]);

    // OrganizationMember rows — each founder is also OWNER member
    await Promise.all(
        orgs.slice(0, 5).map((org, i) =>
            db.organizationMember.upsert({
                where: { userId_organizationId: { userId: users[i].id, organizationId: org.id } },
                update: {},
                create: {
                    id: `member_founder_${org.id}`,
                    userId: users[i].id,
                    organizationId: org.id,
                    role: OrgRole.OWNER,
                },
            })
        )
    );

    console.log("✅  Organizations + members");

    // ── 4. BILLING ──────────────────────────────────────────────────────────────

    await Promise.all([
        db.orgBilling.upsert({
            where: { id: "billing_bridgehouse" },
            update: {},
            create: {
                id: "billing_bridgehouse",
                organizationId: orgs[0].id,
                planId: planPro.id,
                billingType: BillingType.SUBSCRIPTION,
                status: BillingStatus.ACTIVE,
                startedAt: daysAgo(30),
            },
        }),
        db.orgBilling.upsert({
            where: { id: "billing_techroads" },
            update: {},
            create: {
                id: "billing_techroads",
                organizationId: orgs[1].id,
                planId: planEnterprise.id,
                billingType: BillingType.SUBSCRIPTION,
                status: BillingStatus.ACTIVE,
                startedAt: daysAgo(30),
            },
        }),
        db.orgBilling.upsert({
            where: { id: "billing_nhinfra" },
            update: {},
            create: {
                id: "billing_nhinfra",
                organizationId: orgs[2].id,
                planId: planFree.id,
                billingType: BillingType.SUBSCRIPTION,
                status: BillingStatus.ACTIVE,
                startedAt: daysAgo(28),
            },
        }),
        db.orgBilling.upsert({
            where: { id: "billing_civilsynth" },
            update: {},
            create: {
                id: "billing_civilsynth",
                organizationId: orgs[3].id,
                planId: planFree.id,
                billingType: BillingType.SUBSCRIPTION,
                status: BillingStatus.ACTIVE,
                startedAt: daysAgo(14),
            },
        }),
        db.orgBilling.upsert({
            where: { id: "billing_waterflow" },
            update: {},
            create: {
                id: "billing_waterflow",
                organizationId: orgs[4].id,
                planId: planFree.id,
                billingType: BillingType.SUBSCRIPTION,
                status: BillingStatus.CANCELED,
                startedAt: daysAgo(20),
                expiresAt: daysAgo(3),
            },
        }),
    ]);

    // Usage records (current month)
    await Promise.all(
        [
            { orgId: orgs[0].id, id: "usage_bh", runs: 820 },
            { orgId: orgs[1].id, id: "usage_tr", runs: 2440 },
            { orgId: orgs[2].id, id: "usage_nh", runs: 67 },
            { orgId: orgs[3].id, id: "usage_cs", runs: 12 },
            { orgId: orgs[4].id, id: "usage_wf", runs: 5 },
        ].map(({ orgId, id, runs }) => {
            const start = new Date(); start.setDate(1);
            const end = new Date(start); end.setMonth(end.getMonth() + 1);
            return db.orgUsage.upsert({
                where: { id },
                update: { totalRuns: runs },
                create: { id, organizationId: orgId, periodStart: start, periodEnd: end, totalRuns: runs },
            });
        })
    );

    console.log("✅  Billing + usage");

    // ── 5. CALC ACTORS ──────────────────────────────────────────────────────────

    const actors = await Promise.all(
        users.map((u, i) =>
            db.calcActor.upsert({
                where: { userId_organizationId: { userId: u.id, organizationId: orgs[i].id } },
                update: {},
                create: {
                    id: `actor_${u.id}`,
                    userId: u.id,
                    organizationId: orgs[i].id,
                    displayName: u.name,
                    createdAt: daysAgo(randomBetween(10, 40)),
                },
            })
        )
    );

    // Admin actor in their personal org
    const adminActor = await db.calcActor.upsert({
        where: { userId_organizationId: { userId: superAdminUser.id, organizationId: orgs[5].id } },
        update: {},
        create: {
            id: "actor_superadmin",
            userId: superAdminUser.id,
            organizationId: orgs[5].id,
            displayName: "Super Admin",
        },
    });

    console.log("✅  Calc actors");

    // ── 6. CALC WORKFLOWS ───────────────────────────────────────────────────────

    const workflows: any[] = [];

    const wfDefs = [
        {
            id: "wf_dicken",
            orgId: orgs[0].id,
            name: "Dicken's flood discharge",
            slug: "dickens-flood-discharge",
            description: "Empirical formula Q = CM^(3/4) per IRC:SP:13-2004 §3.1",
            category: "Flood Discharge",
            tags: ["flood", "empirical", "IRC", "dicken"],
            status: WorkflowStatus.PUBLISHED,
            visibility: Visibility.PUBLIC,
            libraryStatus: LibraryStatus.LISTED,
            publicSlug: "dickens-flood-discharge-public",
            publishedAt: daysAgo(15),
        },
        {
            id: "wf_scour",
            orgId: orgs[1].id,
            name: "Scour depth — IRC:78",
            slug: "scour-depth-irc78",
            description: "Normal scour depth & afflux calculation per IRC:78-2014",
            category: "Scour",
            tags: ["scour", "bridge", "IRC78"],
            status: WorkflowStatus.PUBLISHED,
            visibility: Visibility.PUBLIC,
            libraryStatus: LibraryStatus.LISTED,
            publicSlug: "scour-depth-irc78-public",
            publishedAt: daysAgo(10),
        },
        {
            id: "wf_ryves",
            orgId: orgs[2].id,
            name: "Ryves formula (South India)",
            slug: "ryves-formula",
            description: "Q = CM^(2/3) for South India regions per IRC",
            category: "Flood Discharge",
            tags: ["flood", "ryves", "south-india"],
            status: WorkflowStatus.PUBLISHED,
            visibility: Visibility.PUBLIC,
            libraryStatus: LibraryStatus.UNLISTED,
            publicSlug: null,
            publishedAt: daysAgo(20),
        },
        {
            id: "wf_waterway",
            orgId: orgs[0].id,
            name: "Waterway width — Lacey",
            slug: "waterway-lacey",
            description: "Lacey's regime perimeter P = 4.75√Q",
            category: "Waterway",
            tags: ["waterway", "lacey"],
            status: WorkflowStatus.DRAFT,
            visibility: Visibility.PRIVATE,
            libraryStatus: LibraryStatus.NONE,
            publicSlug: null,
            publishedAt: null,
        },
        {
            id: "wf_afflux",
            orgId: orgs[1].id,
            name: "Afflux calculation",
            slug: "afflux-calc",
            description: "Bridge afflux per Molesworth formula",
            category: "Scour",
            tags: ["afflux", "molesworth"],
            status: WorkflowStatus.PUBLISHED,
            visibility: Visibility.PRIVATE,
            libraryStatus: LibraryStatus.PENDING,
            publicSlug: null,
            publishedAt: daysAgo(5),
        },
        {
            id: "wf_areal",
            orgId: orgs[3].id,
            name: "Areal reduction factor",
            slug: "areal-reduction",
            description: "ARF from IRC Fig 4.2 via graph interpolation",
            category: "Rainfall",
            tags: ["ARF", "interpolation", "rainfall"],
            status: WorkflowStatus.DRAFT,
            visibility: Visibility.PRIVATE,
            libraryStatus: LibraryStatus.NONE,
            publicSlug: null,
            publishedAt: null,
        },
    ];

    for (const def of wfDefs) {
        const wf = await db.calcWorkflow.upsert({
            where: { id: def.id },
            update: {},
            create: {
                id: def.id,
                organizationId: def.orgId,
                name: def.name,
                slug: def.slug,
                description: def.description,
                category: def.category,
                tags: def.tags,
                status: def.status,
                visibility: def.visibility,
                libraryStatus: def.libraryStatus,
                publicSlug: def.publicSlug,
                publishedAt: def.publishedAt,
                createdAt: daysAgo(30),
                updatedAt: daysAgo(randomBetween(1, 5)),
            },
        });
        workflows.push(wf);

        // Rating aggregate row — MUST exist per D-08
        await db.calcRatingAggregate.upsert({
            where: { calcWorkflowId: wf.id },
            update: {},
            create: {
                id: `agg_${wf.id}`,
                calcWorkflowId: wf.id,
                averageRating:
                    wf.id === "wf_dicken" ? 4.8 : wf.id === "wf_scour" ? 4.5 : wf.id === "wf_ryves" ? 4.1 : 0,
                ratingCount:
                    wf.id === "wf_dicken" ? 24 : wf.id === "wf_scour" ? 18 : wf.id === "wf_ryves" ? 9 : 0,
                updatedAt: daysAgo(2),
            },
        });
    }

    console.log("✅  Calc workflows + rating aggregates");

    // ── 7. NODES + VARIABLES (Dicken's workflow) ─────────────────────────────────

    const inputNode = await db.calcNode.upsert({
        where: { id: "node_dicken_input" },
        update: {},
        create: {
            id: "node_dicken_input",
            calcWorkflowId: "wf_dicken",
            type: CalcNodeType.INPUT,
            label: "Site data",
            positionX: 80,
            positionY: 200,
            config: {
                fields: [
                    { key: "catchment_area", label: "Catchment area", unit: "km2", defaultValue: null },
                    { key: "dicken_c", label: "Dicken's C", unit: null, defaultValue: 11.4 },
                ],
            },
        },
    });

    const formulaNode = await db.calcNode.upsert({
        where: { id: "node_dicken_formula" },
        update: {},
        create: {
            id: "node_dicken_formula",
            calcWorkflowId: "wf_dicken",
            type: CalcNodeType.FORMULA,
            label: "Q = C × M^(3/4)",
            positionX: 360,
            positionY: 200,
            config: {
                expression: "C * M^(3/4)",
                outputKey: "Q_dicken",
                registryId: "freg_dicken",
            },
        },
    });

    const displayNode = await db.calcNode.upsert({
        where: { id: "node_dicken_display" },
        update: {},
        create: {
            id: "node_dicken_display",
            calcWorkflowId: "wf_dicken",
            type: CalcNodeType.DISPLAY,
            label: "Design discharge",
            positionX: 620,
            positionY: 200,
            config: { selectionRule: "max", comparisonKeys: ["Q_dicken"] },
        },
    });

    await db.calcEdge.upsert({
        where: {
            sourceNodeId_targetNodeId_sourceHandle_targetHandle: {
                sourceNodeId: inputNode.id,
                targetNodeId: formulaNode.id,
                sourceHandle: "output",
                targetHandle: "input",
            },
        },
        update: {},
        create: {
            id: "edge_1",
            calcWorkflowId: "wf_dicken",
            sourceNodeId: inputNode.id,
            targetNodeId: formulaNode.id,
        },
    });

    await db.calcEdge.upsert({
        where: {
            sourceNodeId_targetNodeId_sourceHandle_targetHandle: {
                sourceNodeId: formulaNode.id,
                targetNodeId: displayNode.id,
                sourceHandle: "output",
                targetHandle: "input",
            },
        },
        update: {},
        create: {
            id: "edge_2",
            calcWorkflowId: "wf_dicken",
            sourceNodeId: formulaNode.id,
            targetNodeId: displayNode.id,
        },
    });

    await Promise.all([
        db.calcVariable.upsert({
            where: { calcWorkflowId_contextKey: { calcWorkflowId: "wf_dicken", contextKey: "catchment_area" } },
            update: {},
            create: {
                id: "var_M",
                calcWorkflowId: "wf_dicken",
                contextKey: "catchment_area",
                displayLabel: "Catchment area",
                notation: "M",
                dataType: VariableDataType.NUMBER,
                unit: "km2",
                sourceNodeId: inputNode.id,
                sourceType: VariableSourceType.USER_INPUT,
                scope: VariableScope.GLOBAL,
            },
        }),
        db.calcVariable.upsert({
            where: { calcWorkflowId_contextKey: { calcWorkflowId: "wf_dicken", contextKey: "dicken_c" } },
            update: {},
            create: {
                id: "var_C",
                calcWorkflowId: "wf_dicken",
                contextKey: "dicken_c",
                displayLabel: "Dicken's C",
                notation: "C",
                dataType: VariableDataType.NUMBER,
                defaultValue: 11.4,
                sourceNodeId: inputNode.id,
                sourceType: VariableSourceType.USER_INPUT,
                scope: VariableScope.GLOBAL,
            },
        }),
        db.calcVariable.upsert({
            where: { calcWorkflowId_contextKey: { calcWorkflowId: "wf_dicken", contextKey: "Q_dicken" } },
            update: {},
            create: {
                id: "var_Q",
                calcWorkflowId: "wf_dicken",
                contextKey: "Q_dicken",
                displayLabel: "Flood discharge",
                notation: "Q",
                dataType: VariableDataType.NUMBER,
                unit: "cumecs",
                sourceNodeId: formulaNode.id,
                sourceType: VariableSourceType.FORMULA_OUTPUT,
                scope: VariableScope.GLOBAL,
            },
        }),
    ]);

    console.log("✅  Nodes, edges, variables");

    // ── 8. CALC VERSIONS + CURRENT POINTERS ─────────────────────────────────────

    const dickenVersion = await db.calcVersion.upsert({
        where: { calcWorkflowId_version: { calcWorkflowId: "wf_dicken", version: 1 } },
        update: {},
        create: {
            id: "ver_dicken_1",
            calcWorkflowId: "wf_dicken",
            version: 1,
            snapshot: { nodes: 3, edges: 2, variables: 3 },
            changelog: "Initial publish — Dicken's Q = CM^(3/4)",
            publishedBy: actors[0].id,
            publishedAt: daysAgo(15),
        },
    });
    await db.calcWorkflow.update({ where: { id: "wf_dicken" }, data: { currentVersionId: dickenVersion.id } });

    const scourVersion = await db.calcVersion.upsert({
        where: { calcWorkflowId_version: { calcWorkflowId: "wf_scour", version: 1 } },
        update: {},
        create: {
            id: "ver_scour_1",
            calcWorkflowId: "wf_scour",
            version: 1,
            snapshot: {},
            changelog: "Initial publish — IRC:78 scour",
            publishedBy: actors[1].id,
            publishedAt: daysAgo(10),
        },
    });
    await db.calcWorkflow.update({ where: { id: "wf_scour" }, data: { currentVersionId: scourVersion.id } });

    const ryveVersion = await db.calcVersion.upsert({
        where: { calcWorkflowId_version: { calcWorkflowId: "wf_ryves", version: 1 } },
        update: {},
        create: {
            id: "ver_ryves_1",
            calcWorkflowId: "wf_ryves",
            version: 1,
            snapshot: {},
            changelog: "Initial publish",
            publishedBy: actors[2].id,
            publishedAt: daysAgo(20),
        },
    });
    await db.calcWorkflow.update({ where: { id: "wf_ryves" }, data: { currentVersionId: ryveVersion.id } });

    const affluxVersion = await db.calcVersion.upsert({
        where: { calcWorkflowId_version: { calcWorkflowId: "wf_afflux", version: 1 } },
        update: {},
        create: {
            id: "ver_afflux_1",
            calcWorkflowId: "wf_afflux",
            version: 1,
            snapshot: {},
            changelog: "First submission draft",
            publishedBy: actors[1].id,
            publishedAt: daysAgo(5),
        },
    });
    await db.calcWorkflow.update({ where: { id: "wf_afflux" }, data: { currentVersionId: affluxVersion.id } });

    console.log("✅  Calc versions + current pointers");

    // ── 9. RATINGS ───────────────────────────────────────────────────────────────

    const ratingData = [
        { id: "rate_1", actorId: actors[1].id, wfId: "wf_dicken", vId: dickenVersion.id, score: 5, review: "Very accurate, matches field data." },
        { id: "rate_2", actorId: actors[2].id, wfId: "wf_dicken", vId: dickenVersion.id, score: 5, review: "Great for medium catchments." },
        { id: "rate_3", actorId: actors[0].id, wfId: "wf_scour", vId: scourVersion.id, score: 4, review: "Solid IRC:78 implementation." },
        { id: "rate_4", actorId: actors[3].id, wfId: "wf_scour", vId: scourVersion.id, score: 5, review: null },
        { id: "rate_5", actorId: actors[0].id, wfId: "wf_ryves", vId: ryveVersion.id, score: 4, review: "Good for south India projects." },
    ];

    for (const r of ratingData) {
        await db.calcRating.upsert({
            where: { calcWorkflowId_actorId: { calcWorkflowId: r.wfId, actorId: r.actorId } },
            update: {},
            create: {
                id: r.id,
                actorId: r.actorId,
                calcWorkflowId: r.wfId,
                versionId: r.vId,
                score: r.score,
                review: r.review,
                createdAt: daysAgo(randomBetween(1, 14)),
                updatedAt: daysAgo(1),
            },
        });
    }

    console.log("✅  Ratings");

    // ── 10. LIBRARY SUBMISSIONS ──────────────────────────────────────────────────

    // Approved submissions
    await db.librarySubmission.upsert({
        where: { id: "sub_dicken" },
        update: {},
        create: {
            id: "sub_dicken",
            calcVersionId: dickenVersion.id,
            submitterId: actors[0].id,
            reviewerId: adminActor.id,
            status: SubmissionStatus.APPROVED,
            adminFeedback: "Accurate implementation. Approved.",
            createdAt: daysAgo(16),
            updatedAt: daysAgo(15),
        },
    });

    await db.librarySubmission.upsert({
        where: { id: "sub_scour" },
        update: {},
        create: {
            id: "sub_scour",
            calcVersionId: scourVersion.id,
            submitterId: actors[1].id,
            reviewerId: adminActor.id,
            status: SubmissionStatus.APPROVED,
            adminFeedback: "Good work.",
            createdAt: daysAgo(11),
            updatedAt: daysAgo(10),
        },
    });

    // Pending submissions (what the admin sees in review queue)
    await db.librarySubmission.upsert({
        where: { id: "sub_ryves" },
        update: {},
        create: {
            id: "sub_ryves",
            calcVersionId: ryveVersion.id,
            submitterId: actors[2].id,
            status: SubmissionStatus.PENDING,
            createdAt: hoursAgo(24),
            updatedAt: hoursAgo(24),
        },
    });

    await db.librarySubmission.upsert({
        where: { id: "sub_afflux" },
        update: {},
        create: {
            id: "sub_afflux",
            calcVersionId: affluxVersion.id,
            submitterId: actors[1].id,
            status: SubmissionStatus.PENDING,
            createdAt: hoursAgo(5),
            updatedAt: hoursAgo(5),
        },
    });

    console.log("✅  Library submissions (2 approved, 2 pending)");

    // ── 11. FORMULA REGISTRY ─────────────────────────────────────────────────────
    // isSystem = true items live in admin's personal org and are visible to all orgs.

    await db.formulaRegistryItem.upsert({
        where: { id: "freg_dicken" },
        update: {},
        create: {
            id: "freg_dicken",
            organizationId: orgs[5].id,
            slug: "dickens-formula",
            name: "Dicken's formula",
            description: "Empirical flood discharge formula for Indian catchments",
            category: "Flood Discharge",
            subCategory: "Empirical",
            tags: ["flood", "dicken", "IRC"],
            expressionNotation: "C * M^(3/4)",
            displayExpression: "Q = C × M^(3/4)",
            inputVariables: [
                { key: "M", label: "Catchment area", unit: "km2" },
                { key: "C", label: "Dicken's constant", unit: null },
            ],
            outputVariable: { key: "Q_dicken", label: "Flood discharge", unit: "cumecs" },
            reference: "IRC:SP:13-2004 §3.1",
            sourceStandard: "IRC:SP:13",
            yearIntroduced: 1865,
            region: "India",
            currentVersion: 1,
            isPublished: true,
            isSystem: true,
            visibility: Visibility.PUBLIC,
            createdBy: adminActor.id,
        },
    });

    await db.formulaRegistryVersion.upsert({
        where: { formulaRegistryId_version: { formulaRegistryId: "freg_dicken", version: 1 } },
        update: {},
        create: {
            id: "fregv_dicken_1",
            formulaRegistryId: "freg_dicken",
            version: 1,
            snapshot: { expressionNotation: "C * M^(3/4)" },
            changelog: "Initial system formula",
            changedBy: adminActor.id,
        },
    });

    await db.formulaRegistryItem.upsert({
        where: { id: "freg_ryves" },
        update: {},
        create: {
            id: "freg_ryves",
            organizationId: orgs[5].id,
            slug: "ryves-formula",
            name: "Ryves formula",
            description: "Q = CM^(2/3) for south Indian catchments",
            category: "Flood Discharge",
            subCategory: "Empirical",
            tags: ["flood", "ryves", "south-india"],
            expressionNotation: "C * M^(2/3)",
            displayExpression: "Q = C × M^(2/3)",
            inputVariables: [
                { key: "M", label: "Catchment area", unit: "km2" },
                { key: "C", label: "Ryves constant", unit: null },
            ],
            outputVariable: { key: "Q_ryves", label: "Flood discharge", unit: "cumecs" },
            reference: "IRC:SP:13-2004 §3.2",
            sourceStandard: "IRC:SP:13",
            region: "South India",
            currentVersion: 1,
            isPublished: true,
            isSystem: true,
            visibility: Visibility.PUBLIC,
            createdBy: adminActor.id,
        },
    });

    await db.formulaRegistryVersion.upsert({
        where: { formulaRegistryId_version: { formulaRegistryId: "freg_ryves", version: 1 } },
        update: {},
        create: {
            id: "fregv_ryves_1",
            formulaRegistryId: "freg_ryves",
            version: 1,
            snapshot: { expressionNotation: "C * M^(2/3)" },
            changelog: "Initial system formula",
            changedBy: adminActor.id,
        },
    });

    console.log("✅  Formula registry (2 system formulas)");

    // ── 12. TABLE REGISTRY ────────────────────────────────────────────────────────

    await db.tableRegistryItem.upsert({
        where: { id: "treg_runoff" },
        update: {},
        create: {
            id: "treg_runoff",
            organizationId: orgs[5].id,
            slug: "runoff-coeff-irc",
            name: "Runoff coefficient — IRC:SP:13",
            description: "Runoff coefficient f for different soils and slopes",
            category: "Rainfall",
            tableType: TableType.RANGE_LOOKUP,
            inputKeys: [{ key: "slope_pct", label: "Slope (%)" }],
            outputKey: { key: "f", label: "Runoff coeff f" },
            columns: [
                { key: "slope_range", label: "Slope range" },
                { key: "f_flat", label: "f (flat)" },
                { key: "f_rolling", label: "f (rolling)" },
                { key: "f_hilly", label: "f (hilly)" },
            ],
            data: [
                { slope_range: "0–10%", f_flat: 0.30, f_rolling: 0.40, f_hilly: 0.50 },
                { slope_range: "10–30%", f_flat: 0.40, f_rolling: 0.55, f_hilly: 0.65 },
                { slope_range: ">30%", f_flat: 0.50, f_rolling: 0.65, f_hilly: 0.80 },
            ],
            reference: "IRC:SP:13-2004 Table 3",
            sourceStandard: "IRC:SP:13",
            currentVersion: 1,
            isPublished: true,
            isSystem: true,
            visibility: Visibility.PUBLIC,
            createdBy: adminActor.id,
        },
    });

    await db.tableRegistryVersion.upsert({
        where: { tableRegistryId_version: { tableRegistryId: "treg_runoff", version: 1 } },
        update: {},
        create: {
            id: "tregv_runoff_1",
            tableRegistryId: "treg_runoff",
            version: 1,
            snapshot: {},
            changelog: "Initial system table",
            changedBy: adminActor.id,
        },
    });

    await db.tableRegistryItem.upsert({
        where: { id: "treg_dicken_c" },
        update: {},
        create: {
            id: "treg_dicken_c",
            organizationId: orgs[5].id,
            slug: "dicken-c-values",
            name: "Dicken's C values by region",
            description: "Regional C constants for Dicken's formula",
            category: "Flood Discharge",
            tableType: TableType.EXACT_LOOKUP,
            inputKeys: [{ key: "region", label: "Region" }],
            outputKey: { key: "C", label: "Dicken's C" },
            columns: [
                { key: "region", label: "Region" },
                { key: "C", label: "C value" },
            ],
            data: [
                { region: "North India (plains)", C: 6 },
                { region: "North India (hills)", C: 11.4 },
                { region: "Central India", C: 14 },
                { region: "Western Ghats (coastal)", C: 22 },
                { region: "Deccan plateau", C: 22 },
            ],
            reference: "IRC:SP:13-2004 Table 2",
            sourceStandard: "IRC:SP:13",
            currentVersion: 1,
            isPublished: true,
            isSystem: true,
            visibility: Visibility.PUBLIC,
            createdBy: adminActor.id,
        },
    });

    await db.tableRegistryVersion.upsert({
        where: { tableRegistryId_version: { tableRegistryId: "treg_dicken_c", version: 1 } },
        update: {},
        create: {
            id: "tregv_dicken_c_1",
            tableRegistryId: "treg_dicken_c",
            version: 1,
            snapshot: {},
            changelog: "Initial system table",
            changedBy: adminActor.id,
        },
    });

    console.log("✅  Table registry (2 system tables)");

    // ── 13. EXECUTION SESSIONS ────────────────────────────────────────────────────

    const sessionDefs = [
        { id: "sess_1", wfId: "wf_dicken", actorId: actors[0].id, vId: dickenVersion.id, status: SessionStatus.COMPLETED, M: 84.5, Q: 152.06, daysBack: 2 },
        { id: "sess_2", wfId: "wf_dicken", actorId: actors[1].id, vId: dickenVersion.id, status: SessionStatus.COMPLETED, M: 120.0, Q: 198.40, daysBack: 3 },
        { id: "sess_3", wfId: "wf_dicken", actorId: actors[2].id, vId: dickenVersion.id, status: SessionStatus.COMPLETED, M: 55.0, Q: 109.22, daysBack: 5 },
        { id: "sess_4", wfId: "wf_dicken", actorId: actors[0].id, vId: dickenVersion.id, status: SessionStatus.PAUSED, M: null, Q: null, daysBack: 0 },
        { id: "sess_5", wfId: "wf_scour", actorId: actors[1].id, vId: scourVersion.id, status: SessionStatus.COMPLETED, M: null, Q: null, daysBack: 1 },
        { id: "sess_6", wfId: "wf_scour", actorId: actors[3].id, vId: scourVersion.id, status: SessionStatus.ERRORED, M: null, Q: null, daysBack: 1 },
    ];

    for (const s of sessionDefs) {
        const started = daysAgo(s.daysBack);
        const completed =
            s.status === SessionStatus.COMPLETED ? new Date(started.getTime() + 45_000) : null;
        const vars = s.M ? { catchment_area: s.M, dicken_c: 11.4, Q_dicken: s.Q } : {};

        await db.calcSession.upsert({
            where: { id: s.id },
            update: {},
            create: {
                id: s.id,
                calcWorkflowId: s.wfId,
                versionId: s.vId,
                versionNum: 1,
                actorId: s.actorId,
                status: s.status,
                variables: vars,
                currentNodeId: s.status === SessionStatus.PAUSED ? inputNode.id : null,
                pausedAt: s.status === SessionStatus.PAUSED ? new Date() : null,
                pauseReason: s.status === SessionStatus.PAUSED ? "Awaiting user input" : null,
                executionOrder: [inputNode.id, formulaNode.id, displayNode.id],
                currentIndex: s.status === SessionStatus.PAUSED ? 0 : 3,
                runMode: RunMode.SINGLE,
                startedAt: started,
                completedAt: completed,
                duration: completed ? 45 : null,
                error:
                    s.status === SessionStatus.ERRORED
                        ? { message: "Division by zero in formula node" }
                        : null,
                createdAt: started,
                updatedAt: completed ?? started,
            },
        });

        // NodeExecution rows for completed sessions
        if (s.status === SessionStatus.COMPLETED && s.Q) {
            for (const [i, node] of [inputNode, formulaNode, displayNode].entries()) {
                await db.calcNodeExecution.upsert({
                    where: { id: `ne_${s.id}_${i}` },
                    update: {},
                    create: {
                        id: `ne_${s.id}_${i}`,
                        sessionId: s.id,
                        calcNodeId: node.id,
                        status: NodeExecutionStatus.COMPLETED,
                        stepNumber: i + 1,
                        inputVars: i === 0 ? {} : { catchment_area: s.M, dicken_c: 11.4 },
                        outputVars: i === 1 ? { Q_dicken: s.Q } : {},
                        result: i === 1 ? { value: s.Q, expression: `11.4 * ${s.M}^(3/4)` } : null,
                        startedAt: new Date(started.getTime() + i * 5_000),
                        completedAt: new Date(started.getTime() + (i + 1) * 5_000),
                        durationMs: 5_000,
                    },
                });
            }
        }
    }

    console.log("✅  Execution sessions + node executions");

    // ── 14. WORKSPACES ────────────────────────────────────────────────────────────

    const ws = await db.workspace.upsert({
        where: { id: "ws_bh_main" },
        update: {},
        create: {
            id: "ws_bh_main",
            organizationId: orgs[0].id,
            name: "IRC Calculations",
            description: "Standard IRC bridge design calculations",
            icon: "building2",
            visibility: Visibility.PRIVATE,
        },
    });

    const rootNode = await db.workspaceNode.upsert({
        where: { id: "wsn_root" },
        update: {},
        create: {
            id: "wsn_root",
            workspaceId: ws.id,
            nodeType: WorkspaceNodeType.ROOT,
            name: "IRC Calculations",
            sortOrder: 0,
        },
    });

    const floodFolder = await db.workspaceNode.upsert({
        where: { id: "wsn_flood_folder" },
        update: {},
        create: {
            id: "wsn_flood_folder",
            workspaceId: ws.id,
            parentId: rootNode.id,
            nodeType: WorkspaceNodeType.FOLDER,
            name: "Flood Discharge",
            icon: "droplets",
            sortOrder: 0,
        },
    });

    await db.workspaceNode.upsert({
        where: { id: "wsn_dicken_link" },
        update: {},
        create: {
            id: "wsn_dicken_link",
            workspaceId: ws.id,
            parentId: floodFolder.id,
            nodeType: WorkspaceNodeType.WORKFLOW_LINK,
            name: "Dicken's formula",
            linkedWorkflowId: "wf_dicken",
            linkedVersion: 1,
            sortOrder: 0,
        },
    });

    console.log("✅  Workspace + folder tree");

    // ── 15. AUDIT LOGS ────────────────────────────────────────────────────────────

    const auditEvents = [
        {
            id: "audit_1",
            actorId: actors[0].id,
            resourceType: AuditResourceType.WORKFLOW,
            resourceId: "wf_dicken",
            calcWorkflowId: "wf_dicken",
            action: AuditAction.PUBLISHED,
            changes: { version: 1 },
            createdAt: daysAgo(15),
        },
        {
            id: "audit_2",
            actorId: actors[1].id,
            resourceType: AuditResourceType.WORKFLOW,
            resourceId: "wf_scour",
            calcWorkflowId: "wf_scour",
            action: AuditAction.PUBLISHED,
            changes: { version: 1 },
            createdAt: daysAgo(10),
        },
        {
            id: "audit_3",
            actorId: actors[0].id,
            resourceType: AuditResourceType.WORKFLOW,
            resourceId: "wf_dicken",
            calcWorkflowId: "wf_dicken",
            action: AuditAction.WORKFLOW_RUN_STARTED,
            changes: { sessionId: "sess_1" },
            createdAt: daysAgo(2),
        },
        {
            id: "audit_4",
            actorId: actors[0].id,
            resourceType: AuditResourceType.WORKFLOW,
            resourceId: "wf_dicken",
            calcWorkflowId: "wf_dicken",
            action: AuditAction.WORKFLOW_RUN_COMPLETED,
            changes: { sessionId: "sess_1", Q_dicken: 152.06 },
            createdAt: daysAgo(2),
        },
        {
            id: "audit_5",
            actorId: actors[2].id,
            resourceType: AuditResourceType.NODE,
            resourceId: "node_dicken_formula",
            calcWorkflowId: "wf_dicken",
            action: AuditAction.NODE_CONFIG_CHANGED,
            changes: { field: "config.expression", before: "C * M^0.75", after: "C * M^(3/4)" },
            createdAt: daysAgo(3),
        },
        {
            id: "audit_6",
            actorId: adminActor.id,
            resourceType: AuditResourceType.WORKFLOW,
            resourceId: "org_waterflow",
            calcWorkflowId: null,
            action: AuditAction.UPDATED,
            changes: { orgId: orgs[4].id, change: "billing status set to CANCELED" },
            createdAt: hoursAgo(3),
        },
        {
            id: "audit_7",
            actorId: adminActor.id,
            resourceType: AuditResourceType.FORMULA_REGISTRY,
            resourceId: "freg_dicken",
            calcWorkflowId: null,
            action: AuditAction.REGISTRY_ITEM_CREATED,
            changes: null,
            createdAt: daysAgo(5),
        },
    ];

    for (const a of auditEvents) {
        await db.auditLog.upsert({
            where: { id: a.id },
            update: {},
            create: {
                id: a.id,
                actorId: a.actorId,
                resourceType: a.resourceType,
                resourceId: a.resourceId,
                calcWorkflowId: a.calcWorkflowId,
                action: a.action,
                changes: a.changes,
                createdAt: a.createdAt,
                expiresAt: new Date(a.createdAt.getTime() + 2 * 365 * 24 * 60 * 60 * 1000),
            },
        });
    }

    console.log("✅  Audit logs");

    // ── 16. BATCH JOBS ────────────────────────────────────────────────────────────

    const batchJob = await db.batchJob.upsert({
        where: { id: "batch_1" },
        update: {},
        create: {
            id: "batch_1",
            calcWorkflowId: "wf_dicken",
            actorId: actors[0].id,
            fileName: "site_survey_batch_march.xlsx",
            totalRows: 12,
            processedRows: 12,
            successRows: 11,
            errorRows: 1,
            columns: ["site_id", "catchment_area_km2", "dicken_c"],
            columnMapping: { catchment_area_km2: "catchment_area", dicken_c: "dicken_c" },
            status: BatchStatus.COMPLETED,
            errorSummary: "Row 9: catchment_area value missing",
            startedAt: daysAgo(4),
            completedAt: daysAgo(4),
        },
    });

    for (let r = 1; r <= 5; r++) {
        const M = 50 + r * 12;
        const Q = parseFloat((11.4 * Math.pow(M, 0.75)).toFixed(2));
        await db.batchRowExecution.upsert({
            where: { id: `brow_${r}` },
            update: {},
            create: {
                id: `brow_${r}`,
                batchJobId: batchJob.id,
                rowNumber: r,
                inputData: { site_id: `S-0${r}`, catchment_area: M, dicken_c: 11.4 },
                status: "SUCCESS",
                outputData: { Q_dicken: Q },
                variables: { catchment_area: M, dicken_c: 11.4, Q_dicken: Q },
                durationMs: randomBetween(200, 800),
            },
        });
    }

    console.log("✅  Batch jobs + row executions");

    // ── DONE ──────────────────────────────────────────────────────────────────────

    console.log(`
┌──────────────────────────────────────────────────────────┐
│  🎉  Seed complete!                                       │
│                                                          │
│  Super admin login                                       │
│    Email:    admin@floodrix.com                          │
│    Password: password123                                 │
│    Role:     SUPER_ADMIN                                 │
│                                                          │
│  What was seeded                                         │
│    3  billing plans   (Free / Pro / Enterprise)          │
│    6  users           (1 super admin + 5 org users)      │
│    6  organizations   (5 real + 1 admin personal)        │
│    5  billing records                                    │
│    6  calc workflows  (2 listed, 1 pending, 3 draft)     │
│    4  calc versions                                      │
│    4  library submissions (2 approved, 2 pending)        │
│    2  formula registry items  (system)                   │
│    2  table registry items    (system)                   │
│    6  execution sessions      (3 complete, 1 paused, 1 err)│
│    1  workspace + folder tree                            │
│    7  audit log entries                                  │
│    1  batch job (12 rows, 11 success, 1 error)           │
└──────────────────────────────────────────────────────────┘
`);
}

main()
    .catch((e) => {
        console.error("❌  Seed failed:", e);
        process.exit(1);
    })
    .finally(() => db.$disconnect());