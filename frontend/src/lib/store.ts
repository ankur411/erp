import { create } from "zustand";
import { apiFetch } from "./api";

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
  product: Product;
  warehouse: Warehouse;
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
  product?: Product;
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
  supplier?: Supplier;
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
  pagePermissions: Record<string, boolean>;
  
  tenantAccess: Record<string, {
    suppliers: boolean;
    products: boolean;
    inventory: boolean;
    purchaseOrders: boolean;
    finance: boolean;
  }>;
  
  // Active User / Org Session
  currentOrg: string;
  userRole: "org:admin" | "org:member" | "org:procurement_manager" | "org:warehouse_manager" | "org:accountant" | "org:hr_manager" | "platform_admin";
  
  // Actions
  setOrg: (orgId: string) => void;
  setRole: (role: ERPState["userRole"]) => void;
  updateTenantAccess: (companyName: string, module: "suppliers" | "products" | "inventory" | "purchaseOrders" | "finance", enabled: boolean) => void;
  registerTenant: (companyName: string) => void;
  
  addSupplier: (supplier: Omit<Supplier, "id" | "rating">) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  adjustStock: (productId: string, warehouseId: string, qty: number, reason: string) => Promise<void>;
  
  createPurchaseOrder: (supplierId: string, items: Omit<PurchaseOrderItem, "totalCost">[]) => Promise<void>;
  updatePOStatus: (poId: string, newStatus: PurchaseOrder["status"], approverId?: string) => Promise<void>;
  receivePO: (poId: string, warehouseId: string) => Promise<void>;
  
  createInvoice: (poId: string, subtotal: number, cgst: number, sgst: number, igst: number, dueDate: string) => Promise<void>;
  recordPayment: (invoiceId: string, amount: number, method: Payment["paymentMethod"], ref?: string) => Promise<void>;
}

