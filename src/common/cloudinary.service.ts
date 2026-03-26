//src/common/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLD_CLOUD_NAME,
      api_key: process.env.CLD_API_KEY,
      api_secret: process.env.CLD_API_SECRET,
    });
  }

  async deleteImage(url: string): Promise<any> {
  const publicId = this.extractPublicId(url);
  if (!publicId) return null;

  return new Promise((resolve) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        // Log the error but RESOLVE so Promise.all doesn't crash or hang
        console.error(`Cloudinary Error for ${publicId}:`, error.message);
        return resolve({ result: 'error', message: error.message });
      }

      // // result.result will be 'ok' if deleted, or 'not found' if already gone
      // if (result.result === 'not found') {
      //   console.log(`ℹ️ Image ${publicId} was already deleted or not found.`);
      // } else {
      //   console.log(`✅ Cloudinary result for ${publicId}: ${result.result}`);
      // }
      
      resolve(result);
    });
  });
}

  private extractPublicId(url: string): string | null {
  try {
    // This splits the URL and finds the part after /upload/
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    // Remove the 'upload' tag and the 'v123456' version tag if present
    let remainingParts = parts.slice(uploadIndex + 1);
    if (remainingParts[0].startsWith('v')) {
      remainingParts.shift();
    }

    // Join the rest (to support folders) and remove the file extension
    const publicIdWithExt = remainingParts.join('/');
    return publicIdWithExt.split('.')[0];
  } catch (e) {
    return null;
  }
}
}