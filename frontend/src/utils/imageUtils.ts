import React from 'react';
import { API_URL } from '../config';

export const extractDriveId = (url?: string | null): string | null => {
    if (!url) return null;
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/uploads\/drive\/([a-zA-Z0-9_-]+)/);
    return driveMatch ? driveMatch[1] : null;
};

/**
 * Resolves pupil photo URL reliably:
 * - Google Drive / lh3 URLs are routed through our local high-speed cached proxy `/uploads/drive/{id}`
 *   which completely eliminates Google's 429 "Too Many Requests" rate limiting on client browsers!
 * - Local /uploads paths are prefixed with the backend API URL.
 */
export const getPupilPhotoUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    
    const driveId = extractDriveId(url);
    if (driveId) {
        return `${API_URL}/uploads/drive/${driveId}`;
    }
    
    if (url.startsWith('/uploads')) {
        return `${API_URL}${url}`;
    }
    
    return url;
};

/**
 * Resilient multi-stage fallback handler for pupil photos:
 * 1. Backend local cache proxy (`/uploads/drive/{id}`)
 * 2. Google Drive high-reliability thumbnail endpoint (`drive.google.com/thumbnail?id={id}&sz=w400`)
 * 3. Google lh3 content CDN (`lh3.googleusercontent.com/d/{id}`)
 * 4. Clean fallback to initials/placeholder icon
 */
export const handlePupilPhotoError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
    originalUrl?: string | null
) => {
    const img = e.currentTarget;
    const driveId = extractDriveId(originalUrl) || extractDriveId(img.src);
    const stage = Number(img.dataset.fallbackStage || '0');

    if (driveId) {
        if (stage === 0) {
            img.dataset.fallbackStage = '1';
            img.src = `https://drive.google.com/thumbnail?id=${driveId}&sz=w400`;
            return;
        }
        if (stage === 1) {
            img.dataset.fallbackStage = '2';
            img.src = `https://lh3.googleusercontent.com/d/${driveId}`;
            return;
        }
    }

    img.style.display = 'none';
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
