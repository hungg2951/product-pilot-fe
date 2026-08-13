import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import { useShopStore } from "@/store/shop-store";
import { generateProductContent } from "@/lib/generate-content";
import { Loader2, Sparkles } from "lucide-react";
import type { Product } from "@/lib/api";

interface GenerateContentDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateContentDialog({
  product,
  open,
  onOpenChange,
}: GenerateContentDialogProps) {
  const queryClient = useQueryClient();
  const activeShopId = useShopStore((s) => s.activeShopId);

  const [description, setDescription] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    if (!open || !product) {
      // Reset state when the dialog closes
      if (!open) {
        setDescription("");
        setMetaDescription("");
        setShortDescription("");
        setHasGenerated(false);
      }
      return;
    }

    let cancelled = false;

    const generate = async () => {
      setIsGenerating(true);
      setHasGenerated(false);
      try {
        const content = await generateProductContent(product.id, product.title);
        if (cancelled) return;
        setDescription(content.description);
        setMetaDescription(content.metaDescription);
        setShortDescription(content.shortDescription);
        setHasGenerated(true);
      } catch {
        if (cancelled) return;
        toast.error("Failed to generate content. Please try again.");
        onOpenChange(false);
      } finally {
        if (!cancelled) setIsGenerating(false);
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [open, product]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!product) throw new Error("No product selected");
      return productsApi.updateProduct(product.id, {
        description,
        metaDescription,
        shortDescription,
      });
    },
    onSuccess: () => {
      toast.success("Product content updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["products", activeShopId] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Failed to update product. Please try again.",
      );
    },
  });

  const metaCharCount = metaDescription.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Content
          </DialogTitle>
          <DialogDescription>
            {product
              ? `AI-generated content for "${product.title}". Edit the fields below, then click Update.`
              : "Generate product content"}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body — this is the only part that scrolls */}
        <div className="flex-1 overflow-y-auto px-6">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">
                Generating content...
              </p>
            </div>
          ) : hasGenerated ? (
            <div className="space-y-4 py-2">
              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="gen-description">Description</Label>
                <Textarea
                  id="gen-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="font-mono text-xs"
                  placeholder="Product description (HTML supported)"
                />
                <p className="text-[11px] text-muted-foreground">
                  Supports HTML markup. Will be used as the main product
                  description.
                </p>
              </div>

              {/* Meta Description */}
              <div className="space-y-1.5">
                <Label htmlFor="gen-meta-description">Meta Description</Label>
                <Textarea
                  id="gen-meta-description"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  placeholder="SEO meta description"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    Used for SEO search engine results.
                  </p>
                  <span
                    className={`text-[11px] font-medium tabular-nums ${
                      metaCharCount > 160
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {metaCharCount}/160
                    {metaCharCount > 160 && " (recommended: ≤ 160)"}
                  </span>
                </div>
              </div>

              {/* Short Description */}
              <div className="space-y-1.5">
                <Label htmlFor="gen-short-description">Short Description</Label>
                <Textarea
                  id="gen-short-description"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief product summary"
                />
                <p className="text-[11px] text-muted-foreground">
                  A brief summary shown in product cards and listings.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Fixed footer — stays pinned at the bottom, never scrolls */}
        {hasGenerated && (
          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
