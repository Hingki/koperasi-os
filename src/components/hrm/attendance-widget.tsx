'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { checkInAttendance, checkOutAttendance } from '@/lib/actions/hrm';
import { Loader2, MapPin } from 'lucide-react';

export function AttendanceWidget({ 
    attendanceToday 
}: { 
    attendanceToday: any // null if not checked in, object if checked in
}) {
    const [loading, setLoading] = useState(false);

    async function handleCheckIn() {
        setLoading(true);
        // Optional: Get geolocation
        let lat, long;
        if (navigator.geolocation) {
            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                lat = pos.coords.latitude;
                long = pos.coords.longitude;
            } catch (e) {
                console.log('Location access denied');
            }
        }
        
        const res = await checkInAttendance(lat, long);
        setLoading(false);
        if (res?.error) alert(res.error);
    }

    async function handleCheckOut() {
        if (!attendanceToday) return;
        setLoading(true);
        const res = await checkOutAttendance(attendanceToday.id);
        setLoading(false);
        if (res?.error) alert(res.error);
    }

    if (attendanceToday && attendanceToday.check_out) {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardHeader>
                    <CardTitle className="text-green-800">Kehadiran Selesai</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-green-700">Anda sudah check-out hari ini.</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                        Masuk: {new Date(attendanceToday.check_in).toLocaleTimeString()} <br/>
                        Keluar: {new Date(attendanceToday.check_out).toLocaleTimeString()}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (attendanceToday) {
        return (
            <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-blue-800">Sedang Bertugas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center text-sm text-blue-700 mb-4">
                        <MapPin className="h-4 w-4 mr-2" />
                        Check-in: {new Date(attendanceToday.check_in).toLocaleTimeString()}
                    </div>
                    <Button onClick={handleCheckOut} disabled={loading} variant="destructive" className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Check Out
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Absensi Harian</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    Catat kehadiran anda hari ini. Pastikan GPS aktif jika diperlukan.
                </p>
                <Button onClick={handleCheckIn} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Check In
                </Button>
            </CardContent>
        </Card>
    );
}
