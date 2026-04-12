export default function AdminDashboardPage() {
    return (
        <div className="content">
            {/* 1. Stat Grid */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-label">Total organizations</div>
                    <div className="stat-val">48</div>
                    <div className="stat-delta up">+3 this month</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Calc workflows</div>
                    <div className="stat-val">189</div>
                    <div className="stat-delta up">+22 this month</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Active sessions today</div>
                    <div className="stat-val">74</div>
                    <div className="stat-delta up">Running or paused</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Library submissions</div>
                    <div className="stat-val">14</div>
                    <div className="stat-delta down">Awaiting review</div>
                </div>
            </div>

            {/* 2. Quick Create Grid */}
            <div className="create-grid">
                <div className="create-item">
                    <div className="create-icon red">
                        <svg viewBox="0 0 16 16" fill="none" stroke="var(--red-600)"><path d="M2 10 L5 4 L8 8 L11 6 L14 10" /><rect x="1" y="2" width="14" height="12" rx="1.5" /></svg>
                    </div>
                    <div>
                        <div className="create-title">New calc workflow</div>
                        <div className="create-desc">IRC hydraulics calculation for an organization</div>
                    </div>
                </div>
                <div className="create-item">
                    <div className="create-icon blue">
                        <svg viewBox="0 0 16 16" fill="none" stroke="#185FA5"><rect x="1" y="3" width="5" height="4" rx="1" /><rect x="10" y="3" width="5" height="4" rx="1" /><rect x="5.5" y="9" width="5" height="4" rx="1" /><path d="M3.5 7v2h9V7" /></svg>
                    </div>
                    <div>
                        <div className="create-title">New automation workflow</div>
                        <div className="create-desc">n8n-style automation for an org</div>
                    </div>
                </div>
                <div className="create-item">
                    <div className="create-icon teal">
                        <svg viewBox="0 0 16 16" fill="none" stroke="#0F6E56"><rect x="1" y="2" width="14" height="12" rx="1.5" /><path d="M1 6h14M5 6v8" /></svg>
                    </div>
                    <div>
                        <div className="create-title">New workspace</div>
                        <div className="create-desc">Folder canvas for an organization</div>
                    </div>
                </div>
                <div className="create-item">
                    <div className="create-icon purple">
                        <svg viewBox="0 0 16 16" fill="none" stroke="#534AB7"><path d="M8 1 L10 6 L15 6 L11 9.5 L12.5 14.5 L8 11.5 L3.5 14.5 L5 9.5 L1 6 L6 6Z" /></svg>
                    </div>
                    <div>
                        <div className="create-title">Publish formula</div>
                        <div className="create-desc">Add system formula to public registry</div>
                    </div>
                </div>
                <div className="create-item">
                    <div className="create-icon amber">
                        <svg viewBox="0 0 16 16" fill="none" stroke="#854F0B"><rect x="1" y="3" width="14" height="10" rx="1" /><path d="M1 7h14M5 7v6M9 7v6" /></svg>
                    </div>
                    <div>
                        <div className="create-title">Publish table</div>
                        <div className="create-desc">Add system coefficient table for all orgs</div>
                    </div>
                </div>
                <div className="create-item">
                    <div className="create-icon red">
                        <svg viewBox="0 0 16 16" fill="none" stroke="var(--red-600)"><path d="M14 10c0 2.2-2.7 4-6 4S2 12.2 2 10V6c0-2.2 2.7-4 6-4s6 1.8 6 4v4z" /><path d="M8 2v4" /></svg>
                    </div>
                    <div>
                        <div className="create-title">New organization</div>
                        <div className="create-desc">Manually onboard a team or enterprise</div>
                    </div>
                </div>
            </div>

            {/* 3. Main Split Section (Organizations & Alerts) */}
            <div className="two-col">
                <div className="card">
                    <div className="section-header">
                        <div className="section-title">Organizations</div>
                        <button className="btn" style={{ fontSize: "12px", padding: "4px 10px" }}>View all</button>
                    </div>
                    <div>
                        <div className="org-row">
                            <div className="org-avatar">BH</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: 500 }}>Bridge House Consultants</div>
                                <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>12 members · 34 workflows</div>
                            </div>
                            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                                <span className="tag green">Active</span>
                                <span className="tag blue">Pro</span>
                            </div>
                        </div>
                        <div className="org-row">
                            <div className="org-avatar" style={{ background: "var(--red-100)", color: "var(--red-800)" }}>NH</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: 500 }}>NH Infra Pvt Ltd</div>
                                <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>5 members · 18 workflows</div>
                            </div>
                            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                                <span className="tag green">Active</span>
                                <span className="tag gray">Free</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div className="card">
                        <div className="section-header">
                            <div className="section-title">System alerts</div>
                        </div>
                        <div>
                            <div className="alert-item">
                                <div className="alert-icon amber">
                                    <svg viewBox="0 0 14 14" fill="none" stroke="#BA7517" strokeWidth="2"><path d="M7 1L13 12H1L7 1z" /><path d="M7 5v3M7 10v.5" /></svg>
                                </div>
                                <div>
                                    <div style={{ fontSize: "13px", fontWeight: 500 }}>3 batch jobs stuck &gt; 30 min</div>
                                    <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>Inngest queue may need attention</div>
                                </div>
                            </div>
                            <div className="alert-item">
                                <div className="alert-icon red">
                                    <svg viewBox="0 0 14 14" fill="none" stroke="var(--red-600)" strokeWidth="2"><circle cx="7" cy="7" r="6" /><path d="M7 4v3M7 9v.5" /></svg>
                                </div>
                                <div>
                                    <div style={{ fontSize: "13px", fontWeight: 500 }}>Waterflow Design Inc — payment failed</div>
                                    <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>Account suspended · contact required</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Bottom Audit Log Table */}
            <div className="card">
                <div className="section-header">
                    <div className="section-title">Recent audit events</div>
                    <button className="btn" style={{ fontSize: "12px", padding: "4px 10px" }}>Full audit log</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Time</th><th>Actor</th><th>Organization</th><th>Action</th><th>Resource</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ color: "var(--color-text-secondary)", fontSize: "12px", whiteSpace: "nowrap" }}>2 min ago</td>
                            <td style={{ fontSize: "12px" }}>Priya M.</td>
                            <td style={{ fontSize: "12px" }}>Bridge House</td>
                            <td><span className="tag blue">Published</span></td>
                            <td style={{ fontSize: "12px" }}>Flood calc v3</td>
                        </tr>
                        <tr>
                            <td style={{ color: "var(--color-text-secondary)", fontSize: "12px", whiteSpace: "nowrap" }}>14 min ago</td>
                            <td style={{ fontSize: "12px" }}>Arjun K.</td>
                            <td style={{ fontSize: "12px" }}>TechRoads</td>
                            <td><span className="tag green">Run completed</span></td>
                            <td style={{ fontSize: "12px" }}>Scour depth session</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    );
}