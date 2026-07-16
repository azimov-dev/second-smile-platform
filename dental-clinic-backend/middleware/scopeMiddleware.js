const db = require("../models");

function scopeMiddleware(req, res, next) {
  const clinicId = req.clinicId;

  req.models = {
    User: db.User.scope({ where: { clinic_id: clinicId } }),
    Patient: db.Patient.scope({ where: { clinic_id: clinicId } }),
    Service: db.Service.scope({ where: { clinic_id: clinicId } }),
    ServiceCategory: db.ServiceCategory.scope({ where: { clinic_id: clinicId } }),
    Appointment: db.Appointment.scope({ where: { clinic_id: clinicId } }),
    Treatment: db.Treatment.scope({ where: { clinic_id: clinicId } }),
    TreatmentItem: db.TreatmentItem.scope({ where: { clinic_id: clinicId } }),
    TreatmentPlan: db.TreatmentPlan.scope({ where: { clinic_id: clinicId } }),
    Payment: db.Payment.scope({ where: { clinic_id: clinicId } }),
    DoctorSchedule: db.DoctorSchedule.scope({ where: { clinic_id: clinicId } }),
  };

  next();
}

module.exports = scopeMiddleware;
