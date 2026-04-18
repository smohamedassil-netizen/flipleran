import Reward from '../models/Reward.js';
import RewardClaim from '../models/RewardClaim.js';
import User from '../models/User.js';
import { pushNotification } from '../services/notificationService.js';

/* ─── Catalogue ──────────────────────────────────────────────────────── */
// GET /api/rewards
export const listRewards = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { active: true };
    const rewards = await Reward.find(filter).sort({ highlight: -1, pointsRequired: 1 });
    res.json(rewards);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/rewards (admin)
export const createReward = async (req, res) => {
  try {
    const reward = await Reward.create(req.body);
    res.status(201).json(reward);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/rewards/:id (admin)
export const updateReward = async (req, res) => {
  try {
    const reward = await Reward.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!reward) return res.status(404).json({ message: 'Récompense introuvable' });
    res.json(reward);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/rewards/:id (admin)
export const deleteReward = async (req, res) => {
  try {
    const result = await Reward.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: 'Récompense introuvable' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─── Réclamations ──────────────────────────────────────────────────── */
// POST /api/rewards/:id/claim
export const claimReward = async (req, res) => {
  try {
    const { userMessage } = req.body;
    const reward = await Reward.findById(req.params.id);
    if (!reward || !reward.active) {
      return res.status(404).json({ message: 'Récompense indisponible.' });
    }

    if (reward.stock !== -1 && reward.claimed >= reward.stock) {
      return res.status(400).json({ message: 'Stock épuisé.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if ((user.points || 0) < reward.pointsRequired) {
      return res.status(400).json({
        message: `Il te faut ${reward.pointsRequired - (user.points || 0)} points de plus pour réclamer cette récompense.`,
      });
    }

    // Vérifier qu'il n'a pas déjà une claim pending pour la même récompense
    const existing = await RewardClaim.findOne({
      userId: user._id,
      rewardId: reward._id,
      status: { $in: ['pending', 'approved'] },
    });
    if (existing) {
      return res.status(400).json({ message: 'Tu as déjà réclamé cette récompense, elle est en cours de traitement.' });
    }

    // Débiter les points et créer la claim
    user.points = (user.points || 0) - reward.pointsRequired;
    await user.save();

    reward.claimed = (reward.claimed || 0) + 1;
    await reward.save();

    const claim = await RewardClaim.create({
      userId: user._id,
      rewardId: reward._id,
      pointsSpent: reward.pointsRequired,
      userMessage: userMessage || '',
    });

    // Notifier admins
    const io = req.app.get('io');
    const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id');
    for (const a of admins) {
      await pushNotification(io, {
        userId: a._id,
        type: 'reward',
        priority: 'high',
        title: '🎁 Nouvelle réclamation',
        message: `${user.prenom} ${user.nom} a réclamé "${reward.titre}" (${reward.pointsRequired} pts)`,
        link: '/admin?section=rewards',
        relatedType: 'course',
        relatedId: reward._id,
      });
    }

    await pushNotification(io, {
      userId: user._id,
      type: 'reward',
      title: '🎁 Réclamation enregistrée',
      message: `Ta réclamation "${reward.titre}" est en cours de validation par un admin.`,
      link: '/rewards?tab=mine',
      relatedType: 'course',
      relatedId: reward._id,
    });

    await claim.populate('rewardId');
    res.status(201).json(claim);
  } catch (err) {
    console.error('[claimReward]', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/rewards/mine — mes réclamations
export const myClaims = async (req, res) => {
  try {
    const claims = await RewardClaim.find({ userId: req.user.id })
      .populate('rewardId')
      .sort({ createdAt: -1 });
    res.json(claims);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/rewards/claims — toutes les claims (admin)
export const listAllClaims = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const claims = await RewardClaim.find(filter)
      .populate('userId', 'nom prenom email points')
      .populate('rewardId')
      .populate('processedBy', 'nom prenom')
      .sort({ createdAt: -1 });
    res.json(claims);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/rewards/claims/:id — admin approve / reject / deliver
export const processClaim = async (req, res) => {
  try {
    const { status, adminNote, code } = req.body;
    if (!['approved', 'delivered', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }

    const claim = await RewardClaim.findById(req.params.id).populate('rewardId');
    if (!claim) return res.status(404).json({ message: 'Réclamation introuvable.' });

    claim.status = status;
    claim.adminNote = adminNote || claim.adminNote;
    if (code) claim.code = code;
    claim.processedBy = req.user.id;
    claim.processedAt = new Date();

    // Si rejet, rembourser les points
    if (status === 'rejected') {
      const user = await User.findById(claim.userId);
      if (user) {
        user.points = (user.points || 0) + claim.pointsSpent;
        await user.save();
      }
      if (claim.rewardId) {
        claim.rewardId.claimed = Math.max(0, (claim.rewardId.claimed || 0) - 1);
        await claim.rewardId.save();
      }
    }

    await claim.save();

    const io = req.app.get('io');
    const title = status === 'approved' ? '✅ Réclamation approuvée'
                : status === 'delivered' ? '🎁 Récompense livrée !'
                : '❌ Réclamation refusée';
    const message = status === 'rejected'
      ? `Ta demande "${claim.rewardId?.titre}" a été refusée. Tes ${claim.pointsSpent} points t'ont été remboursés.`
      : status === 'delivered'
      ? `Ta récompense "${claim.rewardId?.titre}" est prête ! ${code ? 'Code: ' + code : ''}`
      : `Ta réclamation "${claim.rewardId?.titre}" a été approuvée. Bientôt livrée !`;

    await pushNotification(io, {
      userId: claim.userId,
      type: 'reward',
      priority: status === 'rejected' ? 'normal' : 'high',
      title,
      message,
      link: '/rewards?tab=mine',
      relatedType: 'course',
      relatedId: claim.rewardId?._id,
    });

    res.json(claim);
  } catch (err) {
    console.error('[processClaim]', err);
    res.status(500).json({ message: err.message });
  }
};
