'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Account } from '@/types/accounting';
import { useToast } from '@/components/ui/use-toast';
import { createManualJournalAction } from '@/lib/actions/journal';

interface JournalFormProps {
  accounts: Account[];
  onSuccess?: () => void;
}

interface JournalLineInput {
  account_id: string;
  debit: string; // string for better input handling
  credit: string;
}

export function JournalForm({ accounts, onSuccess }: JournalFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [businessUnit, setBusinessUnit] = useState('UMUM');
  const [lines, setLines] = useState<JournalLineInput[]>([
    { account_id: '', debit: '0', credit: '0' },
    { account_id: '', debit: '0', credit: '0' },
  ]);

  const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const addLine = () => {
    setLines([...lines, { account_id: '', debit: '0', credit: '0' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    const newLines = [...lines];
    newLines.splice(index, 1);
    setLines(newLines);
  };

  const updateLine = (index: number, field: keyof JournalLineInput, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      toast({
        title: "Unbalanced Journal",
        description: `Debit (${totalDebit}) must equal Credit (${totalCredit})`,
        variant: "destructive"
      });
      return;
    }

    // Validate accounts selected
    if (lines.some(l => !l.account_id)) {
      toast({ title: "Validation Error", description: "All lines must have an account selected", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createManualJournalAction({
        transaction_date: date,
        description,
        business_unit: businessUnit,
        lines: lines.map(l => ({
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0
        }))
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast({ title: "Success", description: "Journal entry posted successfully" });
      
      // Reset form
      setDescription('');
      setLines([
        { account_id: '', debit: '0', credit: '0' },
        { account_id: '', debit: '0', credit: '0' }
      ]);
      if (onSuccess) onSuccess();

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 border rounded-lg p-6 bg-card">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Transaction Date</Label>
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            required 
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Description</Label>
          <Input 
            placeholder="e.g. Opening Balance Adjustment" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label>Business Unit</Label>
          <Select value={businessUnit} onValueChange={setBusinessUnit}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UMUM">UMUM</SelectItem>
              <SelectItem value="SIMPAN_PINJAM">SIMPAN PINJAM</SelectItem>
              <SelectItem value="RETAIL">RETAIL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Journal Lines</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="w-4 h-4 mr-2" /> Add Line
          </Button>
        </div>

        <div className="border rounded-md divide-y">
          <div className="grid grid-cols-12 gap-2 p-2 bg-muted/50 text-xs font-medium">
            <div className="col-span-5">Account</div>
            <div className="col-span-3 text-right">Debit</div>
            <div className="col-span-3 text-right">Credit</div>
            <div className="col-span-1"></div>
          </div>
          
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 p-2 items-center">
              <div className="col-span-5">
                <Select 
                  value={line.account_id} 
                  onValueChange={(val) => updateLine(index, 'account_id', val)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Input 
                  type="number" 
                  className="h-8 text-right font-mono"
                  value={line.debit}
                  onChange={(e) => updateLine(index, 'debit', e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="col-span-3">
                <Input 
                  type="number" 
                  className="h-8 text-right font-mono"
                  value={line.credit}
                  onChange={(e) => updateLine(index, 'credit', e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="col-span-1 text-center">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeLine(index)}
                  disabled={lines.length <= 2}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end items-center gap-6 p-4 bg-muted/20 rounded-lg">
          <div className="text-sm">
            <span className="text-muted-foreground mr-2">Total Debit:</span>
            <span className="font-mono font-bold">{new Intl.NumberFormat('id-ID').format(totalDebit)}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground mr-2">Total Credit:</span>
            <span className={`font-mono font-bold ${!isBalanced ? 'text-destructive' : ''}`}>
              {new Intl.NumberFormat('id-ID').format(totalCredit)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !isBalanced} className="w-[150px]">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Post Journal
        </Button>
      </div>
    </form>
  );
}
