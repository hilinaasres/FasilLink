export const resizeImageFileToDataUrl = (file: File, maxSize = 600, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return reject(new Error('Invalid file result'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas not supported'));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const ext = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(ext, quality);
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (e) => reject(new Error('Failed to load image for resizing'));
      img.src = reader.result as string;
    };
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export default resizeImageFileToDataUrl;
