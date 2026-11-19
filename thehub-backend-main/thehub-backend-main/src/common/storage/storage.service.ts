import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as WebSocket from 'ws';
import { AppException } from '../app.exception';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET ?? 'thehub-uploads';
import 'multer'; 

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      {
        auth: { persistSession: false },
        realtime: {
          transport: WebSocket as any, // Contourne l'erreur de type TS
        },
      },
    );
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file || !file.buffer) {
      throw new AppException('FILE_REQUIRED', 'Aucun fichier fourni', 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new AppException(
        'INVALID_FILE_TYPE',
        `Type de fichier non supporté (${file.mimetype}) — formats acceptés : JPEG, PNG, WebP`,
        400,
      );
    }

    const extension = this.extensionFromMimeType(file.mimetype);
    const path = `${folder}/${randomUUID()}.${extension}`;

    const { error } = await this.supabase.storage.from(BUCKET_NAME).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (error) {
      this.logger.error(`Echec upload Supabase Storage (${path})`, error);
      throw new AppException('UPLOAD_FAILED', "Échec de l'upload de l'image, réessayez", 502);
    }

    const { data } = this.supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  }

  async deleteByUrl(publicUrl: string): Promise<void> {
    const path = this.extractPathFromPublicUrl(publicUrl);
    if (!path) return;

    const { error } = await this.supabase.storage.from(BUCKET_NAME).remove([path]);
    if (error) {
      this.logger.warn(`Echec suppression Supabase Storage (${path}) — ignoré`, error);
    }
  }

  private extensionFromMimeType(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return 'bin';
    }
  }

  private extractPathFromPublicUrl(publicUrl: string): string | null {
    const marker = `/object/public/${BUCKET_NAME}/`;
    const index = publicUrl.indexOf(marker);
    if (index === -1) return null;
    return publicUrl.slice(index + marker.length);
  }
}