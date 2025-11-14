"use client";
import React, { useEffect, useState } from "react";
import { useDialog } from "../DialogProvider";

export default function LocalDataManagementContent() {
  const { confirm } = useDialog();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paths, setPaths] = useState<null | {
    userData?: string;
    localStorageDir?: string;
    localStorageLevelDb?: string;
  }>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const api = (window as any).promptcrafter;
        if (!api?.getDataPaths) {
          setPaths(null);
          setError("Not available outside the desktop app");
          return;
        }
        let res: any = null;
        try {
          res = await api.getDataPaths();
        } catch (e: any) {
          const msg = String(e?.message || "");
          if (msg.includes("No handler registered")) {
            setPaths(null);
            setError("Main process not updated yet. Please fully quit and relaunch the app.");
            return;
          }
          throw e;
        }
        if (res?.ok) {
          setPaths({
            userData: res.userData,
            localStorageDir: res.localStorageDir,
            localStorageLevelDb: res.localStorageLevelDb,
          });
        } else {
          setError(res?.error || "Failed to load data paths");
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load data paths");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="text-sm">Loading…</div>
      ) : (
        <>
          {error && (
            <div className="md-card" style={{ padding: 12, borderLeft: "4px solid #ef4444" }}>
              <div style={{ fontSize: 12 }}>{error}</div>
            </div>
          )}
          <div className="md-card" style={{ padding: 12 }}>
            <div className="text-sm text-secondary" style={{ marginBottom: 8 }}>
              Electron Profile (userData)
            </div>
            <code style={{ fontSize: 12, wordBreak: "break-all" }}>{paths?.userData || "Unknown"}</code>
          </div>
          <div className="md-card" style={{ padding: 12 }}>
            <div className="text-sm text-secondary" style={{ marginBottom: 8 }}>
              Local Storage (LevelDB)
            </div>
            <code style={{ fontSize: 12, wordBreak: "break-all" }}>
              {paths?.localStorageLevelDb || paths?.localStorageDir || "Unknown"}
            </code>
          </div>
          <div className="md-card" style={{ padding: 12, borderLeft: "4px solid #ef4444" }}>
            <div className="text-sm" style={{ marginBottom: 8, color: "#ef4444" }}>
              <b>Reset Application</b>
            </div>
            <div className="text-xs text-secondary" style={{ marginBottom: 10 }}>
              This will delete all local data (settings, chats, presets) PERMANENTLY. Only use this if you want to
              start fresh.
            </div>
            <button
              className="md-btn md-btn--destructive"
              onClick={async () => {
                const ok = await confirm({
                  title: "Factory Reset",
                  message: "Delete ALL local data and restart?",
                  confirmText: "Delete & Restart",
                  cancelText: "Cancel",
                  tone: "destructive",
                });
                if (!ok) return;
                setLoading(true);
                setError(null);
                try {
                  const api = (window as any).promptcrafter;
                  const res = await api?.factoryReset?.();
                  if (!res?.ok) {
                    setError(res?.error || "Reset failed");
                    setLoading(false);
                    return;
                  }
                  await api?.restartApp?.();
                } catch (e: any) {
                  setError(e?.message || "Reset failed");
                } finally {
                  setLoading(false);
                }
              }}
              style={{ padding: "6px 10px", color: "#ef4444", marginRight: 30, borderColor: "#ef4444" }}
            >
              <b>DELETE ALL LOCAL DATA</b>
            </button>
          </div>
        </>
      )}
    </div>
  );
}


