"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedBlob, type PixelCrop } from "@/lib/cropImage";
import { useI18n } from "@/lib/i18n";

interface Props {
  disabled?: boolean;
  onSearch: (blob: Blob, thumbnail: string) => void;
}

export default function UploadCropper({ disabled, onSearch }: Props) {
  const { t } = useI18n();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<PixelCrop | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(t("upload.errFormat"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(t("upload.errSize"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }, [t]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setPixels(areaPixels);
  }, []);

  const reset = () => {
    setImageSrc(null);
    setPixels(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const confirm = async () => {
    if (!imageSrc || !pixels) return;
    try {
      const { blob, thumbnail } = await getCroppedBlob(imageSrc, pixels);
      onSearch(blob, thumbnail);
    } catch {
      setError(t("upload.errProcess"));
    }
  };

  if (!imageSrc) {
    return (
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
            dragging
              ? "border-indigo-400 bg-indigo-500/10"
              : "border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]"
          }`}
        >
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/20 text-2xl">
            🔍
          </div>
          <p className="text-base font-medium">{t("upload.dropzone")}</p>
          <p className="mt-1 text-sm text-white/50">{t("upload.formats")}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="crop-area">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-white/60">{t("upload.zoom")}</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-indigo-400"
        />
      </div>

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={confirm}
          disabled={disabled}
          className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("upload.search")}
        </button>
        <button
          onClick={reset}
          disabled={disabled}
          className="rounded-xl border border-white/15 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/5 disabled:opacity-50"
        >
          {t("upload.another")}
        </button>
      </div>
      <p className="mt-2 text-xs text-white/40">{t("upload.hint")}</p>
    </div>
  );
}
