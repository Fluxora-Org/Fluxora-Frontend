import { useEffect, useState } from "react";
import { config } from "../lib/config";
import {
  checkApiVersion,
  SUPPORTED_API_VERSION_RANGE,
} from "../lib/apiVersion";

export default function ApiVersionGuard() {
  const [incompatible, setIncompatible] = useState(false);

  useEffect(() => {
    if (!config.apiUrl || config.useMocks) return;
    let active = true;
    void checkApiVersion(config.apiUrl).then((result) => {
      if (active && result.status === "incompatible") setIncompatible(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!incompatible) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-2xl rounded-xl border border-amber-400/40 bg-amber-950/95 p-4 text-amber-100 shadow-2xl"
    >
      <p className="font-semibold">Fluxora needs an API update</p>
      <p className="mt-1 text-sm text-amber-100/85">
        This frontend supports backend API version {SUPPORTED_API_VERSION_RANGE},
        but the configured backend returned an unrecognized version. Reload to
        try again, or ask the maintainer to deploy a compatible API.
      </p>
      <button
        type="button"
        className="mt-3 rounded-lg bg-amber-300 px-3 py-2 text-sm font-semibold text-amber-950"
        onClick={() => window.location.reload()}
      >
        Reload Fluxora
      </button>
    </div>
  );
}
