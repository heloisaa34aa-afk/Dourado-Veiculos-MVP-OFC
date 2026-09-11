import { supabase } from '../lib/supabase';
import { optimizeVehicleMediaImage } from '../utils/imageOptimization';

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  image_url: string;
  image_type: 'cover' | 'gallery' | '360';
  display_order: number;
  created_at?: string;
}

export interface VehicleVideo {
  id: string;
  vehicle_id: string;
  video_url: string;
  provider: 'upload' | 'youtube';
  created_at?: string;
}

export interface VehicleMediaData {
  cover: string | null;
  gallery: string[];
  video: VehicleVideo | null;
  frames360: string[];
}

export const vehicleMediaService = {
  /**
   * Fetch all media files for a specific vehicle.
   */
  async getMediaForVehicle(vehicleId: string): Promise<VehicleMediaData> {
    const result: VehicleMediaData = {
      cover: null,
      gallery: [],
      video: null,
      frames360: []
    };

    try {
      // These records are independent. Loading them together avoids making the
      // administrator wait for three sequential network round trips.
      const [vehicleResponse, imagesResponse, videoResponse] = await Promise.all([
        supabase.from('vehicles').select('cover_image').eq('id', vehicleId).maybeSingle(),
        supabase.from('vehicle_images').select('image_url, display_order').eq('vehicle_id', vehicleId),
        supabase.from('vehicle_videos').select('id, vehicle_id, video_url, provider').eq('vehicle_id', vehicleId).maybeSingle(),
      ]);

      const { data: vehicle, error: vError } = vehicleResponse;

      if (vError) {
        console.error('Error fetching vehicle cover:', vError);
      } else if (vehicle?.cover_image) {
        result.cover = vehicle.cover_image;
      }

      const { data: dbImages, error: imgError } = imagesResponse;

      if (imgError) {
        console.error('Error fetching vehicle_images from Supabase:', imgError);
      } else if (dbImages && dbImages.length > 0) {
        const sorted = [...dbImages].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
        result.gallery = sorted.map((img: any) => img.image_url);
        if (!result.cover && result.gallery.length > 0) {
          result.cover = result.gallery[0];
        }
      }

      // The 360 editor owns 360 frames. Fetching them here made the ordinary
      // photo/video tab slower and also broke when a car had exterior + interior.
      const { data: dbVideos, error: vidError } = videoResponse;

      if (!vidError && dbVideos) {
        result.video = {
          id: dbVideos.id,
          vehicle_id: dbVideos.vehicle_id,
          video_url: dbVideos.video_url,
          provider: dbVideos.provider || 'youtube'
        };
      }
    } catch (err) {
      console.error('Error reading vehicle media from Supabase:', err);
      throw err;
    }

    return result;
  },

  /**
   * Save Cover Photo
   */
  async saveCover(vehicleId: string, coverUrl: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .update({ cover_image: coverUrl })
      .eq('id', vehicleId);

    if (error) {
      console.error('Error updating cover_image on vehicles:', error);
      throw error;
    }
  },

  /**
   * Save Gallery Images
   */
  async saveGallery(vehicleId: string, imageUrls: string[]): Promise<void> {
    // Delete old gallery images
    const { error: delError } = await supabase
      .from('vehicle_images')
      .delete()
      .eq('vehicle_id', vehicleId);

    if (delError) {
      console.error('Error deleting old vehicle_images:', delError);
      throw delError;
    }

    if (imageUrls.length > 0) {
      const records = imageUrls.map((url) => ({
        vehicle_id: vehicleId,
        image_url: url
      }));

      const { error: insError } = await supabase
        .from('vehicle_images')
        .insert(records);

      if (insError) {
        console.error('Error inserting vehicle_images:', insError);
        throw insError;
      }
    }
  },

  /**
   * Save 360-degree interactive frames
   */
  async save360Frames(vehicleId: string, imageUrls: string[]): Promise<void> {
    let projectId: string;
    const { data: proj } = await supabase
      .from('vehicle_360_projects')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .maybeSingle();

    if (proj?.id) {
      projectId = proj.id;
      await supabase
        .from('vehicle_360_projects')
        .update({ frame_count: imageUrls.length })
        .eq('id', projectId);
    } else {
      const { data: newP, error: pErr } = await supabase
        .from('vehicle_360_projects')
        .insert({ vehicle_id: vehicleId, frame_count: imageUrls.length, status: 'draft' })
        .select('id')
        .single();
      if (pErr || !newP) throw pErr || new Error('Failed to create 360 project');
      projectId = newP.id;
    }

    // Delete old 360 frames
    await supabase
      .from('vehicle_360_frames')
      .delete()
      .eq('project_id', projectId);

    if (imageUrls.length > 0) {
      const timestamp = new Date().toISOString();
      const records = imageUrls.map((url, idx) => ({
        project_id: projectId,
        frame_number: idx,
        image_url: url,
        created_at: timestamp
      }));

      const { error: insError } = await supabase
        .from('vehicle_360_frames')
        .insert(records);

      if (insError) {
        console.error('Error inserting vehicle_360_frames:', insError);
        throw insError;
      }
    }
  },

  /**
   * Save video settings
   */
  async saveVideo(vehicleId: string, url: string, provider: 'upload' | 'youtube'): Promise<void> {
    const { error } = await supabase
      .from('vehicle_videos')
      .delete()
      .eq('vehicle_id', vehicleId);

    if (error) {
      console.error('Error deleting old video from Supabase:', error);
      throw error;
    }

    if (url.trim()) {
      const { error: insError } = await supabase
        .from('vehicle_videos')
        .insert({
          vehicle_id: vehicleId,
          video_url: url,
          provider: provider,
          created_at: new Date().toISOString()
        });
        
      if (insError) {
        console.error('Error inserting video to Supabase:', insError);
        throw insError;
      }
    }
  },

  /**
   * Upload media file to Supabase storage bucket
   */
  async uploadFile(vehicleId: string, file: File, folder: 'cover' | 'gallery' | '360' | 'videos', onProgress?: (pct: number) => void): Promise<string> {
    const uploadFile = folder === 'cover' || folder === 'gallery'
      ? await optimizeVehicleMediaImage(file)
      : file;
    const fileExt = uploadFile.name.split('.').pop() || 'webp';
    const cleanName = uploadFile.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}.${fileExt}`;
    const filePath = `${vehicleId}/${folder}/${fileName}`;

    if (onProgress) onProgress(10);

    const { data, error } = await supabase.storage
      .from('vehicles')
      .upload(filePath, uploadFile, {
        cacheControl: '31536000',
        contentType: uploadFile.type || undefined,
        upsert: true
      });

    if (error) {
      console.error('Storage upload failed:', error);
      throw error;
    }

    if (onProgress) onProgress(70);

    const { data: { publicUrl } } = supabase.storage
      .from('vehicles')
      .getPublicUrl(data.path);

    if (onProgress) onProgress(100);
    return publicUrl;
  },

  async uploadFiles(
    vehicleId: string,
    files: File[],
    folder: 'cover' | 'gallery' | '360' | 'videos',
    concurrency = 4,
  ): Promise<string[]> {
    const acceptedFiles = files.filter(file => folder !== 'gallery' || file.type.startsWith('image/'));
    const urls = new Array<string>(acceptedFiles.length);
    let cursor = 0;

    const worker = async () => {
      while (cursor < acceptedFiles.length) {
        const index = cursor++;
        urls[index] = await this.uploadFile(vehicleId, acceptedFiles[index], folder);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(Math.max(1, concurrency), acceptedFiles.length) }, () => worker()),
    );
    return urls;
  }
};
