import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { promptTemplatesApi, shopsApi, type PromptTemplate } from "@/lib/api";
import { useShopStore } from "@/store/shop-store";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
  AlertTriangle,
  Check,
} from "lucide-react";

interface PromptTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromptTemplateDialog({
  open,
  onOpenChange,
}: PromptTemplateDialogProps) {
  const queryClient = useQueryClient();
  const activeShopId = useShopStore((s) => s.activeShopId);

  // Sub-dialog state for Create / Edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(
    null,
  );
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");

  // Delete confirmation dialog state
  const [deleteTemplate, setDeleteTemplate] = useState<PromptTemplate | null>(
    null,
  );

  // Fetch prompt templates
  const { data: templates = [], isLoading: isTemplatesLoading } = useQuery({
    queryKey: ["prompt-templates"],
    queryFn: promptTemplatesApi.getPromptTemplates,
    enabled: open,
  });

  // Fetch shops to get active shop's default template ID
  const { data: shops = [] } = useQuery({
    queryKey: ["shops"],
    queryFn: shopsApi.getShops,
    enabled: open,
  });

  const activeShop = shops.find((s) => s.id === activeShopId);

  // Create / Update prompt template mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formName.trim() || !formContent.trim()) {
        throw new Error("Name and content are required");
      }
      if (editingTemplate) {
        return promptTemplatesApi.updatePromptTemplate(editingTemplate.id, {
          name: formName.trim(),
          content: formContent,
        });
      } else {
        return promptTemplatesApi.createPromptTemplate({
          name: formName.trim(),
          content: formContent,
        });
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      toast.success(
        editingTemplate
          ? `Prompt template "${data.name}" updated successfully.`
          : `Prompt template "${data.name}" created successfully.`,
      );
      closeForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save prompt template");
    },
  });

  // Set/Clear default template mutation
  const setDefaultMutation = useMutation({
    mutationFn: async ({
      templateId,
      shopId,
    }: {
      templateId: string | null;
      shopId: string;
    }) => {
      return shopsApi.updateShop(shopId, {
        default_prompt_template_id: templateId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shops"] });
      const shopName = activeShop?.name || "shop";
      if (variables.templateId === null) {
        toast.success(`Default template cleared for ${shopName}`);
      } else {
        toast.success(`Default template updated for ${shopName}`);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update default template");
    },
  });

  // Delete prompt template mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => promptTemplatesApi.deletePromptTemplate(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      // If deleted template was the active shop's default, also invalidate shops
      if (activeShop?.default_prompt_template_id === deletedId) {
        queryClient.invalidateQueries({ queryKey: ["shops"] });
      }
      toast.success("Prompt template deleted successfully.");
      setDeleteTemplate(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete prompt template");
    },
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormContent("");
    setFormOpen(true);
  };

  const handleOpenEdit = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormContent(template.content);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingTemplate(null);
    setFormName("");
    setFormContent("");
  };

  const handleToggleDefault = (template: PromptTemplate) => {
    if (!activeShop) {
      toast.error("No active shop selected.");
      return;
    }

    const isCurrentDefault =
      activeShop.default_prompt_template_id === template.id;

    setDefaultMutation.mutate({
      shopId: activeShop.id,
      templateId: isCurrentDefault ? null : template.id,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col p-0 gap-0">
          {/* Fixed Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0 flex flex-row items-end justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                Prompt templates
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-muted-foreground">
                Manage the AI instructions used to generate product content. Set
                one as the default for the currently selected shop.
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 h-8 text-xs font-medium shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              New template
            </Button>
          </DialogHeader>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {isTemplatesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 border rounded-xl space-y-2 bg-card/50"
                  >
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl p-6 bg-muted/20">
                <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="font-medium text-sm text-foreground">
                  No templates yet
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Create one to customize how content is generated for your
                  products.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenCreate}
                  className="mt-4 gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Template
                </Button>
              </div>
            ) : (
              templates.map((template) => {
                const isDefault =
                  activeShop?.default_prompt_template_id === template.id;
                const preview =
                  template.content.length > 120
                    ? template.content.slice(0, 120) + "..."
                    : template.content;

                return (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-xl transition-all bg-card hover:border-primary/40 flex flex-col gap-2 relative ${
                      isDefault ? "border-primary/50 bg-primary/[0.02]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {template.name}
                        </span>
                        {isDefault && (
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-[10px] gap-1 py-0.5 px-2 font-medium"
                          >
                            <Check className="h-3 w-3" />
                            Default for {activeShop?.name || "active shop"}
                          </Badge>
                        )}
                      </div>

                      {/* Row Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Set Default / Clear Default */}
                        <Button
                          variant={isDefault ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => handleToggleDefault(template)}
                          disabled={setDefaultMutation.isPending || !activeShop}
                          title={
                            isDefault
                              ? "Clear default for active shop"
                              : "Set as default for active shop"
                          }
                          className={`h-7 px-2.5 text-xs gap-1 font-medium transition-colors ${
                            isDefault
                              ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/30"
                              : "hover:text-amber-600"
                          }`}
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              isDefault
                                ? "fill-amber-500 text-amber-500"
                                : "text-muted-foreground"
                            }`}
                          />
                          <span>
                            {isDefault ? "Default" : "Set as default"}
                          </span>
                        </Button>

                        {/* Edit Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(template)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit template"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTemplate(template)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete template"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>

                    {/* Preview Content */}
                    <p className="text-xs font-mono text-muted-foreground line-clamp-2 bg-muted/40 p-2 rounded-md whitespace-pre-wrap">
                      {preview}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Create / Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-base font-bold">
              {editingTemplate ? "Edit Prompt Template" : "New Prompt Template"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the AI system instructions used when generating product
              descriptions and SEO metadata.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Template Name */}
            <div className="space-y-1.5">
              <Label htmlFor="template-name" className="text-xs font-medium">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="template-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Apparel Copywriter, Electronics Specialist"
                className="h-9"
              />
            </div>

            {/* Template Content */}
            <div className="space-y-1.5">
              <Label htmlFor="template-content" className="text-xs font-medium">
                Prompt Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="template-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={14}
                placeholder="Write your custom system prompt instructions here..."
                className="font-mono text-xs leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                This content will precede the product title in the AI generation
                request.
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending ||
                !formName.trim() ||
                !formContent.trim()
              }
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingTemplate ? (
                "Save Changes"
              ) : (
                "Create Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTemplate}
        onOpenChange={(open) => !open && setDeleteTemplate(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              Delete Template
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              This will permanently delete the template{" "}
              <strong className="text-foreground">
                {deleteTemplate?.name}
              </strong>
              . Products using it as a shop's default will fall back to the
              built-in prompt.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTemplate(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                deleteTemplate && deleteMutation.mutate(deleteTemplate.id)
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
                "Delete Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
