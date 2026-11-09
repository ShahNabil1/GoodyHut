import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, RefreshCw, Loader2, CheckCircle2, XCircle, Eye, MousePointerClick,
  Send, AlertTriangle, Ban, Clock, ArrowLeft, Copy, ExternalLink, Inbox, Filter
} from "lucide-react";

interface EmailEvent {
  id: string;
  resend_id: string | null;
  email_to: string | null;
  subject: string | null;
  template_slug: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: typeof Send; color: string; bg: string }> = {
  "email.sent": { label: "Sent", icon: Send, color: "text-blue-600", bg: "bg-blue-100" },
  "email.delivered": { label: "Delivered", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
  "email.opened": { label: "Opened", icon: Eye, color: "text-violet-600", bg: "bg-violet-100" },
  "email.clicked": { label: "Clicked", icon: MousePointerClick, color: "text-indigo-600", bg: "bg-indigo-100" },
  "email.bounced": { label: "Bounced", icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  "email.complained": { label: "Complained", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
  "email.delivery_delayed": { label: "Delayed", icon: Clock, color: "text-orange-600", bg: "bg-orange-100" },
  "email.unsubscribed": { label: "Unsubscribed", icon: Ban, color: "text-gray-600", bg: "bg-gray-100" },
};

const EmailAnalytics = ({ onBack }: { onBack: () => void }) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<EmailEvent | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    setWebhookUrl(`https://${projectId}.supabase.co/functions/v1/resend-webhook`);
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("email_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter !== "all") {
      query = query.eq("event_type", filter);
    }

    const { data, error } = await query;
    if (data) setEvents(data as EmailEvent[]);
    if (error) {
      console.error(error);
      toast({ title: "Failed to load events", variant: "destructive" });
    }
    setLoading(false);
  }, [filter, toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const stats = events.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const allEventTypes = Object.keys(EVENT_CONFIG);
  const totalSent = stats["email.sent"] || 0;
  const totalDelivered = stats["email.delivered"] || 0;
  const totalOpened = stats["email.opened"] || 0;
  const totalBounced = stats["email.bounced"] || 0;
  const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : "0";
  const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : "0";
  const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : "0";

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "Webhook URL copied ✅" });
  };

  const getEventConfig = (type: string) => EVENT_CONFIG[type] || { label: type, icon: Inbox, color: "text-muted-foreground", bg: "bg-muted" };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("bn-BD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted/60 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BarChart3 size={20} className="text-primary" /> Email Analytics & Webhooks
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Resend webhook events — delivery, opens, clicks, bounces</p>
          </div>
        </div>
        <button
          onClick={loadEvents}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Webhook URL Setup */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <ExternalLink size={14} className="text-primary" /> Webhook URL
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Resend Dashboard → Webhooks → Add Endpoint → Paste the URL below and select all events
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground break-all">
            {webhookUrl}
          </code>
          <button
            onClick={copyWebhookUrl}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Copy size={14} /> Copy
          </button>
        </div>
        <a
          href="https://resend.com/webhooks"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
        >
          Resend Webhooks Dashboard <ExternalLink size={10} />
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Delivery Rate", value: `${deliveryRate}%`, sub: `${totalDelivered}/${totalSent}`, color: "text-emerald-600" },
          { label: "Open Rate", value: `${openRate}%`, sub: `${totalOpened} opened`, color: "text-violet-600" },
          { label: "Bounce Rate", value: `${bounceRate}%`, sub: `${totalBounced} bounced`, color: "text-red-600" },
          { label: "Total Events", value: String(events.length), sub: "all types", color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`text-xl font-bold ${s.color} mt-1`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Event Type Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-muted-foreground" />
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({events.length})
        </button>
        {allEventTypes.map((type) => {
          const cfg = getEventConfig(type);
          const count = stats[type] || 0;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === type ? `${cfg.bg} ${cfg.color}` : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Events List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Inbox size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No events found</p>
            <p className="text-xs mt-1">Events will appear here once the Resend webhook URL is configured</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[50vh] overflow-y-auto">
            {events.map((event) => {
              const cfg = getEventConfig(event.event_type);
              const Icon = cfg.icon;
              return (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={14} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-muted-foreground truncate">{event.email_to}</span>
                      </div>
                      {event.subject && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{event.subject}</div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatTime(event.created_at)}</span>
                  </div>

                  {/* Expanded detail */}
                  {selectedEvent?.id === event.id && (
                    <div className="mt-3 bg-muted/30 rounded-lg p-3 text-xs space-y-1" onClick={(e) => e.stopPropagation()}>
                      <div><strong>Resend ID:</strong> <code className="bg-muted px-1 rounded">{event.resend_id || "N/A"}</code></div>
                      <div><strong>To:</strong> {event.email_to || "N/A"}</div>
                      <div><strong>Subject:</strong> {event.subject || "N/A"}</div>
                      <div><strong>Event:</strong> <span className={cfg.color}>{event.event_type}</span></div>
                      <div><strong>Time:</strong> {new Date(event.created_at).toLocaleString("bn-BD")}</div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-primary hover:underline">Raw Event Data</summary>
                        <pre className="mt-1 bg-background border border-border rounded p-2 overflow-x-auto text-xs font-mono max-h-48">
                          {JSON.stringify(event.event_data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailAnalytics;
