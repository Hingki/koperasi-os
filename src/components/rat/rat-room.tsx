'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2, Video, FileText, Vote } from 'lucide-react';

interface RatRoomProps {
  session: any;
  memberId: string;
  initialAttendance: any;
  initialVotes: Record<string, string>; // agendaId -> voteOption
}

export function RatRoom({ session, memberId, initialAttendance, initialVotes }: RatRoomProps) {
  const [attendance, setAttendance] = useState(initialAttendance);
  const [votes, setVotes] = useState(initialVotes);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rat_attendance')
        .upsert({
            rat_session_id: session.id,
            member_id: memberId,
            status: 'present',
            check_in_time: new Date(),
        })
        .select()
        .single();

      if (error) throw error;
      setAttendance(data);
      toast({
        title: 'Check-in Berhasil',
        description: 'Kehadiran Anda telah tercatat.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal melakukan check-in.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (agendaId: string, option: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('rat_votes')
        .insert({
            rat_agenda_id: agendaId,
            member_id: memberId,
            vote_option: option
        });

      if (error) throw error;

      setVotes(prev => ({ ...prev, [agendaId]: option }));
      toast({
        title: 'Suara Masuk',
        description: 'Pilihan Anda telah disimpan.',
      });
    } catch (error) {
      toast({
        title: 'Gagal Voting',
        description: 'Terjadi kesalahan saat menyimpan suara Anda.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{session.title}</h1>
          <p className="text-slate-500">Status: {session.status.toUpperCase()}</p>
        </div>
        
        {attendance?.status === 'present' ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 px-4 py-2 text-base">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Hadir
          </Badge>
        ) : (
          <Button 
            onClick={handleCheckIn} 
            disabled={loading || session.status !== 'ongoing'}
            size="lg"
          >
            {loading ? 'Processing...' : 'Konfirmasi Kehadiran (Check-in)'}
          </Button>
        )}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="agenda" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agenda">Agenda & Voting</TabsTrigger>
          <TabsTrigger value="documents">Dokumen</TabsTrigger>
          <TabsTrigger value="meeting">Ruang Rapat</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="space-y-4 mt-4">
          {session.rat_agendas?.sort((a: any, b: any) => a.order_index - b.order_index).map((agenda: any) => (
            <Card key={agenda.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Agenda #{agenda.order_index + 1}: {agenda.title}</CardTitle>
                    <CardDescription>{agenda.description}</CardDescription>
                  </div>
                  <Badge variant={agenda.status === 'active' ? 'default' : 'secondary'}>
                    {agenda.status === 'active' ? 'Sedang Dibahas' : agenda.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {agenda.is_voting_required && (
                  <div className="mt-2 p-4 bg-slate-50 rounded-lg border">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Vote className="w-4 h-4" />
                      Voting Diperlukan
                    </h4>
                    
                    {votes[agenda.id] ? (
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertTitle>Anda sudah memilih: {votes[agenda.id]}</AlertTitle>
                        <AlertDescription>Terima kasih atas partisipasi Anda.</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {agenda.voting_options?.map((option: string) => (
                          <Button 
                            key={option}
                            onClick={() => handleVote(agenda.id, option)}
                            disabled={loading || agenda.status !== 'active'}
                            variant="outline"
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    {agenda.status !== 'active' && !votes[agenda.id] && (
                      <p className="text-sm text-slate-500 mt-2">Voting belum dibuka atau sudah ditutup.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dokumen Rapat</CardTitle>
              <CardDescription>Unduh materi rapat di sini.</CardDescription>
            </CardHeader>
            <CardContent>
              {session.documents && session.documents.length > 0 ? (
                <div className="space-y-2">
                  {session.documents.map((doc: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <span>{doc.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">Download</a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">Tidak ada dokumen lampiran.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meeting" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Video Conference</CardTitle>
              <CardDescription>Bergabung ke pertemuan virtual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {session.meeting_link ? (
                <div className="text-center py-8">
                   <Video className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                   <h3 className="text-xl font-medium mb-2">Rapat Sedang Berlangsung</h3>
                   <p className="text-slate-500 mb-6">Silakan klik tombol di bawah untuk bergabung via Zoom/Meet.</p>
                   <Button size="lg" asChild>
                     <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                       Gabung Rapat Sekarang
                     </a>
                   </Button>
                </div>
              ) : (
                <Alert>
                  <AlertTitle>Link Belum Tersedia</AlertTitle>
                  <AlertDescription>Link video conference akan muncul saat rapat dimulai.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
