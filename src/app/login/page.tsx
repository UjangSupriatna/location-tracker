'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Navigation, Shield } from 'lucide-react';
import { signIn } from 'next-auth/react';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn('google', { callbackUrl });
  };

  return (
    <div className="min-h-screen cyber-bg scanlines flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl cyber-card mb-6">
            <Navigation className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="font-cyber text-3xl md:text-4xl font-bold neon-cyan mb-2">
            LOCATION TRACKER
          </h1>
          <p className="text-cyan-400/60 text-sm">
            CONSENT-BASED GPS TRACKING
          </p>
        </div>

        {/* Login Card */}
        <div className="cyber-card rounded-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-cyan-300 mb-2">
              Masuk ke Akun
            </h2>
            <p className="text-cyan-400/50 text-sm">
              Gunakan akun Google untuk melanjutkan
            </p>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full cyber-btn py-6 text-lg font-cyber flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                MASUK DENGAN GOOGLE
              </>
            )}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-cyan-400/40 text-xs">
              Dengan masuk, Anda menyetujui syarat dan ketentuan
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-cyan-400/40 text-xs flex items-center justify-center gap-2">
            <Shield className="w-3 h-3" />
            CONSENT-BASED LOCATION TRACKING
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen cyber-bg scanlines flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
