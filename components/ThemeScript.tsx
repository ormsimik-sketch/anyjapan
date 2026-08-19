import { STORAGE_KEYS } from "@/lib/constants";

// Runs before hydration so the correct theme class is present on first paint (no flash).
function buildThemeScript(storageKey: string): string {
  return `(function(){try{var raw=localStorage.getItem(${JSON.stringify(storageKey)});var theme="system";if(raw){var parsed=JSON.parse(raw);if(parsed&&(parsed.theme==="light"||parsed.theme==="dark"||parsed.theme==="system")){theme=parsed.theme;}}var resolved=theme;if(theme==="system"){resolved=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}var root=document.documentElement;if(resolved==="dark"){root.classList.add("dark");}else{root.classList.remove("dark");}root.style.colorScheme=resolved;}catch(e){}})();`;
}

export function ThemeScript() {
  return (
    <script dangerouslySetInnerHTML={{ __html: buildThemeScript(STORAGE_KEYS.settings) }} />
  );
}
