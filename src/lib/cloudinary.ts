const CLOUD_NAME = 'dfulm81q0';
const UPLOAD_PRESET = 'goodyhut';

export const uploadToCloudinary = async (
  file: File,
  folder: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) throw new Error('Image upload failed');
  const data = await res.json();
  return data.secure_url;
};

/**
 * Returns an optimized Cloudinary URL with auto quality/format
 */
export const optimizeCloudinaryUrl = (url: string, width?: number): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  // Insert transformation before /upload/
  const transforms = `f_auto,q_auto${width ? `,w_${width}` : ''}`;
  return url.replace('/upload/', `/upload/${transforms}/`);
};
