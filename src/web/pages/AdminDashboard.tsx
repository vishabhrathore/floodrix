"use client";

import React, { useEffect } from "react";

import {
  Activity,
  AlertCircle,
  Building2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileSignature,
  Files,
  Filter,
  FolderPlus,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  Table,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

const AdminDashboard: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const stats = [
    {
      label: "Total Organizations",
      value: "7",
      change: "+0 this month",
      icon: <Building2 className="w-5 h-5" />,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: "Calc Workflows",
      value: "6",
      change: "+0 this month",
      icon: <Files className="w-5 h-5" />,
      color: "text-brand-red",
      bg: "bg-red-50",
    },
    {
      label: "Active Sessions Today",
      value: "0",
      change: "Running or paused",
      icon: <PlayCircle className="w-5 h-5" />,
      color: "text-brand-teal",
      bg: "bg-teal-50",
    },
    {
      label: "Library Submissions",
      value: "2",
      change: "Awaiting review",
      icon: <Clock className="w-5 h-5" />,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
  ];

  const quickActions = [
    {
      label: "New calc workflow",
      sub: "IRC hydraulics calculation",
      icon: <Plus className="w-4 h-4" />,
      accent: "text-brand-red",
    },
    {
      label: "New automation",
      sub: "n8n-style automation",
      icon: <Zap className="w-4 h-4" />,
      accent: "text-blue-500",
    },
    {
      label: "New workspace",
      sub: "Folder canvas for org",
      icon: <FolderPlus className="w-4 h-4" />,
      accent: "text-brand-teal",
    },
    {
      label: "Publish formula",
      sub: "Add to public registry",
      icon: <FileSignature className="w-4 h-4" />,
      accent: "text-purple-500",
    },
    {
      label: "Publish table",
      sub: "Add system coefficient table",
      icon: <Table className="w-4 h-4" />,
      accent: "text-amber-500",
    },
    {
      label: "New organization",
      sub: "Manually onboard a team",
      icon: <Users className="w-4 h-4" />,
      accent: "text-brand-red",
    },
  ];

  const organizations = [
    {
      name: "Bridge House Consultants",
      members: 12,
      workflows: 34,
      tier: "Pro",
      status: "Active",
      initials: "BH",
    },
    {
      name: "NH Infra Pvt Ltd",
      members: 5,
      workflows: 18,
      tier: "Free",
      status: "Active",
      initials: "NH",
    },
  ];

  const auditEvents = [
    {
      time: "2 min ago",
      actor: "Priya M.",
      org: "Bridge House",
      action: "Published",
      resource: "Flood calc v3",
      actionColor: "bg-blue-100 text-blue-700",
    },
    {
      time: "14 min ago",
      actor: "Arjun K.",
      org: "TechRoads",
      action: "Run completed",
      resource: "Scour depth session",
      actionColor: "bg-green-100 text-green-700",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-24 pb-20 px-6 md:px-12 lg:px-24">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-serif text-brand-dark mb-1">
          Admin Dashboard
        </h1>
        <p className="text-gray-400 text-sm font-sans">
          System-wide overview and administrative controls
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-brand-teal transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="text-gray-400 uppercase tracking-widest text-[10px] font-bold">
                {stat.label}
              </div>
              <div className={`${stat.bg} ${stat.color} p-2 rounded-lg`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-3xl font-bold text-brand-dark mb-1">
              {stat.value}
            </div>
            <div
              className={`text-[10px] font-medium flex items-center gap-1 ${stat.change.includes("+") ? "text-green-500" : "text-gray-400"}`}
            >
              {stat.change.includes("+") && (
                <span className="rotate-45 block">↗</span>
              )}
              {stat.change}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {quickActions.map((action, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 text-left hover:border-brand-teal hover:shadow-md transition-all group"
          >
            <div
              className={`${action.accent} bg-gray-50 p-3 rounded-lg group-hover:scale-110 transition-transform`}
            >
              {action.icon}
            </div>
            <div>
              <div className="text-sm font-bold text-brand-dark">
                {action.label}
              </div>
              <div className="text-[10px] text-gray-400">{action.sub}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Organizations Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-sm font-bold text-brand-dark flex items-center gap-2">
                Organizations
                <span className="bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full text-[10px] font-mono">
                  7 Total
                </span>
              </h2>
              <button className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-brand-dark transition-colors border border-gray-200 px-3 py-1 rounded-lg">
                View all
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {organizations.map((org, i) => (
                <div
                  key={i}
                  className="px-6 py-5 flex items-center justify-between group hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-brand-dark group-hover:text-white transition-all">
                      {org.initials}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-brand-dark mb-1">
                        {org.name}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono tracking-wider flex items-center gap-3">
                        <span>{org.members} members</span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                        <span>{org.workflows} workflows</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-green-50 text-green-600 text-[9px] font-bold uppercase tracking-wider rounded-md border border-green-100">
                      {org.status}
                    </span>
                    <span
                      className={`${org.tier === "Pro" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-500 border-gray-100"} px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border`}
                    >
                      {org.tier}
                    </span>
                    <button className="p-2 text-gray-300 hover:text-brand-dark transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Events Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-sm font-bold text-brand-dark flex items-center gap-2">
                Recent audit events
                <Activity className="w-3 h-3 text-gray-300" />
              </h2>
              <button className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-brand-dark transition-colors border border-gray-200 px-3 py-1 rounded-lg">
                Full audit log
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/60 text-[10px] text-gray-400 uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-6 py-3 font-bold">Time</th>
                    <th className="px-6 py-3 font-bold">Actor</th>
                    <th className="px-6 py-3 font-bold">Organization</th>
                    <th className="px-6 py-3 font-bold">Action</th>
                    <th className="px-6 py-3 font-bold">Resource</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {auditEvents.map((event, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-400 font-mono">
                        {event.time}
                      </td>
                      <td className="px-6 py-4 font-bold text-brand-dark">
                        {event.actor}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{event.org}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-md text-[9px] font-bold font-mono ${event.actionColor}`}
                        >
                          {event.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono italic">
                        {event.resource}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Sections */}
        <div className="space-y-8">
          {/* System Alerts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
              <h2 className="text-sm font-bold text-brand-dark">
                System Alerts
              </h2>
            </div>
            <div className="p-6">
              <div className="flex gap-4 p-4 bg-red-50 border border-red-100 rounded-xl group hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300">
                <div className="text-brand-red flex-shrink-0 pt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-brand-dark mb-1">
                    Waterflow Design Inc — payment failed
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
                    Account suspended - contact required to restore access to
                    calc workflows.
                  </p>
                  <button className="text-[9px] uppercase tracking-widest font-bold text-brand-red hover:underline flex items-center gap-1">
                    Manage billing <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* User Verification / Quick Status */}
          <div className="bg-brand-dark rounded-2xl p-6 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-brand-red/20 transition-all duration-700" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/10 p-2 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-brand-teal" />
                </div>
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-40">
                  Security Status
                </span>
              </div>
              <h3 className="text-lg font-bold mb-2">Systems Operational</h3>
              <p className="text-white/40 text-[11px] leading-relaxed mb-6 font-sans">
                All flood routing engines and global GIS synchronization
                clusters are operating within normal parameters (Latency: 42ms).
              </p>
              <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                Run Diagnostic
              </button>
            </div>
          </div>

          {/* Search/Filters Placeholder */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="text"
                placeholder="Find anything..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-10 pr-4 text-xs focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-500 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                <Filter className="w-3 h-3" /> Filters
              </button>
              <button className="px-3 bg-gray-50 hover:bg-gray-100 text-gray-500 py-2 rounded-lg transition-all">
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
