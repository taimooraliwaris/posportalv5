export type CategoryId = "misc" | "desks" | "chairs";

export type Category = {
  id: CategoryId;
  name: string;
  tone: "pink" | "sand" | "sage" | "sky";
};

export type Product = {
  id: string;
  name: string;
  price: number;
  category: CategoryId;
  barcode: string;
  tone: "pink" | "sand" | "sage" | "sky";
  icon: string;
};

export type Customer = {
  id: string;
  name: string;
  location?: string;
  email: string;
  phone?: string;
  company?: string;
};

export type Pricelist = {
  id: string;
  name: string;
  description: string;
  discount: number;
};

export const STORE = {
  name: "Velora Mart",
  brand: "Velora POS",
  tagline: "Point of Sale, Simplified.",
  email: "hello@veloramart.com",
  cashier: "Rida A.",
  network: "VeloraNet",
};

export const TAX_RATE = 0.18;

export const categories: Category[] = [
  { id: "misc", name: "Misc", tone: "pink" },
  { id: "desks", name: "Desks", tone: "sky" },
  { id: "chairs", name: "Chairs", tone: "sand" },
];

export const products: Product[] = [
  { id: "p1", name: "Pedal Bin", price: 47.0, category: "misc", barcode: "8901001", tone: "pink", icon: "Trash2" },
  { id: "p2", name: "Office Lamp", price: 40.0, category: "misc", barcode: "8901002", tone: "sand", icon: "Lamp" },
  { id: "p3", name: "Storage Box", price: 18.5, category: "misc", barcode: "8901003", tone: "sky", icon: "Package" },
  { id: "p4", name: "Desk Organizer", price: 22.0, category: "misc", barcode: "8901004", tone: "sage", icon: "Boxes" },
  { id: "p5", name: "Desk Pad", price: 15.75, category: "misc", barcode: "8901005", tone: "pink", icon: "Square" },
  { id: "p6", name: "Flipover Board", price: 89.0, category: "misc", barcode: "8901006", tone: "sky", icon: "Presentation" },
  { id: "p7", name: "Whiteboard", price: 65.0, category: "misc", barcode: "8901007", tone: "sage", icon: "PenLine" },
  { id: "p8", name: "Acoustic Screen", price: 120.0, category: "misc", barcode: "8901008", tone: "sand", icon: "PanelsTopLeft" },
  { id: "p9", name: "Corner Desk", price: 310.0, category: "desks", barcode: "8902001", tone: "sky", icon: "Table" },
  { id: "p10", name: "Standing Desk", price: 420.0, category: "desks", barcode: "8902002", tone: "sage", icon: "LayoutPanelTop" },
  { id: "p11", name: "Drawer Unit", price: 145.0, category: "desks", barcode: "8902003", tone: "sand", icon: "Archive" },
  { id: "p12", name: "Large Cabinet", price: 260.0, category: "desks", barcode: "8902004", tone: "pink", icon: "DoorClosed" },
  { id: "p13", name: "Meeting Table", price: 890.0, category: "desks", barcode: "8902005", tone: "sky", icon: "Rows3" },
  { id: "p14", name: "Side Bench", price: 130.0, category: "desks", barcode: "8902006", tone: "sage", icon: "Minus" },
  { id: "p15", name: "Task Chair", price: 175.0, category: "chairs", barcode: "8903001", tone: "sand", icon: "Armchair" },
  { id: "p16", name: "Two-Seat Sofa", price: 540.0, category: "chairs", barcode: "8903002", tone: "sky", icon: "Sofa" },
  { id: "p17", name: "Lounge Pod", price: 760.0, category: "chairs", barcode: "8903003", tone: "sage", icon: "Armchair" },
  { id: "p18", name: "Visitor Stool", price: 68.0, category: "chairs", barcode: "8903004", tone: "pink", icon: "CircleDot" },
];

export const seedCustomers: Customer[] = [
  { id: "c1", name: "Velora Portal", location: "Pakistan", email: "portal@velora.com", company: "Velora" },
  { id: "c2", name: "Retail Store", location: "Lahore", email: "retail@velora.com" },
  { id: "c3", name: "Ayesha Khan", location: "Karachi", email: "ayesha.k@gmail.com", phone: "+92 300 1234567" },
  { id: "c4", name: "Northline Traders", location: "Islamabad", email: "info@northline.pk", company: "Northline" },
];

export const pricelists: Pricelist[] = [
  { id: "pl1", name: "Default Price", description: "Standard retail pricing", discount: 0 },
  { id: "pl2", name: "Wholesale", description: "10% off for bulk buyers", discount: 0.1 },
  { id: "pl3", name: "VIP", description: "15% off for loyalty members", discount: 0.15 },
];

export const noteTags = [
  { label: "Wait", tone: "destructive" },
  { label: "To Serve", tone: "warning" },
  { label: "Emergency", tone: "sand" },
  { label: "No Dressing", tone: "sky" },
] as const;

export function formatRs(amount: number) {
  return `Rs. ${amount.toFixed(2)}`;
}

export const toneClass: Record<string, string> = {
  pink: "bg-pink text-cat-foreground",
  sand: "bg-sand text-cat-foreground",
  sage: "bg-sage text-cat-foreground",
  sky: "bg-sky text-cat-foreground",
};
