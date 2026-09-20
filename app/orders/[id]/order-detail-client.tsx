"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  ArrowLeft, 
  Building2, 
  User, 
  Calendar, 
  Video, 
  IndianRupee, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Edit3, 
  Layers, 
  FileText, 
  Sparkles 
} from "lucide-react";
import { StatusBadge } from "@/components/navigation/app-navbar";

interface OrderDetail {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  companyName: string | null;
  packageId: string | null;
  packageNameSnapshot: string;
  contractedVideoCount: number;
  pricing: number;
  taxRate: number;
  taxAmount: number;
  totalInvoiceAmount: number;
  amountReceived: number;
  outstandingBalance: number;
  startDate: string | null;
  dueDate: string | null;
  assignedTeam: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  orderedVideos: number;
  remainingQuota: number;
  activityLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    metadata: any;
  }>;
}

interface OrderDetailClientProps {
  orderId: string;
  currentUser: any;
  canUpdate: boolean;
}

const ALL_ORDER_STATUSES = [
  "NEW",
  "ONBOARDING",
  "IN_PRODUCTION",
  "PARTIALLY_DELIVERED",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
];

export function OrderDetailClient({ orderId, currentUser, canUpdate }: OrderDetailClientProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState("");

  // Video Requests state
  const [videoRequests, setVideoRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [reqTitle, setReqTitle] = useState("");
  const [reqHook, setReqHook] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const [reqAudience, setReqAudience] = useState("");
  const [reqRefs, setReqRefs] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqError, setReqError] = useState("");
  const [reqSuccess, setReqSuccess] = useState(false);

  const fetchVideoRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await fetch(`/api/videos/request?orderId=${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setVideoRequests(data.videoRequests || []);
      }
    } catch (err) {
      console.error("Failed to load video requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        throw new Error("Order not found or access denied");
      }
      const data = await res.json();
      setOrder(data.order);
      setNextStatus(data.order.status);
    } catch (err: any) {
      setError(err.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    fetchVideoRequests();
  }, [orderId]);

  const handleCreateVideoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setReqError("");
    setSubmittingReq(true);

    try {
      const links = reqRefs
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const res = await fetch("/api/videos/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          title: reqTitle,
          hookAngle: reqHook,
          coreMessage: reqMessage || undefined,
          targetAudience: reqAudience || undefined,
          referenceLinks: links,
          notes: reqNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit video request.");
      }

      setReqSuccess(true);
      fetchOrder();
      fetchVideoRequests();

      setTimeout(() => {
        setShowVideoModal(false);
        setReqSuccess(false);
        setReqTitle("");
        setReqHook("");
        setReqMessage("");
        setReqAudience("");
        setReqRefs("");
        setReqNotes("");
      }, 1200);
    } catch (err: any) {
      setReqError(err.message || "Failed to submit video request.");
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setStatusUpdating(true);
    setStatusError("");

    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          reason: statusReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusError(data.error || "Failed to update order status");
        setStatusUpdating(false);
        return;
      }

      setShowStatusModal(false);
      fetchOrder();
    } catch (err: any) {
      setStatusError(err.message || "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error || "Order not found."}</span>
        </div>
        <Link
          href="/orders"
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-md transition"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-amber-400 font-bold">
                #{order.id.slice(0, 8)}
              </span>
              <StatusBadge status={order.status} type="order" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
              {order.packageNameSnapshot}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {order.remainingQuota > 0 && (
            <button
              onClick={() => {
                setReqError("");
                setReqSuccess(false);
                setShowVideoModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg transition shadow-sm"
            >
              <Video className="w-3.5 h-3.5" />
              Request New Video
            </button>
          )}

          {canUpdate && (
            <button
              onClick={() => {
                setNextStatus(order.status);
                setStatusError("");
                setStatusReason("");
                setShowStatusModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Transition Status
            </button>
          )}
        </div>
      </div>

      {/* Live Production Counter Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900/60 to-zinc-900/60 border border-amber-500/30 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Live UGC Production Counter
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Commercial deliverable tracking for this commitment. (Scripts & Video pipeline placeholders ready).
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 bg-zinc-950/80 p-3.5 rounded-lg border border-zinc-800/80 text-center">
            <div>
              <div className="text-xs text-zinc-500 font-medium">Contracted</div>
              <div className="text-lg font-bold font-mono text-zinc-200 mt-0.5">
                {order.contractedVideoCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium">Ordered</div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                {order.orderedVideos}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium">Delivered</div>
              <div className="text-lg font-bold font-mono text-zinc-500 mt-0.5">
                0 <span className="text-[10px] font-sans text-zinc-600">(Module 6)</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium">Remaining Quota</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {order.remainingQuota}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Client info, Package snapshot, Financial calculations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Reference Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
              <Building2 className="w-4 h-4 text-amber-500" />
              Client Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-500">Client Name:</span>
                <div className="mt-0.5 font-semibold text-white text-sm">
                  <Link href={`/clients/${order.clientId}`} className="hover:text-amber-400 underline decoration-zinc-700">
                    {order.clientName}
                  </Link>
                </div>
              </div>
              <div>
                <span className="text-zinc-500">Company Name:</span>
                <div className="mt-0.5 font-medium text-zinc-200">
                  {order.companyName || "—"}
                </div>
              </div>
              <div>
                <span className="text-zinc-500">Email:</span>
                <div className="mt-0.5 text-zinc-300">{order.clientEmail}</div>
              </div>
              <div>
                <span className="text-zinc-500">Phone:</span>
                <div className="mt-0.5 text-zinc-300">{order.clientPhone || "—"}</div>
              </div>
            </div>
          </div>

          {/* Package Snapshot & Delivery Parameters */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
              <Layers className="w-4 h-4 text-amber-500" />
              Package Snapshot & Schedule
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-500">Snapshotted Tier:</span>
                <div className="mt-0.5 font-bold text-white text-sm">
                  {order.packageNameSnapshot}
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Permanently stored to preserve historical contract terms.
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Contracted Video Count:</span>
                <div className="mt-0.5 font-bold font-mono text-zinc-200 flex items-center gap-1.5 text-sm">
                  <Video className="w-4 h-4 text-amber-500" />
                  {order.contractedVideoCount} Videos
                </div>
              </div>
              <div>
                <span className="text-zinc-500">Start Date:</span>
                <div className="mt-0.5 text-zinc-200">
                  {order.startDate ? new Date(order.startDate).toLocaleDateString() : "Immediate"}
                </div>
              </div>
              <div>
                <span className="text-zinc-500">Due Date:</span>
                <div className="mt-0.5 text-zinc-200 font-medium">
                  {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : "Open-ended"}
                </div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-zinc-500">Assigned Team:</span>
                <div className="mt-0.5 text-zinc-200">
                  {order.assignedTeam || "Unassigned"}
                </div>
              </div>
              {order.notes && (
                <div className="sm:col-span-2 p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-500 block mb-1">Production Notes:</span>
                  <p className="text-zinc-300 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Video Deliverables & Creative Brief Requests */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-amber-500" />
                  Video Deliverables & Creative Briefs
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Client-submitted video requests and hooks for this commitment.
                </p>
              </div>
              {order.remainingQuota > 0 && (
                <button
                  onClick={() => {
                    setReqError("");
                    setReqSuccess(false);
                    setShowVideoModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg transition"
                >
                  <Video className="w-3.5 h-3.5" />
                  Request Video ({order.remainingQuota} Left)
                </button>
              )}
            </div>

            {loadingRequests ? (
              <div className="py-8 flex justify-center text-zinc-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500 mr-2" />
                Loading deliverable requests...
              </div>
            ) : videoRequests.length === 0 ? (
              <div className="py-8 text-center bg-zinc-950/40 rounded-lg border border-zinc-800/50">
                <Video className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-zinc-300">No Video Requests Yet</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5 max-w-sm mx-auto">
                  {order.remainingQuota > 0
                    ? `You have ${order.remainingQuota} contracted video deliverables available. Submit your creative concept to begin production.`
                    : "All video deliverables have been assigned for this package commitment."}
                </p>
                {order.remainingQuota > 0 && (
                  <button
                    onClick={() => {
                      setReqError("");
                      setReqSuccess(false);
                      setShowVideoModal(true);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg transition"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Submit First Brief
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {videoRequests.map((req, idx) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            Video #{videoRequests.length - idx}
                          </span>
                          <span className="text-sm font-semibold text-white">{req.title}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          <span className="text-zinc-500 font-medium">Hook / Angle: </span>
                          {req.hookAngle}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                        {req.status}
                      </span>
                    </div>

                    {(req.coreMessage || req.targetAudience) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800/60 text-zinc-400">
                        {req.coreMessage && (
                          <div>
                            <span className="text-zinc-500">Core Message / Offer: </span>
                            <span className="text-zinc-300">{req.coreMessage}</span>
                          </div>
                        )}
                        {req.targetAudience && (
                          <div>
                            <span className="text-zinc-500">Target Audience: </span>
                            <span className="text-zinc-300">{req.targetAudience}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {req.referenceLinks && req.referenceLinks.length > 0 && (
                      <div className="text-[11px] text-zinc-500 flex flex-wrap items-center gap-2 pt-1">
                        <span>References:</span>
                        {req.referenceLinks.map((link: string, i: number) => (
                          <a
                            key={i}
                            href={link.startsWith("http") ? link : `https://${link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:underline inline-flex items-center gap-0.5 max-w-[200px] truncate"
                          >
                            Link {i + 1} &rarr;
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="text-[11px] text-zinc-600 flex items-center justify-between pt-1">
                      <span>Submitted by {req.requestedByName}</span>
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Financial Snapshot & Audit History */}
        <div className="space-y-6">
          {/* Commercial & Financial Calculation Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
              <IndianRupee className="w-4 h-4 text-amber-500" />
              Financial Breakdown
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Base Contract Pricing:</span>
                <span className="font-mono text-zinc-200">
                  ₹{Number(order.pricing).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Tax Rate:</span>
                <span className="font-mono text-zinc-200">{order.taxRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Tax Amount:</span>
                <span className="font-mono text-zinc-400">
                  ₹{Number(order.taxAmount).toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-sm font-bold">
                <span className="text-zinc-200">Total Invoice Amount:</span>
                <span className="font-mono text-amber-400">
                  ₹{Number(order.totalInvoiceAmount).toLocaleString()}
                </span>
              </div>
              <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Amount Received:</span>
                  <span className="font-mono text-emerald-400">
                    ₹{Number(order.amountReceived).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Outstanding Balance:</span>
                  <span className="font-mono text-rose-400 font-semibold">
                    ₹{Number(order.outstandingBalance).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                Payment collection & gateway reconciliation will be managed in Module 10.
              </p>
            </div>
          </div>

          {/* Order Activity / Audit Trail */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
              <Clock className="w-4 h-4 text-amber-500" />
              Order Activity Trail
            </h3>
            {order.activityLogs && order.activityLogs.length > 0 ? (
              <div className="space-y-3">
                {order.activityLogs.map((log) => (
                  <div key={log.id} className="text-xs border-l-2 border-amber-500/40 pl-3 py-1">
                    <div className="font-semibold text-zinc-200">{log.action}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Order created on {new Date(order.createdAt).toLocaleDateString()}.</p>
            )}
          </div>
        </div>
      </div>

      {/* Status Transition Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Transition Order Status
              </h2>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            {statusError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Current Status
                </label>
                <div className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400">
                  {order.status}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Target Next Status
                </label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {ALL_ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Lifecycle transitions are validated server-side according to the Leadyfy order state engine.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Reason / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Kickoff onboarding call completed..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusUpdating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg text-xs transition disabled:opacity-50"
                >
                  {statusUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Transition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Deliverable Request Modal (Creative Brief) */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-amber-500" />
                  Request Video Deliverable
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Submit creative brief for Video #{order.contractedVideoCount - order.remainingQuota + 1} ({order.remainingQuota} remaining quota)
                </p>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>

            {reqError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reqError}</span>
              </div>
            )}

            {reqSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-base font-bold text-white">Video Deliverable Requested!</h3>
                <p className="text-xs text-zinc-400">
                  Your creative brief has been routed to the scripting & production team.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateVideoRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Video Title / Angle Concept *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3 Reasons Why Traditional Skincare Fails"
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Opening Hook Idea *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Stop scrolling if you still apply your serum after moisturizer..."
                    value={reqHook}
                    onChange={(e) => setReqHook(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Target Audience / Persona
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Working women 25-35, acne-prone"
                      value={reqAudience}
                      onChange={(e) => setReqAudience(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Core Offer / CTA
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Buy 1 Get 1 Free, link in bio"
                      value={reqMessage}
                      onChange={(e) => setReqMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Reference Video URLs (One per line)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="https://tiktok.com/@example/video/123&#10;https://instagram.com/reel/abc"
                    value={reqRefs}
                    onChange={(e) => setReqRefs(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Additional Creator Notes / Do's & Don'ts
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Natural daylight preferred, make sure to show packaging clearly in first 3 seconds..."
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReq}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
                  >
                    {submittingReq && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Submit Brief & Consume Quota
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
