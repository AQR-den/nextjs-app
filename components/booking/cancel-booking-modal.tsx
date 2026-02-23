"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { RefundOption } from "@/lib/types/domain";

export function CancelBookingModal({
  open,
  onClose,
  onConfirm,
  loading,
  canRefund
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (option: RefundOption) => void;
  loading: boolean;
  canRefund: boolean;
}) {
  const [option, setOption] = useState<RefundOption>("wallet");

  return (
    <Modal open={open} onClose={onClose} title="Cancel booking">
      <div className="grid gap-3 text-sm">
        <p>Cancellation is automated. If eligible, choose refund destination below.</p>
        {canRefund ? (
          <div className="grid gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-white/20 p-2">
              <input type="radio" checked={option === "wallet"} onChange={() => setOption("wallet")} />
              Credit Tekkerz wallet
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/20 p-2">
              <input type="radio" checked={option === "refund"} onChange={() => setOption("refund")} />
              Refund to original payment method
            </label>
          </div>
        ) : (
          <p className="text-amber-300">No refundable payment found. Booking will be cancelled only.</p>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Keep booking</Button>
          <Button variant="danger" onClick={() => onConfirm(option)} disabled={loading}>
            {loading ? "Processing..." : "Confirm cancel"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
