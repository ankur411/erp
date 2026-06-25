"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Mail,
  ShieldCheck,
  Database,
  Globe,
  Save,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<"general" | "email" | "security" | "backups">("general");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [settings, setSettings] = useState({
    siteName: "Supplier ERP Platform Admin",
    supportEmail: "support@suppliererp.com",
    apiEndpoint: "https://api.suppliererp.com/api/v1",
    smtpHost: "smtp.resend.com",
    smtpPort: "587",
    smtpUser: "resend",
    smtpTls: true,
    sessionExpiry: 8, // hours
    passwordMinLength: 12,
    enforceMfa: true,
    backupInterval: "daily",
    backupKeepCount: 30,
    compressionLevel: "high"
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Platform Configuration</h1>
          <p className="text-xs text-slate-500 dark:text-slate-450">
            Configure system parameters, mail relays, IAM rules, and database snapshotting schedules.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-850 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400 rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
          <span>All platform modifications updated successfully. Changes applied to local instances.</span>
        </div>
      )}

      {/* Tabs and Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab("general")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
              activeTab === "general"
                ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-black"
                : "hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-450 hover:text-slate-700"
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>General Settings</span>
          </button>
          <button
            onClick={() => setActiveTab("email")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
              activeTab === "email"
                ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-black"
                : "hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-450 hover:text-slate-700"
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>SMTP & Mail Servers</span>
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
              activeTab === "security"
                ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-black"
                : "hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-450 hover:text-slate-700"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Security & IAM Policies</span>
          </button>
          <button
            onClick={() => setActiveTab("backups")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
              activeTab === "backups"
                ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-black"
                : "hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-450 hover:text-slate-700"
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Snapshot Backups</span>
          </button>
        </div>

        {/* Form Content Area */}
        <div className="md:col-span-3 bg-white dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm text-xs">
          
          <form onSubmit={handleSave} className="space-y-6">

            {activeTab === "general" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-850 pb-2">Global Parameters</h3>
                
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Portal Brand Name</label>
                  <input
                    type="text"
                    required
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">System Support Email</label>
                  <input
                    type="email"
                    required
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Live API Endpoint URL</label>
                  <input
                    type="text"
                    required
                    value={settings.apiEndpoint}
                    onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 font-semibold font-mono"
                  />
                </div>
              </div>
            )}

            {activeTab === "email" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-850 pb-2">SMTP Configuration</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">SMTP Server Host</label>
                    <input
                      type="text"
                      required
                      value={settings.smtpHost}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Port</label>
                    <input
                      type="text"
                      required
                      value={settings.smtpPort}
                      onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">SMTP Username</label>
                  <input
                    type="text"
                    required
                    value={settings.smtpUser}
                    onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>

                <div className="flex items-center gap-2.5 cursor-pointer select-none pt-2">
                  <input
                    type="checkbox"
                    id="smtpTls"
                    checked={settings.smtpTls}
                    onChange={(e) => setSettings({ ...settings, smtpTls: e.target.checked })}
                    className="h-4.5 w-4.5 rounded border border-slate-350 accent-blue-600"
                  />
                  <label htmlFor="smtpTls" className="font-bold cursor-pointer">Force TLS/SSL Encryption Connection</label>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-850 pb-2">IAM Policies</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Admin Session Lifetime (hrs)</label>
                    <input
                      type="number"
                      required
                      value={settings.sessionExpiry}
                      onChange={(e) => setSettings({ ...settings, sessionExpiry: Number(e.target.value) })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Min Password Length</label>
                    <input
                      type="number"
                      required
                      value={settings.passwordMinLength}
                      onChange={(e) => setSettings({ ...settings, passwordMinLength: Number(e.target.value) })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 cursor-pointer select-none pt-2">
                  <input
                    type="checkbox"
                    id="enforceMfa"
                    checked={settings.enforceMfa}
                    onChange={(e) => setSettings({ ...settings, enforceMfa: e.target.checked })}
                    className="h-4.5 w-4.5 rounded border border-slate-350 accent-blue-600"
                  />
                  <label htmlFor="enforceMfa" className="font-bold cursor-pointer">Enforce multi-factor verification for Platform Admins</label>
                </div>
              </div>
            )}

            {activeTab === "backups" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 dark:border-slate-850 pb-2">Snapshot Backup Policies</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Snapshot Frequency</label>
                    <select
                      value={settings.backupInterval}
                      onChange={(e) => setSettings({ ...settings, backupInterval: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 font-semibold"
                    >
                      <option value="daily">Daily Cron schedule</option>
                      <option value="weekly">Weekly Cron schedule</option>
                      <option value="monthly">Monthly Cron schedule</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-650 dark:text-slate-400">Max Snapshots Retained</label>
                    <input
                      type="number"
                      required
                      value={settings.backupKeepCount}
                      onChange={(e) => setSettings({ ...settings, backupKeepCount: Number(e.target.value) })}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-650 dark:text-slate-400">Database Encryption Gzip Compression</label>
                  <select
                    value={settings.compressionLevel}
                    onChange={(e) => setSettings({ ...settings, compressionLevel: e.target.value })}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-950 font-semibold"
                  >
                    <option value="none">No compression (Raw SQL)</option>
                    <option value="low">Low compression (Fast zip)</option>
                    <option value="high">High compression (Slow gzip)</option>
                  </select>
                </div>
              </div>
            )}

          </form>

        </div>

      </div>

    </div>
  );
}
