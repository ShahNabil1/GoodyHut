import { useState, useEffect } from "react";
import { usePageContent, useUpdatePageContent } from "@/hooks/usePageContent";
import { toast } from "sonner";
import { Loader2, Save, Facebook, Instagram, MapPin, Mail, Phone, MessageCircle } from "lucide-react";

const FooterSettingsEditor = () => {
  const { data, isLoading } = usePageContent("footer-settings");
  const updateMutation = useUpdatePageContent();

  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [address, setAddress] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");

  useEffect(() => {
    if (data?.content) {
      const c = data.content as Record<string, string>;
      setFacebookUrl(c.facebook_url || "");
      setInstagramUrl(c.instagram_url || "");
      setWhatsappUrl(c.whatsapp_url || "");
      setAddress(c.address || "");
      setSupportEmail(c.support_email || "");
      setSupportPhone(c.support_phone || "");
    }
  }, [data]);

  const handleSave = async () => {
    if (!data) return;
    try {
      await updateMutation.mutateAsync({
        id: data.id,
        title: data.title,
        subtitle: data.subtitle,
        content: {
          facebook_url: facebookUrl,
          instagram_url: instagramUrl,
          whatsapp_url: whatsappUrl,
          address,
          support_email: supportEmail,
          support_phone: supportPhone,
        },
      });
      toast.success("Footer settings saved!");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Footer settings not found in database.</p>;
  }

  const fields = [
    { label: "Facebook URL", icon: Facebook, value: facebookUrl, setter: setFacebookUrl, placeholder: "https://facebook.com/yourpage" },
    { label: "Instagram URL", icon: Instagram, value: instagramUrl, setter: setInstagramUrl, placeholder: "https://instagram.com/yourpage" },
    { label: "WhatsApp URL", icon: MessageCircle, value: whatsappUrl, setter: setWhatsappUrl, placeholder: "https://wa.me/8801XXXXXXXXX" },
    { label: "Address", icon: MapPin, value: address, setter: setAddress, placeholder: "Bogura, Bangladesh" },
    { label: "Support Email", icon: Mail, value: supportEmail, setter: setSupportEmail, placeholder: "support@goodyhut.bd" },
    { label: "Support Phone", icon: Phone, value: supportPhone, setter: setSupportPhone, placeholder: "+880 XXXX-XXXXXX" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-display font-bold text-foreground">Footer Contact Info</h2>
        <p className="text-sm text-muted-foreground mt-1">Update footer social links, address, email, and phone number.</p>
      </div>

      <div className="p-5 space-y-4">
        {fields.map(({ label, icon: Icon, value, setter, placeholder }) => (
          <div key={label}>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <Icon size={15} className="text-primary" />
              {label}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors"
            />
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
        >
          {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default FooterSettingsEditor;
