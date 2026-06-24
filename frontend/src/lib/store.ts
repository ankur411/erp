import { create } from "zustand";

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  gstNumber: string;
  panNumber: string;
  contactPerson: string;
  rating: number;
  status: "active" | "inactive";
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  status: "active" | "inactive";
}

export interface Inventory {
  id: string;
  productId: string;
  warehouseId: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
}

export interface InventoryLedger {
  id: string;
  productId: string;
  warehouseId: string;
  transactionType: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  timestamp: string;
}

export interface PurchaseOrderItem {
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "completed" | "cancelled";
  totalAmount: number;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  items: PurchaseOrderItem[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  purchaseOrderId: string;
  status: "unpaid" | "partially_paid" | "paid" | "overdue" | "void";
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  dueDate: string;
  createdAt: string;
  payments: Payment[];
}

export interface Payment {
  id: string;
  amount: number;
  paymentMethod: "BANK_TRANSFER" | "CASH" | "CREDIT_CARD" | "ACH";
  status: string;
  transactionReference?: string;
  paidAt: string;
}

interface ERPState {
  suppliers: Supplier[];
  categories: Category[];
  products: Product[];
  warehouses: Warehouse[];
  inventory: Inventory[];
  ledger: InventoryLedger[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  
  tenantAccess: Record<string, {
    suppliers: boolean;
    products: boolean;
    inventory: boolean;
    purchaseOrders: boolean;
    finance: boolean;
  }>;
  
  // Active User / Org Mock Session
  currentOrg: string;
  userRole: "org:admin" | "org:member" | "org:procurement_manager" | "org:warehouse_manager" | "org:accountant" | "org:hr_manager" | "platform_admin";
  
  // Actions
  setOrg: (orgId: string) => void;
  setRole: (role: ERPState["userRole"]) => void;
  updateTenantAccess: (companyName: string, module: "suppliers" | "products" | "inventory" | "purchaseOrders" | "finance", enabled: boolean) => void;
  registerTenant: (companyName: string) => void;
  
  addSupplier: (supplier: Omit<Supplier, "id" | "rating">) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  
  addProduct: (product: Omit<Product, "id">) => void;
  adjustStock: (productId: string, warehouseId: string, qty: number, reason: string) => void;
  
  createPurchaseOrder: (supplierId: string, items: Omit<PurchaseOrderItem, "totalCost">[]) => void;
  updatePOStatus: (poId: string, newStatus: PurchaseOrder["status"], approverId?: string) => void;
  receivePO: (poId: string, warehouseId: string) => void;
  
  createInvoice: (poId: string, subtotal: number, cgst: number, sgst: number, igst: number, dueDate: string) => void;
  recordPayment: (invoiceId: string, amount: number, method: Payment["paymentMethod"], ref?: string) => void;
}

const mockSuppliers: Supplier[] = [
  { id: "s-1", name: "Supreme Materials Ltd", companyName: "Supreme Materials Ltd", email: "sales@supreme.com", phone: "+91 9876543210", address: "G-14, Industrial Area, Noida, UP, India", gstNumber: "09AAACS1234F1Z1", panNumber: "AAACS1234F", contactPerson: "Rohan Verma", rating: 4.8, status: "active", notes: "Key provider of primary steel rods." },
  { id: "s-2", name: "Global Packaging Corp", companyName: "Global Packaging Corp", email: "info@globalpack.com", phone: "+91 9999888877", address: "Plot 42, Sector 8, Gandhinagar, Gujarat", gstNumber: "24AABCG5678H2Z2", panNumber: "AABCG5678H", contactPerson: "Neha Patel", rating: 4.2, status: "active", notes: "Reliable box carton supplier." },
  { id: "s-3", name: "Apex Logistics & Co", companyName: "Apex Logistics & Co", email: "delivery@apex.com", phone: "+91 9555666777", address: "4th Floor, Cargo Building, Mumbai Port, MH", gstNumber: "27AAACA9911K3Z3", panNumber: "AAACA9911K", contactPerson: "Vikram Singh", rating: 3.9, status: "active" }
];

const mockCategories: Category[] = [
  { id: "c-1", name: "Raw Metals", description: "Steel, aluminum, brass inputs" },
  { id: "c-2", name: "Packaging", description: "Cartons, bubble wraps, pallets" },
  { id: "c-3", name: "Components", description: "Fasteners, screws, brackets" }
];

const mockProducts: Product[] = [
  { id: "p-1", sku: "MTL-STL-001", name: "High-grade Steel Rods 10mm", description: "Reinforced steel structural rods.", categoryId: "c-1", unit: "tons", costPrice: 420.00, sellingPrice: 550.00, reorderLevel: 5 },
  { id: "p-2", sku: "PKG-BOX-M", name: "Corrugated Carton Box - Medium", description: "Standard brown shipping carton.", categoryId: "c-2", unit: "pcs", costPrice: 1.20, sellingPrice: 2.50, reorderLevel: 200 },
  { id: "p-3", sku: "CMP-FST-M6", name: "Hex Bolt Screws M6 x 50", description: "Stainless steel fasteners.", categoryId: "c-3", unit: "box", costPrice: 15.00, sellingPrice: 22.00, reorderLevel: 50 }
];

const mockWarehouses: Warehouse[] = [
  { id: "wh-1", name: "Noida Main Depot", location: "Sector 62, Noida, UP", status: "active" },
  { id: "wh-2", name: "Mumbai Port Warehouse", location: "Dockyard Road, Mumbai, MH", status: "active" }
];

const mockInventory: Inventory[] = [
  { id: "i-1", productId: "p-1", warehouseId: "wh-1", currentStock: 12, reservedStock: 0, availableStock: 12 },
  { id: "i-2", productId: "p-2", warehouseId: "wh-1", currentStock: 1500, reservedStock: 200, availableStock: 1300 },
  { id: "i-3", productId: "p-3", warehouseId: "wh-2", currentStock: 30, reservedStock: 0, availableStock: 30 }
];

const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "po-1",
    poNumber: "PO-20260624-0001",
    supplierId: "s-1",
    status: "approved",
    totalAmount: 4200.00,
    createdAt: "2026-06-24T05:00:00Z",
    items: [
      { productId: "p-1", quantity: 10, unitCost: 420.00, totalCost: 4200.00 }
    ]
  }
];

