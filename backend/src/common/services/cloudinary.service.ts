import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadResult {
  url:          string;
  secureUrl:    string;
  thumbnailUrl: string;
  publicId:     string;
  resourceType: string;
  width:        number;
  height:       number;
  bytes:        number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key:    this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadBuffer(buffer: Buffer, folder = 'familyhub', resourceType: 'image' | 'video' = 'image'): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          transformation: resourceType === 'image'
            ? [{ quality: 'auto', fetch_format: 'auto' }]
            : undefined,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          const thumbnail = resourceType === 'image'
            ? cloudinary.url(result.public_id, { width: 400, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto' })
            : cloudinary.url(result.public_id, { resource_type: 'video', format: 'jpg', width: 400, height: 400, crop: 'fill' });
          resolve({
            url:          result.url,
            secureUrl:    result.secure_url,
            thumbnailUrl: thumbnail,
            publicId:     result.public_id,
            resourceType: result.resource_type,
            width:        result.width,
            height:       result.height,
            bytes:        result.bytes,
          });
        },
      ).end(buffer);
    });
  }

  async deleteByPublicId(publicId: string) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      this.logger.warn(`Cloudinary delete failed for ${publicId}: ${err}`);
    }
  }
}
