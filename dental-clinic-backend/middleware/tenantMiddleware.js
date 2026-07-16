const { Clinic } = require("../models");

const clinicCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function tenantMiddleware(req, res, next) {
  let slug = req.headers["x-clinic-slug"];

  if (!slug) {
    const origin = req.headers.origin || req.headers.referer || "";
    try {
      const url = new URL(origin);
      const parts = url.hostname.split(".");
      if (parts.length >= 3 && parts.slice(-2).join(".") === "second-smile.uz") {
        slug = parts[0];
      }
    } catch {}
  }

  if (!slug) {
    return res.status(400).json({ message: "Clinic not identified" });
  }

  const cached = clinicCache.get(slug);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    req.clinic = cached.clinic;
    req.clinicId = cached.clinic.id;
    return next();
  }

  const clinic = await Clinic.findOne({ where: { slug } });
  if (!clinic) {
    return res.status(404).json({ message: "Clinic not found" });
  }
  if (!clinic.is_active) {
    return res.status(403).json({ message: "Clinic is suspended" });
  }

  clinicCache.set(slug, { clinic: clinic.toJSON(), cachedAt: Date.now() });
  req.clinic = clinic.toJSON();
  req.clinicId = clinic.id;
  next();
}

function clearClinicCache(slug) {
  if (slug) {
    clinicCache.delete(slug);
  } else {
    clinicCache.clear();
  }
}

module.exports = tenantMiddleware;
module.exports.clearClinicCache = clearClinicCache;
