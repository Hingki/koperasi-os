'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from '@/components/ui/use-toast';
import { RatService, RatStatus } from '@/lib/services/rat-service';
import { useRouter } from 'next/navigation';
import { Plus, Play, Square, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RatManagerProps {
  session: any;
}

export function RatManager({ session: initialSession }: RatManagerProps) {
  const [session, setSession] = useState(initialSession);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();
  const ratService = new RatService(supabase);
  
  // Agenda State
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaDesc, setNewAgendaDesc] = useState('');
  const [isVotingRequired, setIsVotingRequired] = useState(false);

  const handleStatusChange = async (status: RatStatus) => {
    setLoading(true);
    try {
      const updated = await ratService.updateSession(session.id, { status });
      setSession(updated);
      toast({ title: 'Status Diperbarui', description: `Status RAT sekarang: ${status}` });
      router.refresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal update status', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgenda = async () => {
    if (!newAgendaTitle) return;
    setLoading(true);
    try {
      const newAgenda = await ratService.addAgenda({
        rat_session_id: session.id,
        title: newAgendaTitle,
        description: newAgendaDesc,
        order_index: (session.rat_agendas?.length || 0),
        is_voting_required: isVotingRequired,
        voting_options: isVotingRequired ? ["Setuju", "Tidak Setuju", "Abstain"] : []
      });
      
      // Refresh local state (simplified)
      const updatedSession = await ratService.getSession(session.id);
      setSession(updatedSession);
      
      setNewAgendaTitle('');
      setNewAgendaDesc('');
      setIsVotingRequired(false);
      toast({ title: 'Agenda Ditambahkan' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menambah agenda', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAgenda = async (agendaId: string) => {
    try {
        // Deactivate others? Maybe not required strictly, but usually one active at a time.
        // For now just activate target.
        await ratService.updateAgendaStatus(agendaId, 'active');
        const updatedSession = await ratService.getSession(session.id);
        setSession(updatedSession);
        toast({ title: 'Agenda Aktif' });
    } catch (error) {
        toast({ title: 'Error', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">{session.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{session.status.toUpperCase()}</Badge>
            <span className="text-sm text-slate-500">
                {new Date(session.start_time).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
            {session.status === 'scheduled' && (
                <Button onClick={() => handleStatusChange('ongoing')} className="bg-green-600 hover:bg-green-700">
                    <Play className="w-4 h-4 mr-2" /> Mulai RAT
                </Button>
            )}
            {session.status === 'ongoing' && (
                <Button onClick={() => handleStatusChange('completed')} variant="secondary">
                    <Square className="w-4 h-4 mr-2" /> Selesai
                </Button>
            )}
        </div>
      </div>

      <Tabs defaultValue="agendas">
        <TabsList>
            <TabsTrigger value="agendas">Agenda & Voting</TabsTrigger>
            <TabsTrigger value="attendance">Kehadiran ({session.rat_attendance?.[0]?.count || 0})</TabsTrigger>
            <TabsTrigger value="settings">Pengaturan</TabsTrigger>
        </TabsList>

        <TabsContent value="agendas" className="space-y-4 mt-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Daftar Agenda</CardTitle>
                        <CardDescription>Atur urutan acara dan sesi voting.</CardDescription>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Tambah Agenda</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Tambah Agenda Baru</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Judul Agenda</Label>
                                    <Input value={newAgendaTitle} onChange={e => setNewAgendaTitle(e.target.value)} placeholder="Contoh: Pembacaan Laporan Pengawas" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Deskripsi</Label>
                                    <Input value={newAgendaDesc} onChange={e => setNewAgendaDesc(e.target.value)} placeholder="Keterangan tambahan..." />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="checkbox" 
                                        id="voting" 
                                        checked={isVotingRequired} 
                                        onChange={e => setIsVotingRequired(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300" 
                                    />
                                    <Label htmlFor="voting">Perlu Voting?</Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddAgenda} disabled={loading}>Simpan</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Urutan</TableHead>
                                <TableHead>Agenda</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Voting</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {session.rat_agendas?.sort((a: any, b: any) => a.order_index - b.order_index).map((agenda: any, idx: number) => (
                                <TableRow key={agenda.id}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{agenda.title}</div>
                                        <div className="text-xs text-slate-500">{agenda.description}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={agenda.status === 'active' ? 'default' : 'secondary'}>
                                            {agenda.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{agenda.is_voting_required ? 'Ya' : 'Tidak'}</TableCell>
                                    <TableCell className="text-right">
                                        {agenda.status === 'pending' && session.status === 'ongoing' && (
                                            <Button size="sm" variant="outline" onClick={() => handleActivateAgenda(agenda.id)}>
                                                Mulai Bahas
                                            </Button>
                                        )}
                                        {agenda.status === 'active' && (
                                             <Button size="sm" variant="secondary" onClick={() => ratService.updateAgendaStatus(agenda.id, 'completed').then(() => router.refresh())}>
                                                Selesai
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
             <Card>
                <CardHeader>
                    <CardTitle>Data Kehadiran</CardTitle>
                    <CardDescription>Anggota yang telah melakukan check-in.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-slate-500 mb-4">
                        Total Hadir: {session.rat_attendance?.[0]?.count || 0} Anggota
                    </div>
                    {/* Ideally fetch detailed list here via separate query if list is long */}
                    <p className="italic text-slate-400">Detail daftar hadir dapat dilihat di laporan.</p>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Pengaturan Sesi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Link Meeting</Label>
                            <Input defaultValue={session.meeting_link} readOnly className="bg-slate-50" />
                        </div>
                        <div>
                            <Label>Lokasi</Label>
                            <Input defaultValue={session.location} readOnly className="bg-slate-50" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
