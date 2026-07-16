exports.getAllCategories = async (req, res, next) => {
  try {
    const ServiceCategory = req.models.ServiceCategory;
    const categories = await ServiceCategory.findAll({ order: [["id", "ASC"]] });
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

exports.getCategoryById = async (req, res, next) => {
  try {
    const ServiceCategory = req.models.ServiceCategory;
    const db = require("../models");

    const category = await ServiceCategory.findOne({
      where: { id: req.params.id },
      include: [{ model: db.Service, as: "services" }],
    });

    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const ServiceCategory = req.models.ServiceCategory;
    const { name, color_hex, is_active = true } = req.body;

    if (!name) return res.status(400).json({ message: "name is required" });

    const category = await ServiceCategory.create({
      clinic_id: req.clinicId,
      name,
      color_hex,
      is_active,
    });

    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const ServiceCategory = req.models.ServiceCategory;
    const { name, color_hex, is_active } = req.body;

    const category = await ServiceCategory.findOne({ where: { id: req.params.id } });
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (name !== undefined) category.name = name;
    if (color_hex !== undefined) category.color_hex = color_hex;
    if (is_active !== undefined) category.is_active = is_active;

    await category.save();
    res.json(category);
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const ServiceCategory = req.models.ServiceCategory;
    const category = await ServiceCategory.findOne({ where: { id: req.params.id } });
    if (!category) return res.status(404).json({ message: "Category not found" });
    await category.destroy();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
