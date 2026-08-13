import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import { useShopStore } from "@/store/shop-store";
import { ProductTable } from "@/components/products/ProductTable";
import { PromptTemplateDialog } from "@/components/products/PromptTemplateDialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  Package,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Settings,
} from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Input } from "@/components/ui/input";

export function ProductsPage() {
  const queryClient = useQueryClient();
  const activeShopId = useShopStore((s) => s.activeShopId);

  // cursorStack[i] = the `after` cursor used to fetch page i.
  // cursorStack[0] is always undefined (first page has no cursor).
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([
    undefined,
  ]);
  const [pageIndex, setPageIndex] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 1000);
  const isSearching = debouncedSearch.trim().length > 0;

  const {
    data: searchProducts = [],
    isLoading: isSearchLoading,
    isFetching: isSearchFetching,
  } = useQuery({
    queryKey: ["products-search", activeShopId, debouncedSearch],
    queryFn: () => productsApi.searchProduct(debouncedSearch),
    enabled: !!activeShopId && isSearching,
  });

  // Reset pagination whenever the active shop changes.
  const [lastShopId, setLastShopId] = useState(activeShopId);
  if (activeShopId !== lastShopId) {
    setLastShopId(activeShopId);
    setCursorStack([undefined]);
    setPageIndex(0);
  }

  const currentCursor = cursorStack[pageIndex];

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["products", activeShopId, currentCursor],
    queryFn: () =>
      productsApi.getProducts({
        limit: 20,
        after: currentCursor,
      }),
    enabled: !!activeShopId,
  });

  const products = data?.products ?? [];
  const pageInfo = data?.pageInfo;

  const displayedProducts = isSearching ? searchProducts : products;
  const displayedIsLoading = isSearching ? isSearchLoading : isLoading;

  const handleSync = () => {
    queryClient.invalidateQueries({ queryKey: ["products", activeShopId] });
  };

  const handleNextPage = () => {
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;

    setCursorStack((prev) => {
      const next = [...prev];
      next[pageIndex + 1] = pageInfo.endCursor;
      return next;
    });
    setPageIndex((p) => p + 1);
  };

  const handlePreviousPage = () => {
    if (pageIndex === 0) return;
    setPageIndex((p) => p - 1);
  };

  // Is syncing = refetching the currently visible page (not the initial load)
  const isSyncing = isFetching && !isLoading;

  const [promptDialogOpen, setPromptDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Products
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Manage product content and SEO metadata
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPromptDialogOpen(true)}
            className="h-9 w-9"
            aria-label="Manage prompt templates"
            title="Manage prompt templates"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-2 h-9 px-4 font-medium"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sync products
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search products by title..."
          className="pl-9 pr-9 h-10"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isSearchFetching && !isSearchLoading && (
          <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Product Table / Cards */}
      <ProductTable
        products={displayedProducts}
        isLoading={displayedIsLoading}
      />

      {/* Pagination */}
      {!isSearching && (
        <div className="flex justify-end items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousPage}
            disabled={pageIndex === 0 || isFetching}
            className="h-9 w-9"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm text-muted-foreground px-2 min-w-[64px] text-center tabular-nums">
            Page {pageIndex + 1}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNextPage}
            disabled={!pageInfo?.hasNextPage || isFetching}
            className="h-9 w-9"
            aria-label="Next page"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      <PromptTemplateDialog
        open={promptDialogOpen}
        onOpenChange={setPromptDialogOpen}
      />
    </div>
  );
}
