import { makeBannerImage } from './imageFactory';

export const mockBanners = [
  {
    id: 'banner-1',
    title: 'Lên đời flagship',
    description: 'Thu cũ đổi mới, trợ giá đến 4 triệu đồng',
    image: makeBannerImage('Lên đời flagship', 'Thu cũ đổi mới, trợ giá đến 4 triệu', '#1d4ed8', '#06b6d4'),
    link: '/products',
    active: true,
  },
  {
    id: 'banner-2',
    title: 'Sale giữa năm',
    description: 'Giảm đến 30% điện thoại và phụ kiện',
    image: makeBannerImage('Sale giữa năm', 'Giảm đến 30% điện thoại và phụ kiện', '#7c3aed', '#ec4899'),
    link: '/products',
    active: true,
  },
  {
    id: 'banner-3',
    title: 'Phụ kiện thông minh',
    description: 'Sạc nhanh, tai nghe, đồng hồ chính hãng',
    image: makeBannerImage('Phụ kiện thông minh', 'Combo tiện ích, giá cực tốt', '#0f766e', '#14b8a6'),
    link: '/accessories',
    active: true,
  },
];
