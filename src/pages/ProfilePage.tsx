import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";
import type { User, Role } from "../types";

const ProfilePage = () => {
  const [userData, setUserData] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "";
    text: string;
  }>({ type: "", text: "" });

  const currentUser = getLoggedInUser();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const [userRes, roleRes] = await Promise.all([
          api.get(`/users`),
          api.get("/users/roles"),
        ]);

        const users = Array.isArray(userRes.data) ? userRes.data : [];
        const userId = String(currentUser?.id || "").toLowerCase();
        const userEmail = String(
          (currentUser as any)?.email || "",
        ).toLowerCase();

        let foundUser = users.find(
          (u: User) =>
            String(u.id).toLowerCase() === userId ||
            (userEmail && String(u.email || "").toLowerCase() === userEmail),
        );

        if (!foundUser && currentUser?.id) {
          try {
            const singleRes = await api.get(`/users/${currentUser.id}`);
            foundUser = singleRes.data;
          } catch (e) {
            console.warn("Direct profile fetch failed, using token fallback");
          }
        }

        const userToUse = foundUser || (currentUser as User);

        if (userToUse) {
          setUserData(userToUse);
          setFormData({
            name: userToUse.name || "",
            email: userToUse.email || "",
            password: "",
            confirmPassword: "",
          });
        }

        setRoles(Array.isArray(roleRes.data) ? roleRes.data : []);
      } catch (err) {
        console.error("Profile load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && currentUser.id !== undefined && currentUser.id !== null)
      fetchProfile();
  }, []);

  const roleName = useMemo(() => {
    if (loading) return "Syncing...";
    if (!userData) return "Standard Member";
    if (roles.length === 0) return "Access Level Verified";
    const roleId = String(userData.roleId).toLowerCase();
    return (
      roles.find((r) => String(r.id).toLowerCase() === roleId)?.name ||
      "Standard Member"
    );
  }, [userData, roles, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      setStatus({ type: "error", text: "New passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", text: "" });

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
      };
      if (formData.password) payload.password = formData.password;

      await api.put(`/users/${userData?.id}`, payload);
      setStatus({
        type: "success",
        text: "Your profile has been updated successfully.",
      });
      setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      setUserData((prev) =>
        prev ? { ...prev, name: formData.name, email: formData.email } : null,
      );
    } catch (err: any) {
      setStatus({
        type: "error",
        text: err.response?.data?.message || "Update failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">
          Accessing Secure Data
        </p>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="mb-12">
        <h1 className="text-5xl font-black text-white uppercase tracking-tighter">
          My Identity
        </h1>
        <p className="text-slate-500 text-sm font-medium">
          Manage your profile information and authentication credentials
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-600/20 to-cyan-600/20"></div>
            <div className="relative pt-6">
              <div className="w-28 h-24 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl font-black text-white shadow-2xl ring-8 ring-slate-950">
                {(userData?.name || userData?.email || "A")[0].toUpperCase()}
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight leading-none">
                {userData?.name || "Administrator"}
              </h2>
              <span className="inline-block mt-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg">
                {roleName}
              </span>
            </div>

            <div className="mt-10 pt-10 border-t border-slate-800/50 text-left space-y-6">
              <div>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">
                  System Email
                </p>
                <p className="text-sm text-slate-300 font-mono tracking-tighter">
                  {userData?.email}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">
                  Account UUID
                </p>
                <p className="text-[9px] text-slate-500 font-mono break-all opacity-50">
                  {userData?.id}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleSubmit} className="space-y-8">
              {status.text && (
                <div
                  className={`p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${
                    status.type === "success"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full animate-pulse ${status.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}
                  ></div>
                  {status.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">
                    Display Name
                  </label>
                  <input
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-slate-200 focus:border-indigo-500 outline-none transition shadow-inner"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">
                    Email Address
                  </label>
                  <input
                    required
                    type="email"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-slate-200 focus:border-indigo-500 outline-none transition shadow-inner"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="pt-8 border-t border-slate-800/50 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-slate-200 focus:border-indigo-500 outline-none transition shadow-inner"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-slate-200 focus:border-indigo-500 outline-none transition shadow-inner"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 uppercase tracking-[0.2em] text-[10px] disabled:opacity-50"
              >
                {isSubmitting ? "Syncing Profile..." : "Save Account Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
