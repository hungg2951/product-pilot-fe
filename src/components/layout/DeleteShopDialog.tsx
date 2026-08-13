import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useShopStore } from '@/store/shop-store'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { shopsApi } from '@/lib/api'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { Shop } from '@/lib/api'

interface DeleteShopDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shop: Shop | null
}

export function DeleteShopDialog({ open, onOpenChange, shop }: DeleteShopDialogProps) {
  const queryClient = useQueryClient()
  const activeShopId = useShopStore((s) => s.activeShopId)
  const setActiveShop = useShopStore((s) => s.setActiveShop)

  const deleteMutation = useMutation({
    mutationFn: (shopId: string) => shopsApi.deleteShop(shopId),
    onSuccess: () => {
      // Invalidate shops list
      queryClient.invalidateQueries({ queryKey: ['shops'] })

      // Check remaining shops to fallback activeShopId if active shop was deleted
      const cachedShops = queryClient.getQueryData<Shop[]>(['shops']) || []
      const remaining = cachedShops.filter((s) => s.id !== shop?.id)

      if (activeShopId === shop?.id) {
        setActiveShop(remaining[0]?.id ?? null)
      }

      toast.success(`Shop "${shop?.name}" disconnected.`)
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to disconnect shop')
    },
  })

  const handleDelete = () => {
    if (shop) {
      deleteMutation.mutate(shop.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            Disconnect Store
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm text-muted-foreground">
            Are you sure you want to disconnect{' '}
            <strong className="text-foreground">{shop?.name}</strong> (
            <code className="text-xs font-mono">{shop?.id_shopify}</code>)? This action will remove the store configuration and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="gap-2"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              'Disconnect Store'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
