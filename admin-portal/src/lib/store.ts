import { create } from "zustand";

interface ERPState {
  tenantAccess: Record<string, {
    suppliers: boolean;
    products: boolean;
    inventory: boolean;
    purchaseOrders: boolean;
    finance: boolean;
  }>;
  updateTenantAccess: (companyName: string, module: "suppliers" | "products" | "inventory" | "purchaseOrders" | "finance", enabled: boolean) => void;
  registerTenant: (companyName: string) => void;
}

export const useERPStore = create<ERPState>((set) => ({
  tenantAccess: {
    "Acme Corp": { suppliers: true, products: true, inventory: true, purchaseOrders: true, finance: true },
    "Globex Corporation": { suppliers: true, products: true, inventory: true, purchaseOrders: false, finance: false },
    "Initech": { suppliers: true, products: false, inventory: false, purchaseOrders: false, finance: false }
  },
  updateTenantAccess: (companyName, module, enabled) => set((state) => ({
    tenantAccess: {
      ...state.tenantAccess,
      [companyName]: {
        ...state.tenantAccess[companyName] || { suppliers: true, products: true, inventory: true, purchaseOrders: true, finance: true },
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
