exports.getAllServices = async (req, res, next) => {
  try {
    const Service = req.models.Service;
    const db = require("../models");
    const { category_id, active } = req.query;
    const where = {};

    if (category_id) where.category_id = category_id;
    if (active === "true") where.is_active = true;
    if (active === "false") where.is_active = false;

    const services = await Service.findAll({
      where,
      include: [{ model: db.ServiceCategory, as: "category", attributes: ["id", "name", "color_hex"] }],
      order: [["id", "ASC"]],
    });

    res.json(services);
  } catch (err) {
    next(err);
  }
};

exports.getServiceById = async (req, res, next) => {
  try {
    const Service = req.models.Service;
    const db = require("../models");

    const service = await Service.findOne({
      where: { id: req.params.id },
      include: [{ model: db.ServiceCategory, as: "category", attributes: ["id", "name", "color_hex"] }],
    });

    if (!service) return res.status(404).json({ message: "Service not found" });
    res.json(service);
  } catch (err) {
    next(err);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const Service = req.models.Service;
    const ServiceCategory = req.models.ServiceCategory;
    const { name, category_id, price, material_cost = 0, is_active = true } = req.body;

    if (!name || !category_id) {
      return res.status(400).json({ message: "name and category_id are required" });
    }

    const category = await ServiceCategory.findOne({ where: { id: category_id } });
    if (!category) return res.status(400).json({ message: "Invalid category_id" });

    const service = await Service.create({
      clinic_id: req.clinicId,
      name,
      category_id,
      price: price ?? 0,
      material_cost,
      is_active,
    });

    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const Service = req.models.Service;
    const ServiceCategory = req.models.ServiceCategory;
    const { name, category_id, price, material_cost, is_active } = req.body;

    const service = await Service.findOne({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ message: "Service not found" });

    if (category_id) {
      const category = await ServiceCategory.findOne({ where: { id: category_id } });
      if (!category) return res.status(400).json({ message: "Invalid category_id" });
      service.category_id = category_id;
    }

    if (name !== undefined) service.name = name;
    if (price !== undefined) service.price = price;
    if (material_cost !== undefined) service.material_cost = material_cost;
    if (is_active !== undefined) service.is_active = is_active;

    await service.save();
    res.json(service);
  } catch (err) {
    next(err);
  }
};

exports.deleteService = async (req, res, next) => {
  try {
    const Service = req.models.Service;
    const service = await Service.findOne({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ message: "Service not found" });
    await service.destroy();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
