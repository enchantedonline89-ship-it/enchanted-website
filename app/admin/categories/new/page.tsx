import CategoryForm from '@/components/admin/CategoryForm'

export default function NewCategoryPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <a href="/admin/categories" className="text-muted hover:text-gold text-sm transition-colors">← Back to Categories</a>
        <h1 className="font-display text-3xl text-foreground mt-3">Add New Category</h1>
      </div>
      <CategoryForm mode="create" />
    </div>
  )
}
