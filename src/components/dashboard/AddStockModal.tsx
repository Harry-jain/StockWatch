'use client'

import { Modal } from '@/components/ui/Modal'
import { StockSearch } from '@/components/dashboard/StockSearch'

export function AddStockModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (symbol: string) => Promise<void>
}) {
  return (
    <Modal open={open} onClose={onClose} title="Add stock">
      <StockSearch
        onSelect={async (symbol) => {
          await onAdd(symbol)
          onClose()
        }}
      />
    </Modal>
  )
}
