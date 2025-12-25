'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Megaphone, X } from 'lucide-react';
import { getActiveAnnouncementsAction } from '@/lib/actions/announcement';

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'announcement' | 'promo';
    image_url?: string;
}

export function AnnouncementBanner() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            const { success, data } = await getActiveAnnouncementsAction();
            if (success && data) {
                setAnnouncements(data);
            }
        };
        fetchAnnouncements();
    }, []);

    if (!isVisible || announcements.length === 0) return null;

    // Filter for promos vs text announcements
    const promos = announcements.filter(a => a.type === 'promo');
    const alerts = announcements.filter(a => a.type === 'announcement');

    return (
        <div className="space-y-4 mb-6">
            {/* Promos - Visual Banners */}
            {promos.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    {promos.map((promo) => (
                        <div key={promo.id} className="relative overflow-hidden rounded-lg border bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                            <div className="p-6">
                                <h3 className="text-lg font-bold mb-2">{promo.title}</h3>
                                <div className="text-blue-100 text-sm mb-4" dangerouslySetInnerHTML={{ __html: promo.content || '' }} />
                                {promo.image_url && (
                                    <img 
                                        src={promo.image_url} 
                                        alt={promo.title} 
                                        className="w-full h-40 object-cover rounded-md mt-2"
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Announcements - Alert Style */}
            {alerts.length > 0 && (
                <Card className="bg-yellow-50 border-yellow-200">
                    <div className="p-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-yellow-100 rounded-full">
                                <Megaphone className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-yellow-900">Pengumuman Penting</h3>
                                <div className="mt-2 space-y-2">
                                    {alerts.map((alert) => (
                                        <div key={alert.id} className="border-b border-yellow-200 last:border-0 pb-2 last:pb-0">
                                            <p className="font-medium text-yellow-800">{alert.title}</p>
                                            <p className="text-sm text-yellow-700">{alert.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => setIsVisible(false)} className="text-yellow-500 hover:text-yellow-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
