import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../services/adminService';
import { useToast } from '../context/ToastContext';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [newItemInfo, setNewItemInfo] = useState('');
  const [newAmenities, setNewAmenities] = useState('');
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  const parseCsv = (value) =>
    String(value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

  const buildCategoryConfig = (itemInfoText, amenitiesText) => {
    const itemInfoFields = parseCsv(itemInfoText).map((label) => ({
      key: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      label,
      type: 'text',
    }));

    return {
      itemInfoFields,
      amenities: parseCsv(amenitiesText),
      rentTypes: ['Daily', 'Monthly', 'Yearly'],
    };
  };

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        notify('Unable to load categories.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, [notify]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const category = await createCategory({
        name: newName.trim(),
        category_config: buildCategoryConfig(newItemInfo, newAmenities),
      });
      setCategories((current) => [category, ...current]);
      setNewName('');
      setNewItemInfo('');
      setNewAmenities('');
      notify('Category added successfully.', 'success');
    } catch (error) {
      notify('Unable to create category.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? This cannot be undone.')) return;
    try {
      await deleteCategory(id);
      setCategories((current) => current.filter((item) => item.id !== id));
      notify('Category removed from catalog.', 'success');
    } catch (error) {
      notify(error?.response?.data?.error || 'Unable to delete category.', 'error');
    }
  };

  const handleRename = async (id, currentName) => {
    const updatedName = window.prompt('Update category name', currentName);
    if (!updatedName?.trim() || updatedName === currentName) return;
    try {
      const category = await updateCategory(id, { name: updatedName.trim() });
      setCategories((current) => current.map((item) => (item.id === id ? category : item)));
      notify('Category updated.', 'success');
    } catch (error) {
      notify('Unable to update category.', 'error');
    }
  };

  const handleEditLogic = async (category) => {
    const currentItemInfo = (category.category_config?.itemInfoFields || [])
      .map((field) => field?.label)
      .filter(Boolean)
      .join(', ');
    const currentAmenities = (category.category_config?.amenities || []).join(', ');

    const nextItemInfo = window.prompt('Item info fields (comma separated)', currentItemInfo);
    if (nextItemInfo === null) return;
    const nextAmenities = window.prompt('Amenities (comma separated)', currentAmenities);
    if (nextAmenities === null) return;

    try {
      const updated = await updateCategory(category.id, {
        category_config: buildCategoryConfig(nextItemInfo, nextAmenities),
      });
      setCategories((current) => current.map((item) => (item.id === category.id ? updated : item)));
      notify('Category dynamic logic updated.', 'success');
    } catch (error) {
      notify('Unable to update category logic.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Category management</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Catalog organization and taxonomy</h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name"
              className="rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <input
              value={newItemInfo}
              onChange={(e) => setNewItemInfo(e.target.value)}
              placeholder="Item info fields (e.g. Year, Transmission, Fuel)"
              className="min-w-[300px] rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <input
              value={newAmenities}
              onChange={(e) => setNewAmenities(e.target.value)}
              placeholder="Amenities (e.g. WIFI, Parking, Balcony)"
              className="min-w-[300px] rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <button
              onClick={handleAdd}
              className="rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Add category
            </button>
          </div>
        </div>
      </div>

      <div className="panel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-950/70 text-slate-500">
              <tr>
                <th className="px-5 py-5">Category</th>
                <th className="px-5 py-5">Total items</th>
                <th className="px-5 py-5">Item info fields</th>
                <th className="px-5 py-5">Amenities</th>
                <th className="px-5 py-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse border-t border-slate-800/80">
                    <td colSpan="5" className="px-5 py-5 text-slate-500">Loading categories…</td>
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr className="border-t border-slate-800/80">
                  <td colSpan="5" className="px-5 py-7 text-center text-slate-400">No categories defined yet.</td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="border-t border-slate-800/80 hover:bg-slate-950/80">
                    <td className="px-5 py-5 font-medium text-white">{category.name}</td>
                    <td className="px-5 py-5 text-slate-300">{category.item_count ?? '—'}</td>
                    <td className="px-5 py-5 text-slate-300">{(category.category_config?.itemInfoFields || []).map((field) => field?.label).filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-5 py-5 text-slate-300">{(category.category_config?.amenities || []).join(', ') || '—'}</td>
                    <td className="px-5 py-5">
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleRename(category.id, category.name)}
                          className="rounded-2xl bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleEditLogic(category)}
                          className="rounded-2xl bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/15"
                        >
                          Edit logic
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="rounded-2xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