export const useERPStore = create<ERPState>((set, get) => ({
  suppliers: [],
  categories: [],
  products: [],
  warehouses: [],
  inventory: [],
  ledger: [],
  purchaseOrders: [],
  invoices: [],
  pagePermissions: {},
  tenantAccess: {},
  
  currentOrg: "Loading...",
  userRole: "org:member",
  
  setOrg: (orgId) => set({ currentOrg: orgId }),
  setRole: (role) => set({ userRole: role }),
  
  addSupplier: async (supplier) => {
    try {
      const res = await apiFetch("/api/v1/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name: supplier.name,
          company_name: supplier.companyName,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          gst_number: supplier.gstNumber,
          pan_number: supplier.panNumber,
          contact_person: supplier.contactPerson,
          status: supplier.status,
          notes: supplier.notes
        })
      });
      if (res.ok) {
        const supRes = await apiFetch("/api/v1/suppliers/");
        if (supRes.ok) {
          const supData = await supRes.json();
          set({ suppliers: supData.items || [] });
        }
      } else {
        const err = await res.json();
        alert(`Failed to add supplier: ${err.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Error adding supplier", e);
    }
  },

  updateSupplier: async (id, updatedFields) => {
    try {
      const payload: Record<string, any> = {};
      if (updatedFields.name !== undefined) payload.name = updatedFields.name;
      if (updatedFields.companyName !== undefined) payload.company_name = updatedFields.companyName;
      if (updatedFields.email !== undefined) payload.email = updatedFields.email;
      if (updatedFields.phone !== undefined) payload.phone = updatedFields.phone;
      if (updatedFields.address !== undefined) payload.address = updatedFields.address;
      if (updatedFields.gstNumber !== undefined) payload.gst_number = updatedFields.gstNumber;
      if (updatedFields.panNumber !== undefined) payload.pan_number = updatedFields.panNumber;
      if (updatedFields.contactPerson !== undefined) payload.contact_person = updatedFields.contactPerson;
      if (updatedFields.status !== undefined) payload.status = updatedFields.status;
      if (updatedFields.notes !== undefined) payload.notes = updatedFields.notes;

      const res = await apiFetch(`/api/v1/suppliers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const supRes = await apiFetch("/api/v1/suppliers/");
        if (supRes.ok) {
          const supData = await supRes.json();
          set({ suppliers: supData.items || [] });
        }
      } else {
        const err = await res.json();
        alert(`Failed to update supplier: ${err.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Error updating supplier", e);
    }
  },

  addProduct: async (product) => {
    try {
      const res = await apiFetch("/api/v1/products", {
        method: "POST",
        body: JSON.stringify({
          sku: product.sku,
          name: product.name,
          description: product.description,
          category_id: product.categoryId,
          unit: product.unit,
          cost_price: product.costPrice,
          selling_price: product.sellingPrice,
          reorder_level: product.reorderLevel
        })
      });
      if (res.ok) {
        const prodRes = await apiFetch("/api/v1/products");
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          set({ products: prodData || [] });
        }
        const invRes = await apiFetch("/api/v1/inventory");
        if (invRes.ok) {
          const invData = await invRes.json();
          set({ inventory: invData || [] });
        }
      } else {
        const err = await res.json();
        alert(`Failed to add product: ${err.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Error adding product", e);
    }
  },

  adjustStock: async (productId, warehouseId, qty, reason) => {
    try {
      const res = await apiFetch("/api/v1/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          product_id: productId,
          warehouse_id: warehouseId,
          quantity: qty,
          notes: reason
        })
      });
      if (res.ok) {
        const invRes = await apiFetch("/api/v1/inventory");
        if (invRes.ok) {
          const invData = await invRes.json();
          set({ inventory: invData || [] });
        }
      } else {
        const err = await res.json();
        alert(`Failed to adjust stock: ${err.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Error adjusting stock", e);
    }
  },

  createPurchaseOrder: async (supplierId, items) => {
    try {
      const payload = {
        supplier_id: supplierId,
        items: items.map((i) => ({
          product_id: i.productId,
          quantity: i.quantity,
          unit_cost: i.unitCost
        }))
      };
      const res = await apiFetch("/api/v1/purchase-orders/", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const poRes = await apiFetch("/api/v1/purchase-orders/");
        if (poRes.ok) {
          const poData = await poRes.json();
          set({ purchaseOrders: poData || [] });
        }
      } else {
        const err = await res.json();
        alert(`Failed to create purchase order: ${err.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Error creating purchase order", e);
    }
  },

  updatePOStatus: async (poId, newStatus, approverId) => {
    try {
      const res = await apiFetch(`/api/v1/purchase-orders/${poId}/status`, {
        method: "POST",
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const poRes = await apiFetch("/api/v1/purchase-orders/");
        if (poRes.ok) {
          const poData = await poRes.json();
          set({ purchaseOrders: poData || [] });
        }
      } else {
        const err = await res.json();
        alert(`Failed to update purchase order status: ${err.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Error updating PO status", e);
    }
  },

  receivePO: async (poId, warehouseId) => {
    try {
      const res = await apiFetch(`/api/v1/purchase-orders/${poId}/receive?warehouse_id=${warehouseId}`, {
        method: "POST"
      });
      if (res.ok) {
        const poRes = await apiFetch("/api/v1/purchase-orders/");
        if (poRes.ok) {
          const poData = await poRes.json();
          set({ purchaseOrders: poData || [] });
        }
        const invRes = await apiFetch("/api/v1/inventory");
        if (invRes.ok) {
          const invData = await invRes.json();
          set({ inventory: invData || [] });
        }
      } else {
        const err = await res.json();
        alert(`Failed to receive purchase order: ${err.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Error receiving PO", e);
    }
  },

  createInvoice: async (poId, subtotal, cgst, sgst, igst, dueDate) => {
    try {
      const res = await apiFetch("/api/v1/finance/invoices", {
        method: "POST",
        body: JSON.stringify({
          purchase_order_id: poId,
          subtotal,
          cgst,
          sgst,
          igst,
          due_date: dueDate
        })
      });
      if (res.ok) {
        const invRes = await apiFetch("/api/v1/finance/invoices");
        if (invRes.ok) {
          const invData = await invRes.json();
          set({ invoices: invData || [] });
        }
      } else {
        const err = await res.json();
        alert(`Failed to create invoice: ${err.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Error creating invoice", e);
    }
  },

  recordPayment: async (invoiceId, amount, method, ref) => {
    try {
      const res = await apiFetch(`/api/v1/finance/invoices/${invoiceId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          payment_method: method,
          transaction_reference: ref
        })
      });
      if (res.ok) {
        const invRes = await apiFetch("/api/v1/finance/invoices");
        if (invRes.ok) {
          const invData = await invRes.json();
          set({ invoices: invData || [] });
        }
      } else {
        const err = await res.json();
        alert(`Failed to record payment: ${err.detail || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Error recording payment", e);
    }
  },

  updateTenantAccess: (companyName, module, enabled) => {},
  registerTenant: (companyName) => {}
}));
