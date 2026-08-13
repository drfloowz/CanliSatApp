import { supabase } from './supabase';

export const streamService = {
  async startLiveStream(streamData: { title: string; mode: string }) {
    // 1. Get the current logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Kullanıcı oturumu bulunamadı.");
    }

    // 2. Insert the stream with the user's ID
    const { data, error } = await supabase
      .from('live_streams')
      .insert([
        { 
          title: streamData.title, 
          status: 'live',
          host_id: user.id 
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  async endLiveStream(streamId: string) {
    const { data, error } = await supabase
      .from('live_streams')
      .update({ status: 'ended' })
      .eq('id', streamId)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  }
};
