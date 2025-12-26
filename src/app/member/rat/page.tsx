import { createClient } from '@/lib/supabase/server';
import { RatService } from '@/lib/services/rat-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Video } from 'lucide-react';

export default async function MemberRatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  const { data: member } = await supabase
    .from('member')
    .select('koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!member) return <div>Member not found</div>;

  const ratService = new RatService(supabase);
  const sessions = await ratService.getActiveSessions(member.koperasi_id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
       <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">RAT Online</h1>
        <p className="text-slate-500">
          Rapat Anggota Tahunan yang sedang atau akan berlangsung.
        </p>
      </div>

      {!sessions || sessions.length === 0 ? (
        <Alert>
            <AlertTitle>Tidak ada RAT Aktif</AlertTitle>
            <AlertDescription>Belum ada jadwal Rapat Anggota Tahunan saat ini.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
            {sessions.map((session: any) => (
                <div key={session.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">{session.title}</h2>
                            <p className="text-slate-500 mt-1">Tahun Buku {session.fiscal_year}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            session.status === 'ongoing' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                            {session.status === 'ongoing' ? 'Sedang Berlangsung' : 'Terjadwal'}
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(session.start_time).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</span>
                        </div>
                        {session.location && (
                            <div className="flex items-center gap-2 text-slate-600">
                                <MapPin className="h-4 w-4" />
                                <span>{session.location}</span>
                            </div>
                        )}
                        {session.meeting_link && (
                            <div className="flex items-center gap-2 text-slate-600">
                                <Video className="h-4 w-4" />
                                <span>Rapat Online via Zoom/Meet</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <Link href={`/member/rat/${session.id}`} prefetch={false}>
                            <Button>
                                {session.status === 'ongoing' ? 'Masuk Ruang Rapat' : 'Lihat Detail'}
                            </Button>
                        </Link>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
