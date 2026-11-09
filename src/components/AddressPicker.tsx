import { useEffect, useState, useRef } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { divisions, getDistricts, getThanas } from "@/data/bangladeshGeo";
import { motion, AnimatePresence } from "framer-motion";

export interface AddressData {
  division: string;
  district: string;
  thana: string;
  address: string;
}

interface AddressPickerProps {
  value: AddressData;
  onChange: (data: AddressData) => void;
  compact?: boolean;
}

const CustomSelect = ({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    if (!open) setSearch("");
  }, [open]);

  return (
    <div className="space-y-1.5" ref={ref}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <motion.button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          whileTap={!disabled ? { scale: 0.98 } : undefined}
          disabled={disabled}
          className={`w-full h-11 pl-3.5 pr-9 rounded-xl border text-left text-sm flex items-center gap-2.5 transition-all duration-300 ${
            disabled
              ? "opacity-40 cursor-not-allowed bg-muted/30 border-border/40"
              : open
              ? "border-primary/40 bg-white/80 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.06),0_0_0_1px_rgba(255,255,255,0.5)_inset] ring-2 ring-primary/10"
              : value
              ? "border-primary/20 bg-white/60 backdrop-blur-sm hover:bg-white/70 hover:border-primary/30"
              : "border-border bg-background hover:border-primary/30 hover:bg-white/50"
          }`}
        >
          <MapPin size={14} className={`shrink-0 transition-colors ${value ? "text-primary" : "text-muted-foreground"}`} />
          <span className={value ? "text-foreground font-medium" : "text-muted-foreground"}>
            {value || placeholder}
          </span>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <ChevronDown size={14} className="text-muted-foreground" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute z-50 top-full mt-1.5 left-0 right-0 rounded-xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.5)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.3) inset",
              }}
            >
              {/* Search */}
              {options.length > 6 && (
                <div className="p-2 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full h-8 px-3 rounded-lg bg-black/[0.03] text-sm placeholder:text-muted-foreground/50 outline-none focus:bg-black/[0.05] transition-colors"
                  />
                </div>
              )}
              <div className="max-h-48 overflow-y-auto py-1 scrollbar-thin">
                {filtered.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground text-center">No results found</p>
                ) : (
                  filtered.map((opt, i) => (
                    <motion.button
                      type="button"
                      key={opt}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.15) }}
                      onClick={() => {
                        onChange(opt);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-all duration-150 ${
                        value === opt
                          ? "bg-primary/8 text-primary font-medium"
                          : "text-foreground/80 hover:bg-black/[0.04]"
                      }`}
                    >
                      {value === opt && <Check size={13} className="text-primary shrink-0" />}
                      <span className={value === opt ? "" : "ml-[21px]"}>{opt}</span>
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const AddressPicker = ({ value, onChange, compact }: AddressPickerProps) => {
  const districts = getDistricts(value.division);
  const thanas = getThanas(value.division, value.district);

  useEffect(() => {
    if (value.division && value.district && !districts.includes(value.district)) {
      onChange({ ...value, district: "", thana: "" });
    }
  }, [value.division]);

  useEffect(() => {
    if (value.district && value.thana && !thanas.includes(value.thana)) {
      onChange({ ...value, thana: "" });
    }
  }, [value.district]);

  return (
    <div className="space-y-3">
      <div className={`grid gap-3 ${compact ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
        <CustomSelect
          label="Division *"
          value={value.division}
          options={divisions}
          onChange={(v) => onChange({ ...value, division: v, district: "", thana: "" })}
          placeholder="Select Division"
        />
        <CustomSelect
          label="District *"
          value={value.district}
          options={districts}
          onChange={(v) => onChange({ ...value, district: v, thana: "" })}
          placeholder="Select District"
          disabled={!value.division}
        />
        <CustomSelect
          label="Thana/Upazila *"
          value={value.thana}
          options={thanas}
          onChange={(v) => onChange({ ...value, thana: v })}
          placeholder="Select Thana"
          disabled={!value.district}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Detailed Address *</Label>
        <Textarea
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="House no, Road, Area..."
          rows={2}
          className="rounded-xl border-border focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>
    </div>
  );
};

export const formatAddress = (data: AddressData): string => {
  const parts = [data.address, data.thana, data.district, data.division].filter(Boolean);
  return parts.join(", ");
};

export const parseAddress = (address: string | null, city: string | null): AddressData => {
  if (!address) return { division: "", district: "", thana: "", address: "" };
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 4) {
    return {
      division: parts[parts.length - 1] || "",
      district: parts[parts.length - 2] || "",
      thana: parts[parts.length - 3] || "",
      address: parts.slice(0, parts.length - 3).join(", "),
    };
  }
  return { division: city || "", district: "", thana: "", address: address };
};

export default AddressPicker;
