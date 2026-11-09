import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, MessageSquare, RefreshCw, Info } from "lucide-react";

interface SmsTemplate {
  id: string;
  title: string;
  slug: string | null;
  message: string;
  variables: string[] | null;
  created_at: string;
}

const SmsTemplates = () => {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sms_templates")
      .select("*")
      .order("created_at", { ascending: true });
    setTemplates((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSave = async (template: SmsTemplate) => {
    const newMessage = editedMessages[template.id];
    if (newMessage === undefined) return;
    setSaving(template.id);
    await supabase
      .from("sms_templates")
      .update({ message: newMessage })
      .eq("id", template.id);
    setSaving(null);
    setEditedMessages(prev => {
      const next = { ...prev };
      delete next[template.id];
      return next;
    });
    fetchTemplates();
  };

  const getCategoryColor = (slug: string | null) => {
    if (!slug) return "bg-muted text-muted-foreground";
    if (slug.startsWith("order_")) return "bg-blue-100 text-blue-700";
    if (slug.startsWith("otp_")) return "bg-emerald-100 text-emerald-700";
    return "bg-purple-100 text-purple-700";
  };

  const getCategoryLabel = (slug: string | null) => {
    if (!slug) return "Other";
    if (slug.startsWith("order_")) return "Order";
    if (slug.startsWith("otp_")) return "OTP";
    return "System";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">SMS Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all SMS notification templates. Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{variable_name}"}</code> for dynamic content.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTemplates}>
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <p><strong>Variables:</strong> Use curly braces to insert dynamic data. Example: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{name}"}</code> will be replaced with customer's name.</p>
          <p><strong>Available variables by template type:</strong></p>
          <ul className="list-disc list-inside text-xs space-y-0.5 ml-2">
            <li><strong>Order templates:</strong> {"{name}"}, {"{order_id}"}, {"{tracking_link}"}, {"{status}"}, {"{amount}"}</li>
            <li><strong>Adjustment:</strong> {"{name}"}, {"{order_id}"}, {"{estimated_weight}"}, {"{actual_weight}"}, {"{paid_amount}"}, {"{due_amount}"}, {"{payment_link}"}</li>
            <li><strong>OTP templates:</strong> {"{otp}"}</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-4">
        {templates.map(template => {
          const currentMessage = editedMessages[template.id] ?? template.message;
          const isEdited = editedMessages[template.id] !== undefined && editedMessages[template.id] !== template.message;

          return (
            <Card key={template.id} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-primary" />
                    <CardTitle className="text-base">{template.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getCategoryColor(template.slug)}>
                      {getCategoryLabel(template.slug)}
                    </Badge>
                    {template.slug && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {template.slug}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.variables && template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {template.variables.map(v => (
                      <Badge key={v} variant="secondary" className="text-[10px] font-mono">
                        {`{${v}}`}
                      </Badge>
                    ))}
                  </div>
                )}
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setEditedMessages(prev => ({ ...prev, [template.id]: e.target.value }))}
                  className="min-h-[100px] font-mono text-sm"
                  placeholder="SMS message template..."
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    {currentMessage.length} characters • ~{Math.ceil(currentMessage.length / 160)} SMS part(s)
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleSave(template)}
                    disabled={!isEdited || saving === template.id}
                  >
                    {saving === template.id ? (
                      <Loader2 size={14} className="animate-spin mr-1.5" />
                    ) : (
                      <Save size={14} className="mr-1.5" />
                    )}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p>No SMS templates found.</p>
        </div>
      )}
    </div>
  );
};

export default SmsTemplates;
