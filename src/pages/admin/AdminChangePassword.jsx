import { useState } from "react";
import { Helmet } from "react-helmet-async";
import toast, { Toaster } from "react-hot-toast";
import AdminLayout from "../../components/AdminLayout";

const API_BASE = "https://api-inventory.isavralabel.com/wedding-app";

const AdminChangePassword = () => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Konfirmasi password baru tidak cocok");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success(data.message || "Password berhasil diubah");
        setForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        toast.error(data.message || "Gagal mengubah password");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error jaringan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Ubah Password - Admin</title>
      </Helmet>
      <Toaster position="top-right" />
      <AdminLayout>
        <div className="max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Ubah password</h1>
          <p className="text-gray-600 mb-8">
            Gunakan password kuat yang belum dipakai di tempat lain.
          </p>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password saat ini
              </label>
              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                autoComplete="current-password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password baru
              </label>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konfirmasi password baru
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Menyimpan…" : "Simpan password baru"}
            </button>
          </form>
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminChangePassword;
