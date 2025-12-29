'use client';

import { Account } from '@/types/accounting';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CoaForm } from './coa-form';

interface CoaListProps {
  accounts: Account[];
}

export function CoaList({ accounts }: CoaListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [formState, setFormState] = useState<{
    open: boolean;
    parent?: Account;
    editing?: Account;
  }>({ open: false });

  // Helper to build tree
  const buildTree = (list: Account[]) => {
    const map = new Map<string, Account & { children: any[] }>();
    const roots: any[] = [];

    // Initialize map
    list.forEach(acc => {
      map.set(acc.id, { ...acc, children: [] });
    });

    // Connect
    list.forEach(acc => {
      if (acc.parent_id && map.has(acc.parent_id)) {
        map.get(acc.parent_id)!.children.push(map.get(acc.id));
      } else {
        roots.push(map.get(acc.id));
      }
    });
    
    // Sort by Code
    const sortRecursive = (nodes: any[]) => {
        nodes.sort((a, b) => a.code.localeCompare(b.code));
        nodes.forEach(n => sortRecursive(n.children));
    };
    sortRecursive(roots);

    return roots;
  };

  const tree = buildTree(accounts);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Expand all by default for Level 0 & 1
  useState(() => {
     const initialExpanded: Record<string, boolean> = {};
     accounts.forEach(a => {
         if (!a.parent_id) initialExpanded[a.id] = true;
     });
     setExpanded(initialExpanded);
  });

  const Row = ({ node, level }: { node: any, level: number }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded[node.id];

    return (
      <>
        <TableRow className={cn(level === 0 ? "bg-slate-50 font-semibold" : "")}>
          <TableCell className="font-mono">
            <div 
              className="flex items-center gap-2" 
              style={{ paddingLeft: `${level * 24}px` }}
            >
              {hasChildren ? (
                <button 
                   onClick={() => toggleExpand(node.id)}
                   className="p-1 hover:bg-slate-200 rounded"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <div className="w-6" /> // Spacer
              )}
              {node.code}
            </div>
          </TableCell>
          <TableCell>{node.name}</TableCell>
          <TableCell>
            <Badge variant="outline" className="uppercase text-[10px]">
              {node.type}
            </Badge>
          </TableCell>
          <TableCell>
             <Badge variant={node.normal_balance === 'DEBIT' ? 'default' : 'secondary'} className="text-[10px]">
                {node.normal_balance}
             </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={node.is_active ? 'outline' : 'destructive'} className="text-[10px]">
                {node.is_active ? 'Aktif' : 'Non-Aktif'}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
             <div className="flex justify-end gap-2">
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-8 w-8"
                 onClick={() => setFormState({ open: true, parent: node })}
                 title="Tambah Sub-Akun"
               >
                 <Plus className="h-4 w-4" />
               </Button>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-8 w-8"
                 onClick={() => setFormState({ open: true, editing: node })}
                 title="Edit Akun"
               >
                 <Edit2 className="h-4 w-4" />
               </Button>
             </div>
          </TableCell>
        </TableRow>
        {isExpanded && node.children.map((child: any) => (
          <Row key={child.id} node={child} level={level + 1} />
        ))}
      </>
    );
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Kode Akun</TableHead>
              <TableHead>Nama Akun</TableHead>
              <TableHead className="w-[100px]">Tipe</TableHead>
              <TableHead className="w-[100px]">Saldo Normal</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tree.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    Belum ada akun. Silakan inisialisasi COA.
                 </TableCell>
               </TableRow>
            ) : (
               tree.map(node => (
                 <Row key={node.id} node={node} level={0} />
               ))
            )}
          </TableBody>
        </Table>
      </div>

      {formState.open && (
        <CoaForm 
          open={formState.open} 
          onOpenChange={(open) => setFormState(prev => ({ ...prev, open }))}
          parentAccount={formState.parent}
          existingAccount={formState.editing}
        />
      )}
    </>
  );
}
