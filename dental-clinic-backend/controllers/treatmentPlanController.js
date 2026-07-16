exports.getTreatmentPlans = async (req, res, next) => {
  try {
    const { TreatmentPlan, Patient, User } = req.models;
    const { patient_id, doctor_id, status } = req.query;

    const where = {};
    if (patient_id) where.patient_id = patient_id;
    if (doctor_id) where.doctor_id = doctor_id;
    if (status) where.status = status;

    const isAdminOrReception = req.user.role === "admin" || req.user.role === "reception";
    if (!isAdminOrReception && !doctor_id) where.doctor_id = req.user.id;

    const plans = await TreatmentPlan.findAll({
      where,
      include: [
        { model: Patient.unscoped(), as: "patient", attributes: ["id", "first_name", "last_name", "phone"] },
        { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json(plans);
  } catch (err) {
    next(err);
  }
};

exports.createTreatmentPlan = async (req, res, next) => {
  try {
    const { TreatmentPlan, Patient, User, Appointment } = req.models;
    const { patient_id, doctor_id, title, notes } = req.body;

    if (!patient_id) return res.status(400).json({ message: "patient_id required" });

    const plan = await TreatmentPlan.create({
      clinic_id: req.clinicId,
      patient_id,
      doctor_id: doctor_id || null,
      title: title || null,
      notes: notes || null,
      status: "active",
    });

    const full = await TreatmentPlan.findOne({
      where: { id: plan.id },
      include: [
        { model: Patient.unscoped(), as: "patient", attributes: ["id", "first_name", "last_name", "phone"] },
        { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] },
        { model: Appointment.unscoped(), as: "appointments" },
      ],
    });

    res.status(201).json(full);
  } catch (err) {
    next(err);
  }
};

exports.getTreatmentPlanSummary = async (req, res, next) => {
  try {
    const { TreatmentPlan, Patient, User, Appointment, Treatment, Payment, TreatmentItem, Service } = req.models;
    const { id } = req.params;

    const plan = await TreatmentPlan.findOne({
      where: { id },
      include: [
        { model: Patient.unscoped(), as: "patient", attributes: ["id", "first_name", "last_name", "phone"] },
        { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] },
      ],
    });

    if (!plan) return res.status(404).json({ message: "Treatment plan not found" });

    if (req.user.role === "doctor") {
      const doctorOk = plan.doctor_id && String(plan.doctor_id) === String(req.user.id);
      if (!doctorOk) {
        const hasAppointment = await Appointment.count({ where: { treatment_plan_id: plan.id, doctor_id: req.user.id } });
        if (!hasAppointment) return res.status(403).json({ message: "Forbidden" });
      }
    }

    const appointments = await Appointment.findAll({
      where: { treatment_plan_id: plan.id },
      include: [
        { model: Patient.unscoped(), as: "patient", attributes: ["id", "first_name", "last_name", "phone"] },
        { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] },
        {
          model: Treatment.unscoped(), as: "treatment", required: false,
          include: [
            { model: Payment.unscoped(), as: "payments", attributes: ["amount", "payment_type", ["created_at", "createdAt"]] },
            { model: TreatmentItem.unscoped(), as: "items", attributes: ["id", "quantity", ["price_at_time", "price"], "tooth_numbers", "notes"],
              include: [{ model: Service.unscoped(), as: "service", attributes: ["id", "name"] }] },
          ],
        },
      ],
      order: [["appointment_date", "ASC"]],
    });

    let total = 0, discount = 0, paid = 0;

    const normalizedAppointments = appointments.map((appt) => {
      const treatment = appt.treatment || null;
      const tTotal = Number(treatment?.total_amount || 0);
      const tDiscount = Number(treatment?.discount_amount || 0);
      const tPaid = treatment?.payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
      total += tTotal; discount += tDiscount; paid += tPaid;
      return {
        id: appt.id, appointment_date: appt.appointment_date, status: appt.status,
        doctor: appt.doctor, patient: appt.patient,
        treatment: treatment ? { id: treatment.id, total_amount: tTotal, discount_amount: tDiscount, paid_amount: tPaid, debt_amount: tTotal - tDiscount - tPaid, items: treatment.items, payments: treatment.payments } : null,
      };
    });

    res.json({ plan, totals: { total, discount, paid, debt: total - discount - paid }, appointments: normalizedAppointments });
  } catch (err) {
    next(err);
  }
};
