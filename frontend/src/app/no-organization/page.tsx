"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SafeSignOutButton } from "@/components/SafeSignOutButton";
import { Building, Mail, Phone, Users, FileText, CheckCircle2, AlertCircle, ArrowLeft, LogOut } from "lucide-react";

export default function NoOrganizationPage() {
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [industry, setIndustry] = useState("Manufacturing");
  const [companySize, setCompanySize] = useState("11-50");
  const [notes, setNotes] = useState("");

  const apiHost = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fetch logged in user profile on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        const token = localStorage.getItem("auth_token") || document.cookie.match(/auth_token=([^;]+)/)?.[1];
        if (!token) {
          router.replace("/sign-in");
          return;
        }

        const response = await fetch(`${apiHost}/api/v1/system/auth/me`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          router.replace("/sign-in");
          return;
        }

        const data = await response.json();
        setUser(data);
        setContactPerson(data.name || "");
        setBusinessEmail(data.email || "");
      } catch (err) {
        console.error("Failed to fetch user in onboarding:", err);
      } finally {
        setIsLoaded(true);
      }
    }

    fetchUser();
  }, [router, apiHost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      company_name: companyName,
      contact_person: contactPerson,
      business_email: businessEmail,
      phone_number: phoneNumber,
      industry: industry,
      company_size: companySize,
      notes: notes,
    };

    try {
      const response = await fetch(`${apiHost}/api/v1/system/organization-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to submit request" }));
        throw new Error(errorData.detail || "Something went wrong. Please try again.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting your request.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="relative h-12 w-12">
          <div className="h-12 w-12 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 013 12c0 2.784.952 5.346 2.532 7.374M12 21a11.955 11.955 0 006.402-1.874M21 12c0-2.784-.952-5.346-2.532-7.374" />
            </svg>
          </div>
          <div className="absolute -inset-1 rounded-[14px] border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Loading details…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl shadow-inner mb-4">
          <Building className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Supplier<span className="text-blue-600 dark:text-blue-500">ERP</span>
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Organization Onboarding & Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white dark:bg-zinc-900 py-8 px-6 shadow-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 transition-all duration-300">
          {!showForm ? (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  You're not part of any organization yet.
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  To access SupplierERP, either:
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-5 rounded-xl text-left border border-zinc-100 dark:border-zinc-800 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    Ask your organization's administrator to invite you to join their team.
                  </p>
                </div>
                <div className="relative py-2 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
                  </div>
                  <span className="relative px-3 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase">
                    OR
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    Register your company by requesting a new organization.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => setShowForm(true)}
                  className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  Request New Organization
                </button>
                <SafeSignOutButton className="inline-flex justify-center items-center px-4 py-3 border border-zinc-300 dark:border-zinc-700 text-sm font-semibold rounded-xl text-zinc-700 dark:text-zinc-300 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </SafeSignOutButton>
              </div>
            </div>
          ) : success ? (
            <div className="text-center py-6 space-y-6">
              <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full mb-2">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Request Submitted!
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                  Your request to register <strong className="text-zinc-900 dark:text-zinc-100">{companyName}</strong> has been successfully submitted and is pending administrative approval.
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-150 dark:border-zinc-800">
                An email notification will be sent to <span className="font-semibold text-zinc-700 dark:text-zinc-300">{businessEmail}</span> once our administrators review and approve your request.
              </div>
              <div className="flex justify-center">
                <SafeSignOutButton className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow transition-all cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </SafeSignOutButton>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-500" />
                  Company Registration Request
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="inline-flex items-center text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <label htmlFor="companyName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Company Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="companyName"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="block w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="contactPerson" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Contact Person
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="contactPerson"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="businessEmail" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Business Email
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-zinc-400" />
                    </div>
                    <input
                      type="email"
                      id="businessEmail"
                      required
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Phone Number
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-zinc-400" />
                    </div>
                    <input
                      type="tel"
                      id="phoneNumber"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="block w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="industry" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Industry
                  </label>
                  <div className="mt-1">
                    <select
                      id="industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm outline-none"
                    >
                      <option>Manufacturing</option>
                      <option>Logistics</option>
                      <option>Wholesale</option>
                      <option>Retail</option>
                      <option>Technology</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="companySize" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Company Size
                  </label>
                  <div className="mt-1">
                    <select
                      id="companySize"
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm outline-none"
                    >
                      <option>1-10</option>
                      <option>11-50</option>
                      <option>51-100</option>
                      <option>101-500</option>
                      <option>500+</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Additional Notes (Optional)
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add details about your products, warehouses, or system requirements."
                      className="block w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 text-sm font-medium rounded-xl text-zinc-700 dark:text-zinc-300 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 transition duration-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-55 transition duration-150 cursor-pointer"
                >
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
