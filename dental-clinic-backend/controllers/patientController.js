const { Op } = require("sequelize");

function hasField(obj, field) {
  return Object.prototype.hasOwnProperty.call(obj, field);
}

exports.createPatient = async (req, res, next) => {
  try {
    const Patient = req.models.Patient;

    if (Array.isArray(req.body)) {
      const createdPatients = [];
      for (const item of req.body) {
        const { first_name, last_name, phone, birth_date, dob, address, medical_history } = item;
        if (!first_name || !last_name) {
          return res.status(400).json({ message: "first_name and last_name required in all items" });
        }
        const p = await Patient.create({
          clinic_id: req.clinicId,
          first_name,
          last_name,
          phone: phone || null,
          birth_date: birth_date ?? dob ?? null,
          address: address || null,
          medical_history: medical_history || null,
        });
        createdPatients.push(p);
      }
      return res.status(201).json(createdPatients);
    }

    const { first_name, last_name, phone, birth_date, dob, address, medical_history } = req.body;
    if (!first_name || !last_name) {
      return res.status(400).json({ message: "first_name and last_name required" });
    }

    const p = await Patient.create({
      clinic_id: req.clinicId,
      first_name,
      last_name,
      phone: phone || null,
      birth_date: birth_date ?? dob ?? null,
      address: address || null,
      medical_history: medical_history || null,
    });
    return res.status(201).json(p);
  } catch (err) {
    next(err);
  }
};

exports.getPatients = async (req, res, next) => {
  try {
    const Patient = req.models.Patient;
    const { search, phone } = req.query;
    const where = {};

    if (phone) {
      where.phone = { [Op.iLike]: `%${phone.trim()}%` };
    } else if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const patients = await Patient.findAll({ where, order: [["id", "DESC"]] });
    res.json(patients);
  } catch (err) {
    next(err);
  }
};

exports.getPatientById = async (req, res, next) => {
  try {
    const Patient = req.models.Patient;
    const p = await Patient.findOne({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ message: "Patient not found" });
    res.json(p);
  } catch (err) {
    next(err);
  }
};

exports.updatePatient = async (req, res, next) => {
  try {
    const Patient = req.models.Patient;
    const p = await Patient.findOne({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ message: "Patient not found" });

    const { first_name, last_name, phone, birth_date, dob, address, medical_history } = req.body;

    if (hasField(req.body, "first_name")) p.first_name = first_name;
    if (hasField(req.body, "last_name")) p.last_name = last_name;
    if (hasField(req.body, "phone")) p.phone = phone;
    if (hasField(req.body, "birth_date") || hasField(req.body, "dob")) {
      p.birth_date = hasField(req.body, "birth_date") ? birth_date : dob;
    }
    if (hasField(req.body, "address")) p.address = address;
    if (hasField(req.body, "medical_history")) p.medical_history = medical_history;

    await p.save();
    res.json(p);
  } catch (err) {
    next(err);
  }
};

exports.deletePatient = async (req, res, next) => {
  try {
    const Patient = req.models.Patient;
    const p = await Patient.findOne({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ message: "Patient not found" });
    await p.destroy();
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
