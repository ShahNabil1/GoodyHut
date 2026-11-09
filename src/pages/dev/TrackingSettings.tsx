import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, Eye, EyeOff, ExternalLink } from "lucide-react";

interface SettingField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  helpUrl?: string;
}

const FIELDS: SettingField[] = [
  {
    key: "gtm_id",
    label: "GTM Container ID",
    placeholder: "GTM-XXXXXXX",
    helpUrl: "https://tagmanager.google.com",
  },
  {
    key: "ga4_id",
    label: "GA4 Measurement ID",
    placeholder: "G-XXXXXXXXXX",
    helpUrl: "https://analytics.google.com",
  },
  {
    key: "meta_pixel_id",
    label: "Meta Pixel ID",
    placeholder: "123456789012345",
    helpUrl: "https://business.facebook.com/events_manager",
  },
  {
    key: "meta_capi_token",
    label: "Meta CAPI Access Token",
    placeholder: "EAAxxxxxxxx...",
    secret: true,
    helpUrl: "https://developers.facebook.com/docs/marketing-api/conversions-api/get-started",
  },
];

const TrackingSettings = () => {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tracking_settings" as any)
        .select("key, value");
      if (data) {
        const map: Record<string, string> = {};
        for (const row of data as any[]) {
          map[row.key] = row.value || "";
        }
        setValues(map);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const field of FIELDS) {
        const val = values[field.key] ?? "";
        await (supabase.from("tracking_settings" as any) as any)
          .update({ value: val, updated_at: new Date().toISOString() })
          .eq("key", field.key);
      }
      toast({ title: "Tracking settings saved ✅" });
    } catch (e: any) {
      toast({ title: "Error saving", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics & Tracking</h2>
        <p className="text-muted-foreground mt-1">
          Configure GTM, GA4, and Meta tracking. GTM handles browser-side events; Meta CAPI fires server-side for accurate attribution.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tracking IDs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {FIELDS.map((field) => {
            const configured = !!values[field.key]?.trim();
            return (
              <div key={field.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    {field.label}
                    {configured && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <Check size={12} /> Active
                      </span>
                    )}
                  </Label>
                  {field.helpUrl && (
                    <a
                      href={field.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      Get ID <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={field.secret && !showSecret[field.key] ? "password" : "text"}
                    placeholder={field.placeholder}
                    value={values[field.key] || ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="pr-10"
                  />
                  {field.secret && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowSecret((prev) => ({
                          ...prev,
                          [field.key]: !prev[field.key],
                        }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
            {saving ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} /> Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">GTM (Google Tag Manager)</strong> — Set up GA4 and Meta Pixel tags inside GTM. Just enter the Container ID here and the script loads automatically.
          </p>
          <p>
            <strong className="text-foreground">GA4 Measurement ID</strong> — Used as reference. Configure inside GTM for browser tracking.
          </p>
          <p>
            <strong className="text-foreground">Meta Pixel ID + CAPI Token</strong> — Pixel fires browser-side via GTM. The CAPI token enables server-side tracking for purchase and lead events, improving attribution accuracy even with ad blockers.
          </p>
          <p className="pt-2 border-t border-border">
            <strong className="text-foreground">Events tracked:</strong> page_view, view_item, add_to_cart, begin_checkout, purchase, lead
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackingSettings;
