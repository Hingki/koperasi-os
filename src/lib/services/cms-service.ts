import { SupabaseClient } from '@supabase/supabase-js';

export interface CMSPost {
  id: string;
  koperasi_id: string;
  title: string;
  slug: string;
  content: string; // HTML or Markdown
  excerpt?: string;
  featured_image?: string;
  category: 'news' | 'event' | 'announcement';
  status: 'draft' | 'published';
  published_at?: string;
  author_id: string;
}

export interface CMSPage {
  id: string;
  koperasi_id: string;
  title: string;
  slug: string; // e.g., 'about-us', 'contact'
  content: string;
  status: 'draft' | 'published';
}

export class CMSService {
  constructor(private supabase: SupabaseClient) {}

  // --- Posts ---
  async getPosts(koperasiId: string, category?: string, limit: number = 10) {
    let query = this.supabase
      .from('cms_posts')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getPostBySlug(koperasiId: string, slug: string) {
    const { data, error } = await this.supabase
      .from('cms_posts')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('slug', slug)
      .single();
      
    if (error) throw error;
    return data;
  }

  async createPost(payload: Partial<CMSPost>) {
    // Generate Slug if not provided
    if (!payload.slug && payload.title) {
        payload.slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    const { data, error } = await this.supabase
      .from('cms_posts')
      .insert(payload)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  // --- Pages ---
  async getPage(koperasiId: string, slug: string) {
    const { data, error } = await this.supabase
      .from('cms_pages')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('slug', slug)
      .single();
      
    if (error) throw error;
    return data;
  }
}
