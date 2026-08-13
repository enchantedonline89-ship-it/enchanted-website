import CategoryForm from '@/components/admin/CategoryForm'

export default function NewCategoryPage() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <a href="/admin/categories" className="text-ink-dim hover:text-ink text-sm transition-colors">Back to categories</a>
        <h1 className="text-3xl text-ink mt-3">Add New Category</h1>
      </div>
      <CategoryForm mode="create" />
    </div>
  )
}
