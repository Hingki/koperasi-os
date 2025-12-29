'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  actionLabel: string;
  requireReason?: boolean;
  isDestructive?: boolean;
  children?: React.ReactNode;
}

export function ApprovalModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionLabel,
  requireReason = true,
  isDestructive = false,
  children
}: ApprovalModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) return;
    onConfirm(reason);
    setReason("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {children}

        {requireReason && (
          <div className="grid w-full gap-1.5 py-4">
            <Label htmlFor="reason">Alasan / Catatan (Wajib)</Label>
            <Textarea
              id="reason"
              placeholder="Masukkan alasan untuk tindakan ini..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setReason(""); onClose(); }}>Batal</Button>
          <Button
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault(); // Prevent auto-close to validate
              handleConfirm();
            }}
            disabled={requireReason && !reason.trim()}
            variant={isDestructive ? "destructive" : "default"}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
