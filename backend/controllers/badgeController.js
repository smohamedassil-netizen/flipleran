import Badge from '../models/Badge.js';
import User from '../models/User.js';

export const getBadges = async (req, res) => {
  try {
    // Pagination : limit défaut 100, max 500. Les badges sont peu nombreux mais
    // on garde la garde anti-runaway si la collection grossit.
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const skip  = Math.max(parseInt(req.query.skip,  10) || 0, 0);
    const badges = await Badge.find().sort({ nom: 1 }).skip(skip).limit(limit);
    res.json(badges);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createBadge = async (req, res) => {
  try {
    const badge = await Badge.create(req.body);
    res.status(201).json(badge);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const awardBadge = async (req, res) => {
  try {
    const { userId, badgeId } = req.body;
    await User.findByIdAndUpdate(userId, { $addToSet: { badges: badgeId } });
    res.json({ message: 'Badge attribue' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
