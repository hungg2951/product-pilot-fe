import * as React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShopStore } from "@/store/shop-store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { shopsApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Store,
  Key,
  Lock,
  Globe,
  Eye,
  EyeOff,
  Loader2,
  FileText,
} from "lucide-react";
import type { Shop, CreateShopInput, UpdateShopInput } from "@/lib/api";

interface ShopFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopToEdit?: Shop | null;
}

export function ShopFormDialog({
  open,
  onOpenChange,
  shopToEdit,
}: ShopFormDialogProps) {
  const queryClient = useQueryClient();
  const setActiveShop = useShopStore((s) => s.setActiveShop);

  const isEdit = !!shopToEdit;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [idShopify, setIdShopify] = useState("");
  const [clientId, setClientId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Populate form when opening in edit mode vs create mode
  useEffect(() => {
    if (open) {
      if (shopToEdit) {
        setName(shopToEdit.name || "");
        setDescription(shopToEdit.description || "");
        setIdShopify(shopToEdit.id_shopify || "");
        setClientId(shopToEdit.client_id || "");
        setSecretKey(""); // Leave blank in edit mode
      } else {
        setName("");
        setDescription("");
        setIdShopify("");
        setClientId("");
        setSecretKey("");
      }
      setShowSecretKey(false);
      setTouched({});
    }
  }, [open, shopToEdit]);

  const sanitizeDomain = (rawDomain: string) => {
    return rawDomain
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/$/, "");
  };

  // Field validation logic
  const nameError =
    touched.name && !name.trim() ? "Store name is required" : "";
  const domainError =
    touched.idShopify && !idShopify.trim() ? "Shopify domain is required" : "";
  const clientIdError =
    touched.clientId && !clientId.trim() ? "Client ID is required" : "";
  const secretKeyError =
    !isEdit && touched.secretKey && !secretKey.trim()
      ? "Secret key is required"
      : "";

  const isFormValid =
    name.trim() !== "" &&
    idShopify.trim() !== "" &&
    clientId.trim() !== "" &&
    (isEdit || secretKey.trim() !== "");

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateShopInput) => shopsApi.createShop(payload),
    onSuccess: (newShop) => {
      queryClient.invalidateQueries({ queryKey: ["shops"] });
      setActiveShop(newShop.id);
      toast.success(`Shop "${newShop.name}" connected successfully!`);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add shop");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateShopInput) => {
      if (!shopToEdit) throw new Error("No shop selected for editing");
      return shopsApi.updateShop(shopToEdit.id, payload);
    },
    onSuccess: (updatedShop) => {
      queryClient.invalidateQueries({ queryKey: ["shops"] });
      toast.success(`Shop "${updatedShop.name}" updated successfully!`);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update shop");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched
    setTouched({
      name: true,
      idShopify: true,
      clientId: true,
      secretKey: true,
    });

    if (!isFormValid) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    const sanitizedDomain = sanitizeDomain(idShopify);

    if (isEdit) {
      // Send only changed fields for partial update
      const updates: UpdateShopInput = {};
      if (name.trim() !== shopToEdit.name) updates.name = name.trim();
      if (
        (description.trim() || undefined) !==
        (shopToEdit.description || undefined)
      ) {
        updates.description = description.trim();
      }
      if (sanitizedDomain !== shopToEdit.id_shopify)
        updates.id_shopify = sanitizedDomain;
      if (clientId.trim() !== shopToEdit.client_id)
        updates.client_id = clientId.trim();
      if (secretKey.trim() !== "") updates.secret_key = secretKey.trim();

      if (Object.keys(updates).length === 0) {
        toast.info("No changes detected.");
        onOpenChange(false);
        return;
      }

      updateMutation.mutate(updates);
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        id_shopify: sanitizedDomain,
        client_id: clientId.trim(),
        secret_key: secretKey.trim(),
      });
    }
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Store className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Shopify Store" : "Connect Shopify Store"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update configuration for this Shopify store connection."
              : "Enter your Shopify App API Credentials below to connect a new store."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Store Name */}
          <div className="space-y-1.5">
            <Label htmlFor="shop-name">
              Store Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="shop-name"
              placeholder="e.g. My Apparel Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => markTouched("name")}
              className={
                nameError
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
              required
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
          </div>

          {/* Store Description */}
          {/* <div className="space-y-1.5">
            <Label htmlFor="shop-desc">Description (Optional)</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="shop-desc"
                placeholder="Primary retail store account"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="pl-9"
              />
            </div>
          </div> */}

          {/* Shopify Domain */}
          <div className="space-y-1.5">
            <Label htmlFor="shop-domain">
              Shopify Domain <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="shop-domain"
                placeholder="my-store.myshopify.com"
                value={idShopify}
                onChange={(e) => setIdShopify(e.target.value)}
                onBlur={() => markTouched("idShopify")}
                className={`pl-9 ${
                  domainError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                required
              />
            </div>
            {domainError ? (
              <p className="text-xs text-destructive">{domainError}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Your Shopify store domain (e.g. my-store.myshopify.com)
              </p>
            )}
          </div>

          {/* Client ID */}
          <div className="space-y-1.5">
            <Label htmlFor="client-id">
              Client ID <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="client-id"
                placeholder="shpca_xxxxxxxx"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                onBlur={() => markTouched("clientId")}
                className={`pl-9 ${
                  clientIdError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                required
              />
            </div>
            {clientIdError && (
              <p className="text-xs text-destructive">{clientIdError}</p>
            )}
          </div>

          {/* Secret Key */}
          <div className="space-y-1.5">
            <Label htmlFor="secret-key">
              Secret Key{" "}
              {!isEdit && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="secret-key"
                type={showSecretKey ? "text" : "password"}
                placeholder={
                  isEdit
                    ? "Leave blank to keep the current secret key"
                    : "shpcs_xxxxxxxx"
                }
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                onBlur={() => markTouched("secretKey")}
                className={`pl-9 pr-10 ${
                  secretKeyError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                required={!isEdit}
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
              >
                {showSecretKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {secretKeyError ? (
              <p className="text-xs text-destructive">{secretKeyError}</p>
            ) : isEdit ? (
              <p className="text-[11px] text-muted-foreground">
                Only fill this field if you want to update the secret key.
              </p>
            ) : null}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEdit ? "Updating..." : "Connecting..."}
                </>
              ) : isEdit ? (
                "Update Store"
              ) : (
                "Connect Store"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
