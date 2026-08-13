import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GenerateContentDialog } from "./GenerateContentDialog";
import { ManageImagesDialog } from "./ManageImagesDialog";
import { Sparkles, ImagePlus, ImageOff, Package } from "lucide-react";
import type { Product } from "@/lib/api";

const columnHelper = createColumnHelper<Product>();

function statusVariant(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "default" as const;
    case "draft":
      return "secondary" as const;
    case "archived":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function formatDate(dateString: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
}

export function ProductTable({ products, isLoading }: ProductTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [manageImagesOpen, setManageImagesOpen] = useState(false);
  const [selectedProductForImages, setSelectedProductForImages] =
    useState<Product | null>(null);

  const handleGenContent = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleManageImages = (product: Product) => {
    setSelectedProductForImages(product);
    setManageImagesOpen(true);
  };

  const columns = [
    columnHelper.accessor("images", {
      header: "",
      size: 56,
      cell: (info) => {
        const images = info.getValue();
        const firstImage = images?.[0];
        return (
          <div className="flex items-center justify-center">
            {firstImage ? (
              <img
                src={firstImage?.url}
                alt={firstImage?.altText || "Product"}
                className="h-10 w-10 rounded-lg object-cover border border-border/60"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg border border-dashed border-border/80 bg-muted/40 flex items-center justify-center">
                <ImageOff className="h-4 w-4 text-muted-foreground/60" />
              </div>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("title", {
      header: "Title",
      size: 320,
      cell: (info) => (
        <span
          className="font-medium text-sm text-foreground truncate block max-w-[320px]"
          title={info.getValue()}
        >
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      size: 100,
      cell: (info) => {
        const status = info.getValue();
        return (
          <Badge variant={statusVariant(status)} className="capitalize text-xs">
            {status}
          </Badge>
        );
      },
    }),
    columnHelper.accessor("vendor", {
      header: "Vendor",
      size: 140,
      cell: (info) => (
        <span className="text-sm text-muted-foreground">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      size: 130,
      cell: (info) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      size: 210,
      cell: (info) => (
        <div className="flex justify-end items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 hover:border-primary/40 hover:text-primary"
            onClick={() => handleManageImages(info.row.original)}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 hover:border-primary/40 hover:text-primary"
            onClick={() => handleGenContent(info.row.original)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Gen content
          </Button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Loading skeleton
  if (isLoading && products.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-xl border border-border/40 bg-card/50"
          >
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[60%]" />
              <Skeleton className="h-3 w-[30%]" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!isLoading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Package className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold text-foreground">
            No products found
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Click <strong>Sync</strong> to pull products from this shop, or
            switch to a different shop using the selector above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table (>= 640px) */}
      <div className="hidden sm:block rounded-xl border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-muted/30 hover:bg-muted/30"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10"
                      style={{
                        width:
                          header.getSize() !== 150
                            ? header.getSize()
                            : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="group transition-colors hover:bg-accent/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile card list (< 640px) */}
      <div className="sm:hidden space-y-3">
        {products.map((product) => {
          const firstImage = product.images?.[0];
          return (
            <div
              key={product.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-card shadow-xs"
            >
              {/* Thumbnail */}
              {firstImage ? (
                <img
                  src={firstImage?.url}
                  alt={firstImage?.altText || "Product"}
                  className="h-12 w-12 rounded-lg object-cover border border-border/60 shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg border border-dashed border-border/80 bg-muted/40 flex items-center justify-center shrink-0">
                  <ImageOff className="h-4 w-4 text-muted-foreground/60" />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <h4 className="text-sm font-medium text-foreground leading-tight line-clamp-2">
                  {product.title}
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={statusVariant(product.status)}
                    className="capitalize text-[10px] px-1.5 py-0"
                  >
                    {product.status}
                  </Badge>
                  {product.vendor && (
                    <span className="text-[11px] text-muted-foreground">
                      {product.vendor}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatDate(product.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-7 hover:border-primary/40 hover:text-primary"
                    onClick={() => handleManageImages(product)}
                  >
                    <ImagePlus className="h-3 w-3" />
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-7 hover:border-primary/40 hover:text-primary"
                    onClick={() => handleGenContent(product)}
                  >
                    <Sparkles className="h-3 w-3" />
                    Gen content
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <GenerateContentDialog
        product={selectedProduct}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <ManageImagesDialog
        product={selectedProductForImages}
        open={manageImagesOpen}
        onOpenChange={setManageImagesOpen}
      />
    </>
  );
}
