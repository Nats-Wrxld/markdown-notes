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

const BACKGROUNDS = [
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

type BackgroundId = (typeof BACKGROUNDS)[number]["id"];
type BackgroundChoice = BackgroundId | null;

type BackgroundContextValue = {
  openSettings: () => void;
};

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

function isBackgroundId(value: string | null): value is BackgroundId {
  return BACKGROUNDS.some((background) => background.id === value);
}

function getBackground(choice: BackgroundChoice) {
  return BACKGROUNDS.find((background) => background.id === choice);
}

export function BackgroundSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<BackgroundChoice>(null);
  const [preview, setPreview] = useState<BackgroundChoice>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [imageError, setImageError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        setSelected(isBackgroundId(saved) ? saved : null);
      } catch {
        setStorageError("Background preferences are unavailable in this browser.");
      } finally {
        setIsLoaded(true);
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
      setStorageError("UrSpace couldn’t save this background. Check your browser storage settings and try again.");
    }
  }

  function resetBackground() {
    setPreview(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setSelected(null);
      setImageError(false);
      setStorageError("");
      setIsOpen(false);
    } catch {
      setStorageError("UrSpace couldn’t reset this background. Check your browser storage settings and try again.");
    }
  }

  function handleImageError() {
    setImageError(true);
    setSelected(null);
    setPreview(null);
    setStorageError("That background image is unavailable. The default background has been restored.");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      setStorageError("That image and browser storage are unavailable. The default background is shown.");
    }
  }

  const visibleChoice = isOpen ? preview : selected;
  const visibleBackground = imageError ? undefined : getBackground(visibleChoice);

  function handlePreview(choice: BackgroundChoice) {
    setImageError(false);
    setPreview(choice);
  }

  return (
    <BackgroundContext.Provider value={{ openSettings }}>
      <div
        className={`app-background ${visibleBackground ? "app-background-image" : ""}`}
        aria-hidden="true"
      >
        {visibleBackground ? (
          <>
            {isLoaded && (
              <Image
                key={visibleBackground.id}
                src={visibleBackground.src}
                alt=""
                fill
                priority
                sizes="100vw"
                className="app-background-photo"
                onError={handleImageError}
              />
            )}
            <div
              className="app-background-dimmer"
              style={{ opacity: visibleBackground.overlay }}
            />
          </>
        ) : (
          <>
            <span className="ambient-orb ambient-orb-peach" />
            <span className="ambient-orb ambient-orb-apricot" />
          </>
        )}
      </div>
      {children}
      <BackgroundSettingsDialog
        dialogRef={dialogRef}
        isOpen={isOpen}
        selected={selected}
        preview={preview}
        storageError={storageError}
        onPreview={handlePreview}
        onApply={applySelection}
        onReset={resetBackground}
        onClose={closeSettings}
        onDialogClose={() => setIsOpen(false)}
      />
    </BackgroundContext.Provider>
  );
}

export function BackgroundSettingsTrigger() {
  const context = useContext(BackgroundContext);
  if (!context) return null;

  return (
    <button
      type="button"
      onClick={context.openSettings}
      aria-haspopup="dialog"
      aria-label="Change background appearance"
      className="background-settings-trigger"
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 5.5h14M5.5 10h9m-6.5 4.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="7" cy="5.5" r="1.5" fill="#fbf8f3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="10" r="1.5" fill="#fbf8f3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9.5" cy="14.5" r="1.5" fill="#fbf8f3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span>Appearance</span>
    </button>
  );
}

type DialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  isOpen: boolean;
  selected: BackgroundChoice;
  preview: BackgroundChoice;
  storageError: string;
  onPreview: (choice: BackgroundChoice) => void;
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
      aria-labelledby="background-dialog-title"
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
              <p className="ui-text-accent-soft text-xs font-semibold text-[#a56849]">Make it yours</p>
              <h2 id="background-dialog-title">Background appearance</h2>
              <p className="background-settings-description">
                Choose a quiet backdrop for your writing space.
              </p>
            </div>
            <button
              type="button"
              data-dialog-close
              onClick={onClose}
              aria-label="Close background settings"
              className="background-dialog-close"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <fieldset className="background-gallery">
            <legend className="sr-only">Choose a background</legend>
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

            {BACKGROUNDS.map((background) => (
              <button
                key={background.id}
                type="button"
                aria-pressed={preview === background.id}
                onClick={() => onPreview(background.id)}
                className={`background-choice ${preview === background.id ? "background-choice-selected" : ""}`}
              >
                <span className="background-choice-preview">
                  <Image
                    src={background.src}
                    alt=""
                    fill
                    sizes="(max-width: 420px) 42vw, 180px"
                    className="background-choice-image"
                  />
                  <span
                    className="background-choice-preview-dimmer"
                    style={{ opacity: background.overlay }}
                  />
                </span>
                <span className="background-choice-name">
                  {background.name}
                  {selected === background.id && (
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

          <div className="background-settings-footer">
            <button type="button" onClick={onReset} className="background-reset-button">
              Reset
            </button>
            <div className="background-dialog-actions">
              <button type="button" onClick={onClose} className="background-cancel-button">
                Cancel
              </button>
              <button type="button" onClick={onApply} className="background-apply-button">
                Apply background
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
