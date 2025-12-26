import { createClient } from '@/lib/supabase/server';
import { RatService } from '@/lib/services/rat-service';
import { RatRoom } from '@/components/rat/rat-room';
import { notFound } from 'next/navigation';

export default async function RatSessionPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  const { data: member } = await supabase
    .from('member')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!member) return <div>Member not found</div>;

  const ratService = new RatService(supabase);
  
  let session;
  try {
    session = await ratService.getSession(id);
  } catch (e) {
    return notFound();
  }

  // Get initial attendance
  const { data: attendance } = await supabase
    .from('rat_attendance')
    .select('*')
    .eq('rat_session_id', session.id)
    .eq('member_id', member.id)
    .single();

  // Get initial votes
  const { data: votes } = await supabase
    .from('rat_votes')
    .select('rat_agenda_id, vote_option')
    .eq('member_id', member.id)
    .in('rat_agenda_id', session.rat_agendas.map((a: any) => a.id));

  const initialVotes = votes?.reduce((acc: any, curr: any) => {
    acc[curr.rat_agenda_id] = curr.vote_option;
    return acc;
  }, {}) || {};

  return (
    <div className="max-w-5xl mx-auto p-6">
      <RatRoom 
        session={session} 
        memberId={member.id} 
        initialAttendance={attendance} 
        initialVotes={initialVotes}
      />
    </div>
  );
}
