'use client';

import { updateTicketStatusAction } from '@/lib/actions/support';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

export function AdminTicketControls({ ticketId, currentStatus }: { ticketId: string, currentStatus: string }) {
    const [status, setStatus] = useState(currentStatus);
    const [isLoading, setIsLoading] = useState(false);

    const handleStatusChange = async (value: string) => {
        setStatus(value);
        setIsLoading(true);
        const { success, error } = await updateTicketStatusAction(ticketId, value);
        setIsLoading(false);
        
        if (success) {
            toast.success("Status tiket diperbarui");
        } else {
            toast.error("Gagal memperbarui status: " + error);
        }
    };

    return (
        <div className="space-y-4">
             <div className="space-y-2">
                <Label>Ubah Status</Label>
                <Select value={status} onValueChange={handleStatusChange} disabled={isLoading}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
