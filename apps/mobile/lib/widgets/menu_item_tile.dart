import 'package:flutter/material.dart';
import '../models/menu_item.dart';

class MenuItemTile extends StatelessWidget {
  const MenuItemTile({super.key, required this.item});

  final MenuItem item;

  static const Color periwinkle = Color(0xFF8B91C7);
  static const Color lightPeriwinkle = Color(0xFFEEF0FF);
  static const Color darkText = Color(0xFF11121B);

  Widget _buildImage() {
    final imageUrl = item.imageUrl.trim();

    final placeholder = Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: lightPeriwinkle,
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Icon(Icons.local_cafe_outlined, size: 34, color: periwinkle),
    );

    if (imageUrl.isEmpty) {
      return placeholder;
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Image.network(
        imageUrl,
        width: 80,
        height: 80,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return placeholder;
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: lightPeriwinkle),
        boxShadow: [
          BoxShadow(
            color: periwinkle.withValues(alpha: 0.12),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          _buildImage(),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (item.isRecommended)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 6),
                    child: Text(
                      'RECOMMENDED',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                        color: periwinkle,
                      ),
                    ),
                  ),
                Text(
                  item.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: darkText,
                  ),
                ),
                if (item.description.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    item.description,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      height: 1.4,
                      color: Colors.black54,
                    ),
                  ),
                ],
                const SizedBox(height: 10),
                Text(
                  '\$${item.price.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: periwinkle,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
