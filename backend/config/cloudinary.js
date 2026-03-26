import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload un buffer vers Cloudinary.
 * @param {Buffer} buffer
 * @param {object} options  — options Cloudinary (folder, resource_type, public_id…)
 * @returns {Promise<object>} résultat Cloudinary (secure_url, public_id, duration…)
 */
export const uploadBuffer = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });

/**
 * Supprime un asset Cloudinary par son public_id.
 */
export const deleteAsset = (publicId, resourceType = 'video') =>
  cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

export default cloudinary;
