import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, Package, ChevronDown, ChevronUp } from 'lucide-react';
import type { MerchProduct, MerchVariant } from '@shared/schema';

interface ProductWithVariants extends MerchProduct {
  variants?: MerchVariant[];
}

// ──────────────────────────────────────────────
// Product Form
// ──────────────────────────────────────────────

function ProductForm({ product, onClose }: { product?: ProductWithVariants | null; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [basePrice, setBasePrice] = useState(product ? (product.basePrice / 100).toFixed(2) : '');
  const [category, setCategory] = useState(product?.category ?? 'other');
  const [weight, setWeight] = useState(product?.weight?.toString() ?? '');
  const [images, setImages] = useState(
    product?.images ? (product.images as string[]).join('\n') : ''
  );

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest('POST', '/api/merch/products', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/merch/products'] });
      toast({ title: 'Product created' });
      onClose();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create product.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest('PATCH', `/api/merch/products/${product!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/merch/products'] });
      toast({ title: 'Product updated' });
      onClose();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update product.', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const imageList = images.split('\n').map(s => s.trim()).filter(Boolean);
    const data: Record<string, unknown> = {
      name,
      description,
      basePrice: Math.round(parseFloat(basePrice) * 100),
      category,
      weight: weight ? parseInt(weight) : null,
      images: imageList,
    };
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Product Name</Label>
        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tour T-Shirt" required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Product description..." rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="basePrice">Price ({'\u00A3'})</Label>
          <Input id="basePrice" type="number" step="0.01" min="0" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="9.99" required />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tshirt">T-Shirt</SelectItem>
              <SelectItem value="vinyl">Vinyl</SelectItem>
              <SelectItem value="poster">Poster</SelectItem>
              <SelectItem value="hoodie">Hoodie</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="weight">Weight (grams)</Label>
        <Input id="weight" type="number" min="0" value={weight} onChange={e => setWeight(e.target.value)} placeholder="200" />
      </div>
      <div>
        <Label htmlFor="images">Image URLs (one per line)</Label>
        <Textarea id="images" value={images} onChange={e => setImages(e.target.value)} placeholder="https://example.com/image.jpg" rows={3} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white/40 text-[rgba(102,0,51,0.6)] rounded-lg text-sm font-medium hover:bg-white/60 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-[#660033] text-[#F7E6CA] rounded-lg text-sm font-medium hover:bg-[#800040] transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────
// Variant Section
// ──────────────────────────────────────────────

function VariantSection({ product }: { product: ProductWithVariants }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [varName, setVarName] = useState('');
  const [varSize, setVarSize] = useState('');
  const [varColor, setVarColor] = useState('');
  const [varSku, setVarSku] = useState('');
  const [varInventory, setVarInventory] = useState('0');
  const [varPriceOverride, setVarPriceOverride] = useState('');

  const variants = product.variants ?? [];

  const createVariantMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest('POST', `/api/merch/products/${product.id}/variants`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/merch/products'] });
      toast({ title: 'Variant added' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add variant.', variant: 'destructive' });
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      await apiRequest('DELETE', `/api/merch/variants/${variantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/merch/products'] });
      toast({ title: 'Variant deleted' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete variant.', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setShowAddForm(false);
    setVarName('');
    setVarSize('');
    setVarColor('');
    setVarSku('');
    setVarInventory('0');
    setVarPriceOverride('');
  };

  const handleAddVariant = (e: React.FormEvent) => {
    e.preventDefault();
    createVariantMutation.mutate({
      name: varName,
      size: varSize || null,
      color: varColor || null,
      sku: varSku || null,
      inventory: parseInt(varInventory) || 0,
      priceOverride: varPriceOverride ? Math.round(parseFloat(varPriceOverride) * 100) : null,
    });
  };

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: 'rgba(102,0,51,0.08)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-medium text-[rgba(102,0,51,0.6)] hover:text-[#660033] transition-colors"
      >
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Variants ({variants.length})
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2">
          {variants.map(v => (
            <div
              key={v.id}
              className="flex items-center justify-between p-2.5 rounded-lg text-sm"
              style={{ backgroundColor: 'rgba(102,0,51,0.03)' }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-medium text-[#660033]">{v.name}</span>
                {v.size && <span className="text-xs text-[rgba(102,0,51,0.5)]">Size: {v.size}</span>}
                {v.color && <span className="text-xs text-[rgba(102,0,51,0.5)]">Color: {v.color}</span>}
                {v.sku && <span className="text-xs text-[rgba(102,0,51,0.5)]">SKU: {v.sku}</span>}
                <span className="text-xs text-[rgba(102,0,51,0.5)]">Stock: {v.inventory}</span>
                {v.priceOverride != null && (
                  <span className="text-xs font-semibold text-[#660033]">
                    {'\u00A3'}{(v.priceOverride / 100).toFixed(2)}
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteVariantMutation.mutate(v.id)}
                className="p-1 rounded hover:bg-[rgba(220,53,69,0.1)] transition-colors"
              >
                <Trash2 size={14} className="text-[#dc3545]" />
              </button>
            </div>
          ))}

          {showAddForm ? (
            <form onSubmit={handleAddVariant} className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(102,0,51,0.03)' }}>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Variant name *" value={varName} onChange={e => setVarName(e.target.value)} required className="text-sm" />
                <Input placeholder="Size (optional)" value={varSize} onChange={e => setVarSize(e.target.value)} className="text-sm" />
                <Input placeholder="Color (optional)" value={varColor} onChange={e => setVarColor(e.target.value)} className="text-sm" />
                <Input placeholder="SKU (optional)" value={varSku} onChange={e => setVarSku(e.target.value)} className="text-sm" />
                <Input type="number" placeholder="Inventory" value={varInventory} onChange={e => setVarInventory(e.target.value)} className="text-sm" />
                <Input type="number" step="0.01" placeholder="Price override (\u00A3)" value={varPriceOverride} onChange={e => setVarPriceOverride(e.target.value)} className="text-sm" />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createVariantMutation.isPending}
                  className="px-3 py-1.5 bg-[#660033] text-[#F7E6CA] rounded-lg text-xs font-medium hover:bg-[#800040] transition-colors disabled:opacity-50"
                >
                  {createVariantMutation.isPending ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 bg-white/40 text-[rgba(102,0,51,0.6)] rounded-lg text-xs font-medium hover:bg-white/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 text-xs font-medium text-[#660033] hover:text-[#800040] transition-colors"
            >
              <Plus size={14} />
              Add Variant
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Product Manager (main export)
// ──────────────────────────────────────────────

export default function ProductManager() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithVariants | null>(null);

  const { data: products = [], isLoading } = useQuery<ProductWithVariants[]>({
    queryKey: ['/api/merch/products'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/merch/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/merch/products'] });
      toast({ title: 'Product deleted' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete product.', variant: 'destructive' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest('PATCH', `/api/merch/products/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/merch/products'] });
    },
  });

  const openCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const openEdit = (product: ProductWithVariants) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const categoryLabels: Record<string, string> = {
    tshirt: 'T-Shirt',
    vinyl: 'Vinyl',
    poster: 'Poster',
    hoodie: 'Hoodie',
    other: 'Other',
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="h-10 w-32 rounded-lg bg-[rgba(102,0,51,0.05)] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl p-5 animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.4)', border: '1px solid rgba(102,0,51,0.08)' }}>
              <div className="h-5 w-32 rounded bg-[rgba(102,0,51,0.05)] mb-3" />
              <div className="h-4 w-full rounded bg-[rgba(102,0,51,0.05)] mb-2" />
              <div className="h-4 w-20 rounded bg-[rgba(102,0,51,0.05)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#660033] text-[#F7E6CA] rounded-lg text-sm font-medium hover:bg-[#800040] transition-colors"
            >
              <Plus size={16} />
              Add Product
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'New Product'}</DialogTitle>
            </DialogHeader>
            <ProductForm product={editingProduct} onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.4)', border: '1px solid rgba(102,0,51,0.08)' }}>
          <Package size={40} className="mx-auto mb-3 text-[rgba(102,0,51,0.3)]" />
          <p className="text-[rgba(102,0,51,0.6)] font-medium">No products yet</p>
          <p className="text-sm text-[rgba(102,0,51,0.4)] mt-1">Add your first merch product to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => {
            const imageList = (product.images as string[] | null) ?? [];
            return (
              <div
                key={product.id}
                className="rounded-xl p-5"
                style={{ backgroundColor: 'rgba(255,255,255,0.4)', border: '1px solid rgba(102,0,51,0.08)' }}
              >
                {/* Product image */}
                {imageList.length > 0 && (
                  <div className="w-full h-32 rounded-lg mb-3 overflow-hidden bg-[rgba(102,0,51,0.03)]">
                    <img src={imageList[0]} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Header row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#660033] truncate">{product.name}</h4>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-[rgba(102,0,51,0.06)] text-[rgba(102,0,51,0.6)]">
                      {categoryLabels[product.category] ?? product.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => openEdit(product)}
                      className="p-1.5 rounded-lg hover:bg-[rgba(102,0,51,0.06)] transition-colors"
                    >
                      <Edit size={14} className="text-[rgba(102,0,51,0.5)]" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(product.id)}
                      className="p-1.5 rounded-lg hover:bg-[rgba(220,53,69,0.1)] transition-colors"
                    >
                      <Trash2 size={14} className="text-[#dc3545]" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-xs text-[rgba(102,0,51,0.5)] mb-3 line-clamp-2">{product.description}</p>
                )}

                {/* Price + Active toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#660033]">
                    {'\u00A3'}{(product.basePrice / 100).toFixed(2)}
                  </span>
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: product.id, isActive: !product.isActive })}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                      product.isActive
                        ? 'bg-[rgba(40,167,69,0.15)] text-[#28a745]'
                        : 'bg-[rgba(108,117,125,0.15)] text-[#6c757d]'
                    }`}
                  >
                    {product.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Variants */}
                <VariantSection product={product} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
