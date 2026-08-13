import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useShopStore } from '@/store/shop-store'
import { useQuery } from '@tanstack/react-query'
import { shopsApi, type Shop } from '@/lib/api'
import { ShopFormDialog } from './ShopFormDialog'
import { DeleteShopDialog } from './DeleteShopDialog'
import { Store, Plus, Check, ChevronDown, Edit2, Trash2, RefreshCw, AlertCircle } from 'lucide-react'

export function ShopSelector() {
  const { activeShopId, setActiveShop } = useShopStore()
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [shopToEdit, setShopToEdit] = useState<Shop | null>(null)
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null)

  // Fetch real shop list from backend
  const {
    data: shops = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['shops'],
    queryFn: shopsApi.getShops,
  })

  // Auto-select first shop if activeShopId is not set or not in list
  useEffect(() => {
    if (shops.length > 0) {
      const exists = shops.some((s) => s.id === activeShopId)
      if (!activeShopId || !exists) {
        setActiveShop(shops[0].id)
      }
    } else if (shops.length === 0 && !isLoading) {
      if (activeShopId !== null) {
        setActiveShop(null)
      }
    }
  }, [shops, activeShopId, setActiveShop, isLoading])

  const activeShop = shops.find((s) => s.id === activeShopId)

  const handleOpenAdd = () => {
    setShopToEdit(null)
    setFormDialogOpen(true)
  }

  const handleOpenEdit = (e: React.MouseEvent, shop: Shop) => {
    e.stopPropagation()
    setShopToEdit(shop)
    setFormDialogOpen(true)
  }

  const handleOpenDelete = (e: React.MouseEvent, shop: Shop) => {
    e.stopPropagation()
    setShopToDelete(shop)
    setDeleteDialogOpen(true)
  }

  const maskSecretKey = (key?: string) => {
    if (!key) return '••••••••'
    if (key.length <= 4) return '••••' + key
    return '••••••••' + key.slice(-4)
  }

  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex h-9 items-center gap-2 px-3 text-sm font-medium border-border/80 bg-background shadow-xs hover:bg-accent/60 max-w-[240px]"
            disabled={isLoading}
          >
            <Store className="h-4 w-4 shrink-0 text-primary" />
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="truncate">
                {activeShop ? activeShop.name : 'Select Shop'}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-auto" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[260px]">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Connected Shops ({shops.length})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Loading State */}
          {isLoading && (
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="p-3 space-y-2 text-xs text-destructive bg-destructive/10 rounded-md m-1">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Failed to load shops
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                {error instanceof Error ? error.message : 'Network error'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="w-full h-7 text-xs gap-1 mt-1"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && shops.length === 0 && (
            <div className="p-3 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">No shops connected</p>
              <p className="text-[11px]">Add a Shopify store to get started.</p>
            </div>
          )}

          {/* Connected Shops List */}
          {!isLoading &&
            !isError &&
            shops.map((shop) => {
              const isActive = shop.id === activeShop?.id
              return (
                <DropdownMenuItem
                  key={shop.id}
                  onClick={() => setActiveShop(shop.id)}
                  className="flex items-center justify-between cursor-pointer py-2 group"
                >
                  <div className="flex items-center gap-2 truncate pr-1">
                    {isActive ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <div className="w-4 shrink-0" />
                    )}
                    <div className="flex flex-col truncate">
                      <span className="font-medium text-sm truncate">{shop.name}</span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {shop.id_shopify}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 font-mono">
                        {maskSecretKey(shop.secret_key)}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={(e) => handleOpenEdit(e, shop)}
                      title="Edit shop details"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleOpenDelete(e, shop)}
                      title="Disconnect shop"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              )
            })}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleOpenAdd}
            className="flex items-center gap-2 cursor-pointer text-primary font-medium py-2 focus:text-primary"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Shop...</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 border-border/80 bg-background hover:bg-accent hover:text-primary"
        onClick={handleOpenAdd}
        title="Add new Shopify store"
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only">Add Shop</span>
      </Button>

      <ShopFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        shopToEdit={shopToEdit}
      />

      <DeleteShopDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        shop={shopToDelete}
      />
    </div>
  )
}
