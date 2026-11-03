import { Schema, model, type InferSchemaType } from 'mongoose';

// One drink or food item on the Eisai menu. Admins create these from the dashboard.
const menuItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'Drinks', trim: true },
    imageUrl: { type: String, default: '' },
    teaBases: {
      type: [{ type: String, enum: ['matcha', 'hojicha'] }],
      default: [],
      validate: {
        validator: (bases: string[]) =>
          new Set(bases).size === bases.length,
        message: 'Tea bases must not contain duplicates.',
      },
    },

    isRecommended: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isSeasonal: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type MenuItemDoc = InferSchemaType<typeof menuItemSchema>;
export const MenuItem = model('MenuItem', menuItemSchema);