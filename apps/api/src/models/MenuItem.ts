import { Schema, model, type InferSchemaType } from 'mongoose';

// One drink or food item on the Eisai menu. Admins create these from the dashboard.
const menuItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    price: { type: Number, required: true, min: 0 }, // in dollars, e.g. 6.5
    category: { type: String, default: 'Drinks', trim: true },
    imageUrl: { type: String, default: '' },
    isSeasonal: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type MenuItemDoc = InferSchemaType<typeof menuItemSchema>;
export const MenuItem = model('MenuItem', menuItemSchema);
