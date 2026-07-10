"use client";

import React, { useState } from "react";
import { useJarvisAuth } from "@/hooks/use-jarvis-auth";
import { Button } from "@/components/ui/button";
import { Download, Check, Key } from "lucide-react";

export function DesktopAuthExport() {
  const { session, user, isAuthenticated } = useJarvisAuth();
  const [copied, setCopied] = useState(false);

  if (!isAuthenticated || !session || !user) {
    return null;
  }

  const handleExport = () => {
    const config = {
      access_token: session.access_token,
      expires_at: session.expires_at || Math.floor(Date.now() / 1000) + 3600 * 24 * 7, // Fallback to 7 days
      web_base_url: window.location.origin,
      user_id: user.id,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "desktop-auth.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-3 text-xs font-mono space-y-2 mt-2">
      <div className="flex items-center gap-1.5 font-bold text-zinc-300">
        <Key className="w-3.5 h-3.5 text-sky-400" />
        Prepojenie s Desktop JARVISom
      </div>
      <p className="text-[10px] text-zinc-500 leading-normal">
        Stiahni overovací token a ulož ho do: <code className="bg-zinc-950 px-1 rounded">~/.jarvis/desktop-auth.json</code> pre obojsmernú pamäť.
      </p>
      <Button
        onClick={handleExport}
        variant="outline"
        size="sm"
        className="w-full text-[11px] h-8 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center gap-1.5"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Stiahnuté!
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-sky-400" />
            Stiahnuť desktop-auth.json
          </>
        )}
      </Button>
    </div>
  );
}
export default DesktopAuthExport;
