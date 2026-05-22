import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            CrewAI Control Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enterprise multi-agent operations
          </p>
        </div>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
