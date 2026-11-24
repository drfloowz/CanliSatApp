export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_seller: boolean;
  is_admin: boolean;
  credits: number;
  referral_code: string | null;
  onboarded: boolean;
  created_at: string;
};

export type StreamStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export type Stream = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  category: string | null;
  cover_url: string | null;
  status: StreamStatus;
  scheduled_at: string | null;
  started_at: string | null;
  viewer_count: number;
  current_auction_id: string | null;
  created_at: string;
  host?: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'full_name'> | null;
};

export type ProductStatus = 'active' | 'in_auction' | 'sold' | 'archived';

export type Product = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: string | null;
  condition: string;
  images: string[];
  starting_price: number | null;
  buy_now_price: number | null;
  quantity: number;
  status: ProductStatus;
  created_at: string;
  seller?: Pick<Profile, 'id' | 'username' | 'avatar_url'> | null;
};

export type Auction = {
  id: string;
  stream_id: string;
  product_id: string;
  seller_id: string;
  start_price: number;
  current_price: number;
  current_winner_id: string | null;
  bid_count: number;
  duration_sec: number;
  status: 'running' | 'ended' | 'cancelled';
  started_at: string;
  ends_at: string;
  ended_at: string | null;
};

export type OrderStatus = 'awaiting_payment' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  source: 'auction' | 'buy_now';
  product_title: string;
  product_image: string | null;
  amount: number;
  status: OrderStatus;
  shipping_address: Address | null;
  carrier: string | null;
  tracking_number: string | null;
  created_at: string;
  buyer?: Pick<Profile, 'id' | 'username'> | null;
  seller?: Pick<Profile, 'id' | 'username'> | null;
};

export type Address = {
  id: string;
  title: string;
  full_name: string;
  phone: string;
  city: string;
  district: string;
  address_line: string;
  is_default: boolean;
};

export type ChatMessage = {
  id: string;
  stream_id: string;
  user_id: string;
  message: string;
  kind: 'chat' | 'system';
  created_at: string;
  username?: string | null;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any>;
  read_at: string | null;
  created_at: string;
};

export type SellerApplication = {
  id: string;
  user_id: string;
  store_name: string;
  category: string;
  phone: string;
  instagram: string | null;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  user?: Pick<Profile, 'id' | 'username'> | null;
};
