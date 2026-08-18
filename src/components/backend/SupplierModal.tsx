import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBackend } from "@/lib/backend-context";
import { usePos } from "@/lib/pos-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AddSupplierModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addSupplier } = useBackend();
  const { productList } = usePos();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [balance, setBalance] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);

  const reset = () => {
    setName("");
    setContact("");
    setPhone("");
    setBalance("");
    setProductIds([]);
  };

  const toggleProduct = (id: string) =>
    setProductIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const save = () => {
    if (!name.trim()) {
      toast("Enter a supplier name");
      return;
    }
    addSupplier({
      name: name.trim(),
      contact: contact.trim() || "—",
      phone: phone.trim() || "—",
      productIds,
      openBalance: Number(balance) || 0,
    });
    toast.success(`${name.trim()} added`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add supplier</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="sup-name">Supplier name</Label>
            <Input
              id="sup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Karachi Office Supplies"
              className="h-11"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sup-contact">Contact person</Label>
              <Input
                id="sup-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-phone">Phone</Label>
              <Input
                id="sup-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
                className="h-11"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-balance">Opening balance</Label>
            <Input
              id="sup-balance"
              type="number"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>Supplied products</Label>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-2">
              {productList.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProduct(p.id)}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs font-medium",
                    productIds.includes(p.id) && "border-primary bg-accent text-accent-foreground",
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{productIds.length} selected</p>
          </div>

          <Button className="h-11 w-full" onClick={save}>
            Save supplier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
