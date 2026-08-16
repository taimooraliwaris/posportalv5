import { useState } from "react";
import { ChevronDown, Mail, Search, Send, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePos } from "@/lib/pos-context";
import type { Customer } from "@/lib/pos-data";

export function ChooseCustomerModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (c: Customer) => void;
}) {
  const { customers } = usePos();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = customers.filter((c) =>
    `${c.name} ${c.email} ${c.location ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl gap-0 p-0">
          <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b border-border p-3">
            <Button className="h-11 px-5" onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" /> Create
            </Button>
            <DialogTitle className="text-base">Choose Customer</DialogTitle>
            <div className="relative ml-auto w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Customers..."
                className="h-11 pl-9"
              />
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c);
                  onOpenChange(false);
                }}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-5 py-4 text-left transition-colors hover:bg-muted sm:grid-cols-3"
              >
                <span className="truncate font-semibold">{c.name}</span>
                <span className="hidden truncate text-sm text-muted-foreground sm:block">
                  {c.location}
                </span>
                <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <Send className="h-4 w-4 shrink-0 text-info" />
                  <span className="truncate">{c.email}</span>
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">No customers found.</p>
            )}
          </div>
          <div className="p-3">
            <Button variant="secondary" className="h-12 w-full" onClick={() => onOpenChange(false)}>
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <CreatePartnerModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(c) => {
          onSelect(c);
          onOpenChange(false);
        }}
      />
    </>
  );
}

export function CreatePartnerModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (c: Customer) => void;
}) {
  const { addCustomer } = usePos();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [more, setMore] = useState(false);

  const reset = () => {
    setName("");
    setCompany("");
    setEmail("");
    setPhone("");
    setMore(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Partner</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl border border-border bg-muted text-muted-foreground">
              <UserPlus className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (company or person)"
                className="h-12 rounded-none border-0 border-b border-input px-0 text-2xl shadow-none focus-visible:ring-0"
              />
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company / Employer"
                className="h-11"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="h-11 pl-9"
                  />
                </div>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            className="flex items-center gap-2 text-sm font-medium text-primary"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${more ? "rotate-180" : ""}`} />
            Add more details
          </button>

          {more && (
            <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
              <Input placeholder="Street..." className="h-11" />
              <Input placeholder="Street 2..." className="h-11" />
              <Input placeholder="City" className="h-11" />
              <Input placeholder="State" className="h-11" />
              <Input placeholder="ZIP" className="h-11" />
              <Input placeholder="Country" className="h-11" />
              <Input placeholder="NTN e.g. BE0477472701" className="h-11" />
              <Input placeholder="Barcode" className="h-11" />
              <Input placeholder='Tags e.g. "B2B", "VIP"' className="h-11 sm:col-span-2" />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              className="h-11 px-6"
              disabled={!name.trim()}
              onClick={() => {
                onCreated(addCustomer({ name, company, email, phone, location: "" }));
                reset();
                onOpenChange(false);
              }}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              className="h-11 px-6"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
