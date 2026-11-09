import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Eye,
  ShoppingCart,
  CreditCard,
  Search,
  UserPlus,
  MousePointerClick,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Globe,
  Clock,
  BarChart3,
  TrendingUp,
} from "lucide-react";

const EVENT_ICONS: Record<string, typeof Activity> = {
  page_view: Eye,
  view_item: MousePointerClick,
  add_to_cart: ShoppingCart,
  begin_checkout: CreditCard,
  purchase: CreditCard,
  search: Search,
  lead: UserPlus,
};

const EVENT_COLORS: Record<string, string> = {
  page_view: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  view_item: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  add_to_cart: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  begin_checkout: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  purchase: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  search: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  lead: "bg-pink-500/10 text-pink-600 border-pink-500/20",
};

const META_EVENT_MAP: Record<string, string> = {
  page_view: "PageView",
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  lead: "CompleteRegistration",
  search: "Search",
};

interface TrackingEvent {
  id: string;
  event_name: string;
  event_data: any;
  session_id: string | null;
  user_id: string | null;
  created_at: string;
}

const TrackingAnalytics = () => {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  // Fetch events
  const { data: events = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["tracking-events", filter, limit],
    queryFn: async () => {
      let query = supabase
        .from("tracking_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filter !== "all") {
        query = query.eq("event_name", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TrackingEvent[];
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["tracking-stats"],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [todayRes, weekRes, totalRes] = await Promise.all([
        supabase.from("tracking_events").select("event_name", { count: "exact", head: false }).gte("created_at", today),
        supabase.from("tracking_events").select("event_name", { count: "exact", head: false }).gte("created_at", last7d),
        supabase.from("tracking_events").select("id", { count: "exact", head: true }),
      ]);

      // Count by event type for today
      const todayByType: Record<string, number> = {};
      for (const row of todayRes.data || []) {
        todayByType[row.event_name] = (todayByType[row.event_name] || 0) + 1;
      }

      // Count by event type for week
      const weekByType: Record<string, number> = {};
      for (const row of weekRes.data || []) {
        weekByType[row.event_name] = (weekByType[row.event_name] || 0) + 1;
      }

      return {
        today: todayRes.data?.length || 0,
        week: weekRes.data?.length || 0,
        total: totalRes.count || 0,
        todayByType,
        weekByType,
      };
    },
    refetchInterval: 30000,
  });

  // Filter events by search
  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.event_name.includes(q) ||
      e.user_id?.includes(q) ||
      JSON.stringify(e.event_data || {}).toLowerCase().includes(q)
    );
  });

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const getEventBadge = (name: string) => {
    const color = EVENT_COLORS[name] || "bg-muted text-muted-foreground";
    return <Badge variant="outline" className={`${color} font-mono text-xs`}>{name}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tracking Events Monitor</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            View all tracking events in real-time — GTM, GA4, Meta Pixel & CAPI
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0"
        >
          {isFetching ? <Loader2 className="animate-spin mr-2" size={14} /> : <RefreshCw size={14} className="mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.today || 0}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.week || 0}</p>
                <p className="text-xs text-muted-foreground">Last 7 Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <BarChart3 size={18} className="text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">All Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Activity size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.todayByType?.purchase || 0}</p>
                <p className="text-xs text-muted-foreground">Purchases Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Breakdown - Today */}
      {stats?.todayByType && Object.keys(stats.todayByType).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Event Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.todayByType)
                .sort(([, a], [, b]) => b - a)
                .map(([name, count]) => (
                  <div
                    key={name}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${EVENT_COLORS[name] || "bg-muted text-muted-foreground"}`}
                  >
                    <span className="font-mono text-xs">{name}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search (event, user ID, page...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="page_view">page_view</SelectItem>
            <SelectItem value="view_item">view_item</SelectItem>
            <SelectItem value="add_to_cart">add_to_cart</SelectItem>
            <SelectItem value="begin_checkout">begin_checkout</SelectItem>
            <SelectItem value="purchase">purchase</SelectItem>
            <SelectItem value="search">search</SelectItem>
            <SelectItem value="lead">lead</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25 rows</SelectItem>
            <SelectItem value="50">50 rows</SelectItem>
            <SelectItem value="100">100 rows</SelectItem>
            <SelectItem value="200">200 rows</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Activity size={40} className="mx-auto mb-3 opacity-30" />
              <p>No events found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Meta Event</TableHead>
                    <TableHead className="hidden md:table-cell">Page / Item</TableHead>
                    <TableHead className="hidden lg:table-cell">User</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                    const Icon = EVENT_ICONS[event.event_name] || Activity;
                    const isExpanded = expandedRow === event.id;
                    const data = event.event_data || {};
                    const pagePath = data.page_path || data.event_source_url || "";
                    const itemName = data.item_name || data.content_name || data.search_term || "";
                    const displayText = itemName || pagePath;

                    return (
                      <>
                        <TableRow
                          key={event.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedRow(isExpanded ? null : event.id)}
                        >
                          <TableCell className="pr-0">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} className="text-muted-foreground" />}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon size={14} className="text-muted-foreground shrink-0" />
                              {getEventBadge(event.event_name)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono text-muted-foreground">
                              {META_EVENT_MAP[event.event_name] || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[200px] truncate text-sm text-muted-foreground">
                            {displayText || "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {event.user_id ? (
                              <span className="text-xs font-mono text-muted-foreground">
                                {event.user_id.slice(0, 8)}...
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">Anonymous</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTime(event.created_at)}
                            </span>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${event.id}-detail`}>
                            <TableCell colSpan={6} className="bg-muted/30 p-0">
                              <EventDetail event={event} />
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Flow Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Data Flow</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <div className="flex items-start gap-2">
            <Globe size={14} className="mt-0.5 text-blue-500 shrink-0" />
            <p><strong className="text-foreground">Browser → dataLayer</strong> → GTM → GA4 Event Tag + Meta Pixel Tag</p>
          </div>
          <div className="flex items-start gap-2">
            <Activity size={14} className="mt-0.5 text-emerald-500 shrink-0" />
            <p><strong className="text-foreground">Browser → meta-capi Edge Function</strong> → Logs to tracking_events table + sends to Meta CAPI</p>
          </div>
          <p className="text-xs border-t border-border pt-2 mt-2">
            Everything shown here comes from the <strong className="text-foreground">tracking_events</strong> table — i.e. server-side CAPI calls. Browser-side events (GTM/GA4/Pixel) should be verified separately in GA4 and Meta Events Manager.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

/** Expanded detail view for a single event */
const EventDetail = ({ event }: { event: TrackingEvent }) => {
  const data = event.event_data || {};

  const sections: { label: string; items: [string, any][] }[] = [
    {
      label: "📍 Location & Page",
      items: [
        ["Page Path", data.page_path],
        ["Page Title", data.page_title],
        ["Source URL", data.event_source_url],
      ].filter(([, v]) => v) as [string, any][],
    },
    {
      label: "🛒 Product / Cart",
      items: [
        ["Item ID", data.item_id],
        ["Item Name", data.item_name],
        ["Price", data.price],
        ["Quantity", data.quantity],
        ["Size", data.selected_size],
        ["Value", data.value],
        ["Currency", data.currency],
        ["Transaction ID", data.transaction_id],
        ["Search Term", data.search_term],
      ].filter(([, v]) => v !== undefined && v !== null && v !== "") as [string, any][],
    },
    {
      label: "👤 User Data",
      items: [
        ["User ID", event.user_id || data.user_id],
        ["Email", data.email ? `${data.email.slice(0, 3)}***` : null],
        ["Phone", data.phone ? `***${data.phone.slice(-4)}` : null],
        ["Name", data.full_name],
        ["City", data.city],
        ["Country", data.country],
      ].filter(([, v]) => v) as [string, any][],
    },
    {
      label: "🔗 Tracking IDs",
      items: [
        ["Event ID", data.event_id],
        ["Session ID", event.session_id],
      ].filter(([, v]) => v) as [string, any][],
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(
          (section) =>
            section.items.length > 0 && (
              <div key={section.label} className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">{section.label}</p>
                {section.items.map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground min-w-[100px]">{key}:</span>
                    <span className="font-mono text-foreground break-all">{String(val)}</span>
                  </div>
                ))}
              </div>
            )
        )}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          View Raw JSON
        </summary>
        <pre className="mt-2 p-3 bg-background rounded-lg border border-border overflow-x-auto text-[11px] text-muted-foreground">
          {JSON.stringify(event, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default TrackingAnalytics;