const mockInvoices: Invoice[] = [
  {
    id: "inv-1",
    invoiceNumber: "INV-20260624-0001",
    purchaseOrderId: "po-1",
    status: "unpaid",
    subtotal: 4200.00,
    cgst: 378.00,
    sgst: 378.00,
    igst: 0.00,
    totalAmount: 4956.00,
    dueDate: "2026-07-24",
    createdAt: "2026-06-24T05:30:00Z",
    payments: []
  }
];

export const useERPStore = create<ERPState>((set) => ({
  suppliers: mockSuppliers,
  categories: mockCategories,
  products: mockProducts,
  warehouses: mockWarehouses,
  inventory: mockInventory,
  ledger: [],
  purchaseOrders: mockPurchaseOrders,
  invoices: mockInvoices,
  tenantAccess: {
    "Acme Manufacturing Inc.": { suppliers: true, products: true, inventory: true, purchaseOrders: true, finance: true },
    "Nexus Logistics Ltd.": { suppliers: true, products: true, inventory: true, purchaseOrders: true, finance: true },
    "Apex Distributors": { suppliers: true, products: true, inventory: true, purchaseOrders: true, finance: true }
  },
  
  currentOrg: "Acme Manufacturing Inc.",
  userRole: "org:admin",
  
  setOrg: (orgId) => set({ currentOrg: orgId }),
  setRole: (role) => set({ userRole: role }),
  
  addSupplier: (supplier) => set((state) => ({
    suppliers: [
      ...state.suppliers,
      {
        ...supplier,
        id: `s-${state.suppliers.length + 1}`,
        rating: 5.0
      }
    ]
  })),

  updateSupplier: (id, updatedFields) => set((state) => ({
    suppliers: state.suppliers.map((s) => s.id === id ? { ...s, ...updatedFields } : s)
  })),

  addProduct: (product) => set((state) => ({
    products: [
      ...state.products,
      {
        ...product,
        id: `p-${state.products.length + 1}`
      }
    ]
  })),

  adjustStock: (productId, warehouseId, qty, reason) => set((state) => {
    let invRecord = state.inventory.find(i => i.productId === productId && i.warehouseId === warehouseId);
    let updatedInventory = [...state.inventory];
    
    if (!invRecord) {
      invRecord = {
        id: `i-${state.inventory.length + 1}`,
        productId,
        warehouseId,
        currentStock: 0,
        reservedStock: 0,
        availableStock: 0
      };
      updatedInventory.push(invRecord);
    }

    if (invRecord.availableStock + qty < 0) {
       alert("Insufficient stock to complete this transaction!");
       return {};
    }

    const nextInventory = updatedInventory.map((i) => {
       if (i.productId === productId && i.warehouseId === warehouseId) {
          const nextVal = i.currentStock + qty;
          return {
             ...i,
             currentStock: nextVal,
             availableStock: nextVal
          };
       }
       return i;
    });

    const ledgerEntry: InventoryLedger = {
      id: `led-${state.ledger.length + 1}`,
      productId,
      warehouseId,
      transactionType: "ADJUSTMENT",
      quantity: qty,
      referenceType: "MANUAL",
      referenceId: reason,
      timestamp: new Date().toISOString()
    };

    return {
      inventory: nextInventory,
      ledger: [...state.ledger, ledgerEntry]
    };
  }),

  createPurchaseOrder: (supplierId, items) => set((state) => {
    const formattedItems = items.map((i) => ({
      ...i,
      totalCost: i.quantity * i.unitCost
    }));
    const totalAmount = formattedItems.reduce((acc, curr) => acc + curr.totalCost, 0);
    const poNumber = `PO-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${String(state.purchaseOrders.length + 1).padStart(4, "0")}`;

    const newPO: PurchaseOrder = {
      id: `po-${state.purchaseOrders.length + 1}`,
      poNumber,
      supplierId,
      status: "draft",
      totalAmount,
      createdAt: new Date().toISOString(),
      items: formattedItems
    };

    return {
      purchaseOrders: [...state.purchaseOrders, newPO]
    };
  }),

  updatePOStatus: (poId, newStatus, approverId) => set((state) => ({
    purchaseOrders: state.purchaseOrders.map((po) => {
      if (po.id === poId) {
        return {
          ...po,
          status: newStatus,
          approvedBy: newStatus === "approved" ? (approverId || "usr-1") : po.approvedBy,
          approvedAt: newStatus === "approved" ? new Date().toISOString() : po.approvedAt
        };
      }
      return po;
    })
  })),

  receivePO: (poId, warehouseId) => set((state) => {
    const po = state.purchaseOrders.find(p => p.id === poId);
    if (!po || po.status !== "approved") return {};

    const updatedInventory = [...state.inventory];
    const newLedgerEntries: InventoryLedger[] = [];

    po.items.forEach((item) => {
      let invRecord = updatedInventory.find(i => i.productId === item.productId && i.warehouseId === warehouseId);
      if (!invRecord) {
        invRecord = {
          id: `i-${updatedInventory.length + 1}`,
          productId: item.productId,
          warehouseId,
          currentStock: 0,
          reservedStock: 0,
          availableStock: 0
        };
        updatedInventory.push(invRecord);
      }

      invRecord.currentStock += item.quantity;
      invRecord.availableStock += item.quantity;

      newLedgerEntries.push({
        id: `led-${state.ledger.length + newLedgerEntries.length + 1}`,
        productId: item.productId,
        warehouseId,
        transactionType: "IN",
        quantity: item.quantity,
        referenceType: "PURCHASE_ORDER",
        referenceId: po.poNumber,
        timestamp: new Date().toISOString()
      });
    });

    const nextPOs = state.purchaseOrders.map((p) => p.id === poId ? { ...p, status: "completed" as const } : p);

    return {
      inventory: updatedInventory,
      ledger: [...state.ledger, ...newLedgerEntries],
      purchaseOrders: nextPOs
    };
  }),

  createInvoice: (poId, subtotal, cgst, sgst, igst, dueDate) => set((state) => {
    const totalAmount = subtotal + cgst + sgst + igst;
    const invoiceNumber = `INV-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${String(state.invoices.length + 1).padStart(4, "0")}`;

    const newInv: Invoice = {
      id: `inv-${state.invoices.length + 1}`,
      invoiceNumber,
      purchaseOrderId: poId,
      status: "unpaid",
      subtotal,
      cgst,
      sgst,
      igst,
      totalAmount,
      dueDate,
      createdAt: new Date().toISOString(),
      payments: []
    };

    return {
      invoices: [...state.invoices, newInv]
    };
  }),

  recordPayment: (invoiceId, amount, method, ref) => set((state) => {
     return {
        invoices: state.invoices.map((inv) => {
           if (inv.id === invoiceId) {
              const newPayment: Payment = {
                 id: `pay-${inv.payments.length + 1}`,
                 amount,
                 paymentMethod: method,
                 status: "completed",
                 transactionReference: ref,
                 paidAt: new Date().toISOString()
              };
              const payments = [...inv.payments, newPayment];
              const paidSum = payments.reduce((acc, curr) => acc + curr.amount, 0);
              let status: Invoice["status"] = "unpaid";
              if (paidSum >= inv.totalAmount) {
                 status = "paid";
              } else if (paidSum > 0) {
                 status = "partially_paid";
              }
              return {
                 ...inv,
                 payments,
                 status
              };
           }
           return inv;
        })
     };
  }),

  updateTenantAccess: (companyName, module, enabled) => set((state) => ({
    tenantAccess: {
      ...state.tenantAccess,
      [companyName]: {
        ...state.tenantAccess[companyName],
        [module]: enabled
      }
    }
  })),

  registerTenant: (companyName) => set((state) => ({
    tenantAccess: {
      ...state.tenantAccess,
      [companyName]: {
        suppliers: true,
        products: true,
        inventory: true,
        purchaseOrders: true,
        finance: true
      }
    }
  }))
}));
