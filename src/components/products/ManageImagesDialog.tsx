import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi, type Product, type ProductImage } from "@/lib/api";
import { useShopStore } from "@/store/shop-store";
import {
  Upload,
  Trash2,
  X,
  Loader2,
  Check,
  AlertTriangle,
  ImageOff,
  RotateCcw,
  Images,
} from "lucide-react";

interface ManageImagesDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StagedFile {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
}

export function ManageImagesDialog({
  product,
  open,
  onOpenChange,
}: ManageImagesDialogProps) {
  const queryClient = useQueryClient();
  const activeShopId = useShopStore((s) => s.activeShopId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection state for batch deletion
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
    new Set(),
  );

  // Delete confirmation dialog state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Drag and drop dragover highlight state
  const [isDragging, setIsDragging] = useState(false);

  // Staged files list state
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  const [isUploadingBatch, setIsUploadingBatch] = useState(false);

  // Fetch images for this product
  const { data: images = [], isLoading: isImagesLoading } = useQuery<
    ProductImage[]
  >({
    queryKey: ["product-images", product?.id],
    queryFn: () =>
      product ? productsApi.getProductImages(product.id) : Promise.resolve([]),
    enabled: open && !!product,
  });

  // Clear state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedImageIds(new Set());
      setConfirmDeleteOpen(false);
      setIsDragging(false);
      // Clean up object URLs
      stagedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setStagedFiles([]);
    }
  }, [open]);

  // Batch delete mutation
  const deleteMutation = useMutation({
    mutationFn: (mediaIds: string[]) => {
      if (!product) throw new Error("No product selected");
      return productsApi.deleteProductImages(product.id, mediaIds);
    },
    onSuccess: (result) => {
      if (product) {
        queryClient.invalidateQueries({
          queryKey: ["product-images", product.id],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["products", activeShopId] });
      setSelectedImageIds(new Set());
      setConfirmDeleteOpen(false);
      toast.success(
        `${result.deletedMediaIds.length} image(s) deleted successfully.`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete images");
    },
  });

  // Single file upload runner
  const uploadSingleFile = async (
    stagedId: string,
    file: File,
  ): Promise<boolean> => {
    if (!product) return false;

    setStagedFiles((prev) =>
      prev.map((f) => (f.id === stagedId ? { ...f, status: "uploading" } : f)),
    );

    try {
      await productsApi.uploadProductImage(product.id, file);
      setStagedFiles((prev) =>
        prev.map((f) => (f.id === stagedId ? { ...f, status: "done" } : f)),
      );
      return true;
    } catch (error: any) {
      const msg = error.message || "Failed to upload file";
      setStagedFiles((prev) =>
        prev.map((f) =>
          f.id === stagedId ? { ...f, status: "error", errorMessage: msg } : f,
        ),
      );
      toast.error(`Upload failed for "${file.name}": ${msg}`);
      return false;
    }
  };

  // Add files to stage and start upload
  const handleFilesAdded = (files: FileList | File[]) => {
    if (!product) return;

    const newStaged: StagedFile[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not an image file.`);
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.warning(
          `"${file.name}" exceeds 20MB limit. Upload may fail on Shopify.`,
        );
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const previewUrl = URL.createObjectURL(file);

      const stagedItem: StagedFile = {
        id,
        file,
        previewUrl,
        status: "pending",
      };

      newStaged.push(stagedItem);
    });

    if (newStaged.length === 0) return;

    setStagedFiles((prev) => [...prev, ...newStaged]);

    // Trigger upload for each new staged file
    // newStaged.forEach((item) => {
    //   uploadSingleFile(item.id, item.file);
    // });
  };

  const pollForNewImages = async (
    expectedMinCount: number,
    maxAttempts = 6,
    intervalMs = 800,
  ) => {
    if (!product) return;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await queryClient.refetchQueries({
        queryKey: ["product-images", product.id],
        exact: true,
      });

      const current = queryClient.getQueryData<ProductImage[]>([
        "product-images",
        product.id,
      ]);

      if (current && current.length >= expectedMinCount) {
        return; // new image(s) now visible — stop polling early
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    // If we exit the loop without reaching expectedMinCount, the images will
    // still show up next time the dialog is reopened or refetched naturally —
    // we just stop actively polling to avoid hammering the API forever.
  };

  const handleUploadAll = async () => {
    const pending = stagedFiles.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    const countBeforeUpload = images.length; // capture BEFORE anything changes

    setIsUploadingBatch(true);

    const results = await Promise.allSettled(
      pending.map((item) => uploadSingleFile(item.id, item.file)),
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value === true,
    ).length;
    const failCount = pending.length - successCount;

    if (successCount > 0) {
      // Poll instead of a single invalidate, since Shopify processes newly
      // uploaded media asynchronously and may not list it immediately.
      await pollForNewImages(countBeforeUpload + successCount);
    }

    setIsUploadingBatch(false);

    queryClient.invalidateQueries({ queryKey: ["products", activeShopId] });

    setStagedFiles((prev) => {
      const toRemove = prev.filter((f) => f.status === "done");
      toRemove.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      return prev.filter((f) => f.status !== "done");
    });

    if (successCount > 0) {
      toast.success(`${successCount} image(s) uploaded`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} image(s) failed to upload`);
    }
  };

  const pendingCount = stagedFiles.filter((f) => f.status === "pending").length;
  const isUploadingAny = stagedFiles.some((f) => f.status === "uploading");

  const handleRemoveStaged = (id: string) => {
    setStagedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleRetryStaged = (item: StagedFile) => {
    uploadSingleFile(item.id, item.file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // Selection handlers
  const toggleImageSelection = (id: string) => {
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedImageIds.size === images.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(images.map((img) => img.id)));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!product) return null;

  const allSelected =
    images.length > 0 && selectedImageIds.size === images.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none sm:rounded-none p-0 flex flex-col focus:outline-none bg-background">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5 min-w-0 pr-4">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Images className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold truncate">
                  Manage Images — {product.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  Upload, view, and delete images for this Shopify product.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Body: Two columns */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* LEFT COLUMN: Existing images gallery */}
            <div className="flex-1 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r">
              {/* Gallery toolbar */}
              <div className="p-4 border-b flex items-center justify-between gap-3 bg-card/40 shrink-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSelectAll}
                    disabled={images.length === 0 || isImagesLoading}
                    className="h-8 text-xs font-medium"
                  >
                    {allSelected ? "Clear selection" : "Select all"}
                  </Button>

                  {/* {selectedImageIds.size > 0 && (
                    <span className="text-xs font-medium text-primary">
                      {selectedImageIds.size} selected
                    </span>
                  )} */}
                </div>

                {selectedImageIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={deleteMutation.isPending}
                    className="h-8 text-xs gap-1.5 font-medium"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete {selectedImageIds.size} selected</span>
                  </Button>
                )}
              </div>

              {/* Gallery Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {isImagesLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        className="aspect-square rounded-xl w-full"
                      />
                    ))}
                  </div>
                ) : images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/10 p-6">
                    <ImageOff className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="font-semibold text-sm text-foreground">
                      No images yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Upload one using the dropzone on the right to get started.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {images.map((img) => {
                      const isSelected = selectedImageIds.has(img.id);
                      return (
                        <div
                          key={img.id}
                          onClick={() => toggleImageSelection(img.id)}
                          className={`group relative aspect-square rounded-xl border overflow-hidden cursor-pointer transition-all bg-card select-none ${
                            isSelected
                              ? "ring-2 ring-primary border-primary shadow-sm"
                              : "hover:border-primary/50"
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.altText || "Product image"}
                            className="w-full h-full object-cover"
                          />

                          {/* Top-left Checkbox Overlay */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 left-2 z-10 p-1"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() =>
                                toggleImageSelection(img.id)
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Upload new images */}
            <div className="w-full md:w-[360px] lg:w-[400px] shrink-0 overflow-y-auto p-6 bg-muted/20 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-foreground">
                Upload New Images
              </h3>

              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 bg-card ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    Drag images here or click to browse
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Supports PNG, JPG, WEBP (multiple files allowed)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesAdded(e.target.files);
                      e.target.value = "";
                    }
                  }}
                  className="hidden"
                />
              </div>

              {/* Staged Files List */}
              {stagedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Staged Uploads ({stagedFiles.length})
                    </h4>

                    <Button
                      size="sm"
                      onClick={handleUploadAll}
                      disabled={pendingCount === 0 || isUploadingBatch}
                      className="h-7 text-xs gap-1.5"
                    >
                      {isUploadingBatch ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      Upload{pendingCount > 0 ? ` (${pendingCount})` : ""}
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {stagedFiles.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg border bg-card text-xs relative"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-10 w-10 rounded-md object-cover border shrink-0"
                        />

                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium text-foreground truncate">
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatFileSize(item.file.size)}
                          </p>

                          {item.status === "error" && item.errorMessage && (
                            <p className="text-[10px] text-destructive truncate">
                              {item.errorMessage}
                            </p>
                          )}
                        </div>

                        {/* Status Icon / Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {item.status === "uploading" && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          {item.status === "done" && (
                            <Check className="h-4 w-4 text-emerald-500" />
                          )}
                          {item.status === "error" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRetryStaged(item)}
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              title="Retry upload"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveStaged(item.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="Remove file"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              Delete Images
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">
                {selectedImageIds.size} image(s)
              </strong>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                deleteMutation.mutate(Array.from(selectedImageIds))
              }
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedImageIds.size} Image(s)`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
