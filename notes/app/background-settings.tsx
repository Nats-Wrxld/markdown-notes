"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";

const STORAGE_KEY = "urspace:background";

const WALLPAPERS = [
  {
    id: "paperclips",
    name: "Paperclips",
    src: "/backgrounds/pexels-ekaterina-bolovtsova-6193935.jpg",
    overlay: 0.58,
  },
  {
    id: "evening-sky",
    name: "Evening sky",
    src: "/backgrounds/pexels-gokul-barman-177743-634339.jpg",
    overlay: 0.5,
  },
  {
    id: "hydrangea",
    name: "Quiet blooms",
    src: "/backgrounds/pexels-julytrosh-8859819.jpg",
    overlay: 0.58,
  },
  {
    id: "winter-woodland",
    name: "Winter woodland",
    src: "/backgrounds/pexels-nikitaxnikitin-11007815.jpg",
    overlay: 0.58,
  },
  {
    id: "pink-dancer",
    name: "Pink daydream",
    src: "/backgrounds/pexels-polina-kovaleva-8879741.jpg",
    overlay: 0.52,
  },
] as const;

type Wallpaper = (typeof WALLPAPERS)[number];
type WallpaperId = Wallpaper["id"];
type WallpaperChoice = WallpaperId | null;

type WallpaperContextValue = {
  openSettings: () => void;
  wallpaper: Wallpaper | null;
  onImageError: () => void;
};

const WallpaperContext = createContext<WallpaperContextValue | null>(null);

function isWallpaperId(value: string | null): value is WallpaperId {
  return WALLPAPERS.some((wallpaper) => wallpaper.id === value);
}

function getWallpaper(choice: WallpaperChoice) {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === choice) ?? null;
}

/**
 * Static application backdrop. The photo wallpapers are no longer rendered here:
 * they belong to the note editor only (see `NoteEditorBackdrop`).
 */
export function AppBackdrop() {
  return (
    <div className="app-background" aria-hidden="true">
      <span className="ambient-orb ambient-orb-peach" />
      <span className="ambient-orb ambient-orb-apricot" />
    </div>
  );
}

export function BackgroundSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<WallpaperChoice>(null);
  const [preview, setPreview] = useState<WallpaperChoice>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [imageError, setImageError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        setSelected(isWallpaperId(saved) ? saved : null);
      } catch {
        setStorageError("Wallpaper preferences are unavailable in this browser.");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>("[data-dialog-close]")?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const openSettings = useCallback(() => {
    setPreview(selected);
    setImageError(false);
    setIsOpen(true);
  }, [selected]);

  function closeSettings() {
    setPreview(selected);
    setIsOpen(false);
  }

  function applySelection() {
    try {
      if (preview === null) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, preview);
      }
      setSelected(preview);
      setImageError(false);
      setStorageError("");
      setIsOpen(false);
    } catch {
      setStorageError("UrSpace couldn’t save this wallpaper. Check your browser storage settings and try again.");
    }
  }

  function resetWallpaper() {
    setPreview(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setSelected(null);
      setImageError(false);
      setStorageError("");
      setIsOpen(false);
    } catch {
      setStorageError("UrSpace couldn’t reset this wallpaper. Check your browser storage settings and try again.");
    }
  }

  function handleImageError() {
    setImageError(true);
    setSelected(null);
    setPreview(null);
    setStorageError("That wallpaper image is unavailable. The plain writing area has been restored.");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      setStorageError("That image and browser storage are unavailable. The plain writing area is shown.");
    }
  }

  function handlePreview(choice: WallpaperChoice) {
    setImageError(false);
    setPreview(choice);
  }

  const wallpaper = imageError ? null : getWallpaper(isOpen ? preview : selected);

  return (
    <WallpaperContext.Provider value={{ openSettings, wallpaper, onImageError: handleImageError }}>
      {children}
      <BackgroundSettingsDialog
        dialogRef={dialogRef}
        isOpen={isOpen}
        selected={selected}
        preview={preview}
        storageError={storageError}
        onPreview={handlePreview}
        onApply={applySelection}
        onReset={resetWallpaper}
        onClose={closeSettings}
        onDialogClose={() => setIsOpen(false)}
      />
    </WallpaperContext.Provider>
  );
}

/**
 * Renders the chosen wallpaper inside the note editor shell, behind the text.
 * Returns null when the plain writing surface is selected.
 */
