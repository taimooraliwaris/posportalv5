import { useEffect, useState } from "react";
import { Check, ListChecks, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePos } from "@/lib/pos-context";
import { noteTags } from "@/lib/pos-data";
import { useBackend } from "@/lib/backend-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const tagTone: Record<string, string> = {
  Wait: "bg-destructive/20 text-foreground",
  "To Serve": "bg-warning/40 text-foreground",
  Emergency: "bg-sand text-cat-foreground",
  "No Dressing": "bg-sky text-cat-foreground",
};

export function OrderActionsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { activeOrder, updateOrder, deleteOrder } = usePos();
  const [pricelistOpen, setPricelistOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setConfirmCancel(false);
          onOpenChange(o);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Actions</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <ActionTile
              icon={<ListChecks className="h-7 w-7" />}
              label="Pricelist"
              onClick={() => {
                onOpenChange(false);
                setPricelistOpen(true);
              }}
            />
          </div>
          {!confirmCancel ? (
              <Button
                variant="destructive"
                className="h-12 w-full"
                onClick={() => setConfirmCancel(true)}
              >
                <Trash2 className="h-4 w-4" /> Cancel Order
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-center text-sm text-muted-foreground">
                  Cancel this order? Cart will be cleared.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="h-12 flex-1"
                    onClick={() => {
                      if (activeOrder) {
                        updateOrder(activeOrder.id, { status: "cancelled", lines: [] });
                        deleteOrder(activeOrder.id);
                      }
                      setConfirmCancel(false);
                      onOpenChange(false);
                      toast.success("Order cancelled");
                    }}
                  >
                    Yes, cancel
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-12 flex-1"
                    onClick={() => setConfirmCancel(false)}
                  >
                    Keep order
                  </Button>
                </div>
              </div>
            )}
        </DialogContent>
      </Dialog>
      <PricelistModal open={pricelistOpen} onOpenChange={setPricelistOpen} />
    </>
  );
}


function ActionTile({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-sm font-medium shadow-soft transition-transform duration-150 active:scale-[0.97]"
    >
      {icon}
      {label}
    </button>
  );
}

export function CustomerNoteModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { activeOrder, updateOrder } = usePos();
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) {
      setTags(activeOrder?.noteTags ?? []);
      setText(activeOrder?.note ?? "");
    }
  }, [open, activeOrder?.id, activeOrder?.note, activeOrder?.noteTags]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Customer Note</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {noteTags.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() =>
                setTags((prev) =>
                  prev.includes(t.label) ? prev.filter((x) => x !== t.label) : [...prev, t.label],
                )
              }
              className={cn(
                "min-h-11 rounded-full px-4 text-sm font-medium transition-all duration-150",
                tagTone[t.label],
                tags.includes(t.label) &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note for this order..."
          className="min-h-32"
        />
        <div className="flex gap-2">
          <Button
            className="h-11 px-6"
            onClick={() => {
              if (activeOrder) updateOrder(activeOrder.id, { note: text, noteTags: tags });
              onOpenChange(false);
              toast.success("Note applied");
            }}
          >
            Apply
          </Button>
          <Button variant="secondary" className="h-11 px-6" onClick={() => onOpenChange(false)}>
            Discard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PricelistModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { activeOrder, updateOrder } = usePos();
  const { pricelists } = useBackend();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pricelist</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {pricelists.map((p) => {
            const selected = activeOrder?.pricelistId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (activeOrder) updateOrder(activeOrder.id, { pricelistId: p.id });
                  onOpenChange(false);
                  toast.success(`${p.name} applied`);
                }}
                className={cn(
                  "flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border border-border px-4 text-left transition-colors hover:bg-muted",
                  selected && "border-primary bg-accent",
                )}
              >
                <span className="min-w-0">
                  <span className="block font-medium">{p.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {p.ruleType}
                  </span>
                </span>
                {selected && <Check className="h-5 w-5 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
