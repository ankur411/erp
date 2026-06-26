import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 mb-2">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 013 12c0 2.784.952 5.346 2.532 7.374M12 21a11.955 11.955 0 006.402-1.874M21 12c0-2.784-.952-5.346-2.532-7.374" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Platform Control Center</h1>
          <p className="text-sm text-slate-400">Administrator access only</p>
        </div>

        {/* Clerk Sign-In Widget */}
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl",
                headerTitle: "text-white",
                headerSubtitle: "text-slate-400",
                socialButtonsBlockButton: "bg-slate-800 border-slate-700 text-white hover:bg-slate-700",
                dividerLine: "bg-slate-700",
                dividerText: "text-slate-500",
                formFieldLabel: "text-slate-300",
                formFieldInput: "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                footerActionLink: "text-blue-400 hover:text-blue-300",
                identityPreviewText: "text-white",
                identityPreviewEditButton: "text-blue-400",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
