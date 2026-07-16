const { Op } = require("sequelize");

exports.getSchedules = async (req, res, next) => {
  try {
    const { DoctorSchedule, User } = req.models;
    const { date } = req.query;
    const where = {};
    if (date) where.date = date;

    const schedules = await DoctorSchedule.findAll({
      where,
      include: [{ model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] }],
      order: [["date", "ASC"], ["start_time", "ASC"]],
    });

    res.json(schedules);
  } catch (err) {
    next(err);
  }
};

exports.createSchedule = async (req, res, next) => {
  try {
    const { DoctorSchedule, User } = req.models;
    const { doctor_id, date, start_time, end_time, type = "busy", reason = "" } = req.body;

    if (!doctor_id || !date) return res.status(400).json({ message: "doctor_id va date majburiy" });

    if (req.user.role === "doctor" && Number(doctor_id) !== req.user.id) {
      return res.status(403).json({ message: "Siz faqat o'zingiz uchun band vaqt qo'sha olasiz" });
    }

    const isAllDay = start_time === null || start_time === undefined;

    const conflictWhere = { doctor_id, date };
    if (isAllDay) {
      conflictWhere[Op.or] = [{ start_time: null }, { start_time: { [Op.not]: null } }];
    } else {
      conflictWhere[Op.or] = [
        { start_time: null },
        { start_time: { [Op.lte]: end_time }, end_time: { [Op.gte]: start_time } },
      ];
    }

    const conflict = await DoctorSchedule.findOne({ where: conflictWhere });
    if (conflict) {
      return res.status(409).json({ message: "Bu vaqtda doktor allaqachon band", conflicting_schedule: conflict });
    }

    const newSchedule = await DoctorSchedule.create({
      clinic_id: req.clinicId,
      doctor_id,
      date,
      start_time: isAllDay ? null : start_time,
      end_time: isAllDay ? null : end_time,
      type,
      reason: reason && reason.trim() ? reason.trim() : null,
      created_by: req.user.id,
    });

    const scheduleWithDoctor = await DoctorSchedule.findOne({
      where: { id: newSchedule.id },
      include: [{ model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] }],
    });

    res.status(201).json(scheduleWithDoctor);
  } catch (err) {
    next(err);
  }
};

exports.deleteSchedule = async (req, res, next) => {
  try {
    const { DoctorSchedule, User } = req.models;
    const { id } = req.params;

    const schedule = await DoctorSchedule.findOne({
      where: { id },
      include: [{ model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] }],
    });

    if (!schedule) return res.status(404).json({ message: "Band vaqt topilmadi" });

    const isAdminOrReception = ["admin", "reception"].includes(req.user.role);
    const isCreator = schedule.created_by === req.user.id;
    const isOwnDoctor = schedule.doctor_id === req.user.id;

    if (!isAdminOrReception && !isCreator && !isOwnDoctor) {
      return res.status(403).json({ message: "Bu band vaqtni o'chirishga ruxsatingiz yo'q" });
    }

    await schedule.destroy();
    res.json({ message: "Band vaqt muvaffaqiyatli o'chirildi", deleted_schedule: schedule });
  } catch (err) {
    next(err);
  }
};
