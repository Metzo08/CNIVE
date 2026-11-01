import { API_URL } from '../config';

/**
 * Resolves pupil photo URL reliably:
 * - Google Drive / lh3 URLs are routed through our local high-speed cached proxy `/uploads/drive/{id}`
 *   which completely eliminates Google's 429 "Too Many Requests" rate limiting on client browsers!
 * - Local /uploads paths are prefixed with the backend API URL.
 */
export const getPupilPhotoUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
        return `${API_URL}/uploads/drive/${driveMatch[1]}`;
    }
    
    if (url.startsWith('/uploads')) {
        return `${API_URL}${url}`;
    }
    
    return url;
};

/**
 * Utility function to compress and resize an image file before upload.
 * Reduces bandwidth usage and server storage costs.
 */
export const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width = Math.round((width * maxWidth) / height);
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Canvas to Blob failed'));
                            return;
                        }
                        // Create a new File from the Blob
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};
