import { supabase } from './supabase';

export const streamService = {
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
