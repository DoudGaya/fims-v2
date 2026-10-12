'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, CreditCard, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function MockCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference') || `mock_ref_${Date.now()}`;
  const amount = parseInt(searchParams.get('amount') || '25000000', 10);
  const [processing, setProcessing] = useState(false);

  const handleSimulateSuccess = () => {
    setProcessing(true);
    // Redirect to verification route
    router.push(`/portal/billing/verify?reference=${encodeURIComponent(reference)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#013358] p-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-3">
            <CreditCard className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold">Paystack Sandbox Simulator</h1>
          <p className="text-xs text-white/70 mt-1">Simulated B2B Payment Gateway for CCSA FIMS</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Transaction Reference</span>
              <span className="font-mono text-slate-700">{reference}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
              <span className="text-sm font-semibold text-slate-700">Total Due</span>
              <span className="text-2xl font-bold text-[#013358]">
                ₦{(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-600 bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
            <div className="flex items-center gap-2 font-medium text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Sandbox Test Mode Active</span>
            </div>
            <p className="text-slate-600">
              Clicking below simulates a successful bank card / transfer confirmation from Paystack, settles the invoice in the database, and activates your API quota.
            </p>
          </div>

          <Button
            onClick={handleSimulateSuccess}
            disabled={processing}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 text-sm shadow-md"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                Confirm & Activate Subscription
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading simulator...</div>}>
      <MockCheckoutContent />
    </Suspense>
  );
}
