import 'package:file_picker/file_picker.dart';

import '../screens/admin/staff_drink_form_screen.dart';

Future<StaffPickedPhoto?> pickStaffPhoto() async {
  final selected = await FilePicker.pickFile(
    type: FileType.custom,
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  );

  if (selected == null) {
    return null;
  }

  final filename = selected.name;
  final lowerName = filename.toLowerCase();

  final validExtension =
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp');

  if (!validExtension) {
    throw const FormatException('Choose a JPG, PNG, or WebP image.');
  }

  const maxBytes = 5 * 1024 * 1024;

  final reportedSize = selected.lengthSync() ?? await selected.length();

  if (reportedSize != null && reportedSize > maxBytes) {
    throw const FormatException('Image exceeds the 5 MiB limit.');
  }

  final bytes = await selected.readAsBytes();

  if (bytes.isEmpty) {
    throw const FormatException('Unable to read the selected image.');
  }

  if (bytes.length > maxBytes) {
    throw const FormatException('Image exceeds the 5 MiB limit.');
  }

  return StaffPickedPhoto(filename: filename, bytes: bytes);
}