export function NoteEditorBackdrop() {
  const context = useContext(WallpaperContext);
  const wallpaper = context?.wallpaper;

  if (!context || !wallpaper) return null;

  return (
    <div className="note-editor-wallpaper" aria-hidden="true">
      <Image
        key={wallpaper.id}
        src={wallpaper.src}
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 560px"
        className="note-editor-wallpaper-photo"
        onError={context.onImageError}
      />
      <div
        className="note-editor-wallpaper-dimmer"
        style={{ opacity: Math.min(0.82, wallpaper.overlay + 0.2) }}
      />
    </div>
  );
}

export function useNoteEditorWallpaper() {
  const context = useContext(WallpaperContext);
  return { wallpaper: context?.wallpaper ?? null };
}

export function BackgroundSettingsTrigger() {
  const context = useContext(WallpaperContext);
  if (!context) return null;

  return (
    <button
      type="button"
      onClick={context.openSettings}
      aria-haspopup="dialog"
      aria-label="Change note editor wallpaper"
      className="background-settings-trigger"
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 5.5h14M5.5 10h9m-6.5 4.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="7" cy="5.5" r="1.5" fill="var(--surface-control)" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="10" r="1.5" fill="var(--surface-control)" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9.5" cy="14.5" r="1.5" fill="var(--surface-control)" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span>Wallpaper</span>
    </button>
  );
}

type DialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  isOpen: boolean;
  selected: WallpaperChoice;
  preview: WallpaperChoice;
  storageError: string;
  onPreview: (choice: WallpaperChoice) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
  onDialogClose: () => void;
};

function BackgroundSettingsDialog({
  dialogRef,
  isOpen,
  selected,
  preview,
  storageError,
  onPreview,
  onApply,
  onReset,
  onClose,
  onDialogClose,
}: DialogProps) {
  return (
    <dialog
      ref={dialogRef}
      className="background-settings-dialog"
      aria-labelledby="wallpaper-dialog-title"
      onClose={onDialogClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {isOpen && (
        <div className="background-settings-panel">
          <div className="background-settings-heading">
            <div>
              <p className="ui-text-accent-soft text-xs font-semibold">Make it yours</p>
              <h2 id="wallpaper-dialog-title">Writing area wallpaper</h2>
              <p className="background-settings-description">
                Choose a quiet backdrop for your note editor. It appears behind the text you write,
                while the rest of UrSpace keeps its usual look.
              </p>
            </div>
            <button
              type="button"
              data-dialog-close
              onClick={onClose}
              aria-label="Close wallpaper settings"
              className="background-dialog-close"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <fieldset className="background-gallery">
            <legend className="sr-only">Choose a wallpaper for the note editor</legend>
            <button
              type="button"
              aria-pressed={preview === null}
              onClick={() => onPreview(null)}
              className={`background-choice ${preview === null ? "background-choice-selected" : ""}`}
            >
              <span className="background-choice-preview background-choice-default">
                <span>UrSpace</span>
              </span>
              <span className="background-choice-name">
                Plain
                {selected === null && <span className="background-current-label">Current</span>}
              </span>
            </button>

            {WALLPAPERS.map((wallpaper) => (
              <button
                key={wallpaper.id}
                type="button"
                aria-pressed={preview === wallpaper.id}
                onClick={() => onPreview(wallpaper.id)}
                className={`background-choice ${preview === wallpaper.id ? "background-choice-selected" : ""}`}
              >
                <span className="background-choice-preview">
                  <Image
                    src={wallpaper.src}
                    alt=""
                    fill
                    sizes="(max-width: 420px) 42vw, 180px"
                    className="background-choice-image"
                  />
                  <span
                    className="background-choice-preview-dimmer"
                    style={{ opacity: wallpaper.overlay }}
                  />
                </span>
                <span className="background-choice-name">
                  {wallpaper.name}
                  {selected === wallpaper.id && (
                    <span className="background-current-label">Current</span>
                  )}
                </span>
              </button>
            ))}
          </fieldset>

          {storageError && (
            <p className="background-settings-error" role="status">
              {storageError}
            </p>
          )}

          <p className="background-settings-note">
            Wallpapers are saved in this browser and only affect the note editor.
          </p>

          <div className="background-settings-footer">
            <button type="button" onClick={onReset} className="background-reset-button">
              Reset
            </button>
            <div className="background-dialog-actions">
              <button type="button" onClick={onClose} className="background-cancel-button">
                Cancel
              </button>
              <button type="button" onClick={onApply} className="background-apply-button">
                Apply wallpaper
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
