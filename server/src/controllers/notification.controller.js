import { AppError } from '../utils/AppError.js';

const MAX_LIMIT = 50;

/**
 * Factory creating the notifications controller. Requires auth middleware to have set req.user.
 *
 * @param {object} options
 * @param {object} options.notificationRepo
 */
export function createNotificationController({ notificationRepo } = {}) {
  if (!notificationRepo) throw new Error('notificationRepo is required for createNotificationController');

  return {
    /** GET /notifications?limit=: newest first, plus the total unread count. */
    async list(req, res, next) {
      try {
        let limit = 20;
        const raw = req.query.limit;
        if (raw !== undefined && raw !== '') {
          if (typeof raw !== 'string' || !/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > MAX_LIMIT) {
            throw new AppError(400, 'INVALID_QUERY', `limit must be a whole number between 1 and ${MAX_LIMIT}`);
          }
          limit = Number(raw);
        }
        const [notifications, unreadCount] = await Promise.all([
          notificationRepo.listByUser(req.user.id, { limit }),
          notificationRepo.countUnread(req.user.id),
        ]);
        return res.status(200).json({ notifications, unreadCount });
      } catch (err) {
        return next(err);
      }
    },

    /** POST /notifications/read-all: marks everything as read. */
    async readAll(req, res, next) {
      try {
        await notificationRepo.markAllRead(req.user.id);
        return res.status(200).json({ unreadCount: 0 });
      } catch (err) {
        return next(err);
      }
    },
  };
}

export default createNotificationController;
