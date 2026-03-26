import Progress from '../models/Progress.js';

export const getMyProgress = async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.user.id })
      .populate('courseId', 'titre filiere promotion')
      .populate('videosCompleted', 'titre');
    res.json(progress);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getCourseProgress = async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.user.id, courseId: req.params.courseId });
    res.json(progress ?? {});
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const markVideoCompleted = async (req, res) => {
  try {
    const { courseId, videoId } = req.body;
    const progress = await Progress.findOneAndUpdate(
      { userId: req.user.id, courseId },
      { $addToSet: { videosCompleted: videoId }, lastActivity: new Date() },
      { upsert: true, new: true }
    );
    res.json(progress);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
