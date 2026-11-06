"use client";

import { useEffect } from "react";
import { Footer, Header } from "@/components/MadarakaHome";

const scripts = ["/demo/admin.js", "/demo/i18n.js", "/demo/app.js"];

function loadScript(src: string) {
  return new Promise<HTMLScriptElement>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.dataset["portalScript"] = "true";
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.appendChild(script);
  });
}

export function PortalExperience() {
  useEffect(() => {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/demo/styles.css";
    stylesheet.dataset["portalStyles"] = "true";
    document.head.appendChild(stylesheet);

    let cancelled = false;
    void (async () => {
      for (const src of scripts) {
        await loadScript(src);
        if (cancelled) return;
      }
    })();

    return () => {
      cancelled = true;
      (window as Window & { portalDispose?: () => void }).portalDispose?.();
      document.querySelectorAll("script[data-portal-script], link[data-portal-styles]").forEach((node) => node.remove());
    };
  }, []);

  return (
    <>
      <Header interior />
      <main className="mx-auto max-w-[1240px] px-4 pb-8 pt-24">
        <div className="portal-app" data-theme="light">
          <div id="app" />
          <div id="toast" role="status" aria-live="polite" />
          <div id="modal" className="modal hidden" />
        </div>
      </main>
      <Footer />
    </>
  );
}
