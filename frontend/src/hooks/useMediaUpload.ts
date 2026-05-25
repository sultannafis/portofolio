'use client';

import { useState, useCallback } from 'react';

interface UploadState {
  files: File[];
  previews: string[];
  uploading: boolean;
  progress: number;
}

export function useMediaUpload() {
  const [state, setState] = useState<UploadState>({
    files: [],
    previews: [],
    uploading: false,
    progress: 0,
  });

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    const newPreviews = validFiles.map(f => URL.createObjectURL(f));

    setState(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles],
      previews: [...prev.previews, ...newPreviews],
    }));
  }, []);

  const removeFile = useCallback((index: number) => {
    setState(prev => {
      URL.revokeObjectURL(prev.previews[index]);
      return {
        ...prev,
        files: prev.files.filter((_, i) => i !== index),
        previews: prev.previews.filter((_, i) => i !== index),
      };
    });
  }, []);

  const clearFiles = useCallback(() => {
    setState(prev => {
      prev.previews.forEach(p => URL.revokeObjectURL(p));
      return { files: [], previews: [], uploading: false, progress: 0 };
    });
  }, []);

  const setUploading = useCallback((uploading: boolean) => {
    setState(prev => ({ ...prev, uploading }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress }));
  }, []);

  return { ...state, addFiles, removeFile, clearFiles, setUploading, setProgress };
}
