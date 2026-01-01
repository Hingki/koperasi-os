'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { simulateRetailLock, simulatePpobLock } from '@/app/actions/simulator';
import { formatCurrency } from '@/lib/utils';
import { ArrowRight, Calculator } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SimulatorPage() {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>('cash');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSimulateRetail = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await simulateRetailLock(amount, method as any);
      setResult(data);
    } catch (error: any) {
      toast({
        title: "Simulation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePpob = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await simulatePpobLock(amount, 'dummy-savings-id');
      setResult(data);
    } catch (error: any) {
      toast({
        title: "Simulation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Audit Simulator</h2>
        <p className="text-muted-foreground">
          Simulasi jurnal akuntansi tanpa menyimpan data ke database (Safety Layer).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Parameter Simulasi</CardTitle>
            <CardDescription>Tentukan parameter transaksi</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="retail" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="retail">Retail POS</TabsTrigger>
                <TabsTrigger value="ppob">PPOB</TabsTrigger>
              </TabsList>
              
              <TabsContent value="retail" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nominal Transaksi</label>
                  <Input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Metode Pembayaran</label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tunai (Cash)</SelectItem>
                      <SelectItem value="transfer">Transfer Bank</SelectItem>
                      <SelectItem value="savings_balance">Saldo Simpanan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleSimulateRetail} disabled={loading || amount <= 0}>
                  {loading ? 'Simulating...' : 'Simulate Ledger Intent'}
                </Button>
              </TabsContent>

              <TabsContent value="ppob" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Harga Modal (COGS)</label>
                  <Input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min={0}
                  />
                </div>
                <div className="text-sm text-muted-foreground bg-slate-100 p-3 rounded">
                  Note: PPOB selalu menggunakan Saldo Simpanan anggota.
                </div>
                <Button className="w-full" onClick={handleSimulatePpob} disabled={loading || amount <= 0}>
                  {loading ? 'Simulating...' : 'Simulate Ledger Intent'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Result Section */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Hasil Simulasi (Ledger Intent)</CardTitle>
            <CardDescription>Preview Jurnal yang akan terbentuk</CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground border-2 border-dashed rounded-lg">
                <Calculator className="h-10 w-10 mb-2 opacity-20" />
                <p>Run simulation to see results</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <div className="font-semibold text-lg mb-1">{result.description}</div>
                  <div className="text-xs text-muted-foreground font-mono mb-4">
                    Ref: {result.reference_id} | Type: {result.business_unit}
                  </div>
                  
                  <div className="space-y-2">
                    {result.lines.map((line: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                        <div className="flex flex-col">
                           <span className="font-medium">Account ID: {line.account_id.substring(0,8)}...</span>
                           <span className="text-xs text-muted-foreground">{line.description}</span>
                        </div>
                        <div className="flex gap-4 font-mono">
                           <div className="text-right">
                             <div className="text-xs text-muted-foreground">Debit</div>
                             <div className={line.debit > 0 ? "text-green-600 font-bold" : "text-slate-300"}>
                               {formatCurrency(line.debit)}
                             </div>
                           </div>
                           <div className="text-right">
                             <div className="text-xs text-muted-foreground">Credit</div>
                             <div className={line.credit > 0 ? "text-red-600 font-bold" : "text-slate-300"}>
                               {formatCurrency(line.credit)}
                             </div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-2 border-t flex justify-between font-bold text-sm">
                    <span>TOTAL</span>
                    <div className="flex gap-4">
                       <span className="text-green-700">
                         {formatCurrency(result.lines.reduce((s:number, l:any) => s + l.debit, 0))}
                       </span>
                       <span className="text-red-700">
                         {formatCurrency(result.lines.reduce((s:number, l:any) => s + l.credit, 0))}
                       </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 text-blue-800 p-3 rounded text-xs">
                  <strong>Verification:</strong> Double-entry balance is enforced.
                  {Math.abs(result.lines.reduce((s:number, l:any) => s + l.debit - l.credit, 0)) < 0.01 
                    ? " BALANCED ✅" 
                    : " UNBALANCED ❌"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
