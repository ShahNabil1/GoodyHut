import { useState } from "react";
import { useAllPageContents, useUpdatePageContent, PageContent } from "@/hooks/usePageContent";
import { toast } from "sonner";
import { Loader2, Save, ChevronDown, ChevronUp, Plus, Trash2, FileText, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const PAGE_LABELS: Record<string, string> = {
  "contact": "Contact Us",
  "help": "Help Center",
  "how-it-works": "How It Works",
  "shipping": "Shipping Info",
  "customs-guide": "Customs Guide",
  "about": "About Us",
  "returns-policy": "Returns Policy",
  "terms": "Terms of Service",
  "privacy": "Privacy Policy",
};

const PageContentEditor = () => {
  const { data: pages, isLoading } = useAllPageContents();
  const updateMutation = useUpdatePageContent();
  const [activePage, setActivePage] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, { title: string; subtitle: string | null; content: Record<string, any> }>>({});

  const initEdit = (page: PageContent) => {
    if (!editData[page.page_slug]) {
      setEditData(prev => ({
        ...prev,
        [page.page_slug]: {
          title: page.title,
          subtitle: page.subtitle,
          content: JSON.parse(JSON.stringify(page.content)),
        }
      }));
    }
    setActivePage(activePage === page.page_slug ? null : page.page_slug);
  };

  const getEdit = (slug: string) => editData[slug];

  const updateField = (slug: string, path: string, value: any) => {
    setEditData(prev => {
      const copy = JSON.parse(JSON.stringify(prev[slug]));
      const parts = path.split(".");
      let target = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = value;
      return { ...prev, [slug]: copy };
    });
  };

  const handleSave = async (page: PageContent) => {
    const ed = editData[page.page_slug];
    if (!ed) return;
    try {
      await updateMutation.mutateAsync({
        id: page.id,
        title: ed.title,
        subtitle: ed.subtitle,
        content: ed.content,
      });
      toast.success(`${PAGE_LABELS[page.page_slug] || page.page_slug} updated!`);
    } catch {
      toast.error("Failed to save");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      {pages?.map(page => {
        const isActive = activePage === page.page_slug;
        const ed = getEdit(page.page_slug);
        return (
          <div key={page.page_slug} className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => initEdit(page)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-primary" />
                <div>
                  <p className="font-display font-semibold text-sm">{PAGE_LABELS[page.page_slug] || page.page_slug}</p>
                  <p className="text-xs text-muted-foreground">/{page.page_slug}</p>
                </div>
              </div>
              {isActive ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
            </button>

            {isActive && ed && (
              <div className="border-t border-border px-5 py-5 space-y-5">
                {/* Common fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Page Title</label>
                    <Input value={ed.title} onChange={e => updateField(page.page_slug, "title", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Subtitle</label>
                    <Input value={ed.subtitle || ""} onChange={e => updateField(page.page_slug, "subtitle", e.target.value || null)} />
                  </div>
                </div>

                {/* Page-specific editors */}
                {page.page_slug === "contact" && <ContactEditor data={ed.content} onChange={(c) => updateField(page.page_slug, "content", c)} />}
                {page.page_slug === "help" && <HelpEditor data={ed.content} onChange={(c) => updateField(page.page_slug, "content", c)} />}
                {page.page_slug === "how-it-works" && <StepsEditor data={ed.content} onChange={(c) => updateField(page.page_slug, "content", c)} />}
                {page.page_slug === "shipping" && <ShippingEditor data={ed.content} onChange={(c) => updateField(page.page_slug, "content", c)} />}
                {page.page_slug === "customs-guide" && <CustomsEditor data={ed.content} onChange={(c) => updateField(page.page_slug, "content", c)} />}
                {page.page_slug === "about" && <AboutEditor data={ed.content} onChange={(c) => updateField(page.page_slug, "content", c)} />}
                {(page.page_slug === "returns-policy" || page.page_slug === "terms" || page.page_slug === "privacy") && (
                  <SectionsEditor data={ed.content} onChange={(c) => updateField(page.page_slug, "content", c)} hasDate={page.page_slug !== "returns-policy"} />
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={() => handleSave(page)} disabled={updateMutation.isPending} className="gap-2">
                    {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ========== Contact Editor ==========
function ContactEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const methods = data.methods || [];
  const updateMethod = (i: number, field: string, val: string) => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.methods[i][field] = val;
    onChange(copy);
  };
  const addMethod = () => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.methods.push({ iconName: "Phone", title: "", detail: "", sub: "" });
    onChange(copy);
  };
  const removeMethod = (i: number) => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.methods.splice(i, 1);
    onChange(copy);
  };
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Contact Methods</h3>
      {methods.map((m: any, i: number) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 rounded-xl bg-muted/30 border border-border/50 relative">
          <Input placeholder="Title" value={m.title} onChange={e => updateMethod(i, "title", e.target.value)} />
          <Input placeholder="Detail" value={m.detail} onChange={e => updateMethod(i, "detail", e.target.value)} />
          <Input placeholder="Sub text" value={m.sub} onChange={e => updateMethod(i, "sub", e.target.value)} />
          <div className="flex items-center gap-2">
            <Input placeholder="Icon (Phone/Mail/MapPin/whatsapp)" value={m.iconName} onChange={e => updateMethod(i, "iconName", e.target.value)} className="flex-1" />
            <button onClick={() => removeMethod(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      <button onClick={addMethod} className="text-sm text-primary flex items-center gap-1 hover:underline"><Plus size={14} /> Add Method</button>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Business Hours</label>
        <Input value={data.businessHours || ""} onChange={e => { const copy = { ...data, businessHours: e.target.value }; onChange(copy); }} />
      </div>
    </div>
  );
}

// ========== Help Center Editor (FAQ sections) ==========
function HelpEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const sections = data.sections || [];
  const update = (copy: any) => onChange(copy);

  const addSection = () => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.sections.push({ iconName: "HelpCircle", title: "New Section", faqs: [] });
    update(copy);
  };
  const removeSection = (i: number) => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.sections.splice(i, 1);
    update(copy);
  };
  const updateSection = (i: number, field: string, val: string) => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.sections[i][field] = val;
    update(copy);
  };
  const addFaq = (si: number) => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.sections[si].faqs.push({ q: "", a: "" });
    update(copy);
  };
  const removeFaq = (si: number, fi: number) => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.sections[si].faqs.splice(fi, 1);
    update(copy);
  };
  const updateFaq = (si: number, fi: number, field: string, val: string) => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.sections[si].faqs[fi][field] = val;
    update(copy);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">FAQ Sections</h3>
      {sections.map((section: any, si: number) => (
        <div key={si} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Input placeholder="Section title" value={section.title} onChange={e => updateSection(si, "title", e.target.value)} className="flex-1" />
            <Input placeholder="Icon" value={section.iconName} onChange={e => updateSection(si, "iconName", e.target.value)} className="w-32" />
            <button onClick={() => removeSection(si)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
          </div>
          {section.faqs.map((faq: any, fi: number) => (
            <div key={fi} className="grid grid-cols-1 gap-2 p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex gap-2">
                <Input placeholder="Question" value={faq.q} onChange={e => updateFaq(si, fi, "q", e.target.value)} className="flex-1" />
                <button onClick={() => removeFaq(si, fi)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
              </div>
              <Textarea placeholder="Answer" value={faq.a} onChange={e => updateFaq(si, fi, "a", e.target.value)} rows={2} />
            </div>
          ))}
          <button onClick={() => addFaq(si)} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus size={12} /> Add FAQ</button>
        </div>
      ))}
      <button onClick={addSection} className="text-sm text-primary flex items-center gap-1 hover:underline"><Plus size={14} /> Add Section</button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA Title</label>
          <Input value={data.ctaTitle || ""} onChange={e => onChange({ ...data, ctaTitle: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA Text</label>
          <Input value={data.ctaText || ""} onChange={e => onChange({ ...data, ctaText: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

// ========== Steps Editor (How It Works) ==========
function StepsEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const steps = data.steps || [];
  const addStep = () => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.steps.push({ iconName: "CheckCircle", title: "", description: "" });
    onChange(copy);
  };
  const removeStep = (i: number) => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.steps.splice(i, 1);
    onChange(copy);
  };
  const updateStep = (i: number, field: string, val: string) => {
    const copy = JSON.parse(JSON.stringify(data));
    copy.steps[i][field] = val;
    onChange(copy);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Steps</h3>
      {steps.map((step: any, i: number) => (
        <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{i + 1}</span>
            <Input placeholder="Step title" value={step.title} onChange={e => updateStep(i, "title", e.target.value)} className="flex-1" />
            <button onClick={() => removeStep(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
          </div>
          <Textarea placeholder="Description" value={step.description} onChange={e => updateStep(i, "description", e.target.value)} rows={2} />
        </div>
      ))}
      <button onClick={addStep} className="text-sm text-primary flex items-center gap-1 hover:underline"><Plus size={14} /> Add Step</button>
    </div>
  );
}

// ========== Shipping Editor ==========
function ShippingEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const zones = data.zones || [];
  const policies = data.policies || [];

  const addZone = () => { const c = JSON.parse(JSON.stringify(data)); c.zones.push({ zone: "", time: "", cost: "" }); onChange(c); };
  const removeZone = (i: number) => { const c = JSON.parse(JSON.stringify(data)); c.zones.splice(i, 1); onChange(c); };
  const updateZone = (i: number, f: string, v: string) => { const c = JSON.parse(JSON.stringify(data)); c.zones[i][f] = v; onChange(c); };

  const addPolicy = () => { const c = JSON.parse(JSON.stringify(data)); c.policies.push({ iconName: "Package", title: "", text: "" }); onChange(c); };
  const removePolicy = (i: number) => { const c = JSON.parse(JSON.stringify(data)); c.policies.splice(i, 1); onChange(c); };
  const updatePolicy = (i: number, f: string, v: string) => { const c = JSON.parse(JSON.stringify(data)); c.policies[i][f] = v; onChange(c); };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-3">Delivery Zones</h3>
        {zones.map((z: any, i: number) => (
          <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
            <Input placeholder="Zone" value={z.zone} onChange={e => updateZone(i, "zone", e.target.value)} />
            <Input placeholder="Time" value={z.time} onChange={e => updateZone(i, "time", e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder="Cost" value={z.cost} onChange={e => updateZone(i, "cost", e.target.value)} className="flex-1" />
              <button onClick={() => removeZone(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        <button onClick={addZone} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus size={12} /> Add Zone</button>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">Policies</h3>
        {policies.map((p: any, i: number) => (
          <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2 mb-2">
            <div className="flex gap-2">
              <Input placeholder="Title" value={p.title} onChange={e => updatePolicy(i, "title", e.target.value)} className="flex-1" />
              <Input placeholder="Icon" value={p.iconName} onChange={e => updatePolicy(i, "iconName", e.target.value)} className="w-32" />
              <button onClick={() => removePolicy(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
            </div>
            <Textarea placeholder="Text" value={p.text} onChange={e => updatePolicy(i, "text", e.target.value)} rows={2} />
          </div>
        ))}
        <button onClick={addPolicy} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus size={12} /> Add Policy</button>
      </div>
    </div>
  );
}

// ========== Customs Guide Editor ==========
function CustomsEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const guidelines = data.guidelines || [];
  const faqs = data.faqs || [];

  const addGuideline = () => { const c = JSON.parse(JSON.stringify(data)); c.guidelines.push({ iconName: "FileText", title: "", text: "" }); onChange(c); };
  const removeGuideline = (i: number) => { const c = JSON.parse(JSON.stringify(data)); c.guidelines.splice(i, 1); onChange(c); };
  const updateGuideline = (i: number, f: string, v: string) => { const c = JSON.parse(JSON.stringify(data)); c.guidelines[i][f] = v; onChange(c); };

  const addFaq = () => { const c = JSON.parse(JSON.stringify(data)); c.faqs.push({ q: "", a: "" }); onChange(c); };
  const removeFaq = (i: number) => { const c = JSON.parse(JSON.stringify(data)); c.faqs.splice(i, 1); onChange(c); };
  const updateFaq = (i: number, f: string, v: string) => { const c = JSON.parse(JSON.stringify(data)); c.faqs[i][f] = v; onChange(c); };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-3">Guidelines</h3>
        {guidelines.map((g: any, i: number) => (
          <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2 mb-2">
            <div className="flex gap-2">
              <Input placeholder="Title" value={g.title} onChange={e => updateGuideline(i, "title", e.target.value)} className="flex-1" />
              <Input placeholder="Icon" value={g.iconName} onChange={e => updateGuideline(i, "iconName", e.target.value)} className="w-32" />
              <button onClick={() => removeGuideline(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
            </div>
            <Textarea placeholder="Text" value={g.text} onChange={e => updateGuideline(i, "text", e.target.value)} rows={2} />
          </div>
        ))}
        <button onClick={addGuideline} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus size={12} /> Add Guideline</button>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">FAQs</h3>
        {faqs.map((faq: any, i: number) => (
          <div key={i} className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2 mb-2">
            <div className="flex gap-2">
              <Input placeholder="Question" value={faq.q} onChange={e => updateFaq(i, "q", e.target.value)} className="flex-1" />
              <button onClick={() => removeFaq(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
            </div>
            <Textarea placeholder="Answer" value={faq.a} onChange={e => updateFaq(i, "a", e.target.value)} rows={2} />
          </div>
        ))}
        <button onClick={addFaq} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus size={12} /> Add FAQ</button>
      </div>
    </div>
  );
}

// ========== About Editor ==========
function AboutEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const story = data.story || [];
  const stats = data.stats || [];
  const values = data.values || [];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-3">Our Story (Paragraphs)</h3>
        {story.map((p: string, i: number) => (
          <div key={i} className="flex gap-2 mb-2">
            <Textarea value={p} onChange={e => { const c = JSON.parse(JSON.stringify(data)); c.story[i] = e.target.value; onChange(c); }} rows={3} className="flex-1" />
            <button onClick={() => { const c = JSON.parse(JSON.stringify(data)); c.story.splice(i, 1); onChange(c); }} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg self-start"><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={() => { const c = JSON.parse(JSON.stringify(data)); c.story.push(""); onChange(c); }} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus size={12} /> Add Paragraph</button>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Stats</h3>
        {stats.map((s: any, i: number) => (
          <div key={i} className="grid grid-cols-2 gap-2 mb-2 items-center">
            <Input placeholder="Value (e.g. 10,000+)" value={s.value} onChange={e => { const c = JSON.parse(JSON.stringify(data)); c.stats[i].value = e.target.value; onChange(c); }} />
            <div className="flex gap-2">
              <Input placeholder="Label" value={s.label} onChange={e => { const c = JSON.parse(JSON.stringify(data)); c.stats[i].label = e.target.value; onChange(c); }} className="flex-1" />
              <button onClick={() => { const c = JSON.parse(JSON.stringify(data)); c.stats.splice(i, 1); onChange(c); }} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        <button onClick={() => { const c = JSON.parse(JSON.stringify(data)); c.stats.push({ value: "", label: "" }); onChange(c); }} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus size={12} /> Add Stat</button>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Values</h3>
        {values.map((v: any, i: number) => (
          <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2 mb-2">
            <div className="flex gap-2">
              <Input placeholder="Title" value={v.title} onChange={e => { const c = JSON.parse(JSON.stringify(data)); c.values[i].title = e.target.value; onChange(c); }} className="flex-1" />
              <Input placeholder="Icon" value={v.iconName} onChange={e => { const c = JSON.parse(JSON.stringify(data)); c.values[i].iconName = e.target.value; onChange(c); }} className="w-32" />
              <button onClick={() => { const c = JSON.parse(JSON.stringify(data)); c.values.splice(i, 1); onChange(c); }} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
            </div>
            <Textarea placeholder="Text" value={v.text} onChange={e => { const c = JSON.parse(JSON.stringify(data)); c.values[i].text = e.target.value; onChange(c); }} rows={2} />
          </div>
        ))}
        <button onClick={() => { const c = JSON.parse(JSON.stringify(data)); c.values.push({ iconName: "Globe", title: "", text: "" }); onChange(c); }} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus size={12} /> Add Value</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA Title</label>
          <Input value={data.ctaTitle || ""} onChange={e => onChange({ ...data, ctaTitle: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA Text</label>
          <Input value={data.ctaText || ""} onChange={e => onChange({ ...data, ctaText: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

// ========== Generic Sections Editor (Returns, Terms, Privacy) ==========
function SectionsEditor({ data, onChange, hasDate }: { data: any; onChange: (d: any) => void; hasDate: boolean }) {
  const sections = data.sections || [];

  const addSection = () => { const c = JSON.parse(JSON.stringify(data)); c.sections.push({ title: "", content: "" }); onChange(c); };
  const removeSection = (i: number) => { const c = JSON.parse(JSON.stringify(data)); c.sections.splice(i, 1); onChange(c); };
  const updateSection = (i: number, f: string, v: any) => { const c = JSON.parse(JSON.stringify(data)); c.sections[i][f] = v; onChange(c); };

  const addItem = (si: number) => {
    const c = JSON.parse(JSON.stringify(data));
    if (!c.sections[si].items) c.sections[si].items = [];
    c.sections[si].items.push("");
    onChange(c);
  };
  const removeItem = (si: number, ii: number) => {
    const c = JSON.parse(JSON.stringify(data));
    c.sections[si].items.splice(ii, 1);
    onChange(c);
  };
  const updateItem = (si: number, ii: number, v: string) => {
    const c = JSON.parse(JSON.stringify(data));
    c.sections[si].items[ii] = v;
    onChange(c);
  };

  return (
    <div className="space-y-4">
      {hasDate && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Updated</label>
          <Input value={data.lastUpdated || ""} onChange={e => onChange({ ...data, lastUpdated: e.target.value })} className="max-w-xs" />
        </div>
      )}
      <h3 className="text-sm font-semibold">Sections</h3>
      {sections.map((section: any, si: number) => (
        <div key={si} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <Input placeholder="Section title" value={section.title} onChange={e => updateSection(si, "title", e.target.value)} className="flex-1" />
            <button onClick={() => removeSection(si)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={14} /></button>
          </div>
          <Textarea placeholder="Content text" value={section.content || ""} onChange={e => updateSection(si, "content", e.target.value)} rows={3} />

          {/* Bullet items */}
          {(section.items || []).length > 0 && (
            <div className="pl-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Bullet Points</p>
              {section.items.map((item: string, ii: number) => (
                <div key={ii} className="flex gap-2">
                  <Input value={item} onChange={e => updateItem(si, ii, e.target.value)} className="flex-1" />
                  <button onClick={() => removeItem(si, ii)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => addItem(si)} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus size={12} /> Add Bullet Point</button>
        </div>
      ))}
      <button onClick={addSection} className="text-sm text-primary flex items-center gap-1 hover:underline"><Plus size={14} /> Add Section</button>
    </div>
  );
}

export default PageContentEditor;
