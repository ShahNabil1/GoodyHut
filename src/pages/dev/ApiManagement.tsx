import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Key, Save, Eye, EyeOff, RefreshCw, CheckCircle2, AlertCircle, Wifi, WifiOff, Loader2, Zap } from "lucide-react";

interface SecretConfig {
  key: string;
  label: string;
  group: string;
  description: string;
}

interface ServiceStatus {
  ok: boolean;
  message: string;
  latency?: number;
}

const SECRET_CONFIGS: SecretConfig[] = [
  { key: "STEADFAST_API_KEY", label: "API Key", group: "Steadfast Courier", description: "Steadfast/Packzy API Key" },
  { key: "STEADFAST_SECRET_KEY", label: "Secret Key", group: "Steadfast Courier", description: "Steadfast/Packzy Secret Key" },
  { key: "BDCOURIER_API_KEY", label: "API Key", group: "BD Courier", description: "bdcourier.com API Key" },
  { key: "BULKSMSBD_API_KEY", label: "API Key", group: "BulkSMSBD", description: "BulkSMSBD API Key" },
  { key: "BULKSMSBD_SENDER_ID", label: "Sender ID", group: "BulkSMSBD", description: "BulkSMSBD Sender ID" },
  { key: "CLOUDINARY_CLOUD_NAME", label: "Cloud Name", group: "Cloudinary", description: "Cloudinary Cloud Name" },
  { key: "CLOUDINARY_API_KEY", label: "API Key", group: "Cloudinary", description: "Cloudinary API Key" },
  { key: "CLOUDINARY_API_SECRET", label: "API Secret", group: "Cloudinary", description: "Cloudinary API Secret" },
  { key: "GEMINI_API_KEY", label: "API Key", group: "Google Gemini", description: "Google Gemini API Key" },
  { key: "JINA_API_KEY", label: "API Key", group: "Jina AI", description: "Jina AI API Key" },
  { key: "RESEND_API_KEY", label: "API Key", group: "Resend Email", description: "Resend Email API Key" },
  { key: "RESEND_WEBHOOK_SECRET", label: "Webhook Secret", group: "Resend Email", description: "Resend Webhook Signing Secret (whsec_...)" },
  { key: "HUGGINGFACE_API_TOKEN", label: "API Token", group: "Hugging Face", description: "Hugging Face API Token" },
];

const groupIcons: Record<string, string> = {
  "Steadfast Courier": "🚚",
  "BD Courier": "📦",
  "BulkSMSBD": "📱",
  "Cloudinary": "☁️",
  "Google Gemini": "🤖",
  "Jina AI": "🔍",
  "Resend Email": "✉️",
  "Hugging Face": "🤗",
};

const ApiManagement = () => {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({});
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    loadSecrets();
    checkStatuses();
  }, []);

  const loadSecrets = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("dev-secrets", {
      body: { action: "list" },
    });
    if (data?.secrets) {
      const vals: Record<string, string> = {};
      data.secrets.forEach((s: { name: string; value: string }) => {
        vals[s.name] = s.value;
      });
      setValues(vals);
    }
    setLoading(false);
  };

  const checkStatuses = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("dev-secrets", {
        body: { action: "check-status" },
      });
      if (data?.statuses) {
        setStatuses(data.statuses);
      }
    } catch (e) {
      console.error("Status check failed:", e);
    }
    setCheckingStatus(false);
  }, []);

  const saveSecret = async (key: string) => {
    const value = values[key];
    if (!value?.trim()) return;

    setSaving(prev => ({ ...prev, [key]: true }));
    const { data, error } = await supabase.functions.invoke("dev-secrets", {
      body: { action: "set", key, value },
    });

    setSaving(prev => ({ ...prev, [key]: false }));

    if (error || data?.error) {
      toast({ title: "Failed to save", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setSaved(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 3000);
      toast({ title: `${key} updated ✅` });
      
      // Re-check status after saving (with small delay for edge function restart)
      setTimeout(() => {
        checkStatuses();
      }, 2000);
    }
  };

  const groups = SECRET_CONFIGS.reduce((acc, cfg) => {
    if (!acc[cfg.group]) acc[cfg.group] = [];
    acc[cfg.group].push(cfg);
    return acc;
  }, {} as Record<string, SecretConfig[]>);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 rounded-xl bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Key size={22} className="text-primary" /> API Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Update Edge Function secrets directly</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={checkStatuses}
            disabled={checkingStatus}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
          >
            {checkingStatus ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Check Status
          </button>
          <button
            onClick={() => { loadSecrets(); checkStatuses(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {Object.entries(groups).map(([group, configs]) => {
        const status = statuses[group];
        return (
          <div key={group} className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{groupIcons[group] || "🔑"}</span>
                <h3 className="font-semibold text-foreground">{group}</h3>
              </div>
              {/* Connection Status Badge */}
              <div className="flex items-center gap-2">
                {checkingStatus && !status ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    <Loader2 size={12} className="animate-spin" /> Checking...
                  </span>
                ) : status ? (
                  <span
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      status.ok
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {status.ok ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {status.message}
                    {status.latency !== undefined && status.ok && (
                      <span className="text-muted-foreground ml-1">({status.latency}ms)</span>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    <WifiOff size={12} /> Not checked
                  </span>
                )}
              </div>
            </div>
            <div className="p-5 space-y-4">
              {configs.map((cfg) => (
                <div key={cfg.key} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{cfg.label}</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={visibility[cfg.key] ? "text" : "password"}
                        value={values[cfg.key] || ""}
                        onChange={(e) => setValues(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                        placeholder={cfg.description}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                      />
                      <button
                        onClick={() => setVisibility(prev => ({ ...prev, [cfg.key]: !prev[cfg.key] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      >
                        {visibility[cfg.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      onClick={() => saveSecret(cfg.key)}
                      disabled={saving[cfg.key]}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        saved[cfg.key]
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      } disabled:opacity-50`}
                    >
                      {saving[cfg.key] ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : saved[cfg.key] ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Save size={14} />
                      )}
                      {saved[cfg.key] ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 flex gap-3">
        <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Important</p>
          <p>Updating a secret will reflect in Edge Functions immediately. Status is auto-checked after save.</p>
        </div>
      </div>
    </div>
  );
};

export default ApiManagement;
