import { createClient } from '@/lib/supabase/server';
import { RatService } from '@/lib/services/rat-service';
import { RatManager } from '@/components/rat/rat-manager';
import { notFound } from 'next/navigation';

export default async function AdminRatDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  const ratService = new RatService(supabase);
  
  let session;
  try {
    session = await ratService.getSession(id);
  } catch (e) {
    return notFound();
  }

  return (
    <div className="max-w-6xl mx-auto">
      <RatManager session={session} />
    </div>
  );
}
