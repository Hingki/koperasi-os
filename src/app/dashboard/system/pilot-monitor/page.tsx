import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Pilot Monitor - System Observability',
};

export default async function PilotMonitorPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-8">Unauthorized</div>;
  
  // Basic Role Check
  // In a real scenario, check for admin/pengurus role specifically
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayISO = today.toISOString();

  // 1. Total Transactions Today
  const { count: totalToday } = await supabase
    .from('system_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);

  // 2. Errors Today
  const { count: errorsToday } = await supabase
    .from('system_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO)
    .eq('status', 'FAILURE');

  // 3. Recent Logs
  const { data: recentLogs } = await supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
     <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">Pilot Observability Monitor</h1>
            <div className="text-sm text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString('id-ID')}
            </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Aktivitas Hari Ini</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalToday || 0}</div>
                    <p className="text-xs text-muted-foreground">Log entry count since 00:00</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Error / Gagal</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${(errorsToday || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {errorsToday || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Failed transactions requiring attention</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Log Aktivitas Terkini (Real-time)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Waktu</TableHead>
                                <TableHead>Tipe</TableHead>
                                <TableHead>Detail</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>User ID</TableHead>
                                <TableHead className="max-w-[300px]">Metadata</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentLogs?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Belum ada data log.</TableCell>
                                </TableRow>
                            )}
                            {recentLogs?.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs">
                                        {new Date(log.created_at).toLocaleString('id-ID')}
                                    </TableCell>
                                    <TableCell className="font-medium">{log.action_type}</TableCell>
                                    <TableCell>{log.action_detail}</TableCell>
                                    <TableCell>
                                        <Badge variant={log.status === 'SUCCESS' ? 'default' : 'destructive'}>
                                            {log.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {log.user_id ? log.user_id.substring(0, 8) + '...' : '-'}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[300px] truncate" title={JSON.stringify(log.metadata, null, 2)}>
                                        {JSON.stringify(log.metadata)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
     </div>
  );
}
