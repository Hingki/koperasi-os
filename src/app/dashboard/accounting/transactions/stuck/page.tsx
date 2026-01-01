'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getStuckTransactions, runAutoReconciliation } from '@/app/actions/monitoring';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import Link from 'next/link';

export default function StuckTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getStuckTransactions(30); // 30 minutes threshold
      setTransactions(data);
    } catch (error: any) {
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleReconcile() {
    if (!confirm('Are you sure you want to run auto-reconciliation for ALL stuck transactions? This will reverse or settle them based on their state.')) return;
    
    setProcessing(true);
    try {
      const res = await runAutoReconciliation(30);
      setResults(res);
      toast({
        title: 'Reconciliation Complete',
        description: `Processed ${res.length} transactions.`,
      });
      loadData(); // Refresh list
    } catch (error: any) {
      toast({
        title: 'Reconciliation Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-8 w-8" />
            Stuck Transactions
          </h2>
          <p className="text-muted-foreground">
            Transactions stuck in 'journal_locked' or 'fulfilled' state for more than 30 minutes.
          </p>
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {results && (
        <Alert className="bg-slate-50 border-slate-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Reconciliation Results</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
              {results.map((r, i) => (
                <li key={i} className={r.status === 'failed' ? 'text-red-600' : 'text-green-600'}>
                  {r.id.substring(0, 8)}... : {r.status} ({r.reason || r.error})
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {transactions.length === 0 && !loading ? (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-green-800">System Healthy</h3>
            <p className="text-green-700">No stuck transactions detected.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Detected Issues ({transactions.length})</CardTitle>
              {transactions.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={handleReconcile}
                  disabled={processing}
                >
                  {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Auto-Reconcile All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((trx) => (
                <div key={trx.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{trx.id}</span>
                      <Badge variant="outline">{trx.type}</Badge>
                      <Badge variant="destructive">{trx.status}</Badge>
                    </div>
                    <div className="text-sm text-slate-500">
                      Created: {new Date(trx.created_at).toLocaleString('id-ID')}
                    </div>
                    <div className="text-sm text-slate-500">
                      Amount: Rp {trx.amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/accounting/audit/inspector?id=${trx.id}`}>
                      <Button size="sm" variant="ghost">
                        <Search className="h-4 w-4 mr-1" />
                        Inspect
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
