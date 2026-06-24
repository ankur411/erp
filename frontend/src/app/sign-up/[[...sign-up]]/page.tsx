import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-black font-extrabold text-sm tracking-wider">
            SE
          </div>
          <span className="text-xl font-bold tracking-tight">SupplierERP</span>
        </div>
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-sm",
              card: "border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900"
            }
          }}
        />
      </div>
    </div>
  );
}
