"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse as WarehouseIcon,
  FileText,
  CreditCard,
  Plus,
  Search,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sun,
  Moon,
  Building,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Shield,
  FileSpreadsheet,
  HelpCircle,
  DollarSign,
  Check
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useERPStore, Supplier, Product, PurchaseOrder, Invoice, Payment } from "@/lib/store";

type TabType = "dashboard" | "suppliers" | "products" | "inventory" | "purchase" | "finance" | "tenant_control";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Store state and actions
  const {
    suppliers,
    categories,
    products,
    warehouses,
    inventory,
    ledger,
    purchaseOrders,
    invoices,
    tenantAccess,
    currentOrg,
    userRole,
    setOrg,
    setRole,
    addSupplier,
    addProduct,
    adjustStock,
    createPurchaseOrder,
    updatePOStatus,
    receivePO,
    createInvoice,
    recordPayment,
    updateTenantAccess
  } = useERPStore();

  // Modals state
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<string | null>(null);

  // Forms inputs state
  const [newSupplier, setNewSupplier] = useState({
    name: "", companyName: "", email: "", phone: "", address: "", gstNumber: "", panNumber: "", contactPerson: "", notes: ""
  });
  const [newProduct, setNewProduct] = useState({
    sku: "", name: "", description: "", categoryId: "c-1", unit: "pcs", costPrice: 0, sellingPrice: 0, reorderLevel: 10
  });
  const [poSupplierId, setPoSupplierId] = useState("s-1");
  const [poItems, setPoItems] = useState<{ productId: string; quantity: number; unitCost: number }[]>([
    { productId: "p-1", quantity: 1, unitCost: 420.00 }
  ]);
  const [stockAdjProductId, setStockAdjProductId] = useState("p-1");
  const [stockAdjWarehouseId, setStockAdjWarehouseId] = useState("wh-1");
  const [stockAdjQty, setStockAdjQty] = useState<number>(10);
  const [stockAdjReason, setStockAdjReason] = useState("Restocking");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<Payment["paymentMethod"]>("BANK_TRANSFER");
  const [paymentRef, setPaymentRef] = useState("");

  // Role details mapping
  const roleNames: Record<string, string> = {
    "org:admin": "Admin",
    "org:member": "Employee",
    "org:procurement_manager": "Procurement Manager",
    "org:warehouse_manager": "Warehouse Manager",
    "org:accountant": "Accountant",
    "org:hr_manager": "HR Manager"
  };

  // Helper check for RBAC permission
  const checkPermission = (action: string) => {
     if (userRole === "org:admin" || userRole === "platform_admin") return true;
     if (action === "adjust_stock") return userRole === "org:warehouse_manager";
     if (action === "create_po") return userRole === "org:procurement_manager";
     if (action === "approve_po") return userRole === "org:procurement_manager";
     if (action === "receive_po") return userRole === "org:warehouse_manager";
     if (action === "finance_write") return userRole === "org:accountant";
     return false;
  };

  const isModuleEnabled = (tabId: string) => {
    if (userRole === "platform_admin") return true;
    const access = tenantAccess[currentOrg];
    if (!access) return true;
    
    if (tabId === "suppliers") return access.suppliers;
    if (tabId === "products") return access.products;
    if (tabId === "inventory") return access.inventory;
    if (tabId === "purchase") return access.purchaseOrders;
    if (tabId === "finance") return access.finance;
    return true;
  };

  // Export Suppliers to Mock CSV
  const handleExportSuppliersCSV = () => {
    const headers = ["ID", "Name", "Company", "Email", "Phone", "GST", "PAN", "Contact", "Rating", "Status"];
    const rows = suppliers.map(s => [s.id, s.name, s.companyName, s.email, s.phone, s.gstNumber, s.panNumber, s.contactPerson, s.rating, s.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `suppliers_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart computations
  const analyticsData = useMemo(() => {
    // Total spend trend (Approved/Completed POs)
    const activePOs = purchaseOrders.filter(po => ["approved", "completed"].includes(po.status));
    return activePOs.map(po => ({
      name: po.poNumber.slice(-4),
      amount: po.totalAmount,
      date: new Date(po.createdAt).toLocaleDateString()
    }));
  }, [purchaseOrders]);

  const inventoryDistribution = useMemo(() => {
    return inventory.map(item => {
      const p = products.find(prod => prod.id === item.productId);
      const w = warehouses.find(wh => wh.id === item.warehouseId);
      return {
        name: `${p?.name || "Product"} (${w?.name || "WH"})`,
        stock: item.currentStock
      };
    });
  }, [inventory, products, warehouses]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <div className={`flex flex-col md:flex-row min-h-screen ${darkMode ? "dark bg-zinc-950 text-zinc-50" : "bg-zinc-50 text-zinc-900"}`}>
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between">
        <div>
          {/* Brand Logo & Org Swticher */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-black font-extrabold text-sm tracking-wider">
              SE
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Organization</div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-none mt-1">
                <Building className="h-3.5 w-3.5" />
                <select 
                  className="bg-transparent font-medium focus:outline-none cursor-pointer text-xs" 
                  value={currentOrg}
                  onChange={(e) => setOrg(e.target.value)}
                >
                  <option value="Acme Manufacturing Inc.">Acme Mfg Inc.</option>
                  <option value="Nexus Logistics Ltd.">Nexus Logistics</option>
                  <option value="Apex Distributors">Apex Distrib.</option>
                </select>
              </div>
            </div>
          </div>

          {/* Platform Admin Portal Access */}
          <div className="p-3 mx-3 mt-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
            <Link 
              href="/admin"
              className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-450 hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                <span>Platform Admin Portal</span>
              </div>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Quick Role Toggle (For Demoing RBAC Security Gateways) */}
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
             <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-emerald-500" /> Active Role</span>
             </div>
             <select
               className="mt-1.5 w-full text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 focus:outline-none"
               value={userRole}
               onChange={(e) => setRole(e.target.value as any)}
             >
                {Object.entries(roleNames).map(([key, name]) => (
                   <option key={key} value={key}>{name}</option>
                ))}
             </select>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "suppliers", label: "Suppliers", icon: Users },
              { id: "products", label: "Product Catalog", icon: Package },
              { id: "inventory", label: "Inventory & Stock", icon: WarehouseIcon },
              { id: "purchase", label: "Purchase Orders", icon: FileText },
              { id: "finance", label: "Finance & Invoices", icon: CreditCard }
            ].filter(item => isModuleEnabled(item.id)).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as TabType); setSearchQuery(""); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black font-semibold"
                      : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3 w-3" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User / Setting Info bottom */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs">
              AG
            </div>
            <div>
              <div className="text-xs font-semibold leading-none">Aarush Gupta</div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">Clerk Auth Session</span>
            </div>
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-zinc-950/20">
        {/* HEADER BAR */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold capitalize leading-none">{activeTab} Manager</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Multi-tenant context isolation: active</p>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Global Search inside sub-view */}
             <div className="relative max-w-xs hidden sm:block">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
               <input
                 type="text"
                 placeholder="Quick search..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none dark:bg-zinc-800/50 dark:focus:bg-zinc-800 w-48 sm:w-64"
               />
             </div>

             {/* Tenant Status Badge */}
             <div className="flex items-center gap-1.5 text-xs bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1.5 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                  {currentOrg}
                </span>
             </div>
          </div>
        </header>

        {/* CONTENT COMPONENT CONTROLLER */}
        <div className="p-6 flex-1 overflow-auto">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Stat Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Suppliers</span>
                     <Users className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="text-3xl font-extrabold mt-2 leading-none">{suppliers.length}</div>
                  <div className="text-[10px] text-emerald-500 mt-2 flex items-center gap-1">
                     <TrendingUp className="h-3 w-3" /> +1 new this month
                  </div>
                </div>

                <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Product SKUs</span>
                     <Package className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="text-3xl font-extrabold mt-2 leading-none">{products.length}</div>
                  <div className="text-[10px] text-zinc-400 mt-2">Active catalog items</div>
                </div>

                <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pending POs</span>
                     <FileText className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="text-3xl font-extrabold mt-2 leading-none">
                     {purchaseOrders.filter(po => po.status === "draft" || po.status === "submitted").length}
                  </div>
                  <div className="text-[10px] text-amber-500 mt-2">Awaiting approval or final receipt</div>
                </div>

                <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Unpaid Invoices</span>
                     <CreditCard className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="text-3xl font-extrabold mt-2 leading-none">
                     ₹{invoices.filter(i => i.status !== "paid").reduce((acc, curr) => acc + curr.totalAmount, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </div>
                  <div className="text-[10px] text-red-500 mt-2">Accounts payable ledger</div>
                </div>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Spend trend */}
                <div className="lg:col-span-2 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between">
                   <div>
                     <h3 className="text-sm font-bold tracking-tight">Procurement Spend Analytics</h3>
                     <p className="text-xs text-zinc-400">Approved and completed purchase orders transaction volumes</p>
                   </div>
                   <div className="h-64 mt-4">
                     {analyticsData.length === 0 ? (
                       <div className="h-full flex items-center justify-center text-xs text-zinc-400">No active transaction data.</div>
                     ) : (
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={analyticsData}>
                           <defs>
                             <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#09f" stopOpacity={0.4}/>
                               <stop offset="95%" stopColor="#09f" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#333" : "#eee"} />
                           <XAxis dataKey="name" stroke="#888" fontSize={11} />
                           <YAxis stroke="#888" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                           <Tooltip contentStyle={{ background: darkMode ? "#1a1a1a" : "#fff", border: "1px solid #444" }} formatter={(value: any) => [`₹${value.toLocaleString()}`, "Spend"]} />
                           <Area type="monotone" dataKey="amount" stroke="#09f" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                         </AreaChart>
                       </ResponsiveContainer>
                     )}
                   </div>
                </div>

                {/* Stock levels */}
                <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between">
                   <div>
                     <h3 className="text-sm font-bold tracking-tight">Stock Distribution</h3>
                     <p className="text-xs text-zinc-400">Current quantities stored across Noida & Mumbai depots</p>
                   </div>
                   <div className="h-64 mt-4 flex items-center justify-center">
                     {inventoryDistribution.length === 0 ? (
                        <div className="text-xs text-zinc-400">Warehouse stock is currently zero.</div>
                     ) : (
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={inventoryDistribution}
                             cx="50%"
                             cy="50%"
                             labelLine={false}
                             outerRadius={80}
                             fill="#8884d8"
                             dataKey="stock"
                           >
                             {inventoryDistribution.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                           </Pie>
                           <Tooltip />
                         </PieChart>
                       </ResponsiveContainer>
                     )}
                   </div>
                </div>
              </div>

              {/* Alerts & Quick Tasks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Reorder Alerts */}
                 <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <h3 className="text-sm font-bold flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-red-500" /> Low Stock Alerts</h3>
                    <div className="mt-3 space-y-2">
                       {products.map((prod) => {
                          const totalStock = inventory.filter(i => i.productId === prod.id).reduce((acc, curr) => acc + curr.currentStock, 0);
                          const isLow = totalStock < prod.reorderLevel;
                          if (!isLow) return null;
                          return (
                             <div key={prod.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-xs border border-red-100 dark:border-red-950">
                                <div>
                                   <span className="font-semibold text-red-800 dark:text-red-300">{prod.name}</span>
                                   <span className="text-[10px] text-red-500 ml-2">SKU: {prod.sku}</span>
                                </div>
                                <span className="font-bold text-red-700 dark:text-red-400">Only {totalStock} {prod.unit} left (Reorder: {prod.reorderLevel})</span>
                             </div>
                          );
                       })}
                       {products.every(prod => {
                          const totalStock = inventory.filter(i => i.productId === prod.id).reduce((acc, curr) => acc + curr.currentStock, 0);
                          return totalStock >= prod.reorderLevel;
                       }) && (
                          <div className="text-xs text-zinc-400 text-center py-4">All products levels are healthy.</div>
                       )}
                    </div>
                 </div>

                 {/* Tenant Access Session Status Panel */}
                 <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-1.5"><Shield className="h-4 w-4 text-zinc-500" /> Active Session Info</h3>
                      <p className="text-xs text-zinc-400 mt-1">Multi-tenant runtime details. Switch roles or tenants using the dropdown lists in the sidebar.</p>
                    </div>
                    <div className="mt-4 space-y-2 text-xs">
                       <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="text-zinc-550 dark:text-zinc-400">Current Organization:</span>
                          <span className="font-semibold">{currentOrg}</span>
                       </div>
                       <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="text-zinc-550 dark:text-zinc-400">Simulated Role:</span>
                          <span className="font-semibold">{roleNames[userRole] || userRole}</span>
                       </div>
                       {userRole === "platform_admin" && (
                          <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400 font-bold">
                             <span>Admin Level:</span>
                             <span>Platform Master</span>
                          </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUPPLIERS */}
          {activeTab === "suppliers" && (
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-400">{suppliers.length} records found</div>
                  <div className="flex gap-2">
                     <button
                       onClick={handleExportSuppliersCSV}
                       className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-50"
                     >
                        <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                     </button>
                     <button
                       onClick={() => setShowAddSupplierModal(true)}
                       className="flex items-center gap-1 bg-zinc-900 text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-lg text-xs font-semibold"
                     >
                        <Plus className="h-3.5 w-3.5" /> Add Supplier
                     </button>
                  </div>
               </div>

               {/* Suppliers Table */}
               <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-xs border-collapse">
                        <thead>
                           <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-400 font-semibold uppercase">
                              <th className="p-3">Supplier Name</th>
                              <th className="p-3">GST/PAN Number</th>
                              <th className="p-3">Contact Person</th>
                              <th className="p-3">Email & Phone</th>
                              <th className="p-3">Rating</th>
                              <th className="p-3">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                           {suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.companyName.toLowerCase().includes(searchQuery.toLowerCase())).map((sup) => (
                              <tr key={sup.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                                 <td className="p-3">
                                    <div className="font-semibold">{sup.name}</div>
                                    <div className="text-[10px] text-zinc-400">{sup.address}</div>
                                 </td>
                                 <td className="p-3">
                                    <div>GST: {sup.gstNumber}</div>
                                    <div className="text-[10px] text-zinc-400">PAN: {sup.panNumber}</div>
                                 </td>
                                 <td className="p-3 font-medium">{sup.contactPerson}</td>
                                 <td className="p-3">
                                    <div>{sup.email}</div>
                                    <div className="text-[10px] text-zinc-400">{sup.phone}</div>
                                 </td>
                                 <td className="p-3">
                                    <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold px-1.5 py-0.5 rounded text-[10px]">{sup.rating} ★</span>
                                 </td>
                                 <td className="p-3">
                                    <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${sup.status === "active" ? "bg-emerald-500" : "bg-zinc-400"}`}></span>
                                    <span className="capitalize">{sup.status}</span>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}

          {/* TAB 3: PRODUCTS */}
          {activeTab === "products" && (
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <div className="text-xs font-semibold text-zinc-400">{products.length} catalog items</div>
                  <button
                    onClick={() => setShowAddProductModal(true)}
                    className="flex items-center gap-1 bg-zinc-900 text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                     <Plus className="h-3.5 w-3.5" /> Add Product SKU
                  </button>
               </div>

               {/* Products Table */}
               <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-xs border-collapse">
                        <thead>
                           <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-400 font-semibold uppercase">
                              <th className="p-3">SKU</th>
                              <th className="p-3">Name</th>
                              <th className="p-3">Category</th>
                              <th className="p-3 text-right">Cost Price</th>
                              <th className="p-3 text-right">Selling Price</th>
                              <th className="p-3 text-center">Unit</th>
                              <th className="p-3 text-center">Reorder Threshold</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                           {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())).map((prod) => {
                              const cat = categories.find(c => c.id === prod.categoryId);
                              return (
                                 <tr key={prod.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                                    <td className="p-3 font-mono font-bold text-zinc-500">{prod.sku}</td>
                                    <td className="p-3">
                                       <div className="font-semibold">{prod.name}</div>
                                       <div className="text-[10px] text-zinc-400">{prod.description}</div>
                                    </td>
                                    <td className="p-3">
                                       <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-medium">{cat?.name || "Uncategorized"}</span>
                                    </td>
                                    <td className="p-3 text-right font-medium">₹{prod.costPrice.toFixed(2)}</td>
                                    <td className="p-3 text-right font-medium">₹{prod.sellingPrice.toFixed(2)}</td>
                                    <td className="p-3 text-center capitalize">{prod.unit}</td>
                                    <td className="p-3 text-center font-bold text-red-500">{prod.reorderLevel}</td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}

          {/* TAB 4: INVENTORY */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
               <div className="flex justify-between items-center">
                  <div>
                     <h3 className="text-sm font-bold">Warehouse Stock Ledger</h3>
                     <p className="text-xs text-zinc-400">Direct stock correction hooks and reorder limits.</p>
                  </div>
                  <button
                    onClick={() => {
                       if (!checkPermission("adjust_stock")) {
                          alert(`Permission Denied! Only Warehouse Managers can execute adjustments. Current role: ${roleNames[userRole]}`);
                          return;
                       }
                       setShowAdjustStockModal(true);
                    }}
                    className="flex items-center gap-1 bg-zinc-900 text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                     <WarehouseIcon className="h-3.5 w-3.5" /> Adjust Stock Balance
                  </button>
               </div>

               {/* Inventory List */}
               <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                     <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-400 font-semibold uppercase">
                           <th className="p-3">Product SKU / Name</th>
                           <th className="p-3">Warehouse Location</th>
                           <th className="p-3 text-right">Physical Stock</th>
                           <th className="p-3 text-right">Allocated Stock</th>
                           <th className="p-3 text-right">Available Stock</th>
                           <th className="p-3 text-center">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {inventory.map((inv) => {
                           const prod = products.find(p => p.id === inv.productId);
                           const wh = warehouses.find(w => w.id === inv.warehouseId);
                           if (!prod) return null;
                           const isLow = inv.availableStock < prod.reorderLevel;

                           return (
                              <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                                 <td className="p-3">
                                    <div className="font-semibold">{prod.name}</div>
                                    <div className="text-[10px] text-zinc-400 font-mono">{prod.sku}</div>
                                 </td>
                                 <td className="p-3">
                                    <div className="font-semibold">{wh?.name}</div>
                                    <div className="text-[10px] text-zinc-400">{wh?.location}</div>
                                 </td>
                                 <td className="p-3 text-right font-bold">{inv.currentStock} {prod.unit}</td>
                                 <td className="p-3 text-right text-zinc-400">{inv.reservedStock} {prod.unit}</td>
                                 <td className="p-3 text-right font-extrabold text-zinc-950 dark:text-white">{inv.availableStock} {prod.unit}</td>
                                 <td className="p-3 text-center">
                                    {isLow ? (
                                       <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[10px] font-bold">Low Stock Warning</span>
                                    ) : (
                                       <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">In Stock</span>
                                    )}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>

               {/* Inventory Ledger history logs */}
               <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Double-Entry Stock Movement History</h4>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                     {ledger.length === 0 ? (
                        <div className="text-xs text-zinc-400 text-center py-6">No historical inventory transactions recorded yet.</div>
                     ) : (
                        <div className="space-y-3">
                           {ledger.map((log) => {
                              const p = products.find(prod => prod.id === log.productId);
                              const w = warehouses.find(wh => wh.id === log.warehouseId);
                              return (
                                 <div key={log.id} className="flex justify-between items-center text-xs border-b border-zinc-100 dark:border-zinc-800 pb-2">
                                    <div>
                                       <div className="font-semibold text-zinc-800 dark:text-zinc-200">{p?.name}</div>
                                       <div className="text-[10px] text-zinc-400">
                                          Warehouse: <span className="font-medium">{w?.name}</span> | Type: <span className="font-medium text-zinc-500">{log.transactionType}</span>
                                       </div>
                                    </div>
                                    <div className="text-right">
                                       <span className={`font-bold ${log.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                                          {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                                       </span>
                                       <div className="text-[10px] text-zinc-400">{new Date(log.timestamp).toLocaleString()}</div>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {/* TAB 5: PURCHASE ORDERS */}
          {activeTab === "purchase" && (
            <div className="space-y-6">
               <div className="flex justify-between items-center">
                  <div className="text-xs font-semibold text-zinc-400">{purchaseOrders.length} Procurement Records</div>
                  <button
                    onClick={() => {
                       if (!checkPermission("create_po")) {
                          alert(`Permission Denied! Only Procurement Managers can draft POs. Current role: ${roleNames[userRole]}`);
                          return;
                       }
                       setShowCreatePOModal(true);
                    }}
                    className="flex items-center gap-1 bg-zinc-900 text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                     <Plus className="h-3.5 w-3.5" /> Draft Purchase Order
                  </button>
               </div>

               {/* POs List */}
               <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                     <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-400 font-semibold uppercase">
                           <th className="p-3">PO Number</th>
                           <th className="p-3">Supplier Name</th>
                           <th className="p-3">Total Cost</th>
                           <th className="p-3">Order Status</th>
                           <th className="p-3">Order Date</th>
                           <th className="p-3 text-right">Workflow Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {purchaseOrders.map((po) => {
                           const s = suppliers.find(sup => sup.id === po.supplierId);
                           return (
                              <tr key={po.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                                 <td className="p-3 font-mono font-bold">{po.poNumber}</td>
                                 <td className="p-3 font-semibold">{s?.name || "Unknown Supplier"}</td>
                                 <td className="p-3 font-bold">₹{po.totalAmount.toFixed(2)}</td>
                                 <td className="p-3">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                       po.status === "completed" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" :
                                       po.status === "approved" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400" :
                                       po.status === "draft" ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-850/30 dark:text-zinc-400" : "bg-amber-100 text-amber-800"
                                    }`}>
                                       {po.status}
                                    </span>
                                 </td>
                                 <td className="p-3 text-zinc-400">{new Date(po.createdAt).toLocaleDateString()}</td>
                                 <td className="p-3 text-right">
                                    {/* Action Workflow logic */}
                                    <div className="flex gap-2 justify-end">
                                       {po.status === "draft" && (
                                          <button
                                            onClick={() => {
                                               if (!checkPermission("approve_po")) {
                                                  alert("Permission Denied! Procurement Managers must approve POs.");
                                                  return;
                                               }
                                               updatePOStatus(po.id, "approved");
                                               alert("Purchase Order Approved!");
                                            }}
                                            className="px-2.5 py-1 bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold rounded text-[10px]"
                                          >
                                             Approve Order
                                          </button>
                                       )}
                                       {po.status === "approved" && (
                                          <div className="flex gap-1">
                                             <button
                                               onClick={() => {
                                                  if (!checkPermission("receive_po")) {
                                                     alert("Permission Denied! Warehouse Managers must receive stocks.");
                                                     return;
                                                  }
                                                  receivePO(po.id, "wh-1");
                                                  alert("Goods received. Stock levels synced.");
                                               }}
                                               className="px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded text-[10px]"
                                             >
                                                Receive Noida
                                             </button>
                                             <button
                                               onClick={() => {
                                                  if (!checkPermission("receive_po")) {
                                                     alert("Permission Denied! Warehouse Managers must receive stocks.");
                                                     return;
                                                  }
                                                  receivePO(po.id, "wh-2");
                                                  alert("Goods received at Mumbai Depot.");
                                               }}
                                               className="px-2.5 py-1 bg-teal-600 text-white font-semibold rounded text-[10px]"
                                             >
                                                Receive Mumbai
                                             </button>
                                          </div>
                                       )}
                                       {po.status === "completed" && (
                                          <span className="text-[10px] text-zinc-400 flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" /> Fully Received</span>
                                       )}
                                    </div>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {/* TAB 6: FINANCE & INVOICES */}
          {activeTab === "finance" && (
            <div className="space-y-6">
               <div className="flex justify-between items-center">
                  <div className="text-xs font-semibold text-zinc-400">{invoices.length} Invoices</div>
               </div>

               {/* Invoices List */}
               <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                     <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-400 font-semibold uppercase">
                           <th className="p-3">Invoice No</th>
                           <th className="p-3">PO Reference</th>
                           <th className="p-3 text-right">Subtotal</th>
                           <th className="p-3 text-right">Tax (GST)</th>
                           <th className="p-3 text-right">Total Amount</th>
                           <th className="p-3">Due Date</th>
                           <th className="p-3">Payment Status</th>
                           <th className="p-3 text-right">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {invoices.map((inv) => (
                           <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                              <td className="p-3 font-mono font-bold">{inv.invoiceNumber}</td>
                              <td className="p-3 text-zinc-500 font-semibold">{inv.purchaseOrderId}</td>
                              <td className="p-3 text-right font-medium">₹{inv.subtotal.toFixed(2)}</td>
                              <td className="p-3 text-right text-zinc-400">
                                 CGST: ₹{inv.cgst.toFixed(2)} | SGST: ₹{inv.sgst.toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-bold text-zinc-950 dark:text-white">₹{inv.totalAmount.toFixed(2)}</td>
                              <td className="p-3 text-zinc-400">{inv.dueDate}</td>
                              <td className="p-3">
                                 <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    inv.status === "paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" :
                                    inv.status === "partially_paid" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                                 }`}>
                                    {inv.status}
                                 </span>
                              </td>
                              <td className="p-3 text-right">
                                 {inv.status !== "paid" ? (
                                    <button
                                      onClick={() => {
                                         if (!checkPermission("finance_write")) {
                                            alert("Permission Denied! Accountants only.");
                                            return;
                                         }
                                         setSelectedInvoiceForPayment(inv.id);
                                         setPaymentAmount(inv.totalAmount - inv.payments.reduce((acc, curr) => acc + curr.amount, 0));
                                         setShowPaymentModal(true);
                                      }}
                                      className="px-2.5 py-1 bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold rounded text-[10px]"
                                    >
                                       Record Payment
                                    </button>
                                 ) : (
                                    <span className="text-[10px] text-zinc-400 flex items-center justify-end gap-1"><Check className="h-3 w-3 text-emerald-500" /> Settled</span>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {/* TAB 7: TENANT ACCESS CONTROL */}
          {activeTab === "tenant_control" && (
            <div className="space-y-6">
               <div className="flex justify-between items-center">
                  <div>
                     <h2 className="text-xl font-bold tracking-tight">Platform Tenant Administration</h2>
                     <p className="text-xs text-zinc-500 mt-1">Granular controls to manage module access per tenant. Simulates backend tenant policy enforcement.</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-6">
                  {Object.keys(tenantAccess).map((company) => (
                     <div key={company} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
                        <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                           <div>
                              <div className="text-sm font-bold">{company}</div>
                              <div className="text-[10px] text-zinc-400 mt-0.5">ID: {company.toLowerCase().replace(/[^a-z0-9]/g, "-")}</div>
                           </div>
                           <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">Active Tenant</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                           {(["suppliers", "products", "inventory", "purchaseOrders", "finance"] as const).map((module) => {
                              const isEnabled = tenantAccess[company][module];
                              return (
                                 <button
                                    key={module}
                                    onClick={() => updateTenantAccess(company, module, !isEnabled)}
                                    className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all duration-200 ${
                                       isEnabled
                                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-black dark:border-zinc-100"
                                          : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:border-zinc-800 dark:text-zinc-400"
                                    }`}
                                 >
                                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-85">
                                       {module === "purchaseOrders" ? "Purchase Orders" : module}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between w-full">
                                       <span className="text-xs font-semibold">
                                          {isEnabled ? "Enabled" : "Disabled"}
                                       </span>
                                       <span className={`h-2.5 w-2.5 rounded-full ${isEnabled ? "bg-emerald-400" : "bg-zinc-400"}`}></span>
                                    </div>
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          )}

        </div>
      </main>

      {/* --- MODALS --- */}
      
      {/* 1. Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-sm font-bold">Add Supplier Registry</h3>
                 <button onClick={() => setShowAddSupplierModal(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Supplier Name</label>
                    <input type="text" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newSupplier.name} onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Company Name</label>
                    <input type="text" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newSupplier.companyName} onChange={(e) => setNewSupplier({...newSupplier, companyName: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">GST Identification (GSTIN)</label>
                    <input type="text" placeholder="e.g. 09AAACS1234F1Z1" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newSupplier.gstNumber} onChange={(e) => setNewSupplier({...newSupplier, gstNumber: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">PAN Number</label>
                    <input type="text" placeholder="e.g. AAACS1234F" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newSupplier.panNumber} onChange={(e) => setNewSupplier({...newSupplier, panNumber: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Contact Email</label>
                    <input type="email" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newSupplier.email} onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Contact Phone</label>
                    <input type="text" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newSupplier.phone} onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Contact Person Name</label>
                    <input type="text" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newSupplier.contactPerson} onChange={(e) => setNewSupplier({...newSupplier, contactPerson: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Notes / Primary Material</label>
                    <input type="text" placeholder="e.g. steel rods provider" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newSupplier.notes} onChange={(e) => setNewSupplier({...newSupplier, notes: e.target.value})} />
                 </div>
              </div>
              <div>
                 <label className="text-[10px] font-bold text-zinc-400 block mb-1">Billing Address</label>
                 <textarea className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" rows={2} value={newSupplier.address} onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})} />
              </div>
              <button
                onClick={() => {
                   if (!newSupplier.name || !newSupplier.companyName || !newSupplier.gstNumber) {
                      alert("Please fill in Name, Company, and GST fields!");
                      return;
                   }
                   addSupplier({ ...newSupplier, status: "active" });
                   setShowAddSupplierModal(false);
                   alert("Supplier profile added to workspace.");
                }}
                className="w-full py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold rounded-lg text-xs"
              >
                 Create Registry
              </button>
           </div>
        </div>
      )}

      {/* 2. Add Product SKU Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-sm font-bold">Add Product Catalog Item</h3>
                 <button onClick={() => setShowAddProductModal(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">SKU identifier</label>
                    <input type="text" placeholder="e.g. MTL-STL-999" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Product Name</label>
                    <input type="text" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Category</label>
                    <select className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newProduct.categoryId} onChange={(e) => setNewProduct({...newProduct, categoryId: e.target.value})}>
                       {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Measurement Unit</label>
                    <input type="text" placeholder="pcs, tons, box" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newProduct.unit} onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Standard Cost Price (₹)</label>
                    <input type="number" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newProduct.costPrice} onChange={(e) => setNewProduct({...newProduct, costPrice: parseFloat(e.target.value) || 0})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Selling Price (₹)</label>
                    <input type="number" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newProduct.sellingPrice} onChange={(e) => setNewProduct({...newProduct, sellingPrice: parseFloat(e.target.value) || 0})} />
                 </div>
                 <div className="col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Reorder Level Threshold</label>
                    <input type="number" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={newProduct.reorderLevel} onChange={(e) => setNewProduct({...newProduct, reorderLevel: parseInt(e.target.value) || 0})} />
                 </div>
              </div>
              <button
                onClick={() => {
                   if (!newProduct.sku || !newProduct.name) {
                      alert("Please fill in SKU and Name!");
                      return;
                   }
                   addProduct(newProduct);
                   setShowAddProductModal(false);
                   alert("SKU added to catalog list.");
                }}
                className="w-full py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold rounded-lg text-xs"
              >
                 Insert SKU
              </button>
           </div>
        </div>
      )}

      {/* 3. Adjust Stock Modal */}
      {showAdjustStockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-sm font-bold">Manual Inventory Adjustment</h3>
                 <button onClick={() => setShowAdjustStockModal(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
              </div>
              <div className="space-y-3">
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Select Product</label>
                    <select className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={stockAdjProductId} onChange={(e) => setStockAdjProductId(e.target.value)}>
                       {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Target Warehouse</label>
                    <select className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={stockAdjWarehouseId} onChange={(e) => setStockAdjWarehouseId(e.target.value)}>
                       {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Adjustment Quantity (use negative to decrease)</label>
                    <input type="number" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={stockAdjQty} onChange={(e) => setStockAdjQty(parseInt(e.target.value) || 0)} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Reason / Notes</label>
                    <input type="text" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={stockAdjReason} onChange={(e) => setStockAdjReason(e.target.value)} />
                 </div>
              </div>
              <button
                onClick={() => {
                   adjustStock(stockAdjProductId, stockAdjWarehouseId, stockAdjQty, stockAdjReason);
                   setShowAdjustStockModal(false);
                   alert("Double-entry stock ledger updated.");
                }}
                className="w-full py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold rounded-lg text-xs"
              >
                 Apply Ledger Correction
              </button>
           </div>
        </div>
      )}

      {/* 4. Create PO Modal */}
      {showCreatePOModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-sm font-bold">Draft Purchase Order (Procurement)</h3>
                 <button onClick={() => setShowCreatePOModal(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Select Supplier</label>
                    <select className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={poSupplierId} onChange={(e) => setPoSupplierId(e.target.value)}>
                       {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
                 
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1 flex justify-between">
                       <span>PO Line Items</span>
                       <button onClick={() => setPoItems([...poItems, { productId: "p-1", quantity: 1, unitCost: 10 }])} className="text-zinc-900 dark:text-white underline">+ Add Item</button>
                    </label>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                       {poItems.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                             <select
                               className="flex-1 text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                               value={item.productId}
                               onChange={(e) => {
                                  const updated = [...poItems];
                                  updated[idx].productId = e.target.value;
                                  const p = products.find(prod => prod.id === e.target.value);
                                  if (p) updated[idx].unitCost = p.costPrice;
                                  setPoItems(updated);
                               }}
                             >
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                             <input
                               type="number"
                               placeholder="Qty"
                               className="w-16 text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                               value={item.quantity}
                               onChange={(e) => {
                                  const updated = [...poItems];
                                  updated[idx].quantity = parseInt(e.target.value) || 0;
                                  setPoItems(updated);
                               }}
                             />
                             <input
                               type="number"
                               placeholder="Cost"
                               className="w-20 text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700"
                               value={item.unitCost}
                               onChange={(e) => {
                                  const updated = [...poItems];
                                  updated[idx].unitCost = parseFloat(e.target.value) || 0;
                                  setPoItems(updated);
                               }}
                             />
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
              <button
                onClick={() => {
                   createPurchaseOrder(poSupplierId, poItems);
                   setShowCreatePOModal(false);
                   alert("Purchase order drafted successfully. Awaiting Approval status.");
                }}
                className="w-full py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold rounded-lg text-xs"
              >
                 Submit Draft
              </button>
           </div>
        </div>
      )}

      {/* 5. Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-sm font-bold">Record Settle Payment</h3>
                 <button onClick={() => setShowPaymentModal(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
              </div>
              <div className="space-y-3">
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Amount (₹)</label>
                    <input type="number" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Payment Method</label>
                    <select className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                       <option value="BANK_TRANSFER">Bank Transfer</option>
                       <option value="CASH">Cash Payment</option>
                       <option value="ACH">ACH Transfer</option>
                       <option value="CREDIT_CARD">Credit Card</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Transaction Ref / Cheque No</label>
                    <input type="text" className="w-full text-xs border rounded p-2 focus:outline-none dark:bg-zinc-800 dark:border-zinc-700" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
                 </div>
              </div>
              <button
                onClick={() => {
                   if (selectedInvoiceForPayment) {
                      recordPayment(selectedInvoiceForPayment, paymentAmount, paymentMethod, paymentRef);
                      setShowPaymentModal(false);
                      alert("Payment transaction captured successfully.");
                   }
                }}
                className="w-full py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold rounded-lg text-xs"
              >
                 Post Payment Ledger
              </button>
           </div>
        </div>
      )}

    </div>
  );
}
