// Must match the API response for GET /api/menu (see SwaggerHub).
export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  imageAlt: string;
  inspiredBy: string;
  teaBases: string[];
  isSeasonal: boolean;
  isAvailable: boolean;
  isRecommended: boolean;
  isFeatured: boolean;
}
