"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LifeBuoy,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  FileText,
  Building,
  User,
  Sliders,
  Send,
  Eye
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";

interface SupportTicket {
  id: string;
  tenant_id: string;
  user_id: string;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "open" | "resolved" | "closed";
  resolution_notes?: string;
  created_at: string;
}

export default function SupportTicketsView() {
  const queryClient = useQueryClient();
  const { authFetch } = useApi();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved" | "closed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [ticketStatus, setTicketStatus] = useState<"open" | "resolved" | "closed">("open");
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Fetch live support tickets
  const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["admin-support-tickets"],
    queryFn: async () => {
      const res = await authFetch("/api/v1/system/support-tickets");
      if (!res.ok) throw new Error("Failed to fetch support tickets");
      return res.json();
    },
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, status, resolutionNotes }: { ticketId: string; status: string; resolutionNotes: string }) => {
      const res = await authFetch(`/api/v1/system/support-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution_notes: resolutionNotes }),
      });
      if (!res.ok) throw new Error("Failed to update support ticket");
      return res.json();
    },
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData(["admin-support-tickets"], (old: any) =>
        old ? old.map((t: any) => (t.id === updatedTicket.id ? updatedTicket : t)) : []
      );
      setShowEditModal(false);
      setSelectedTicket(null);
      alert("Support ticket updated successfully.");
    },
    onError: (err: any) => {
      alert("Error updating support ticket: " + err.message);
    }
  });

  const handleOpenEditModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setTicketStatus(ticket.status);
    setResolutionNotes(ticket.resolution_notes || "");
    setShowEditModal(true);
  };

  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    updateTicketMutation.mutate({
      ticketId: selectedTicket.id,
      status: ticketStatus,
      resolutionNotes: resolutionNotes
    });
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.tenant_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-405 border-red-200/50 dark:border-red-900/30";
      case "medium":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-455 border-amber-200/50 dark:border-amber-900/30";
      default:
        return "bg-slate-50 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/30";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450 border-emerald-250 dark:border-emerald-850";
      case "closed":
        return "bg-slate-100 text-slate-550 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-800";
      default:
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-455 border-amber-250 dark:border-amber-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Platform Support Tickets</h1>
          <p className="text-xs text-slate-500 dark:text-slate-450">
            Monitor and resolve incoming tenant support issues, report details, and log resolutions.
          </p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by subject, description, tenant ID, or user Clerk ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Status select */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Priority select */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

      </div>

      {/* Ticket List/Table */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-450 animate-pulse">Loading support tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-450">No support tickets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-250 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500">
                  <th className="px-6 py-4">Tenant / User</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date Filed</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-all duration-200">
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-350">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        <span>Tenant: {ticket.tenant_id}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <User className="h-3 w-3" />
                        <span>By: {ticket.user_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs md:max-w-md">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{ticket.subject}</span>
                        <span className="text-[10px] text-slate-450 block truncate max-w-sm mt-0.5">{ticket.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold capitalize ${getPriorityBadge(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(ticket.status)}`}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(ticket.created_at).toLocaleString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(ticket)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-all"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Resolve</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit/Resolve Support Ticket Modal */}
      <AnimatePresence>
        {showEditModal && selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowEditModal(false); setSelectedTicket(null); }}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl z-50 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-blue-600 animate-pulse" />
                  <span className="font-bold text-sm">Resolve Support Ticket</span>
                </div>
                <button onClick={() => { setShowEditModal(false); setSelectedTicket(null); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Ticket Details */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-850 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ticket ID: {selectedTicket.id}</span>
                    <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold capitalize ${getPriorityBadge(selectedTicket.priority)}`}>
                      {selectedTicket.priority} Priority
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-snug">{selectedTicket.subject}</h3>
                    <p className="text-slate-550 dark:text-slate-400 mt-1.5 leading-relaxed whitespace-pre-wrap font-semibold">{selectedTicket.description}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-450 font-semibold">
                    <span>Tenant ID: <strong className="text-slate-700 dark:text-slate-350">{selectedTicket.tenant_id}</strong></span>
                    <span>Reporter: <strong className="text-slate-700 dark:text-slate-350 font-mono">{selectedTicket.user_id}</strong></span>
                  </div>
                </div>

                {/* Resolution Form */}
                <form onSubmit={handleSaveUpdate} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-650 dark:text-slate-400">Update Status</label>
                    <div className="flex gap-4">
                      {["open", "resolved", "closed"].map((st) => (
                        <label key={st} className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="ticket_status"
                            value={st}
                            checked={ticketStatus === st}
                            onChange={() => setTicketStatus(st as any)}
                            className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                          />
                          <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">{st}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-650 dark:text-slate-400">Resolution Notes</label>
                    <textarea
                      rows={4}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Specify resolution actions, bug fixes, or response details sent to the user..."
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                    <button
                      type="button"
                      onClick={() => { setShowEditModal(false); setSelectedTicket(null); }}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateTicketMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/10"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{updateTicketMutation.isPending ? "Updating..." : "Save Resolution"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
